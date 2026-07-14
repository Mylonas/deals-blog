/**
 * Merges the per-platform coffee (Freddo Espresso) scans into the `cities`
 * section of coffee-prices.json — the file the coffee pages read.
 *
 *   coffee-prices-wolt.json   (Wolt API scan,    update-freddo-prices.mjs)
 * + coffee-prices-bolt.json   (Bolt API scan,    update-coffee-prices-bolt.mjs)
 * + coffee-prices-foody.json  (Foody DOM scrape, update-coffee-prices-foody.mjs)
 * → coffee-prices.json `cities` (merged, imported by the coffee pages)
 *
 * Same model as merge-souvlaki-sources.mjs: Wolt is the canonical base, each
 * extra source folds in per city — a café matching one already merged (by
 * proximity + name, or a stronger name-only match without coordinates)
 * contributes the cheaper freddo; unmatched cafés are appended. `freddoSource`
 * records which platform won, `platforms` lists where the café was found, and
 * per-platform links live in `<platform>Url`.
 *
 * coffee-prices.json also carries the curated `items`/top-drinks data — the
 * merge only rewrites `cities`, `updatedAt` and `sources`, everything else is
 * preserved.
 *
 * Standalone re-merge (after hand-editing a raw file):
 *   node scripts/merge-coffee-sources.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
export const WOLT_OUT = path.join(ROOT, "src/data/coffee-prices-wolt.json");
export const BOLT_OUT = path.join(ROOT, "src/data/coffee-prices-bolt.json");
export const FOODY_OUT = path.join(ROOT, "src/data/coffee-prices-foody.json");
export const MERGED_OUT = path.join(ROOT, "src/data/coffee-prices.json");

// extra sources folded onto the Wolt base, in priority order
const EXTRA_SOURCES = [
  { platform: "bolt", file: BOLT_OUT },
  { platform: "foody", file: FOODY_OUT },
];

const MATCH_DISTANCE_KM = 0.25;
const MATCH_TOKEN_OVERLAP = 0.5;
// with no coordinates to disambiguate, demand a much stronger name match
const MATCH_TOKEN_OVERLAP_NAMEONLY = 0.8;

// tokens that appear in half the café names and carry no identity — without
// them "Costa Coffee" ≈ "Coffee Island" would count as a 50% name match
const STOP_TOKENS = new Set([
  "the", "and", "kai", "coffee", "cafe", "caffe", "caffee", "kafenio",
  "espresso", "roasters", "roastery", "brew", "brewing", "bar", "house",
  "shop", "coffeeshop", "specialty",
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
    // names made only of stop/short tokens ("AD Coffee") carry no identity
    // tokens — fall back to whole-name equality
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

/** Same café? Café records name the venue in `cafe` (not `name`). */
export function sameCafe(a, b) {
  const overlap = tokenOverlap(a.cafe ?? a.name, b.cafe ?? b.name);
  if (hasCoords(a) && hasCoords(b)) {
    return distanceKm(a, b) <= MATCH_DISTANCE_KM && overlap >= MATCH_TOKEN_OVERLAP;
  }
  // coordinate-free fallback: a strong name match within the same city
  return overlap >= MATCH_TOKEN_OVERLAP_NAMEONLY;
}

/** Fold a source café's price/link into an existing merged café. */
function foldInto(base, incoming, platform) {
  const basePlatform = base.platforms?.[0] ?? "wolt";
  const merged = {
    ...base,
    freddoSource: base.freddoSource ?? basePlatform,
    [`${platform}Url`]: incoming.url,
    platforms: [...new Set([...(base.platforms || [basePlatform]), platform])],
  };
  if (incoming.freddo != null && (merged.freddo == null || incoming.freddo < merged.freddo)) {
    merged.freddo = incoming.freddo;
    merged.freddoSource = platform;
  }
  // Wolt sometimes lacks coordinates for a café another platform has located
  if (!hasCoords(merged) && hasCoords(incoming)) {
    merged.lat = incoming.lat;
    merged.lng = incoming.lng;
  }
  return merged;
}

