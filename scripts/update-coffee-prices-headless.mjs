/**
 * Monthly headless scraper — extracts top 5 popular drinks + Freddo Espresso price
 * from Wolt, Foody, and Bolt Food Cyprus for each café in coffee-prices.json.
 *
 * Run manually:  node scripts/update-coffee-prices-headless.mjs
 * Debug mode:    DEBUG=1 node scripts/update-coffee-prices-headless.mjs
 *   → saves screenshots + HTML snapshots to /tmp/coffee-debug/
 *
 * Called by .github/workflows/update-coffee-prices-monthly.yml on the 1st of each month.
 * After this script runs, update-coffee-prices.mjs regenerates the markdown posts.
 *
 * URL maintenance: if a café page returns 404 or no items, update the "sources" URL
 * in src/data/coffee-prices.json to point to the correct venue page on that platform.
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_FILE = path.join(ROOT, "src/data/coffee-prices.json");
const DEBUG = process.env.DEBUG === "1";
const DEBUG_DIR = "/tmp/coffee-debug";

if (DEBUG) fs.mkdirSync(DEBUG_DIR, { recursive: true });

// ── price extraction helpers ───────────────────────────────────────────────────

const PRICE_RE = /€\s*(\d+(?:[.,]\d{1,2})?)/;

function parsePrice(text) {
  const m = (text || "").match(PRICE_RE);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

function isFreddoName(name) {
  return /freddo/i.test(name);
}

// ── platform scrapers ──────────────────────────────────────────────────────────

/**
 * Wolt — intercepts the menu API response for structured JSON, falls back to DOM.
 * The browser session authenticates automatically so the API call succeeds.
 */
async function scrapeWolt(page, url, label) {
  let menuJson = null;

  // Intercept Wolt's internal menu API (called automatically when the page loads)
  page.on("response", async (res) => {
    const u = res.url();
    if (
      (u.includes("/menu") || u.includes("/items") || u.includes("/sections")) &&
      res.status() === 200
    ) {
      try {
        const j = await res.json();
        // Wolt API response has `sections` (array of categories with `items`)
        if (j?.sections?.length || j?.items?.length) menuJson = j;
      } catch {}
    }
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 40000 });

  if (DEBUG) {
    await page.screenshot({ path: `${DEBUG_DIR}/${label}-wolt.png`, fullPage: true });
    fs.writeFileSync(`${DEBUG_DIR}/${label}-wolt.html`, await page.content());
  }

  // ── path 1: structured API JSON ────────────────────────────────────────────
  if (menuJson) {
    return extractFromWoltJson(menuJson);
  }

  // ── path 2: DOM extraction ─────────────────────────────────────────────────
  return page.evaluate(() => {
    const priceRe = /€\s*(\d+(?:[.,]\d{1,2})?)/;
    function parseP(t) {
      const m = (t || "").match(priceRe);
      return m ? parseFloat(m[1].replace(",", ".")) : null;
    }

    const results = { popular: [], all: [] };

    // Look for a heading containing "popular", "best", "top", "favourites"
    const headingEls = document.querySelectorAll("h2, h3, h4, [class*='SectionTitle'], [class*='section-title']");
    let popularSection = null;
    for (const h of headingEls) {
      if (/popular|bestsell|most.order|top.pick|favourit/i.test(h.textContent || "")) {
        popularSection = h.closest("section, [class*='Section'], [class*='MenuSection']") || h.parentElement;
        break;
      }
    }

    // Extract items from a container — tries common Wolt/generic selectors
    function extractItems(root) {
      const items = [];
      // Wolt uses data-test-id; fallback to class-based
      const candidates = root.querySelectorAll(
        "[data-test-id*='item'], [class*='MenuItem'], [class*='menu-item'], [class*='ProductCard'], article"
      );
      for (const el of candidates) {
        const nameEl =
          el.querySelector("[data-test-id*='name'], [class*='Name'], [class*='name'], h3, h4, strong") ||
          Array.from(el.querySelectorAll("span, p")).find((e) => (e.textContent || "").trim().length > 2 && (e.textContent || "").trim().length < 80);
        const name = nameEl?.textContent?.trim();
        if (!name) continue;

        const priceEl = el.querySelector("[data-test-id*='price'], [class*='Price'], [class*='price']");
        const price = parseP(priceEl?.textContent || el.textContent || "");
        if (price != null) items.push({ name, price });
      }
      return items;
    }

    if (popularSection) {
      results.popular = extractItems(popularSection).slice(0, 5);
    }
    results.all = extractItems(document.body);
    return results;
  });
}

