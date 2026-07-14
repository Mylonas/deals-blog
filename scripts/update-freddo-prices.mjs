/**
 * Updates Freddo Espresso prices + top drinks in coffee-prices.json using
 * Wolt's public JSON API (no headless browser needed).
 *
 * For each café:
 *   1. Search Wolt venues near Nicosia for the café name.
 *   2. Accept a venue only if its name actually contains the café name —
 *      the old Playwright scraper took the first search hit, which silently
 *      matched the wrong venue (e.g. "Black Cup" → Second Cup Lakatamia).
 *   3. Fetch the venue's assortment and read the Freddo Espresso price
 *      plus the cold/hot coffee items for the top-drinks section.
 *
 * Cafés with no verified Wolt venue get freddo=null so they drop out of the
 * table instead of showing another café's prices.
 *
 * Run: node scripts/update-freddo-prices.mjs
 * Then: node scripts/update-coffee-prices.mjs   (regenerates the posts)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { WOLT_OUT, MERGED_OUT, mergeAndWrite } from "./merge-coffee-sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = MERGED_OUT;

const SEARCH_API = "https://restaurant-api.wolt.com/v1/pages/search";
const VENUES_API = "https://restaurant-api.wolt.com/v1/pages/restaurants";
const ASSORTMENT_API = "https://consumer-api.wolt.com/consumer-api/consumer-assortment/v1/venues/slug";
const NICOSIA = { lat: 35.1856, lon: 33.3823 };
const HEADERS = { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" };

// All Wolt Cyprus cities — each gets its own section on the page
export const CITIES = [
  { key: "nicosia",   lat: 35.1856, lon: 33.3823, label: { en: "Nicosia",               el: "Λευκωσία",              ru: "Никосия" } },
  { key: "limassol",  lat: 34.7071, lon: 33.0226, label: { en: "Limassol",              el: "Λεμεσός",               ru: "Лимасол" } },
  { key: "larnaca",   lat: 34.9167, lon: 33.6233, label: { en: "Larnaca",               el: "Λάρνακα",               ru: "Ларнака" } },
  { key: "paphos",    lat: 34.7754, lon: 32.4245, label: { en: "Paphos",                el: "Πάφος",                 ru: "Пафос" } },
  { key: "famagusta", lat: 35.0380, lon: 33.9830, label: { en: "Ayia Napa & Paralimni", el: "Αγία Νάπα & Παραλίμνι", ru: "Айя-Напа и Паралимни" } },
];
const TOP_PER_CITY = 12;
const CONCURRENCY = 10;

/** Lowercase, fold accents, strip punctuation — "Caffè Nero" ≈ "caffe nero". */
export function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchVenues(query) {
  const res = await fetch(SEARCH_API, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, target: "venues", ...NICOSIA }),
  });
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  const json = await res.json();
  const venues = [];
  for (const section of json.sections || []) {
    for (const it of section.items || []) {
      if (it.venue?.slug && it.venue?.name) venues.push({ name: it.venue.name, slug: it.venue.slug });
    }
  }
  return venues;
}

/**
 * First venue whose normalized name contains the normalized café name.
 * Also compares with spaces stripped so "Coffee Brands" matches Wolt's
 * one-word "Coffeebrands Kaimakli".
 */
function matchVenue(venues, cafeName) {
  const want = normalize(cafeName);
  const wantTight = want.replace(/ /g, "");
  return (
    venues.find((v) => {
      const n = normalize(v.name);
      return n.includes(want) || n.replace(/ /g, "").includes(wantTight);
    }) ?? null
  );
}

async function fetchAssortment(slug) {
  const res = await fetch(`${ASSORTMENT_API}/${slug}/assortment`, { headers: HEADERS });
  if (!res.ok) throw new Error(`assortment HTTP ${res.status}`);
  return res.json();
}

// below this a "Freddo Espresso" price is a venue-side data-entry error or an
// option row (e.g. €0.65 sugar/extra-shot lines), not a drink price
export const FREDDO_MIN_EUR = 1.5;
export const FREDDO_MIN_CENTS = FREDDO_MIN_EUR * 100;

/**
 * Pick the plain Freddo Espresso among variants: exact name first, then the
 * base size of a "Classic" line (e.g. Mikel's "Freddo Espresso Classic
 * Regular"), then the shortest remaining name (longer = flavoured variant).
 * `minPrice` is in the caller's price unit (Wolt: cents, Bolt/Foody: euros).
 */
