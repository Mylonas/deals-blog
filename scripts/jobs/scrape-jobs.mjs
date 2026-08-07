// Runs every configured source, merges the results into one dataset and
// reports what is new since the last run.
//
//   npm run jobs                # all sources, human-readable report
//   npm run jobs -- --json    # same run, JSON diff on stdout
//   npm run jobs -- --only psc,dimos-lemesou

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { matches, fold, DOCUMENT_RE, NOT_A_JOB_RE } from './lib/util.mjs';
import { resolveLocations } from './lib/location.mjs';
import { deadlineFromPdf, saveCache } from './lib/pdf.mjs';
import * as psc from './adapters/psc.mjs';
import * as wp from './adapters/wp.mjs';
import * as site from './adapters/site.mjs';
import * as browser from './adapters/browser.mjs';
import * as exelsys from './adapters/exelsys.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = join(ROOT, 'src', 'data');
const JOBS_FILE = join(DATA_DIR, 'public-jobs.json');
const SEEN_FILE = join(DATA_DIR, 'public-jobs-seen.json');

const ADAPTERS = { psc: psc.scrape, wp: wp.scrape, site: site.scrape, browser: browser.scrape, exelsys: exelsys.scrape };
const CONCURRENCY = 6;

// Municipality news feeds keep vacancy posts online for years. Without an
// explicit deadline we treat anything older than this as long closed.
const MAX_AGE_DAYS = 150;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * One posting often surfaces twice for the same employer — once as a WordPress
 * post and again as the PDF attached to it, or re-published under a new
 * permalink. Keep the best-dated copy of each title per employer.
 */
function dedupe(jobs) {
  const best = new Map();
  for (const job of jobs) {
    const key = `${job.sourceId}|${fold(job.title)}`;
    const rival = best.get(key);
    if (!rival || (job.deadline ?? job.published ?? '') > (rival.deadline ?? rival.published ?? '')) {
      best.set(key, job);
    }
  }
  return [...best.values()];
}

/**
 * Reads the closing date out of every PDF notice that has not already stated
 * one in its link text. Cached, so this is a one-off cost per notice.
 */
async function addPdfDeadlines(jobs, { skip }) {
  const pending = jobs.filter((job) => !job.deadline && /\.pdf(\?|$)/i.test(job.url));
  if (skip || pending.length === 0) return { checked: 0, found: 0 };

  let found = 0;
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, pending.length) }, async () => {
      while (next < pending.length) {
        const job = pending[next++];
        const deadline = await deadlineFromPdf(job.url);
        if (deadline) {
          job.deadline = deadline;
          job.deadlineFrom = 'pdf';
          found++;
        }
      }
    }),
  );
  await saveCache();
  return { checked: pending.length, found };
}

function isOpen(job, maxAgeDays) {
  if (matches(NOT_A_JOB_RE, job.title)) return false;
  if (job.deadline) return job.deadline >= today();
  if (!job.published) return true; // dedicated vacancies page — assume current
  const age = (Date.now() - Date.parse(job.published)) / 86400000;
  return age <= maxAgeDays;
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
}

const jobId = (sourceId, url) => createHash('sha1').update(`${sourceId}|${url}`).digest('hex').slice(0, 12);

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function runPool(items, worker) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) results.push(await worker(items[next++]));
    }),
  );
  return results;
}

async function scrapeSource(source) {
  const scrape = ADAPTERS[source.adapter];
  if (!scrape) return { source, error: `unknown adapter "${source.adapter}"`, jobs: [] };
  try {
    // Locations are resolved here, where `source` is still in scope: the
    // fallback pin is its district seat, and only sources.json knows that.
    // Resolution reads the title and employer, so it has to run on the merged
    // row rather than the raw scraped one.
    const jobs = (await scrape(source)).map((job) => {
      const row = {
        id: jobId(source.id, job.url),
        sourceId: source.id,
        employer: source.name,
        sector: source.sector,
        district: source.district,
        ...job,
      };
      return { ...row, ...resolveLocations(row, source) };
    });
    return { source, error: null, jobs };
  } catch (err) {
    return { source, error: err.message, jobs: [] };
  }
}

