// Explains what a source actually returned — for telling "this employer has no
// openings right now" apart from "the adapter is missing them".
//
//   node scripts/jobs/diagnose.mjs dimos-aradippou cysec
//   node scripts/jobs/diagnose.mjs --zero      # every source that yielded nothing

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { get, links, text, matches, fold, VACANCY_RE, NOT_A_JOB_RE, NAV_LABEL_RE, DISCOVERY_LABEL_RE, DOCUMENT_RE } from './lib/util.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function report(source) {
  console.log(`\n=== ${source.id} — ${source.name} (${source.adapter})`);
  const base = source.homepage ?? source.url;

  let listingUrl = source.vacanciesUrl ?? null;
  let html;
  try {
    if (!listingUrl) {
      const homeHtml = await get(base, { timeout: source.timeout });
      const nav = links(homeHtml, base).filter(
        ({ href, label }) => matches(DISCOVERY_LABEL_RE, label) || (matches(VACANCY_RE, href) && label.length < 40),
      );
      console.log(`  nav candidates: ${nav.slice(0, 4).map((n) => `"${n.label}" -> ${n.href}`).join(' | ') || 'NONE'}`);
      listingUrl = (nav.find((n) => matches(DISCOVERY_LABEL_RE, n.label)) ?? nav[0])?.href;
      if (!listingUrl) {
        console.log('  → no vacancies page found from the homepage');
        return;
      }
    }
    console.log(`  listing: ${listingUrl}`);
    html = await get(listingUrl, { timeout: source.timeout });
  } catch (err) {
    console.log(`  ✗ fetch failed: ${err.message}`);
    return;
  }

  const all = links(html, listingUrl);
  const matched = all.filter(({ href, label }) => matches(VACANCY_RE, label) || matches(VACANCY_RE, decodeURIComponent(href)));
  console.log(`  ${all.length} links, ${matched.length} vacancy-shaped`);
  for (const { href, label } of matched.slice(0, 12)) {
    const why = matches(NAV_LABEL_RE, label)
      ? 'DROPPED nav'
      : matches(NOT_A_JOB_RE, label)
        ? 'DROPPED not-a-job'
        : label.length < 10 && !/\.pdf/i.test(href)
          ? 'DROPPED too short'
          : 'kept';
    console.log(`    [${why}] ${label.slice(0, 80) || '(no label)'} -> ${href.slice(0, 90)}`);
  }

  // A page that mentions vacancies in prose but exposes no links usually means
  // the notices are inline text or an embedded viewer.
  if (matched.length === 0) {
    const body = text(html);
    const hit = fold(body).search(VACANCY_RE);
    console.log(hit === -1 ? '  → page never mentions vacancies' : `  → mentions but does not link: …${body.slice(Math.max(0, hit - 60), hit + 120)}…`);
  }
}

const config = JSON.parse(await readFile(join(ROOT, 'scripts', 'jobs', 'sources.json'), 'utf8'));
let ids = process.argv.slice(2);
if (ids.includes('--zero')) {
  const data = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'public-jobs.json'), 'utf8'));
  ids = data.sources.filter((s) => !s.error && s.count === 0).map((s) => s.id);
}
for (const id of ids) {
  const source = config.sources.find((s) => s.id === id);
  if (!source) console.log(`unknown source: ${id}`);
  else await report(source);
}
