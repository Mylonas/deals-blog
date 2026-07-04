/**
 * Fetches ALL products from e-kalathi.gov.cy, finds the top 20 with the
 * biggest discount (previousPrice vs startPrice), and writes
 * src/data/supermarket-deals.json.
 *
 * Note: the e-kalathi public API exposes global minimum prices only — per-chain
 * pricing requires authentication. Prices shown are the lowest available anywhere.
 *
 * Run daily via GitHub Actions.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const API = "https://www.e-kalathi.gov.cy/ekalathi-website-server/api";
const OUT = path.join(ROOT, "src", "data", "supermarket-deals.json");

const PAGE_SIZE = 200;
const TOP_N = 20;

const CATEGORY_LABELS = {
  "WATER":                      { en: "Water",           el: "Νερό",               ru: "Вода" },
  "FRESH MILK":                 { en: "Fresh Milk",      el: "Φρέσκο Γάλα",        ru: "Свежее молоко" },
  "CHOCOLATES":                 { en: "Chocolates",      el: "Σοκολάτες",           ru: "Шоколад" },
  "BUSCUITS":                   { en: "Biscuits",        el: "Μπισκότα",            ru: "Печенье" },
  "PASTA AND PASTA SAUCES":     { en: "Pasta",           el: "Ζυμαρικά",           ru: "Макароны" },
  "YOGURT":                     { en: "Yogurt",          el: "Γιαούρτι",            ru: "Йогурт" },
  "FLOUR":                      { en: "Flour",           el: "Αλεύρι",              ru: "Мука" },
  "CHEESE":                     { en: "Cheese",          el: "Τυρί",               ru: "Сыр" },
  "EGGS":                       { en: "Eggs",            el: "Αβγά",               ru: "Яйца" },
  "POTATO / CORN / RICE CHIPS": { en: "Snacks",          el: "Σνακ",               ru: "Снеки" },
  "NAPKINGS AND KITCHEN ROLL":  { en: "Paper Products",  el: "Χαρτικά",            ru: "Бумажные изделия" },
  "FRUIT AND VEGETABLE JUICES": { en: "Juices",          el: "Χυμοί",              ru: "Соки" },
  "WET WIPES":                  { en: "Wet Wipes",       el: "Μωρομάντηλα",        ru: "Влажные салфетки" },
  "BREAD":                      { en: "Bread",           el: "Ψωμί",               ru: "Хлεβ" },
  "RICE":                       { en: "Rice",            el: "Ρύζι",               ru: "Рис" },
  "OLIVE OIL":                  { en: "Olive Oil",       el: "Ελαιόλαδο",          ru: "Оливковое масло" },
  "COFFEE":                     { en: "Coffee",          el: "Καφές",              ru: "Кофе" },
  "SUGAR":                      { en: "Sugar",           el: "Ζάχαρη",             ru: "Сахар" },
  "BUTTER":                     { en: "Butter",          el: "Βούτυρο",            ru: "Масло" },
};

async function fetchPage(page) {
  const url = `${API}/fetch-product-list?page=${page}&size=${PAGE_SIZE}&productName=`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
  return res.json();
}

async function fetchAllProducts() {
  const first = await fetchPage(0);
  const totalPages = first.totalPages ?? 1;
  const all = [...(first.content || [])];
  console.log(`  Page 0/${totalPages - 1} — ${all.length} products so far`);

  for (let p = 1; p < totalPages; p++) {
    const data = await fetchPage(p);
    const batch = data.content || [];
    all.push(...batch);
    console.log(`  Page ${p}/${totalPages - 1} — ${all.length} products so far`);
    if (batch.length < PAGE_SIZE) break; // safety: last page may be short
  }

  return all;
}

function discountPct(curr, prev) {
  if (prev > 0 && curr < prev) return Math.round((1 - curr / prev) * 100);
  return 0;
}

async function main() {
  console.log("Fetching ALL supermarket products from e-kalathi.gov.cy...");

  const products = await fetchAllProducts();
  console.log(`Total products fetched: ${products.length}`);

  // Keep only products with a genuine price reduction
  const withDiscount = products
    .map((p) => ({
      ...p,
      _curr: p.startPrice || 0,
      _prev: p.previousPrice || 0,
      _disc: discountPct(p.startPrice || 0, p.previousPrice || 0),
    }))
    .filter((p) => p._disc > 0 && p._curr > 0);

  console.log(`Products with discount: ${withDiscount.length}`);

  // Sort descending by discount %, take top N
  withDiscount.sort((a, b) => b._disc - a._disc);
  const top = withDiscount.slice(0, TOP_N);

  const deals = top.map((p) => {
    const catLabels = CATEGORY_LABELS[p.productCategoryNameEnglish] || {
      en: p.productCategoryNameEnglish || "Other",
      el: p.productCategoryNameEnglish || "Άλλο",
      ru: p.productCategoryNameEnglish || "Другое",
    };
    return {
      productMasterId: p.productMasterId,
      name: p.name,
      price: p._curr,
      previousPrice: p._prev,
      discountPct: p._disc,
      category: catLabels.en,
      categoryEl: catLabels.el,
      categoryRu: catLabels.ru,
      thumbnailUrl: p.productThumbnailUrl || null,
      eKalathiUrl: `https://www.e-kalathi.gov.cy/product-information/${p.productMasterId}`,
      availableAtChains: p.numberOfChains || null,
    };
  });

  const output = {
    updatedAt: new Date().toISOString(),
    deals,
  };

  fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n");
  console.log(`\nTop ${TOP_N} biggest savings:`);
  deals.forEach((d, i) => {
    console.log(`  ${i + 1}. -${d.discountPct}% €${d.price.toFixed(2)} (was €${d.previousPrice.toFixed(2)}) ${d.name.slice(0, 50)}`);
  });
  console.log(`\nWrote ${deals.length} deals → ${OUT}`);
}

main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
