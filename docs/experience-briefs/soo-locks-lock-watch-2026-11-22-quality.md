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
