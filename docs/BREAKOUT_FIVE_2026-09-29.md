# Breakout Five — Evidence and Intervention Record

Date: 2026-09-29  
Search Console settled through: 2026-09-27  
Current comparison window: 2026-08-31 through 2026-09-27  
Prior comparison window: 2026-08-03 through 2026-08-30

## Objective

Remove the smallest high-confidence constraints preventing five already-emerging products from receiving broader organic distribution. Preserve one canonical owner per intent and preserve current winners.

## Before-state

| Product | Current clicks | Current impressions | CTR | Avg. position | Prior clicks | Prior impressions | Prior avg. position |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Great Lakes Freighter Tracking | 121 | 9,981 | 1.21% | 7.80 | 31 | 2,660 | 9.96 |
| Mackinac Bridge Live | 35 | 5,731 | 0.61% | 8.84 | 10 | 2,613 | 10.05 |
| Michigan Boat Launches | 13 | 3,054 | 0.43% | 8.79 | 1 | 268 | 13.09 |
| Ballard Locks salmon counts | 18 | 790 | 2.28% | 6.93 | emerging | emerging | — |
| Gordie Howe Bridge Wait Time | 84 | 1,937 | 4.34% | 7.09 | 26 | 1,019 | 10.30 |

Ballard main page in the current window: 3 clicks / 549 impressions / 0.55% CTR / position 8.57.

## Highest-leverage query evidence

The site's own position-3 CTR opportunity model estimates, among other loaded-spring queries:

- `great lakes ship tracker`: 1,141 impressions, position 7.70, 0.44% CTR, about 110 incremental clicks if it reached the site's observed position-3 CTR.
- `great lakes freighter tracker`: 491 impressions, position 7.92, about 45 incremental clicks at that target.
- `mackinac bridge conditions today live`: 600 impressions, position 8.54, about 56 incremental clicks at that target.
- `is the mackinac bridge open today`: 235 impressions, position 9.03, about 23 incremental clicks at that target.
- `boatnerd ais`: 320 impressions, position 6.36, zero clicks; evidence that Google already understands the freighter page as an AIS/tracker alternative.
- `boat launch near me`: 84 impressions, position 7.68; evidence that Google is testing the statewide finder against generic local intent.
- `ballard locks salmon count`: 129 impressions, position 7.33; the dedicated salmon owner is already receiving meaningful page-one testing.
- `gordie howe bridge live camera`: 211 impressions, 5.21% CTR, position 6.23; this is a current winner that should not be disrupted.

## Dominant constraints

### Great Lakes Freighter Tracking

Google is already rewarding a broad query topology: generic ship tracker, freighter tracker, live map, AIS/BoatNerd navigation, marine traffic, lake-specific tracking, corridor traffic, and schedule/today searches.

Dominant constraint: a large page-one ranking spring plus weak SERP conversion, while the primary live-map utility is unnecessarily interrupted by a daily Gazette module before the map.

High-confidence intervention: keep the current title, H1, canonical, AIS map, corridor views and provenance; move the Gazette below the live map so tracker intent reaches the product immediately.

### Mackinac Bridge Live

Google clearly understands conditions/open-today intent. Metadata already asks and answers the correct question.

Dominant constraint: the exact live answer is JavaScript-driven and the first official status card is unnecessarily separated from the direct answer by an unrelated Gazette module.

High-confidence intervention: preserve title, H1, canonical, official source hierarchy and cameras; move the Gazette below the official status card so the direct answer flows immediately into the authoritative current state.

### Michigan Boat Launches

The page has moved from 268 to 3,054 impressions while average position improved from 13.09 to 8.79. Google is now testing generic/local phrases, including `boat launch near me`.

Dominant constraint: the product deliberately refused precise browser location and required a typed destination, while the emerging query family expects a one-tap local answer.

High-confidence intervention: add an explicit `Use my location` action. Location is requested only after the user taps, nearest-launch calculation happens entirely in the browser, coordinates are not stored and are not sent to this site, and the existing destination-search path remains intact. Preserve the statewide canonical and DNR source truth.

### Ballard Locks

The initial thin-page hypothesis did not survive inspection. The authoritative Ballard v2 salmon source already carries source date/data-age language, seasonal species context, trend logic, canonical ownership, and a dedicated live API hook.

Dominant constraint: emerging topical-cluster authority and keeping salmon-count intent concentrated on the dedicated owner rather than creating overlapping pages.

Intervention in this release: none. Preserve `/ballard-locks/salmon-counts/` as the salmon-count owner and `/ballard-locks/` as the broader visit/live-decision owner. Observe whether salmon queries consolidate on the dedicated page.

### Gordie Howe Bridge Wait Time

CTR and ranking have both improved materially. Camera intent is already healthy and the page is strongly connected to Michigan Border Wait Times, Ambassador Bridge and Detroit-Windsor Tunnel pages.

Dominant constraint: broader wait/route-decision ranking and authority, not a broken first screen.

Intervention in this release: none. Preserve the camera winner and current wait-time canonical. Future work should deepen official route-comparison evidence only when it adds a real decision rather than another keyword surface.

## Implementation proof required

This release must prove:

1. Freighter live-map markup appears before the tracker Gazette module.
2. Mackinac official status card appears before the conditions Gazette module.
3. Boat Launches contains one explicit near-me action, uses browser geolocation only after a tap, has no browser persistence, and preserves its canonical/title.
4. Ballard and Gordie search-facing surfaces are unchanged by this intervention.
5. Existing repository verification remains green.

## Post-change indicators

Use comparable settled Search Console windows. Do not claim causality from a few days of movement.

- Freighter: watch `great lakes ship tracker`, `great lakes freighter tracker`, live-map variants, AIS variants, total position distribution and CTR.
- Mackinac: watch `mackinac bridge conditions today live`, `is the mackinac bridge open today`, generic conditions/status/traffic queries and CTR at positions 6–10.
- Boat Launches: watch `boat launch near me`, `nearest boat launch to me`, `boat ramp(s) near me`, `public boat launch map near me`, `mi dnr boat launch map`, and the ratio of relevant local queries to irrelevant distance-query leakage.
- Ballard: watch salmon/fish-count query ownership between the main and salmon pages; desired direction is consolidation on the salmon canonical while the main page grows visit/locks/vessel intent.
- Gordie: watch wait-time family growth separately from camera queries; preserve current camera CTR while wait queries move upward.

## What this release deliberately does not do

- no new thin geographic or keyword pages;
- no canonical changes;
- no Freighter or Mackinac title/H1 churn;
- no Ballard page merge;
- no Gordie camera rewrite;
- no server-side collection of Boat Launches device coordinates;
- no removal of existing functionality, source provenance or decision-support surfaces.
