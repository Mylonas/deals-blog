/**
 * Scans Bolt Food Cyprus for Freddo Espresso prices and writes the raw scan
 * to src/data/coffee-prices-bolt.json, then merges Wolt + Bolt + Foody into
 * the `cities` section of src/data/coffee-prices.json
 * (see merge-coffee-sources.mjs).
 *
 * Same pacing model as the souvlaki Bolt scan: the client API
 * (deliveryuser.live.boltsvc.net) is unauthenticated but heavily rate-limited,
 * so a single paced worker fetches everything (~10s between requests, 90s
 * backoff on 1005). The scan checkpoints after every venue and carries over
 * venues whose fetch failed, so partial runs still land useful data.
 *
 * Venue discovery: one findProviders call per city returns every provider.
 * Menu-scan candidates are providers whose name looks café-ish, plus providers
 * matching a café already found by the Wolt scan (same place on both
 * platforms). Like the Wolt scan, only the cheapest branch per brand is kept
 * and each city's list is capped, so chains don't flood the table.
 *
 * Env knobs (all optional, for validation runs):
 *   BOLT_CITIES=nicosia,larnaca   only scan these city keys
 *   BOLT_MAX_VENUES=3             cap menu scans per city
 *   BOLT_GAP_MS=10000             base gap between requests
 */
import fs from "fs";
import { CITIES, normalize, findFreddo, FREDDO_MIN_EUR, brandKey } from "./update-freddo-prices.mjs";
import { WOLT_OUT, BOLT_OUT, MERGED_OUT, mergeAndWrite, sameCafe } from "./merge-coffee-sources.mjs";

const API = "https://deliveryuser.live.boltsvc.net";
const DEVICE = {
  version: "FW.1.88",
  deviceId: "dealshub-" + Math.random().toString(36).slice(2, 10),
  deviceType: "web",
  device_name: "web",
  device_os_version: "web",
  language: "en-US",
};
const HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)",
  Origin: "https://food.bolt.eu",
};

// Bolt web city path segments (food.bolt.eu/en/{cityPath}/p/{slug})
const CITY_PATHS = {
  nicosia: "261-nicosia",
  limassol: "442-limassol",
  larnaca: "443-larnaca",
  paphos: "444-paphos",
  famagusta: "445-ayia-napa",
};

// wide net on venue names — the freddo lookup decides what actually counts
const CAFEISH_RE = /coffee|caffe|cafe|καφε|kafe|espresso|freddo|brew|roast|barista|bean|costa|starbucks|nero|mikel|gloria|second cup|coffe/;
// menu categories worth fetching vs. obvious non-coffee categories
const COFFEE_CAT_RE = /coffee|caffe|freddo|espresso|cold|iced|hot|beverage|drink|καφε|ροφημ|κρυ|ζεστ/;
const SKIP_CAT_RE = /food|snack|sandwich|toast|croissant|bagel|burger|pizza|salad|σαλατ|dessert|γλυκ|cake|sweet|juice|χυμ|smoothie|tea|τσαι|water|νερ|beer|wine|extra|cutlery/;
const MAX_CATEGORIES_PER_VENUE = 4;
const TOP_PER_CITY = 12;

const BASE_GAP_MS = parseInt(process.env.BOLT_GAP_MS ?? "10000", 10);
const MAX_VENUES = parseInt(process.env.BOLT_MAX_VENUES ?? "0", 10) || Infinity;
const ONLY_CITIES = process.env.BOLT_CITIES ? new Set(process.env.BOLT_CITIES.split(",")) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── paced fetch with TOO_MANY_REQUESTS backoff ────────────────────────────────

let gapMs = BASE_GAP_MS;
let lastRequestAt = 0;

async function boltFetch(path, { method = "GET", params = {}, body } = {}) {
  const qs = new URLSearchParams({ ...DEVICE, ...params });
  const url = `${API}${path}?${qs}`;
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = lastRequestAt + gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers: HEADERS,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(25000),
      });
      const json = await res.json();
      if (json.code === 1005) {
        // rate limited — back off hard and slow the whole scan down a notch
        gapMs = Math.min(Math.round(gapMs * 1.5), 45000);
        lastErr = new Error("TOO_MANY_REQUESTS");
        await sleep(90000);
        continue;
      }
      if (json.code !== 0) throw new Error(`${json.message || "error"} (${json.code})`);
      return json.data;
    } catch (e) {
      lastErr = e;
      if (e.message !== "TOO_MANY_REQUESTS") await sleep(5000 * (attempt + 1));
    }
  }
  throw lastErr;
}

// ── menu extraction (Bolt data model) ─────────────────────────────────────────

/**
 * Cheapest plain Freddo Espresso across a venue's coffee categories, using
 * the same variant-scoring as the Wolt scan (findFreddo). Bolt dish prices
 * are already in euros; findFreddo expects `price != null` only.
 */
export function extractBoltFreddo(categoryFetches) {
  const items = [];
  for (const { items: dishes } of categoryFetches) {
    for (const it of Object.values(dishes)) {
      if (it.type !== "dish" || it.availability === "not_available") continue;
      const price = it.price?.value;
      if (typeof price !== "number" || price <= 0) continue;
      items.push({ name: it.name?.value || "", price });
    }
  }
  const freddo = findFreddo(items, FREDDO_MIN_EUR);
  return freddo ? freddo.price : null;
}