/** Fold one source's café list for a city onto the running merged list. */
function foldCity(merged, sourceCafes, platform) {
  // a source can list the same café twice (e.g. Foody's sitemap keeps an old
  // and a new listing side by side) — collapse those before folding
  const source = [];
  for (const sc of sourceCafes || []) if (!source.some((o) => sameCafe(o, sc))) source.push(sc);

  const used = new Set();
  for (let i = 0; i < merged.length; i++) {
    const idx = source.findIndex((sc, j) => !used.has(j) && sameCafe(merged[i], sc));
    if (idx >= 0) {
      used.add(idx);
      merged[i] = foldInto(merged[i], source[idx], platform);
    }
  }
  source.forEach((sc, j) => {
    if (!used.has(j)) merged.push({ ...sc, freddoSource: platform, platforms: [platform] });
  });
  return merged;
}

export function mergeCoffee(wolt, extras) {
  const present = extras.filter((e) => e.data?.cities?.length);
  const byCity = present.map((e) => ({ platform: e.platform, map: new Map(e.data.cities.map((c) => [c.key, c.cafes])) }));
  // union of every source's cities — a failed Wolt scan (empty cities) must
  // not erase the Bolt/Foody cafés from the merged file
  const cityDefs = [];
  const seenKeys = new Set();
  for (const src of [wolt, ...present.map((e) => e.data)]) {
    for (const c of src.cities || []) {
      if (seenKeys.has(c.key)) continue;
      seenKeys.add(c.key);
      cityDefs.push({ key: c.key, label: c.label });
    }
  }
  const woltByKey = new Map((wolt.cities || []).map((c) => [c.key, c.cafes]));
  return {
    updatedAt: new Date().toISOString(),
    sources: {
      wolt: wolt.updatedAt,
      ...Object.fromEntries(present.map((e) => [e.platform, e.data.updatedAt])),
    },
    cities: cityDefs.map(({ key, label }) => {
      let merged = (woltByKey.get(key) || []).map((v) => ({ ...v, freddoSource: "wolt", platforms: ["wolt"] }));
      for (const { platform, map } of byCity) merged = foldCity(merged, map.get(key), platform);
      merged.sort((a, b) => (a.freddo ?? 99) - (b.freddo ?? 99));
      return { key, label, cafes: merged };
    }),
  };
}

/** Read all raw source files and rewrite `cities` inside coffee-prices.json. */
export function mergeAndWrite() {
  // first run: fall back to the pre-split merged file as the Wolt source,
  // dropping any non-wolt entries a previous merge may have added to it
  const full = JSON.parse(fs.readFileSync(MERGED_OUT, "utf8"));
  let wolt;
  if (fs.existsSync(WOLT_OUT)) {
    wolt = JSON.parse(fs.readFileSync(WOLT_OUT, "utf8"));
  } else {
    wolt = {
      updatedAt: full.updatedAt,
      cities: (full.cities || []).map((c) => ({
        ...c,
        cafes: (c.cafes || []).filter((v) => !v.platforms || v.platforms.includes("wolt")),
      })),
    };
  }
  const extras = EXTRA_SOURCES.map((s) => ({
    platform: s.platform,
    data: fs.existsSync(s.file) ? JSON.parse(fs.readFileSync(s.file, "utf8")) : null,
  }));
  const merged = mergeCoffee(wolt, extras);
  const out = { ...full, updatedAt: merged.updatedAt, sources: merged.sources, cities: merged.cities };
  fs.writeFileSync(MERGED_OUT, JSON.stringify(out, null, 2) + "\n");
  const total = merged.cities.reduce((s, c) => s + c.cafes.length, 0);
  const counts = EXTRA_SOURCES.map((s) => {
    const n = merged.cities.reduce((sum, c) => sum + c.cafes.filter((v) => v.platforms?.includes(s.platform)).length, 0);
    return `${n} ${s.platform}`;
  });
  console.log(`Merged ${total} cafés (${counts.join(", ")}) → ${MERGED_OUT}`);
  return out;
}

import { pathToFileURL } from "url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mergeAndWrite();
}
