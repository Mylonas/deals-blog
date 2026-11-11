/**
 * Convert a raw browser javascript_tool output dump into a clean
 * scripts/fuel-scrape/<key>.json. The browser tool returns a JSON array of
 * {type,text}; the joined text is itself a JSON-stringified payload
 * { crit, count, rows:[{b,a,d,p}] } that may have a trailing note appended.
 *
 *   node scripts/fuel-scrape/from-browser-dump.mjs <dumpFile> <key>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const [dumpFile, key] = process.argv.slice(2);
if (!dumpFile || !key) { console.error("usage: from-browser-dump.mjs <dumpFile> <key>"); process.exit(1); }

const raw = fs.readFileSync(dumpFile, "utf8");
const arr = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1));
let t = arr.map((c) => c.text || "").join("");
// payload may be a bare object or a JSON-string-escaped object; normalise
const start = t.indexOf('{"crit') !== -1 ? t.indexOf('{"crit') : t.indexOf('{\\"crit');
let payload = t.slice(start, t.lastIndexOf("}") + 1);
let obj;
try { obj = JSON.parse(payload); }
catch { obj = JSON.parse(JSON.parse('"' + payload.replace(/\n/g, "\\n") + '"')); }

const stations = obj.rows.map((r) => ({ brand: r.b, address: r.a, district: r.d, price: r.p }));
const out = { fuel: key, crit: obj.crit, count: stations.length, stations };
const outFile = path.join(__dirname, `${key}.json`);
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(`wrote ${outFile}: ${stations.length} stations (${obj.crit})`);
