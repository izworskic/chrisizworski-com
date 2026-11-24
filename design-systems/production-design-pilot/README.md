# Production design lab (candidate, not activated)

This private-in-repository reference gallery is outside public/. It is a component specimen, not a new visitor tool or an approved design system. Do not publish or index it. The candidate design standard and paired skill evaluation requirements remain in docs/PRODUCTION_DESIGN_STANDARD_DRAFT.md and docs/skill-evals/production-design-standard.md.

## Use
Open index.html from a complete local checkout, or serve the repository root locally and visit /design-systems/production-design-pilot/index.html. No network, build, API or paid tooling is needed. The existing shared vessel SVG factory and stylesheet are referenced, not duplicated. All displayed numbers/ages are labeled fictional fixtures. The two view switches exercise selection state only, not a real map.

Run the existing Python Playwright environment:
```sh
python3 design-systems/production-design-pilot/verify.py
# Optional existing system Chromium: CHROMIUM_PATH=/path/to/chromium python3 design-systems/production-design-pilot/verify.py
```
The script checks five widths (360, 390, 768, 1280, 1440), shared glyphs, unknown category, overflow, keyboard focus, two independent selections, reversal, stale/unavailable semantics, and no-JS fallback. It saves two screenshots in a temporary directory. It does not approve them or rewrite baselines. A reviewer must inspect the actual images. Keep the full existing repository release gate.

## Source baseline (inspected 2026-11-24)
Reference branch starts at main d63141a68a1c057518dc4ef4769a64d867f35b87. Current main at later inspection: e894441a10bd92497293df54495d5f5bab348961. These relevant source contracts were also inspected on that main.

| Component | Actual source | Status |
| --- | --- | --- |
| River sister shell and accent variants | public/assets/working-rivers-family.css | Calumet and Cuyahoga both load the same stylesheet |
| AIS classification and nine silhouettes | public/assets/seaway-vessel-icons.js | Soo, Calumet, Cuyahoga load shared factory |
| Vessel glyph colors, size bands, state styling | public/assets/soo-vessel-icons.css | Existing styles, reused by local lab |
| River selection and type count adapter | public/assets/river-watch-vessel-ui.js | Shared by the two river tools; not replaced |
| Duluth local vessel glyph | public/assets/duluth-canal.js (shipIcon, vesselPopup, candidatePopup) | One local cargo-like silhouette, not using shared factory; source-level discrepancy verified |
| Numerical hierarchy / spacing | design-systems/visual-v1/tokens.css | Snow Totals pilot only; no global promotion |
| Previous pair visual review | docs/WORKING_RIVERS_PAIRED_EXPERIENCE_20261123.md and docs/CALUMET_CUYAHOGA_MAP_POPUP_PARITY_20261123.md | Historical reports, not current live screenshots |

The next production pilot should investigate Duluth's actual type/length/speed data contract, then reuse the shared factory where supported, with unknown for missing types. Do not infer vessel type from vessel name, dimensions or a default cargo glyph. Preserve Duluth-specific departure/arrival candidate distinctions, camera actions, popup details and map behavior. Keep ETA and AIS data unchanged. Before a product PR, locate authoritative source, verify current main push CI, compare current mobile/desktop images and confirm API contract. Test representative AIS categories, missing/invalid type, moving/stopped/unknown/selected, camera and candidate actions, map selection and no-data fallback. Use the existing browser and full CI gates. This is a concrete candidate implementation assignment, not a completed production repair.

## Candidate primitives
The lab uses existing river neutrals and accents, and existing Snow Totals type/space steps as scoped examples, not approved site-wide constants. Accent variations should retain meaning and accessible contrast. Maintain consistent status and selection vocabulary but allow different visual hierarchy in a weather answer, route planner or field guide. The lab does not establish a universal typography or palette.

Static color pair calculation against WCAG contrast formula (not a browser audit):

| Pair | Ratio |
| --- | ---: |
| Primary ink on paper | 12.34:1 |
| Primary ink on surface | 13.92:1 |
| Muted text on paper | 5.59:1 |
| Muted text on surface | 6.31:1 |
| Cleveland accent on surface | 7.36:1 |
| Chicago accent on surface | 6.52:1 |
| Focus color on paper | 5.78:1 |

All seven tested pairs exceed 4.5:1; this does not establish contrast for every rendered state or component. Static source inspection confirmed the local asset paths exist, the page is marked noindex,nofollow, fixtures are labeled, and no fetch/XHR/WebSocket call is present in the lab. Source checks are not visual acceptance.

## Release state
Source inventory and seven color-pair calculations executed. Browser verifier authored, not executed against a complete checkout in this session; screenshot inspection NOT VERIFIED. Independent baseline/with-reference skill evaluations NOT VERIFIED. Main push workflow status NOT VERIFIED (available connector lookup returned no runs). Full repository verification NOT VERIFIED. Candidate gallery only, no production source or public route changed. A branch preview build may run because non-Markdown files were added; no new build step, runtime dependency, service or deployment infrastructure. No auto-merge or skill activation.
