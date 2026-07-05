/**
 * Scans Wolt Cyprus for souvlaki prices in every city and writes
 * src/data/souvlaki-prices.json for the interactive souvlaki page.
 *
 * Tracks pita cuts (pork, chicken, mix — regular and large/enisximeni) plus
 * pork chop, which is a portion dish (Μπριζόλα Μερίδα) and never in pita.
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
// Plain "pita" in Cyprus means Cypriot pitta and counts as-is; items marked as
// Greek pitta (ελληνική), mini, or kids are excluded — those are much smaller
// portions and not comparable (verified against Foody/Bolt menus: e.g. Kazamias
// sells a €4.50 mini next to the €8.00 regular Cypriot pita).
// "Ενισχυμένη" (also sold as "large pitta") is its own format with its own cuts.
const PITA_RE = /pita|πιτα/;
const GREEK_RE = /ελληνικ|greek|ellinik/;
const MINI_RE = /μινι|mini|παιδικ|paidik|kids|child/;
const LARGE_RE = /ενισχυμεν|enisximen|enishimen|large|μεγαλ|διπλ|double|\bxl\b/;
// Most venues sell large as a size option on the base item, not a separate
// item — resolve option groups that are clearly about size and price the
// upgrade as base + delta.
const SIZE_GROUP_RE = /μεγεθ|size|μεριδα|portion|πιτα|pita/;
const NOT_SIZE_VALUE_RE = /σαλατ|salad|πατατ|fries|chips|ποτο|drink|αναψυκτικ|dip|σως|sauce/;

const PORK_SOUVLAKI = (n) => /souvlaki|σουβλακ/.test(n) && /pork|χοιριν/.test(n) && !/chicken|κοτοπουλ/.test(n);
const CHICKEN_SOUVLAKI = (n) => /souvlaki|σουβλακ/.test(n) && /chicken|κοτοπουλ/.test(n);
const MIX = (n) => /\bmix|μιχτ|μιξ|μιγμα|mikti/.test(n);

const CUTS = [
  { key: "souvlaki",      test: PORK_SOUVLAKI,    size: "regular", largeKey: "souvlakiLarge" },
  { key: "chicken",       test: CHICKEN_SOUVLAKI, size: "regular", largeKey: "chickenLarge" },
  { key: "souvlakiLarge", test: PORK_SOUVLAKI,    size: "large" },
  { key: "chickenLarge",  test: CHICKEN_SOUVLAKI, size: "large" },
  { key: "mix",           test: MIX,              size: "regular", largeKey: "mixLarge" },
  { key: "mixLarge",      test: MIX,              size: "large" },
];

// Pork chop is a portion dish (Μπριζόλα Μερίδα / Pork Chop Portion) — never
// sold in pitta, so it's matched separately without the pitta requirement.
// Excluded lookalikes: beef/veal/lamb brizola, παϊδάκια (ribs), πανσέτα
// (belly), bacon, and μπριζολάκι (the diminutive — a small chop, not a full
// portion). Items under €5 are per-piece add-ons, not a portion.
const PORKCHOP = (n) =>
  /pork ?chop|μπριζολ|brizol/.test(n) &&
  !/μπριζολακ|brizolak|μοσχαρ|beef|veal|αρν|lamb|κοτοπουλ|chicken|παιδακ|πανσετ|panset|bacon|μπεικον|small|μικρ|κομματι|kommati|piece|τεμαχ|παιδικ|kids|child/.test(n) &&
  !PITA_RE.test(n);
const PORKCHOP_MIN_CENTS = 500;

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

/**
 * Cheapest large-size upgrade attached to an item, in euros added to the
 * base price. Only size-type option groups count, and salad/fries/drink
 * upgrade values never do.
 */
