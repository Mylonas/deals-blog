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
const PARSER_VERSION = 8;

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

export async function loadCache() {
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

function parseEuro(raw) {
  const s = raw.replace(/[.,]+$/, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot > -1 && lastComma > -1) {
    if (lastDot > lastComma) return Number(s.replace(/,/g, ''));
    return Number(s.replace(/\./g, '').replace(',', '.'));
  }
  if (lastComma >= 0) {
    const afterComma = s.slice(lastComma + 1);
    if (afterComma.length === 3) return Number(s.replace(/,/g, ''));
    return Number(s.replace(',', '.'));
  }
  return Number(s.replace(/\./g, ''));
}

/**
 * Salary scale from the document text, e.g. "A2–A7", "A5", "E7–E8", or a
 * monthly euro amount like "€1,578". Patterns recognised:
 *
 *   Greek:  «Εγκεκριμένη μισθοδοτική κλίμακα: Α2 – Α5 – Α7(ii)»
 *           «Μισθολογική κλίμακα: Ε7-8»
 *           «ο μισθός θα ανέρχεται στα €1.577,80»
 *           «ο ετήσιος μισθός είναι 32.947,42 €»
 *   English: «payscale: A4/A7+4», «salary: €1,431.74»
 */
export function scaleFromText(text) {
  const n = normalise(text);

  // A/Δ/E-scale tokens: Α2, A5, Δ5, D6, E7, Ε8 — Greek or Latin letter.
  // Also matches «E7-8» where the second number inherits the letter.
  const SCALE_RE = /(?<=[^a-zα-ω0-9])([αaδdεe])\s?(\d{1,2})(?:\s*[-–/]\s*(\d{1,2}))?(?=[^a-zα-ω0-9]|$)/g;
  const scaleNear = (slice) => {
    const hits = [];
    for (const m of slice.matchAll(SCALE_RE)) {
      const letter = m[1].toLowerCase();
      const prefix = 'αa'.includes(letter) ? 'A' : 'δd'.includes(letter) ? 'D' : 'E';
      const num = Number(m[2]);
      if (num >= 1 && num <= 16) hits.push({ prefix, num });
      if (m[3]) {
        const num2 = Number(m[3]);
        if (num2 >= 1 && num2 <= 16) hits.push({ prefix, num: num2 });
      }
    }
    return hits;
  };

  // Look near scale cue words — Greek «κλίμακα» and English «payscale»
  // Skip boilerplate «μειωμένη κλίμακα εισδοχής» which is a generic clause.
  const CUE_RE = /κλιμακ|payscale|pay\s*scale|salary\s*scale/g;
  for (const cue of n.matchAll(CUE_RE)) {
    const before = n.slice(Math.max(0, cue.index - 30), cue.index);
    if (/μειωμεν|reduced/i.test(before)) continue;
    const window = n.slice(cue.index, cue.index + 200);
    if (/μειωμεν\S*\s+κλιμακ/.test(window.slice(0, 30))) continue;
    const hits = scaleNear(window);
    if (hits.length === 0) continue;
    const prefix = hits[0].prefix;
    const nums = [...new Set(hits.filter((h) => h.prefix === prefix).map((h) => h.num))].sort((a, b) => a - b);
    if (nums.length === 1) return `${prefix}${nums[0]}`;
    return `${prefix}${nums[0]}–${prefix}${nums[nums.length - 1]}`;
  }

  // Euro salary — monthly or annual. Handles both «€1.577,80» and «32.947,42 €»
  // and English-style «€1,431.74» or «salary range €18,000 – €23,000».
  const SALARY_CUES = [
    /μισθ\S{0,20}\s.{0,60}?€\s?([\d.,]+)/,
    /μισθ\S{0,20}\s.{0,60}?([\d.,]+)\s*€/,
    /(?:salary|gross|remuneration|compensation).{0,60}?(?:&euro;|€)\s?([\d.,]+)(?:\s*[-–]\s*(?:&euro;|€)\s?([\d.,]+))?/,
  ];
  const fmtSalary = (num) => {
    if (num >= 500 && num <= 15000) return `€${num.toLocaleString('en')}`;
    if (num >= 15001 && num <= 200000) return `€${Math.round(num / 13).toLocaleString('en')}/μ`;
    return null;
  };
  for (const re of SALARY_CUES) {
    const sal = re.exec(n);
    if (!sal) continue;
    const lo = Math.round(parseEuro(sal[1]));
    const loFmt = fmtSalary(lo);
    if (!loFmt) continue;
    if (sal[2]) {
      const hi = Math.round(parseEuro(sal[2]));
      const hiFmt = fmtSalary(hi);
      if (hiFmt) return `${loFmt}–${hiFmt}`;
    }
    return loFmt;
  }

  return null;
}

/** Deadline and scale for one PDF, cached permanently on success. */
export async function enrichFromPdf(url, { timeout = 45000 } = {}) {
  const store = await loadCache();
  const hit = store[url];
  if (hit?.version === PARSER_VERSION) {
    if (hit.deadline || hit.scale) return { deadline: hit.deadline ?? null, scale: hit.scale ?? null };
    if (!isStale(hit)) return { deadline: null, scale: null };
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

    const text = await extractText(bytes);
    Object.assign(entry, deadlineFromText(text));
    entry.scale = scaleFromText(text) ?? undefined;
  } catch (err) {
    entry.error = err.message;
  }

  store[url] = entry;
  return { deadline: entry.deadline ?? null, scale: entry.scale ?? null };
}

/** Closing date for one PDF, or null. Cached permanently on success. */
export async function deadlineFromPdf(url, opts) {
  return (await enrichFromPdf(url, opts)).deadline;
}

function isStale(entry) {
  if (!entry.checkedAt) return true;
  const age = (Date.now() - Date.parse(entry.checkedAt)) / 86400000;
  return age > RETRY_FAILED_AFTER_DAYS;
}
