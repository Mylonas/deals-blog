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
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "src/data/coffee-prices.json");

const SEARCH_API = "https://restaurant-api.wolt.com/v1/pages/search";
const ASSORTMENT_API = "https://consumer-api.wolt.com/consumer-api/consumer-assortment/v1/venues/slug";
const NICOSIA = { lat: 35.1856, lon: 33.3823 };
const HEADERS = { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" };

/** Lowercase, fold accents, strip punctuation — "Caffè Nero" ≈ "caffe nero". */
function normalize(s) {
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

/** First venue whose normalized name contains the normalized café name. */
function matchVenue(venues, cafeName) {
  const want = normalize(cafeName);
  return venues.find((v) => normalize(v.name).includes(want)) ?? null;
}

async function fetchAssortment(slug) {
  const res = await fetch(`${ASSORTMENT_API}/${slug}/assortment`, { headers: HEADERS });
  if (!res.ok) throw new Error(`assortment HTTP ${res.status}`);
  return res.json();
}

/**
 * Pick the plain Freddo Espresso among variants: exact name first, then the
 * base size of a "Classic" line (e.g. Mikel's "Freddo Espresso Classic
 * Regular"), then the shortest remaining name (longer = flavoured variant).
 */
function findFreddo(items) {
  const candidates = items.filter((i) => /freddo\s*espresso/i.test(i.name) && i.price != null);
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

  const freddo = findFreddo(assortment.items);
  if (freddo && !seen.has(freddo.name.trim().toLowerCase())) {
    top.push({ name: freddo.name.trim(), price: freddo.price / 100, platform: "wolt", popular: false });
  }
  return top;
}

// ── main ──────────────────────────────────────────────────────────────────────

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
    const assortment = await fetchAssortment(venue.slug);

    const freddo = findFreddo(assortment.items);
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

data.scrapedAt = new Date().toISOString();
data.updatedAt = data.scrapedAt;
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");

const withPrice = data.items.filter((i) => i.freddo != null).length;
console.log(`\nDone. ${withPrice}/${data.items.length} cafés have a verified Freddo price.`);
console.log("Run node scripts/update-coffee-prices.mjs to regenerate the posts.");
