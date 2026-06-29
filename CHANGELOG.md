# Changelog

All notable changes to deals-blog are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [1.6.0] — 2026-06-29

### Added
- **Fuel price history chart** — line chart (Recharts) on all three fuel pages (EN/EL/RU) showing cheapest price per fuel type over time
- `src/data/fuel-price-history.json` — rolling 1-year history file, updated hourly by the fuel cron
- `src/components/FuelChart.tsx` — client component with 7d / 30d / 90d / 1y range switcher; fully translated (EN/EL/RU); dark mode aware
- History deduplication: new entry is only appended when at least one price has changed since the last record
- History retention: entries older than 365 days are automatically trimmed on each write

### Fixed
- `update-supermarket-prices.yml` was not committing `src/data/supermarket-prices.json` — dedicated supermarket pages (EN/EL/RU) were showing data from the initial seed (June 28) instead of the latest hourly fetch
- `update-fuel-prices.yml` now also commits `src/data/fuel-price-history.json`
- Missing dark mode variants on dedicated page badges and description text for EN/EL/RU supermarket and EL/RU fuel pages

### Rollback
Redeploy `v1.5.0` tag via Cloudflare Pages dashboard, or revert the relevant merge commits and push to master.

---

## [1.5.0] — 2026-06-29

### Added
- **Dark mode** — sun/moon toggle in the header; preference persisted in `localStorage`; respects `prefers-color-scheme` on first visit; no flash on load (inline `<script>` applies class before paint)
- `ThemeToggle.tsx` client component
- Dark variants across all pages, cards, badges, prose content, and table components (EN/EL/RU)
- **Watchdog workflow** (`.github/workflows/watchdog.yml`) — runs every 2h, checks `updatedAt` in all 4 data JSON files, re-triggers stale workflows; opens a GitHub Issue after 3 consecutive failures; deduplicates issues
- `scripts/watchdog.mjs` — freshness checks with configurable `maxAgeHours` per source
- **Dedicated EL and RU fuel pages** at `/el/posts/cheapest-petrol-stations-cyprus` and `/ru/posts/cheapest-petrol-stations-cyprus` — interactive with live data; previously fell through to stale markdown
- i18n support in `FuelTable.tsx` via `lang` prop (EN/EL/RU) — district labels, fuel labels, UI strings, Near Me button all translated
- **YouTube and Reddit trending sources** added to trends dashboard (conditional on `YOUTUBE_API_KEY` and `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` secrets)
- Wikipedia Trending (always-on, no key needed) added as trending source
- **Near Me** geolocation button on fuel tracker — sorts stations by distance using Haversine formula; top 100 stations cached in JSON, top 10 shown

### Changed
- All GitHub Actions workflows upgraded from Node.js 20 to Node.js 24
- Fuel tracker now shows top 100 stations in `fuel-prices.json` (was 7); UI still shows top 10
- Fuel address column: shows address text as a clickable Google Maps link (was icon-only)
- `git pull --rebase origin master` added before push in all cron workflows to prevent race conditions when multiple crons run simultaneously

### Fixed
- Unleaded 98 and Diesel showing "—" / €0.000 — root cause: CSRF token consumed by first POST; fixed by fetching a fresh session per fuel type
- Cookie parsing bug: raw `set-cookie` directives (`;path=/;HttpOnly`) were passed as-is to the Cookie header; server rejected them; fixed with `res.headers.getSetCookie()` + stripping directives
- CI/CD 403 errors on fuel and supermarket cron push — missing `permissions: contents: write` added to both workflow jobs
- EL and RU fuel pages showing stale data — dedicated pages now created for both locales

### Rollback
`git revert` the relevant merge commits, or redeploy v1.4.0 tag via Cloudflare Pages dashboard.

---

## [1.4.0] — 2026-06-28

### Changed
- **Fuel post**: removed Live Price summary table (avg/min/max); now shows only 7 cheapest stations per fuel type
- **Fuel post**: added Unleaded 98 and Diesel sections (7 cheapest stations each, same structure as Unleaded 95)
- **Fuel post**: station address column replaced with `📍 Open in Maps` link using GPS coordinates — no raw Greek address text shown
- `update-fuel-prices.mjs`: now makes 3 POST requests to gov portal (PetroleumType 1=95, 2=98, 3=diesel)
- **Coffee post**: expanded from Nicosia-only to all Cyprus
- **Coffee post**: removed Espresso, Filter Coffee, and Summary sections — Freddo Espresso only
- **Coffee post**: single-location cafes (e.g. Black Cup) now show a Google Maps link on their name
- `update-coffee-prices.mjs`: generates Freddo-only section; respects `singleLocation` + `mapsUrl` fields in JSON
- **Supermarket Price Watch**: added LIVE badge on the post page itself (EN/EL/RU)

