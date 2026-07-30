// WordPress sites — most municipalities run one, so the REST API gives us
// structured items without guessing at markup. Custom post types are common
// (ΟΚΥπΥ publishes a "job-position" type), so we search every public type that
// looks vacancy-related, then fall back to keyword search over posts and pages.

import { get, text, findDate, matches, VACANCY_RE } from '../lib/util.mjs';
import { scrape as scrapeSite } from './site.mjs';

const KEYWORDS = ['κενές θέσεις', 'θέσεις εργασίας', 'προκήρυξη', 'πρόσληψη'];
const JOB_TYPE_RE = /(job|vacanc|career|thesi|ergasia|prokirix)/i;

async function types(base, timeout) {
  try {
    const data = await get(new URL('/wp-json/wp/v2/types', base).href, { json: true, timeout });
    return Object.values(data)
      .filter((t) => t.rest_base && (JOB_TYPE_RE.test(t.slug ?? '') || JOB_TYPE_RE.test(t.rest_base)))
      .map((t) => t.rest_base);
  } catch {
    return [];
  }
}

async function query(base, restBase, params, timeout) {
  const url = new URL(`/wp-json/wp/v2/${restBase}`, base);
  url.searchParams.set('per_page', '30');
  url.searchParams.set('_fields', 'link,title,date,excerpt');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const items = await get(url.href, { json: true, timeout });
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

/**
 * Fills in `published` for jobs that came off a scraped page rather than the
 * REST API, by looking each post up by slug. Without a date, an archived
 * notice is indistinguishable from a current one and never expires — which is
 * exactly how the district organisations reported dozens of closed posts.
 */
async function withPublishedDates(jobs, base, timeout) {
  const pending = jobs.filter((job) => !job.published && !/\.pdf(\?|$)/i.test(job.url));
  if (pending.length === 0) return jobs;

  const bySlug = new Map();
  for (const job of pending) {
    const slug = job.url.replace(/\/$/, '').split('/').pop();
    if (slug) bySlug.set(decodeURIComponent(slug), job);
  }

  // WP caps per_page at 100 and the query string at a sane length, so chunk it.
  const slugs = [...bySlug.keys()];
  for (let i = 0; i < slugs.length; i += 20) {
    const chunk = slugs.slice(i, i + 20);
    const url = new URL('/wp-json/wp/v2/posts', base);
    for (const slug of chunk) url.searchParams.append('slug', slug);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('_fields', 'slug,date');
    try {
      const items = await get(url.href, { json: true, timeout });
      for (const item of Array.isArray(items) ? items : []) {
        const job = bySlug.get(item.slug);
        if (job && item.date) job.published = item.date.slice(0, 10);
      }
    } catch {
      // Not every WP site exposes posts publicly; leaving the date null just
      // means these fall back to being treated as current.
    }
  }

  return jobs;
}

export async function scrape(source) {
  const base = source.homepage;
  const { timeout } = source;
  const found = new Map();

  const add = (item, { requireMatch }) => {
    const title = text(item.title?.rendered ?? '');
    if (!title || (requireMatch && !matches(VACANCY_RE, title))) return;
    found.set(item.link, {
      title,
      url: item.link,
      published: item.date ? item.date.slice(0, 10) : null,
      deadline: findDate(text(item.excerpt?.rendered ?? '')),
      reference: null,
    });
  };

  // Dedicated job post types: every entry counts, no keyword filter needed.
  for (const restBase of await types(base, timeout)) {
    for (const item of await query(base, restBase, {}, timeout)) add(item, { requireMatch: false });
  }

  // Otherwise keyword-search the ordinary content.
  for (const keyword of KEYWORDS) {
    for (const restBase of ['posts', 'pages']) {
      for (const item of await query(base, restBase, { search: keyword }, timeout)) add(item, { requireMatch: true });
    }
  }

  // Always scan the vacancies page as well. Notices attached as PDFs are
  // invisible to the REST API, and gating this on "REST found nothing" hid
  // ΚΟΑ's open posts behind an unrelated page that happened to match a keyword.
  try {
    for (const job of await scrapeSite(source)) found.set(job.url, job);
  } catch {
    // A missing vacancies page is not fatal when REST already returned posts.
  }

  return withPublishedDates([...found.values()], base, timeout);
}
