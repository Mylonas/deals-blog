/**
 * Targeted Foody Cyprus souvlaki scraper — fills GAPS only.
 *
 * Foody has no unauthenticated JSON menu API (the shop list is login-gated and
 * menus arrive as a server-driven-UI component tree), so this uses Playwright
 * to read the rendered menu DOM — the same approach as the coffee headless
 * scraper. Because a browser scrape is slow and heavier than the Wolt/Bolt API
 * scans, it does NOT re-price venues already covered: it discovers souvlaki
 * venues per city, drops any that already match a Wolt/Bolt venue in
 * souvlaki-prices.json, and only opens menus for the remaining GAP venues.
 *
 * Output: src/data/souvlaki-prices-foody.json, then a 3-way merge into
 * src/data/souvlaki-prices.json (see merge-souvlaki-sources.mjs).
 *
 * Foody menu prices are "from" (base) prices and item options aren't expanded,
 * so Foody contributes regular-pita cut prices (large only when the item name
 * itself says so). That's still a net gain for a venue we'd otherwise miss.
 *
 * Env knobs:
 *   FOODY_CITIES=nicosia,larnaca   only scan these city keys
 *   FOODY_MAX_VENUES=3             cap gap-menu scrapes per city (validation)
 *   FOODY_HEADFUL=1                show the browser (local debugging)
 *   DEBUG=1                        save screenshots to the scratch debug dir
 */
import fs from "fs";
import { chromium } from "playwright";
import {
  CITIES, normalize,
  PITA_RE, GREEK_RE, MINI_RE, CYPRIOT_RE, LARGE_RE,
  CUTS, PORKCHOP, PORKCHOP_MIN_CENTS,
} from "./update-souvlaki-prices.mjs";
import { FOODY_OUT, MERGED_OUT, WOLT_OUT, BOLT_OUT, mergeAndWrite, sameVenue } from "./merge-souvlaki-sources.mjs";

const DEBUG = process.env.DEBUG === "1";
const DEBUG_DIR = "/tmp/foody-souvlaki-debug";
const ONLY_CITIES = process.env.FOODY_CITIES ? new Set(process.env.FOODY_CITIES.split(",")) : null;
const MAX_VENUES = parseInt(process.env.FOODY_MAX_VENUES ?? "0", 10) || Infinity;

// Foody groups venues by cuisine chips (buttons, not links). These are the
// ones that carry Cypriot souvlaki in pita; clicking each filters the list.
const CUISINE_CHIPS = ["Grill", "Gyros", "Souvlaki", "Kontosouvli", "Ψητοπωλείο", "Σουβλάκια"];
// per-card cuisine labels worth scraping (the robust discovery signal — the
// chip carousel only exposes a few at a time)
const SOUVLAKI_CUISINE_RE = /grill|souvl|gyro|kontosouv|psist|ψητ|σουβλ|γυρ|ψησ/i;
const NAV_TIMEOUT = 45000;

