/**
 * Fetches live supermarket prices for 10 household staples from e-kalathi.gov.cy
 * and updates all three language versions of the supermarket price watch post.
 * Run via GitHub Actions 4 times per day.
 *
 * API: https://www.e-kalathi.gov.cy/ekalathi-website-server/api/fetch-product-list
 * No authentication required for this endpoint.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const API = "https://www.e-kalathi.gov.cy/ekalathi-website-server/api";

// For each staple: search term is chosen to return the most relevant products.
// We pick the result with the highest numberOfChains (widest supermarket availability).
const STAPLES = [
  {
    key: "milk",
    search: "fresh milk",
    label:   "Fresh Milk 1L",
    labelEl: "Φρέσκο Γάλα 1L",
    labelRu: "Свежее молоко 1L",
  },
  {
    key: "eggs",
    search: "NIKIFOROU EGGS",
    label:   "Eggs",
    labelEl: "Αβγά",
    labelRu: "Яйца",
  },
  {
    key: "halloumi",
    search: "halloumi",
    label:   "Halloumi 200g",
    labelEl: "Χαλλούμι 200g",
    labelRu: "Халлуми 200г",
  },
  {
    key: "spaghetti",
    search: "spaghetti",
    label:   "Spaghetti 500g",
    labelEl: "Σπαγγέτι 500g",
    labelRu: "Спагетти 500г",
  },
  {
    key: "oliveoil",
    search: "virgin olive oil",
    label:   "Olive Oil 1L",
    labelEl: "Ελαιόλαδο 1L",
    labelRu: "Оливковое масло 1L",
  },
  {
    key: "water",
    search: "Kykkos 1.5L",
    label:   "Water 1.5L ×6",
    labelEl: "Νερό 1.5L ×6",
    labelRu: "Вода 1.5L ×6",
  },
  {
    key: "yogurt",
    search: "yogurt",
    label:   "Yogurt",
    labelEl: "Γιαούρτι",
    labelRu: "Йогурт",
  },
  {
    key: "rice",
    search: "rice carolina",
    label:   "Rice 1kg",
    labelEl: "Ρύζι 1kg",
    labelRu: "Рис 1кг",
  },
  {
    key: "oj",
    search: "orange juice 1L",
    label:   "Orange Juice 1L",
    labelEl: "Χυμός Πορτοκάλι 1L",
    labelRu: "Апельсиновый сок 1L",
  },
  {
    key: "cocacola",
    search: "Coca Cola 1L",
    label:   "Coca-Cola 1L ×2",
    labelEl: "Coca-Cola 1L ×2",
    labelRu: "Кока-Кола 1L ×2",
  },
];

async function fetchBestProduct(searchTerm) {
  const url = `${API}/fetch-product-list?page=0&size=20&productName=${encodeURIComponent(searchTerm)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for "${searchTerm}"`);
  const json = await res.json();
  if (!json.content || json.content.length === 0) return null;
  // Widest availability = most representative price
  return json.content.sort((a, b) => b.numberOfChains - a.numberOfChains)[0];
}

function arrow(current, previous) {
  if (!previous) return "→";
  const diff = current - previous;
  if (diff > 0.005) return "▲";
  if (diff < -0.005) return "▼";
  return "→";
}

function buildBlock(results, lang) {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const t = {
    en: {
      updated: `Updated ${today}`,
      source: "[e-kalathi.gov.cy](https://www.e-kalathi.gov.cy)",
      col1: "Staple", col2: "Cheapest Price", col3: "vs Last", col4: "Stores",
    },
    el: {
      updated: `Ενημέρωση ${today}`,
      source: "[e-kalathi.gov.cy](https://www.e-kalathi.gov.cy)",
      col1: "Προϊόν", col2: "Φθηνότερη Τιμή", col3: "Μεταβολή", col4: "Αλυσίδες",
    },
    ru: {
      updated: `Обновлено ${today}`,
      source: "[e-kalathi.gov.cy](https://www.e-kalathi.gov.cy)",
      col1: "Продукт", col2: "Мин. цена", col3: "Изменение", col4: "Магазины",
    },
  }[lang];

  const rows = results.map(({ staple, product }) => {
    const label = lang === "en" ? staple.label : lang === "el" ? staple.labelEl : staple.labelRu;
    if (!product) return `| ${label} | — | — | — |`;
    const price = `€${product.startPrice.toFixed(2)}`;
    const a = arrow(product.startPrice, product.previousPrice);
    return `| ${label} | **${price}** | ${a} | ${product.numberOfChains} |`;
  }).join("\n");

  return `
> ${t.updated} | Source: ${t.source}

| ${t.col1} | ${t.col2} | ${t.col3} | ${t.col4} |
|---------|---------|--------|--------|
${rows}
`;
}

function updatePost(filePath, block) {
  const content = fs.readFileSync(filePath, "utf8");
  const START = "<!-- PRICES_START -->";
  const END = "<!-- PRICES_END -->";
  const s = content.indexOf(START);
  const e = content.indexOf(END);
  if (s === -1 || e === -1) { console.warn(`Markers not found in ${filePath}`); return false; }
  const updated = content.substring(0, s + START.length) + "\n" + block + "\n" + content.substring(e);
  fs.writeFileSync(filePath, updated, "utf8");
  return true;
}

async function main() {
  console.log("Fetching supermarket prices from e-kalathi.gov.cy...");
  const results = [];
  for (const staple of STAPLES) {
    try {
      const product = await fetchBestProduct(staple.search);
      console.log(`  ${staple.key}: ${product ? `${product.name} €${product.startPrice} (${product.numberOfChains} chains)` : "NOT FOUND"}`);
      results.push({ staple, product });
    } catch (err) {
      console.warn(`  ${staple.key}: ERROR — ${err.message}`);
      results.push({ staple, product: null });
    }
  }

  let updated = 0;
  for (const lang of ["en", "el", "ru"]) {
    const block = buildBlock(results, lang);
    const fp = path.join(ROOT, `posts/${lang}/supermarket-price-watch.md`);
    if (updatePost(fp, block)) { console.log(`Updated: posts/${lang}/supermarket-price-watch.md`); updated++; }
  }
  console.log(`Done — updated ${updated}/3 files.`);
  process.exit(0);
}

main();
