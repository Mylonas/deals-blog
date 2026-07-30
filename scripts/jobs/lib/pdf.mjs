// Most notices state their closing date only inside the PDF. Without it a
// posting has no deadline at all and survives purely on the freshness window,
// which is why closed competitions linger. This pulls the date out.
//
// Results are cached in data/pdf-cache.json: a published notice never changes,
// so each PDF is fetched exactly once.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fold, findDate } from './util.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CACHE_FILE = join(ROOT, 'src', 'data', 'public-jobs-pdf-cache.json');

// Bump when the extraction logic changes: a cached "no deadline found" is a
// verdict from a particular parser, and stale nulls silently outlive the fix.
// (Raising this to 2 recovered every notice, after v1 read only 3 pages.)
const PARSER_VERSION = 5;

const MAX_BYTES = 12 * 1024 * 1024;
// The closing date is usually near the end, after the duties and qualifications
// — a 5-page notice can carry it on page 4. Read the lot, within reason.
const MAX_PAGES = 15;
const RETRY_FAILED_AFTER_DAYS = 14;

// Wording that introduces a closing date. «μέχρι» alone is the common one;
// the rest cover the more formal phrasings.
const DEADLINE_CUE_RE =
  /(μεχρι|προθεσμ|τελευταια\s+ημερομηνια|το\s+αργοτερο|ληγει|υποβαλλονται|υποβολη[ς]?\s+αιτησ|deadline|no\s+later\s+than|submitted\s+by)/g;

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

export async function saveCache() {
  if (!cache) return;
  await mkdir(dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n');
}

async function extractText(bytes) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // destroy() lives on the loading task, not the document — releasing it keeps
  // the worker from piling up across a few hundred notices.
  const task = getDocument({ data: bytes, verbosity: 0 });
  try {
    const doc = await task.promise;
    const pages = [];
    for (let p = 1; p <= Math.min(doc.numPages, MAX_PAGES); p++) {
      const content = await (await doc.getPage(p)).getTextContent();
      pages.push(content.items.map((i) => i.str).join(' '));
    }
    return pages.join('\n');
  } finally {
    await task.destroy();
  }
}

/**
 * pdf.js emits text run by run, so a date can arrive as «1 4 Αυγούστου 202 6».
 * Closing the gaps between digits is what makes those parseable.
 */
function normalise(text) {
  return fold(text).replace(/\s+/g, ' ').replace(/(\d)\s+(?=\d)/g, '$1');
}

/** Every full date in the text, in order. */
function allDates(normalised) {
  const dates = new Set();
  for (let i = 0; i < normalised.length; i += 40) {
    const date = findDate(normalised.slice(i, i + 220));
    if (date) dates.add(date);
  }
  return [...dates].sort();
}

/**
 * The closing date, plus how confident we are in it:
 *   'cue'      — stated next to «μέχρι», «προθεσμία» and friends. Trustworthy.
 *   'fallback' — no cue anywhere, so the latest date in the document. Short
 *                one-page notices from the smaller municipalities carry exactly
 *                one date and no cue wording at all.
 * Returns { deadline: null, reason } when there is nothing to read.
 */
export function deadlineFromText(text) {
  const normalised = normalise(text);
  if (normalised.trim().length < 50) {
    return { deadline: null, reason: 'no text layer (scanned image)' };
  }

  const cued = [];
  for (const cue of normalised.matchAll(DEADLINE_CUE_RE)) {
    // Generous: «Προθεσμία υποβολής αιτήσεων: στα κεντρικά γραφεία της Αρχής,
    // μέχρι τις 12:00 το μεσημέρι της Παρασκευής, 8 Αυγούστου 2026» puts a lot
    // of address and time between the cue and the date.
    const date = findDate(normalised.slice(cue.index, cue.index + 300));
    if (date) cued.push(date);
  }

  // A notice mentions other dates (when the post falls vacant, when the law was
  // passed). Taking the latest cue-adjacent one is the safe read: erring late
  // keeps a job listed a little too long rather than hiding an open one.
  if (cued.length > 0) return { deadline: cued.sort().pop(), basis: 'cue' };

  // Without a cue the latest date is a guess, so only accept a plausible one.
  // An old date here is far more likely to be a law year or an establishment
  // date than a deadline, and acting on it would hide a job that is still open.
  const dates = allDates(normalised);
  const latest = dates.pop();
  if (latest) {
    const ageDays = (Date.now() - Date.parse(latest)) / 86400000;
    if (ageDays < 400) return { deadline: latest, basis: 'fallback' };
    return { deadline: null, reason: `only implausible dates (latest ${latest})` };
  }

  return { deadline: null, reason: 'no date in document' };
}

/** Closing date for one PDF, or null. Cached permanently on success. */
export async function deadlineFromPdf(url, { timeout = 45000 } = {}) {
  const store = await loadCache();
  const hit = store[url];
  if (hit?.version === PARSER_VERSION) {
    // A found date is final — the PDF will not change. A miss or an error is
    // only trusted for a while, in case the site was down or the parser improves.
    if (hit.deadline) return hit.deadline;
    if (!isStale(hit)) return null;
  }

  const entry = { version: PARSER_VERSION, checkedAt: new Date().toISOString().slice(0, 10) };
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36' },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > MAX_BYTES) throw new Error(`too large (${bytes.length} bytes)`);

    Object.assign(entry, deadlineFromText(await extractText(bytes)));
  } catch (err) {
    entry.error = err.message;
  }

  store[url] = entry;
  return entry.deadline ?? null;
}

function isStale(entry) {
  if (!entry.checkedAt) return true;
  const age = (Date.now() - Date.parse(entry.checkedAt)) / 86400000;
  return age > RETRY_FAILED_AFTER_DAYS;
}
