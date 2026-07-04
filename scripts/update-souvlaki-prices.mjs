/**
 * Scans Wolt Cyprus for souvlaki prices in every city and writes
 * src/data/souvlaki-prices.json for the interactive souvlaki page.
 *
 * Tracks four cuts, all in pita format so prices are comparable:
 *   souvlaki  — pork souvlaki pita
 *   chicken   — chicken souvlaki pita
 *   porkchop  — pork chop (brizola) pita
 *   mix       — mixed pita
 *
 * Note: Foody and Bolt Food APIs require authentication, so Wolt is the only
 * feasible unauthenticated source. Prices are Wolt listings and may include
 * a platform markup over counter prices.
 *
 * Run weekly via GitHub Actions: node scripts/update-souvlaki-prices.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src/data/souvlaki-prices.json");

const VENUES_API = "https://restaurant-api.wolt.com/v1/pages/restaurants";
const ASSORTMENT_API = "https://consumer-api.wolt.com/consumer-api/consumer-assortment/v1/venues/slug";
const HEADERS = { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" };
const CONCURRENCY = 8;

const CITIES = [
  { key: "nicosia",   citySlug: "nicosia",   lat: 35.1856, lon: 33.3823, label: { en: "Nicosia",               el: "Λευκωσία",              ru: "Никосия" } },
  { key: "limassol",  citySlug: "limassol",  lat: 34.7071, lon: 33.0226, label: { en: "Limassol",              el: "Λεμεσός",               ru: "Лимасол" } },
  { key: "larnaca",   citySlug: "larnaca",   lat: 34.9167, lon: 33.6233, label: { en: "Larnaca",               el: "Λάρνακα",               ru: "Ларнака" } },
  { key: "paphos",    citySlug: "paphos",    lat: 34.7754, lon: 32.4245, label: { en: "Paphos",                el: "Πάφος",                 ru: "Пафос" } },
  { key: "famagusta", citySlug: "ayia-napa", lat: 35.0380, lon: 33.9830, label: { en: "Ayia Napa & Paralimni", el: "Αγία Νάπα & Παραλίμνι", ru: "Айя-Напа и Паралимни" } },
];

function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

// All cuts are matched in pita format only, so venues are compared like-for-like.
const PITA_RE = /pita|πιτα/;
const CUTS = [
  { key: "souvlaki", test: (n) => /souvlaki|σουβλακ/.test(n) && /pork|χοιριν/.test(n) && !/chicken|κοτοπουλ/.test(n) },
  { key: "chicken",  test: (n) => /souvlaki|σουβλακ/.test(n) && /chicken|κοτοπουλ/.test(n) },
  { key: "porkchop", test: (n) => /pork ?chop|μπριζολ|brizol/.test(n) },
  { key: "mix",      test: (n) => /\bmix|μιχτ|mikti/.test(n) },
];

async function listSouvlakiVenues(lat, lon) {
  const res = await fetch(`${VENUES_API}?lat=${lat}&lon=${lon}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`venue list HTTP ${res.status}`);
  const json = await res.json();
  const seen = new Set();
  const venues = [];
  for (const section of json.sections || []) {
    for (const it of section.items || []) {
      const v = it.venue;
      if (!v?.slug || seen.has(v.slug)) continue;
      if (!(v.tags || []).some((t) => /souvlaki|kebab|grill|greek|gyro/i.test(t))) continue;
      seen.add(v.slug);
      venues.push({
        name: v.name,
        slug: v.slug,
        address: v.address || null,
        // Wolt location is [lon, lat]
        lng: v.location?.[0] ?? null,
        lat: v.location?.[1] ?? null,
        rating: v.rating?.score ?? null,
      });
    }
  }
  return venues;
}

function extractCuts(items) {
  const prices = {};
  for (const item of items) {
    // items priced 0 are "configure options" placeholders — not a real price
    if (item.price == null || item.price < 100) continue;
    const n = normalize(item.name);
    if (!PITA_RE.test(n)) continue;
    for (const cut of CUTS) {
      if (!cut.test(n)) continue;
      const eur = item.price / 100;
      if (prices[cut.key] == null || eur < prices[cut.key]) prices[cut.key] = eur;
    }
  }
  return prices;
}

async function scanCity(city) {
  const venues = await listSouvlakiVenues(city.lat, city.lon);
  console.log(`  ${venues.length} souvlaki-tagged venues found`);

  const results = [];
  let failed = 0;
  const queue = [...venues];
  async function worker() {
    while (queue.length) {
      const v = queue.shift();
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 3000 * attempt));
        try {
          const res = await fetch(`${ASSORTMENT_API}/${v.slug}/assortment`, {
            headers: HEADERS,
            signal: AbortSignal.timeout(20000),
          });
          if (res.status === 404 || res.status === 410) { ok = true; break; }
          if (!res.ok) continue;
          const assortment = await res.json();
          const prices = extractCuts(assortment.items || []);
          if (Object.keys(prices).length > 0) {
            results.push({
              name: v.name,
              address: v.address,
              lat: v.lat,
              lng: v.lng,
              url: `https://wolt.com/en/cyp/${city.citySlug}/restaurant/${v.slug}`,
              prices,
            });
          }
          ok = true;
        } catch {}
      }
      if (!ok) failed++;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (failed) console.log(`  ⚠ ${failed}/${venues.length} menu fetches failed after retries`);

  results.sort((a, b) => (a.prices.souvlaki ?? 99) - (b.prices.souvlaki ?? 99));
  console.log(`  ${results.length} venues sell souvlaki in pita`);
  return results;
}

// ── main ──────────────────────────────────────────────────────────────────────

const data = { updatedAt: null, cities: [] };
for (const city of CITIES) {
  console.log(`\n══ ${city.label.en} ══`);
  try {
    const venues = await scanCity(city);
    data.cities.push({ key: city.key, label: city.label, venues });
  } catch (err) {
    console.log(`  ✗ ${err.message} — city skipped`);
  }
  await new Promise((r) => setTimeout(r, 5000));
}

data.updatedAt = new Date().toISOString();
fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
console.log(`\nWrote ${data.cities.reduce((n, c) => n + c.venues.length, 0)} venues across ${data.cities.length} cities → ${OUT}`);