// Foody delivery-page slug per city (it redirects to a default area); falls
// back to the Wolt citySlug when unmapped.
const FOODY_CITY_SLUG = {
  nicosia: "nicosia",
  limassol: "limassol",
  larnaca: "larnaca",
  paphos: "paphos",
  famagusta: "agia-napa",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── discovery: souvlaki venues delivering to a city ───────────────────────────

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
  const slug = FOODY_CITY_SLUG[city.key] || city.citySlug;
  await page.goto(`https://www.foody.com.cy/delivery/${slug}`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  await sleep(2500);

  // only keep cards whose cuisine label looks souvlaki-relevant (unless a
  // cuisine chip already scoped the whole list, in which case keep all). Cards
  // with no detectable cuisine label are skipped here — otherwise the whole
  // listing (KFC, pizza, etc.) leaks in and burns the scrape budget.
  const absorb = (links, { cuisineFiltered = false } = {}) => {
    for (const l of links) {
      if (found.has(l.slug)) continue;
      if (!cuisineFiltered && !SOUVLAKI_CUISINE_RE.test(l.cuisine || "")) continue;
      found.set(l.slug, {
        name: l.name || l.slug.replace(/-/g, " "),
        cuisine: l.cuisine || "",
        url: l.href.startsWith("http") ? l.href : `https://www.foody.com.cy${l.href}`,
      });
    }
  };

  // 1) scroll the default listing, keeping only souvlaki-cuisine cards — robust
  // because every card carries its own cuisine label
  for (let i = 0; i < 12; i++) {
    absorb(await collectVenueLinks(page));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1200);
  }

  // 2) also click each souvlaki cuisine chip (when present) and keep the whole
  // filtered list — catches venues whose card label is generic
  for (const chip of CUISINE_CHIPS) {
    try {
      const btn = page.locator("button", { hasText: new RegExp(`^\\s*${chip}\\s*$`, "i") }).first();
      if (!(await btn.count())) continue;
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ timeout: 5000 });
      await sleep(2500);
      if (DEBUG) await page.screenshot({ path: `${DEBUG_DIR}/${city.key}-${chip}.png` }).catch(() => {});
      const before = found.size;
      absorb(await collectVenueLinks(page), { cuisineFiltered: true });
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
 * menu — clean item names, descriptions and prices kept separate, plus the
 * venue's geo coordinates. Reading that is far more reliable than scraping the
 * rendered DOM (where a price row mixes the item name with its ingredient
 * description, faking souvlaki/pita matches). Returns { geo, menu } where menu
 * is [{ category, items:[{ name, price }] }] — names only, never descriptions.
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
  if (!restaurant) return { geo: null, menu: [] };

  const geo = restaurant.geo?.latitude != null
    ? { lat: Number(restaurant.geo.latitude), lng: Number(restaurant.geo.longitude) }
    : null;
  const menu = [];
  for (const section of restaurant.hasMenu?.hasMenuSection || []) {
    const items = [];
    for (const it of section.hasMenuItem || []) {
      const offer = it.offers?.price ?? (Array.isArray(it.offers) ? it.offers[0]?.price : null);
      const price = parsePrice(offer);
      if (it.name && price != null) items.push({ name: it.name, price });
    }
    if (items.length) menu.push({ category: section.name || "", items });
  }
  return { geo, menu };
}

/** Two-tier cheapest-per-cut fold over Foody DOM items (no option deltas). */
export function extractFoodyCuts(menu) {
  const cypriot = {};
  const generic = {};
  const prices = {};
  const takeInto = (map, key, eur) => {
    if (eur != null && (map[key] == null || eur < map[key])) map[key] = eur;
  };

  for (const { category, items } of menu) {
    const cat = normalize(category);
    for (const { name, price } of items) {
      // Foody's English menus render σουβλάκι as "skewer"; map it back so the
      // shared souvlaki matchers fire. The pita requirement below still blocks
      // non-pita skewer platters and mixed-grill portions.
      const n = normalize(name).replace(/\bskewers?\b/g, "souvlaki");
      if (typeof price !== "number") continue;

      if (PORKCHOP(n) && price * 100 >= PORKCHOP_MIN_CENTS) takeInto(prices, "porkchop", price);

      if (!PITA_RE.test(n) && !PITA_RE.test(cat)) continue;
      if (GREEK_RE.test(n) || MINI_RE.test(n) || GREEK_RE.test(cat) || MINI_RE.test(cat)) continue;
      const isLarge = LARGE_RE.test(n);
      const tier = CYPRIOT_RE.test(n) || CYPRIOT_RE.test(cat) ? cypriot : generic;
      for (const cut of CUTS) {
        if ((cut.size === "large") !== isLarge) continue;
        if (!cut.test(n, cat)) continue;
        takeInto(tier, cut.key, price);
      }
    }
  }
  for (const key of new Set([...Object.keys(cypriot), ...Object.keys(generic)])) {
    prices[key] = cypriot[key] ?? generic[key];
  }
  return prices;
}

