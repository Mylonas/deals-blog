/**
 * Targeted Foody Cyprus coffee scraper — fills GAPS only.
 *
 * Foody has no unauthenticated JSON menu API, so — exactly like the souvlaki
 * Foody scan — this drives Playwright and reads each venue's JSON-LD menu.
 * Because a browser scrape is slow, it does NOT re-price cafés already
 * covered: it discovers coffee venues per city, drops any that match a
 * Wolt/Bolt café already in coffee-prices.json, and only opens menus for the
 * remaining GAP cafés.
 *
 * Output: src/data/coffee-prices-foody.json, then a 3-way merge into the
 * `cities` section of src/data/coffee-prices.json (merge-coffee-sources.mjs).
 *
 * Env knobs:
 *   FOODY_CITIES=nicosia,larnaca   only scan these city keys
 *   FOODY_MAX_VENUES=3             cap gap-menu scrapes per city (validation)
 *   FOODY_HEADFUL=1                show the browser (local debugging)
 *   DEBUG=1                        save screenshots to the scratch debug dir
 */
import fs from "fs";
import { chromium } from "playwright";
import { CITIES, findFreddo } from "./update-freddo-prices.mjs";
import { FOODY_OUT, MERGED_OUT, WOLT_OUT, BOLT_OUT, mergeAndWrite, sameCafe } from "./merge-coffee-sources.mjs";

const DEBUG = process.env.DEBUG === "1";
const DEBUG_DIR = "/tmp/foody-coffee-debug";
const ONLY_CITIES = process.env.FOODY_CITIES ? new Set(process.env.FOODY_CITIES.split(",")) : null;
const MAX_VENUES = parseInt(process.env.FOODY_MAX_VENUES ?? "0", 10) || Infinity;

// Foody cuisine chips that carry cafés; clicking each filters the list
const CUISINE_CHIPS = ["Coffee", "Καφές", "Cafe", "Breakfast"];
// per-card cuisine labels worth scraping (the robust discovery signal)
const COFFEE_CUISINE_RE = /coffee|cafe|café|espresso|καφ/i;
const NAV_TIMEOUT = 45000;

