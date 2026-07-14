/**
 * Scans Wolt Cyprus for souvlaki prices in every city, writes the raw scan to
 * src/data/souvlaki-prices-wolt.json, then merges it with the Bolt Food scan
 * (if present) into src/data/souvlaki-prices.json for the souvlaki page.
 *
 * Tracks pita cuts (pork, chicken, mix — regular and large/enisximeni) plus
 * pork chop, which is a portion dish (Μπριζόλα Μερίδα) and never in pita.
 *
 * Bolt Food is scanned separately by update-souvlaki-prices-bolt.mjs (its
 * client API is unauthenticated too, just heavily rate-limited). Prices are
 * platform listings and may include a markup over counter prices.
 *
 * Run weekly via GitHub Actions: node scripts/update-souvlaki-prices.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WOLT_OUT, mergeAndWrite } from "./merge-souvlaki-sources.mjs";

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
// Plain "pita" in Cyprus means Cypriot pitta and counts as-is. Not comparable
// and always excluded (checked in both item name and menu category):
//   - Greek pitta (ελληνική / "πίτες GR"), incl. τυλιχτό (a Greek-style wrap —
//     same thing, per user), and Arabic pitta — different, smaller formats
//   - mini / kids / half (μισή) pittas — smaller portions
// (verified against Foody/Bolt menus and user checks: e.g. Kazamias sells a
// €4.50 mini next to the €8.00 regular; Souvlaki.gr sells Greek pitta only.)
// "Ενισχυμένη" (also sold as "large pitta") is its own format with its own cuts.
const PITA_RE = /pita|πιτα/;
const GREEK_RE = /ελληνικ|greek|ellinik|αραβικ|arabic|\bgr\b|τυλιχτ|t[iy]li(?:cht|xt|ht)/;
const MINI_RE = /μινι|mini|μικρ|mikr|μιση|misi|half|παιδικ|paidik|kids|child/;
// Explicitly Cypriot pitta (name or category). When a venue sells the same cut
// both as Cypriot pitta and as another pitta type (e.g. Thymari: "Premium
// Πίτα" €6.50 vs "Κυπριακή Πίτα" €8.60), the Cypriot price is the comparable one.
const CYPRIOT_RE = /κυπριακ|kypriak|cypriot/;
const LARGE_RE = /ενισχυμεν|enisximen|enishimen|large|μεγαλ|διπλ|double|\bxl\b/;
// Most venues sell large as a size option on the base item, not a separate
// item — resolve option groups that are clearly about size and price the
// upgrade as base + delta.
const SIZE_GROUP_RE = /μεγεθ|size|μεριδα|portion|πιτα|pita/;
const NOT_SIZE_VALUE_RE = /σαλατ|salad|πατατ|fries|chips|ποτο|drink|αναψυκτικ|dip|σως|sauce/;
// Some venues default the size/pitta-type group to a free non-comparable base
// at +0 — the item base price is then NOT the regular Cypriot pitta:
//   - Mr. Boo:            μικρό +0,     κανονικό +3.00
//   - Romios / Dimitris:  μισή +0,      κανονική +2.25 / +2.00
//   - Gyrevontas Ellada:  ελληνική +0,  κυπριακή +2.50
// In all of these the regular cut is base + the regular/Cypriot value's delta.
const SMALL_VALUE_RE = /μικρ|mikr|small|μινι|mini|μιση|misi|half|παιδικ|paidik|kids|child|ελληνικ|greek|ellinik|αραβικ|arabic/;
const REGULAR_VALUE_RE = /κανονικ|kanonik|regular|normal|κυπριακ|kypriak|cypriot/;

// Cypriot mix = pork souvlaki + sheftalia in one pitta. Venues often spell it
// out instead of saying "mix" — "Σουβλάκια & Σιεφταλιά", "Souvlaki and
// Sheftalia" — so a souvlaki/pork + sheftalia combination counts as mix too.
// Gyros/doner "mix" (e.g. "πίτα mix γύρος χοιρινό & κοτόπουλο") is a different
// dish and never counts, whether the gyros signal is in the name or category.
const SHEFTALIA_RE = /s(?:hi|h|ie|i)?eftal|σι?εφταλ/;
const GYRO_RE = /γυρ|gyro|doner|ντονερ|shawarma|σαουαρμα/;
// combo items ("σουβλάκι & σιεφταλιά") are mix, not pork/chicken souvlaki
const PORK_SOUVLAKI = (n) => /souvlaki|σουβλακ/.test(n) && /pork|χοιριν/.test(n) && !/chicken|κοτοπουλ/.test(n) && !SHEFTALIA_RE.test(n);
const CHICKEN_SOUVLAKI = (n) => /souvlaki|σουβλακ/.test(n) && /chicken|κοτοπουλ/.test(n) && !SHEFTALIA_RE.test(n);
const MIX = (n, cat = "") =>
  !GYRO_RE.test(n) && !GYRO_RE.test(cat) &&
  (/\bmix|μιχτ|μιξ|μιγμα|mikti/.test(n) ||
    (/souvlak|σουβλακ|χοιριν|pork/.test(n) && SHEFTALIA_RE.test(n)));

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
 * Size-option deltas attached to an item, in euros added to the base price.
 * Only size-type option groups count, and salad/fries/drink upgrade values
 * never do. Returns:
 *   - large:   cheapest large-size upgrade, or null
 *   - regular: extra cost of the regular size when the group defaults to a
 *              zero-cost small (base price = small pitta), else 0
 */