async function main() {
  const asJson = process.argv.includes('--json');
  const only = arg('only')?.split(',').map((s) => s.trim());
  const maxAgeDays = Number(arg('max-age') ?? MAX_AGE_DAYS);
  const keepAll = process.argv.includes('--all'); // skip the freshness filter

  const config = JSON.parse(await readFile(join(ROOT, 'scripts', 'jobs', 'sources.json'), 'utf8'));
  const sources = config.sources.filter((s) => !only || only.includes(s.id));

  const results = await runPool(sources, scrapeSource).finally(() => browser.close());
  const merged = dedupe(results.flatMap((r) => r.jobs));
  const pdfStats = await addPdfDeadlines(merged, { skip: process.argv.includes('--no-pdf') });

  const jobs = merged
    .filter((job) => keepAll || isOpen(job, maxAgeDays))
    .sort((a, b) => a.employer.localeCompare(b.employer, 'el') || a.title.localeCompare(b.title, 'el'));
  const failures = results.filter((r) => r.error);
  const kept = new Map(results.map((r) => [r.source.id, jobs.filter((job) => job.sourceId === r.source.id).length]));

  const seen = await readJson(SEEN_FILE, {});
  const fetchedAt = new Date().toISOString();
  const added = jobs.filter((job) => !seen[job.id]);

  for (const job of added) {
    seen[job.id] = { firstSeen: fetchedAt, sourceId: job.sourceId, employer: job.employer, title: job.title, url: job.url };
  }
  // Only expire entries whose source answered this run — a site that was down
  // must not look like it closed all of its vacancies.
  const liveSources = new Set(results.filter((r) => !r.error).map((r) => r.source.id));
  const live = new Set(jobs.map((job) => job.id));
  const closed = Object.entries(seen).filter(
    ([id, entry]) => !entry.closed && !live.has(id) && liveSources.has(entry.sourceId),
  );
  for (const [id] of closed) seen[id].closed = fetchedAt;

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    JOBS_FILE,
    JSON.stringify(
      {
        fetchedAt,
        count: jobs.length,
        sources: results.map((r) => ({ id: r.source.id, name: r.source.name, count: kept.get(r.source.id) ?? 0, error: r.error })),
        jobs,
      },
      null,
      2,
    ) + '\n',
  );
  await writeFile(SEEN_FILE, JSON.stringify(seen, null, 2) + '\n');

  if (asJson) {
    console.log(JSON.stringify({ fetchedAt, count: jobs.length, added, failures: failures.map((f) => ({ id: f.source.id, error: f.error })) }, null, 2));
    return;
  }

  console.log(`Cyprus public-sector openings: ${jobs.length} across ${sources.length - failures.length}/${sources.length} sources`);
  if (pdfStats.checked > 0) {
    console.log(`(read ${pdfStats.found} closing dates out of ${pdfStats.checked} PDF notices)`);
  }
  for (const { source } of results
    .filter((r) => kept.get(r.source.id) > 0)
    .sort((a, b) => kept.get(b.source.id) - kept.get(a.source.id))) {
    console.log(`  ${String(kept.get(source.id)).padStart(3)}  ${source.name}`);
  }
  if (added.length > 0) {
    console.log(`\n${added.length} new since last run:`);
    for (const job of added) console.log(`  • [${job.employer}] ${job.title}${job.deadline ? ` — έως ${job.deadline}` : ''}\n    ${job.url}`);
  } else {
    console.log('\nNothing new since the last run.');
  }
  if (failures.length > 0) {
    console.log(`\n${failures.length} source(s) failed:`);
    for (const f of failures) console.log(`  ✗ ${f.source.name}: ${f.error}`);
  }
}

main().catch((err) => {
  console.error(`scrape-all failed: ${err.message}`);
  process.exitCode = 1;
});
