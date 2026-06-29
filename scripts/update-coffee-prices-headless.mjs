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
 * How venue discovery works:
 *   For Wolt — we search the Nicosia Cyprus city page for the café name, click the
 *   first result, then scrape. The resolved URL is saved back to coffee-prices.json
 *   so future runs can go directly to the venue page.
 *   For Foody/Bolt — same search-first approach.
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

const PRICE_RE = /€\s*(\d+(?:[.,]\d{1,2})?)/;
function parsePrice(text) {
  const m = (text || "").match(PRICE_RE);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}
function isFreddoName(name) { return /freddo/i.test(name); }

// ── Wolt ──────────────────────────────────────────────────────────────────────

/**
 * Navigates to the Nicosia Wolt discovery page, searches for the café,
 * clicks the first venue result, then scrapes the menu.
 * Intercepts API responses for structured data; falls back to DOM.
 * Saves the resolved URL to sources.wolt so future runs can skip the search.
 */
async function scrapeWolt(page, cafeName, existingUrl, label) {
  let menuJson = null;
  let resolvedUrl = existingUrl;

  page.on("response", async (res) => {
    if (res.status() !== 200) return;
    try {
      const j = await res.json();
      if (j?.sections?.length || j?.items?.length) menuJson = j;
    } catch {}
  });

  // Step 1: try the saved URL directly (only if it looks like a real venue URL, not a city page)
  const isVenueUrl = existingUrl && existingUrl.includes("/restaurant/");
  if (isVenueUrl) {
    await page.goto(existingUrl, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForTimeout(5000);
    // Check if we're still on a venue page (not redirected to an error page)
    const currentUrl = page.url();
    const hasNotFoundText = await page.evaluate(() =>
      document.body?.textContent?.includes("is no longer on Wolt")
    );
    if (!hasNotFoundText) {
      resolvedUrl = currentUrl;
      console.log(`    direct URL OK → ${currentUrl.split("/restaurant/")[1]?.split("/")[0]}`);
      return { scraped: await extractWoltItems(page, menuJson), resolvedUrl };
    }
    console.log(`    saved URL is stale, falling back to search`);
    menuJson = null;
  }

  // Step 2: search on the Nicosia Wolt page
  console.log(`    searching Wolt Nicosia for "${cafeName}"`);
  await page.goto("https://wolt.com/en/cyp/nicosia", { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(3000);

  // Dismiss cookie consent if present
  const allowBtn = page.locator('[data-test-id="allow-button"]');
  if (await allowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await allowBtn.click();
    await page.waitForTimeout(500);
  }

  // Click the search input and type the café name
  const searchInput = page.locator('[data-test-id="SearchInput"], input[placeholder*="Search"]').first();
  await searchInput.click({ timeout: 5000 });
  await page.keyboard.type(cafeName, { delay: 80 });
  await page.waitForTimeout(3000);

  if (DEBUG) await page.screenshot({ path: `${DEBUG_DIR}/${label}-wolt-search.png` });

  // Look for venue result links in the dropdown / search results
  const venueLinks = page.locator('a[href*="/restaurant/"]');
  const count = await venueLinks.count();
  if (count === 0) {
    console.log(`    no venue links found in search results`);
    return { scraped: { popular: [], all: [] }, resolvedUrl };
  }

  const firstHref = await venueLinks.first().getAttribute("href");
  resolvedUrl = firstHref?.startsWith("http") ? firstHref : `https://wolt.com${firstHref}`;
  console.log(`    found venue: ${resolvedUrl}`);

  await venueLinks.first().click();
  await page.waitForTimeout(5000);

  if (DEBUG) await page.screenshot({ path: `${DEBUG_DIR}/${label}-wolt-menu.png`, fullPage: true });

  return { scraped: await extractWoltItems(page, menuJson), resolvedUrl };
}

async function extractWoltItems(page, menuJson) {
  // Path 1: structured JSON intercepted from the menu API
  if (menuJson) return extractFromWoltJson(menuJson);

  // Path 2: DOM — Wolt uses data-test-id attributes consistently
  return page.evaluate(() => {
    const priceRe = /€\s*(\d+(?:[.,]\d{1,2})?)/;
    function parseP(t) {
      const m = (t || "").match(priceRe);
      return m ? parseFloat(m[1].replace(",", ".")) : null;
    }

    const results = { popular: [], all: [] };

    // Find all product cards (Wolt uses ImageCentricProductCard)
    const cards = document.querySelectorAll('[data-test-id="ItemCard"]');

    // Look for a "Popular" section heading
    let popularSectionEl = null;
    const allEls = document.querySelectorAll('[data-test-id="ImageCentricProductCardSection.ExpandableWrapper"], section, [class*="Section"]');
    for (const el of allEls) {
      const heading = el.querySelector('h2, h3, h4, [data-test-id="NavigationListItem-title"]');
      if (/popular|best|top|most.order|favourite/i.test(heading?.textContent || "")) {
        popularSectionEl = el;
        break;
      }
    }

    function extractFromCards(container) {
      const items = [];
      const cardEls = container
        ? container.querySelectorAll('[data-test-id="ItemCard"]')
        : document.querySelectorAll('[data-test-id="ItemCard"]');
      for (const card of cardEls) {
        const name = card.querySelector('[data-test-id="ImageCentricProductCard.Title"]')?.textContent?.trim();
        const priceEl = card.querySelector('[data-test-id="ImageCentricProductCardPrice"]');
        const price = parseP(priceEl?.textContent || "");
        if (name && price != null) items.push({ name, price });
      }
      return items;
    }

    if (popularSectionEl) results.popular = extractFromCards(popularSectionEl);
    results.all = extractFromCards(null);
    return results;
  });
}

function extractFromWoltJson(json) {
  const popular = [], all = [];
  const sections = json.sections || [{ name: "", items: json.items || [] }];
  for (const section of sections) {
    const isPopular = /popular|bestsell|most.order|top/i.test(section.name || "");
    for (const item of section.items || []) {
      const name = item.name || item.title || "";
      const raw = item.baseprice ?? item.price ?? item.base_price ?? null;
      if (!name || raw == null) continue;
      const price = Math.round((raw > 100 ? raw / 100 : raw) * 100) / 100;
      all.push({ name, price });
      if (isPopular && popular.length < 5) popular.push({ name, price });
    }
  }
  return { popular, all };
}

// ── Foody ─────────────────────────────────────────────────────────────────────

async function scrapeFooty(page, cafeName, existingUrl, label) {
  let resolvedUrl = existingUrl;

  // Try saved URL first
  if (existingUrl) {
    await page.goto(existingUrl, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForTimeout(3000);
    const notFound = await page.evaluate(() =>
      document.body?.textContent?.includes("not found") || document.body?.textContent?.includes("404")
    );
    if (!notFound) {
      return { scraped: await extractFoodyItems(page), resolvedUrl };
    }
  }

  // Search on Foody
  console.log(`    searching Foody for "${cafeName}"`);
  await page.goto("https://www.foody.com.cy/delivery", { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(2000);

  const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], .search-input').first();
  await searchInput.click({ timeout: 5000 }).catch(() => {});
  await page.keyboard.type(cafeName, { delay: 80 });
  await page.waitForTimeout(2500);

  if (DEBUG) await page.screenshot({ path: `${DEBUG_DIR}/${label}-foody-search.png` });

  const venueLinks = page.locator('a[href*="/delivery/menu/"]');
  if (await venueLinks.count() === 0) return { scraped: { popular: [], all: [] }, resolvedUrl };

  const href = await venueLinks.first().getAttribute("href");
  resolvedUrl = href?.startsWith("http") ? href : `https://www.foody.com.cy${href}`;
  await venueLinks.first().click();
  await page.waitForTimeout(3000);

  if (DEBUG) await page.screenshot({ path: `${DEBUG_DIR}/${label}-foody-menu.png`, fullPage: true });

  return { scraped: await extractFoodyItems(page), resolvedUrl };
}

async function extractFoodyItems(page) {
  return page.evaluate(() => {
    const priceRe = /€\s*(\d+(?:[.,]\d{1,2})?)/;
    function parseP(t) {
      const m = (t || "").match(priceRe);
      return m ? parseFloat(m[1].replace(",", ".")) : null;
    }
    const results = { popular: [], all: [] };
    const itemEls = document.querySelectorAll(".product-item, .menu-item, [class*='product'], li[class*='item']");
    for (const el of itemEls) {
      const nameEl = el.querySelector("h3, h4, .product-name, [class*='name'], strong");
      const name = nameEl?.textContent?.trim();
      const price = parseP(el.textContent || "");
      if (name && price != null) results.all.push({ name, price });
    }
    // Look for a popular/bestseller category
    const headings = document.querySelectorAll("h2, h3, .category-title, [class*='category-name']");
    for (const h of headings) {
      if (/popular|best.sell|top|recommend/i.test(h.textContent || "")) {
        const section = h.closest("section, .category, [class*='category']") || h.parentElement;
        const sectionItems = section?.querySelectorAll(".product-item, li");
        for (const el of sectionItems || []) {
          const name = el.querySelector("h3, h4, strong")?.textContent?.trim();
          const price = parseP(el.textContent || "");
          if (name && price != null) results.popular.push({ name, price });
        }
        break;
      }
    }
    return results;
  });
}

// ── Bolt Food ─────────────────────────────────────────────────────────────────

async function scrapeBolt(page, cafeName, existingUrl, label) {
  let resolvedUrl = existingUrl;

  if (existingUrl) {
    await page.goto(existingUrl, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForTimeout(3000);
    const notFound = await page.evaluate(() =>
      !document.querySelector('[data-testid*="product"], [class*="ProductCard"]')
    );
    if (!notFound) {
      return { scraped: await extractBoltItems(page), resolvedUrl };
    }
  }

  console.log(`    searching Bolt Food for "${cafeName}"`);
  await page.goto("https://food.bolt.eu/en-CY/261-nicosia", { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.waitForTimeout(2000);

  const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
  await searchInput.click({ timeout: 5000 }).catch(() => {});
  await page.keyboard.type(cafeName, { delay: 80 });
  await page.waitForTimeout(2500);

  if (DEBUG) await page.screenshot({ path: `${DEBUG_DIR}/${label}-bolt-search.png` });

  const venueLinks = page.locator('a[href*="/p/"]');
  if (await venueLinks.count() === 0) return { scraped: { popular: [], all: [] }, resolvedUrl };

  const href = await venueLinks.first().getAttribute("href");
  resolvedUrl = href?.startsWith("http") ? href : `https://food.bolt.eu${href}`;
  await venueLinks.first().click();
  await page.waitForTimeout(3000);

  if (DEBUG) await page.screenshot({ path: `${DEBUG_DIR}/${label}-bolt-menu.png`, fullPage: true });

  return { scraped: await extractBoltItems(page), resolvedUrl };
}

async function extractBoltItems(page) {
  return page.evaluate(() => {
    const priceRe = /€\s*(\d+(?:[.,]\d{1,2})?)/;
    function parseP(t) {
      const m = (t || "").match(priceRe);
      return m ? parseFloat(m[1].replace(",", ".")) : null;
    }
    const results = { popular: [], all: [] };
    const itemEls = document.querySelectorAll(
      "[data-testid*='product'], [data-testid*='item'], [class*='ProductCard'], [class*='MenuItem']"
    );
    let popularSection = null;
    for (const h of document.querySelectorAll("h2, h3, [data-testid*='category-name']")) {
      if (/popular|best|top|featured/i.test(h.textContent || "")) {
        popularSection = h.closest("section, [data-testid*='category']") || h.parentElement;
        break;
      }
    }
    function extractFrom(root) {
      const items = [];
      const els = root
        ? root.querySelectorAll("[data-testid*='product'], [class*='ProductCard']")
        : itemEls;
      for (const el of els) {
        const nameEl = el.querySelector("[data-testid*='name'], [class*='Name'], h3, h4, strong");
        const name = nameEl?.textContent?.trim();
        const price = parseP(el.textContent || "");
        if (name && price != null) items.push({ name, price });
      }
      return items;
    }
    if (popularSection) results.popular = extractFrom(popularSection);
    results.all = extractFrom(null);
    return results;
  });
}

// ── build final topDrinks list ─────────────────────────────────────────────────

function buildTopDrinks(scraped, platform) {
  const { popular, all } = scraped;

  // Deduplicate by lowercased name
  const seen = new Set();
  function dedup(arr) {
    const out = [];
    for (const item of arr) {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(item); }
    }
    return out;
  }

  // Start with popular items (up to 5)
  let top = dedup(popular).slice(0, 5).map((d) => ({ ...d, platform, popular: true }));

  // Pad to 5 from all items (seen already contains popular names, so no duplicates)
  if (top.length < 5) {
    const extra = dedup(all).slice(0, 5 - top.length).map((d) => ({ ...d, platform, popular: false }));
    top = [...top, ...extra];
  }

  // Always include Freddo Espresso even if not in the top section
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
let urlsChanged = false;

for (const item of data.items) {
  const { cafe, sources } = item;
  const label = cafe.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  console.log(`\n── ${cafe} ──`);

  let scraped = null;
  let usedPlatform = null;

  const platforms = [
    { key: "wolt",  fn: scrapeWolt,  existingUrl: sources?.wolt  },
    { key: "foody", fn: scrapeFooty, existingUrl: sources?.foody },
    { key: "bolt",  fn: scrapeBolt,  existingUrl: sources?.bolt  },
  ];

  for (const { key, fn, existingUrl } of platforms) {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-GB,en;q=0.9" });
    await page.setViewportSize({ width: 1280, height: 900 });

    try {
      console.log(`  Trying ${key}`);
      const { scraped: result, resolvedUrl } = await fn(page, cafe, existingUrl, label);

      // Save resolved URL back to JSON if it changed
      if (resolvedUrl && resolvedUrl !== existingUrl) {
        sources[key] = resolvedUrl;
        urlsChanged = true;
        console.log(`  Saved ${key} URL: ${resolvedUrl}`);
      }

      const totalItems = (result.popular?.length || 0) + (result.all?.length || 0);
      if (totalItems > 0) {
        scraped = result;
        usedPlatform = key;
        console.log(`  ✓ ${key}: ${result.popular.length} popular, ${result.all.length} total`);
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
    console.log(`  → keeping existing topDrinks`);
    continue;
  }

  const topDrinks = buildTopDrinks(scraped, usedPlatform);

  const freddoItem = scraped.all.find((d) => isFreddoName(d.name));
  if (freddoItem) {
    item.freddo = freddoItem.price;
    console.log(`  Freddo: €${freddoItem.price.toFixed(2)} (from ${usedPlatform})`);
  }

  item.topDrinks = topDrinks;
  console.log(`  Top: ${topDrinks.map((d) => d.name).join(", ")}`);
}

await browser.close();

data.scrapedAt = new Date().toISOString();
data.updatedAt = data.scrapedAt;

fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`\nDone. ${data.items.filter((i) => i.topDrinks.length > 0).length}/${data.items.length} cafés scraped.`);
console.log("Run node scripts/update-coffee-prices.mjs to regenerate markdown posts.");
