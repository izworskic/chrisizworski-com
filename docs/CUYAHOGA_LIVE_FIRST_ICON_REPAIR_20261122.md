# Cuyahoga Freighter Watch: live-first repair / Experience Investment

Date: 2026-11-22. Owner: `izworskic/chrisizworski-com`. Canonical page: `/cuyahoga-freighter-watch/`. This remains a **noindex** tool under review.

## Visitor job and diagnosis

The visitor wants to find a public Cleveland river viewpoint, inspect the latest *available* AIS observation, and understand why long ships negotiate the Cuyahoga's tight bends. A recent screenshot audit of PR #1859 at 390 and 1280 px shows an attractive but confusing archive-versus-live switch occupying first-screen space. Rotated *side-elevation* ship art could appear upside down, because a side view is not a suitable orientation glyph on a north-up map. No historical AIS sample predicts the next passage.

Baseline: merged PR #1859 and its five-width browser screenshots (artifact from green workflow 45089780053). The public deployment and live AIS reception were **not** verified as part of this repair. Current AIS values were not fabricated.

## Experience opportunities considered

1. **Repair directional evidence.** Reuse current AIS positions, use overhead rather than side views, and distinguish course over ground from heading. High visitor benefit, low implementation complexity.
2. **Remove stale first-level navigation.** Do not make a three-day July/August 2025 archive compete with 2026 observations. Do not fetch it into the live page; retain the published NOAA source-derived dataset separately for research and future historically labeled tools.
3. **Keep the shore decision connected.** Pair real public viewing areas, last observations and the selected ship dossier, with an explicit unavailable/source-expired state. Never infer sightline, bridge opening or ETA.

## Two materially different directions

**A. Live river observation desk (selected).** First phone screen: current feed age, an immediately visible map, clear green public park markers, and blue source-backed recent vessel symbols. Action: choose where to stand or inspect one recently reported vessel; changed selection updates the list, map and detail. Without fresh AIS: keep all verified parks, show source failure, never imply an empty river. Implementation: modify existing HTML, JS, scoped CSS and browser acceptance.

**B. Immersive historical route school (rejected for this route).** First phone screen: a clear *historical* date, archive voyage selector and time index in one explanatory map; current shipwatching would be a separate linked action. It could teach past passage geography, but fails the immediate visitor's question and makes an old example too prominent. A separate, explicitly archival tool would be the correct owner if ever justified.

Closest existing tools: `/great-lakes-freighter-tracking/` (five-lake AIS orientation and search) and `/soo-locks/` (named ship-watching corridor). The river tool is distinct in its verified park-driven local selection, linked bridge *landmark* context and optional bend physics illustration; it should not duplicate the lake-wide tracker or make unsupported Soo-style timing claims.

## Source and icon contract

- The only live source remains `/api/freighter-ais`, classified under the existing 30-minute core threshold.
- Overhead illustrated shapes reflect **reported broad vessel category** and **reported length band**, never actual hull geometry or a to-scale map feature.
- If speed over ground is greater than 0.5 knots and bounded COG is present, orient the overhead symbol as **travel direction**. East 90° = right, north 0° = up; this is explicitly **not verified bow heading**.
- For missing, slow or unknown motion, show a symmetric neutral AIS position dot; never invent a direction.
- Source basis: USCG AIS Class A messages distinguish COG from true heading: https://www.navcen.uscg.gov/ais-class-a-reports . NOAA explains historical archive provenance and caveats: https://coast.noaa.gov/accessais/ .
- The four shore references remain from Cleveland Metroparks; approximate park pins are **not** surveyed entrances, guaranteed sightlines or approved parking.

## Technology Fit Review

| Technology | Decision | Why |
| --- | --- | --- |
| HTML + scoped CSS | Keep | First-screen public places, legend, source disclosure, accessible no-JS answer |
| Existing browser JS + Leaflet/SVG | Keep | Change actual vessel glyph orientation and synchronized map/list/detail; no new runtime |
| Existing Node AIS endpoint | Reuse unchanged | Already centralizes public AIS data/age gate; no new upstream service |
| Python | Reject for production | No computational need beyond existing QA scripts |
| Rust/WASM | Reject | No measured CPU bottleneck or geometry solver needed for SVG shapes |
| Java | Reject | No integration or operational need; disproportionate infrastructure |
| External paid services, Redis | Reject | No visitor benefit or approved budget for this fix |

No change to server functions, data provider, API, canonical, Person metadata, AdSense policy, map tile provider, archived source files or published image license. Rollback is a revert of this isolated PR.

## Acceptance and evidence

Tests should verify 360/390/768/1280/1440 px, map tile presence, keyboard/selection, reported moving east and north glyph angles, stopped neutral glyph, the park → ship → park reversal, bridge → public park, outdated AIS failure, no historical control/fetch in the live route, optional model reduced-motion behavior, no-JS park links, and accessibility. Do **not** infer a browser pass from source inspection.

**Current evidence status:** baseline screenshots personally inspected from prior run; new-browser screenshots and full CI: **NOT VERIFIED until new PR workflows finish**. Live-public deployment, independent upstream AIS reliability and actual visitor outcome: **NOT VERIFIED**. Scorecard categories cannot be graded until the new captured browser states are examined. Distinctiveness review: material change to evidence hierarchy and correct directional representation rather than a decorative recolor. PR remains unmerged until reviewed.
