/**
 * Scans Bolt Food Cyprus for souvlaki prices and writes the raw scan to
 * src/data/souvlaki-prices-bolt.json, then merges Wolt + Bolt into
 * src/data/souvlaki-prices.json (see merge-souvlaki-sources.mjs).
 *
 * Bolt's client API (deliveryuser.live.boltsvc.net) is unauthenticated but
 * heavily rate-limited: a burst of ~5 requests trips TOO_MANY_REQUESTS, so a
 * single paced worker fetches everything (~10s between requests, 90s backoff
 * on 1005). The scan checkpoints after every venue and carries over venues
 * whose fetch failed, so partial runs still land useful data.
 *
 * Venue discovery: one findProviders call per city returns every provider
 * (~600 in Nicosia). Menu-scan candidates are providers whose name looks
 * souvlaki-ish, plus providers matching a venue already found by the Wolt
 * scan (same place listed on both platforms).
 *
 * Menu extraction differs from Wolt in one key way: Bolt venues usually put
 * the pitta signal in an option group ("Choose Quantity" → Regular Pita +0 /
 * Large Pita +1 / Portion with Fries +1.50) instead of the item name, so a
 * dish with no pitta in its name still counts when it has pitta option
 * values. The cut classifiers (pork/chicken/mix/porkchop, sheftalia combos,
 * gyros exclusion) are imported from the Wolt script so both platforms
 * classify identically.
 *
 * Env knobs (all optional, for validation runs):
 *   BOLT_CITIES=nicosia,larnaca   only scan these city keys
 *   BOLT_MAX_VENUES=3             cap menu scans per city
 *   BOLT_GAP_MS=10000             base gap between requests
 */
import fs from "fs";
import {
  CITIES, normalize,
  PITA_RE, GREEK_RE, MINI_RE, CYPRIOT_RE, LARGE_RE, SIZE_GROUP_RE, NOT_SIZE_VALUE_RE,
  SMALL_VALUE_RE, REGULAR_VALUE_RE, CUTS, PORKCHOP, PORKCHOP_MIN_CENTS, GREEK_DESC_RE, COMBO_RE, SMALL_DESC_RE, REGULAR_DESC_RE, GYROS_FILLING_DESC_RE,
} from "./update-souvlaki-prices.mjs";
import { WOLT_OUT, BOLT_OUT, MERGED_OUT, mergeAndWrite, sameVenue } from "./merge-souvlaki-sources.mjs";

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

// Bolt web city path segments (food.bolt.eu/en/{cityPath}/p/{slug}).
// famagusta is a best guess from the sequential ids — worst case the SPA
// resolves the venue from the slug anyway.
const CITY_PATHS = {
  nicosia: "261-nicosia",
  limassol: "442-limassol",
  larnaca: "443-larnaca",
  paphos: "444-paphos",
  famagusta: "445-ayia-napa",
};

// wide net on venue names — the menu extraction decides what actually counts
const SOUVLAKIISH_RE = /souvl|σουβλ|grill|ψησταρ|psistar|ψητοπωλ|psitop|kebab|κεμπαπ|gyro|γυρο|kalamak|καλαμακ|sheftal|σιεφταλ|σεφταλ|\bpita|πιτα|wrap/;
// menu categories worth fetching vs. obvious non-food/side categories
const FOOD_CAT_RE = /pita|πιτα|souvl|σουβλ|grill|ψητ|sheftal|σιεφτ|σεφτ|mix|μιξ|kebab|κεμπαπ|gyro|γυρ|wrap|μεριδ|portion|main|κυριω|special|σπεσιαλ/;
const SKIP_CAT_RE = /drink|ποτ|αναψυκτ|beer|μπυρ|wine|κρασ|coffee|καφε|dessert|γλυκ|επιδορπ|salad|σαλατ|side|συνοδευτ|sauce|σως|dip|cutlery|μαχαιροπ|extra|bread|ψωμ/;
const MAX_CATEGORIES_PER_VENUE = 5;

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
 * Bolt getMenuDishes returns a flat id→item map: dishes point at option
 * groups via child_ids, groups point at option values. Collect each dish's
 * option values as { name, delta } in euros.
 */
