/**
 * Fetches live fuel prices from the Cyprus government Petroleum Prices portal
 * https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices
 * Run via GitHub Actions 4 times per day.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const GOV_URL = "https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices";

async function fetchGovPage() {
  const res = await fetch(GOV_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" },
  });
  if (!res.ok) throw new Error(`GET failed: HTTP ${res.status}`);
  const html = await res.text();
  const cookies = res.headers.get("set-cookie") || "";
  const tokenMatch = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/);
  if (!tokenMatch) throw new Error("CSRF token not found");
  return { html, cookies, token: tokenMatch[1] };
}

async function fetchPrices(token, cookies) {
  const body = new URLSearchParams({
    "__RequestVerificationToken": token,
    "Entity.PetroleumType": "1",   // Unleaded 95
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

function parseLabel(html, labelClass) {
  // Matches: <label class="... displayLabelValue">1.520</label>
  const re = new RegExp(
    `<label[^>]+displayLabelValue[^>]*>\\s*([0-9]+\\.[0-9]+)\\s*<\\/label>`,
    "g"
  );
  const matches = [...html.matchAll(re)].map((m) => parseFloat(m[1]));
  return matches;
}

function extractSummary(html) {
  const avg = parseFloat(
    (html.match(/Μέση Τιμή[\s\S]*?displayLabelValue[^>]*>([0-9]+\.[0-9]+)/) || [])[1]
  );
  const min = parseFloat(
    (html.match(/Φθηνότερη Τιμή[\s\S]*?displayLabelValue[^>]*>([0-9]+\.[0-9]+)/) || [])[1]
  );
  const max = parseFloat(
    (html.match(/Ακριβότερη Τιμή[\s\S]*?displayLabelValue[^>]*>([0-9]+\.[0-9]+)/) || [])[1]
  );
  if (isNaN(avg) || isNaN(min) || isNaN(max)) {
    throw new Error("Could not parse avg/min/max prices from government response");
  }
  return { avg, min, max };
}

function extractStations(html) {
  const rows = [];
  const trRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRegex.exec(html)) !== null) {
    const row = m[1];
    // Extract coordinates from the map link before stripping tags
    const coordMatch = row.match(/coordinates=([0-9.]+)%2C([0-9.]+)/);
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    if (cells.length >= 5) {
      const price = parseFloat(cells[4]);
      if (!isNaN(price) && price > 1 && price < 3) {
        const address = cells[2].split("τηλ:")[0].trim();
        const mapsUrl = coordMatch
          ? `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}`
          : `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
        rows.push({
          brand: cells[0],
          address,
          district: cells[3],
          price,
          mapsUrl,
        });
      }
    }
  }
  return rows.sort((a, b) => a.price - b.price).slice(0, 7);
}

function buildPricesBlock(prices, stations) {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const spread = (prices.max - prices.min).toFixed(3);
  const saving = ((prices.max - prices.min) * 50).toFixed(2);

  let stationRows = stations.length > 0
    ? stations.map((s) =>
        `| ${s.brand} | [${s.address.substring(0, 50)}](${s.mapsUrl}) | ${s.district} | €${s.price.toFixed(3)} |`
      ).join("\n")
    : `| — | [View on government portal](https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices) | All | €${prices.min.toFixed(3)} |`;

  return `
## Live Prices — Unleaded 95

> Data from Cyprus Government Petroleum Prices Portal — updated ${today}

| Metric | Price |
|--------|-------|
| Average (island-wide) | €${prices.avg.toFixed(3)}/L |
| Cheapest | €${prices.min.toFixed(3)}/L |
| Most Expensive | €${prices.max.toFixed(3)}/L |

**Price spread:** €${spread}/litre — filling a 50L tank at the cheapest saves **€${saving}** vs the most expensive.

## 7 Cheapest Stations Right Now (Unleaded 95)

| Brand | Address | Area | Price |
|-------|---------|------|-------|
${stationRows}

> Source: [Cyprus Gov Petroleum Prices](https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices) — official government data
`;
}

function updatePost(filePath, newPricesBlock) {
  const content = fs.readFileSync(filePath, "utf8");
  const START = "<!-- FUEL_PRICES_START -->";
  const END = "<!-- FUEL_PRICES_END -->";
  const start = content.indexOf(START);
  const end = content.indexOf(END);
  if (start === -1 || end === -1) {
    console.warn(`Markers not found in ${filePath}`);
    return false;
  }
  const before = content.substring(0, start + START.length);
  const after = content.substring(end);
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const updated = `${before}\n${newPricesBlock}\n${after}`.replace(
    /Last updated: [^\*\|\n]+/,
    `Last updated: ${today}`
  );
  fs.writeFileSync(filePath, updated, "utf8");
  return true;
}

async function main() {
  try {
    console.log("Fetching session from Cyprus Government Petroleum Prices portal...");
    const { cookies, token } = await fetchGovPage();

    console.log("Submitting search for Unleaded 95 (all districts)...");
    const html = await fetchPrices(token, cookies);

    const prices = extractSummary(html);
    const stations = extractStations(html);

    console.log(`Prices — avg: €${prices.avg}, min: €${prices.min}, max: €${prices.max}`);
    console.log(`Cheapest stations found: ${stations.length}`);

    const block = buildPricesBlock(prices, stations);

    const files = [
      path.join(ROOT, "posts/en/cheapest-petrol-stations-cyprus.md"),
      path.join(ROOT, "posts/el/cheapest-petrol-stations-cyprus.md"),
      path.join(ROOT, "posts/ru/cheapest-petrol-stations-cyprus.md"),
    ];

    let updated = 0;
    for (const f of files) {
      if (updatePost(f, block)) {
        console.log(`Updated: ${f}`);
        updated++;
      }
    }

    console.log(`Done — updated ${updated}/${files.length} files.`);
    process.exit(0);
  } catch (err) {
    console.error("Failed to update fuel prices:", err.message);
    process.exit(1);
  }
}

main();
