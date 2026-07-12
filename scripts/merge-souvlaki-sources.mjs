/**
 * Merges the per-platform souvlaki scans into the single file the pages read.
 *
 *   souvlaki-prices-wolt.json   (Wolt API scan,   update-souvlaki-prices.mjs)
 * + souvlaki-prices-bolt.json   (Bolt API scan,   update-souvlaki-prices-bolt.mjs)
 * + souvlaki-prices-foody.json  (Foody DOM scrape, update-souvlaki-prices-foody.mjs)
 * → souvlaki-prices.json        (merged, imported by the souvlaki pages)
 *
 * Wolt is the canonical base (richest data, real coordinates). Each extra
 * source is folded in per city: a venue matching one already in the merge
 * (by proximity + name, or by a stronger name-only match when a source lacks
 * coordinates — as the Foody DOM scrape does) contributes the cheaper price
 * per cut; unmatched venues are appended. `priceSources` records which
 * platform won each cut and `platforms` lists where the venue was found;
 * per-platform links are kept as `<platform>Url`.
 *
 * The Foody scan only covers GAP venues (souvlaki venues not already on
 * Wolt/Bolt), so in practice it mostly appends rather than merges.
 *
 * Standalone re-merge (after hand-editing a raw file):
 *   node scripts/merge-souvlaki-sources.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
export const WOLT_OUT = path.join(ROOT, "src/data/souvlaki-prices-wolt.json");
export const BOLT_OUT = path.join(ROOT, "src/data/souvlaki-prices-bolt.json");
export const FOODY_OUT = path.join(ROOT, "src/data/souvlaki-prices-foody.json");
export const MERGED_OUT = path.join(ROOT, "src/data/souvlaki-prices.json");

// extra sources folded onto the Wolt base, in priority order
const EXTRA_SOURCES = [
  { platform: "bolt", file: BOLT_OUT },
  { platform: "foody", file: FOODY_OUT },
];

const MATCH_DISTANCE_KM = 0.25;
const MATCH_TOKEN_OVERLAP = 0.5;
// with no coordinates to disambiguate, demand a much stronger name match
const MATCH_TOKEN_OVERLAP_NAMEONLY = 0.8;

// tokens that appear in half the venue names and carry no identity
const STOP_TOKENS = new Set([
  "the", "and", "kai", "restaurant", "tavern", "taverna", "grill", "bar",
  "souvlaki", "souvlakia", "gyros", "gyro", "kebab", "house", "food",
  "nicosia", "limassol", "larnaca", "larnaka", "paphos", "pafos",
]);

function nameTokens(name) {
  return new Set(
    (name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-zα-ω0-9]+/)
      .filter((t) => t.length >= 3 && !STOP_TOKENS.has(t)),
  );
}

const normName = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zα-ω0-9]+/g, " ").trim();

function tokenOverlap(a, b) {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.size || !tb.size) {
    // names made only of stop/short tokens ("AD Souvlaki", "J.F.C Restaurant")
    // carry no identity tokens — fall back to whole-name equality
    return normName(a) && normName(a) === normName(b) ? 1 : 0;
  }
  let hits = 0;
  for (const t of ta) if (tb.has(t)) hits++;
  return hits / Math.min(ta.size, tb.size);
}

function hasCoords(v) {
  return v && v.lat != null && v.lng != null;
}

function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(s));
}

export function sameVenue(a, b) {
  const overlap = tokenOverlap(a.name, b.name);
  if (hasCoords(a) && hasCoords(b)) {
    return distanceKm(a, b) <= MATCH_DISTANCE_KM && overlap >= MATCH_TOKEN_OVERLAP;
  }
  // coordinate-free fallback (Foody): a strong name match within the same city
  return overlap >= MATCH_TOKEN_OVERLAP_NAMEONLY;
}

/** Fold a source venue's prices/link into an existing merged venue. */
function foldInto(base, incoming, platform) {
  const prices = { ...base.prices };
  const priceSources = { ...(base.priceSources || {}) };
  // seed priceSources for cuts that only had the base platform so far
  const basePlatform = base.platforms?.[0] ?? "wolt";
  for (const cut of Object.keys(base.prices || {})) {
    if (priceSources[cut] == null) priceSources[cut] = basePlatform;
  }
  for (const [cut, price] of Object.entries(incoming.prices || {})) {
    if (price == null) continue;
    if (prices[cut] == null || price < prices[cut]) {
      prices[cut] = price;
      priceSources[cut] = platform;
    }
  }
  return {
    ...base,
    prices,
    priceSources,
    [`${platform}Url`]: incoming.url,
    platforms: [...new Set([...(base.platforms || [basePlatform]), platform])],
  };
}