function sizeDeltas(item, optionsById) {
  let large = null;
  let regular = 0;
  for (const ref of item.options || []) {
    const group = optionsById.get(ref.option_id) ?? optionsById.get(ref.id);
    const groupName = normalize(group?.name ?? ref.name ?? "");
    if (!SIZE_GROUP_RE.test(groupName)) continue;
    let hasFreeSmall = false;
    let regularDelta = null;
    for (const value of group?.values || []) {
      const vn = normalize(value.name || "");
      if (NOT_SIZE_VALUE_RE.test(vn)) continue;
      if (typeof value.price !== "number" || value.price < 0) continue;
      const delta = value.price / 100;
      if (LARGE_RE.test(vn)) {
        if (large == null || delta < large) large = delta;
      } else if (SMALL_VALUE_RE.test(vn) && delta === 0) {
        hasFreeSmall = true;
      } else if (REGULAR_VALUE_RE.test(vn)) {
        if (regularDelta == null || delta < regularDelta) regularDelta = delta;
      }
    }
    // zero-cost small alongside a paid regular ⇒ the base price is the small
    if (hasFreeSmall && regularDelta > 0) regular = regularDelta;
  }
  return { large, regular };
}

function extractCuts(assortment) {
  const items = assortment.items || [];
  const optionsById = new Map();
  for (const o of assortment.options || []) optionsById.set(o.id, o);
  // menu category per item — some venues put the portion signal there instead
  // of the item name (e.g. Fettas: "Pork Souvlaki Pita" €5.25 under
  // "GREEK PITA WRAPS" vs the same name €7.80 under "CYPRIOT PITTA")
  const categoryOf = new Map();
  for (const c of assortment.categories || []) {
    const cn = normalize(c.name);
    for (const id of c.item_ids || []) categoryOf.set(id, cn);
  }

  // Two tiers: explicitly-Cypriot pitta items win over generic pitta items,
  // so a venue's "Premium"/house pitta never undercuts its real Cypriot one.
  const cypriot = {};
  const generic = {};
  const takeInto = (map, key, eur) => {
    if (map[key] == null || eur < map[key]) map[key] = eur;
  };
  const prices = {};
  const take = (key, eur) => takeInto(prices, key, eur); // porkchop & non-tiered

  for (const item of items) {
    // items priced 0 are "configure options" placeholders — not a real price
    if (item.price == null || item.price < 100) continue;
    const n = normalize(item.name);
    const cat = categoryOf.get(item.id) || "";
    const eur = item.price / 100;

    // pork chop: portion dish, no pitta in the name
    if (PORKCHOP(n) && item.price >= PORKCHOP_MIN_CENTS) take("porkchop", eur);

    if (!PITA_RE.test(n) && !PITA_RE.test(cat)) continue;
    // smaller portions — never counted, whether flagged in the name or the category
    if (GREEK_RE.test(n) || MINI_RE.test(n) || GREEK_RE.test(cat) || MINI_RE.test(cat)) continue;
    const isLarge = LARGE_RE.test(n);

    const tier = CYPRIOT_RE.test(n) || CYPRIOT_RE.test(cat) ? cypriot : generic;
    for (const cut of CUTS) {
      if ((cut.size === "large") !== isLarge) continue;
      if (!cut.test(n, cat)) continue;
      const { large, regular } = sizeDeltas(item, optionsById);
      // when the size group defaults to a free small/Greek pitta, base price
      // is that variant — the regular cut costs base + regular delta
      takeInto(tier, cut.key, eur + (isLarge ? 0 : regular));
      // large sold as a size option on the regular item: base + upgrade delta
      if (cut.largeKey && large != null) takeInto(tier, cut.largeKey, eur + large);
    }
  }
  // explicit Cypriot beats generic per cut; porkchop already sits in `prices`
  for (const key of new Set([...Object.keys(cypriot), ...Object.keys(generic)])) {
    prices[key] = cypriot[key] ?? generic[key];
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

// exported for refresh-souvlaki-venue.mjs (targeted single-venue refetch) and
// update-souvlaki-prices-bolt.mjs (shared cut matchers so both platforms
// classify menu items identically)
export { extractCuts, ASSORTMENT_API, HEADERS, OUT, CITIES, normalize };
export { PITA_RE, GREEK_RE, MINI_RE, CYPRIOT_RE, LARGE_RE, SIZE_GROUP_RE, NOT_SIZE_VALUE_RE, SMALL_VALUE_RE, REGULAR_VALUE_RE };
export { SHEFTALIA_RE, GYRO_RE, PORK_SOUVLAKI, CHICKEN_SOUVLAKI, MIX, CUTS, PORKCHOP, PORKCHOP_MIN_CENTS };

// ── main ──────────────────────────────────────────────────────────────────────
// Only run the full scan when executed directly — importing the module for
// extractCuts must not trigger a five-city crawl.
import { pathToFileURL } from "url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // carry-over source: the raw Wolt file; fall back to the merged file from
  // before the wolt/bolt split (filtering out any bolt-only entries)
  const prevFile = fs.existsSync(WOLT_OUT) ? WOLT_OUT : OUT;
  const prev = fs.existsSync(prevFile) ? JSON.parse(fs.readFileSync(prevFile, "utf8")) : { cities: [] };
  for (const c of prev.cities || []) {
    c.venues = (c.venues || []).filter((v) => !v.platforms || v.platforms.includes("wolt"));
  }
  const prevByCity = new Map((prev.cities || []).map((c) => [c.key, c.venues]));

  const data = { updatedAt: null, cities: [] };
  for (const city of CITIES) {
    console.log(`\n══ ${city.label.en} ══`);
    try {
      const venues = await scanCity(city, prevByCity.get(city.key));
      // a soft block (HTTP 200 with no venues) must not erase the carry-over
      // baseline — treat an empty scan like a failed one
      if (!venues.length) throw new Error("scan returned 0 venues");
      data.cities.push({ key: city.key, label: city.label, venues });
    } catch (err) {
      // whole city failed — keep the previous scan's data rather than dropping it
      const kept = prevByCity.get(city.key) || [];
      data.cities.push({ key: city.key, label: city.label, venues: kept });
      console.log(`  ✗ ${err.message} — kept ${kept.length} venues from previous scan`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }

  if (!data.cities.some((c) => c.venues?.length)) {
    console.error("\n✗ Wolt scan produced no venue data for any city — aborting without writing.");
    process.exit(1);
  }

  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(WOLT_OUT, JSON.stringify(data, null, 2) + "\n");
  console.log(`\nWrote ${data.cities.reduce((n, c) => n + c.venues.length, 0)} venues across ${data.cities.length} cities → ${WOLT_OUT}`);
  mergeAndWrite();
}
