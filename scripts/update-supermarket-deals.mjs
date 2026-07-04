/**
 * Fetches ALL products from e-kalathi.gov.cy plus each product's full daily
 * price history, then writes src/data/supermarket-deals.json with two lists:
 *   - deals:       top 20 products by discount % (previousPrice vs startPrice)
 *   - allTimeLows: products whose price just hit its lowest recorded level
 *
 * Note: the e-kalathi public API exposes global minimum prices only — per-chain
 * pricing requires authentication. Prices shown are the lowest available anywhere.
 * The price-diagram history is an across-chains figure, so all-time-low detection
 * compares it against itself, never against the list price.
 *
 * Run daily via GitHub Actions.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const API = "https://www.e-kalathi.gov.cy/ekalathi-website-server/api";
const OUT = path.join(ROOT, "src", "data", "supermarket-deals.json");
const CACHE = path.join(ROOT, "src", "data", "product-price-history.json");

const PAGE_SIZE = 200;
const TOP_N = 20;
const HISTORY_DAYS = 180;            // sparkline window stored in JSON
const EKALATHI_EPOCH = "2025-09-01"; // e-kalathi has no data before Sep 2025
const ATL_RECENT_DAYS = 7;           // low must have first appeared within this window
const ATL_MIN_HISTORY = 30;          // need at least this many days to call it an all-time low
const ATL_MAX = 20;
const CONCURRENCY = 8;

const CATEGORY_LABELS = {
  "WATER":                      { en: "Water",           el: "Νερό",               ru: "Вода" },
  "FRESH MILK":                 { en: "Fresh Milk",      el: "Φρέσκο Γάλα",        ru: "Свежее молоко" },
  "CHOCOLATES":                 { en: "Chocolates",      el: "Σοκολάτες",           ru: "Шоколад" },
  "BUSCUITS":                   { en: "Biscuits",        el: "Μπισκότα",            ru: "Печенье" },
  "PASTA AND PASTA SAUCES":     { en: "Pasta",           el: "Ζυμαρικά",           ru: "Макароны" },
  "YOGURT":                     { en: "Yogurt",          el: "Γιαούρτι",            ru: "Йогурт" },
  "FLOUR":                      { en: "Flour",           el: "Αλεύρι",              ru: "Мука" },
  "CHEESE":                     { en: "Cheese",          el: "Τυρί",               ru: "Сыр" },
  "EGGS":                       { en: "Eggs",            el: "Αβγά",               ru: "Яйца" },
  "POTATO / CORN / RICE CHIPS": { en: "Snacks",          el: "Σνακ",               ru: "Снеки" },
  "NAPKINGS AND KITCHEN ROLL":  { en: "Paper Products",  el: "Χαρτικά",            ru: "Бумажные изделия" },
  "FRUIT AND VEGETABLE JUICES": { en: "Juices",          el: "Χυμοί",              ru: "Соки" },
  "WET WIPES":                  { en: "Wet Wipes",       el: "Μωρομάντηλα",        ru: "Влажные салфетки" },
  "BREAD":                      { en: "Bread",           el: "Ψωμί",               ru: "Хлеб" },
  "RICE":                       { en: "Rice",            el: "Ρύζι",               ru: "Рис" },
  "OLIVE OIL":                  { en: "Olive Oil",       el: "Ελαιόλαδο",          ru: "Оливковое масло" },
  "COFFEE":                     { en: "Coffee",          el: "Καφές",              ru: "Кофе" },
  "SUGAR":                      { en: "Sugar",           el: "Ζάχαρη",             ru: "Сахар" },
  "BUTTER":                     { en: "Butter",          el: "Βούτυρο",            ru: "Масло" },
};

async function fetchPage(page) {
  const url = `${API}/fetch-product-list?page=${page}&size=${PAGE_SIZE}&productName=`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
  return res.json();
}

async function fetchAllProducts() {
  const first = await fetchPage(0);
  const totalPages = first.totalPages ?? 1;
  const all = [...(first.content || [])];
  console.log(`  Page 0/${totalPages - 1} — ${all.length} products so far`);

  for (let p = 1; p < totalPages; p++) {
    const data = await fetchPage(p);
    const batch = data.content || [];
    all.push(...batch);
    console.log(`  Page ${p}/${totalPages - 1} — ${all.length} products so far`);
    if (batch.length < PAGE_SIZE) break; // safety: last page may be short
  }

  return all;
}

function discountPct(curr, prev) {
  if (prev > 0 && curr < prev) return Math.round((1 - curr / prev) * 100);
  return 0;
}

/**
 * Daily price history for one product between two dates (inclusive).
 * Returns [{ d: "YYYY-MM-DD", p: number }] sorted by date.
 */
