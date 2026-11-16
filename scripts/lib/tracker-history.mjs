// Small dated history for the coffee and souvlaki trackers, so the home cards can show a REAL change
// line once two genuine data points on different dates exist. One file per Cyprus date:
//   src/data/history/<kind>/<YYYY-MM-DD>.json
// Called at the end of every merge. A second run on the same day overwrites that day's file (latest
// data of the day wins); there is no backfilling and no interpolation. One file per date means the
// CI jobs and the laptop task never fight over a shared file (scripts/ci/commit-data.sh merges
// directories file by file).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 100) / 100) : null;
};
const stat = (xs) => (xs.length ? { min: Math.min(...xs), median: median(xs), n: xs.length } : null);

export const cyprusDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Nicosia" }).format(d);

/** Pure: record for the coffee tracker from the merged `cities` ([{ key, cafes:[{ cafe, freddo }] }]). */
export function coffeeRecord(cities, date, at) {
  const rows = [];
  const byCity = {};
  for (const c of cities || []) {
    const xs = (c.cafes || []).filter((x) => typeof x.freddo === "number" && x.freddo >= 0.8 && x.freddo < 10);
    for (const x of xs) rows.push({ name: x.cafe, city: c.key, price: x.freddo });
    const s = stat(xs.map((x) => x.freddo));
    if (s) byCity[c.key] = { freddo: s };
  }
  rows.sort((a, b) => a.price - b.price);
  const all = stat(rows.map((r) => r.price));
  return { kind: "coffee", d: date, at, home: rows[0] ? { price: rows[0].price, name: rows[0].name, city: rows[0].city } : null, cuts: all ? { freddo: all } : {}, cities: byCity };
}

/** Pure: record for the souvlaki tracker from the merged `cities` ([{ key, venues:[{ name, prices, priceSources, items }] }]). */
export function souvlakiRecord(cities, date, at) {
  const CUTS = ["souvlaki", "chicken", "mix", "porkchop"];
  const ok = (v, cut) => {
    const p = v.prices?.[cut];
    // a Bolt price with no recorded source item has not been audited under the current rules
    if (v.priceSources?.[cut] === "bolt" && !v.items?.[cut]) return false;
    return typeof p === "number" && p >= 1.5 && p < 20;
  };
  const cuts = {};
  const byCity = {};
  const homeRows = [];
  for (const c of cities || []) {
    for (const cut of CUTS) {
      const xs = (c.venues || []).filter((v) => ok(v, cut)).map((v) => v.prices[cut]);
      const s = stat(xs);
      if (s) (byCity[c.key] ??= {})[cut] = s;
    }
    for (const v of c.venues || []) if (ok(v, "souvlaki")) homeRows.push({ name: v.name, city: c.key, price: v.prices.souvlaki });
  }
  for (const cut of CUTS) {
    const xs = (cities || []).flatMap((c) => (c.venues || []).filter((v) => ok(v, cut)).map((v) => v.prices[cut]));
    const s = stat(xs);
    if (s) cuts[cut] = s;
  }
  homeRows.sort((a, b) => a.price - b.price);
  return { kind: "souvlaki", d: date, at, home: homeRows[0] ? { price: homeRows[0].price, name: homeRows[0].name, city: homeRows[0].city } : null, cuts, cities: byCity };
}

export function writeRecord(record) {
  if (!record?.home) return null; // nothing trustworthy to record
  const dir = path.join(ROOT, "src", "data", "history", record.kind);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${record.d}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 1) + "\n");
  return file;
}

export function recordHistory(kind, cities, now = new Date()) {
  const rec = (kind === "coffee" ? coffeeRecord : souvlakiRecord)(cities, cyprusDate(now), now.toISOString());
  return writeRecord(rec);
}