### Fixed
- Supermarket Price Watch home page card now hardcoded in all 3 home pages (EN/EL/RU)

### Rollback
`git revert` the relevant merge commits, or redeploy v1.3.0 tag via Cloudflare Pages dashboard.

---

## [1.3.0] — 2026-06-28

### Added
- **Live Coffee Prices post** (`cheapest-coffee-nicosia`) — pinned, Freddo Espresso, updated hourly
- Delivery app price column (Wolt / Bolt Food / Foody approximate prices)
- 13 cafes covered: Coffeeway, Coffee Brands, Gregory's, Coffeeberry, Coffee Island, Mikel, Caffè Nero, Gloria Jean's, Second Cup, Black Cup, Costa Coffee, McDonald's, Starbucks
- `src/data/coffee-prices.json` — manually curated price data
- `scripts/update-coffee-prices.mjs` — regenerates all 3 language posts hourly
- `.github/workflows/update-coffee-prices.yml` — cron every hour
- **Cyprus Trends Dashboard** at `/trends` (internal, noindex) — scraped from Cyprus news RSS every 3 hours
- `scripts/fetch-trending-topics.mjs` — scrapes Google News CY, Cyprus Mail, Philenews, Sigmalive; categorises into 10 deal buckets; optional Claude API post suggestions via `ANTHROPIC_API_KEY` secret
- `.github/workflows/fetch-trending-topics.yml` — cron every 3 hours

### Rollback
Redeploy v1.2.0 tag via Cloudflare Pages dashboard, or revert merge commits for `feature/live-coffee-prices` and `feature/trends-dashboard`.

---

## [1.2.0] — 2026-06-28

### Added
- **Supermarket Price Watch** — live prices for 10 household staples from e-kalathi.gov.cy, updated hourly
- `src/data/supermarket-prices.json` — seeded with 10 products across major chains
- `scripts/update-supermarket-prices.mjs` — fetches from e-kalathi API, identifies cheapest store per product
- `.github/workflows/update-supermarket-prices.yml` — cron every hour
- Dedicated Next.js pages at `src/app/posts/supermarket-price-watch/` (EN/EL/RU) overriding `[slug]`
- `SupermarketTable` client component — sortable by name (A→Z) or price; e-kalathi product links; Store column

### Changed
- All GitHub Actions cron schedules changed from 4×/day to every hour (`0 * * * *`)
- Language switcher (`LangSwitcher.tsx`) — now stays on same post when switching language

### Fixed
- Fuel post: station addresses made into clickable Google Maps links (coordinate-based)
- Fuel post: removed Tips and How We Track sections

### Rollback
Redeploy v1.1.0 tag via Cloudflare Pages dashboard.

---

## [1.1.0] — 2026-06-28

### Added
- 7 new Cyprus deals posts (EN/EL/RU): cinema tickets, gym memberships, internet broadband, electricity plans, meze restaurants, fried chicken, student deals
- Russian language routing (`/ru/`) — pages, layout, post renderer
- Fuel prices sourced from Cyprus Government Petroleum Prices portal (POST form scraping with CSRF token)
- `scripts/update-fuel-prices.mjs` — two-step GET (CSRF) → POST; parses station rows with GPS coordinates
- `.github/workflows/update-fuel-prices.yml`

### Rollback
Redeploy v1.0.0 tag via Cloudflare Pages dashboard.

---

## [1.0.0] — 2026-06-28

### Added
- Initial public launch of deals-blog.pages.dev
- Next.js 15 static export deployed to Cloudflare Pages via GitHub Actions
- Trilingual routing: EN (`/`), EL (`/el/`), RU (`/ru/`)
- Markdown post system with gray-matter frontmatter (title, date, category, summary, pinned)
- Home page with pinned (amber/LIVE) and regular post cards
- `deploy.yml` — CI/CD on push to master
- Initial posts: cheapest petrol stations Cyprus, cheapest coffee Nicosia, cheapest fried chicken Nicosia
