/**
 * data-checks.mjs
 * The list of data files whose freshness is monitored, shared by watchdog.mjs
 * (2-hourly silent re-trigger) and check-stale-week.mjs (the 7-day email).
 * Kept in one place so the two can never disagree about what is watched.
 */

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
// Every scheduled data workflow runs at least every 2 days, so anything past
// ~2.5 days has missed a run. These thresholds only drive the silent re-trigger —
// email is handled separately, and only at 7 days, by stale-alert.yml.
//
// Files refreshed by hand are watched too, on a weekly threshold. They cannot
// self-heal, so they carry retrigger: false and reach a human via the 7-day
// email instead — which is the only thing that makes a manual job's neglect
// visible at all.
const TWO_DAY_MAX_AGE = 60;
const DAILY_MAX_AGE = 36;
const WEEKLY_MAX_AGE = 168;

export const CHECKS = [
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

  // Daily — the public-sector jobs feed. Stamps `fetchedAt` rather than
  // `updatedAt`, which is why it needs a freshness reader; it was watched by
  // nothing at all before, despite being a daily user-facing dataset.
  {
    file: "src/data/public-jobs.json",
    workflow: "update-public-jobs.yml",
    label: "Public-sector Jobs",
    maxAgeHours: DAILY_MAX_AGE,
    freshness: (raw) => raw.fetchedAt ?? null,
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

  // Every 2 days — coffee and souvlaki, each source in turn.
  {
    file: "src/data/coffee-prices-bolt.json",
    workflow: "update-coffee-prices-bolt.yml",
    label: "Coffee — Bolt",
    maxAgeHours: TWO_DAY_MAX_AGE,
  },
  {
    file: "src/data/coffee-prices-foody.json",
    workflow: "update-coffee-prices-foody.yml",
    label: "Coffee — Foody",
    maxAgeHours: TWO_DAY_MAX_AGE,
  },
  {
    file: "src/data/coffee-prices-wolt.json",
    workflow: "update-coffee-prices-wolt.yml",
    label: "Coffee — Wolt",
    maxAgeHours: TWO_DAY_MAX_AGE,
  },
  {
    file: "src/data/souvlaki-prices.json",
    workflow: "update-souvlaki-prices.yml",
    label: "Souvlaki — merged",
    maxAgeHours: TWO_DAY_MAX_AGE,
  },
  {
    file: "src/data/souvlaki-prices-bolt.json",
    workflow: "update-souvlaki-prices-bolt.yml",
    label: "Souvlaki — Bolt",
    maxAgeHours: TWO_DAY_MAX_AGE,
  },
  {
    file: "src/data/souvlaki-prices-foody.json",
    workflow: "update-souvlaki-prices-foody.yml",
    label: "Souvlaki — Foody",
    maxAgeHours: TWO_DAY_MAX_AGE,
  },
  {
    // The coffee side watched all three of its per-vendor files while the
    // souvlaki side watched only Bolt and Foody, so a Wolt scan that quietly
    // stopped producing would have shown up nowhere.
    file: "src/data/souvlaki-prices-wolt.json",
    workflow: "update-souvlaki-prices.yml",
    label: "Souvlaki — Wolt",
    maxAgeHours: TWO_DAY_MAX_AGE,
  },

  // Weekly — refreshed by hand, because Bazaraki's Cloudflare challenge cannot
  // be cleared from a datacenter IP (see update-bazaraki-cars.yml). Nothing
  // watched this file before, which is precisely how it froze at 2026-07-23 and
  // again at 2026-07-25 without anyone finding out. retrigger: false because
  // dispatching the workflow would fail on the runner every time; the 7-day
  // email is the whole point of the entry.
  {
    file: "src/data/bazaraki-cars.json",
    workflow: "update-bazaraki-cars.yml",
    label: "Bazaraki Cars (manual — run `npm run cars:local`)",
    maxAgeHours: WEEKLY_MAX_AGE,
    retrigger: false,
  },
];