export function findFreddo(items, minPrice = 0) {
  const candidates = items.filter((i) => /freddo\s*espresso/i.test(i.name) && i.price != null && i.price >= minPrice);
  if (!candidates.length) return null;
  const score = (name) => {
    const n = normalize(name);
    if (n === "freddo espresso") return 0;
    if (/classic (regular|standard)/.test(n)) return 1;
    if (/classic/.test(n)) return 2;
    return 3 + n.length / 100;
  };
  candidates.sort((a, b) => score(a.name) - score(b.name));
  return candidates[0];
}

/** Top 5 drinks from the coffee categories (cold first), freddo included. */
function buildTopDrinks(assortment) {
  const byId = new Map(assortment.items.map((i) => [i.id, i]));
  const drinkCats = (assortment.categories || []).filter((c) =>
    /coffee|freddo|espresso|beverage|drink/i.test(c.name || "")
  );
  drinkCats.sort((a, b) => {
    const aCold = /cold|freddo|iced/i.test(a.name) ? 0 : 1;
    const bCold = /cold|freddo|iced/i.test(b.name) ? 0 : 1;
    return aCold - bCold;
  });

  const seen = new Set();
  const top = [];
  for (const cat of drinkCats) {
    for (const id of cat.item_ids || []) {
      if (top.length >= 5) break;
      const item = byId.get(id);
      if (!item || item.price == null) continue;
      const key = item.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      top.push({ name: item.name.trim(), price: item.price / 100, platform: "wolt", popular: false });
    }
    if (top.length >= 5) break;
  }

  const freddo = findFreddo(assortment.items, FREDDO_MIN_CENTS);
  if (freddo && !seen.has(freddo.name.trim().toLowerCase())) {
    top.push({ name: freddo.name.trim(), price: freddo.price / 100, platform: "wolt", popular: false });
  }
  return top;
}

// ── per-city scan ─────────────────────────────────────────────────────────────

/** All café-tagged venues near the given coordinates. */
async function listCafes(lat, lon) {
  const res = await fetch(`${VENUES_API}?lat=${lat}&lon=${lon}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`venue list HTTP ${res.status}`);
  const json = await res.json();
  const seen = new Set();
  const venues = [];
  for (const section of json.sections || []) {
    for (const it of section.items || []) {
      const v = it.venue;
      if (!v?.slug || seen.has(v.slug)) continue;
      if (!(v.tags || []).some((t) => /coffee|cafe|caf/i.test(t))) continue;
      seen.add(v.slug);
      venues.push({
        name: v.name,
        slug: v.slug,
        address: v.address || null,
        // Wolt location is [lon, lat]
        lng: v.location?.[0] ?? null,
        lat: v.location?.[1] ?? null,
      });
    }
  }
  return venues;
}

/**
 * Venues of one brand share their first two name tokens ("Mikel Coffee X",
 * "Caffè Nero Y") — group on that and keep each brand's cheapest branch.
 */
export function brandKey(name) {
  return normalize(name).split(" ").slice(0, 2).join(" ");
}

/** Scan one city: every café menu, cheapest branch per brand, top N by price. */
async function scanCity(city) {
  const venues = await listCafes(city.lat, city.lon);
  console.log(`  ${venues.length} café venues found`);

  const found = [];
  let failed = 0;
  const queue = [...venues];
  async function worker() {
    while (queue.length) {
      const v = queue.shift();
      let ok = false;
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 3000 * attempt)); // back off on rate limit
        try {
          const res = await fetch(`${ASSORTMENT_API}/${v.slug}/assortment`, {
            headers: HEADERS,
            signal: AbortSignal.timeout(20000),
          });
          if (res.status === 404 || res.status === 410) { ok = true; break; } // venue gone — don't retry
          if (!res.ok) continue;
          const assortment = await res.json();
          const freddo = findFreddo(assortment.items || [], FREDDO_MIN_CENTS);
          if (freddo) found.push({ ...v, freddo: freddo.price / 100 });
          ok = true;
        } catch {}
      }
      if (!ok) failed++;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (failed) console.log(`  ⚠ ${failed}/${venues.length} menu fetches failed after retries`);

  found.sort((a, b) => a.freddo - b.freddo);
  const byBrand = new Map();
  for (const f of found) {
    const key = brandKey(f.name);
    if (!byBrand.has(key)) byBrand.set(key, f); // sorted, so first hit is the cheapest branch
  }

  const top = [...byBrand.values()].slice(0, TOP_PER_CITY).map((f) => ({
    cafe: f.name,
    freddo: f.freddo,
    address: f.address,
    lat: f.lat,
    lng: f.lng,
    url: `https://wolt.com/en/cyp/${city.key === "famagusta" ? "ayia-napa" : city.key}/restaurant/${f.slug}`,
  }));
  console.log(`  ${found.length} sell freddo → keeping top ${top.length} (cheapest €${top[0]?.freddo.toFixed(2) ?? "—"})`);
  return top;
}

