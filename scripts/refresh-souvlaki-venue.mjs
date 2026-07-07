/**
 * Refetches the menu for specific venues (by slug) and patches their prices
 * in src/data/souvlaki-prices.json, using the exact same extraction logic as
 * the full scan. For when a venue's weekly fetch keeps failing and its
 * carried-over entry is stale — e.g. after an extraction-logic fix.
 *
 * Usage: node scripts/refresh-souvlaki-venue.mjs <slug> [slug...]
 */
import fs from "fs";
import { extractCuts, ASSORTMENT_API, HEADERS, OUT } from "./update-souvlaki-prices.mjs";
import { WOLT_OUT, mergeAndWrite } from "./merge-souvlaki-sources.mjs";

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error("Usage: node scripts/refresh-souvlaki-venue.mjs <slug> [slug...]");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchAssortment(slug) {
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await sleep(20000); // patient — this is a targeted retry
    try {
      const res = await fetch(`${ASSORTMENT_API}/${slug}/assortment`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// patch the raw Wolt scan (falling back to the pre-split merged file), then
// re-merge so the page data picks the change up
const DATA_FILE = fs.existsSync(WOLT_OUT) ? WOLT_OUT : OUT;
const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
let patched = 0;

for (const slug of slugs) {
  let venue = null;
  for (const city of data.cities) {
    venue = city.venues.find((v) => (v.slug || v.url?.split("/restaurant/")[1]) === slug);
    if (venue) break;
  }
  if (!venue) { console.warn(`${slug}: not present in souvlaki-prices.json — skipped`); continue; }

  try {
    const assortment = await fetchAssortment(slug);
    const prices = extractCuts(assortment);
    if (!Object.keys(prices).length) { console.warn(`${slug}: no comparable pita items — left unchanged`); continue; }
    console.log(`${slug}: ${JSON.stringify(venue.prices)} → ${JSON.stringify(prices)}`);
    venue.prices = prices;
    patched++;
  } catch (e) {
    console.error(`${slug}: fetch failed after retries (${e.message}) — left unchanged`);
  }
  await sleep(3000);
}

if (patched) {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(DATA_FILE === OUT ? WOLT_OUT : DATA_FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(`Patched ${patched}/${slugs.length} venues → ${WOLT_OUT}`);
  mergeAndWrite();
} else {
  console.log("Nothing patched.");
}
