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

## Scorecard evidence and remaining gap to 100

**Provisional, behavior-observed score, NOT a production release certification.** A release may not be approved simply by crossing 90; the hard gates and independent deploy smoke still apply.

| Area | Weight | Observed grade | Points | Evidence and remaining limit |
| --- | ---: | ---: | ---: | --- |
| Visitor decision | 25 | 5/5 | 25 | Direct observed answer first, timestamp, native controls and local report search |
| Distinct composition | 15 | 4/5 | 12 | Observation-centric numeric editorial layout differs from forward-looking lake-effect and snowpack tools; independent side-by-side owner review still needed |
| Causal interactions | 15 | 5/5 | 15 | Window/reversal, report bars, region/filter changes to actual map markers, season view |
| Truth/provenance | 15 | 4/5 | 12 | Existing NWS/ACIS sources, measured vs estimated, report time, normal eligibility; stale-data expiry policy not changed without authorization |
| Visual execution | 10 | 5/5 | 10 | Actual inspected responsive screenshots, hierarchy, accessible proportional bars, readable 56px metric |
| Mobile/keyboard/a11y | 10 | 4/5 | 8 | Five widths, keyboard focus, touch-enabled responsive context, zero axe findings, no-JS and reduced motion; manual assistive-tech study outstanding |
| Performance/resilience | 5 | 4/5 | 4 | Mobile synthetic FCP and throttled answer, no-tiles/Leaflet/API fallbacks; no comparable field LCP/INP/CLS cohort or controlled pre/post performance baseline |
| Integration/site integrity | 5 | 4/5 | 4 | Scope verification, existing local browser CI; final owning-repo CI and independently checked deployed SHA not yet both certified |

**Provisional total: 90/100.** Every scored category is at least 4/5. This is **not 100** and is **not release approval**. No grade was assigned for production user benefit; that is NOT MEASURED.

**Specific path to 100:** independent side-by-side distinctiveness review (+3), authorized stale/freshness failure contract and test (+3), real screen-reader/keyboard manual completion (+2), comparative field or controlled baseline performance evidence (+1), and merged-SHA production smoke including ads/canonical/Person source integrity (+1). Those 10 points require new evidence or explicit approval, not score inflation.

## Hard gates / release status

- Completed in reviewed branch: no-JS archive, real raster tiles and missing-tile alternative, 5 responsive sizes, zero automated axe violations, keyboard focus, reduced-motion, synthetic slow network, source integrity checked against original metadata, no invented report widths, no new API or third-party runtime.
- Pending final confirmation on PR's last commit: [owning repository's full verification gate](https://github.com/izworskic/chrisizworski-com/pull/1755/checks), complete final merged-SHA deployment and public smoke, manual screen-reader check.
- Explicitly not claimed: production Vercel READY, current weather forecast skill, new traffic or CTR lift, measured Google field Web Vitals, user conversion outcome or 100/100 certification.

The decision to progress from a visual-only pilot to presentation-renderer enhancements is captured in this separate PR, not silently added to the already approved pilot. No release to the remaining site tools is authorized.
