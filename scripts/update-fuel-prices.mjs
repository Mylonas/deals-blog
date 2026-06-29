/**
 * Fetches live fuel prices from the Cyprus government Petroleum Prices portal
 * https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices
 * Fetches Unleaded 95, Unleaded 98, and Diesel. Run hourly via GitHub Actions.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const GOV_URL = "https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices";
const JSON_OUT = path.join(ROOT, "src", "data", "fuel-prices.json");
const HISTORY_OUT = path.join(ROOT, "src", "data", "fuel-price-history.json");
const MAX_HISTORY_DAYS = 365;

const FUEL_TYPES = [
  { id: "1", label95En: "Unleaded 95", label95El: "Αμόλυβδη 95", label95Ru: "АИ-95" },
  { id: "2", label95En: "Unleaded 98", label95El: "Αμόλυβδη 98", label95Ru: "АИ-98" },
  { id: "3", label95En: "Diesel",      label95El: "Πετρέλαιο Κίνησης", label95Ru: "Дизель" },
];

async function fetchGovPage() {
  const res = await fetch(GOV_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" },
  });
  if (!res.ok) throw new Error(`GET failed: HTTP ${res.status}`);
  const html = await res.text();

  // Parse set-cookie headers into name=value pairs only (strip directives)
  const rawCookies = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : (res.headers.get("set-cookie") || "").split(/,(?=[^ ])/).map(s => s.trim());
  const cookies = rawCookies
    .map(c => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  const tokenMatch = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
  if (!tokenMatch) throw new Error("CSRF token not found");
  return { cookies, token: tokenMatch[1] };
}

async function fetchPricesForType(typeId, token, cookies) {
  const body = new URLSearchParams({
    "__RequestVerificationToken": token,
    "Entity.PetroleumType": typeId,
    "Entity.StationCityEnum": "All",
    "Entity.StationDistrict": "",
  });
  const res = await fetch(GOV_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)",
      "Cookie": cookies,
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`POST failed: HTTP ${res.status}`);
  return res.text();
}

function extractStations(html, limit = 7) {
  const rows = [];
  const trRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRegex.exec(html)) !== null) {
    const row = m[1];
    const coordMatch = row.match(/coordinates=([0-9.]+)%2C([0-9.]+)/);
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    if (cells.length >= 5) {
      const price = parseFloat(cells[4]);
      if (!isNaN(price) && price > 0.5 && price < 4) {
        const address = cells[2].split("τηλ:")[0].trim();
        const mapsUrl = coordMatch
          ? `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}`
          : `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
        const lat = coordMatch ? parseFloat(coordMatch[1]) : null;
        const lng = coordMatch ? parseFloat(coordMatch[2]) : null;
        rows.push({ brand: cells[0], address, district: cells[3], price, mapsUrl, lat, lng });
      }
    }
  }
  return rows.sort((a, b) => a.price - b.price).slice(0, limit);
}

// ── block builders per language ───────────────────────────────────────────────

function stationRows(stations, fallbackMin) {
  if (stations.length > 0) {
    return stations.map((s) =>
      `| ${s.brand} | [${s.address}](${s.mapsUrl}) | ${s.district} | €${s.price.toFixed(3)} |`
    ).join("\n");
  }
  return `| — | [View on government portal](${GOV_URL}) | All | €${fallbackMin.toFixed(3)} |`;
}

function buildBlock(results, today) {
  const s95 = results[0];
  const s98 = results[1];
  const sd  = results[2];

  return `
## 7 Cheapest Stations Right Now — Unleaded 95

| Brand | Address | Area | Price |
|-------|---------|------|-------|
${stationRows(s95.stations, s95.min)}

## 7 Cheapest Stations Right Now — Unleaded 98

| Brand | Address | Area | Price |
|-------|---------|------|-------|
${stationRows(s98.stations, s98.min)}

## 7 Cheapest Stations Right Now — Diesel

| Brand | Address | Area | Price |
|-------|---------|------|-------|
${stationRows(sd.stations, sd.min)}

> Source: [Cyprus Gov Petroleum Prices](${GOV_URL}) — updated ${today}
`;
}

function buildBlockEl(results, today) {
  const s95 = results[0];
  const s98 = results[1];
  const sd  = results[2];

  return `
## 7 Φθηνότερα Πρατήρια Αυτή τη Στιγμή — Αμόλυβδη 95

| Εταιρεία | Διεύθυνση | Περιοχή | Τιμή |
|----------|-----------|---------|------|
${stationRows(s95.stations, s95.min)}

## 7 Φθηνότερα Πρατήρια Αυτή τη Στιγμή — Αμόλυβδη 98

| Εταιρεία | Διεύθυνση | Περιοχή | Τιμή |
|----------|-----------|---------|------|
${stationRows(s98.stations, s98.min)}

## 7 Φθηνότερα Πρατήρια Αυτή τη Στιγμή — Πετρέλαιο Κίνησης

| Εταιρεία | Διεύθυνση | Περιοχή | Τιμή |
|----------|-----------|---------|------|
${stationRows(sd.stations, sd.min)}

> Πηγή: [Παρατηρητήριο Τιμών Καυσίμων Κύπρου](${GOV_URL}) — ενημέρωση ${today}
`;
}

function buildBlockRu(results, today) {
  const s95 = results[0];
  const s98 = results[1];
  const sd  = results[2];

  return `
## 7 самых дешёвых АЗС прямо сейчас — АИ-95

| Бренд | Адрес | Район | Цена |
|-------|-------|-------|------|
${stationRows(s95.stations, s95.min)}

## 7 самых дешёвых АЗС прямо сейчас — АИ-98

| Бренд | Адрес | Район | Цена |
|-------|-------|-------|------|
${stationRows(s98.stations, s98.min)}

## 7 самых дешёвых АЗС прямо сейчас — Дизель

| Бренд | Адрес | Район | Цена |
|-------|-------|-------|------|
${stationRows(sd.stations, sd.min)}

> Источник: [Правительственный портал цен на топливо Кипра](${GOV_URL}) — обновлено ${today}
`;
}

function updatePost(filePath, newBlock) {
  const content = fs.readFileSync(filePath, "utf8");
  const START = "<!-- FUEL_PRICES_START -->";
  const END = "<!-- FUEL_PRICES_END -->";
  const si = content.indexOf(START);
  const ei = content.indexOf(END);
  if (si === -1 || ei === -1) { console.warn(`Markers not found in ${filePath}`); return false; }
  fs.writeFileSync(filePath, content.slice(0, si + START.length) + "\n" + newBlock + "\n" + content.slice(ei), "utf8");
  return true;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const results = [];
  for (const fuel of FUEL_TYPES) {
    console.log(`Fetching session for ${fuel.label95En}...`);
    const { cookies, token } = await fetchGovPage();
    console.log(`Fetching prices for ${fuel.label95En}...`);
    const html = await fetchPricesForType(fuel.id, token, cookies);
    const stations = extractStations(html, 7);
    const allStations = extractStations(html, 100);

    const min = stations.length > 0 ? stations[0].price : 0;
    console.log(`  ${fuel.label95En}: ${allStations.length} stations total, cheapest €${min.toFixed(3)}`);
    results.push({ stations, allStations, min, fuelId: fuel.id, labelEn: fuel.label95En });
  }

  // Write JSON for the interactive page
  const jsonData = {
    updatedAt: new Date().toISOString(),
    fuels: {
      "95":     { label: "Unleaded 95",  stations: results[0].allStations },
      "98":     { label: "Unleaded 98",  stations: results[1].allStations },
      "diesel": { label: "Diesel",       stations: results[2].allStations },
    },
  };
  fs.writeFileSync(JSON_OUT, JSON.stringify(jsonData, null, 2) + "\n");
  console.log(`Wrote fuel JSON: ${JSON_OUT}`);

  // Append to price history — only if prices changed since last entry
  const min95     = results[0].min;
  const min98     = results[1].min;
  const minDiesel = results[2].min;

  const historyFile = fs.existsSync(HISTORY_OUT)
    ? JSON.parse(fs.readFileSync(HISTORY_OUT, "utf8"))
    : { history: [] };

  const last = historyFile.history[historyFile.history.length - 1];
  const pricesChanged = !last
    || last["95"] !== min95
    || last["98"] !== min98
    || last.diesel !== minDiesel;

  if (pricesChanged) {
    historyFile.history.push({ ts: new Date().toISOString(), "95": min95, "98": min98, diesel: minDiesel });
    // Trim to rolling MAX_HISTORY_DAYS window
    const cutoff = Date.now() - MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000;
    historyFile.history = historyFile.history.filter(e => new Date(e.ts).getTime() >= cutoff);
    fs.writeFileSync(HISTORY_OUT, JSON.stringify(historyFile, null, 2) + "\n");
    console.log(`History: appended new entry (95=€${min95.toFixed(3)}, 98=€${min98.toFixed(3)}, diesel=€${minDiesel.toFixed(3)})`);
  } else {
    console.log("History: prices unchanged — skipped append.");
  }

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const todayEl = new Date().toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" });
  const todayRu = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  const files = [
    { path: path.join(ROOT, "posts/en/cheapest-petrol-stations-cyprus.md"), block: buildBlock(results, today) },
    { path: path.join(ROOT, "posts/el/cheapest-petrol-stations-cyprus.md"), block: buildBlockEl(results, todayEl) },
    { path: path.join(ROOT, "posts/ru/cheapest-petrol-stations-cyprus.md"), block: buildBlockRu(results, todayRu) },
  ];

  let updated = 0;
  for (const f of files) {
    if (updatePost(f.path, f.block)) { console.log(`Updated: ${f.path}`); updated++; }
  }
  console.log(`Done — updated ${updated}/${files.length} files.`);
}

main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
