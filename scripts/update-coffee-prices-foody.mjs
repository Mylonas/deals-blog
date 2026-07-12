/**
 * Targeted Foody Cyprus coffee scraper — fills GAPS only.
 *
 * Foody has no unauthenticated JSON menu API, so — exactly like the souvlaki
 * Foody scan — venue discovery walks the public brands sitemap (see
 * foody-discovery.mjs; the delivery listing pages are area-scoped and only
 * ever show one neighbourhood), then Playwright reads each venue page's
 * client-injected JSON-LD menu. Because a browser scrape is slow, it does NOT
 * re-price cafés already covered: it drops any discovered café that matches a
 * Wolt/Bolt café already in coffee-prices.json and only opens menus for the
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
import { CITIES, findFreddo, FREDDO_MIN_EUR } from "./update-freddo-prices.mjs";
import { FOODY_OUT, MERGED_OUT, WOLT_OUT, BOLT_OUT, mergeAndWrite, sameCafe } from "./merge-coffee-sources.mjs";
import { discoverFoodyVenues } from "./foody-discovery.mjs";

const DEBUG = process.env.DEBUG === "1";
const DEBUG_DIR = "/tmp/foody-coffee-debug";
const ONLY_CITIES = process.env.FOODY_CITIES ? new Set(process.env.FOODY_CITIES.split(",")) : null;
const MAX_VENUES = parseInt(process.env.FOODY_MAX_VENUES ?? "0", 10) || Infinity;

// brand-page title cuisines that carry cafés (also Breakfast/Brunch places,
// which usually serve freddo espresso)
const COFFEE_CUISINE_RE = /coffee|cafe|café|espresso|breakfast|brunch|καφ/i;
const NAV_TIMEOUT = 45000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const freddo = findFreddo(data.items, FREDDO_MIN_EUR);
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
    // sitemap discovery covers all cities in one pass (see foody-discovery.mjs)
    let discoveredByCity = null;
    try {
      discoveredByCity = await discoverFoodyVenues(context.request, {
        cuisineRe: COFFEE_CUISINE_RE,
        onlyCities: ONLY_CITIES,
      });
    } catch (e) {
      // no discovery → nothing to scrape; re-emit the previous scan so the
      // merge still sees a valid (if stale) Foody source
      console.log(`✗ sitemap discovery failed (${e.message}) — keeping previous scan`);
      process.exitCode = 1;
      for (const city of CITIES) {
        const kept = prevByCity.get(city.key);
        if (kept?.length) data.cities.push({ key: city.key, label: city.label, cafes: kept });
      }
    }

    for (const city of discoveredByCity ? CITIES : []) {
      if (ONLY_CITIES && !ONLY_CITIES.has(city.key)) {
        const kept = prevByCity.get(city.key);
        if (kept?.length) data.cities.push({ key: city.key, label: city.label, cafes: kept });
        continue;
      }
      console.log(`\n══ ${city.label.en} (Foody) ══`);
      const cafes = [];
      const cityEntry = { key: city.key, label: city.label, cafes };
      data.cities.push(cityEntry);

      const discovered = discoveredByCity.get(city.key) || [];
      console.log(`  discovered ${discovered.length} coffee venues`);

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
