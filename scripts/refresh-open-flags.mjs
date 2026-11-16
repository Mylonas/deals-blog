/**
 * Cheap availability refresh for the stored Bolt (and Wolt) venue files.
 *
 * The full Bolt scans take about five hours (10 s between requests), but whether a
 * venue is taking orders right now is already in the venue LIST each scan starts
 * from: Bolt's findProviders (`is_available_for_delivery`, false = closed or
 * "scheduled only") and Wolt's restaurants page (`online`). One call per city and
 * platform is enough to update `open` on every stored venue, without re-pricing
 * anything. Item-level availability is NOT refreshed here (the scans do that).
 *
 * Usage: node scripts/refresh-open-flags.mjs            (updates the four raw files, then re-merges)
 *        node scripts/refresh-open-flags.mjs --bolt-only
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { mergeAndWrite as mergeCoffee } from "./merge-coffee-sources.mjs";
import { mergeAndWrite as mergeSouvlaki } from "./merge-souvlaki-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const D = (f) => path.join(ROOT, "src/data", f);
const BOLT_ONLY = process.argv.includes("--bolt-only");

const CITIES = {
  nicosia: { lat: 35.1856, lon: 33.3823 },
  limassol: { lat: 34.7071, lon: 33.0226 },
  larnaca: { lat: 34.9167, lon: 33.6233 },
  paphos: { lat: 34.7754, lon: 32.4245 },
  famagusta: { lat: 35.038, lon: 33.983 },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Bolt ──────────────────────────────────────────────────────────────────────
const BOLT = "https://deliveryuser.live.boltsvc.net";
const DEVICE = new URLSearchParams({ version: "FW.1.88", deviceId: "dealshub-" + Math.random().toString(36).slice(2, 10), deviceType: "web", device_name: "web", device_os_version: "web", language: "en-US" });
async function boltOpenByProvider(city) {
  const res = await fetch(`${BOLT}/deliveryClient/public/findProviders?${DEVICE}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)", Origin: "https://food.bolt.eu" },
    body: JSON.stringify({ filters: [], lat: city.lat, lng: city.lon }),
    signal: AbortSignal.timeout(30000),
  });
  const json = await res.json();
  const map = new Map();
  for (const p of json.data?.providers || []) map.set(p.provider_id, p.is_available_for_delivery === true);
  return map;
}

// ── Wolt ──────────────────────────────────────────────────────────────────────
async function woltOpenBySlug(city) {
  const res = await fetch(`https://restaurant-api.wolt.com/v1/pages/restaurants?lat=${city.lat}&lon=${city.lon}`, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" },
    signal: AbortSignal.timeout(30000),
  });
  const json = await res.json();
  const map = new Map();
  for (const s of json.sections || []) for (const it of s.items || []) if (it.venue?.slug) map.set(it.venue.slug, it.venue.online === true);
  return map;
}

/** Apply the flags to one raw file. `list` = "cafes" | "venues". */
function apply(file, list, lookup, keyOf) {
  if (!fs.existsSync(file)) return { total: 0, closed: 0, unknown: 0 };
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  let total = 0, closed = 0, unknown = 0;
  for (const city of data.cities || []) {
    const map = lookup.get(city.key);
    for (const v of city[list] || []) {
      total++;
      const flag = map?.get(keyOf(v));
      if (flag === undefined) { unknown++; continue; }
      v.open = flag;
      if (!flag) closed++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  return { total, closed, unknown };
}

const slugOf = (v) => v.slug || v.url?.split("/restaurant/")[1]?.replace(/\/$/, "");

const bolt = new Map();
const wolt = new Map();
for (const [key, city] of Object.entries(CITIES)) {
  bolt.set(key, await boltOpenByProvider(city));
  await sleep(3000);
  if (!BOLT_ONLY) {
    wolt.set(key, await woltOpenBySlug(city));
    await sleep(1500);
  }
}

const report = {
  "coffee bolt": apply(D("coffee-prices-bolt.json"), "cafes", bolt, (v) => v.provider_id),
  "souvlaki bolt": apply(D("souvlaki-prices-bolt.json"), "venues", bolt, (v) => v.provider_id),
};
if (!BOLT_ONLY) {
  report["coffee wolt"] = apply(D("coffee-prices-wolt.json"), "cafes", wolt, (v) => slugOf(v));
  report["souvlaki wolt"] = apply(D("souvlaki-prices-wolt.json"), "venues", wolt, (v) => slugOf(v));
}
console.log(JSON.stringify(report, null, 1));
mergeCoffee();
mergeSouvlaki();