function extractFromWoltJson(json) {
  const popular = [];
  const all = [];

  const sections = json.sections || (json.items ? [{ name: "", items: json.items }] : []);
  for (const section of sections) {
    const isPopular = /popular|bestsell|most.order|top/i.test(section.name || "");
    for (const item of section.items || []) {
      const name = item.name || item.title || "";
      const price =
        (item.baseprice ?? item.price ?? item.base_price ?? null);
      if (!name || price == null) continue;
      // Wolt prices are in cents
      const euros = price > 100 ? price / 100 : price;
      const entry = { name, price: Math.round(euros * 100) / 100 };
      all.push(entry);
      if (isPopular && popular.length < 5) popular.push(entry);
    }
  }

  return { popular, all };
}

/**
 * Foody Cyprus (foody.com.cy) — DOM extraction.
 * Foody renders server-side HTML so content is available immediately.
 */
async function scrapeFooty(page, url, label) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 });
  // Extra wait for any hydration
  await page.waitForTimeout(3000);

  if (DEBUG) {
    await page.screenshot({ path: `${DEBUG_DIR}/${label}-foody.png`, fullPage: true });
    fs.writeFileSync(`${DEBUG_DIR}/${label}-foody.html`, await page.content());
  }

  return page.evaluate(() => {
    const priceRe = /€\s*(\d+(?:[.,]\d{1,2})?)/;
    function parseP(t) {
      const m = (t || "").match(priceRe);
      return m ? parseFloat(m[1].replace(",", ".")) : null;
    }

    const results = { popular: [], all: [] };

    // Foody uses .cat-products or .product-list type structures
    const allItemEls = document.querySelectorAll(
      ".product-item, .menu-item, [class*='product'], [class*='item-card'], li[class*='item']"
    );

    let popularSection = null;
    const headings = document.querySelectorAll("h2, h3, h4, .category-title, [class*='category-name']");
    for (const h of headings) {
      if (/popular|best.sell|top|recommend/i.test(h.textContent || "")) {
        popularSection = h.closest("section, .category, [class*='category']") || h.parentElement;
        break;
      }
    }

    function extractFromContainer(root) {
      const items = [];
      const els = root.querySelectorAll(".product-item, .menu-item, [class*='product'], li");
      for (const el of els) {
        const nameEl = el.querySelector("h3, h4, .product-name, [class*='name'], strong");
        const name = nameEl?.textContent?.trim();
        const price = parseP(el.textContent || "");
        if (name && price != null) items.push({ name, price });
      }
      return items;
    }

    if (popularSection) {
      results.popular = extractFromContainer(popularSection).slice(0, 5);
    }

    // Fall back: extract all items
    for (const el of allItemEls) {
      const nameEl = el.querySelector("h3, h4, .product-name, [class*='name'], strong");
      const name = nameEl?.textContent?.trim();
      const price = parseP(el.textContent || "");
      if (name && price != null) results.all.push({ name, price });
    }

    return results;
  });
}

/**
 * Bolt Food (food.bolt.eu) — DOM extraction.
 */
async function scrapeBolt(page, url, label) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 40000 });

  if (DEBUG) {
    await page.screenshot({ path: `${DEBUG_DIR}/${label}-bolt.png`, fullPage: true });
    fs.writeFileSync(`${DEBUG_DIR}/${label}-bolt.html`, await page.content());
  }

  return page.evaluate(() => {
    const priceRe = /€\s*(\d+(?:[.,]\d{1,2})?)/;
    function parseP(t) {
      const m = (t || "").match(priceRe);
      return m ? parseFloat(m[1].replace(",", ".")) : null;
    }

    const results = { popular: [], all: [] };

    // Bolt Food uses data-testid attributes
    const allItemEls = document.querySelectorAll(
      "[data-testid*='product'], [data-testid*='item'], [class*='ProductCard'], [class*='MenuItem']"
    );

    let popularSection = null;
    const headings = document.querySelectorAll("h2, h3, h4, [data-testid*='category-name'], [class*='CategoryTitle']");
    for (const h of headings) {
      if (/popular|best.sell|top|featured/i.test(h.textContent || "")) {
        popularSection = h.closest("section, [data-testid*='category'], [class*='Category']") || h.parentElement;
        break;
      }
    }

    function extractFromContainer(root) {
      const items = [];
      const els = root.querySelectorAll(
        "[data-testid*='product'], [data-testid*='item'], [class*='ProductCard'], [class*='MenuItem']"
      );
      for (const el of els) {
        const nameEl = el.querySelector(
          "[data-testid*='name'], [class*='Name'], [class*='title'], h3, h4, strong"
        );
        const name = nameEl?.textContent?.trim();
        const price = parseP(el.textContent || "");
        if (name && price != null) items.push({ name, price });
      }
      return items;
    }

    if (popularSection) {
      results.popular = extractFromContainer(popularSection).slice(0, 5);
    }

    for (const el of allItemEls) {
      const nameEl = el.querySelector(
        "[data-testid*='name'], [class*='Name'], [class*='title'], h3, h4, strong"
      );
      const name = nameEl?.textContent?.trim();
      const price = parseP(el.textContent || "");
      if (name && price != null) results.all.push({ name, price });
    }

    return results;
  });
}

