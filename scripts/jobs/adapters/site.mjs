// Generic adapter for the hand-built sites: find the "Κενές Θέσεις" page from
// the homepage navigation (unless config already names it), then treat the
// vacancy-shaped links on that page as the openings.
//
// It is deliberately loose — these sites are rebuilt often and a keyword scan
// survives a redesign where a CSS selector would not.

import {
  get,
  links,
  findDate,
  matches,
  fold,
  VACANCY_RE,
  NAV_LABEL_RE,
  DISCOVERY_LABEL_RE,
  GENERIC_LINK_RE,
  DOCUMENT_RE,
  dateFromUrlPath,
  titleFromPdfUrl,
} from '../lib/util.mjs';

async function discover(homepage, timeout) {
  const html = await get(homepage, { timeout });
  const candidates = links(html, homepage).filter(
    ({ href, label }) => matches(DISCOVERY_LABEL_RE, label) || (matches(VACANCY_RE, href) && label.length < 40),
  );
  // Prefer a real navigation label over a URL-only guess.
  const best = candidates.find(({ label }) => matches(DISCOVERY_LABEL_RE, label)) ?? candidates[0];
  return best?.href ?? null;
}

/** True when href is a page of this site in its own right, not the listing itself. */
function isOwnPage(href, listingUrl) {
  try {
    const link = new URL(href);
    const listing = new URL(listingUrl);
    // `www.` is dropped on both sides: ΑΡΚ serves its pages from www but links
    // its own notices at the bare domain, which is still the same site.
    const host = (url) => url.hostname.replace(/^www\./, '');
    return host(link) === host(listing) && link.pathname !== listing.pathname;
  } catch {
    return false;
  }
}

/** Shared by both page-scanning adapters: vacancy-shaped links on a listing page. */
export function extractJobs(html, listingUrl) {
  const found = new Map();

  for (const { href, label } of links(html, listingUrl)) {
    if (href === listingUrl) continue;
    if (matches(NAV_LABEL_RE, label)) continue; // menu entry, not an opening
    const isDoc = DOCUMENT_RE.test(href);
    // Separators become spaces before matching: a slug reads «κενες-θεσεις-…»,
    // and every pattern here is written with whitespace between the words.
    const hrefText = decodeURIComponent(href).replace(/[-_+]+/g, ' ');
    // A notice linked from an image or a bare anchor carries no label at all —
    // Αρχή Ραδιοτηλεόρασης publishes every one of them that way. The URL still
    // names the post, so fall back to it rather than dropping the opening.
    // Confined to same-host links at a path of their own: without that, every
    // «#top» anchor and every share-widget link on a page called /vacancies/
    // matches the vacancy wording in the address it is decorating.
    const namedByUrl =
      matches(GENERIC_LINK_RE, label) && matches(VACANCY_RE, hrefText) && isOwnPage(href, listingUrl);
    if (!matches(VACANCY_RE, label) && !((isDoc || namedByUrl) && matches(VACANCY_RE, hrefText))) continue;
    if (!isDoc && !namedByUrl && label.length < 10) continue;

    // «Download» tells the reader nothing; the filename usually carries the post.
    const title = (isDoc || namedByUrl) && matches(GENERIC_LINK_RE, label) ? titleFromPdfUrl(href) : label;
    if (!title || (namedByUrl && title.length < 10)) continue;

    found.set(href, {
      title,
      url: href,
      published: dateFromUrlPath(href),
      // Only ever from the link text. A URL like «…/Theseis Ergasias/2026/03-2026.pdf»
      // reads as 26/03/2026 to any date regex, which silently expired every ΡΑΕΚ post.
      deadline: findDate(label),
      reference: null,
    });
  }

  // ΡΑΕΚ labels every notice «Προκήρυξη θέσης»; three identical rows are useless
  // to read. Where a label repeats, fold in the filename to tell them apart —
  // unless the filename is an opaque hash, or already part of the title.
  const jobs = [...found.values()];
  const counts = new Map();
  for (const job of jobs) counts.set(job.title, (counts.get(job.title) ?? 0) + 1);
  for (const job of jobs) {
    if (counts.get(job.title) === 1 || !DOCUMENT_RE.test(job.url)) continue;
    const stem = titleFromPdfUrl(job.url);
    if (/^[0-9a-f]+$/i.test(stem) || fold(job.title).includes(fold(stem))) continue;
    job.title = `${job.title} — ${stem}`;
  }

  return jobs;
}

export async function scrape(source) {
  const { timeout } = source;
  const listingUrl = source.vacanciesUrl ?? (await discover(source.homepage, timeout));
  if (!listingUrl) return [];

  return extractJobs(await get(listingUrl, { timeout }), listingUrl);
}
