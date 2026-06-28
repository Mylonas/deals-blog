# Changelog

All notable changes to deals-blog are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

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
