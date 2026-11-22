# ShoreFeel on every curated Great Lakes beach, 2026-11-21

## Visitor goal and implementation

A visitor choosing a beach must be able to open **that beach's** ShoreFeel, not a regionwide forecast with an unclear identity. ShoreFeel now has 84 directly identifiable destinations in the curated source catalog: 50 Michigan beaches already had indexed pages, plus 16 other U.S. Great Lakes beaches and 18 Ontario beaches that now gain individual canonical field-note pages.

**Online weather sources only.** No new weather instruments, field visits, research permits, paid API, station ownership, private GPS, scheduled job, Redis or new weather request endpoint.

## Two design concepts and selection

- **Single regional map with dynamically selected beach**: existing U.S. and Canada experience. Efficient for comparing broad geography, but a selected beach has no distinct direct URL, difficult to share, no useful beach-first entry from search, and the UI requires an extra decision before seeing a reading.
- **Place-first field note, linked back to its regional map**: selected. One named beach, a source-dated area temperature, air/wind and short interpretive context above the longer explanation, with permanent official park and water-quality links. Each page uses existing regional APIs. Maps remain intact for discovery and switching. The weather values are not inflated into a pseudo-precision beach correction.

Michigan already owned 50 canonical beach detail URLs; these retain existing SEO, data, official swim risk and ad structure. Their hero link is upgraded to the location's available forecast apparent reading with honest “modeled” labeling, the beach list gets per-beach ShoreFeel indicators, and the existing ShoreFeel section gains wind-from direction and a conditional nearby NOAA offshore water versus area-air contrast. The display **never** applies that contrast to the forecast air.

## Source integrity, caveats, fallbacks

| Geography | API and values | Restrictions |
| --- | --- | --- |
| Michigan (50) | Existing `/api/beaches?slug=...`: Open-Meteo modeled location air, apparent and 10 m wind; nearby fresh NDBC offshore water where available; BeachGuard and NWS hazards separately | Require valid source time within 2 hours. NOAA open-water temperature cannot be swimming-area water or a measured beach-air offset. Only show numeric air-water contrast if fresh and station <=30 miles; do not assume onshore flow, and never use contrast to change apparent air |
| Other U.S. lakes (16) | Existing `/api/shorefeel-us?beach=...`: NWS official land-grid hourly air, wind direction, modeled NWS heat index/wind chill | No on-sand temperature, inferred local lake water, water quality or swim safety; the official state agency is linked separately |
| Ontario (18) | Existing `/api/shorefeel-ca?beach=...`: ECCC GeoMet nearby city hourly air and wind, conditional wind chill and source city/distance | Source may be tens of km away. No true sand temperature, measured water temperature, swimming flag or calibrated beach adjustment. Source fails closed when stale/too far |

**No stale values displayed as current;** a missing source yields “No recent forecast,” and official park/advisory and Google Maps place-search links remain usable. The map search is place discovery, **not** an assumed visitor entrance. The official advisory is a navigation link, **not** an automatically verified beach-safe status.

## New URLs and repository entrypoints

- Michigan: `/great-lakes-beaches/grand-haven-state-park/` with `#at-the-beach` and existing MI individual pages. Statewide directory `/great-lakes-beaches/`.
- Other U.S.: `/great-lakes-beaches/around-the-lakes/park-point-beach-house/` and 15 peers. Regionwide explorer remains `/great-lakes-beaches/around-the-lakes/`.
- Ontario: `/great-lakes-beaches/canada/agawa-bay/` and 17 peers. Canada explorer remains `/great-lakes-beaches/canada/`.

The 34 new HTML pages are derived from **source-controlled vetted catalogs** via `scripts/generate-shorefeel-details.mjs`, invoked from existing `npm run build:site`. They retain Person ID, self-canonical, breadcrumbs and 2026-11-21 sourced content timestamps. All 34 URLs appear in `public/sitemap-shorefeel-beaches.xml`, registered by `public/sitemap-index.xml`. Regional pages carry crawlable links to all 34 generated beach pages.

## Technology and cost fit

Existing plain HTML + CSS + small browser JS and the existing Node weather endpoints are the smallest functional stack. Additional Python, Rust, Java, WebGL or an interactive map on every individual page would increase delivery and Vercel costs without increasing honest beach-weather resolution. Reuse the existing interactive maps on regional explorers. No new Vercel function, extra server-side aggregation, client position tracking or manual AdSense placements.

## Acceptance

```bash
node scripts/generate-shorefeel-us.mjs
node scripts/generate-shorefeel-ca.mjs
node scripts/generate-shorefeel-details.mjs
node --test tests/shorefeel-every-beach.test.js tests/shorefeel-beach-network.test.js tests/shorefeel-us-coast.test.js tests/shorefeel-canada.test.js
npm run verify:all
```

Dedicated `ShoreFeel beach microclimate browser QA` exercises actual Chromium phone 390px and desktop 1280px with explicitly synthetic API sources; checks report values, source failure, canonical, page layout, overflow and working discovery links. Existing Michigan and U.S. region acceptance still runs. Browser source mocks validate interaction and visual state **not** accuracy of upstream weather providers; scientific uncertainty remains.

**Release:** PR remains unmerged until owner requests merge. Review actual browser screenshots, downstream build assertions and Vercel preview. Never alter Auto ads, canonical/Person contracts, Search Console, privacy, maps, official swimming safety or visitor source confidence to force a green build.
