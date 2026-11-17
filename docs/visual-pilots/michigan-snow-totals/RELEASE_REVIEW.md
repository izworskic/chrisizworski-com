# Michigan Snow Totals: Visual V1 pilot release review

- Date: 2026-11-17
- Repo: `izworskic/chrisizworski-com`
- Canonical: https://chrisizworski.com/michigan-snow-totals/
- PR: https://github.com/izworskic/chrisizworski-com/pull/1754
- Status: **DRAFT PILOT, NOT APPROVED FOR MERGE.**
- Source references: `design-systems/experience-os-v1/AGENTS.md`, `docs/ANTI_PATTERNS.md`, `docs/QA_SCORECARD.md` and `templates/RELEASE_REVIEW.md`.

## Change and fixed boundaries

This PR contains an answer-first static HTML/CSS treatment, a shared Visual V1 token source plus a deployment mirror under `public/assets/`, and screenshot/review evidence. The existing weather API, SnowCore renderer, `michigan-snow-totals.js`, NWS source data, map provider, script URLs, FAQ and guide text, AdSense code, analytics, canonical, JSON-LD, title, descriptions, and build pipeline remain unchanged. No tool other than Michigan Snow Totals consumes the new token file.

Source-level comparison on November 17 confirmed the `<head>` is identical to main after removing only the added token CSS link; all existing script references and guide HTML match main byte-for-byte; each existing dynamic element ID occurs once, and the shared source and public token files match.

The map appears immediately after the answer-card container. Time-window buttons and the data stamp remain with the answer. The ranked report list retains the original report wording/source and is styled with numbered observations, followed by a native full-report disclosure. The season visualization uses **historical 2025-26 station data**, explicitly labeled as historical. The live season table remains available under a native disclosure.

### Important static-only limitation

The browser renderer creates the latest place/inches strings only as text; it does not emit numeric attributes or CSS variables. CSS cannot calculate honest proportional widths from those live strings. Consequently, the requested **live proportional ranking bars** and a **live current-season comparison graphic** remain **NOT IMPLEMENTED**. The existing ranked observations and current-season table are retained; historical comparison bars are accurate and labeled. Do not introduce made-up bar lengths. Any further step requires explicit permission to edit the existing presentation-only JavaScript, which this pilot does not have.

## Before/after evidence

All images are retained in this directory. Baseline captures were taken against production on November 17; after captures were taken by Chromium serving the branch's static `public/` site while fetching the unchanged production Snow Totals API. After captures are **not a Vercel READY preview or a production deployment**; baseline production may show ads that are not injected into the local test server.

| Viewport | Baseline | After | Additional after map |
| --- | --- | --- | --- |
| 390px | [before-390.png](before-390.png) | [after-390.png](after-390.png) | [after-map-390.png](after-map-390.png) |
| 1280px | [before-1280.png](before-1280.png) | [after-1280.png](after-1280.png) | [after-map-1280.png](after-map-1280.png) |

[Measured browser QA JSON](browser-qa.json). Successful screenshot/test run: https://github.com/izworskic/chrisizworski-com/actions/runs/44087309696

Browser observation at 360/390/768/1280: document scroll width matched viewport, map container followed answer container, sticky light header present, loaded raster tiles observed (4/4/12/18), and no uncaught page JavaScript errors. Native time-window controls switched 24h to 7 days and back, retaining `aria-pressed` consistency. A JavaScript-disabled browser retained NWS archive links and successfully opened the native related-tool disclosure. Reduced-motion media preference was tested. The source-linked reports were from the existing production API, not fixtures or invented values.

The owning repository's first full verification exposed an existing persona contract requiring the depth/forecast/trail links above the map. That regression was fixed by placing the links in the answer container. Await final-head verification before any merge. No other source algorithm or test assertion was modified.

## Experience OS V1 scorecard

Only categories with enough observed evidence receive scores. These are provisional review values and **not** a fictitious full 100-point release certification.

| Category | Weight | Score (0-5) | Weighted points | Evidence / limitation |
| --- | ---: | --- | ---: | --- |
| Visitor decision | 25 | 4 | 20 | Answer and report timestamp appear before the map; report-specific town search available |
| Distinct composition | 15 | 4 | 12 | Observation-first numeric layout distinct from forecast and depth tools |
| Causal interactions | 15 | 4 | 12 | Time change and reversal tested; source/map renderers unchanged |
| Truth and provenance | 15 | 4 | 12 | Existing NWS attribution and checked timestamp; historical chart labeled correctly |
| Visual execution | 10 | 4 | 8 | Screenshot-reviewed 390/1280, soft elevation, two canonical corner radii, one snow palette; no new media needed |
| Mobile, keyboard and a11y | 10 | NOT MEASURED | n/a | Four widths, no-JS disclosure, and reduced motion tested; full keyboard/focus/screen-reader and slow-device study not completed |
| Performance and resilience | 5 | NOT MEASURED | n/a | No new runtime dependency; real CWV/baseline delta, no-tiles and API failure journeys not independently measured |
| Integration and site integrity | 5 | 4 | 4 | Source comparison of metadata, scripts, existing guide; final SHA CI and actual deployment pending |

**Measured subtotal: 68/85 possible observed points. Full score: NOT MEASURED. Release expectation of at least 90/100 with all hard gates satisfied has NOT been met or established. Distinctiveness comparison exists below, but owner review is still required. Merge allowed: NO until explicit owner approval and completion of release gates.**

## Distinctiveness veto review

- [Michigan Snow Depth](https://chrisizworski.com/michigan-snow-depth/) is about **snow on the ground now** and whether recreation conditions support an outing. The Snow Totals pilot instead prioritizes **recent ground-observed snowfall**, measured inches, report age, and geographic evidence. No inferred trail-open verdict appears here.
- [Lake-Effect Snow](https://chrisizworski.com/lake-effect-snow/) is a **forward-looking snowbelt forecast** for the next 72 hours. Snow Totals shows **past observations** over selectable windows and preserves their report source and time. The observation-first ranking plus NWS source map is a different decision architecture, not merely a new accent color.
- Shared mechanisms intentionally reused: winter navigation handoffs, source timestamps, regional filter contracts, and existing Leaflet map/data renderer.

## Hard gate reconciliation

- **Verified:** original SEO/canonical/JSON-LD/AdSense source untouched, no new functions/build tasks, semantic source links, no-JS official fallback, time-window input/reversal, four responsive widths, loaded map tiles, readable labels, reduced-motion rules, and screenshots.
- **Not verified:** fully accessible keyboard/focus/screen-reader flow, blocked-tile/API-error fallback, low-end slow device, real-user performance versus baseline, independent Vercel preview or production smoke, ad overlays in deployed context, final merged commit, and real outcome measurement.
- **Not applicable to this visual-only pilot:** new destinations, parking/routes, AI/generated photos, image credits and asynchronous photo races, launch/ferry time-fit, new canonical discovery, new provider map contract.
- **Incomplete by explicit constraint:** dynamic proportional top-report bars and current-season dynamic bar chart. The historical chart never claims to be live.

## Rollout control

No other tool should import the Visual V1 tokens until Chris explicitly approves this pilot. Keep PR #1754 in draft and unmerged. Do not call the pilot publicly deployed until a matching merged revision is READY and its independent page smoke succeeds.