function dishOptionValues(dish, items) {
  const values = [];
  for (const gid of dish.child_ids || []) {
    const group = items[gid];
    if (!group || !/group/.test(group.type || "")) continue;
    const groupName = normalize(group.name?.value);
    for (const vid of group.child_ids || []) {
      const v = items[vid];
      if (!v || !/option/.test(v.type || "") || /group/.test(v.type || "")) continue;
      const delta = typeof v.price?.value === "number" ? v.price.value : null;
      if (delta == null || delta < 0) continue;
      values.push({ name: normalize(v.name?.value), delta, groupName });
    }
  }
  return values;
}

/**
 * Price the regular and large pitta for one dish, or null when the dish is
 * not sold in (comparable Cypriot) pitta. Mirrors the Wolt sizeDeltas rules,
 * extended with Bolt's pitta-as-option pattern.
 */
function pittaPrices(dish, catName, items) {
  const n = normalize(dish.name?.value);
  const base = dish.price?.value;
  if (typeof base !== "number" || base < 1) return null;
  if (GREEK_RE.test(n) || MINI_RE.test(n) || GREEK_RE.test(catName) || MINI_RE.test(catName)) return null;

  // size info only comes from size-type groups (Choose Quantity / Μέγεθος /
  // Πίτα...) or groups that themselves contain pitta values — never from
  // topping/extra groups where "double meat +2" would fake a large price
  // option groups that add something to the pita (Extras / Add / Remove / Spread) never set its size: Romios' "Extra Pita +0.50" was read as the regular size
  const EXTRA_GROUP_RE = /extra|add |add$|remove|spread|sauce|ingredient/;
  const all = dishOptionValues(dish, items).filter((v) => !NOT_SIZE_VALUE_RE.test(v.name) && !EXTRA_GROUP_RE.test(v.groupName));
  const pittaGroups = new Set(all.filter((v) => PITA_RE.test(v.name)).map((v) => v.groupName));
  const options = all.filter((v) => SIZE_GROUP_RE.test(v.groupName) || /quantity|ποσοτητ|επιλογ|choose|διαλεξ/.test(v.groupName) || pittaGroups.has(v.groupName));
  const pittaVals = options.filter((v) => PITA_RE.test(v.name) && !GREEK_RE.test(v.name) && !MINI_RE.test(v.name));
  // a portion / platter is not a pita, even when "pita" is offered as a side option
  if (/portion|μεριδα|platter|πιατο|plate/.test(n) && !PITA_RE.test(n)) return null;
  const namedPitta = PITA_RE.test(n) || PITA_RE.test(catName);
  if (!namedPitta && !pittaVals.length) return null; // portion-only dish

  const isLargeName = LARGE_RE.test(n);
  let regular = null;
  let large = null;

  if (pittaVals.length) {
    // pitta lives in the options: base + cheapest matching value
    const reg = pittaVals.filter((v) => !LARGE_RE.test(v.name));
    const lrg = pittaVals.filter((v) => LARGE_RE.test(v.name));
    if (reg.length) regular = base + Math.min(...reg.map((v) => v.delta));
    if (lrg.length) large = base + Math.min(...lrg.map((v) => v.delta));
  }
  if (namedPitta && regular == null && !isLargeName) {
    // pitta in the name: same free-small / paid-regular default trap as Wolt
    const freeSmall = options.some((v) => SMALL_VALUE_RE.test(v.name) && v.delta === 0);
    const regDeltas = options.filter((v) => REGULAR_VALUE_RE.test(v.name)).map((v) => v.delta);
    regular = base + (freeSmall && regDeltas.length ? Math.min(...regDeltas) : 0);
  }
  if (large == null) {
    if (isLargeName) large = base;
    else {
      const lrgDeltas = options.filter((v) => LARGE_RE.test(v.name)).map((v) => v.delta);
      if (lrgDeltas.length && (namedPitta || pittaVals.length)) large = base + Math.min(...lrgDeltas);
    }
  }
  if (isLargeName) regular = null; // an explicitly-large item prices only the large cut

  const cypriot = CYPRIOT_RE.test(n) || CYPRIOT_RE.test(catName) || pittaVals.some((v) => CYPRIOT_RE.test(v.name));
  return { regular, large, cypriot };
}