// the souvlaki page compares souvlaki-in-pita; a venue whose only match is a
// pork-chop portion (e.g. a Georgian grill's mtsvadi) is not a souvlaki
// destination, so require at least one real pita cut before counting it
const PITA_CUT_KEYS = ["souvlaki", "souvlakiLarge", "chicken", "chickenLarge", "mix", "mixLarge"];
export const hasPitaCut = (prices) => PITA_CUT_KEYS.some((k) => prices[k] != null);

async function scrapeVenue(page, venue) {
  await page.goto(venue.url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
  // the menu JSON-LD is injected after the client render — poll briefly for it
  let data = { geo: null, menu: [] };
  for (let i = 0; i < 6 && !data.menu.length; i++) {
    await sleep(1200);
    data = await extractMenu(page);
  }
  if (DEBUG) await page.screenshot({ path: `${DEBUG_DIR}/${venue.slug}-menu.png`, fullPage: true }).catch(() => {});
  return { prices: extractFoodyCuts(data.menu), geo: data.geo };
}

// ── gap detection ─────────────────────────────────────────────────────────────

/** Venues already priced by Wolt/Bolt for this city (to skip). */
function existingVenues(cityKey) {
  const files = [WOLT_OUT, BOLT_OUT, MERGED_OUT].filter((f) => fs.existsSync(f));
  const out = [];
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(f, "utf8"));
    const city = (data.cities || []).find((c) => c.key === cityKey);
    for (const v of city?.venues || []) out.push({ name: v.name, lat: v.lat, lng: v.lng });
  }
  return out;
}

// ── main ──────────────────────────────────────────────────────────────────────

import { pathToFileURL } from "url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (DEBUG) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const prev = fs.existsSync(FOODY_OUT) ? JSON.parse(fs.readFileSync(FOODY_OUT, "utf8")) : { cities: [] };
  const prevByCity = new Map((prev.cities || []).map((c) => [c.key, c.venues]));

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
        if (kept?.length) data.cities.push({ key: city.key, label: city.label, venues: kept });
        continue;
      }
      console.log(`\n══ ${city.label.en} (Foody) ══`);
      const venues = [];
      const cityEntry = { key: city.key, label: city.label, venues };
      data.cities.push(cityEntry);

      let discovered = [];
      try {
        discovered = await discoverVenues(page, city);
        console.log(`  discovered ${discovered.length} souvlaki venues`);
      } catch (e) {
        const kept = prevByCity.get(city.key) || [];
        cityEntry.venues = kept;
        console.log(`  ✗ discovery failed (${e.message}) — kept ${kept.length} from previous scan`);
        checkpoint();
        continue;
      }

      // keep only venues NOT already covered by Wolt/Bolt
      const existing = existingVenues(city.key);
      const gaps = discovered.filter((d) => !existing.some((e) => sameVenue(d, e)));
      console.log(`  ${gaps.length} gap venues (not on Wolt/Bolt)`);

      let scanned = 0;
      for (const g of gaps) {
        if (scanned >= MAX_VENUES) break;
        scanned++;
        try {
          const { prices, geo } = await scrapeVenue(page, g);
          if (hasPitaCut(prices)) {
            venues.push({ name: g.name, slug: g.slug, url: g.url, lat: geo?.lat ?? null, lng: geo?.lng ?? null, prices, source: "foody" });
            console.log(`  ✓ ${g.name}: ${JSON.stringify(prices)}`);
          } else {
            console.log(`  – ${g.name}: no souvlaki-in-pita cuts`);
          }
        } catch (e) {
          console.log(`  ⚠ ${g.name}: ${e.message}`);
        }
        checkpoint();
        await sleep(1500);
      }
      venues.sort((a, b) => (a.prices.souvlaki ?? 99) - (b.prices.souvlaki ?? 99));
      console.log(`  ${venues.length} gap venues priced`);
      checkpoint();
    }
  } finally {
    await browser.close();
  }

  checkpoint();
  console.log(`\nWrote ${data.cities.reduce((n, c) => n + c.venues.length, 0)} Foody gap venues → ${FOODY_OUT}`);
  mergeAndWrite();
}