// ── merge popular + freddo into final topDrinks ────────────────────────────────

function buildTopDrinks(scraped, platform) {
  const { popular, all } = scraped;

  // Deduplicate by name (case-insensitive)
  const seen = new Set();
  const dedup = (arr) =>
    arr.filter((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  let top = dedup(popular).slice(0, 5).map((d) => ({ ...d, platform, popular: true }));

  // If fewer than 5 popular items, pad from all items
  if (top.length < 5) {
    const extra = dedup(all)
      .filter((i) => !seen.has(i.name.toLowerCase()))
      .slice(0, 5 - top.length)
      .map((d) => ({ ...d, platform, popular: false }));
    top = [...top, ...extra];
  }

  // Add Freddo Espresso if not already in top 5
  const hasFreddo = top.some((d) => isFreddoName(d.name));
  if (!hasFreddo) {
    const freddo = all.find((d) => isFreddoName(d.name));
    if (freddo) top.push({ ...freddo, platform, popular: false });
  }

  return top;
}

// ── main ───────────────────────────────────────────────────────────────────────

const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

const browser = await chromium.launch({ headless: true });

for (const item of data.items) {
  const { cafe, sources } = item;
  const label = cafe.toLowerCase().replace(/\s+/g, "-");
  console.log(`\n── ${cafe} ──`);

  let scraped = null;
  let usedPlatform = null;

  const platforms = [
    { key: "wolt",  url: sources?.wolt,  fn: scrapeWolt  },
    { key: "foody", url: sources?.foody, fn: scrapeFooty },
    { key: "bolt",  url: sources?.bolt,  fn: scrapeBolt  },
  ];

  for (const { key, url, fn } of platforms) {
    if (!url) continue;
    const page = await browser.newPage();
    // Act like a regular browser to avoid bot detection
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-GB,en;q=0.9" });
    await page.setViewportSize({ width: 1280, height: 900 });

    try {
      console.log(`  Trying ${key}: ${url}`);
      const result = await fn(page, url, label);
      const totalItems = (result.popular?.length || 0) + (result.all?.length || 0);
      if (totalItems > 0) {
        scraped = result;
        usedPlatform = key;
        console.log(`  ✓ ${key}: ${result.popular.length} popular, ${result.all.length} total items`);
        await page.close();
        break;
      } else {
        console.log(`  ✗ ${key}: no items found`);
      }
    } catch (err) {
      console.log(`  ✗ ${key}: ${err.message.split("\n")[0]}`);
    }
    await page.close();
  }

  if (!scraped) {
    console.log(`  → no data — keeping existing topDrinks`);
    continue;
  }

  const topDrinks = buildTopDrinks(scraped, usedPlatform);

  // Update freddo price from scraped data if found
  const freddoItem = scraped.all.find((d) => isFreddoName(d.name));
  if (freddoItem) {
    item.freddo = freddoItem.price;
    console.log(`  Freddo: €${freddoItem.price.toFixed(2)} (from ${usedPlatform})`);
  }

  item.topDrinks = topDrinks;
  console.log(`  Top drinks: ${topDrinks.map((d) => d.name).join(", ")}`);
}

await browser.close();

data.scrapedAt = new Date().toISOString();
data.updatedAt = data.scrapedAt;

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`\nDone. Scraped ${data.items.filter((i) => i.topDrinks.length > 0).length}/${data.items.length} cafés.`);
console.log("Run node scripts/update-coffee-prices.mjs to regenerate markdown posts.");
