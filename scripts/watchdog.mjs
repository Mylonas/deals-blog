/**
 * Watchdog script — checks if live data files are stale and reports which workflows need re-running.
 * Called by watchdog.yml every 2 hours. Exits with code 0 always; prints JSON results to stdout
 * so the workflow can decide which workflows to re-trigger.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

import { CHECKS } from "./lib/data-checks.mjs";

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