/** Same two-tier cheapest-per-cut fold as the Wolt extractCuts. */
export function extractBoltCuts(categoryFetches) {
  const cypriot = {};
  const generic = {};
  const prices = {};
  const traces = new Map([[cypriot, {}], [generic, {}], [prices, {}]]);
  let cur = null;
  let sawGreek = false; // the menu sells a Greek-style / wrapped / mini pita
  const takeInto = (map, key, eur) => {
    if (eur != null && (map[key] == null || eur < map[key])) {
      map[key] = eur;
      if (cur) traces.get(map)[key] = { name: cur.name, cat: cur.cat, desc: cur.desc, price: eur };
    }
  };

  for (const { items, categoryName } of categoryFetches) {
    const catName = normalize(categoryName);
    for (const it of Object.values(items)) {
      if (it.type !== "dish" || it.availability === "not_available") continue;
      const n = normalize(it.name?.value);
      const base = it.price?.value;
      if (typeof base !== "number") continue;
      cur = { name: it.name?.value || "", cat: categoryName, desc: (it.description?.value || "").slice(0, 140) };

      if (PORKCHOP(n) && base * 100 >= PORKCHOP_MIN_CENTS) takeInto(prices, "porkchop", base);

      // Greek-style / wrapped / small / kids items and meal deals never count, whether the
      // signal is in the name, the menu section or the description
      if (GREEK_RE.test(n) || GREEK_RE.test(catName) || MINI_RE.test(n) || MINI_RE.test(catName) || COMBO_RE.test(n)) {
        if (GREEK_RE.test(n) || GREEK_RE.test(catName)) sawGreek = true;
        continue;
      }
      if (GYROS_FILLING_DESC_RE.test(normalize(it.description?.value || "")) && !CYPRIOT_RE.test(n) && !CYPRIOT_RE.test(catName)) { sawGreek = true; continue; }
      if (GREEK_DESC_RE.test(normalize(it.description?.value || ""))) { sawGreek = true; continue; }
      const pitta = pittaPrices(it, catName, items);
      if (!pitta) continue;
      const tier = pitta.cypriot ? cypriot : generic;
      const descSmall = SMALL_DESC_RE.test(normalize(it.description?.value || "")) && !REGULAR_DESC_RE.test(normalize(it.description?.value || ""));
      for (const cut of CUTS) {
        if (!cut.test(n, catName)) continue;
        if (descSmall && !cut.key.startsWith("mix")) continue; // a one-skewer / small pita is not the full-size cut
        if (cut.size === "large") takeInto(tier, cut.key, pitta.large ?? null);
        else {
          takeInto(tier, cut.key, pitta.regular);
          if (cut.largeKey) takeInto(tier, cut.largeKey, pitta.large);
        }
      }
    }
  }
  // a menu that ALSO sells Greek-style pitas: an item with no explicit "Cypriot" marker could be either, so it is excluded
  if (sawGreek) for (const key of Object.keys(generic)) if (cypriot[key] == null) delete generic[key];
  const trace = {};
  if (traces.get(prices).porkchop) trace.porkchop = traces.get(prices).porkchop;
  for (const key of new Set([...Object.keys(cypriot), ...Object.keys(generic)])) {
    prices[key] = cypriot[key] ?? generic[key];
    trace[key] = { ...(cypriot[key] != null ? traces.get(cypriot)[key] : traces.get(generic)[key]), tier: cypriot[key] != null ? "cypriot" : "generic" };
  }
  Object.defineProperty(prices, "__trace", { value: trace, enumerable: false });
  return prices;
}

// ── scan ──────────────────────────────────────────────────────────────────────

export async function findProviders(city) {
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
    // false = "scheduled only" / closed right now (snapshot at scan time)
    open: p.is_available_for_delivery == null ? null : p.is_available_for_delivery === true,
  }));
}

export async function scanVenueMenu(provider, city) {
  const gps = { gps_lat: String(city.lat), gps_lng: String(city.lon) };
  const cats = await boltFetch("/deliveryClient/public/getMenuCategories", {
    params: { provider_id: String(provider.provider_id), ...gps },
  });
  const catList = Object.values(cats.items || {}).filter((x) => x.type === "category" && x.id !== cats.root_id);
  let picked = catList.filter((c) => {
    const cn = normalize(c.name?.value);
    return FOOD_CAT_RE.test(cn) && !SKIP_CAT_RE.test(cn);
  });
  if (!picked.length) picked = catList.filter((c) => !SKIP_CAT_RE.test(normalize(c.name?.value)));
  picked = picked.slice(0, MAX_CATEGORIES_PER_VENUE);

  const fetches = [];
  for (const cat of picked) {
    const dishes = await boltFetch("/deliveryClient/public/getMenuDishes", {
      params: { provider_id: String(provider.provider_id), category_id: String(cat.id), ...gps },
    });
    fetches.push({ items: dishes.items || {}, categoryName: cat.name?.value || "" });
  }
  return extractBoltCuts(fetches);
}

