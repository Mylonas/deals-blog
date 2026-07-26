/**
 * Watchdog script — checks if live data files are stale and reports which workflows need re-running.
 * Called by watchdog.yml every 2 hours. Exits with code 0 always; prints JSON results to stdout
 * so the workflow can decide which workflows to re-trigger.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Until 2026-07-26 this list held only the four hourly files below. All four
// were healthy the whole time supermarket-deals sat 17 days stale, the price
// history cache decayed to 2% fresh, and coffee-prices-bolt froze for 18 days —
// none of which were watched. The watchdog was checking the things that don't
// break. The daily and weekly files are now covered too.
//
// Optional per-check fields:
//   freshness  - derive the timestamp when the file has no `updatedAt`
//   retrigger  - false for files whose workflow cannot self-heal; they are
//                reported but never re-dispatched, so the issue-after-3-failures
//                path is not spammed with runs that are expected to fail
const WEEKLY_MAX_AGE = 8 * 24; // a day of slack over the 7-day cadence
const DAILY_MAX_AGE = 36;

const CHECKS = [
  {
    file: "src/data/fuel-prices.json",
    workflow: "update-fuel-prices.yml",
    label: "Fuel Prices",
    maxAgeHours: 2,
  },
  {
    file: "src/data/supermarket-prices.json",
    workflow: "update-supermarket-prices.yml",
    label: "Supermarket Prices",
    maxAgeHours: 2,
  },
  {
    file: "src/data/coffee-prices.json",
    workflow: "update-coffee-prices.yml",
    label: "Coffee Prices",
    maxAgeHours: 2,
  },
  {
    file: "src/data/trending-topics.json",
    workflow: "fetch-trending-topics.yml",
    label: "Trending Topics",
    maxAgeHours: 4,
  },

  // Daily — both produced by the merge job of the sharded history workflow.
  {
    file: "src/data/supermarket-deals.json",
    workflow: "update-price-history-sharded.yml",
    label: "Supermarket Deals",
    maxAgeHours: DAILY_MAX_AGE,
  },
  {
    file: "src/data/product-price-history.json",
    workflow: "update-price-history-sharded.yml",
    label: "Price History Cache",
    // No updatedAt: freshness is the newest per-product asOf. Day granularity,
    // so allow two days rather than 36h — a cache dated yesterday is fine.
    maxAgeHours: 48,
    freshness: (raw) => {
      const dates = Object.values(raw.products ?? {})
        .map((e) => e?.asOf)
        .filter(Boolean)
        .sort();
      return dates.length ? `${dates[dates.length - 1]}T00:00:00Z` : null;
    },
  },

  // Weekly — coffee on Mondays, souvlaki on Tuesdays.
  {
    file: "src/data/coffee-prices-bolt.json",
    workflow: "update-coffee-prices-bolt.yml",
    label: "Coffee — Bolt",
    maxAgeHours: WEEKLY_MAX_AGE,
  },
  {
    file: "src/data/coffee-prices-foody.json",
    workflow: "update-coffee-prices-foody.yml",
    label: "Coffee — Foody",
    maxAgeHours: WEEKLY_MAX_AGE,
  },
  {
    file: "src/data/coffee-prices-wolt.json",
    workflow: "update-coffee-prices-monthly.yml",
    label: "Coffee — Wolt",
    maxAgeHours: WEEKLY_MAX_AGE,
  },
  {
    file: "src/data/souvlaki-prices.json",
    workflow: "update-souvlaki-prices.yml",
    label: "Souvlaki — merged",
    maxAgeHours: WEEKLY_MAX_AGE,
  },
  {
    file: "src/data/souvlaki-prices-bolt.json",
    workflow: "update-souvlaki-prices-bolt.yml",
    label: "Souvlaki — Bolt",
    maxAgeHours: WEEKLY_MAX_AGE,
  },
  {
    file: "src/data/souvlaki-prices-foody.json",
    workflow: "update-souvlaki-prices-foody.yml",
    label: "Souvlaki — Foody",
    maxAgeHours: WEEKLY_MAX_AGE,
  },

  // Cars can only be scraped from a residential IP, so the workflow is manual
  // and re-dispatching it would fail by design. Report only.
  {
    file: "src/data/bazaraki-cars.json",
    workflow: "update-bazaraki-cars.yml",
    label: "Bazaraki Cars (manual — run `npm run cars:local`)",
    maxAgeHours: 14 * 24,
    retrigger: false,
  },
];

const now = Date.now();
const stale = [];
const healthy = [];

for (const check of CHECKS) {
  const filePath = path.join(ROOT, check.file);
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const updatedAt = check.freshness ? check.freshness(raw) : raw.updatedAt;
    if (!updatedAt) throw new Error("no updatedAt field");

    const ageMs = now - new Date(updatedAt).getTime();
    const ageHours = ageMs / 36e5;
    const isStale = ageHours > check.maxAgeHours;

    const entry = { ...check, ageHours: +ageHours.toFixed(2), updatedAt };
    if (isStale) {
      stale.push(entry);
      console.error(`STALE [${check.label}] — last updated ${ageHours.toFixed(1)}h ago (max ${check.maxAgeHours}h)`);
    } else {
      healthy.push(entry);
      console.error(`OK    [${check.label}] — last updated ${ageHours.toFixed(1)}h ago`);
    }
  } catch (e) {
    const entry = { ...check, error: e.message, ageHours: 999, updatedAt: null };
    stale.push(entry);
    console.error(`ERROR [${check.label}] — ${e.message}`);
  }
}

// Write stale workflow filenames to stdout (one per line) for the shell to
// re-trigger. Deduplicated — the sharded workflow backs two checked files, and
// dispatching it twice would double-count toward the failure threshold. Checks
// marked `retrigger: false` are reported in the log above but never dispatched.
const toRetrigger = [...new Set(stale.filter((s) => s.retrigger !== false).map((s) => s.workflow))];
for (const workflow of toRetrigger) {
  process.stdout.write(workflow + "\n");
}

if (stale.length === 0) {
  console.error("All data sources healthy.");
}
