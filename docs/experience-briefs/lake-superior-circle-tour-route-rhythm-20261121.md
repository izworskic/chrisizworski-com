# Lake Superior Circle Tour | Route Rhythm experience investment

Date: 2026-11-21
Mode: REVIEW to IMPLEMENT
Canonical: https://chrisizworski.com/lake-superior-circle-tour/
Owner: izworskic/chrisizworski-com
Source: public/lake-superior-circle-tour/index.html and published 7-, 10-, and 15-day day records
Skill: .agents/skills/experience-investment/SKILL.md
Governance: Experience OS v1.2.1, Foundry 0.3, AGENTS.md

## Visitor decision and observed baseline

A prospective Circle Tour traveler needs to decide how many days to allocate before making reservations, then see the actual route, select stops and investigate access. The current published page has three complete routes, a map, source-linked day notes, a 31-stop browser, Journey Atlas, and a specialist-tool bridge. The initial duration buttons do not expose *why* one route feels more rushed than another before the visitor enters the route preview.

Baseline evidence is from the canonical public page and repository source on November 21, 2026. Exact desktop and phone baseline screenshots: NOT CAPTURED. We have not measured abandonment, user confusion, conversion, page speed, or GSC outcomes.

## Opportunities reviewed

1. Route-day fit: daily mileage already exists for all three routes and the traveler-planner tests establish a published 47 mph / 1.2 allowance. A readable fit comparison can immediately change the route choice without a source or server dependency.
2. Map and itinerary continuity: the original planner has preset activation, a map, stop list, trip persistence in its URL, and road reality notes. Link any new comparison back to that exact state rather than building another route engine.
3. Landscape interpretation: the existing photo-led Journey Atlas, Pictured Rocks, Apostle Islands, LSPP and other specialists already explain exact places. A second hero/photo carousel would push the actionable route further down the phone and duplicate imagery; defer.

## Two credible concepts

**A. Illustrated shore-chapter explorer.** Phone: four distinct geographic chapters with one selected shore and a photographed decision per chapter. Desktop: coast-atlas story linked to existing stops. A reader could choose Ontario, Michigan, Wisconsin or Minnesota, then open a park-specific tool; source or image failures leave linked stops. Benefit: stronger sense of place. Limitation: another experience chooser beside Journey Atlas and bridge, while the trip-length decision still remains opaque. Medium-to-large visual investment.

**B. Route Rhythm. Selected.** Phone: one question about preferred daily driving hours, an immediate conclusion, then three compact horizontal journey ribbons. Desktop: three aligned mileage-derived day profiles above the existing map. Changing the preference changes which published days are over the target and the shortest route that clears that *driving-only* screen. Selecting a route activates the existing map and itinerary, not a second map. Incomplete mileage blocks a passing verdict and complete written routes remain in no-JavaScript HTML. Benefit: answers a trip-allocation question with existing trustworthy data and moves directly into action. Small-to-medium engineering and UX investment.

## Decision and visual distinctiveness

The closest products are the Circle Tour 10-day traveler feasibility guide and the existing Journey Atlas on this page. The 10-day guide personalizes a chosen route with seasonal/interest constraints; this new entrance compares *which of the three whole-lake journeys* fits a user's daily driving target. Journey Atlas chooses exact shore experiences by interest and time on site; Route Rhythm uses a sequential 7/10/15-day bar sequence with an over-limit state, no destination cards or images. The information composition, primary decision and interaction all differ. Shared source links and existing preset buttons are intentional.

The road-hour screening uses published per-day miles divided by 47 mph and multiplied by 1.2, rounded to a tenth of an hour. The existing trip intelligence uses this planning convention. This is an editorial allowance, NOT a Google-routed ETA or observed drive, and excludes visits, border delays, closures and portions of park access. The bar color means "above the selected estimate threshold," not "unsafe" or "closed." The shortest route clearing the limit is not automatically the best vacation. At 5 hours, the published 7-day option exceeds on days 3, 4 and 6, the 10-day on days 7 and 9, and the 15-day on none. This is not evidence that every listed stop can be visited.

## Technology Fit Review

- HTML / CSS: **keep**, for the search-visible travel context, no-JS fallback, native form, focused responsive styling and a route-specific vertical bar grammar.
- Browser JavaScript: **keep**, for one small data-derived interaction. Read the published itinerary DOM, compute the summary, reuse existing preset controls and sync on the existing preset-change event. No additional fetch or remote API.
- Existing Rust itinerary verifier and traveler engine: **reuse published conventions**, but do not add WASM loading to the initial decision. The current Rust verification remains downstream in the map preview.
- Python: **keep build-time source reconciliation already present**. No data science or new service is needed for a comparison of 32 published travel-day figures.
- Existing Node / Vercel functions: **unchanged**. No fresh server dependency, maps API, cache, storage or build route.
- Java: **reject**. There is no existing Java owner, JVM integration, or computation that justifies deployment.
- New rendering library, map, 3D or motion: **reject**. The existing map is already available and a day ribbon is sufficient; reduced-motion compatibility is the default without animation.

Performance/CWV measurements: NOT MEASURED. The changes add one scoped stylesheet and one deferred script. A follow-up profiling run would be required to justify a compiled engine or service migration. Rollback is removal of those two references, the additive section and the two new files.

## Protected contracts and scenarios

1. Change target 5 to 8 hours. Published days and recommendation change causally; days/mileage remain unchanged.
2. Select 7, then 10, then 7 via the new route previews. Existing preset controls, map, itinerary preview and selected ribbon must agree; no duplicate trip model.
3. Select a preset through the existing map buttons and confirm the ribbon selection updates with no focus loss.
4. Missing day mileage or malformed values must not create a passing recommendation.
5. With JavaScript off or route comparison unavailable, the written 7/10/15 routes, link to itinerary evidence, 31 stop cards and existing map fallback remain available.
6. At 360, 390, 768, 1280 and 1440px, route ribbons and controls must have no document-wide horizontal overflow or unreadable text.
7. Keyboard selection, focus ring, contrast and screen-reader text must be checked in a browser. Bars are marked decorative and the day-over-limit list is text.
8. No ads, canonical, Person schema, indexability, titles, 2026 season notices, maps, independent specialist tools, map-key policy or uploaded photographs are changed.

## Implementation and verification status

Files: public/lake-superior-circle-tour/index.html; public/assets/circle-tour-pace.js; public/assets/circle-tour-pace.css; tests/circle-tour-pace.test.cjs; this decision record.

Existing page text, route day data, map, specialist links, copy credits, ads and SEO preserved. No new production URL. Targeted source-based tests specify original day counts, five-hour over-limit days, eight-hour behavior, missing-mileage failure and use of native preset buttons.

Browser baseline screenshots: NOT CAPTURED.
Browser after screenshots at 390 / 1280: NOT CAPTURED.
Visual/mobile/keyboard QA scorecard: NOT MEASURED.
Experience Foundry improve / assess / prove: NOT RUN in a full repository checkout. This decision record and test are not a Foundry proof packet.
Full local npm run verify:all: NOT RUN through this connector environment.
GitHub PR CI, merge, deployment and live public smoke: NOT VERIFIED as of this record.
Search CTR, visitor interaction outcome and revenue: NOT MEASURED.

Next action: run targeted Node tests and npm run verify:all in a full-history checkout, inspect real-browser desktop/mobile states and map fallback, then resolve any failing CI before owner merge. Never interpret source review as visual acceptance or deployment verification.