/** Fold one source's venue list for a city onto the running merged list. */
function foldCity(merged, sourceVenues, platform) {
  // a source can list the same venue twice (e.g. Foody's sitemap keeps an old
  // and a new listing side by side) — collapse those before folding
  const source = [];
  for (const sv of sourceVenues || []) if (!source.some((o) => sameVenue(o, sv))) source.push(sv);

  const used = new Set();
  for (let i = 0; i < merged.length; i++) {
    const idx = source.findIndex((sv, j) => !used.has(j) && sameVenue(merged[i], sv));
    if (idx >= 0) {
      used.add(idx);
      merged[i] = foldInto(merged[i], source[idx], platform);
    }
  }
  source.forEach((sv, j) => {
    if (!used.has(j)) merged.push({ ...sv, platforms: [platform] });
  });
  return merged;
}

export function mergeSouvlaki(wolt, extras) {
  const present = extras.filter((e) => e.data?.cities?.length);
  const byCity = present.map((e) => ({ platform: e.platform, map: new Map(e.data.cities.map((c) => [c.key, c.venues])) }));
  return {
    updatedAt: new Date().toISOString(),
    sources: {
      wolt: wolt.updatedAt,
      ...Object.fromEntries(present.map((e) => [e.platform, e.data.updatedAt])),
    },
    cities: wolt.cities.map((c) => {
      let merged = (c.venues || []).map((v) => ({ ...v, platforms: ["wolt"] }));
      for (const { platform, map } of byCity) merged = foldCity(merged, map.get(c.key), platform);
      merged.sort((a, b) => (a.prices.souvlaki ?? 99) - (b.prices.souvlaki ?? 99));
      return { key: c.key, label: c.label, venues: merged };
    }),
  };
}

/** Read all raw source files and write the merged output. */
export function mergeAndWrite() {
  // first run: fall back to the pre-split merged file as the Wolt source,
  // dropping any non-wolt entries a previous merge may have added to it
  const woltFile = fs.existsSync(WOLT_OUT) ? WOLT_OUT : MERGED_OUT;
  const wolt = JSON.parse(fs.readFileSync(woltFile, "utf8"));
  if (woltFile === MERGED_OUT) {
    for (const c of wolt.cities || []) {
      c.venues = (c.venues || []).filter((v) => !v.platforms || v.platforms.includes("wolt"));
    }
  }
  const extras = EXTRA_SOURCES.map((s) => ({
    platform: s.platform,
    data: fs.existsSync(s.file) ? JSON.parse(fs.readFileSync(s.file, "utf8")) : null,
  }));
  const merged = mergeSouvlaki(wolt, extras);
  fs.writeFileSync(MERGED_OUT, JSON.stringify(merged, null, 2) + "\n");
  const total = merged.cities.reduce((s, c) => s + c.venues.length, 0);
  const counts = EXTRA_SOURCES.map((s) => {
    const n = merged.cities.reduce((sum, c) => sum + c.venues.filter((v) => v.platforms?.includes(s.platform)).length, 0);
    return `${n} ${s.platform}`;
  });
  console.log(`Merged ${total} venues (${counts.join(", ")}) → ${MERGED_OUT}`);
  return merged;
}

import { pathToFileURL } from "url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mergeAndWrite();
}
