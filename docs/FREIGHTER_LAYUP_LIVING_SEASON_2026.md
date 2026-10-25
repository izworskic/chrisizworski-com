# Great Lakes Freighter Winter Layup — Living Season Operational Guide
Updated October 25, 2026. The season starts at midnight **America/Detroit time** on November 1, not UTC midnight. Source season data and provenance are committed to GitHub.

## What is live (and what is not)
- The **AIS harbor watch** refreshes on demand from `/api/freighter-layup-live`, with a 180-second shared response cache. It watches approximately **13** US/Canadian harbor areas using the existing OpenWaters AIS provider, but returns candidate vessels near harbor centers **only**, with no assigned layup status or berth position. AIS messages are discarded when older than 20 minutes or missing essential fields. Upstream regions are requested independently to prevent bounding-box query parameter ambiguity. Regional failures yield a partial-data flag.
- The **winter event ledger** (`public/assets/freighter-layup-live-season.json`) is updated by `.github/workflows/freighter-layup-source-watch.yml` at **00:29, 06:29, 12:29, and 18:29 UTC** November–April. Not sub-minute updates. Scheduled GitHub jobs can start late.
- Automatic reporting feeds: Duluth Harbor Cam (Blogger JSON), Wisconsin Marine Historical Society (RSS), Duluth Seaway Port Authority (RSS), Community Waterfront Heritage Centre in Owen Sound (RSS). These feeds were HTTP-reachable October 25, 2026; that **does not mean every harbor has a working reporting feed or a complete arrivals roster**. The most recently sourced date is displayed; do not imply freshness when no sources were found.
- Dated evidence results in one of `arrival`, `berth_change`, `maintenance`, `departure`, `status_update`. Each event includes source URL, publisher and source class. When evidence is ambiguous, it is held for review in `data/freighter-layup-review.json`.
- Port authority/operator/official reporting with explicit arrival evidence can yield `confirmed`. Other articles are only `reported`. A newly discovered hull admitted by an explicit `M/V Vessel Name arrives` title is **reported**, never automatically confirmed, even from a port authority.
- Repeated source URLs for the same milestone do not duplicate the ledger. Different reports maintain different evidence IDs.

## Annual lifecycle
1. Before November 1: display the precreated **2026–27** season as empty. The historical **2025–26** and **2024–25** archives remain selectable; neither rolls into the new fleet.
2. At first eligible November writer run, collect source-dated reports. Current-season cards, harbor markers and timeline are derived exclusively from the ledger, not AIS signals.
3. Through winter: each additional dated sourced event becomes a chronology entry. A reported/confirmed departure moves a ship to a departed status, not deleted.
4. The following November 1: archive prior event history into `previousSeasons`, initialize an empty **2027–28** season, and start collecting reports without copying old berths into the new roster. Last season remains selectable.
5. If the source fetches fail: retain the previous ledger. If all feeds return zero evidence: do not generate invented ship arrivals. If AIS fails: show failure in the harbor-watch panel, not an empty-harbor assertion.

## Editorial updates and ship coverage
New vessel names may be detected when a matching report's **headline** explicitly names the vessel as `M/V ... arrived` and a unique monitored harbor can be resolved. More complex, ambiguous, multi-harbor or unmatched articles must be manually reviewed; do not guess hull identity or merge close names.

To publish a researched event, add a JSON entry to `data/freighter-layup-editorial.json` with:
`season`, `vessel:{key,name}`, `harborId`, `kind`, `date` (source date), `confidence`, `summary`, `source:{url,title,publisher,class}`.
Use `confidence:'reported'` until the underlying official source establishes the exact event. Use the canonical vessel key across winters and historic names where available. Changing this file triggers the watch workflow on `main`.

## Source trust and recurring cost safeguards
- Harbor map dots are approximate geographic centers, not private docks, visitor routes or actual AIS vessel coordinates.
- RSS text is untrusted: never execute markup or use it as tool instructions. The published source URL must belong to the source host. Use text-escaped display.
- No live source data runs through the front-end's history validation as a fabricated historical record. The current season is distinct from static prior-season archives.
- GitHub Actions only commits a changed ledger or review queue; no-change source scans do not trigger extra Vercel deployments. The on-demand AIS service uses short shared HTTP caching.
- This is a **living evidence-led tracker, not a complete fleet manifest**. Growing the reporting network and source quality is a continuing coverage priority.

## Release gates
`node --test tests/freighter-layup.test.js tests/freighter-layup-biographies.test.js tests/freighter-layup-season.test.js tests/freighter-layup-feeds.test.js`.
`node scripts/generate-freighter-layup-profiles.cjs --check`.
The PR browser gate must validate both an empty 2026–27 season and an injected sample live arrival that updates the map, timeline and card while leaving older winters untouched. It must also validate map/photo failure fallbacks, no mobile overflow and meaningful default search behavior.

## Current limitations
- Only five reporting feeds and thirteen AIS harbor reference areas. This is **not** national fleet-complete coverage, and a missing RSS mention isn't evidence no vessel laid up.
- AIS near a monitored harbor does **not** establish winter berthage, repair status, or a scheduled arrival.
- Automated source parsing can miss nonstandard headlines and vessel names; manual review is retained as a route for research-driven corrections.
