/**
 * Foody Cyprus venue discovery via the public sitemap.
 *
 * The delivery listing pages are area-scoped (foody.com.cy/delivery/nicosia
 * redirects to ONE neighbourhood, e.g. /delivery/kaimakli), so scraping the
 * rendered listing sees a tiny fraction of a city's venues. The sitemap at
 * /sitemap/brands instead lists every venue (~3.9k) as
 * /delivery/{district}/{brand-slug}, and each brand page's server-rendered
 * HTML carries the two discovery signals without needing a browser render:
 *
 *   <title>{Name} {Cuisine} delivery in {Area} | Order from Foody</title>
 *   <link rel="canonical" href={venue page, or /delivery/menu/{slug} for chains}>
 *
 * So discovery is: fetch the sitemap, map districts → blog city keys, fetch
 * each brand page's raw HTML (plain HTTP via Playwright's request context —
 * no page render), keep venues whose title cuisine matches `cuisineRe`, and
 * return them per city with the canonical URL to open for the menu scrape.
 * Wrong-district duplicates canonicalize to an area listing page and are
 * dropped; chain duplicates canonicalize to one shared menu URL and are
 * deduped per city.
 */

const SITEMAP_BRANDS = "https://www.foody.com.cy/sitemap/brands";

export const DISTRICT_TO_CITY = {
  leykosia: "nicosia",
  leukosia: "nicosia",
  lefkosia: "nicosia",
  lemesos: "limassol",
  larnaka: "larnaca",
  pafos: "paphos",
  ammochostos: "famagusta",
  paralimni: "famagusta",
};

// two-word cuisine labels that would otherwise lose their first word to the
// venue name when splitting "{Name} {Cuisine}" on the last word
const TWO_WORD_CUISINES = /(Fried Chicken|Ice Cream|Fish & Chips|Baked goods)$/i;

const decodeEntities = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/** Parse "{Name} {Cuisine} delivery in {Area} | Order from Foody". */
export function parseBrandTitle(title) {
  const m = decodeEntities(title).match(/^(.*) delivery in (.*?) \| Order from Foody$/s);
  if (!m) return null;
  const left = m[1].trim();
  const area = m[2].trim();
  const two = left.match(TWO_WORD_CUISINES);
  const cuisine = two ? two[1] : left.split(/\s+/).pop();
  const name = left.slice(0, left.length - cuisine.length).trim();
  return name ? { name, cuisine, area } : null;
}

/**
 * Discover Foody venues per city whose cuisine matches `cuisineRe`.
 *
 * @param request Playwright APIRequestContext (browserContext.request)
 * @returns Map(cityKey → [{ slug, name, cuisine, area, url }])
 */
export async function discoverFoodyVenues(request, { cuisineRe, onlyCities = null, concurrency = 6 } = {}) {
  const resp = await request.get(SITEMAP_BRANDS, { timeout: 30000 });
  if (!resp.ok()) throw new Error(`brands sitemap → HTTP ${resp.status()}`);
  const xml = await resp.text();
  const brandUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const jobs = [];
  for (const url of brandUrls) {
    const district = url.match(/\/delivery\/([a-z-]+)\//)?.[1];
    const cityKey = DISTRICT_TO_CITY[district];
    if (!cityKey) continue;
    if (onlyCities && !onlyCities.has(cityKey)) continue;
    jobs.push({ url, cityKey });
  }
  console.log(`  Foody sitemap: ${brandUrls.length} brand pages, ${jobs.length} in scope`);

  const byCity = new Map();
  const seen = new Set(); // canonical URL per city, to drop chain duplicates
  let done = 0;

  const fetchOne = async ({ url, cityKey }) => {
    let body = null;
    for (let attempt = 0; attempt < 2 && body == null; attempt++) {
      try {
        const r = await request.get(url, { timeout: 20000 });
        if (r.ok()) body = await r.text();
      } catch {}
    }
    if (++done % 250 === 0) console.log(`  … ${done}/${jobs.length} brand pages checked`);
    if (body == null) return;

    const title = body.match(/<title>([^<]*)<\/title>/)?.[1];
    const parsed = title && parseBrandTitle(title);
    if (!parsed || !cuisineRe.test(parsed.cuisine)) return;

    const canonical = body.match(/<link rel="canonical" href="([^"]+)"/)?.[1] || url;
    // wrong-district duplicates canonicalize to an area listing (2 path segs)
    const path = canonical.replace(/^https?:\/\/[^/]+/, "");
    if (!/^\/delivery\/[^/]+\/[^/]+/.test(path)) return;

    const slug = path.split("/").filter(Boolean).pop();
    const key = `${cityKey}:${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (!byCity.has(cityKey)) byCity.set(cityKey, []);
    byCity.get(cityKey).push({ slug, name: parsed.name, cuisine: parsed.cuisine, area: parsed.area, url: canonical });
  };

  let next = 0;
  const worker = async () => {
    while (next < jobs.length) await fetchOne(jobs[next++]);
  };
  await Promise.all(Array.from({ length: concurrency }, worker));

  for (const [city, venues] of byCity) console.log(`  ${city}: ${venues.length} ${cuisineRe} venues on Foody`);
  return byCity;
}
