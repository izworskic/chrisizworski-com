# Technology selection — visitor outcome before framework

**Policy:** Existing tool and site architecture win unless a small, justified enhancement demonstrates otherwise. An attractive demo is not a reason to migrate the site.

## Choice tree

| Need | Prefer first | Introduce more only when evidence requires it |
| --- | --- | --- |
| Static first answer, cards, editorial story | Server/build-rendered HTML + scoped CSS | Never require JavaScript for useful answer/source/canonical |
| Selection, tabs, filters, simple date input | Small dependency-free TypeScript/JavaScript, native controls | React *island* only for repeated interdependent application state; no whole-site migration |
| Geolocated destinations and shapes | Existing working CARTO/Leaflet/OSM fallback; existing map contracts | MapLibre GL JS for vector layers, verified terrain or synchronized time/filter events, after device/test evidence |
| Dense points, animated large geographic data | GeoJSON, clustering, simple efficient map layers | deck.gl after counting points, profiling, and ensuring map accessibility/list fallback |
| Charts and comparisons | Accessible semantic table/HTML, SVG, existing chart code | Observable Plot for standard charts; D3 for custom linked interactions only |
| Panel transitions | CSS transitions and native disclosure where adequate | Motion where complex gesture/layout choreography materially improves comprehension; honor reduced motion |
| Immersive 3D | Photographs, elevations and static/2D maps first | Three.js / Cesium-style 3D only for genuinely spatial visitor questions and capable-device fallback |
| Expensive geographic, numerical or ETL compute | Existing build-time JS/Python and cached API feeds | Rust/WASM/server computation only after profiled bottleneck or genuine safety/precision advantage |
| Component workshop | Existing manual fixture/browser tests | Storybook when enough shared interactive components justify tooling and CI cost |

### Purposeful motion, not an animation mandate

Before adding transitions, evidence overlays, scroll-linked storytelling, Motion, GSAP, Rive or WebGL, follow [Purposeful motion & interactive storytelling](PURPOSEFUL_MOTION.md). The visitor's selected time/place and source truth are authoritative; visual transitions only explain discrete, verified state changes. No automatic parallax or promotional animation. Compare CSS/vanilla JS before any third-party dependency. Test reduced motion, fast scrubbing/async races, keyboard, no-JS and failure states.

### React, not dogma

React officially supports gradual adoption in an existing app. Use a scoped component mounted into static HTML if state complexity justifies it. **Do not** add a giant React bundle to every tool, mandate Next.js, or force React where a small browser module suffices. Source: https://react.dev/learn/installation

### Maps and the existing CARTO problem

MapLibre is an optional visualization engine, not a basemap provider or license to assume a CARTO key works. Before switching:
- Audit deployed environment variables, whether the style/tile endpoint is publicly authorized for browser use, layer types, actual tile coverage and map CSS/container height.
- Verify tiles across zoom levels and places, selection/keyboard events, popups, touch hit targets, full attribution, source freshness and a **real** OSM/list fallback.
- Do not silently use a different unlicensed provider or load blocked tiles. Keep directions grounded in verified public roads/parking; park boundaries are not route permission.

Sources: https://maplibre.org/maplibre-gl-js/docs/ ; https://maplibre.org/maplibre-gl-js/docs/examples/ ; https://deck.gl/docs

### Charts, animation and 3D

D3 is a low-level library excellent for custom visual semantics but not the default for ordinary bar charts; the project itself recommends Observable Plot for routine statistical charts. Motion supports React animations but native CSS often costs less; prefer transforms/opacity and `prefers-reduced-motion`. 3D demos can make geography comprehensible, but must not displace trail closures, parking and legal access information.

Sources: https://d3js.org/what-is-d3 ; https://observablehq.com/framework/lib/plot ; https://motion.dev/docs/performance ; https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions

### Performance truth

Use Google CWV **good** thresholds as goals for p75 real-user field data: LCP <=2.5s, INP <=200ms, CLS <=0.1. Also compare changed page/device baseline, JS transferred, main-thread blocking and image byte size. Lab captures are diagnostics, not evidence of real-user percentile compliance.

- Responsive `srcset/sizes` images with correct dimensions; load hero appropriately, lazy-load below-fold photography; avoid eager iframe and huge WebGL bundles on first render.
- Defer optional maps/3D/animation after useful content; allow failure without blocking.
- Cache bounded source snapshots with issue and retrieval timestamps. **Do not introduce Redis.**
- Do not change AdSense loader/settings without explicit authorization.

Sources: https://developers.google.com/search/docs/appearance/core-web-vitals ; https://web.dev/articles/serve-responsive-images/ ; https://web.dev/articles/optimize-inp

### Library vetting checklist

Before adding a dependency, record: concrete visitor requirement; current local alternative; maintenance status, license and attribution; API and browser compatibility; added JS/CSS bytes; security/privacy; performance on low-end Android; fallback and removal plan; tests in the owning repo. No dependency requirement is created by this document.