// ── main ──────────────────────────────────────────────────────────────────────

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {

const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

for (const item of data.items) {
  console.log(`\n── ${item.cafe} ──`);
  try {
    const venues = await searchVenues(item.cafe);
    const venue = matchVenue(venues, item.cafe);

    if (!venue) {
      console.log(`  ✗ no Wolt venue matching "${item.cafe}" — clearing stale data`);
      item.freddo = null;
      item.topDrinks = [];
      item.sources.wolt = null;
      item.notes = "Not on Wolt — price unavailable.";
      continue;
    }

    console.log(`  ✓ venue: ${venue.name} [${venue.slug}]`);
    if (item.notes === "Not on Wolt — price unavailable.") {
      item.notes = "Also on Wolt."; // venue came back — drop the stale not-found note
    }
    const assortment = await fetchAssortment(venue.slug);

    const freddo = findFreddo(assortment.items, FREDDO_MIN_CENTS);
    if (freddo) {
      item.freddo = freddo.price / 100;
      // the verified price IS the Wolt listing — keep the delivery column in sync
      item.delivery = item.freddo;
      console.log(`  Freddo Espresso: €${item.freddo.toFixed(2)} ("${freddo.name.trim()}")`);
    } else {
      item.freddo = null;
      item.delivery = null;
      console.log(`  ✗ no Freddo Espresso on the menu`);
    }

    item.topDrinks = buildTopDrinks(assortment);
    item.sources.wolt = `https://wolt.com/en/cyp/nicosia/restaurant/${venue.slug}`;
    console.log(`  Top drinks: ${item.topDrinks.map((d) => d.name).join(", ") || "—"}`);
  } catch (err) {
    console.log(`  ✗ ${err.message} — keeping existing data`);
  }
}

// City-by-city freddo tables for the whole island. A failed or empty scan
// (Wolt blocking the runner, rate limits) keeps the city's previous Wolt data
// instead of dropping it.
const prevWolt = fs.existsSync(WOLT_OUT) ? JSON.parse(fs.readFileSync(WOLT_OUT, "utf8")) : { cities: [] };
const prevCities = new Map((prevWolt.cities || []).map((c) => [c.key, c]));
data.cities = [];
let scanned = 0;
for (const city of CITIES) {
  console.log(`\n══ ${city.label.en} ══`);
  try {
    const cafes = await scanCity(city);
    if (!cafes.length) throw new Error("scan returned 0 cafés");
    data.cities.push({ key: city.key, label: city.label, cafes });
    scanned++;
  } catch (err) {
    const prev = prevCities.get(city.key);
    if (prev?.cafes?.length) {
      console.log(`  ✗ ${err.message} — keeping previous data (${prev.cafes.length} cafés)`);
      data.cities.push(prev);
    } else {
      console.log(`  ✗ ${err.message} — city skipped`);
    }
  }
  await new Promise((r) => setTimeout(r, 5000)); // breathe between cities — avoid rate limiting
}

if (scanned === 0 && !data.cities.some((c) => c.cafes?.length)) {
  console.error("\n✗ Wolt scan produced no café data for any city — aborting without writing.");
  process.exit(1);
}

data.scrapedAt = new Date().toISOString();
data.updatedAt = data.scrapedAt;
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");

// the raw Wolt city scan is the canonical merge base — Bolt and Foody cafés
// are folded onto it by merge-coffee-sources.mjs
fs.writeFileSync(WOLT_OUT, JSON.stringify({ updatedAt: data.scrapedAt, cities: data.cities }, null, 2) + "\n");
mergeAndWrite();

const withPrice = data.items.filter((i) => i.freddo != null).length;
console.log(`\nDone. ${withPrice}/${data.items.length} curated cafés + ${data.cities.length} city scans.`);
console.log("Run node scripts/update-coffee-prices.mjs to regenerate the posts.");

}
