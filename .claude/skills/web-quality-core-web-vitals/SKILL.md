---
name: web-quality-core-web-vitals
description: "Diagnose and fix LCP, INP and CLS with field data first and lab data second, tied to the exact element or interaction. Use when a change could affect loading, layout shift or interaction speed, when Search Console or PageSpeed reports a Core Web Vitals problem, or when asked about Core Web Vitals."
---

# Core Web Vitals

Google judges a page by what real visitors experience at the 75th percentile, over a rolling 28 days. A green lab run does not make a failing field metric pass.

## 1. Thresholds (75th percentile, field)

| Metric | Good | Needs improvement | Poor |
| --- | --- | --- | --- |
| LCP, Largest Contentful Paint | 2.5 s or less | up to 4.0 s | over 4.0 s |
| INP, Interaction to Next Paint | 200 ms or less | up to 500 ms | over 500 ms |
| CLS, Cumulative Layout Shift | 0.1 or less | up to 0.25 | over 0.25 |

## 2. Measure

- Field first: Search Console Core Web Vitals report, PageSpeed Insights or CrUX for the URL, or the origin when the URL has too little traffic. Note the window and phone versus desktop.
- Lab second, to find causes: Lighthouse or a performance trace. Lab has no real INP (Total Blocking Time is a rough proxy) and usually misses shifts that happen after load, such as ads, late feeds and maps.
- When field and lab disagree, field wins for the verdict and lab helps find the cause. Say which is which in every report.

## 3. Find the element or interaction

- LCP: name the LCP element (usually the hero image or the first answer block). Check in order: slow server response, render-blocking CSS or JS, the image discovered late (put a real `<img>` in the HTML with `fetchpriority="high"`; preload only if the trace shows late discovery), and content that waits for client JavaScript. Never lazy-load the LCP element.
- INP: name the interaction (filter tap, map pan, search typing). Look for long tasks over 50 ms after the input: heavy re-render of the whole list or map, synchronous JSON parsing, layout thrash. Debounce typing, update only what changed, yield between chunks of work.
- CLS: name what moves. Usual causes here: images without `width` and `height`, a feed or map that loads and pushes the answer down, a banner inserted above content, web fonts swapping with different metrics, and ad units. Reserve space with `aspect-ratio` or a fixed-height container for anything that loads late.

## 4. Ads and layout shift

Auto ads place units on their own. Report ad-caused shift with evidence (the trace shows the ad container moving the answer). Do not remove the loader, disable Auto ads or move units yourself; placement and exclusions are the owner's AdSense settings (`docs/AUTO_ADS_NETWORK.md`).

## 5. Verify

Re-run the same lab check to confirm the cause is gone, then say the field result will show over the next 28 days. Do not claim a field pass until the field data shows it.

## Output

Per metric: field value and window (or NOT MEASURED), lab value, the element or interaction responsible, the fix, and what was re-verified.

## Boundaries

Experience OS, Playwright Browser QA and owning-repository tests remain authoritative. Preserve Auto ads, canonical and Person identity. No new dependency or paid monitoring. Open a PR; do not auto-merge.

## Sources

Adapted from addyosmani/web-quality-skills, `core-web-vitals` (MIT): thresholds, measurement sources and per-metric checklists, rewritten for this repository. Reference only.
