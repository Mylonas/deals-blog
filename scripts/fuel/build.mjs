/**
 * Shared fuel-data build logic: turns per-fuel station lists into the site's
 * fuel-prices.json, fuel-price-history.json and the three localized posts.
 *
 * Used by scripts/load-fuel-from-scrape.mjs (the manual, CAPTCHA-assisted
 * refresh — see scripts/fuel-scrape/README.md). The old live scraper
 * (update-fuel-prices.mjs) is retired because the government portal now gates
 * every query behind a CAPTCHA.
 */
import fs from "fs";
import path from "path";

export const PORTAL_URL = "https://petroleumprices.meci.gov.cy/";
const MAX_HISTORY_DAYS = 365;
const LITRES_PER_BARREL = 158.987;

// ── station rows / post blocks ────────────────────────────────────────────────

function stationRows(stations, fallbackMin) {
  if (stations.length > 0) {
    return stations
      .map((s) => `| ${s.brand} | [${s.address}](${s.mapsUrl}) | ${s.district} | €${s.price.toFixed(3)} |`)
      .join("\n");
  }
  return `| — | [View on government portal](${PORTAL_URL}) | All | €${fallbackMin.toFixed(3)} |`;
}

function block(results, today, t) {
  const [s95, s98, sd, sh] = results;
  return `
## ${t.h95}

| ${t.cBrand} | ${t.cAddr} | ${t.cArea} | ${t.cPrice} |
|---|---|---|---|
${stationRows(s95.stations, s95.min)}

## ${t.h98}

| ${t.cBrand} | ${t.cAddr} | ${t.cArea} | ${t.cPrice} |
|---|---|---|---|
${stationRows(s98.stations, s98.min)}

## ${t.hDiesel}

| ${t.cBrand} | ${t.cAddr} | ${t.cArea} | ${t.cPrice} |
|---|---|---|---|
${stationRows(sd.stations, sd.min)}

## ${t.hHeating}

| ${t.cBrand} | ${t.cAddr} | ${t.cArea} | ${t.cPrice} |
|---|---|---|---|
${stationRows(sh.stations, sh.min)}

> ${t.source} — ${today}
`;
}

const T = {
  en: {
    h95: "7 Cheapest Stations Right Now — Unleaded 95",
    h98: "7 Cheapest Stations Right Now — Unleaded 98",
    hDiesel: "7 Cheapest Stations Right Now — Diesel",
    hHeating: "7 Cheapest Stations Right Now — Heating Oil",
    cBrand: "Brand", cAddr: "Address", cArea: "Area", cPrice: "Price",
    source: `Source: [Cyprus Gov Petroleum Prices](${PORTAL_URL}) — updated`,
  },
  el: {
    h95: "7 Φθηνότερα Πρατήρια Αυτή τη Στιγμή — Αμόλυβδη 95",
    h98: "7 Φθηνότερα Πρατήρια Αυτή τη Στιγμή — Αμόλυβδη 98",
    hDiesel: "7 Φθηνότερα Πρατήρια Αυτή τη Στιγμή — Πετρέλαιο Κίνησης",
    hHeating: "7 Φθηνότερα Πρατήρια Αυτή τη Στιγμή — Πετρέλαιο Θέρμανσης",
    cBrand: "Εταιρεία", cAddr: "Διεύθυνση", cArea: "Περιοχή", cPrice: "Τιμή",
    source: `Πηγή: [Παρατηρητήριο Τιμών Καυσίμων Κύπρου](${PORTAL_URL}) — ενημέρωση`,
  },
  ru: {
    h95: "7 самых дешёвых АЗС прямо сейчас — АИ-95",
    h98: "7 самых дешёвых АЗС прямо сейчас — АИ-98",
    hDiesel: "7 самых дешёвых АЗС прямо сейчас — Дизель",
    hHeating: "7 самых дешёвых АЗС прямо сейчас — Печное топливо",
    cBrand: "Бренд", cAddr: "Адрес", cArea: "Район", cPrice: "Цена",
    source: `Источник: [Правительственный портал цен на топливо Кипра](${PORTAL_URL}) — обновлено`,
  },
};

// ── post file patching ────────────────────────────────────────────────────────

function touchUpdated(content) {
  const today = new Date().toISOString().slice(0, 10);
  if (/^updated:.*$/m.test(content)) return content.replace(/^updated:.*$/m, `updated: "${today}"`);
  return content.replace(/^(date:.*)$/m, `$1\nupdated: "${today}"`);
}

function updatePost(filePath, newBlock) {
  const content = fs.readFileSync(filePath, "utf8");
  const START = "<!-- FUEL_PRICES_START -->";
  const END = "<!-- FUEL_PRICES_END -->";
  const si = content.indexOf(START);
  const ei = content.indexOf(END);
  if (si === -1 || ei === -1) { console.warn(`Markers not found in ${filePath}`); return false; }
  const next = content.slice(0, si + START.length) + "\n" + newBlock + "\n" + content.slice(ei);
  fs.writeFileSync(filePath, touchUpdated(next), "utf8");
  return true;
}

// ── Brent crude (optional extra on the history chart) ──────────────────────────

