/**
 * Fetches live supermarket prices for 10 household staples from e-kalathi.gov.cy.
 * - Writes src/data/supermarket-prices.json (read by the React sortable table component)
 * - Updates posts/en|el|ru/supermarket-price-watch.md (fallback/SEO content)
 * Run via GitHub Actions every hour.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const API = "https://www.e-kalathi.gov.cy/ekalathi-website-server/api";

// Supermarket chain IDs from e-kalathi.gov.cy /api/fetch-companies
// Verified against the live API response — do not guess IDs.
// Use an array of [id, name] pairs — plain objects with integer keys iterate in
// ascending numeric order, not insertion order, so Alpha Sigma (452) would always
// win over LIDL (453), Metro (463), etc. when prices tie.
const MAJOR_CHAINS = [
  [453, "LIDL"],
  [463, "Metro"],
  [471, "AlphaMega"],
  [479, "Papantoniou"],
  [480, "Sklavenitis"],
  [541, "Kyriacos"],
  [452, "Alpha Sigma"],
  [477, "Lysiotis"],
  [466, "Plus Discount"],
  [469, "Athinaitis"],
  [475, "Kokkinos"],
  [465, "Philippos"],
  [497, "MAS"],
  [467, "Poplife"],
  [468, "Super Discount Store"],
];

const STAPLES = [
  { key: "milk",      search: "fresh milk",       label: "Fresh Milk 1L",        labelEl: "Φρέσκο Γάλα 1L",       labelRu: "Свежее молоко 1L" },
  { key: "eggs",      search: "NIKIFOROU EGGS",    label: "Eggs",                 labelEl: "Αβγά",                  labelRu: "Яйца" },
  { key: "halloumi",  search: "halloumi",          label: "Halloumi 200g",        labelEl: "Χαλλούμι 200g",        labelRu: "Халлуми 200г" },
  { key: "spaghetti", search: "spaghetti",         label: "Spaghetti 500g",       labelEl: "Σπαγγέτι 500g",        labelRu: "Спагетти 500г" },
  { key: "oliveoil",  search: "virgin olive oil",  label: "Olive Oil 1L",         labelEl: "Ελαιόλαδο 1L",         labelRu: "Оливковое масло 1L" },
  { key: "water",     search: "Kykkos 1.5L",       label: "Water 1.5L ×6",        labelEl: "Νερό 1.5L ×6",         labelRu: "Вода 1.5L ×6" },
  { key: "yogurt",    search: "yogurt",            label: "Yogurt",               labelEl: "Γιαούρτι",              labelRu: "Йогурт" },
  { key: "rice",      search: "rice carolina",     label: "Rice 1kg",             labelEl: "Ρύζι 1kg",             labelRu: "Рис 1кг" },
  { key: "oj",        search: "orange juice 1L",   label: "Orange Juice 1L",      labelEl: "Χυμός Πορτοκάλι 1L",  labelRu: "Апельсиновый сок 1L" },
  { key: "cocacola",  search: "Coca Cola 1L",      label: "Coca-Cola 1L ×2",      labelEl: "Coca-Cola 1L ×2",      labelRu: "Кока-Кола 1L ×2" },
];

async function get(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; DealsHubBot/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function fetchBestProduct(searchTerm) {
  const json = await get(`${API}/fetch-product-list?page=0&size=20&productName=${encodeURIComponent(searchTerm)}`);
  if (!json.content?.length) return null;
  return json.content.sort((a, b) => b.numberOfChains - a.numberOfChains)[0];
}

async function findCheapestStore(product) {
  const minPrice = product.startPrice;
  for (const [id, name] of MAJOR_CHAINS) {
    try {
      const json = await get(
        `${API}/fetch-product-list?page=0&size=5&productName=${encodeURIComponent(product.name)}&companyIds=${id}`
      );
      const match = json.content?.find(
        (p) => p.productMasterId === product.productMasterId && p.startPrice <= minPrice + 0.005
      );
      if (match) return name;
    } catch {
      // skip this chain
    }
  }
  return null; // couldn't identify — user clicks link to see on e-kalathi
}

async function main() {
  console.log("Fetching supermarket prices from e-kalathi.gov.cy...");

  const results = [];
  for (const staple of STAPLES) {
    try {
      const product = await fetchBestProduct(staple.search);
      if (!product) { results.push({ staple, product: null, store: null }); continue; }

      console.log(`  ${staple.key}: ${product.name} €${product.startPrice}`);
      const store = await findCheapestStore(product);
      console.log(`    cheapest store: ${store ?? "unidentified"}`);

      results.push({ staple, product, store });
    } catch (err) {
      console.warn(`  ${staple.key}: ERROR — ${err.message}`);
      results.push({ staple, product: null, store: null });
    }
  }

  // Write JSON for the React component
  const dataDir = path.join(ROOT, "src", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const json = {
    updatedAt: new Date().toISOString(),
    items: results.map(({ staple, product, store }) => ({
      key: staple.key,
      label: staple.label,
      labelEl: staple.labelEl,
      labelRu: staple.labelRu,
      price: product ? product.startPrice : null,
      previousPrice: product ? product.previousPrice : null,
      productId: product ? product.productMasterId : null,
      productCode: product ? product.code : null,
      productName: product ? product.name : null,
      store: store,
    })),
  };
  fs.writeFileSync(path.join(dataDir, "supermarket-prices.json"), JSON.stringify(json, null, 2), "utf8");
  console.log("Wrote src/data/supermarket-prices.json");

  // Also update markdown posts (SEO / fallback)
  for (const lang of ["en", "el", "ru"]) {
    const fp = path.join(ROOT, `posts/${lang}/supermarket-price-watch.md`);
    if (!fs.existsSync(fp)) continue;
    const block = buildMarkdownBlock(results, lang);
    updatePost(fp, block);
    console.log(`Updated: posts/${lang}/supermarket-price-watch.md`);
  }

  console.log("Done.");
  process.exit(0);
}

function buildMarkdownBlock(results, lang) {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const t = {
    en: { updated: `Updated ${today}`, col1: "Staple", col2: "Cheapest Price", col3: "Store" },
    el: { updated: `Ενημέρωση ${today}`, col1: "Προϊόν", col2: "Φθηνότερη Τιμή", col3: "Κατάστημα" },
    ru: { updated: `Обновлено ${today}`, col1: "Продукт", col2: "Мин. цена", col3: "Магазин" },
  }[lang];

  const rows = results.map(({ staple, product, store }) => {
    const label = lang === "en" ? staple.label : lang === "el" ? staple.labelEl : staple.labelRu;
    if (!product) return `| ${label} | — | — |`;
    const link = `https://www.e-kalathi.gov.cy/product-information/${product.productMasterId}`;
    const price = `[€${product.startPrice.toFixed(2)}](${link})`;
    return `| ${label} | **${price}** | ${store ?? "—"} |`;
  }).join("\n");

  return `
> ${t.updated} | Source: [e-kalathi.gov.cy](https://www.e-kalathi.gov.cy)

| ${t.col1} | ${t.col2} | ${t.col3} |
|---------|---------|--------|
${rows}
`;
}

function updatePost(filePath, block) {
  const content = fs.readFileSync(filePath, "utf8");
  const START = "<!-- PRICES_START -->";
  const END = "<!-- PRICES_END -->";
  const s = content.indexOf(START);
  const e = content.indexOf(END);
  if (s === -1 || e === -1) return;
  fs.writeFileSync(filePath, content.substring(0, s + START.length) + "\n" + block + "\n" + content.substring(e), "utf8");
}

main();
