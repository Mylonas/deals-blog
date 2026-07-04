/**
 * Fetches the 30 cheapest products currently available across Cyprus supermarkets
 * from e-kalathi.gov.cy and writes src/data/supermarket-deals.json.
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
  "BREAD":                      { en: "Bread",           el: "Ψωμί",               ru: "Хлеб" },
  "RICE":                       { en: "Rice",            el: "Ρύζι",               ru: "Рис" },
  "OLIVE OIL":                  { en: "Olive Oil",       el: "Ελαιόλαδο",          ru: "Оливковое масло" },
  "COFFEE":                     { en: "Coffee",          el: "Καφές",              ru: "Кофе" },
  "SUGAR":                      { en: "Sugar",           el: "Ζάχαρη",             ru: "Сахар" },
  "BUTTER":                     { en: "Butter",          el: "Βούτυρο",            ru: "Масло" },
};

async function fetchCheapest(size = 30) {
  const url = `${API}/fetch-product-list?page=0&size=${size}&productName=`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.content || [];
}

async function main() {
  console.log("Fetching cheapest supermarket products from e-kalathi.gov.cy...");

  const products = await fetchCheapest(30);

  const deals = products.map((p) => {
    const prev = p.previousPrice || 0;
    const curr = p.startPrice || 0;
    const discountPct = prev > 0 && curr < prev
      ? Math.round((1 - curr / prev) * 100)
      : 0;
    const catLabels = CATEGORY_LABELS[p.productCategoryNameEnglish] || {
      en: p.productCategoryNameEnglish || "Other",
      el: p.productCategoryNameEnglish || "Άλλο",
      ru: p.productCategoryNameEnglish || "Другое",
    };
    return {
      productMasterId: p.productMasterId,
      name: p.name,
      price: curr,
      previousPrice: prev || null,
      discountPct,
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
  console.log(`Wrote ${deals.length} deals → ${OUT}`);

  deals.slice(0, 10).forEach((d) => {
    const disc = d.discountPct > 0 ? ` (-${d.discountPct}%)` : "";
    console.log(`  €${d.price.toFixed(2)}${disc} ${d.name.slice(0, 50)}`);
  });

  console.log("Done.");
}

main().catch((e) => { console.error("Failed:", e.message); process.exit(1); });
