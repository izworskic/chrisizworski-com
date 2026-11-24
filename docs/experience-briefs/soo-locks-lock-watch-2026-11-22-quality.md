# Soo Locks: Web Quality pass (2026-11-22)

Companion to the 2026-11-22 addendum in `soo-locks-lock-watch-2026-11-21.md`. It uses the Web Quality skills introduced in #1840 (web-quality-audit and web-quality-accessibility), with the pinned versions from the pilot (`playwright@1.56.1`, `@axe-core/playwright@4.10.2`, `@lhci/cli@0.16.0`) installed outside the repository. Lab and source measurements only; no field data was read.

## axe-core, WCAG 2.0 to 2.2 A/AA, whole page at 390 and 1280 px with the Lock Watch fixture loaded

| Region | Before | After |
| --- | --- | --- |
| `#soo-lock-watch`, `#soo-next-ship`, `#soo-schedule-answer` | 0 | 0 |
| `#soo-lock-sim` | 1 serious: `scrollable-region-focusable` (`.lock-stage` scrolls sideways under 640 px but could not be reached by keyboard) | 0 |
| Whole page | 3 serious rule types: `color-contrast` (breadcrumb and footer #999 at 2.7:1, captions #888 at 3.28:1, photo credits 3.69:1, stat labels 3.54:1, camera note 4.49:1), `link-in-text-block` (prose links identified by colour only), the stage above | 0 |

Fixes are page-scoped. One added `<style>` block darkens those greys to at least 4.5:1 and underlines unclassed links inside paragraphs and the footer. `.lock-stage` gets `tabindex="0"`, `role="region"`, an accessible name and a visible focus ring. The four lock cards move from `h4` to `h3` (Lighthouse `heading-order`) with identical styling. The axe scan is now part of `tests/soo-lock-watch-browser.cjs` and its CI workflow, after interaction, at 390 and 1280 px.

## Lighthouse lab (local static server, external hosts unavailable, no ads, no live data)

| Category | Score |
| --- | ---: |
| Performance | 97 (FCP/LCP 2.0 s, TBT 20 ms, CLS 0) |
| Accessibility | 97 before, 99 after |
| Best practices | 96 |
| SEO | 100 |

Remaining, deliberately not changed here:
- `landmark-one-main`: the page template has no `<main>`. That is a site-template change, outside this tool.
- `errors-in-console`: 404s for `/api/*`, which the local static server does not serve. A lab artifact.

Field Core Web Vitals, AdSense effect and real screen-reader behaviour: NOT MEASURED.

## Follow-up the same day: live-only findings (PR after #1844)

A live axe run on production found two issues the offline scan could not see, because they need the real camera and real AIS traffic.

1. **Camera credit contrast.** The live river-camera credit was faded by `opacity:.6` to 3.45:1, and its link to 2.84:1. Fixed in the page-scoped block (opacity 1, #5f5f5f).
2. **Overlapping vessel markers (WCAG 2.5.8 target size).** The live check found CGC BUCKTHORN, NAUTICA QUEEN and RJ PEARCE moored almost exactly on top of one another. The smallest symbol is already 38×29 px, so size was not the problem. On a touchscreen only the top boat could be tapped. Map position is essential, and every vessel already has a full-size button in "Vessels near the locks". The fix adds a chooser: a tap or click where symbols overlap opens "N vessels are reported at this spot. Choose one:" in the single shared popup, and focus moves into it.

Fixing those turned up three more defects, all now fixed and tested:

- **Enter and Space did nothing on a focused marker.** Leaflet 1.9.4 opens only `bindPopup` popups from the keyboard, and #1837 switched to a hand-opened shared popup. Markers were `role="button"` tab stops that could not be activated. Enter and Space are now wired.
- **Popups opened from the vessel list sat under the zoom buttons.** The animated `setView` suppressed Leaflet's auto-pan. The jump is now instant, the popup has auto-pan padding clear of the controls, and it is capped at 240 px so it fits a 390 px phone.
- **The browser test never loaded Leaflet's stylesheet.** The page loads Leaflet cross-origin with SRI. The test served a vendor copy with different line endings and no CORS header, so the browser dropped the CSS, and no marker could be clicked in any scenario. The test now serves the byte-identical `public/assets/leaflet-1.9.4.*` with `access-control-allow-origin`.

`tests/soo-lock-watch-browser.cjs` now adds two boats moored on the tug, a camera fixture, and a real-clock scenario. Leaflet ignores pointer clicks while Playwright's clock is frozen. The scenario covers the three-boat chooser and its focus, the chooser and detail sharing one popup, Enter on the tanker, Space on the unknown vessel, popup clearance from the zoom buttons and the map edge, and one list button per marker. The whole-page axe scan now includes the camera credit. `target-size` runs on every control except the map markers, which are covered by the chooser and the equivalent list as documented in the test.

## Evidence-qualified arrival planning follow-up (2026-11-24)

The decision-time research (#1941 and #1948) did not support deployment of new numerical margins. The rolling experiment also found frequent withdrawal/revision opportunities. A concrete existing defect was identified in source: a failed refresh retained the prior pick and chamber-now banner in the card; the planner still ranked the old windows; lazy map initialization rendered the previous snapshot as successful. This could present a prior estimate as current. Fix the state contract, not the predictor. A failed refresh now withholds the arrival card and planner lineup, preserves recent last-known map positions and ages without chamber-now annotations, and restores the existing planning view only on a successful refresh. Carry the failed flag through lazy map initialization. Explain that an arrival window is a planning estimate and check movement before leaving. Existing UI layout, canonical, schema, ads, map interactions, navigation, API and prediction mathematics are unchanged. No new dependency or runtime cost. Targeted correction rather than a redesign; existing HTML/JS suffice, no Python/Rust/Java or new backend. Regression: first successful check, failed refresh, map reference and successful recovery, plus the existing browser matrix. No new accuracy claim or independent outcome validation. Browser and repository CI pending.
