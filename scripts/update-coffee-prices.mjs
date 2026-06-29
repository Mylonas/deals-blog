/**
 * Regenerates all 3 language cheapest-coffee posts from coffee-prices.json.
 * Renders:
 *   1. Freddo Espresso price comparison table (sorted cheapest first)
 *   2. Top drinks per café section (populated after monthly headless scrape)
 *
 * Run: node scripts/update-coffee-prices.mjs
 * Called by update-coffee-prices-monthly.yml after the headless scraper.
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
  return n != null ? `€${Number(n).toFixed(2)}` : "—";
}

function formatDate(iso, locale) {
  return new Date(iso).toLocaleString(locale, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Nicosia",
  });
}

function cafeName(item) {
  if (item.singleLocation && item.mapsUrl) return `[${item.cafe}](${item.mapsUrl})`;
  return item.cafe;
}

function platformLabel(platform) {
  const MAP = { wolt: "Wolt", foody: "Foody", bolt: "Bolt Food" };
  return MAP[platform] || platform;
}

function buildBlock(items, updatedAt, scrapedAt, lang) {
  const locale = lang === "el" ? "el-GR" : lang === "ru" ? "ru-RU" : "en-GB";
  const ts = formatDate(updatedAt, locale);
  const scrapedTs = scrapedAt ? formatDate(scrapedAt, locale) : null;

  const T = {
    en: {
      updated: `*Prices last checked: ${ts} (EET). Top drinks updated monthly via Wolt / Foody / Bolt Food.*`,
      freddo: "Freddo Espresso — All Cyprus",
      topDrinks: "Most Popular Drinks by Café",
      noTopDrinks: "*Top drinks data is being collected — check back next month.*",
      cafe: "Café", price: "Price", delivery: "Via Delivery App", notes: "Notes",
      drink: "Drink", source: "Source", popular: "⭐ Popular",
      deliveryNote: "> Delivery prices are approximate and include typical platform fee (Wolt / Bolt Food / Foody). Actual price may vary by branch.",
      scrapedNote: scrapedTs ? `*Top drinks last scraped: ${scrapedTs}.*` : "",
    },
    el: {
      updated: `*Τελευταία ενημέρωση: ${ts} (ΕΕΤ). Δημοφιλή ποτά ανανεώνονται μηνιαία μέσω Wolt / Foody / Bolt Food.*`,
      freddo: "Freddo Espresso — Πανκύπρια",
      topDrinks: "Πιο Δημοφιλή Ποτά ανά Καφετέρια",
      noTopDrinks: "*Τα δεδομένα για τα δημοφιλή ποτά συλλέγονται — επιστρέψτε τον επόμενο μήνα.*",
      cafe: "Καφετέρια", price: "Τιμή", delivery: "Μέσω Delivery", notes: "Σημειώσεις",
      drink: "Ποτό", source: "Πηγή", popular: "⭐ Δημοφιλές",
      deliveryNote: "> Οι τιμές delivery είναι κατά προσέγγιση και περιλαμβάνουν τυπική χρέωση πλατφόρμας (Wolt / Bolt Food / Foody).",
      scrapedNote: scrapedTs ? `*Δημοφιλή ποτά — τελευταία συλλογή: ${scrapedTs}.*` : "",
    },
    ru: {
      updated: `*Цены последний раз проверены: ${ts} (EET). Популярные напитки обновляются ежемесячно через Wolt / Foody / Bolt Food.*`,
      freddo: "Фреддо Эспрессо — По всему Кипру",
      topDrinks: "Самые Популярные Напитки по Кафе",
      noTopDrinks: "*Данные о популярных напитках собираются — загляните в следующем месяце.*",
      cafe: "Кафе", price: "Цена", delivery: "Через Доставку", notes: "Примечания",
      drink: "Напиток", source: "Источник", popular: "⭐ Популярное",
      deliveryNote: "> Цены на доставку приблизительные и включают типичную комиссию платформы (Wolt / Bolt Food / Foody).",
      scrapedNote: scrapedTs ? `*Популярные напитки — последнее обновление: ${scrapedTs}.*` : "",
    },
  };

  const t = T[lang];

  // ── section 1: Freddo comparison table ──────────────────────────────────────
  const sorted = [...items]
    .filter((r) => r.freddo != null)
    .sort((a, b) => a.freddo - b.freddo);

  const winner = sorted[0];

  const fredTable = [
    `| ${t.cafe} | ${t.price} | ${t.delivery} | ${t.notes} |`,
    `|------|-------|-------|-------|`,
    ...sorted.map((r) => `| **${cafeName(r)}** | ${euro(r.freddo)} | ${euro(r.delivery)} | ${r.notes || "—"} |`),
  ].join("\n");

  // ── section 2: top drinks per café ──────────────────────────────────────────
  const cafesWithTopDrinks = items.filter((r) => r.topDrinks?.length > 0);

  let topDrinksSection = "";
  if (cafesWithTopDrinks.length === 0) {
    topDrinksSection = `## ${t.topDrinks}\n\n${t.noTopDrinks}`;
  } else {
    const cafeBlocks = cafesWithTopDrinks.map((r) => {
      const rows = r.topDrinks.map(
        (d) =>
          `| ${d.popular ? t.popular + " " : ""}${d.name} | ${euro(d.price)} | ${platformLabel(d.platform)} |`
      );
      return [
        `### ${cafeName(r)}`,
        "",
        `| ${t.drink} | ${t.price} | ${t.source} |`,
        `|------|-------|--------|`,
        ...rows,
      ].join("\n");
    });

    topDrinksSection = [
      `## ${t.topDrinks}`,
      "",
      t.scrapedNote,
      "",
      cafeBlocks.join("\n\n"),
    ].join("\n");
  }

  return `${t.updated}

## ${t.freddo}

${fredTable}

**Winner**: **${cafeName(winner)}** — ${euro(winner.freddo)}

${t.deliveryNote}

${topDrinksSection}`;
}

// ── main ──────────────────────────────────────────────────────────────────────

const dataFile = "src/data/coffee-prices.json";
const data = readJson(dataFile);

data.updatedAt = new Date().toISOString();
writeJson(dataFile, data);

const { items, scrapedAt } = data;

updatePost("posts/en/cheapest-coffee-nicosia.md", buildBlock(items, data.updatedAt, scrapedAt, "en"));
updatePost("posts/el/cheapest-coffee-nicosia.md", buildBlock(items, data.updatedAt, scrapedAt, "el"));
updatePost("posts/ru/cheapest-coffee-nicosia.md", buildBlock(items, data.updatedAt, scrapedAt, "ru"));

console.log("Coffee prices updated:", data.updatedAt);
