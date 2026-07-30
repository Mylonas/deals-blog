// Exelsys Online Recruitment — the hosted ATS several Cyprus research bodies
// point their "Employment Opportunities" link at (Ινστιτούτο Κύπρου is the first).
//
// The listing is server-rendered ASP.NET, so a plain fetch is enough, but the
// postings are not links: each is an <h3 onclick="openVacancy('2026/0416')">
// whose <a class="job-header"> carries the title and no href at all. The site
// adapter reads hrefs, so it sees an empty page. Hence this.
//
// The page's own openVacancy() appends `&v=<code>` to the current URL, so that
// is how a posting gets a stable address of its own.

import { get, text, findDate, DOCUMENT_RE } from '../lib/util.mjs';

// <h3 … onclick="openVacancy(&quot;2026/0416&quot;)"><a class="job-header">Title</a></h3>
const VACANCY_RE =
  /<h3[^>]*onclick=["']openVacancy\((?:&quot;|&#39;|['"])([^'"&]+)(?:&quot;|&#39;|['"])\)[^>]*>([\s\S]*?)<\/h3>/gi;

/** The summary block that follows each heading — it opens with the closing date. */
const NOTES_RE = /id="[^"]*pnlNotesShort"[^>]*>([\s\S]*?)<\/div>/i;

export function extractJobs(html, listingUrl) {
  const jobs = [];
  for (const match of html.matchAll(VACANCY_RE)) {
    const title = text(match[2]);
    if (!title) continue;

    // «Deadline for applications: 16/08/2026» sits in the block right after the
    // heading. Bounding the search to the next posting keeps one row's date from
    // being read off the following one.
    const rest = html.slice(match.index + match[0].length);
    const notes = NOTES_RE.exec(rest.slice(0, Math.max(0, nextVacancyAt(rest))));

    jobs.push({
      title,
      url: `${listingUrl}${listingUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(match[1])}`,
      published: null,
      deadline: notes ? findDate(text(notes[1])) : null,
      reference: null,
    });
  }
  return jobs;
}

/** Where the next posting starts, so one row's notes cannot leak into another's. */
function nextVacancyAt(rest) {
  const next = /<h3[^>]*onclick=["']openVacancy\(/i.exec(rest);
  return next ? next.index : rest.length;
}

export async function scrape(source) {
  const listingUrl = source.vacanciesUrl;
  if (!listingUrl || DOCUMENT_RE.test(listingUrl)) return [];
  return extractJobs(await get(listingUrl, { timeout: source.timeout }), listingUrl);
}
