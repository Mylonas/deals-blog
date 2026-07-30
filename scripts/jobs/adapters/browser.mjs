// Same job as the `site` adapter, but through a real Chromium — for the handful
// of sites that refuse plain fetches: Cloudflare's challenge page (Δήμος
// Λατσιών-Γερίου) and servers that 403 anything without a browser fingerprint
// (Πανεπιστήμιο Κύπρου).
//
// One browser is shared by every source that needs it, so the cost is paid once
// per run rather than per site.

import { links, matches, DISCOVERY_LABEL_RE, VACANCY_RE } from '../lib/util.mjs';
import { extractJobs } from './site.mjs';

let browserPromise = null;

// Plain headless Chromium is fingerprinted and served the same Cloudflare
// challenge as a bare fetch, so the stealth plugin is what actually gets us in.
async function launch() {
  const { chromium } = await import('playwright-extra');
  const { default: stealth } = await import('puppeteer-extra-plugin-stealth');
  chromium.use(stealth());
  return chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
}

function getBrowser() {
  // Assigned synchronously: sources are scraped concurrently, and an `await`
  // before this assignment would let a second caller launch its own browser
  // that close() then never shuts down — leaving the process hanging on exit.
  browserPromise ??= launch();
  return browserPromise;
}

export async function close() {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = null;
  await browser.close();
}

/** Loads a URL and returns its rendered HTML, waiting out any interstitial. */
async function render(url, timeout = 45000) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    locale: 'el-GR',
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    // Cloudflare serves a challenge first and swaps in the real page a moment
    // later; a settled network is the cheapest signal that it is done.
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    if (/just a moment|attention required|checking your browser/i.test(await page.title())) {
      await page.waitForTimeout(6000);
    }
    return await page.content();
  } finally {
    await context.close();
  }
}

async function discover(homepage, timeout) {
  const html = await render(homepage, timeout);
  const candidates = links(html, homepage).filter(
    ({ href, label }) => matches(DISCOVERY_LABEL_RE, label) || (matches(VACANCY_RE, href) && label.length < 40),
  );
  const best = candidates.find(({ label }) => matches(DISCOVERY_LABEL_RE, label)) ?? candidates[0];
  return best?.href ?? null;
}

export async function scrape(source) {
  const { timeout } = source;
  const listingUrl = source.vacanciesUrl ?? (await discover(source.homepage, timeout));
  if (!listingUrl) return [];

  return extractJobs(await render(listingUrl, timeout), listingUrl);
}
