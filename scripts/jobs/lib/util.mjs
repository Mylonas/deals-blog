// Shared fetch + HTML helpers. Everything here is plain Node — none of the
// public-sector sites need a real browser, they are all server-rendered.

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'el,en;q=0.8',
};

// Small government hosts drop connections and time out fairly often; a single
// blip should not read as "this employer has no vacancies today".
export async function get(url, { timeout = 45000, json = false, attempts = 3 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(timeout) });
      // Retrying a 404/410 just wastes time — only transient statuses are worth it.
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        if (res.status < 500 && res.status !== 429) throw Object.assign(err, { fatal: true });
        throw err;
      }
      return json ? res.json() : res.text();
    } catch (err) {
      if (err.fatal) throw err;
      lastError = err;
      if (attempt < attempts) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastError;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»' };

export function decode(html) {
  return html
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp|laquo|raquo);/g, (m, name) => ENTITIES[name] ?? m);
}

/**
 * Lowercase and strip diacritics. Greek sites write headings in caps, and
 * uppercasing Greek drops the accents — «Θέσεις Εργασίας» becomes «ΘΕΣΕΙΣ
 * ΕΡΓΑΣΙΑΣ», which no accented pattern matches however case-insensitive it is.
 * Every pattern below is written accent-free and tested against this.
 */