async function fetchPriceHistory(productMasterId, from, to) {
  const url = `${API}/fetch-product-price-diagram?id=${productMasterId}&from=${from}&to=${to}`;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 3000 * attempt)); // back off on rate limit
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const entries = await res.json();
      return entries.map((e) => ({ d: e.date, p: e.price }));
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// ── history cache ─────────────────────────────────────────────────────────────
// The cache stores change-points only: [date, price] pairs where the price
// differs from the previous day. Reconstructing gives the full daily series,
// so daily runs only need to fetch the days since the last run instead of
// re-downloading 10 months × 476 products.

function loadCache() {
  if (!fs.existsSync(CACHE)) return { asOf: null, products: {} };
  try {
    return JSON.parse(fs.readFileSync(CACHE, "utf8"));
  } catch {
    return { asOf: null, products: {} };
  }
}

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

/**
 * Bring the cache up to date for the given product ids. New products get a
 * full-history fetch; known products only fetch from the last cached day
 * (re-fetching that day too, in case its figure was revised). Returns
 * Map id → daily series.
 */
async function updateHistories(cache, ids) {
  const today = new Date().toISOString().slice(0, 10);
  const prevAsOf = cache.asOf; // snapshot — cache.asOf may be checkpointed mid-run
  const map = new Map();
  const processed = new Set(); // ids refreshed to `today` this run
  const failedIds = new Set();
  let done = 0;
  let fullLoads = 0;
  const queue = [...ids];

  // Persist progress so a killed run doesn't lose everything. Only products
  // refreshed THIS run go in — older cached entries aren't complete to
  // `today` and would silently extend stale prices under the new asOf.
  function checkpoint() {
    const snapshot = { asOf: today, products: {} };
    for (const id of processed) snapshot.products[id] = cache.products[id];
    fs.writeFileSync(CACHE, JSON.stringify(snapshot) + "\n");
  }

  async function worker() {
    while (queue.length) {
      const id = queue.shift();
      const cached = cache.products[id];
      try {
        let daily;
        if (!cached?.length || !prevAsOf) {
          daily = await fetchPriceHistory(id, EKALATHI_EPOCH, today);
          fullLoads++;
        } else {
          daily = expandPoints(cached, prevAsOf);
          if (prevAsOf < today) {
            const delta = await fetchPriceHistory(id, prevAsOf, today);
            const byDate = new Map(daily.map((e) => [e.d, e]));
            for (const e of delta) byDate.set(e.d, e);
            daily = [...byDate.values()].sort((a, b) => a.d.localeCompare(b.d));
          }
        }
        cache.products[id] = compressDaily(daily);
        processed.add(id);
        map.set(id, daily);
      } catch {
        failedIds.add(id);
        map.set(id, cached ? expandPoints(cached, prevAsOf) : []);
      }
      done++;
      if (done % 50 === 0) checkpoint();
      if (done % 100 === 0) console.log(`  ${done}/${ids.length} histories updated...`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  // Failed products are evicted so the next run does a clean full fetch for
  // them — keeping stale points under today's asOf would freeze their price.
  for (const id of failedIds) delete cache.products[id];
  cache.asOf = today;
  console.log(`  ${done}/${ids.length} done (${fullLoads} full loads${failedIds.size ? `, ${failedIds.size} failed` : ""})`);
  return map;
}

/**
 * A product is at a fresh all-time low when its latest recorded price equals
 * the minimum of its whole history, and that minimum first appeared within the
 * last ATL_RECENT_DAYS days. Returns { low, prevLow, lowSince, pctBelow } or null.
 */
function detectAllTimeLow(history) {
  if (history.length < ATL_MIN_HISTORY) return null;

  const latest = history[history.length - 1];
  const min = Math.min(...history.map((h) => h.p));
  if (latest.p !== min) return null;

  const firstLowIdx = history.findIndex((h) => h.p === min);
  const lowSince = history[firstLowIdx].d;
  const recentCutoff = new Date(Date.now() - ATL_RECENT_DAYS * 86400000).toISOString().slice(0, 10);
  if (lowSince < recentCutoff) return null; // been this cheap for a while — not news

  const before = history.slice(0, firstLowIdx);
  if (!before.length) return null; // low on day one — no previous price to beat
  const prevLow = Math.min(...before.map((h) => h.p));
  if (prevLow <= min) return null;

  return {
    low: min,
    prevLow,
    lowSince,
    pctBelow: Math.round((1 - min / prevLow) * 100),
  };
}

function toDeal(p, { price, previousPrice, discountPct: disc, history, lowSince = undefined }) {
  const catLabels = CATEGORY_LABELS[p.productCategoryNameEnglish] || {
    en: p.productCategoryNameEnglish || "Other",
    el: p.productCategoryNameEnglish || "Άλλο",
    ru: p.productCategoryNameEnglish || "Другое",
  };
  return {
    productMasterId: p.productMasterId,
    name: p.name,
    price,
    previousPrice,
    discountPct: disc,
    category: catLabels.en,
    categoryEl: catLabels.el,
    categoryRu: catLabels.ru,
    thumbnailUrl: p.productThumbnailUrl || null,
    eKalathiUrl: `https://www.e-kalathi.gov.cy/product-information/${p.productMasterId}`,
    availableAtChains: p.numberOfChains || null,
    history,
    ...(lowSince ? { lowSince } : {}),
  };
}

function sparkline(history) {
  const cutoff = new Date(Date.now() - HISTORY_DAYS * 86400000).toISOString().slice(0, 10);
  return history.filter((h) => h.d >= cutoff);
}

async function main() {
  console.log("Fetching ALL supermarket products from e-kalathi.gov.cy...");

  const products = await fetchAllProducts();
  console.log(`Total products fetched: ${products.length}`);

  const cache = loadCache();
  console.log(
    cache.asOf
      ? `\nUpdating price histories (cache as of ${cache.asOf})...`
      : `\nNo cache found — full history load for all ${products.length} products...`
  );
  const histories = await updateHistories(cache, products.map((p) => p.productMasterId));
  fs.writeFileSync(CACHE, JSON.stringify(cache) + "\n");
  console.log(`Cache saved → ${CACHE}`);

  // ── Tab 1: top 20 by list discount ──────────────────────────────────────────
  const withDiscount = products
    .map((p) => ({
      ...p,
      _curr: p.startPrice || 0,
      _prev: p.previousPrice || 0,
      _disc: discountPct(p.startPrice || 0, p.previousPrice || 0),
    }))
    .filter((p) => p._disc > 0 && p._curr > 0);

  console.log(`\nProducts with discount: ${withDiscount.length}`);
  withDiscount.sort((a, b) => b._disc - a._disc);

  const deals = withDiscount.slice(0, TOP_N).map((p) =>
    toDeal(p, {
      price: p._curr,
      previousPrice: p._prev,
      discountPct: p._disc,
      history: sparkline(histories.get(p.productMasterId) || []),
    })
  );

  // ── Tab 2: fresh all-time lows ──────────────────────────────────────────────
  const atlCandidates = [];
  for (const p of products) {
    const history = histories.get(p.productMasterId) || [];
    const atl = detectAllTimeLow(history);
    if (atl) atlCandidates.push({ p, atl, history });
  }

  atlCandidates.sort((a, b) => b.atl.pctBelow - a.atl.pctBelow);
  const allTimeLows = atlCandidates.slice(0, ATL_MAX).map(({ p, atl, history }) =>
    toDeal(p, {
      price: atl.low,
      previousPrice: atl.prevLow,
      discountPct: atl.pctBelow,
      history: sparkline(history),
      lowSince: atl.lowSince,
    })
  );

  console.log(`\nFresh all-time lows: ${atlCandidates.length} found, keeping top ${allTimeLows.length}:`);
  allTimeLows.forEach((d, i) => {
    console.log(`  ${i + 1}. €${d.price.toFixed(2)} (prev low €${d.previousPrice.toFixed(2)}, -${d.discountPct}%, since ${d.lowSince}) ${d.name.slice(0, 45)}`);
  });

  const output = {
    updatedAt: new Date().toISOString(),
    deals,
    allTimeLows,
  };

  fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nTop ${TOP_N} biggest savings:`);
  deals.forEach((d, i) => {
    console.log(`  ${i + 1}. -${d.discountPct}% €${d.price.toFixed(2)} (was €${d.previousPrice.toFixed(2)}) ${d.name.slice(0, 50)}`);
  });
  console.log(`\nWrote ${deals.length} deals + ${allTimeLows.length} all-time lows → ${OUT}`);
}

main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
