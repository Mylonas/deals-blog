/**
 * Updates coffee-prices.json updatedAt timestamp and regenerates all 3 language
 * cheapest-coffee-cyprus posts between <!-- COFFEE_PRICES_START --> / <!-- COFFEE_PRICES_END --> markers.
 * Only the Freddo Espresso section is generated.
 * Single-location cafes get a Google Maps link on their name.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function writeJson(rel, data) {
  fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(data, null, 2) + "\n");
}

function updatePost(rel, newBlock) {
  const file = path.join(ROOT, rel);
  const content = fs.readFileSync(file, "utf8");
  const START = "<!-- COFFEE_PRICES_START -->";
  const END = "<!-- COFFEE_PRICES_END -->";
  const si = content.indexOf(START);
  const ei = content.indexOf(END);
  if (si === -1 || ei === -1) { console.error(`Markers not found in ${rel}`); return; }
  fs.writeFileSync(file, content.slice(0, si + START.length) + "\n" + newBlock + "\n" + content.slice(ei), "utf8");
  console.log(`Updated ${rel}`);
}

function euro(n) {
  return n != null ? `€${n.toFixed(2)}` : "—";
}

function formatDate(iso, locale) {
  return new Date(iso).toLocaleString(locale, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Nicosia",
  });
}

function cafeName(item, lang) {
  if (item.singleLocation && item.mapsUrl) {
    return `[${item.cafe}](${item.mapsUrl})`;
  }
  return item.cafe;
}

function buildBlock(items, updatedAt, lang) {
  const locale = lang === "el" ? "el-GR" : lang === "ru" ? "ru-RU" : "en-GB";
  const ts = formatDate(updatedAt, locale);

  const T = {
    en: {
      updated: `*Prices last checked: ${ts} (EET). Updated hourly.*`,
      freddo: "Freddo Espresso — All Cyprus",
      cafe: "Café", price: "Price", delivery: "Via Delivery App", notes: "Notes",
      deliveryNote: "> Delivery prices are approximate and include typical platform fee (Wolt / Bolt Food / Foody). Actual price may vary by branch.",
    },
    el: {
      updated: `*Τελευταία ενημέρωση: ${ts} (ΕΕΤ). Ανανεώνεται κάθε ώρα.*`,
      freddo: "Freddo Espresso — Πανκύπρια",
      cafe: "Καφετέρια", price: "Τιμή", delivery: "Μέσω Delivery", notes: "Σημειώσεις",
      deliveryNote: "> Οι τιμές delivery είναι κατά προσέγγιση και περιλαμβάνουν τυπική χρέωση πλατφόρμας (Wolt / Bolt Food / Foody).",
    },
    ru: {
      updated: `*Цены последний раз проверены: ${ts} (EET). Обновляется каждый час.*`,
      freddo: "Фреддо Эспрессо — По всему Кипру",
      cafe: "Кафе", price: "Цена", delivery: "Через Доставку", notes: "Примечания",
      deliveryNote: "> Цены на доставку приблизительные и включают типичную комиссию платформы (Wolt / Bolt Food / Foody).",
    },
  };

  const t = T[lang];

  const sorted = [...items]
    .filter((r) => r.freddo != null)
    .sort((a, b) => a.freddo - b.freddo);

  const winner = sorted[0];

  const header = `| ${t.cafe} | ${t.price} | ${t.delivery} | ${t.notes} |`;
  const sep = `|------|-------|-------|-------|`;
  const rows = sorted
    .map((r) => `| **${cafeName(r, lang)}** | ${euro(r.freddo)} | ${euro(r.delivery)} | ${r.notes || "—"} |`)
    .join("\n");

  return `${t.updated}

## ${t.freddo}

${header}
${sep}
${rows}

**Winner**: **${cafeName(winner, lang)}** — ${euro(winner.freddo)}

${t.deliveryNote}`;
}

// ── main ──────────────────────────────────────────────────────────────────────

const dataFile = "src/data/coffee-prices.json";
const data = readJson(dataFile);

data.updatedAt = new Date().toISOString();
writeJson(dataFile, data);

const { items } = data;

updatePost("posts/en/cheapest-coffee-nicosia.md", buildBlock(items, data.updatedAt, "en"));
updatePost("posts/el/cheapest-coffee-nicosia.md", buildBlock(items, data.updatedAt, "el"));
updatePost("posts/ru/cheapest-coffee-nicosia.md", buildBlock(items, data.updatedAt, "ru"));

console.log("Coffee prices updated:", data.updatedAt);
