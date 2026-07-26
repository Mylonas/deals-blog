/**
 * Merges src/data/price-history-shards/shard-*.json into the shared cache
 * src/data/product-price-history.json.
 *
 * Per product, the entry with the newest asOf wins (shard vs existing cache),
 * so a shard that failed — or never ran — simply contributes nothing and the
 * cache keeps its previous knowledge. Run this before
 * update-supermarket-deals.mjs: merged products are already current, so the
 * deals script only re-fetches whatever the shards missed.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MAIN_CACHE = path.join(ROOT, "src", "data", "product-price-history.json");
const SHARDS_DIR = path.join(ROOT, "src", "data", "price-history-shards");

function loadEntries(file) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const out = {};
    for (const [id, entry] of Object.entries(raw.products || {})) {
      if (entry?.asOf && entry?.points?.length) out[id] = entry;
    }
    return out;
  } catch {
    return {};
  }
}

const merged = fs.existsSync(MAIN_CACHE) ? loadEntries(MAIN_CACHE) : {};
const before = Object.keys(merged).length;

let shardFiles = [];
if (fs.existsSync(SHARDS_DIR)) {
  shardFiles = fs.readdirSync(SHARDS_DIR).filter((f) => /^shard-\d+\.json$/.test(f));
}
if (!shardFiles.length) {
  console.log("No shard files found — cache left untouched.");
  process.exit(0);
}

let contributed = 0;
for (const f of shardFiles) {
  const entries = loadEntries(path.join(SHARDS_DIR, f));
  let used = 0;
  for (const [id, entry] of Object.entries(entries)) {
    if (!merged[id] || entry.asOf > merged[id].asOf) {
      merged[id] = entry;
      used++;
    }
  }
  contributed += used;
  console.log(`  ${f}: ${Object.keys(entries).length} products, ${used} newer than cache`);
}

fs.writeFileSync(MAIN_CACHE, JSON.stringify({ products: merged }) + "\n");
const total = Object.keys(merged).length;
console.log(`Merged ${shardFiles.length} shards: cache ${before} → ${total} products (${contributed} updated)`);

// The shards deliberately swallow fetch timeouts so one slow product cannot
// fail a whole shard. The cost is this job going green while achieving nothing:
// on 2026-07-25 it reported success having updated 10 of 476 products, and had
// been doing so since ~2026-07-08 unnoticed.
//
// Report the coverage rather than exiting non-zero here — the commit step runs
// after this one, and failing now would throw away the partial progress the
// shards did make. The workflow fails on this output *after* committing.
const MIN_UPDATED_PCT = 25;
const updatedPct = total ? (contributed / total) * 100 : 0;
const healthy = total === 0 || updatedPct >= MIN_UPDATED_PCT;

if (!healthy) {
  console.log(
    `Coverage ${updatedPct.toFixed(1)}% is below the ${MIN_UPDATED_PCT}% floor. ` +
    `Usual cause: e-kalathi responding slower than FETCH_TIMEOUT_MS in fetch-price-history-shard.mjs.`
  );
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `updated=${contributed}\ntotal=${total}\nupdated_pct=${updatedPct.toFixed(1)}\nhealthy=${healthy}\n`
  );
}
