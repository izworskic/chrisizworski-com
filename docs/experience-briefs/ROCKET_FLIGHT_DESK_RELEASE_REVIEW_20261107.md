# Rocket Flight Desk | Experience OS v1.2.1 release review

**Review date:** 2026-11-07  
**Owning repo:** `izworskic/chrisizworski-com`  
**PR:** https://github.com/izworskic/chrisizworski-com/pull/1553  
**Canonical:** https://chrisizworski.com/national-tools/rocket-launch-live/  
**Scope:** National page only, first-screen experience; six regional engines unchanged.  
**Evidence type:** dated fixture-based QA and manual inspection of JPEG screenshot previews; *not* visitor outcomes or launch-day safety certification.

## Visitor decision and original concept

The original page contained a large historical photo, countrywide atlas, detailed launch-source provenance and region-specific viewing decision. Its first useful selected-mission answer was too far below the hero. The visitor needs to distinguish the rocket's scheduled launch origin from the public viewing shore, and from the spectator's sky forecast.

Implemented concept: **Pad → Shore → Sky Flight Desk**, inside the national hero, mission-first and map-bound. It uses the same `selectedLaunchId` and one shared API response as the existing native selector, mission media, source ledger, launch-origin marker, regional access and weather. It is not a live countdown, admission authorization or simulated launch trajectory.

Rejected concept: photo-first video/countdown theatre. It would prioritize an unverified timer, a past mission photo and hypothetical ascent over actual visitor logistics.

Distinctiveness compared with two closest site experiences: the Vandenberg guide is a single-coast public-viewpoint selector; Skyway Crossing is a directional/traffic/visibility decision. Rocket Flight Desk binds a countrywide calendar and a specific rocket's pad to a **three-authority visitor decision** spanning range, spectator venue and the atmosphere. The first-screen answer, selection interaction and spatial narrative are materially different. We reuse accessibility, source/freshness and map/card synchronization standards only.

## Observed functional quality

Automated Chromium with fixture-only schedules and no claimed live access:

| Width | Initial useful answer top | Horizontal overflow | Status |
| --- | ---: | ---: | --- |
| 360px | approx. 620px | 0px | Browser journey passed |
| 390px | approx. 580px | 0px | Browser journey passed |
| 768px | approx. 518px | 0px | Browser journey passed |
| 1440px | approx. 537px | 0px | Browser journey passed |

The QA script checks at all four widths: mission A → B (date-only) → A, original picker and hero picker coherence, deep-link replay, rocket marker focus and keyboard target, source outage, no JavaScript, blocked image and disabled map tiles. It measures answer font, overflow and JS exceptions. It creates A/B screenshot artifacts; the CI logs include auditable compressed previews at all four widths, not just assertion output.

**Visual correction during review:** The first screenshot showed 11px cramped three-column step text on phones and an enormous blank historical-photo panel when remote imagery failed. The final implementation changes phone steps into a vertical, legible evidence trail with 14px text, reduces the image's desktop dominance and collapses the photo panel entirely on failure. The official attribution remains in HTML when the photo is available. The corrected image-failure state has its own browser assertion.

**Data integrity:** A launch status does not become GO from a calendar listing. Date-only entries remain time TBD. A nominally partial NWS response with every sample failed becomes **no verified mission-time viewing forecast**, not “partial forecast available.” If source checking expires, the decision is marked stale. If the selected mission disappears or the API fails, prior selectable rocket markers and Flight Desk choices are cleared. Exact pad coordinates are validated by the existing rocket map engine; regional approximations are disclosed.

## Experience OS v1.2.1 scorecard

These are **implementation QA scores**, not real-world visitor-engagement measurements. Scores are supported by code audit, browser interaction checks, and screenshot review, with explicit untested boundaries below.

| Area | Weight | Evidence grade (0–5) | Contribution |
| --- | ---: | ---: | ---: |
| Direct visitor decision | 25 | 5 | 25 |
| Distinctiveness of composition and narrative | 15 | 5 | 15 |
| Causal selection and map interactions | 15 | 5 | 15 |
| Truth, access, provenance and freshness | 15 | 4 | 12 |
| Visual execution and historical image fallback | 10 | 4 | 8 |
| Mobile, keyboard, accessibility | 10 | 4 | 8 |
| Performance and source/dependency resilience | 5 | 4 | 4 |
| Site integrity / SEO / regional link safety | 5 | 5 | 5 |
| **Total** | **100** | | **92** |

**Caveat:** Source truth is still dependent on each official publisher. Browser fixtures do not prove actual open viewing areas, operational status, weather forecasts or licensed imagery availability. Performance grade reflects bounded JS/CSS and no new upstream browser requests; field p75 CWV is not measured. Source-derived real rocket imagery is part of the existing downstream gallery and remains unchanged. The historical hero photo is not promised to load, and it cannot be treated as imagery of the selected mission.

## State and release ledger

- **A→B→A:** selected UUID, clock precision, grounded pad/approximate state, original picker, hero decision, deep link and map selection agree. Tested with actual browser selections.
- **No JS:** static safety summary and six regional source/guide links remain. An unverified schedule is never displayed as confirmed.
- **No basemap/photo:** usable coast controls and evidence links remain. Failed historical photo collapses, rather than creating an empty giant graphic.
- **Outage/stale:** mission selection disables when source unavailable and no old launch GO or access state is implied.
- **Implemented:** PR #1553.
- **Verified:** linked browser workflow and owning repo full branch gate required on final HEAD; do not treat earlier PR checks as final.
- **Deployed:** NOT VERIFIED until matching merged SHA is READY.
- **Live:** NOT VERIFIED until independently fetching public canonical HTML and new JS/CSS.
- **Visitor outcomes:** NOT MEASURED. A useful subsequent study would measure launch selection and outbound regional-source action rates without adding ad or tracking behavior now.

## Transferable lesson

**The failure:** standard source and semantic tests passed while the first screenshot revealed a narrow, microscopic three-column phone status trail and a full-height blank image panel if remote imagery was blocked.  
**The repair:** make meaningful decision details genuinely readable on phones; collapse optional media on error rather than keeping a fixed-height placeholder; assert these cases in Chromium.  
**The retest:** check all four widths, A→B→A selection, unavailable source, missing image and no-JS source links on the PR's final commit. Do not copy the Flight Desk skin to other tools.
