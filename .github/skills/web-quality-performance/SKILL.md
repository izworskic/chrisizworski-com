---
name: web-quality-performance
description: "Cut load cost on a page: image weight, JavaScript, fonts, third-party scripts and map assets, measured before and after on the same device. Use when a page feels slow, when a change adds images, scripts, fonts, maps or data, or when asked for a performance review."
---

# Web performance

Most visitors arrive on a phone, often on a weak signal at a trailhead or on the water. Weight and blocking work cost them the answer. Measure first, change the biggest cost, measure again the same way.

## 1. Measure

- Lab: Lighthouse or a browser performance trace on the same machine, same throttling, same page state, before and after. One run is noisy; take the median of three.
- Field: CrUX or PageSpeed Insights field data when it exists. Never claim a field gain from a lab score.
- Record total transfer, JS, CSS, image and font bytes, request count and the LCP element.

## 2. Starting budget

Preserve an existing budget if a tool has one. Otherwise start here and adjust to the tool's real needs:

| Resource | Budget (compressed) |
| --- | --- |
| Whole page, first view | under 1.5 MB |
| Our JavaScript | under 300 KB |
| CSS | under 100 KB |
| Images above the fold | under 500 KB |
| Fonts | under 100 KB |
| Third-party code we add | under 200 KB |

Auto ads load on their own schedule and are not ours to remove; report their cost separately.

## 3. Fix in this order

1. Images. Resize to the largest size actually displayed (a hero rarely needs more than 1600 px wide), compress, prefer WebP or AVIF with a JPEG fallback, and serve `srcset` and `sizes`. Always set `width` and `height`. The LCP image gets `fetchpriority="high"` and is never lazy-loaded; everything below the fold gets `loading="lazy"`. Do not use Vercel image optimization, a billed feature: commit sized files.
2. JavaScript. No blocking scripts in `<head>`: use `defer` or `type="module"`. Load map libraries, charts and widgets only on pages and states that need them. Remove dead code before adding a framework.
3. Third-party scripts. Every new one needs a reason. Load with `async`, after interaction, or behind a facade (a static preview that loads the real widget on click). A widget that fails must not blank the page.
4. Fonts. System fonts first. If a web font is needed: `font-display: swap`, preload only the one critical file, subset to the characters used.
5. Maps. Load tiles for the visible area only, show the list or text answer before the map, and keep the map library off pages with no map.
6. Data. Ship precomputed static JSON over runtime API calls where the data allows; trim fields the page never reads.

## 4. Runtime

Debounce input handlers, avoid reading layout in a loop after writing it, use `requestAnimationFrame` for visual updates, and virtualize long lists. Respect `prefers-reduced-motion`.

## Output

Before and after: bytes by type, request count, LCP element and time, lab score, and field data or NOT MEASURED. Name each change and what it saved.

## Boundaries

Cache headers, rewrites and image settings live in `vercel.json`; change them only in a reviewed PR checked with `vercel-cost-guard`. Preserve Auto ads, canonical and Person identity and visible answers. No Redis, paid CDN or new dependency. Open a PR; do not auto-merge.

## Sources

Adapted from addyosmani/web-quality-skills, `performance` (MIT): budgets, loading order, image, font and third-party patterns, rewritten for this repository. Reference only.
