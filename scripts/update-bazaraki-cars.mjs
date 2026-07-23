/**
 * Scrape every car listing on Bazaraki (rubric 5 = cars, trucks & vans) via the
 * site's internal JSON API, decode the coded attrs (year, fuel, body, gearbox,
 * drive, engine size, doors, colour) using the option maps read from the
 * category page's filter <select>s, and write the result to
 * src/data/bazaraki-cars.json.
 *
 * Bazaraki puts every human-facing page behind a Cloudflare Managed Challenge
 * that headless Chromium can't solve, so we use playwright-extra + stealth to
 * clear the challenge once on the homepage, then read /api/items/ from inside
 * the cleared browser context — same-origin fetches carry the cf_clearance
 * cookie. Same trick as scripts/scrape-bazaraki.mjs in cyprus-house-listings.
 *
 * Env:
 *   BAZARAKI_MAX_PAGES  cap on API pages (24 items each). Default: unlimited.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src/data/bazaraki-cars.json");

const CARS_RUBRIC = 5;
const MAX_PAGES = Number(process.env.BAZARAKI_MAX_PAGES ?? 0) || Infinity;

// City id → district name. Same mapping cyprus-house-listings uses.
const CITY = {
  8: "Famagusta",
  10: "Larnaca",
  11: "Nicosia",
  12: "Limassol",
  13: "Paphos",
};

const FUEL = {
  2: "Diesel", 7: "Petrol", 5: "LPG", 10: "Electric",
  11: "Other", 13: "Plug-in Hybrid Diesel", 15: "Plug-in Hybrid Petrol",
  20: "Hybrid Petrol", 30: "Hybrid Diesel",
};

const GEARBOX = { 1: "Automatic", 2: "Manual", 3: "Other" };

const BODY = {
  1: "Convertible", 2: "Coupe", 3: "Estate", 4: "Hatchback",
  5: "MPV", 6: "Pickup", 7: "SUV", 8: "Saloon",
};

const DRIVE = { 10: "4WD/AWD", 20: "FWD", 30: "RWD" };

const DOORS = { 10: "2-3", 20: "4-5", 30: "6" };

const COLOUR = {
  1: "Beige", 2: "Black", 3: "Blue", 4: "Bronze", 5: "Brown",
  6: "Green", 7: "Grey", 8: "Orange", 9: "Purple", 10: "Red",
  11: "Silver", 12: "White", 13: "Yellow", 14: "Gold", 15: "Pink",
};

// attrs__year is a code that indexes into 1950..2026 with a strange gap around
// 71 (2020 is 71, then 72/73 are 1949/1948, 74 is "Older", 75..80 are 2021..
// 2026). Build the map explicitly from the year_min <select> we captured.
const YEAR = {
  1: 1950, 2: 1951, 3: 1952, 4: 1953, 5: 1954, 6: 1955, 7: 1956, 8: 1957,
  9: 1958, 10: 1959, 11: 1960, 12: 1961, 13: 1962, 14: 1963, 15: 1964, 16: 1965,
  17: 1966, 18: 1967, 19: 1968, 20: 1969, 21: 1970, 22: 1971, 23: 1972, 24: 1973,
  25: 1974, 26: 1975, 27: 1976, 28: 1977, 29: 1978, 30: 1979, 31: 1980, 32: 1981,
  33: 1982, 34: 1983, 35: 1984, 36: 1985, 37: 1986, 38: 1987, 39: 1988, 40: 1989,
  41: 1990, 42: 1991, 43: 1992, 44: 1993, 45: 1994, 46: 1995, 47: 1996, 48: 1997,
  49: 1998, 50: 1999, 51: 2000, 52: 2001, 53: 2002, 54: 2003, 55: 2004, 56: 2005,
  57: 2006, 58: 2007, 59: 2008, 60: 2009, 61: 2010, 62: 2011, 63: 2012, 64: 2013,
  65: 2014, 66: 2015, 67: 2016, 68: 2017, 69: 2018, 70: 2019, 71: 2020,
  72: 1949, 73: 1948, 75: 2021, 76: 2022, 77: 2023, 78: 2024, 79: 2025, 80: 2026,
};

// attrs__engine-size is 1..70 for 0.4L..8.0L (0.1L step from 1.0L up), plus 80 = Electric.
// 1..7 → 0.4..1.0, then 8..70 → 1.1..8.0 with a gap (there is no 20).
function decodeEngine(code) {
  if (code == null) return null;
  if (code === 80) return { label: "Electric", litres: null };
  const map = { 1: 0.4, 2: 0.5, 3: 0.6, 4: 0.7, 5: 0.8, 6: 0.9, 7: 1.0,
    8: 1.1, 9: 1.2, 10: 1.3, 11: 1.4, 12: 1.5, 13: 1.6, 14: 1.7, 15: 1.8,
    16: 1.9, 17: 2.0, 18: 2.1, 19: 2.2, 21: 2.3, 22: 2.4, 23: 2.5, 24: 2.6,
    25: 2.7, 26: 2.8, 27: 2.9, 28: 3.0, 29: 3.1, 30: 3.2, 31: 3.3, 32: 3.4,
    33: 3.5, 34: 3.6, 35: 3.7, 36: 3.8, 37: 3.9, 38: 4.0, 39: 4.1, 40: 4.2,
    41: 4.3, 42: 4.4, 43: 4.5, 44: 4.6, 45: 4.7, 46: 4.8, 47: 4.9, 48: 5.0,
    49: 5.1, 50: 5.2, 51: 5.3, 52: 5.4, 53: 5.5, 54: 5.6, 55: 5.7, 56: 5.8,
    57: 5.9, 58: 6.0, 59: 6.1, 60: 6.2, 61: 6.3, 62: 6.4, 63: 6.5, 64: 6.6,
    65: 6.7, 66: 6.8, 67: 6.9, 68: 7.0, 69: 7.5, 70: 8.0 };
  const l = map[code];
  return l == null ? null : { label: `${l.toFixed(1).replace(".", ",")}L`, litres: l };
}

// Titles are like "Suzuki Swift 1,3L 2016" or "BMW M4 3,0L 2022" — first token
// is the make. Model = remainder up to the first token that looks like an
// engine size ("1,3L") or a year (19xx / 20xx). Not perfect for two-word makes
// (Land Rover, Alfa Romeo, Range Rover) — handle those explicitly.
const COMPOUND_MAKES = /^(Land\s+Rover|Alfa\s+Romeo|Range\s+Rover|Aston\s+Martin|Great\s+Wall|SSC\s+Ultimate|DS\s+Automobiles?)\b/i;
function parseMakeModel(title) {
  if (!title) return { make: null, model: null };
  const t = title.trim();
  const compound = t.match(COMPOUND_MAKES);
  let make, rest;
  if (compound) {
    make = compound[0].replace(/\s+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    rest = t.slice(compound[0].length).trim();
  } else {
    const idx = t.indexOf(" ");
    if (idx < 0) return { make: t, model: null };
    make = t.slice(0, idx);
    rest = t.slice(idx + 1);
  }
  // Cut off at engine size ("1,3L", "1.3L", "3,0L") or a 4-digit year.
  const cut = rest.match(/\s*(?:\d[.,]\d\s*L\b|\b(?:19|20)\d{2}\b)/i);
  const model = (cut ? rest.slice(0, cut.index) : rest).trim().replace(/\s{2,}/g, " ") || null;
  return { make, model };
}

function priceNumber(raw) {
  if (raw == null) return null;
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function mapItem(raw) {
  const a = raw.attrs || {};
  const price = priceNumber(raw.price);
  if (price == null) return null; // "Contact for price" listings — no use in a price-sorted table
  const yearCode = a["attrs__year"];
  const year = yearCode != null ? YEAR[yearCode] ?? null : null;
  const engine = decodeEngine(a["attrs__engine-size"]);
  const { make, model } = parseMakeModel(raw.title);
  const created = raw.created_dt ? new Date(raw.created_dt) : null;
  const validCreated = created && !Number.isNaN(created.getTime()) ? created : null;
  return {
    id: raw.id,
    title: raw.title || null,
    make, model,
    price,
    currency: raw.currency || "€",
    year,
    mileage: typeof a["attrs__mileage"] === "number" ? a["attrs__mileage"] : null,
    fuel: FUEL[a["attrs__fuel-type"]] ?? null,
    gearbox: GEARBOX[a["attrs__gearbox"]] ?? null,
    body: BODY[a["attrs__body-type"]] ?? null,
    drive: DRIVE[a["attrs__drive"]] ?? null,
    doors: DOORS[a["attrs__doors"]] ?? null,
    colour: COLOUR[a["attrs__colour"]] ?? null,
    engine: engine?.label ?? null,
    engineL: engine?.litres ?? null,
    city: CITY[raw.city] ?? null,
    image: raw.images?.[0]?.url ?? null,
    link: `https://www.bazaraki.com/adv/${raw.id}_${raw.slug || ""}/`,
    postedTs: validCreated ? validCreated.getTime() : null,
  };
}

async function clearCloudflare(page) {
  await page.goto("https://www.bazaraki.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(1000);
    const t = await page.title();
    if (!/just a moment/i.test(t)) return;
  }
  throw new Error("Could not clear Cloudflare challenge on bazaraki.com");
}

async function fetchPage(page, pg) {
  const url = `/api/items/?rubric=${CARS_RUBRIC}&page=${pg}`;
  return page.evaluate(async (u) => {
    const r = await fetch(u, { headers: { "X-Requested-With": "XMLHttpRequest" } });
    if (!r.ok) return { error: r.status };
    return r.json();
  }, url);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
  });
  const page = await ctx.newPage();

  console.error("Clearing Cloudflare challenge...");
  await clearCloudflare(page);

  const seen = new Set();
  const cars = [];
  let pg = 1;
  let empty = 0;
  while (pg <= MAX_PAGES) {
    let payload;
    try {
      payload = await fetchPage(page, pg);
    } catch (err) {
      console.error(`page ${pg}: fetch threw: ${err.message}`);
      break;
    }
    if (payload?.error) {
      console.error(`page ${pg}: HTTP ${payload.error}`);
      if (payload.error === 429 || payload.error === 403) {
        await page.waitForTimeout(5000);
        continue;
      }
      break;
    }
    const results = payload?.results ?? [];
    if (!results.length) {
      empty++;
      if (empty >= 2) break;
      await page.waitForTimeout(400);
      pg++;
      continue;
    }
    empty = 0;
    let added = 0;
    for (const raw of results) {
      if (seen.has(raw.id)) continue;
      seen.add(raw.id);
      const item = mapItem(raw);
      if (item) { cars.push(item); added++; }
    }
    if (pg % 20 === 0 || pg === 1) {
      console.error(`page ${pg}: +${added} (total ${cars.length})`);
    }
    if (!payload.next && results.length < 10) break;
    pg++;
    await page.waitForTimeout(200);
  }

  cars.sort((a, b) => a.price - b.price);

  const out = { updatedAt: new Date().toISOString(), source: "bazaraki.com", count: cars.length, cars };
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.error(`Wrote ${cars.length} cars to ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024 / 1024).toFixed(1)} MB)`);

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