export function fold(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Tests one of the patterns below against accent-folded text. */
export const matches = (re, value) => re.test(fold(value));

export function text(html) {
  return decode(String(html).replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

/** Every <a> on the page as { href, label }, with scripts and styles stripped first. */
export function links(html, baseUrl) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const out = [];
  for (const m of clean.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = text(m[2]);
    let href;
    try {
      href = new URL(decode(m[1]), baseUrl).href;
    } catch {
      continue;
    }
    if (/^(javascript|mailto|tel):/i.test(href)) continue;
    out.push({ href, label });
  }
  return out;
}

// Greek month names in the genitive, as they appear in «μέχρι τις 20 Φεβρουαρίου 2026».
// Accent-free: findDate folds its input first.
const GREEK_MONTHS = [
  'ιανουαρ', 'φεβρουαρ', 'μαρτ', 'απριλ', 'μα[ιϊ]', 'ιουν', 'ιουλ', 'αυγουστ',
  'σεπτεμβρ', 'οκτωβρ', 'νοεμβρ', 'δεκεμβρ',
];
// Tolerates the ordinal suffix and stray punctuation that notices use:
// «14 Αυγούστου 2026», «την 31 η Αυγούστου , 2026», «1ης Σεπτεμβρίου 2026».
const GREEK_DATE_RE = new RegExp(
  `(\\d{1,2})\\s*(?:η[ςν]?|ον|ου)?\\s+(${GREEK_MONTHS.join('|')})\\S*\\s*,?\\s*(\\d{4})`,
);

/** A date anywhere in a string -> yyyy-mm-dd. Handles dd/mm/yyyy and Greek long form. */
export function findDate(value) {
  const str = fold(value);

  const numeric = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(str);
  if (numeric) {
    const [, d, mo, y] = numeric;
    if (Number(d) <= 31 && Number(mo) <= 12) {
      return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  const greek = GREEK_DATE_RE.exec(str);
  if (greek) {
    const [, d, monthWord, y] = greek;
    const month = GREEK_MONTHS.findIndex((m) => new RegExp(`^${m}`).test(monthWord)) + 1;
    if (month > 0) return `${y}-${String(month).padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

// Vacancy wording used across Greek-language public-sector sites, plus the
// English equivalents the universities and semi-government bodies use.
// προκ[ηυ]ρ[υη]ξ also catches the common misspelling «προκύρηξη».
export const VACANCY_RE =
  /(κεν[εη]ς?\s*θεσ|θεσ(?:η|εις|εων)\s+εργασ|προκ[ηυ]ρ[υη]ξ|προσληψ|στελεχωσ|ωρομισθ|vacanc|job\s+(?:opening|position)|recruitment|careers?)/;

// The same vocabulary covers procurement, scholarships and grant schemes —
// «προκήρυξη διαγωνισμού» is a tender, not a job. Drop those outright.
export const NOT_A_JOB_RE = new RegExp(
  [
    // procurement, grants, scholarships — same «προκήρυξη» wording, different thing
    'διαγωνισμ', 'προσφορα', 'προσφορων', 'υποτροφ', 'στεγαστικ',
    'σχεδιο\\s+(?:χορηγι|παροχ|αναζωογ)', 'υποβολης\\s+προτασεων',
    'tender', 'procurement', 'scholarship',
    // outcomes of a past competition, not an opening
    'αποτελεσματα', 'καταλογος\\s+επιτυχοντων', 'επιτυχοντ',
    // the exam/interview machinery around a competition that has already closed
    'γραπτ[ηες]+\\s+εξετασ', 'τεστ\\s+ικανοτητ', 'προφορικ[ηες]+\\s+εξετασ',
    'ολοκληρωμενες\\s+προκηρυξεις',
    // paperwork attached to a posting: the application form, the terms annex
    // separators are flexible: these often arrive as a filename, «ΠΛΑΙΣΙΟ-ΓΙΑ-ΠΡΟΣΛΗΨΗ-….pdf»
    '^αιτηση', 'εντυπο[\\s-]+αιτησ', '^παραρτημα', '^οδηγιες', 'πλαισιο[\\s-]+για[\\s-]+προσληψη',
    // union/party notices that mention θέσεις εργασίας in passing
    'συνδιασκεψ', 'συνεδρι', 'συντεχν',
  ].join('|'),
);

// Link text that says nothing about the job — the notice is the document behind it.
export const GENERIC_LINK_RE = /^(download|ληψη|pdf|εδω|here|click here|\d+|)$/;

/** Notices are published as files at least as often as as web pages. */
export const DOCUMENT_RE = /\.(pdf|docx?|xlsx?)(\?|$)/i;

/**
 * Dates a notice from its URL, which is often the only date available — and an
 * undated notice never expires. Two shapes carry one: WordPress uploads at
 * /wp-content/uploads/YYYY/MM/, and dated permalinks at /YYYY/MM/DD/.
 * A month-only match is conservatively taken as the first of the month.
 */
export function dateFromUrlPath(href) {
  const permalink = /\/(20\d{2})\/(\d{2})\/(\d{2})\//.exec(href);
  if (permalink) return `${permalink[1]}-${permalink[2]}-${permalink[3]}`;

  const upload = /\/uploads\/(20\d{2})\/(\d{2})\//.exec(href);
  return upload ? `${upload[1]}-${upload[2]}-01` : null;
}

/** A usable title for a document link whose label is generic: the filename, cleaned up. */
export function titleFromPdfUrl(href) {
  const file = decodeURIComponent(href.split('/').pop().split('?')[0]);
  return file
    .replace(/\.[a-z0-9]{2,4}$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Labels that name the vacancies page itself — these are what we follow when
// discovering where an employer lists its openings.
export const DISCOVERY_LABEL_RE =
  /^(κενες?\s*θεσεις(\s*εργασιας)?|θεσεις\s*εργασιας|προκηρυξεις|εργοδοτηση|ευκαιριες\s*εργοδοτησης|προσληψεις|σταδιοδρομια|vacancies|careers?|jobs|recruitment|employment)$/;

// Labels to drop when reading a listing page: the page's own nav, plus generic
// "read more" links. These must NOT be discovery targets — following a
// «Περισσότερα» from a homepage lands on whatever news item happens to be at the
// top, which is how four sources silently scraped an unrelated article.
export const NAV_LABEL_RE = new RegExp(
  `^(${DISCOVERY_LABEL_RE.source.slice(1, -1)}|αρχειο\\s+προκηρυξεων|archive|περισσοτερα|more|δειτε\\s+ολ(?:ες|α).*|skip\\s+to\\s+content)$`,
);