// ── scan ──────────────────────────────────────────────────────────────────────

async function findProviders(city) {
  const data = await boltFetch("/deliveryClient/public/findProviders", {
    method: "POST",
    body: { filters: [], lat: city.lat, lng: city.lon },
  });
  return (data.providers || []).map((p) => ({
    provider_id: p.provider_id,
    name: p.name?.value || "",
    address: p.address || null,
    lat: p.lat ?? null,
    lng: p.lng ?? null,
    slug: p.slug,
  }));
}

async function scanVenueMenu(provider, city) {
  const gps = { gps_lat: String(city.lat), gps_lng: String(city.lon) };
  const cats = await boltFetch("/deliveryClient/public/getMenuCategories", {
    params: { provider_id: String(provider.provider_id), ...gps },
  });
  const catList = Object.values(cats.items || {}).filter((x) => x.type === "category" && x.id !== cats.root_id);
  let picked = catList.filter((c) => {
    const cn = normalize(c.name?.value);
    return COFFEE_CAT_RE.test(cn) && !SKIP_CAT_RE.test(cn);
  });
  if (!picked.length) picked = catList.filter((c) => !SKIP_CAT_RE.test(normalize(c.name?.value)));
  picked = picked.slice(0, MAX_CATEGORIES_PER_VENUE);

  const fetches = [];
  for (const cat of picked) {
    const dishes = await boltFetch("/deliveryClient/public/getMenuDishes", {
      params: { provider_id: String(provider.provider_id), category_id: String(cat.id), ...gps },
    });
    fetches.push({ items: dishes.items || {} });
  }
  return extractBoltFreddo(fetches);
}

import { pathToFileURL } from "url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prev = fs.existsSync(BOLT_OUT) ? JSON.parse(fs.readFileSync(BOLT_OUT, "utf8")) : { cities: [] };
  const prevByCity = new Map((prev.cities || []).map((c) => [c.key, c.cafes]));
  const woltFile = fs.existsSync(WOLT_OUT) ? WOLT_OUT : MERGED_OUT;
  const wolt = fs.existsSync(woltFile) ? JSON.parse(fs.readFileSync(woltFile, "utf8")) : { cities: [] };
  const woltByCity = new Map((wolt.cities || []).map((c) => [c.key, c.cafes]));

  const data = { updatedAt: null, cities: [] };
  const checkpoint = () => {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(BOLT_OUT, JSON.stringify(data, null, 2) + "\n");
  };

  for (const city of CITIES) {
    if (ONLY_CITIES && !ONLY_CITIES.has(city.key)) {
      // keep the previous scan for cities excluded from this run
      const kept = prevByCity.get(city.key);
      if (kept?.length) data.cities.push({ key: city.key, label: city.label, cafes: kept });
      continue;
    }
    console.log(`\n══ ${city.label.en} (Bolt) ══`);
    const found = [];
    const cityEntry = { key: city.key, label: city.label, cafes: [] };
    data.cities.push(cityEntry);
    let candidates = [];
    try {
      const providers = await findProviders(city);
      const woltCafes = woltByCity.get(city.key) || [];
      candidates = providers.filter((p) => {
        const pn = normalize(p.name);
        return CAFEISH_RE.test(pn) || woltCafes.some((wc) => sameCafe(wc, p));
      });
      console.log(`  ${providers.length} providers, ${candidates.length} café candidates`);
    } catch (err) {
      cityEntry.cafes = prevByCity.get(city.key) || [];
      console.log(`  ✗ provider list failed (${err.message}) — kept ${cityEntry.cafes.length} cafés from previous scan`);
      checkpoint();
      continue;
    }

    const failed = new Set();
    let scanned = 0;
    for (const p of candidates) {
      if (scanned >= MAX_VENUES) break;
      scanned++;
      try {
        const freddo = await scanVenueMenu(p, city);
        if (freddo != null) {
          found.push({
            cafe: p.name,
            freddo,
            slug: p.slug,
            provider_id: p.provider_id,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
            url: `https://food.bolt.eu/en/${CITY_PATHS[city.key]}/p/${p.slug}`,
            source: "bolt",
          });
          console.log(`  ✓ ${p.name}: €${freddo.toFixed(2)}`);
        }
      } catch (err) {
        failed.add(p.provider_id);
        console.log(`  ⚠ ${p.name}: ${err.message}`);
      }
      // cafés whose fetch failed keep their previous scan's data
      const have = new Set(found.map((v) => v.provider_id));
      const carried = (prevByCity.get(city.key) || []).filter(
        (pv) => failed.has(pv.provider_id) && !have.has(pv.provider_id),
      );
      // same brand fold as the Wolt scan: cheapest branch per brand, top N
      const all = [...found, ...carried].sort((a, b) => a.freddo - b.freddo);
      const byBrand = new Map();
      for (const f of all) if (!byBrand.has(brandKey(f.cafe))) byBrand.set(brandKey(f.cafe), f);
      cityEntry.cafes = [...byBrand.values()].slice(0, TOP_PER_CITY);
      checkpoint();
    }
    console.log(`  ${cityEntry.cafes.length} cafés sell Freddo Espresso (of ${found.length} priced)`);
    checkpoint();
  }

  checkpoint();
  console.log(`\nWrote ${data.cities.reduce((n, c) => n + c.cafes.length, 0)} cafés → ${BOLT_OUT}`);
  mergeAndWrite();
}