async function fetchBrentEurPerLitre() {
  try {
    const yRes = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?range=5d&interval=1d", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" },
    });
    if (!yRes.ok) throw new Error(`yahoo HTTP ${yRes.status}`);
    const yData = await yRes.json();
    const closes = (yData.chart.result[0].indicators.quote[0].close || []).filter((c) => c != null);
    if (!closes.length) throw new Error("no Brent closes");
    const usdPerBarrel = closes[closes.length - 1];
    const fxRes = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR");
    if (!fxRes.ok) throw new Error(`fx HTTP ${fxRes.status}`);
    const fx = (await fxRes.json()).rates.EUR;
    return Math.round((usdPerBarrel * fx / LITRES_PER_BARREL) * 1000) / 1000;
  } catch (e) {
    console.warn(`Brent fetch failed (non-fatal): ${e.message}`);
    return null;
  }
}

function stats(stations) {
  const prices = stations.map((s) => s.price).filter((p) => p > 0).sort((a, b) => a - b);
  if (!prices.length) return { min: 0, avg: 0, max: 0 };
  const min = prices[0];
  const max = prices[prices.length - 1];
  const avg = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 1000) / 1000;
  return { min, avg, max };
}

/**
 * results: array of 4 objects [{ allStations }] in order 95, 98, diesel, heating.
 * Each allStations entry: { brand, address, district, price, mapsUrl, lat, lng }.
 * Writes JSON, appends history (with the same guards as the live scraper), and
 * patches the three posts. Returns the number of posts updated.
 */
export async function buildFuelOutputs(results, { root }) {
  const JSON_OUT = path.join(root, "src", "data", "fuel-prices.json");
  const HISTORY_OUT = path.join(root, "src", "data", "fuel-price-history.json");

  // sort each list ascending and derive the top-7 cheapest for the posts
  for (const r of results) {
    r.allStations = [...r.allStations].sort((a, b) => a.price - b.price);
    r.stations = r.allStations.slice(0, 7);
    r.min = r.stations.length ? r.stations[0].price : 0;
  }

  const jsonData = {
    updatedAt: new Date().toISOString(),
    fuels: {
      "95":      { label: "Unleaded 95", stations: results[0].allStations },
      "98":      { label: "Unleaded 98", stations: results[1].allStations },
      "diesel":  { label: "Diesel",      stations: results[2].allStations },
      "heating": { label: "Heating Oil", stations: results[3].allStations },
    },
  };
  fs.writeFileSync(JSON_OUT, JSON.stringify(jsonData, null, 2) + "\n");
  console.log(`Wrote fuel JSON: ${JSON_OUT}`);

  const stats95 = stats(results[0].allStations);
  const stats98 = stats(results[1].allStations);
  const statsDiesel = stats(results[2].allStations);
  const statsHeating = stats(results[3].allStations);

  const historyFile = fs.existsSync(HISTORY_OUT)
    ? JSON.parse(fs.readFileSync(HISTORY_OUT, "utf8"))
    : { history: [] };
  historyFile.history = historyFile.history.filter((e) => e["95"] && typeof e["95"] === "object");

  const validData = stats95.min > 0 && stats98.min > 0 && statsDiesel.min > 0;
  if (!validData) console.log("History: skipping — no valid prices.");

  const last = historyFile.history[historyFile.history.length - 1];
  const changed = (prev, curr) => !prev || prev.min !== curr.min || prev.avg !== curr.avg || prev.max !== curr.max;
  const pricesChanged = !last
    || changed(last["95"], stats95) || changed(last["98"], stats98)
    || changed(last.diesel, statsDiesel) || changed(last.heating, statsHeating);

  let spikeDetected = false;
  if (validData && last) {
    for (const k of ["95", "98", "diesel", "heating"]) {
      const cur = { "95": stats95, "98": stats98, diesel: statsDiesel, heating: statsHeating }[k];
      const prev = last[k];
      if (!prev || !cur || cur.min === 0) continue;
      const drop = (prev.min - cur.min) / prev.min;
      if (drop > 0.15) {
        console.log(`History: spike guard — ${k} min dropped ${(drop * 100).toFixed(1)}%, skipping.`);
        spikeDetected = true;
      }
    }
  }

  if (validData && pricesChanged && !spikeDetected) {
    const brent = await fetchBrentEurPerLitre();
    const entry = { ts: new Date().toISOString(), "95": stats95, "98": stats98, diesel: statsDiesel, heating: statsHeating };
    if (brent !== null) entry.brent = brent;
    historyFile.history.push(entry);
    const cutoff = Date.now() - MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000;
    historyFile.history = historyFile.history.filter((e) => new Date(e.ts).getTime() >= cutoff);
    fs.writeFileSync(HISTORY_OUT, JSON.stringify(historyFile, null, 2) + "\n");
    console.log(`History: appended (95 min=€${stats95.min.toFixed(3)} avg=€${stats95.avg.toFixed(3)})`);
  } else {
    console.log("History: unchanged or guarded — skipped append.");
  }

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const todayEl = new Date().toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" });
  const todayRu = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  const files = [
    { path: path.join(root, "posts/en/cheapest-petrol-stations-cyprus.md"), block: block(results, today, T.en) },
    { path: path.join(root, "posts/el/cheapest-petrol-stations-cyprus.md"), block: block(results, todayEl, T.el) },
    { path: path.join(root, "posts/ru/cheapest-petrol-stations-cyprus.md"), block: block(results, todayRu, T.ru) },
  ];
  let updated = 0;
  for (const f of files) {
    if (updatePost(f.path, f.block)) { console.log(`Updated: ${f.path}`); updated++; }
  }
  console.log(`Done — updated ${updated}/${files.length} posts.`);
  return updated;
}
