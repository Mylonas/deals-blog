/**
 * Fetches e-kalathi daily price history for ONE SHARD of the product catalog
 * and writes src/data/price-history-shards/shard-<K>.json.
 *
 * Why shards: e-kalathi rate-limits per IP, and one runner fetching all ~476
 * histories flirts with the limiter even when paced. Running 10 shards as a
 * GitHub Actions matrix gives each slice its own runner (its own IP), so each
 * one makes ~48 gentle requests — far below the limit.
 *
 * Crash-safety: the shard file is checkpointed every few products, and the
 * workflow commits it with `if: always()`, so a failed or cancelled job still
 * lands whatever it managed to fetch. Products are assigned by
 * productMasterId % SHARDS — stable across runs, no coordination needed.
 *
 * Env: SHARD (0-based index, required), SHARDS (total, default 10)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const API = "https://www.e-kalathi.gov.cy/ekalathi-website-server/api";
const MAIN_CACHE = path.join(ROOT, "src", "data", "product-price-history.json");
const SHARDS_DIR = path.join(ROOT, "src", "data", "price-history-shards");

const SHARD = parseInt(process.env.SHARD ?? "", 10);
const SHARDS = parseInt(process.env.SHARDS ?? "10", 10);
if (isNaN(SHARD) || SHARD < 0 || SHARD >= SHARDS) {
  console.error(`SHARD must be 0..${SHARDS - 1} (got "${process.env.SHARD}")`);
  process.exit(1);
}
const OUT = path.join(SHARDS_DIR, `shard-${SHARD}.json`);

const EKALATHI_EPOCH = "2025-09-01"; // e-kalathi has no data before Sep 2025
const REQUEST_GAP_MS = 250;
const PAGE_SIZE = 200;
const CHECKPOINT_EVERY = 10;

const HEADERS = { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchAllProductIds() {
  const ids = [];
  for (let page = 0; ; page++) {
    const res = await fetch(`${API}/fetch-product-list?page=${page}&size=${PAGE_SIZE}&productName=`, { headers: HEADERS });
    if (!res.ok) throw new Error(`product list HTTP ${res.status}`);
    const json = await res.json();
    for (const p of json.content || []) ids.push(p.productMasterId);
    if (json.last || (json.content || []).length < PAGE_SIZE) break;
    await sleep(REQUEST_GAP_MS);
  }
  return ids;
}

async function fetchPriceHistory(id, from, to) {
  const url = `${API}/fetch-product-price-diagram?id=${id}&from=${from}&to=${to}`;
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(10000 * attempt); // back off on rate limit
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const entries = await res.json();
      return entries.map((e) => ({ d: e.date, p: e.price }));
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// ── change-point cache format (same as update-supermarket-deals.mjs) ──────────

/** Expand change-points back into a daily series up to asOf. */
function expandPoints(points, asOf) {
  if (!points?.length) return [];
  const daily = [];
  let i = 0;
  const end = new Date(asOf + "T00:00:00Z");
  for (let day = new Date(points[0][0] + "T00:00:00Z"); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const d = day.toISOString().slice(0, 10);
    if (i + 1 < points.length && points[i + 1][0] <= d) i++;
    daily.push({ d, p: points[i][1] });
  }
  return daily;
}

/** Compress a daily series into change-points. */
function compressDaily(daily) {
  const points = [];
  for (const { d, p } of daily) {
    if (!points.length || points[points.length - 1][1] !== p) points.push([d, p]);
  }
  return points;
}

function loadEntries(file) {
  if (!fs.existsSync(file)) return {};
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

async function main() {
  const today = new Date().toISOString().slice(0, 10);

  // Seed from whichever source knows more per product: the shared main cache
  // (merged from all shards) or this shard's own last file.
  const seed = loadEntries(MAIN_CACHE);
  for (const [id, entry] of Object.entries(loadEntries(OUT))) {
    if (!seed[id] || entry.asOf > seed[id].asOf) seed[id] = entry;
  }

  console.log(`Shard ${SHARD}/${SHARDS} — fetching product list...`);
  const allIds = await fetchAllProductIds();
  const mine = allIds.filter((id) => id % SHARDS === SHARD);
  console.log(`Assigned ${mine.length} of ${allIds.length} products`);

  const products = {};
  let fetched = 0;
  let fresh = 0;
  let failed = 0;

  function checkpoint() {
    if (!fs.existsSync(SHARDS_DIR)) fs.mkdirSync(SHARDS_DIR, { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ shard: SHARD, shards: SHARDS, asOf: today, products }) + "\n");
  }

  for (const id of mine) {
    const entry = seed[id];
    try {
      if (entry && entry.asOf >= today) {
        products[id] = entry; // already current — no request needed
        fresh++;
      } else if (entry) {
        // known product: fetch only the days since its own asOf
        const daily = expandPoints(entry.points, entry.asOf);
        const delta = await fetchPriceHistory(id, entry.asOf, today);
        const byDate = new Map(daily.map((e) => [e.d, e]));
        for (const e of delta) byDate.set(e.d, e);
        const merged = [...byDate.values()].sort((a, b) => a.d.localeCompare(b.d));
        products[id] = { asOf: today, points: compressDaily(merged) };
        fetched++;
        await sleep(REQUEST_GAP_MS);
      } else {
        const daily = await fetchPriceHistory(id, EKALATHI_EPOCH, today);
        if (daily.length) products[id] = { asOf: today, points: compressDaily(daily) };
        fetched++;
        await sleep(REQUEST_GAP_MS);
      }
    } catch {
      failed++;
      if (entry) products[id] = entry; // keep what we knew — history just ends at its asOf
    }
    if ((fetched + fresh + failed) % CHECKPOINT_EVERY === 0) checkpoint();
  }

  checkpoint();
  console.log(`Shard ${SHARD} done: ${fetched} fetched, ${fresh} already current, ${failed} failed → ${OUT}`);
  // Partial success is success: the workflow commits whatever landed.
  process.exit(0);
}

main().catch((e) => { console.error("Shard failed:", e.message); process.exit(1); });
