# EXPERIENCE_OS_V1 first completed implementation — Tahquamenon Falls

**Date:** 2026-10-31 · **Pilot owner:** `izworskic/tahquamenon-falls-live` · **PR:** https://github.com/izworskic/tahquamenon-falls-live/pull/20 · **Merged commit:** `9ab65b4ace40d60e67450c4ad9ad83ecb6bafabc`.

Canonical visitor tool: https://chrisizworski.com/tahquamenon-falls/  
Owning-repository research and release report: [EXPERIENCE_OS_TAHQUAMENON_PILOT_20261031.md](https://github.com/izworskic/tahquamenon-falls-live/blob/main/docs/EXPERIENCE_OS_TAHQUAMENON_PILOT_20261031.md) and [release review](https://github.com/izworskic/tahquamenon-falls-live/blob/main/docs/EXPERIENCE_OS_TAHQUAMENON_RELEASE_REVIEW_20261031.md).

**This is an actual implemented pattern with browser evidence, not proof of organic traffic or visitor conversion lift.** Source-only documentation here; do not copy the implementation into other products without their own source/identity/route verification.

## What we built

The existing Tahquamenon planner already supported five visit lengths, six priorities, seasonal intelligence and source-backed weather/river context. The work **kept those engines and their SEO/ad contracts unchanged** while linking:
1. A working plan with selected stops to clickable sequential stop actions;
2. Three exact-place, Commons-licensed photo cards (Upper Falls, Lower Falls and Island Bridge);
3. The original Leaflet/OSM map and selected-place source panel;
4. A full 17-stop source-linked browser, usable even with Leaflet, map tiles, or JavaScript unavailable.

The interactive explorer was deliberately positioned **directly after the itinerary**, before secondary Upper-versus-Lower comparisons and live-condition panels. A tiny ES module and scoped CSS were sufficient; no React, MapLibre, D3 or 3D migration was necessary.

Original-source corrections also mattered: groomed ski tracks cannot be advertised as winter walking routes, and seasonal shuttle scheduling must be confirmed. The 5.1-mile point-to-point River Trail is not a short car-park connecting walk.

## Source and rights trail

- Michigan DNR park details: https://www.michigan.gov/recsearch/parks/tahquamenonfalls
- Lower Falls walking routes: https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsT-Z/tahquamenon_hiking_trail_map.pdf
- Upper Falls: https://commons.wikimedia.org/wiki/File:Tahquamenon_Falls_-_Autumn.JPG (Wfgc; public domain)
- Lower Falls: https://commons.wikimedia.org/wiki/File:Lower_Tahquamenon_Falls.jpg (Joe Passe; CC BY-SA 2.0)
- Island bridge: https://commons.wikimedia.org/wiki/File:Tahquamenon_Falls_State_Park_bridge.jpg (Notorious4life; CC0)
- Credits link directly to the images. Archive photos **do not represent current access**.

## What real browser testing taught us

| Observed failure/constraint | Corrected implementation | Transferable rule |
| --- | --- | --- |
| Source syntax tests passed even with `$().forEach` selectors calling forEach on a single element | Real Playwright Chromium interaction suite caught it; fixed all selectors | **P02 test:** click and keyboard-operate actual UI at realistic sizes, don't only parse JS |
| A one-column mobile hero expanded by 17px at 360px because scrollable quick links forced grid min-content width | `minmax(0,1fr)`, `min-width:0` on hero/grid, horizontally scrollable *inside* the viewport | **A21:** test 360px HTML scrollWidth and exact culprit, never just `overflow-x:hidden` globally |
| Leaflet/CDN failure produced a huge 430px empty map with spinner though a warning existed | Failure now collapses to a compact accessible notice with DNR source links and browseable stops | **A22:** error handling must improve the **visual page composition**, not merely set text |
| Selected image panel could remain blank while lazy external image was loading | Do not reveal panel until image successfully loads; hide on error and preserve place details | **A23:** dynamic photos must have meaningful loading/error behavior |
| Photo-driven choice could scroll users to the wrong section and conceal the selected information | Scroll to actual selected-place details; on mobile map-marker click reveals information panel | **P07:** the action must carry visitors to the changed answer |
| Secondary static comparisons pushed new interactive visitor decisions well below the main plan | Move interactive map/photo choice immediately after plan | **P01:** result → action → evidence → deeper explanation, not a catalog of disconnected widgets |

## Verified browser evidence (GitHub Actions)

- Owner gate on final branch: https://github.com/izworskic/tahquamenon-falls-live/actions/runs/41207601542 (success)
- Four-viewport keyboard, reduced-motion, no-JS, map-failure QA: https://github.com/izworskic/tahquamenon-falls-live/actions/runs/41207601493 (success)
- A later documentation-only commit also passed owner and browser CI in PR #20 before merge.
- Full-page screenshots retained as workflow artifacts. Visually reviewed at **360, 390, 768 and 1440px**, including loaded map tiles, archival photographs, selected card and detail panel, and failed-map notice.
- Internal documented implementation rubric: **91/100**, not an independent usability study or a claim of real user performance. See owning repo release review.
- Post-merge production availability and field CWV must be separately checked; earlier source-only checks do not prove public deployment.

## Adoption for subsequent work

- This is an example of `P02 Map↔card synchronizer`, `P07 Narrative→map handoff`, `P06 Proof panel`, `P10 Alternatives after failure`.
- Before proposing a huge dependency migration, test whether sourced HTML, small modular JavaScript and CSS can deliver the interaction.
- Keep source/meaning separate from visual layer, and verify public access, route geometry, images and licensability independently.
- Use the source-repo brief as a reusable **research format**, not a shared color scheme or duplicated page composition.
- Repeat actual browser trials, including malformed/slow APIs, CDN failure, keyboard and reduced motion; a map request returning HTTP 200 is **not** proof of usable tiles.
- When new insights emerge, update this library; source-only docs are the living memory. A new ChatGPT session or a sibling repo does not automatically know these lessons without a repo pointer.

## Outcome limitations

We have not measured post-release organic clicks, CTR, conversion, reader preference, Core Web Vitals field p75, or actual visit satisfaction. These require observation and cannot be inferred from a successful visual test. No new route geometries or real-time park access guarantees were introduced.
