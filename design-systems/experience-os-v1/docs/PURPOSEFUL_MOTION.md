# Purposeful motion & interactive storytelling — Experience OS v1.2

**Standing principle:** Standardize the quality. Never standardize away the imagination.

Motion is a **capability, not a house style**. A tool may have no animation at all. Introduce motion only when it helps someone understand a real state change, compare options, locate evidence, or follow a verified progression. A memorable signature interaction is a design opportunity, **never a release requirement**.

## Decision hierarchy

1. **Truth before animation.** Name the visitor question, actual selected ID/time, source issue and valid time, and exactly what changes. A transition may visually follow a source-backed selection; it must not invent intermediate snowfall, ship positions, traffic movement, terrain or closures. Distinguish observed playback, discrete forecasts, and interpretation.
2. **One causal selection spine.** Map, timeline, explanation, cards, photo, and source qualifier update from the same chosen state. For async results, invalidate obsolete requests/frames; show a verified prior frame as *prior* during loading, or show unavailable. Never animate an unverified new result as though it exists.
3. **Progressive enhancement.** Useful answer, official evidence and next action survive without motion, JavaScript, third-party libraries, WebGL or tiles. Make the interaction reversible (A → B → A), with direct native controls, visible focus, keyboard and single-pointer equivalents.
4. **Motion preferences & control.** Respect `prefers-reduced-motion: reduce`, including transitions, playback and scroll effects. Don't autoplay storytelling. Play/pause must stop on navigation, tab hidden, change of subject and data failure. Do not use motion as the sole carrier of meaning; announce discrete selected state thoughtfully, not every playback frame.
5. **Performance budget.** Prefer transform/opacity or lightweight CSS; never animate layout geometry while users operate a forecast. Evaluate optional Motion or GSAP only with a documented advantage over existing vanilla JS/CSS. Lazy-load substantial libraries, canvas, 3D, fonts and media *after* the first useful answer. Check small-screen and slower-device performance and p75 CWV where measured (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1); do not infer field success from lab tests.
6. **Originality requirement.** Select a visual language, interaction and editorial voice around the *specific visitor decision*. Do not paste the same scrolling effect, card reveal or parallax onto every tool. Compare with two existing tools; explain differences. Motion must not substitute for intelligence or real photography.
7. **Site integrity.** Do not alter advertising, canonical/Person JSON-LD, analytics, privacy, source licensing, map rights, redirects, or page ownership to make an effect work.

## Technology ladder

| Need | Default | Consider when justified | Reject when |
| --- | --- | --- | --- |
| Control response, status change, discrete time marker | Native CSS + existing JS; `prefers-reduced-motion` | Motion for complicated layout/gesture continuity | A fade hides an updated answer or adds delay |
| Sequenced educational story with multiple connected states | Native state machine, static steps | GSAP/ScrollTrigger with accessible independent controls | Scroll drives data changes without a readable alternate |
| Illustration communicates a mechanism | Static SVG/CSS | Rive/Lottie with documented asset rights and no external blockers | Decoration overwhelms the tool's answer |
| Spatial terrain, crowds, objects | Verified image, map or 2D graphic | Three.js/WebGL only after factual, usability, device and fallback review | 3D creates fictional routes or blocks first paint |

No library is mandated. For any dependency record the package, purpose, license, added JS bytes, failure fallback, current maintenance, attribution, and security review.

## Mandatory motion test matrix

- **A → B → A**: selected time/ID, live/forecast labels, cards, timeline position, map/graphic and source agree at all stages.
- **Reduced motion**: animation and auto-play suppressed, all information and manual navigation available; no missing explanation or focus trap.
- **Fast scrubbing and async race**: rapid A → B → C only presents evidence for C; no stale overlay, photo, map or text on screen as though current.
- **Unknown/stale/offline**: no pleasant or dangerous verdict manufactured from absent evidence; known unknown is explicit and prior data labeled.
- **Mobile/keyboard**: 360/390/768/desktop controls work without horizontal body overflow; slider arrows and button equivalents available, no hover-only states.
- **No motion/no JS**: meaningful, source-linked static answer remains and canonical/ad semantics are unchanged.
- **Data/interaction performance**: compare payload size, scripting time, visual stability and real/lab Core Web Vitals without claiming unmeasured outcomes.
- **Uniqueness check**: document why this motion makes sense for this tool, not a cloned cross-tool signature.

### Reference sources

- W3C WCAG 2.2, animation from interactions: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions
- MDN reduced motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- Motion performance: https://motion.dev/docs/performance
- GSAP: https://gsap.com/docs/v3/
- Core Web Vitals: https://web.dev/articles/vitals

## First validation pilot — Lake-Effect Snow

Owning implementation: `izworskic/national-snowpack-melt`; visitor URL: https://chrisizworski.com/lake-effect-snow/.

Use the existing NWS 72-hour comparative *point* forecasts and time lens. A lightweight, semantic evidence ribbon may show discrete three-hour samples for the two selected NWS checkpoints while a selection needle follows the existing slider. This **does not** move or predict narrow lake-effect snowbands, substitute observed radar, or guarantee road access. Check source freshness, missing hours, return to the first selection, reduced motion and keyboard. Keep the independent NOAA geographic grid and WPC 24-hour probability layers distinct. Repo-specific browser tests and release gates remain authoritative.

**Review state:** document is an adopted proposal only when the PR containing it merges; a pilot PR is not production evidence.
