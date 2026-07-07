/**
 * Merges the per-platform souvlaki scans into the single file the pages read.
 *
 *   src/data/souvlaki-prices-wolt.json  (Wolt scan,  update-souvlaki-prices.mjs)
 * + src/data/souvlaki-prices-bolt.json  (Bolt scan,  update-souvlaki-prices-bolt.mjs)
 * → src/data/souvlaki-prices.json       (merged, imported by the souvlaki pages)
 *
 * A venue listed on both platforms is matched by proximity (<250 m) plus name
 * token overlap, and gets the cheaper price per cut; `priceSources` records
 * which platform won each cut so the page could surface it later. Bolt-only
 * venues are appended with their Bolt URL. When the Bolt file is missing the
 * Wolt data passes through unchanged.
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
export const MERGED_OUT = path.join(ROOT, "src/data/souvlaki-prices.json");

const MATCH_DISTANCE_KM = 0.25;
const MATCH_TOKEN_OVERLAP = 0.5;

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

function tokenOverlap(a, b) {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.size || !tb.size) return 0;
  let hits = 0;
  for (const t of ta) if (tb.has(t)) hits++;
  return hits / Math.min(ta.size, tb.size);
}

function distanceKm(a, b) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(s));
}

export function sameVenue(a, b) {
  return distanceKm(a, b) <= MATCH_DISTANCE_KM && tokenOverlap(a.name, b.name) >= MATCH_TOKEN_OVERLAP;
}

function mergeVenue(wolt, bolt) {
  const prices = {};
  const priceSources = {};
  for (const cut of new Set([...Object.keys(wolt.prices || {}), ...Object.keys(bolt.prices || {})])) {
    const w = wolt.prices?.[cut];
    const b = bolt.prices?.[cut];
    if (w != null && (b == null || w <= b)) {
      prices[cut] = w;
      priceSources[cut] = "wolt";
    } else {
      prices[cut] = b;
      priceSources[cut] = "bolt";
    }
  }
  return { ...wolt, prices, priceSources, boltUrl: bolt.url, platforms: ["wolt", "bolt"] };
}

/** Merge one city's venue lists; wolt entries stay canonical. */
function mergeCityVenues(woltVenues, boltVenues) {
  const merged = [];
  const usedBolt = new Set();
  for (const wv of woltVenues || []) {
    const bv = (boltVenues || []).find((b, i) => !usedBolt.has(i) && sameVenue(wv, b));
    if (bv) {
      usedBolt.add((boltVenues || []).indexOf(bv));
      merged.push(mergeVenue(wv, bv));
    } else {
      merged.push({ ...wv, platforms: ["wolt"] });
    }
  }
  (boltVenues || []).forEach((bv, i) => {
    if (!usedBolt.has(i)) merged.push({ ...bv, platforms: ["bolt"] });
  });
  merged.sort((a, b) => (a.prices.souvlaki ?? 99) - (b.prices.souvlaki ?? 99));
  return merged;
}

export function mergeSouvlaki(wolt, bolt) {
  if (!bolt?.cities?.length) return wolt;
  const boltByCity = new Map(bolt.cities.map((c) => [c.key, c.venues]));
  return {
    updatedAt: new Date().toISOString(),
    sources: { wolt: wolt.updatedAt, bolt: bolt.updatedAt },
    cities: wolt.cities.map((c) => ({
      key: c.key,
      label: c.label,
      venues: mergeCityVenues(c.venues, boltByCity.get(c.key)),
    })),
  };
}

/** Read both raw files and write the merged output. */
export function mergeAndWrite() {
  // first run: fall back to the pre-split merged file as the Wolt source,
  // dropping any bolt-only entries a previous merge may have added to it
  const woltFile = fs.existsSync(WOLT_OUT) ? WOLT_OUT : MERGED_OUT;
  const wolt = JSON.parse(fs.readFileSync(woltFile, "utf8"));
  if (woltFile === MERGED_OUT) {
    for (const c of wolt.cities || []) {
      c.venues = (c.venues || []).filter((v) => !v.platforms || v.platforms.includes("wolt"));
    }
  }
  const bolt = fs.existsSync(BOLT_OUT) ? JSON.parse(fs.readFileSync(BOLT_OUT, "utf8")) : null;
  const merged = mergeSouvlaki(wolt, bolt);
  fs.writeFileSync(MERGED_OUT, JSON.stringify(merged, null, 2) + "\n");
  const n = merged.cities.reduce((s, c) => s + c.venues.length, 0);
  const b = merged.cities.reduce((s, c) => s + c.venues.filter((v) => v.platforms?.includes("bolt")).length, 0);
  console.log(`Merged ${n} venues (${b} with Bolt data) → ${MERGED_OUT}`);
  return merged;
}

import { pathToFileURL } from "url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mergeAndWrite();
}
