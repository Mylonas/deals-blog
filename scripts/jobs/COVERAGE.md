# Public-sector job coverage & source-discovery methodology

This is how we decide *which* Cyprus public-sector employers to monitor, so that
coverage comes from a repeatable process rather than a hand-remembered list of
websites. It exists because the Digital Security Authority (ΑΨΑ / DSA) was missed
for exactly that reason — nobody had it on the list.

## The discovery pipeline

```
central directories → enumerate organisations → find each one's vacancy source
→ add to sources.json with the right adapter → scrape daily → diff for new posts
```

Run the gap-finder to compare the official directory against what we monitor:

```bash
node scripts/jobs/discover-orgs.mjs          # human-readable gaps
node scripts/jobs/discover-orgs.mjs --json    # machine-readable
```

It reads the [gov.cy organisations directory](https://www.gov.cy/en/websites/)
through the stealth browser (the directory 403s datacenter IPs), extracts every
`.gov.cy / .org.cy / .ac.cy / .com.cy` organisation, and lists the ones whose
host no current source covers. It does **not** auto-add them — a human still
confirms each one's real vacancy page and adapter — but the gap can no longer be
overlooked.

## Central sources (checked first, before per-organisation sites)

| Source | What it covers | In the monitor? |
| --- | --- | --- |
| **Επιτροπή Δημόσιας Υπηρεσίας (ΕΔΥ / PSC)** — psc.gov.cy | All core civil-service posts (ministries, deputy ministries, departments) recruited centrally | ✅ `psc` source |
| **gov.cy organisations directory** — gov.cy/en/websites/ | Master list of ~252 ministries/departments/agencies/authorities | ✅ used by `discover-orgs.mjs` |
| **gov.cy vacancy pages** — gov.cy/…/kenes-theseis-sti-dimosia-ypiresia | Republished ΕΔΥ competitions | ⤳ duplicates `psc`; not scraped separately |
| **Public Employment Service (ΔΥΑ)** — pescps.dl.mlsi.gov.cy | Mostly private-sector labour-market vacancies | ❌ out of scope (not public-sector employment) |
| **a13.psc.gov.cy** | The *application* portal, not a listing | n/a |

## Why the directory alone is not enough

Two findings from running the gap-finder against the live directory:

1. **The directory skews to central recruiters.** Most of its ministries and
   departments do **not** publish their own vacancies — they recruit through
   ΕΔΥ, which the `psc` source already covers. Wiring each department in
   separately would be wrong (empty pages, or duplicates of ΕΔΥ).
2. **The directory is incomplete.** It returned 164 organisations (of a stated
   252) and **did not include the DSA at all**. Independent authorities under a
   Commissioner (e.g. the DSA under the Commissioner of Communications) can be
   absent. So directory-driven discovery must be paired with:
   - the ΕΔΥ feed for everything recruited centrally, and
   - targeted web search for independent authorities / public bodies that
     recruit on their own and may not appear in the directory.

The population we actually monitor individually is the **separate recruiters**:
semi-government organisations, independent authorities, universities, research
centres, district organisations and municipalities. Those are what `sources.json`
enumerates (62 sources at time of writing).

## Access & adapters

- Plain fetch first (`site` / `wp`). If a site answers **403 / 429 / Cloudflare
  challenge**, the scraper now **automatically retries through the stealth
  browser** (`scrape-jobs.mjs` → `isBlocked` → `browser.scrape`). A source is
  only recorded as `blocked: true` in `public-jobs.json` if the browser fallback
  *also* fails — it is never silently dropped.
- The run report lists sources `recovered via browser fallback` and, separately,
  the ones that are genuinely `inaccessible`.

## Known gaps (documented, not forgotten)

See the `_missing` array in `sources.json` for the running list and the concrete
reason each is unscrapeable (JS-only pages with no links, print-only school
boards, undated archives such as the DSA careers page, third-party aggregators,
etc.). When one of those changes, remove it from `_missing` and add a real source.
