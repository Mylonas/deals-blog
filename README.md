# 🏷️ DealsHub Cyprus

> **Live at [deals-blog.pages.dev](https://deals-blog.pages.dev)**

Consumer deals blog for Cyprus — live-tracked prices for fuel, coffee, supermarkets, and more. Trilingual (EN / EL / RU), updated hourly via GitHub Actions.

---

## Features

| Feature | Details |
|---------|---------|
| **Live fuel tracker** | Unleaded 95, Unleaded 98 & Diesel — top 100 stations cached, top 10 shown; district + Near Me filters; GPS map links; price history chart (up to 1 year). Source: Cyprus Gov Petroleum Prices Portal |
| **Supermarket price watch** | 10 household staples tracked across all major chains. Source: e-kalathi.gov.cy |
| **Coffee price tracker** | Freddo Espresso prices across 13 café chains, island-wide + delivery app surcharges |
| **Bazaraki cars** | Every car currently listed on Bazaraki, cheapest first, with make / year / fuel / gearbox / body / city / price / mileage filters. Refreshed by hand via the site's JSON API — `npm run cars:local` from a residential connection (see Bazaraki access below) |
| **Trends dashboard** | Internal page at `/trends` — Cyprus news, Wikipedia, YouTube & Reddit trending topics; post ideas via Claude API |
| **Dark mode** | Sun/moon toggle in header; `localStorage` persistence; respects `prefers-color-scheme`; no flash on load |
| **Trilingual** | Every post exists in English (`/`), Greek (`/el/`), and Russian (`/ru/`) with full i18n in interactive components |
| **Hourly cron + watchdog** | GitHub Actions updates all live data every hour; watchdog re-triggers stale workflows and opens Issues on persistent failures |

---

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) — static export (`output: "export"`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + `@tailwindcss/typography`
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/)
- **CI/CD**: GitHub Actions
- **Content**: Markdown files processed with `remark` + `gray-matter`
- **Live data**: Node.js ESM scripts (`scripts/`) committed as JSON, rebuilt on each deploy

---

## Project Structure

```
deals-blog/
├── posts/
│   ├── en/          # English markdown posts
│   ├── el/          # Greek markdown posts
│   └── ru/          # Russian markdown posts
├── scripts/
│   ├── update-fuel-prices.mjs          # Scrapes Cyprus gov petroleum portal (hourly)
│   ├── update-supermarket-prices.mjs   # Fetches e-kalathi.gov.cy prices (hourly)
│   ├── update-coffee-prices.mjs        # Regenerates coffee post from JSON (hourly)
│   └── fetch-trending-topics.mjs       # Scrapes Cyprus news RSS feeds (every 3h)
├── src/
│   ├── app/
│   │   ├── page.tsx                    # EN home page
│   │   ├── el/page.tsx                 # EL home page
│   │   ├── ru/page.tsx                 # RU home page
│   │   ├── posts/[slug]/page.tsx       # Dynamic post renderer
│   │   ├── posts/supermarket-price-watch/page.tsx  # Dedicated live page (EN)
│   │   ├── el/posts/supermarket-price-watch/       # Dedicated live page (EL)
│   │   ├── ru/posts/supermarket-price-watch/       # Dedicated live page (RU)
│   │   └── trends/page.tsx             # Internal trends dashboard (noindex)
│   ├── components/
│   │   ├── LangSwitcher.tsx            # EN / EL / RU switcher (stays on same page)
│   │   ├── ThemeToggle.tsx             # Dark/light mode toggle (localStorage + prefers-color-scheme)
│   │   ├── FuelTable.tsx               # Interactive fuel table (district/Near Me filters, i18n)
│   │   ├── FuelChart.tsx               # Price history line chart (Recharts, 7d/30d/90d/1y, i18n)
│   │   └── SupermarketTable.tsx        # Sortable price table (client component)
│   ├── data/
│   │   ├── supermarket-prices.json     # Live supermarket data (updated hourly)
│   │   ├── fuel-prices.json            # Live fuel station data — top 100 per fuel type (updated hourly)
│   │   ├── fuel-price-history.json     # Rolling 1-year price history — cheapest price per fuel type per change
│   │   ├── coffee-prices.json          # Manually curated coffee prices
│   │   └── trending-topics.json        # Latest Cyprus trend data (updated every 3h)
│   └── lib/
│       └── posts.ts                    # getAllPosts(), getPost() helpers
└── .github/workflows/
    ├── deploy.yml                      # Build & deploy to Cloudflare Pages on push to master
    ├── update-fuel-prices.yml          # Cron: every hour
    ├── update-supermarket-prices.yml   # Cron: every hour
    ├── update-coffee-prices.yml        # Cron: every hour
    ├── fetch-trending-topics.yml       # Cron: every 3 hours
    └── watchdog.yml                    # Cron: every 2h — re-triggers stale workflows, opens Issues
```

