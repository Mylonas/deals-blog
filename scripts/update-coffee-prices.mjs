/**
 * Updates coffee-prices.json updatedAt timestamp and regenerates all 3 language
 * cheapest-coffee-nicosia posts between <!-- COFFEE_PRICES_START --> / <!-- COFFEE_PRICES_END --> markers.
 *
 * Prices are manually curated in src/data/coffee-prices.json.
 * Run hourly via GitHub Actions to keep the "last updated" timestamp current.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── helpers ──────────────────────────────────────────────────────────────────

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
  if (si === -1 || ei === -1) {
    console.error(`Markers not found in ${rel}`);
    return;
  }
  const updated = content.slice(0, si + START.length) + "\n" + newBlock + "\n" + content.slice(ei);
  fs.writeFileSync(file, updated, "utf8");
  console.log(`Updated ${rel}`);
}

function euro(n) {
  return n != null ? `€${n.toFixed(2)}` : "—";
}

function formatDate(iso, locale) {
  return new Date(iso).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Nicosia",
  });
}

// ── build markdown blocks ─────────────────────────────────────────────────────

function buildBlock(items, updatedAt, lang) {
  const locale = lang === "el" ? "el-GR" : lang === "ru" ? "ru-RU" : "en-GB";
  const ts = formatDate(updatedAt, locale);

  const T = {
    en: {
      updated: `*Prices last checked: ${ts} (EET). Updated hourly.*`,
      freddo: "Freddo Espresso (Cyprus favourite)",
      espresso: "Espresso / Single Shot",
      filter: "Filter / Drip Coffee",
      cafe: "Café",
      price: "Price",
      delivery: "Via Delivery App",
      notes: "Notes",
      winner: "**Winner**",
      noData: "—",
      deliveryNote: "> Delivery prices are approximate and include typical platform service fee (Wolt / Bolt Food / Foody). Actual price may vary by branch and platform.",
    },
    el: {
      updated: `*Τελευταία ενημέρωση: ${ts} (ΕΕΤ). Ανανεώνεται κάθε ώρα.*`,
      freddo: "Freddo Espresso (αγαπημένο των Κυπρίων)",
      espresso: "Espresso / Μονό",
      filter: "Φίλτρου / Drip",
      cafe: "Καφετέρια",
      price: "Τιμή",
      delivery: "Μέσω Delivery",
      notes: "Σημειώσεις",
      winner: "**Νικητής**",
      noData: "—",
      deliveryNote: "> Οι τιμές delivery είναι κατά προσέγγιση και περιλαμβάνουν τυπική χρέωση πλατφόρμας (Wolt / Bolt Food / Foody). Η πραγματική τιμή μπορεί να διαφέρει.",
    },
    ru: {
      updated: `*Цены последний раз проверены: ${ts} (EET). Обновляется каждый час.*`,
      freddo: "Фреддо Эспрессо (любимый напиток Кипра)",
      espresso: "Эспрессо / Одиночный",
      filter: "Фильтр / Капельный",
      cafe: "Кафе",
      price: "Цена",
      delivery: "Через Доставку",
      notes: "Примечания",
      winner: "**Победитель**",
      noData: "—",
      deliveryNote: "> Цены на доставку приблизительные и включают типичную комиссию платформы (Wolt / Bolt Food / Foody). Фактическая цена может отличаться.",
    },
  };

  const t = T[lang];

  function table(rows, colPrice, colDelivery) {
    const header = `| ${t.cafe} | ${colPrice} | ${colDelivery} | ${t.notes} |`;
    const sep = `|------|-------|-------|-------|`;
    const lines = rows
      .filter((r) => r[colPrice === t.price ? "_priceKey" : "_priceKey"] != null || true)
      .map((r) => `| **${r.cafe}** | ${euro(r._price)} | ${euro(r._delivery)} | ${r.notes || t.noData} |`);
    return [header, sep, ...lines].join("\n");
  }

  function section(title, priceKey, items) {
    const sorted = [...items]
      .filter((r) => r[priceKey] != null)
      .sort((a, b) => a[priceKey] - b[priceKey])
      .map((r) => ({ ...r, _price: r[priceKey], _delivery: r.delivery }));

    if (sorted.length === 0) return "";

    const winner = sorted[0];
    const header = `| ${t.cafe} | ${t.price} | ${t.delivery} | ${t.notes} |`;
    const sep = `|------|-------|-------|-------|`;
    const rows = sorted
      .map((r) => `| **${r.cafe}** | ${euro(r._price)} | ${euro(r._delivery)} | ${r.notes || t.noData} |`)
      .join("\n");

    return `## ${title}\n\n${header}\n${sep}\n${rows}\n\n${t.winner}: **${winner.cafe}** — ${euro(winner._price)}`;
  }

  const freddo = section(t.freddo, "freddo", items);
  const espresso = section(t.espresso, "espresso", items);
  const filterCoffee = section(t.filter, "filter", items);

  // Summary table
  const winnerFreddo = [...items].filter((r) => r.freddo != null).sort((a, b) => a.freddo - b.freddo)[0];
  const winnerEspresso = [...items].filter((r) => r.espresso != null).sort((a, b) => a.espresso - b.espresso)[0];
  const winnerFilter = [...items].filter((r) => r.filter != null).sort((a, b) => a.filter - b.filter)[0];

  const summaryLabel = lang === "el" ? "Κατηγορία" : lang === "ru" ? "Категория" : "Category";
  const summaryWinner = lang === "el" ? "Νικητής" : lang === "ru" ? "Победитель" : "Winner";
  const summaryPrice = lang === "el" ? "Τιμή" : lang === "ru" ? "Цена" : "Price";
  const summaryTitle = lang === "el" ? "## Σύνοψη" : lang === "ru" ? "## Итог" : "## Summary";

  const summary = `${summaryTitle}\n\n| ${summaryLabel} | ${summaryWinner} | ${summaryPrice} |\n|----------|--------|-------|\n| ${t.freddo} | ${winnerFreddo?.cafe ?? "—"} | ${euro(winnerFreddo?.freddo ?? null)} |\n| ${t.espresso} | ${winnerEspresso?.cafe ?? "—"} | ${euro(winnerEspresso?.espresso ?? null)} |\n| ${t.filter} | ${winnerFilter?.cafe ?? "—"} | ${euro(winnerFilter?.filter ?? null)} |`;

  return `${t.updated}\n\n${freddo}\n\n${espresso}\n\n${filterCoffee}\n\n${summary}\n\n${t.deliveryNote}`;
}

// ── main ──────────────────────────────────────────────────────────────────────

const dataFile = "src/data/coffee-prices.json";
const data = readJson(dataFile);

// Update timestamp
data.updatedAt = new Date().toISOString();
writeJson(dataFile, data);

const { items } = data;

updatePost("posts/en/cheapest-coffee-nicosia.md", buildBlock(items, data.updatedAt, "en"));
updatePost("posts/el/cheapest-coffee-nicosia.md", buildBlock(items, data.updatedAt, "el"));
updatePost("posts/ru/cheapest-coffee-nicosia.md", buildBlock(items, data.updatedAt, "ru"));

console.log("Coffee prices updated:", data.updatedAt);
