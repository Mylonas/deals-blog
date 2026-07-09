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

/** Set (or insert) an `updated:` frontmatter field so readers see freshness. */
function touchUpdated(content) {
  const today = new Date().toISOString().slice(0, 10);
  if (/^updated:.*$/m.test(content)) return content.replace(/^updated:.*$/m, `updated: "${today}"`);
  return content.replace(/^(date:.*)$/m, `$1\nupdated: "${today}"`);
}

function updatePost(rel, newBlock) {
  const file = path.join(ROOT, rel);
  const content = fs.readFileSync(file, "utf8");
  const START = "<!-- COFFEE_PRICES_START -->";
  const END = "<!-- COFFEE_PRICES_END -->";
  const si = content.indexOf(START);
  const ei = content.indexOf(END);
  if (si === -1 || ei === -1) { console.error(`Markers not found in ${rel}`); return; }
  const next = content.slice(0, si + START.length) + "\n" + newBlock + "\n" + content.slice(ei);
  fs.writeFileSync(file, touchUpdated(next), "utf8");
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

function buildBlock(items, cities, updatedAt, scrapedAt, lang) {
  const locale = lang === "el" ? "el-GR" : lang === "ru" ? "ru-RU" : "en-GB";
  const ts = formatDate(updatedAt, locale);
  const scrapedTs = scrapedAt ? formatDate(scrapedAt, locale) : null;

  const T = {
    en: {
      updated: `*Prices last checked: ${ts} (EET). Updated weekly via Wolt, Bolt Food and Foody.*`,
      freddo: "Freddo Espresso — Cheapest by City",
      topDrinks: "Most Popular Drinks by Café (Nicosia)",
      noTopDrinks: "*Top drinks data is being collected — check back next month.*",
      cafe: "Café", price: "Price", delivery: "Via Delivery App", notes: "Notes",
      drink: "Drink", source: "Source", popular: "⭐ Popular", winner: "Cheapest",
      deliveryNote: "> Each price is the cheapest across Wolt, Bolt Food and Foody for that café and may include a platform markup over the counter price. Cheapest branch shown per café brand.",
      scrapedNote: scrapedTs ? `*Top drinks last scraped: ${scrapedTs}.*` : "",
    },
    el: {
      updated: `*Τελευταία ενημέρωση: ${ts} (ΕΕΤ). Εβδομαδιαία ενημέρωση μέσω Wolt, Bolt Food και Foody.*`,
      freddo: "Freddo Espresso — Φθηνότερα ανά Πόλη",
      topDrinks: "Πιο Δημοφιλή Ποτά ανά Καφετέρια (Λευκωσία)",
      noTopDrinks: "*Τα δεδομένα για τα δημοφιλή ποτά συλλέγονται — επιστρέψτε τον επόμενο μήνα.*",
      cafe: "Καφετέρια", price: "Τιμή", delivery: "Μέσω Delivery", notes: "Σημειώσεις",
      drink: "Ποτό", source: "Πηγή", popular: "⭐ Δημοφιλές", winner: "Φθηνότερο",
      deliveryNote: "> Κάθε τιμή είναι η φθηνότερη ανά καφετέρια μεταξύ Wolt, Bolt Food και Foody και ενδέχεται να περιλαμβάνει προσαύξηση πλατφόρμας. Εμφανίζεται το φθηνότερο υποκατάστημα ανά αλυσίδα.",
      scrapedNote: scrapedTs ? `*Δημοφιλή ποτά — τελευταία συλλογή: ${scrapedTs}.*` : "",
    },
    ru: {
      updated: `*Цены последний раз проверены: ${ts} (EET). Обновляется еженедельно через Wolt, Bolt Food и Foody.*`,
      freddo: "Фреддо Эспрессо — Самые дешёвые по городам",
      topDrinks: "Самые Популярные Напитки по Кафе (Никосия)",
      noTopDrinks: "*Данные о популярных напитках собираются — загляните в следующем месяце.*",
      cafe: "Кафе", price: "Цена", delivery: "Через Доставку", notes: "Примечания",
      drink: "Напиток", source: "Источник", popular: "⭐ Популярное", winner: "Самое дешёвое",
      deliveryNote: "> Каждая цена — самая низкая по кафе среди Wolt, Bolt Food и Foody и может включать наценку платформы. Для каждой сети показан самый дешёвый филиал.",
      scrapedNote: scrapedTs ? `*Популярные напитки — последнее обновление: ${scrapedTs}.*` : "",
    },
  };

  const t = T[lang];

  // ── section 1: per-city Freddo tables ───────────────────────────────────────
  // one link per platform the café was found on; the primary platform's link
  // is `url`, extras live in `<platform>Url` (see merge-coffee-sources.mjs)
  const platformLinks = (c) => {
    const platforms = c.platforms?.length ? c.platforms : ["wolt"];
    return platforms
      .map((p, i) => {
        const href = i === 0 ? c.url : c[`${p}Url`];
        return href ? `[${platformLabel(p)}](${href})` : platformLabel(p);
      })
      .join(" · ");
  };
  const citySections = (cities || []).map((city) => {
    const rows = city.cafes.map((c) => `| **[${c.cafe}](${c.url})** | ${euro(c.freddo)} | ${platformLinks(c)} |`);
    const winner = city.cafes[0];
    return [
      `### ${city.label[lang] ?? city.label.en}`,
      "",
      `| ${t.cafe} | ${t.price} | ${t.delivery} |`,
      `|------|-------|--------|`,
      ...rows,
      "",
      winner ? `**${t.winner}**: **[${winner.cafe}](${winner.url})** — ${euro(winner.freddo)}` : "",
    ].join("\n");
  });

  const fredTable = citySections.join("\n\n");

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

${t.deliveryNote}

${topDrinksSection}`;
}

// ── main ──────────────────────────────────────────────────────────────────────

const dataFile = "src/data/coffee-prices.json";
const data = readJson(dataFile);

data.updatedAt = new Date().toISOString();
writeJson(dataFile, data);

const { items, cities, scrapedAt } = data;

updatePost("posts/en/cheapest-coffee-nicosia.md", buildBlock(items, cities, data.updatedAt, scrapedAt, "en"));
updatePost("posts/el/cheapest-coffee-nicosia.md", buildBlock(items, cities, data.updatedAt, scrapedAt, "el"));
updatePost("posts/ru/cheapest-coffee-nicosia.md", buildBlock(items, cities, data.updatedAt, scrapedAt, "ru"));

console.log("Coffee prices updated:", data.updatedAt);