---

## Posts

| Slug | Category | Live? |
|------|----------|-------|
| `cheapest-petrol-stations-cyprus` | Fuel | ✅ Hourly (gov portal) |
| `supermarket-price-watch` | Food & Drink | ✅ Hourly (e-kalathi) |
| `cheapest-coffee-nicosia` | Food & Drink | ✅ Hourly |
| `cheapest-cars-cyprus` | Vehicles | ⚠️ Manual (Bazaraki — `npm run cars:local`) |
| `cheapest-cinema-tickets-cyprus` | Entertainment | — |
| `cheapest-gym-memberships-nicosia-limassol` | Entertainment | — |
| `cheapest-internet-broadband-cyprus` | Utilities | — |
| `cheapest-electricity-plans-cyprus` | Utilities | — |
| `best-value-meze-restaurants-cyprus` | Food & Drink | — |
| `cheapest-fried-chicken-nicosia` | Food & Drink | — |
| `student-deals-cyprus` | Student Deals | — |

---

## Live Data Sources

| Data | Source | Method |
|------|--------|--------|
| Fuel prices | [eforms.eservices.cyprus.gov.cy](https://eforms.eservices.cyprus.gov.cy/MCIT/MCIT/PetroleumPrices) | POST form (CSRF token → form submit) |
| Supermarket prices | [e-kalathi.gov.cy](https://www.e-kalathi.gov.cy) | REST API (`/fetch-product-list`) |
| Supermarket price history & all-time lows | [e-kalathi.gov.cy](https://www.e-kalathi.gov.cy) | REST API (`/fetch-product-price-diagram`, daily prices since Sep 2025, paced + cached) |
| Coffee prices | Manually curated in `src/data/coffee-prices.json` | JSON → markdown generation |
| Trending topics | Google News RSS, Cyprus Mail, Philenews, Sigmalive | RSS parsing + keyword categorisation |
| Bazaraki cars | [bazaraki.com](https://www.bazaraki.com) | Internal JSON API `/api/items/?rubric=5`, read with curl. Laptop-only — Cloudflare challenges every client from a datacenter IP |

---

## Running Locally

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # Static export → out/
```

### Running update scripts manually

```bash
node scripts/update-fuel-prices.mjs
node scripts/update-supermarket-prices.mjs
node scripts/update-coffee-prices.mjs
node scripts/fetch-trending-topics.mjs   # set ANTHROPIC_API_KEY for AI suggestions
npm run cars:local                       # Bazaraki cars — must be run locally, see below
```

### Bazaraki access: why cars refresh by hand

Bazaraki sits behind a Cloudflare managed challenge that is applied by **IP
reputation**, not by client. Measured from a GitHub Actions runner, `curl`, a
stealth-patched headless Chromium and Node's `fetch()` all receive the challenge;
from a residential Cyprus connection the same `curl` call gets a 200.

This was not obvious for a while. `update-bazaraki-cars.yml` ran nightly on the
stealth-browser trick and **failed at `clearCloudflare` on every run from
2026-07-24**, so the car data sat frozen at its 2026-07-23 state while the
workflow quietly went red each morning.

Consequences:

- The scrape is now `npm run cars:local`, run from the laptop, and the JSON is
  committed like any other change. The workflow is dispatch-only.
- The scraper uses curl (`scripts/lib/curl-fetch.mjs`), not a browser — Node's
  `fetch()` is refused even locally, so **do not "simplify" it back to `fetch()`**.
- It refuses to write a dataset less than half the size of the one on disk, so a
  run cut short cannot replace the full catalogue with a fragment. `FORCE=1`
  overrides when a drop is genuine.
- The same helper and the same constraint apply to Bazaraki in the
  `cyprus-house-listings` repo; the two copies are kept in sync by hand.

---

## GitHub Actions

All workflows use `[skip ci]` on their commits to avoid deploy loops.

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `deploy.yml` | Push to `master` | `npm run build` → Cloudflare Pages |
| `update-fuel-prices.yml` | Every hour | Scrapes gov portal for 95/98/diesel, commits updated posts + JSON |
| `update-supermarket-prices.yml` | Every hour | Fetches e-kalathi API, commits updated JSON + posts |
| `update-coffee-prices.yml` | Every hour | Refreshes `updatedAt` timestamp, commits updated posts |
| `update-bazaraki-cars.yml` | Manual dispatch only | Cannot run on the runners — see Bazaraki access below. Kept for a future self-hosted runner |
| `update-price-history-sharded.yml` | Daily 05:30 UTC | 10 parallel shards refresh the e-kalathi price history, then a merge job recomputes deals + all-time lows and commits both. Fails if the cache ends up under 50% fresh |
| `update-supermarket-deals.yml` | Manual dispatch only | Same script as the merge job above. Collapsed into it so deals are computed *after* the history they depend on; kept for manual rebuilds |
| `fetch-trending-topics.yml` | Every 3 hours | Scrapes Cyprus RSS + YouTube + Reddit + Wikipedia, commits JSON |
| `watchdog.yml` | Every 2 hours | Checks data freshness; re-triggers stale workflows; opens GitHub Issue after 3 failures |

### Required Secrets

| Secret | Required | Used by |
|--------|----------|---------|
| `CLOUDFLARE_API_TOKEN` | ✅ | `deploy.yml` |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | `deploy.yml` |
| `ANTHROPIC_API_KEY` | Optional | `fetch-trending-topics.yml` — enables AI post suggestions |
| `YOUTUBE_API_KEY` | Optional | `fetch-trending-topics.yml` — YouTube trending videos for Cyprus |
| `REDDIT_CLIENT_ID` | Optional | `fetch-trending-topics.yml` — Reddit r/cyprus trending posts |
| `REDDIT_CLIENT_SECRET` | Optional | `fetch-trending-topics.yml` — Reddit r/cyprus trending posts |

---

## Adding a New Post

1. Create `posts/en/my-post-slug.md`, `posts/el/my-post-slug.md`, `posts/ru/my-post-slug.md`
2. Add frontmatter:
   ```yaml
   ---
   title: "Post Title"
   date: "2026-06-28"
   category: "Food & Drink"
   summary: "One-line description shown on the home page card."
   pinned: true   # optional — shows in amber LIVE section
   ---
   ```
3. For auto-updating posts, add `<!-- MARKER_START -->` / `<!-- MARKER_END -->` markers and a corresponding script in `scripts/`

---

## Git Workflow

```
feature/my-feature  →  dev  →  master
```

- **Never** commit directly to `dev` or `master`
- Every change: new branch → commit → merge to `dev` → merge `dev` to `master`
- Push to `master` triggers a Cloudflare Pages deploy

---

## Releases

See [CHANGELOG.md](./CHANGELOG.md) for full history.

Latest: **[v1.8.0](https://github.com/Mylonas/deals-blog/releases/tag/v1.8.0)** — Cheapest Cars in Cyprus: every Bazaraki car listing, cheapest first, with make/year/fuel/gearbox/body/city/price/mileage filters. Trilingual, daily.

Release procedure follows the project's [release guide](https://github.com/Mylonas/deals-blog/releases): semver tagging, CHANGELOG update, annotated git tag, structured release notes with rollback procedure.

---

## Trends Dashboard

Internal page at [`/trends`](https://deals-blog.pages.dev/trends) (noindex — not linked from the public nav).

Shows trending Cyprus news headlines categorised by deal type (fuel, food, travel, utilities, etc.) with suggested post titles. Add `ANTHROPIC_API_KEY` to GitHub secrets to enable AI-generated post ideas via Claude.

---

*Built with Next.js 15 · Deployed on Cloudflare Pages · Data from Cyprus government sources*