// Foody delivery-page slug per city
const FOODY_CITY_SLUG = {
  nicosia: "nicosia",
  limassol: "limassol",
  larnaca: "larnaca",
  paphos: "paphos",
  famagusta: "agia-napa",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── discovery: coffee venues delivering to a city ─────────────────────────────

const collectVenueLinks = (page) =>
  page.evaluate(() => {
    const out = [];
    for (const a of document.querySelectorAll('a[href*="/delivery/menu/"]')) {
      const href = a.getAttribute("href");
      const slug = href.split("/delivery/menu/")[1]?.split(/[/?#]/)[0];
      // the clean shop name is the anchor's aria-label (falls back to the title
      // element) — the raw textContent also carries price, rating and cuisine
      const name = (a.getAttribute("aria-label") || a.querySelector('[class*="cc-title"], p')?.textContent || "")
        .replace(/\s+/g, " ").trim().slice(0, 80);
      const cuisine = (a.querySelector('[class*="cc-category"]')?.textContent || "").trim();
      if (slug) out.push({ slug, name, href, cuisine });
    }
    return out;
  });

async function discoverVenues(page, city) {
  const found = new Map(); // slug → { name, cuisine, url }
  const slug = FOODY_CITY_SLUG[city.key] || city.key;
  await page.goto(`https://www.foody.com.cy/delivery/${slug}`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  await sleep(2500);

  // only keep cards whose cuisine label looks coffee-relevant (unless a
  // cuisine chip already scoped the whole list, in which case keep all)
  const absorb = (links, { cuisineFiltered = false } = {}) => {
    for (const l of links) {
      if (found.has(l.slug)) continue;
      if (!cuisineFiltered && !COFFEE_CUISINE_RE.test(l.cuisine || "")) continue;
      found.set(l.slug, {
        name: l.name || l.slug.replace(/-/g, " "),
        cuisine: l.cuisine || "",
        url: l.href.startsWith("http") ? l.href : `https://www.foody.com.cy${l.href}`,
      });
    }
  };

  // 1) scroll the default listing, keeping only coffee-cuisine cards
  for (let i = 0; i < 12; i++) {
    absorb(await collectVenueLinks(page));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1200);
  }

  // 2) also click each coffee cuisine chip (when present) and keep the whole
  // filtered list — catches cafés whose card label is generic
  for (const chip of CUISINE_CHIPS) {
    try {
      const btn = page.locator("button", { hasText: new RegExp(`^\\s*${chip}\\s*$`, "i") }).first();
      if (!(await btn.count())) continue;
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      // the chip carousel's prev/next overlay intercepts pointer events on
      // some viewports — fall back to a force click before giving up
      await btn.click({ timeout: 5000 }).catch(() => btn.click({ timeout: 5000, force: true }));
      await sleep(2500);
      if (DEBUG) await page.screenshot({ path: `${DEBUG_DIR}/${city.key}-${chip}.png` }).catch(() => {});
      const before = found.size;
      absorb(await collectVenueLinks(page), { cuisineFiltered: chip !== "Breakfast" });
      console.log(`    "${chip}": +${found.size - before} venues`);
      await btn.click({ timeout: 5000 }).catch(() => {}); // toggle off before next
      await sleep(1000);
    } catch (e) {
      console.log(`    chip "${chip}" failed: ${e.message}`);
    }
  }
  return [...found.entries()].map(([slug, v]) => ({ slug, ...v }));
}

// ── menu extraction ───────────────────────────────────────────────────────────

const parsePrice = (t) => {
  const m = String(t ?? "").match(/(\d+(?:[.,]\d{1,2})?)/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
};

/**
 * Foody injects a JSON-LD `Restaurant` node (client-side) carrying the full
 * menu — clean item names and prices, plus the venue's geo coordinates.
 * Returns { geo, items } with prices already in euros.
 */
async function extractMenu(page) {
  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
  );
  let restaurant = null;
  for (const raw of blocks) {
    let j;
    try { j = JSON.parse(raw); } catch { continue; }
    for (const node of Array.isArray(j) ? j : [j]) {
      if (node?.hasMenu || node?.["@type"] === "Restaurant") restaurant = node;
    }
  }
  if (!restaurant) return { geo: null, items: [] };

  const geo = restaurant.geo?.latitude != null
    ? { lat: Number(restaurant.geo.latitude), lng: Number(restaurant.geo.longitude) }
    : null;
  const items = [];
  for (const section of restaurant.hasMenu?.hasMenuSection || []) {
    for (const it of section.hasMenuItem || []) {
      const offer = it.offers?.price ?? (Array.isArray(it.offers) ? it.offers[0]?.price : null);
      const price = parsePrice(offer);
      if (it.name && price != null && price > 0) items.push({ name: it.name, price });
    }
  }
  return { geo, items };
}

async function scrapeVenue(page, venue) {
  await page.goto(venue.url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  // the menu JSON-LD is injected after the client render — poll briefly for it
  let data = { geo: null, items: [] };
  for (let i = 0; i < 6 && !data.items.length; i++) {
    await sleep(1200);
    data = await extractMenu(page);
  }
  if (DEBUG) await page.screenshot({ path: `${DEBUG_DIR}/${venue.slug}-menu.png`, fullPage: true }).catch(() => {});
  const freddo = findFreddo(data.items);
  return { freddo: freddo ? freddo.price : null, geo: data.geo };
}

// ── gap detection ─────────────────────────────────────────────────────────────

/** Cafés already priced by Wolt/Bolt for this city (to skip). */
function existingCafes(cityKey) {
  const files = [WOLT_OUT, BOLT_OUT, MERGED_OUT].filter((f) => fs.existsSync(f));
  const out = [];
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(f, "utf8"));
    const city = (data.cities || []).find((c) => c.key === cityKey);
    for (const v of city?.cafes || []) out.push({ cafe: v.cafe, lat: v.lat, lng: v.lng });
  }
  return out;
}

// ── main ──────────────────────────────────────────────────────────────────────

import { pathToFileURL } from "url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (DEBUG) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const prev = fs.existsSync(FOODY_OUT) ? JSON.parse(fs.readFileSync(FOODY_OUT, "utf8")) : { cities: [] };
  const prevByCity = new Map((prev.cities || []).map((c) => [c.key, c.cafes]));

  const browser = await chromium.launch({ headless: process.env.FOODY_HEADFUL !== "1" });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    locale: "en-US",
  });
  const page = await context.newPage();

  const data = { updatedAt: null, cities: [] };
  const checkpoint = () => {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(FOODY_OUT, JSON.stringify(data, null, 2) + "\n");
  };

  try {
    for (const city of CITIES) {
      if (ONLY_CITIES && !ONLY_CITIES.has(city.key)) {
        const kept = prevByCity.get(city.key);
        if (kept?.length) data.cities.push({ key: city.key, label: city.label, cafes: kept });
        continue;
      }
      console.log(`\n══ ${city.label.en} (Foody) ══`);
      const cafes = [];
      const cityEntry = { key: city.key, label: city.label, cafes };
      data.cities.push(cityEntry);

      let discovered = [];
      try {
        discovered = await discoverVenues(page, city);
        console.log(`  discovered ${discovered.length} coffee venues`);
      } catch (e) {
        cityEntry.cafes = prevByCity.get(city.key) || [];
        console.log(`  ✗ discovery failed (${e.message}) — kept ${cityEntry.cafes.length} from previous scan`);
        checkpoint();
        continue;
      }

      // keep only cafés NOT already covered by Wolt/Bolt
      const existing = existingCafes(city.key);
      const gaps = discovered.filter((d) => !existing.some((e) => sameCafe(d, e)));
      console.log(`  ${gaps.length} gap cafés (not on Wolt/Bolt)`);

      let scanned = 0;
      for (const g of gaps) {
        if (scanned >= MAX_VENUES) break;
        scanned++;
        try {
          const { freddo, geo } = await scrapeVenue(page, g);
          if (freddo != null) {
            cafes.push({ cafe: g.name, freddo, slug: g.slug, url: g.url, address: null, lat: geo?.lat ?? null, lng: geo?.lng ?? null, source: "foody" });
            console.log(`  ✓ ${g.name}: €${freddo.toFixed(2)}`);
          } else {
            console.log(`  – ${g.name}: no Freddo Espresso on the menu`);
          }
        } catch (e) {
          console.log(`  ⚠ ${g.name}: ${e.message}`);
        }
        checkpoint();
        await sleep(1500);
      }
      cafes.sort((a, b) => a.freddo - b.freddo);
      console.log(`  ${cafes.length} gap cafés priced`);
      checkpoint();
    }
  } finally {
    await browser.close();
  }

  checkpoint();
  console.log(`\nWrote ${data.cities.reduce((n, c) => n + c.cafes.length, 0)} Foody gap cafés → ${FOODY_OUT}`);
  mergeAndWrite();
}
