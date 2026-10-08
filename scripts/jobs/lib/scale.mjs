// Fetch the detail page of each job and extract the salary scale.
//
// PDF jobs are handled by pdf.mjs (enrichFromPdf). This module covers
// HTML job pages: municipality WordPress posts, semi-government sites, etc.
//
// Results are cached in the same pdf-cache.json: the key is the URL, and HTML
// pages have distinct URLs from PDFs, so they coexist without collision.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { get, fold } from './util.mjs';
import { scaleFromText, enrichFromPdf, saveCache } from './pdf.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CACHE_FILE = join(ROOT, 'src', 'data', 'public-jobs-pdf-cache.json');
const CACHE_VERSION = 1;
const RETRY_AFTER_DAYS = 14;

let cache = null;

async function loadCache() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(CACHE_FILE, 'utf8'));
  } catch {
    cache = {};
  }
  return cache;
}

function isStale(entry) {
  if (!entry.checkedAt) return true;
  const age = (Date.now() - Date.parse(entry.checkedAt)) / 86400000;
  return age > RETRY_AFTER_DAYS;
}

async function scaleFromPage(url, timeout) {
  const store = await loadCache();
  const key = `scale:${url}`;
  const hit = store[key];
  if (hit?.version === CACHE_VERSION) {
    if (hit.scale) return hit.scale;
    if (!isStale(hit)) return null;
  }

  const entry = { version: CACHE_VERSION, checkedAt: new Date().toISOString().slice(0, 10) };
  try {
    const html = await get(url, { timeout });
    const body = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
    const text = body.replace(/<[^>]+>/g, ' ');
    entry.scale = scaleFromText(text) ?? undefined;
  } catch (err) {
    entry.error = err.message;
  }

  store[key] = entry;
  return entry.scale ?? null;
}

/**
 * Enrich every job with a `scale` field extracted from its detail page.
 * PDF jobs go through enrichFromPdf (which already caches); HTML jobs get
 * their own fetch-and-cache cycle.
 */
export async function addScaleData(jobs) {
  const isPdf = (url) => /\.pdf(\?|$)/i.test(url);
  let found = 0;
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(4, jobs.length) }, async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        if (job.scale) continue;

        let scale = null;
        if (isPdf(job.url)) {
          const result = await enrichFromPdf(job.url);
          scale = result.scale;
          if (result.deadline && !job.deadline) {
            job.deadline = result.deadline;
            job.deadlineFrom = 'pdf';
          }
        } else {
          scale = await scaleFromPage(job.url, 30000);
        }

        if (scale) {
          job.scale = scale;
          found++;
        }
      }
    }),
  );

  await saveCache();
  return { checked: jobs.length, found };
}
