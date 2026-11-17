# Michigan Snow Totals: Visual V1 scorecard follow-up

**Recorded 2026-11-17. Owner:** `izworskic/chrisizworski-com`. **Canonical:** https://chrisizworski.com/michigan-snow-totals/

- Pilot: [PR #1754](https://github.com/izworskic/chrisizworski-com/pull/1754), merged at `381153e`.
- Follow-up: [PR #1755](https://github.com/izworskic/chrisizworski-com/pull/1755), DRAFT, not merged.
- Experience OS framework: `design-systems/experience-os-v1/docs/QA_SCORECARD.md`. This is the website's **100-point rubric**, not a Lighthouse grade or Google ranking prediction.
- Core promises retained: no NWS or ACIS API alteration, no SEO metadata/canonical change, no ad changes, no new Vercel function/build step, no other tool rollout. This follow-up adds a small presentation-only change to the existing client renderer and a read-only browser regression workflow.

## Verified change evidence

The production pilot put the answer first. The follow-up now separates the largest observed amount (56px tabular figures) from its place and source timestamp, uses observed inches for proportional ranked bars, and visualizes the existing current-season ACIS station totals only when a valid normal/percentage exists. The historical 2025-26 bars remain labeled historical. These are observations of varying accumulation durations, not fabricated 24-hour storm totals.

A failed OSM raster provider or Leaflet runtime collapses the 355px empty map and opens the source-linked full report list. A failed NWS API does not leave a stale "Loading reports" table. Scrollable filters/tables can receive keyboard focus. Native disclosures and a direct source-archive handoff survive disabled JavaScript.

### Browser measurements

- [Five-width, source-backed, real-raster and failure-mode browser run](https://github.com/izworskic/chrisizworski-com/actions/runs/44099781240).
- [Measured QA JSON](scorecard/measured-qa.json). Data used for deterministic behavior: checked-in recorded November 2025 NWS LSR and 2025-26 ACIS fixtures, **not live November 2026 figures**.
- All 360, 390, 768, 1280 and 1440px runs: zero horizontal overflow, 56px number, report-window A to B and back, geographic marker changes with region selection, real map raster tiles loaded, source-proportional bars present, current-season graph populated, zero uncaught page errors.
- Automated axe WCAG A/AA and WCAG 2.1/2.2 AA: zero reported violations at all five widths. This does **not** replace manual screen-reader testing.
- 390px throttled network: answer remained visible, zero page errors, First Contentful Paint measured at about 968ms **in the synthetic local fixture test**. This is **not** field CWV or a real-user comparison.
- Blocked tiles, blocked Leaflet, failed NWS API and no JavaScript: useful links and list/disclosure alternatives verified.
- [Mobile initial screenshot](scorecard/enhanced-390.png), [desktop initial](scorecard/enhanced-1280.png), [mobile map from the merged pilot](after-map-390.png), [mobile ranked bars](scorecard/ranking-390.png), [mobile season comparison](scorecard/season-390.png). Latest map interaction captures are retained with the browser run's screenshot artifact; expanded-state screenshots are separate.

## Source-expiry and paired-performance evidence

The unchanged NWS API advertises at most `s-maxage=900, stale-while-revalidate=3600` for a quiet report feed (75 minutes total) and the unchanged ACIS season API advertises `s-maxage=21600, stale-while-revalidate=86400` (30 hours). The client now uses conservative two-hour and 36-hour presentation cutoffs. If either response ages past its cutoff, it suppresses **only the stale current display** and keeps the original NWS archive/historical references. Time-window controls cannot reactivate old rankings. No API policy, report value, station normal or source record was modified. A dedicated browser replay aged NWS by three hours and ACIS by 40 hours; both false-current paths were blocked. [Successful stale/failure regression](https://github.com/izworskic/chrisizworski-com/actions/runs/44102271748).

Paired local Chromium measurements at 390px, using the **same recorded NWS fixtures** and the original merged pilot commit `381153e` as the before baseline, gave the following medians over three runs per version:

| Synthetic metric | Merged visual pilot | Follow-up | Difference |
| --- | ---: | ---: | ---: |
| First-contentful paint | 80ms | 80ms | 0ms |
| Data-populated answer | 176ms | 177ms | +1ms |
| Snow renderer asset size | 25,031 bytes | 29,965 bytes | +4,934 bytes |

These are controlled, small-sample local measurements, not field CWV, visitor conversion data or a guarantee of unchanged speed across devices. The follow-up adds no dependency, backend call or build stage; first answer remains HTML-first with original source links.

## Distinctiveness comparison: two adjacent tools, checked 2026-11-17

The screenshots are **first-screen mobile captures of real public pages**, not style mockups. They show different visitor tasks and compositions:

| Tool | Source and first-screen evidence | Purpose and interaction |
| --- | --- | --- |
| Michigan Snow Totals | [This pilot, 390px](scorecard/enhanced-390.png) | Past, source-attributed observer measurements; immediate 56px leading reported amount, dated observation, place ranking, regional dot map |
| Michigan Snow Depth | [Public page, 390px](scorecard/comparator-snow-depth-390.png) · [canonical](https://chrisizworski.com/michigan-snow-depth/) | Present snowpack and trip selection; editorial destination finder, visitor starting point and drive-distance choices, not an LSR ranking |
| Lake-Effect Snow | [Public page, 390px](scorecard/comparator-lake-effect-390.png) · [canonical](https://chrisizworski.com/lake-effect-snow/) | Future forecast interpretation; dark weather hero and snowbelt selectors, not ground-observed past snowfall |

**Design veto review:** the visitor's question differs (observed snowfall vs existing ground cover vs future snow), the first-screen hierarchy differs (number-first report vs trip narrative vs forecast-region picker), and the primary interaction differs (time-window + region NWS reports vs trip finder vs forecast snowbelt). Shared navigation/source quality is purposeful reuse, not a cloned skin. This earns a **provisional 5/5 distinct-composition review**. Owner preference and actual visitor reaction remain separate from this evidence.

## Scorecard evidence and remaining gap to 100

**Provisional, behavior-observed score, NOT a production release certification.** A release may not be approved simply by crossing 90; the hard gates and independent deploy smoke still apply.

| Area | Weight | Observed grade | Points | Evidence and remaining limit |
| --- | ---: | ---: | ---: | --- |
| Visitor decision | 25 | 5/5 | 25 | Direct observed answer first, timestamp, native controls and local report search |
| Distinct composition | 15 | 5/5 | 15 | Dated first-screen captures of both adjacent tools establish distinct user decision, hierarchy and interaction; owner visual approval still required |
| Causal interactions | 15 | 5/5 | 15 | Window/reversal, report bars, region/filter changes to actual map markers, season view |
| Truth/provenance | 15 | 5/5 | 15 | Existing NWS/ACIS source precision plus separately tested two-hour/36-hour stale display suppression; no API/value changes |
| Visual execution | 10 | 5/5 | 10 | Actual inspected responsive screenshots, hierarchy, accessible proportional bars, readable 56px metric |
| Mobile/keyboard/a11y | 10 | 4/5 | 8 | Five widths, keyboard focus, touch-enabled responsive context, zero axe findings, no-JS and reduced motion; manual assistive-tech study outstanding |
| Performance/resilience | 5 | 5/5 | 5 | Three-pair controlled pilot-versus-follow-up timing (FCP 80ms both; answer 176ms vs 177ms), synthetic slow mobile and tile/Leaflet/API/age expiry fallbacks; field CWV remains unmeasured |
| Integration/site integrity | 5 | 4/5 | 4 | Scope verification, existing local browser CI; final owning-repo CI and independently checked deployed SHA not yet both certified |

**Provisional total: 97/100.** Every scored category is at least 4/5. This is **not 100** and is **not release approval**. No grade was assigned for production user benefit; that is NOT MEASURED.

**Specific path to 100:** a manual screen-reader/keyboard assistive-technology check with documented findings (+2), then independently checked post-merge production HTML and source/ads/canonical/Person integrity at the exact merged SHA (+1). These remaining **3 points** cannot be awarded on a PR branch by synthetic tests alone.

## Hard gates / release status

- Completed in reviewed branch: no-JS archive, real raster tiles and missing-tile alternative, 5 responsive sizes, zero automated axe violations, keyboard focus, reduced-motion, synthetic slow network, source integrity checked against original metadata, no invented report widths, no new API or third-party runtime.
- Pending final confirmation on PR's last commit: [owning repository's full verification gate](https://github.com/izworskic/chrisizworski-com/pull/1755/checks), complete final merged-SHA deployment and public smoke, manual screen-reader check.
- Explicitly not claimed: production Vercel READY, current weather forecast skill, new traffic or CTR lift, measured Google field Web Vitals, user conversion outcome or 100/100 certification.

The decision to progress from a visual-only pilot to presentation-renderer enhancements is captured in this separate PR, not silently added to the already approved pilot. No release to the remaining site tools is authorized.
