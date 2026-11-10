/**
 * Manual, CAPTCHA-assisted fuel refresh.
 *
 * The government portal (https://petroleumprices.meci.gov.cy/) now requires a
 * CAPTCHA on every price query, so it cannot be scraped unattended. The refresh
 * is therefore manual:
 *
 *   1. A human opens the portal, picks a fuel type + "Όλες" (all districts),
 *      solves the CAPTCHA and searches.
 *   2. The resulting station table is captured to scripts/fuel-scrape/<key>.json
 *      as { fuel, count, stations: [{ brand, address, district, price, tel }] }.
 *      (See scripts/fuel-scrape/README.md.)
 *   3. Run this script: it backfills each station's coordinates from the last
 *      fuel-prices.json (matched by address) and regenerates fuel-prices.json,
 *      fuel-price-history.json and the three posts.
 *
 * Keys expected: 95, 98, diesel, heating. A missing file reuses that fuel's
 * previous stations from fuel-prices.json so a partial refresh never blanks a
 * fuel type.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildFuelOutputs } from "./fuel/build.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SCRAPE_DIR = path.join(__dirname, "fuel-scrape");
const JSON_OUT = path.join(ROOT, "src", "data", "fuel-prices.json");

const FUELS = [
  { key: "95", jsonKey: "95" },
  { key: "98", jsonKey: "98" },
  { key: "diesel", jsonKey: "diesel" },
  { key: "heating", jsonKey: "heating" },
];

function mapsUrlFor(address, lat, lng) {
  return lat != null && lng != null
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
}

function main() {
  const prev = fs.existsSync(JSON_OUT) ? JSON.parse(fs.readFileSync(JSON_OUT, "utf8")) : { fuels: {} };

  // address -> { lat, lng } from every previous fuel list (coords are per
  // location, so a station geocoded under 95 also fixes it under diesel)
  const coords = {};
  for (const f of Object.values(prev.fuels || {})) {
    for (const s of f.stations || []) {
      if (s.lat != null && s.lng != null && !coords[s.address]) coords[s.address] = { lat: s.lat, lng: s.lng };
    }
  }

  const results = [];
  let missingCoords = 0;
  for (const fuel of FUELS) {
    const file = path.join(SCRAPE_DIR, `${fuel.key}.json`);
    let allStations;
    if (fs.existsSync(file)) {
      const scraped = JSON.parse(fs.readFileSync(file, "utf8"));
      allStations = (scraped.stations || []).map((s) => {
        const c = coords[s.address] || {};
        // prefer coordinates the scrape itself captured, else backfill by address
        const lat = s.lat ?? c.lat ?? null;
        const lng = s.lng ?? c.lng ?? null;
        if (lat == null) missingCoords++;
        return { brand: s.brand, address: s.address, district: s.district, price: s.price, mapsUrl: mapsUrlFor(s.address, lat, lng), lat, lng };
      });
      console.log(`${fuel.key}: ${allStations.length} stations from scrape`);
    } else {
      allStations = (prev.fuels?.[fuel.jsonKey]?.stations || []).slice();
      console.warn(`${fuel.key}: no scrape file — reusing ${allStations.length} previous stations`);
    }
    results.push({ allStations });
  }

  if (missingCoords) console.warn(`${missingCoords} station(s) had no known coordinates — using an address search link.`);

  return buildFuelOutputs(results, { root: ROOT });
}

main();