function largeUpgradeDelta(item, optionsById) {
  let best = null;
  for (const ref of item.options || []) {
    const group = optionsById.get(ref.option_id) ?? optionsById.get(ref.id);
    const groupName = normalize(group?.name ?? ref.name ?? "");
    if (!SIZE_GROUP_RE.test(groupName)) continue;
    for (const value of group?.values || []) {
      const vn = normalize(value.name || "");
      if (!LARGE_RE.test(vn) || NOT_SIZE_VALUE_RE.test(vn)) continue;
      if (typeof value.price !== "number" || value.price < 0) continue;
      const delta = value.price / 100;
      if (best == null || delta < best) best = delta;
    }
  }
  return best;
}

function extractCuts(assortment) {
  const items = assortment.items || [];
  const optionsById = new Map();
  for (const o of assortment.options || []) optionsById.set(o.id, o);

  const prices = {};
  const take = (key, eur) => {
    if (prices[key] == null || eur < prices[key]) prices[key] = eur;
  };

  for (const item of items) {
    // items priced 0 are "configure options" placeholders — not a real price
    if (item.price == null || item.price < 100) continue;
    const n = normalize(item.name);
    const eur = item.price / 100;

    // pork chop: portion dish, no pitta in the name
    if (PORKCHOP(n) && item.price >= PORKCHOP_MIN_CENTS) take("porkchop", eur);

    if (!PITA_RE.test(n)) continue;
    if (GREEK_RE.test(n) || MINI_RE.test(n)) continue; // smaller portions — never counted
    const isLarge = LARGE_RE.test(n);

    for (const cut of CUTS) {
      if ((cut.size === "large") !== isLarge) continue;
      if (!cut.test(n)) continue;
      take(cut.key, eur);
      // large sold as a size option on the regular item: base + upgrade delta
      if (cut.largeKey) {
        const delta = largeUpgradeDelta(item, optionsById);
        if (delta != null) take(cut.largeKey, eur + delta);
      }
    }
  }
  return prices;
}

async function scanCity(city, prevVenues) {
  const venues = await listSouvlakiVenues(city.lat, city.lon);
  console.log(`  ${venues.length} souvlaki-tagged venues found`);

  const results = [];
  const failedSlugs = new Set();
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
          const prices = extractCuts(assortment);
          if (Object.keys(prices).length > 0) {
            results.push({
              name: v.name,
              slug: v.slug,
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
      if (!ok) failedSlugs.add(v.slug);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (failedSlugs.size) console.log(`  ⚠ ${failedSlugs.size}/${venues.length} menu fetches failed after retries`);

  // Rate limiting must not shrink coverage: venues whose fetch failed keep
  // their previous scan's data instead of dropping off the page.
  const have = new Set(results.map((r) => r.slug));
  let carried = 0;
  for (const prev of prevVenues || []) {
    const slug = prev.slug || prev.url?.split("/restaurant/")[1];
    if (slug && failedSlugs.has(slug) && !have.has(slug)) {
      results.push({ ...prev, slug });
      carried++;
    }
  }
  if (carried) console.log(`  ↻ carried over ${carried} venues from previous scan`);

  results.sort((a, b) => (a.prices.souvlaki ?? 99) - (b.prices.souvlaki ?? 99));
  console.log(`  ${results.length} venues sell souvlaki in pita`);
  return results;
}

// ── main ──────────────────────────────────────────────────────────────────────

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { cities: [] };
const prevByCity = new Map((prev.cities || []).map((c) => [c.key, c.venues]));

const data = { updatedAt: null, cities: [] };
for (const city of CITIES) {
  console.log(`\n══ ${city.label.en} ══`);
  try {
    const venues = await scanCity(city, prevByCity.get(city.key));
    data.cities.push({ key: city.key, label: city.label, venues });
  } catch (err) {
    // whole city failed — keep the previous scan's data rather than dropping it
    const kept = prevByCity.get(city.key) || [];
    data.cities.push({ key: city.key, label: city.label, venues: kept });
    console.log(`  ✗ ${err.message} — kept ${kept.length} venues from previous scan`);
  }
  await new Promise((r) => setTimeout(r, 5000));
}

data.updatedAt = new Date().toISOString();
fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
console.log(`\nWrote ${data.cities.reduce((n, c) => n + c.venues.length, 0)} venues across ${data.cities.length} cities → ${OUT}`);