import { pathToFileURL } from "url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prev = fs.existsSync(BOLT_OUT) ? JSON.parse(fs.readFileSync(BOLT_OUT, "utf8")) : { cities: [] };
  const prevByCity = new Map((prev.cities || []).map((c) => [c.key, c.venues]));
  const woltFile = fs.existsSync(WOLT_OUT) ? WOLT_OUT : MERGED_OUT;
  const wolt = fs.existsSync(woltFile) ? JSON.parse(fs.readFileSync(woltFile, "utf8")) : { cities: [] };
  const woltByCity = new Map((wolt.cities || []).map((c) => [c.key, c.venues]));

  const data = { updatedAt: null, cities: [] };
  const checkpoint = () => {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(BOLT_OUT, JSON.stringify(data, null, 2) + "\n");
  };

  for (const city of CITIES) {
    if (ONLY_CITIES && !ONLY_CITIES.has(city.key)) {
      // keep the previous scan for cities excluded from this run
      const kept = prevByCity.get(city.key);
      if (kept?.length) data.cities.push({ key: city.key, label: city.label, venues: kept });
      continue;
    }
    console.log(`\n══ ${city.label.en} (Bolt) ══`);
    const venues = [];
    const cityEntry = { key: city.key, label: city.label, venues };
    data.cities.push(cityEntry);
    let candidates = [];
    try {
      const providers = await findProviders(city);
      const woltVenues = woltByCity.get(city.key) || [];
      candidates = providers.filter((p) => {
        const pn = normalize(p.name);
        return SOUVLAKIISH_RE.test(pn) || woltVenues.some((wv) => sameVenue(wv, p));
      });
      // BOLT_KNOWN_ONLY=1: re-scan only venues this file already lists (no discovery). Used to
      // re-derive the stored Bolt data after a rule change without a five-hour full scan.
      if (process.env.BOLT_KNOWN_ONLY === "1") {
        const known = new Set((prevByCity.get(city.key) || []).map((v) => v.provider_id));
        candidates = providers.filter((p) => known.has(p.provider_id));
      }
      console.log(`  ${providers.length} providers, ${candidates.length} souvlaki candidates`);
    } catch (err) {
      const kept = prevByCity.get(city.key) || [];
      cityEntry.venues = kept;
      console.log(`  ✗ provider list failed (${err.message}) — kept ${kept.length} venues from previous scan`);
      checkpoint();
      continue;
    }

    const failed = new Set();
    let scanned = 0;
    for (const p of candidates) {
      if (scanned >= MAX_VENUES) break;
      scanned++;
      try {
        const prices = await scanVenueMenu(p, city);
        if (Object.keys(prices).length > 0) {
          venues.push({
            name: p.name,
            slug: p.slug,
            provider_id: p.provider_id,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
            url: `https://food.bolt.eu/en/${CITY_PATHS[city.key]}/p/${p.slug}`,
            prices,
            items: prices.__trace,
            source: "bolt",
            open: p.open ?? null,
          });
          console.log(`  ✓ ${p.name}: ${JSON.stringify(prices)}`);
        }
      } catch (err) {
        failed.add(p.provider_id);
        console.log(`  ⚠ ${p.name}: ${err.message}`);
      }
      checkpoint();
    }

    // venues whose fetch failed keep their previous scan's data
    const have = new Set(venues.map((v) => v.provider_id));
    let carried = 0;
    for (const pv of prevByCity.get(city.key) || []) {
      if (failed.has(pv.provider_id) && !have.has(pv.provider_id)) {
        venues.push(pv);
        carried++;
      }
    }
    if (carried) console.log(`  ↻ carried over ${carried} venues from previous scan`);
    venues.sort((a, b) => (a.prices.souvlaki ?? 99) - (b.prices.souvlaki ?? 99));
    console.log(`  ${venues.length} venues sell souvlaki in pita`);
    checkpoint();
  }

  checkpoint();
  console.log(`\nWrote ${data.cities.reduce((n, c) => n + c.venues.length, 0)} venues → ${BOLT_OUT}`);
  mergeAndWrite();
}
