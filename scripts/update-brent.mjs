/**
 * Brent crude, refreshed on its own (daily) - independent of the CAPTCHA-gated pump-price refresh.
 *
 * Sources (free, public, no key, no login): Yahoo Finance chart API for the Brent front-month
 * future (BZ=F, USD/barrel, daily bars) and the ECB reference rates via frankfurter (USD->EUR).
 * Writes src/data/brent.json:
 *   updatedAt  when THIS fetch ran
 *   asOf       market date of the latest price (differs from updatedAt at weekends / holidays)
 *   series     [{ d, eurPerLitre }] ~6 months of daily values, for the fuel-page chart
 *
 * If anything fails, or the latest price is older than MAX_AGE_DAYS, the old file is left exactly
 * as it was (old value, old dates) and the script exits 1 - stale data is never re-stamped fresh.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "src", "data", "brent.json");
const LITRES_PER_BARREL = 158.987;
const MAX_AGE_DAYS = 6;                 // longer than any weekend + holiday gap
const SANE_USD = [20, 300];             // reject garbage (unit changes, zero, wrong symbol)
const UA = { "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)", Accept: "application/json" };

export const toEurPerLitre = (usdPerBarrel, usdEur) => Math.round(((usdPerBarrel * usdEur) / LITRES_PER_BARREL) * 1000) / 1000;

async function getJson(url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000), redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

/** Pure: Yahoo chart result -> [{ d, usd }] (dates in UTC, null closes dropped). */
export function parseYahoo(json) {
  const r = json?.chart?.result?.[0];
  const ts = r?.timestamp, close = r?.indicators?.quote?.[0]?.close;
  if (!Array.isArray(ts) || !Array.isArray(close)) throw new Error("unexpected Yahoo response shape");
  const byDay = new Map();
  ts.forEach((t, i) => {
    const c = close[i];
    if (typeof c === "number" && Number.isFinite(c) && c >= SANE_USD[0] && c <= SANE_USD[1]) byDay.set(new Date(t * 1000).toISOString().slice(0, 10), c);
  });
  return [...byDay].map(([d, usd]) => ({ d, usd })).sort((a, b) => a.d.localeCompare(b.d));
}

/** Pure: build the output from bars + ECB rates ({ "YYYY-MM-DD": usdEur }). Rate = latest on/before the day. */
export function buildBrent(bars, rates, now = new Date()) {
  if (!bars.length) throw new Error("no valid Brent prices");
  const days = Object.keys(rates).sort();
  if (!days.length) throw new Error("no USD/EUR rates");
  const rateOn = (d) => { let r = null, rd = null; for (const k of days) { if (k <= d) { r = rates[k]; rd = k; } else break; } return r == null ? { r: rates[days[0]], rd: days[0] } : { r, rd }; };
  const series = bars.map((b) => ({ d: b.d, eurPerLitre: toEurPerLitre(b.usd, rateOn(b.d).r) }));
  const last = bars[bars.length - 1];
  const fx = rateOn(last.d);
  const ageDays = (now.getTime() - new Date(last.d + "T00:00:00Z").getTime()) / 86400000;
  if (ageDays > MAX_AGE_DAYS) throw new Error(`latest Brent price is from ${last.d} (${Math.round(ageDays)} days old) - not publishing it as fresh`);
  return {
    updatedAt: now.toISOString(),
    asOf: last.d,
    usdPerBarrel: Math.round(last.usd * 100) / 100,
    usdEur: fx.r,
    fxDate: fx.rd,
    eurPerLitre: series[series.length - 1].eurPerLitre,
    source: "Yahoo Finance BZ=F (Brent front-month future); ECB USD/EUR via frankfurter.dev",
    series,
  };
}

async function main() {
  const yahoo = await getJson("https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?range=6mo&interval=1d");
  const bars = parseYahoo(yahoo);
  const from = bars[0].d;
  const fx = await getJson(`https://api.frankfurter.dev/v1/${from}..?base=USD&symbols=EUR`);
  const rates = Object.fromEntries(Object.entries(fx.rates || {}).map(([d, v]) => [d, v.EUR]));
  const out = buildBrent(bars, rates);
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`Brent: ${out.usdPerBarrel} USD/bbl = ${out.eurPerLitre} EUR/L as of ${out.asOf} (fx ${out.usdEur} on ${out.fxDate}); ${out.series.length} daily points`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`Brent refresh FAILED - keeping the previous file unchanged: ${e.message}`); process.exit(1); });
}
