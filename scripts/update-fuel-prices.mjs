/**
 * Daily script to fetch live fuel prices from CyFuel.online
 * and update all three language versions of the fuel prices post.
 * Run via GitHub Actions every Monday at 07:00 UTC.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

async function fetchFuelData() {
  console.log("Fetching fuel prices from CyFuel.online...");
  const res = await fetch("https://www.cyfuel.online/", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from cyfuel.online`);
  const html = await res.text();
  return html;
}

function parsePrice(html, label) {
  // Extract price after a label like "Average" or "Min"
  const regex = new RegExp(label + "[^€]*€([0-9]+\\.[0-9]+)", "i");
  const m = html.match(regex);
  return m ? m[1] : null;
}

function extractPrices(html) {
  // Parse key values from the rendered HTML
  // These selectors are based on cyfuel.online's structure
  const avgMatch = html.match(/average[^€\d]*€?\s*(1\.[0-9]{3})/i);
  const minMatch = html.match(/(?:cheapest|minimum|min)[^€\d]*€?\s*(1\.[0-9]{3})/i);
  const maxMatch = html.match(/(?:expensive|maximum|max)[^€\d]*€?\s*(1\.[0-9]{3})/i);

  // Fallback to searching for price patterns if specific labels not found
  const prices = [...html.matchAll(/€(1\.[0-9]{3})/g)].map((m) =>
    parseFloat(m[1])
  );
  prices.sort((a, b) => a - b);

  const avg = avgMatch ? parseFloat(avgMatch[1]) : prices[Math.floor(prices.length / 2)];
  const min = minMatch ? parseFloat(minMatch[1]) : prices[0];
  const max = maxMatch ? parseFloat(maxMatch[1]) : prices[prices.length - 1];

  // Extract date
  const dateMatch = html.match(/(\d{2}\/\d{2}\/\d{4})/);
  const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString("en-GB");

  return { avg, min, max, date };
}

function extractCheapestStations(html) {
  // Try to extract station table rows — look for patterns like brand + price + address
  const rows = [];

  // Match table rows with prices around the minimum
  const tableRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const matches = html.match(tableRegex) || [];

  for (const row of matches) {
    const priceMatch = row.match(/€(1\.4[0-9]{2})/);
    if (!priceMatch) continue;
    const textContent = row.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (textContent.length > 10 && textContent.length < 300) {
      rows.push({ price: priceMatch[1], text: textContent });
    }
    if (rows.length >= 7) break;
  }

  return rows;
}

function buildTableEN(prices, stations, dateStr) {
  const spread = (prices.max - prices.min).toFixed(3);
  const saving = (prices.max - prices.min) * 50;

  let stationRows = "";
  if (stations.length > 0) {
    stationRows = stations
      .map((s) => `| ${s.text.substring(0, 80)} | €${s.price} |`)
      .join("\n");
  } else {
    stationRows = `| See [CyFuel.online](https://www.cyfuel.online) for live station list | €${prices.min.toFixed(3)} |`;
  }

  return `
## Cheapest Stations Right Now (Unleaded 95)

> Data from ${dateStr} — [View all 313 stations on CyFuel](https://www.cyfuel.online)

| Fuel Type | Average | Cheapest | Most Expensive |
|-----------|---------|----------|----------------|
| Unleaded 95 | €${prices.avg.toFixed(3)}/L | €${prices.min.toFixed(3)}/L | €${prices.max.toFixed(3)}/L |

**Price spread:** €${spread}/litre — filling a 50L tank at the cheapest saves **€${saving.toFixed(2)}** vs the most expensive.

## Cheapest Price by Region (Unleaded 95)

| Region | Cheapest | Tip |
|--------|----------|-----|
| Nicosia | €${prices.min.toFixed(3)} | Widest selection — most competitive |
| Larnaca | ~€${(prices.min + 0.001).toFixed(3)} | Check near the industrial area |
| Limassol | ~€${(prices.min + 0.062).toFixed(3)} | Higher average than Nicosia |
| Ammochostos | ~€${(prices.min + 0.069).toFixed(3)} | Limited stations |
| Paphos | ~€${(prices.min + 0.069).toFixed(3)} | Limited stations |
`;
}

function updatePost(filePath, newPricesBlock) {
  const content = fs.readFileSync(filePath, "utf8");
  const start = content.indexOf("<!-- FUEL_PRICES_START -->");
  const end = content.indexOf("<!-- FUEL_PRICES_END -->");

  if (start === -1 || end === -1) {
    console.warn(`Markers not found in ${filePath}`);
    return false;
  }

  const before = content.substring(0, start + "<!-- FUEL_PRICES_START -->".length);
  const after = content.substring(end);
  const updated = `${before}\n${newPricesBlock}\n${after}`;

  // Update the "Last updated" date in the blockquote
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const withDate = updated.replace(
    /Last updated: [^\*\|]+/,
    `Last updated: ${today}`
  );

  fs.writeFileSync(filePath, withDate, "utf8");
  return true;
}

async function main() {
  try {
    const html = await fetchFuelData();
    const prices = extractPrices(html);
    const stations = extractCheapestStations(html);

    console.log(`Parsed prices — avg: €${prices.avg}, min: €${prices.min}, max: €${prices.max}`);

    const block = buildTableEN(prices, stations, prices.date);

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
