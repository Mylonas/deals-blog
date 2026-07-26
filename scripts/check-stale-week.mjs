/**
 * check-stale-week.mjs — the only thing in this repo allowed to notify anyone.
 *
 * Every data workflow runs at least every 2 days and watchdog.yml silently
 * re-triggers anything that slips. Both are deliberately quiet. This script is
 * the single alerting threshold: a file more than STALE_DAYS days old means the
 * self-healing has been failing for days and a human needs to look.
 *
 * Prints a markdown report to stdout ONLY when something has crossed the line,
 * and exits 0 either way — the workflow decides what to do with the output, and
 * a green run with no output is the normal case.
 *
 * The file list is shared with watchdog.mjs so the two cannot drift apart.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CHECKS } from "./lib/data-checks.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STALE_DAYS = 7;
const STALE_MS = STALE_DAYS * 86400000;

const now = Date.now();
const stale = [];

for (const check of CHECKS) {
  const filePath = path.join(ROOT, check.file);
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const updatedAt = check.freshness ? check.freshness(raw) : raw.updatedAt;
    if (!updatedAt) throw new Error("no updatedAt field");

    const ageMs = now - new Date(updatedAt).getTime();
    if (ageMs > STALE_MS) {
      stale.push({ ...check, days: (ageMs / 86400000).toFixed(1), updatedAt });
    }
  } catch (e) {
    // An unreadable or malformed data file is worth waking someone for too.
    stale.push({ ...check, days: "unknown", updatedAt: null, error: e.message });
  }
}

if (stale.length === 0) {
  console.error(`All data fresher than ${STALE_DAYS} days — nothing to report.`);
  process.exit(0);
}

const lines = [
  `${stale.length} data file(s) have not updated in over ${STALE_DAYS} days.`,
  "",
  "| Data | Age | Last updated | Workflow |",
  "|---|---|---|---|",
  ...stale.map(
    (s) =>
      `| ${s.label} | ${s.error ? `**${s.error}**` : `${s.days} days`} | ${s.updatedAt ?? "—"} | \`${s.workflow}\` |`
  ),
  "",
  "The 2-day schedules and the 2-hourly watchdog have both failed to recover these,",
  "so something needs a look — an upstream API change, an expired secret, or a bug.",
  "",
  "This issue is updated in place while the problem persists; close it once fixed",
  "and it will be reopened only if the data is still stale on the next daily check.",
];

console.log(lines.join("\n"));
console.error(`${stale.length} file(s) over ${STALE_DAYS} days — reporting.`);
