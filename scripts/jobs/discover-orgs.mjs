// Coverage gap-finder: seeds organisation discovery from the official gov.cy
// directory instead of a hand-kept list, so a body like the Digital Security
// Authority can't be silently absent just because nobody remembered it.
//
//   node scripts/jobs/discover-orgs.mjs           # human-readable gap report
//   node scripts/jobs/discover-orgs.mjs --json     # machine-readable
//
// It answers one question: which Cyprus public-sector organisations does gov.cy
// list that we do NOT already monitor? It does not wire them in — a human still
// confirms each new source's vacancy page and adapter — but it makes the gap
// impossible to overlook. gov.cy 403s datacenter IPs, so this goes through the
// same stealth browser the scraper uses for blocked sources.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { links } from './lib/util.mjs';
import { render, close } from './adapters/browser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIRECTORY_URL = 'https://www.gov.cy/en/websites/';

// The generic portal chrome on the directory page — nav, policy, account links.
// Anything at one of these gov.cy paths is the site's own furniture, not an org.
const PORTAL_CHROME_RE =
  /\/(en\/)?(cookies|services?|service|topics?|government|websites?|news|about|contact|search|cylogin|cy-login|sitemap|accessibility|privacy|terms|feedback|help)\b/i;

/** Bare registrable-ish host, www dropped — the key we match sources against. */
const host = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};

/** Every organisation link on the directory page: { name, url, host }. */
function parseDirectory(html) {
  const seen = new Map();
  for (const { href, label } of links(html, DIRECTORY_URL)) {
    const h = host(href);
    if (!h) continue;
    // Public-sector hosts only. gov.cy sub-sites live under www.gov.cy/<org>/;
    // the rest sit on their own .gov.cy / .org.cy / .ac.cy / .com.cy domains.
    const isPublic = /\.(gov|org|ac|com)\.cy$/.test(h) || h === 'gov.cy';
    if (!isPublic) continue;
    if (h === 'gov.cy' && PORTAL_CHROME_RE.test(href)) continue;
    if (!label || label.length < 3) continue;
    // Keep the longest label seen for a host — the directory sometimes links the
    // same site from a logo (no text) and a full name.
    const prev = seen.get(href);
    if (!prev || label.length > prev.name.length) seen.set(href, { name: label, url: href, host: h });
  }
  return [...seen.values()];
}

async function main() {
  const asJson = process.argv.includes('--json');
  const config = JSON.parse(await readFile(join(ROOT, 'scripts', 'jobs', 'sources.json'), 'utf8'));

  // A source is "covering" a host if either its homepage or its vacancies page
  // lives there — some sources point vacanciesUrl at a hosted ATS on another host.
  const monitored = new Set();
  for (const s of config.sources) {
    for (const u of [s.homepage, s.vacanciesUrl]) {
      const h = host(u);
      if (h) monitored.add(h);
    }
  }

  const html = await render(DIRECTORY_URL, 45000).finally(() => close());
  const orgs = parseDirectory(html);

  const covered = orgs.filter((o) => monitored.has(o.host));
  const gaps = orgs.filter((o) => !monitored.has(o.host)).sort((a, b) => a.name.localeCompare(b.name));

  if (asJson) {
    console.log(JSON.stringify({ directory: DIRECTORY_URL, listed: orgs.length, covered: covered.length, gaps }, null, 2));
    return;
  }

  console.log(`gov.cy directory: ${orgs.length} public-sector orgs found, ${covered.length} already monitored.`);
  console.log(`\n${gaps.length} listed organisations are NOT yet monitored:\n`);
  for (const o of gaps) console.log(`  • ${o.name}\n    ${o.url}`);
  console.log(
    `\nNext step for each: open its site, find the careers/προκηρύξεις section, ` +
      `add it to sources.json with the right adapter (browser if it 403s a plain fetch).`,
  );
}

main().catch((err) => {
  console.error(`discover-orgs failed: ${err.message}`);
  process.exitCode = 1;
});
