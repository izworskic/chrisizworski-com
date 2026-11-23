# Working Rivers Pair: Calumet + Cuyahoga visual coherence

**Mode:** Experience Investment IMPLEMENT (review → select → scoped implementation). **Owner:** \`izworskic/chrisizworski-com\`. **Primary visitor job:** Find a reported vessel and a public place to see a working river, then understand the local river/bridge engineering.

## Verified baseline, 2026-11-23

Both site pages were read and their publicly rendered first desktop and 390px phone screenshots inspected. Calumet had a large full-bleed dark gradient, circular GL logo, gold title, 10px dark map frame, wide floating overlay label, two simple viewpoint buttons and ship reports *after* viewpoints. Cuyahoga had a light lead, squared GL logo, teal Georgia title accent, 1px light map frame, taller park entries with direct Google Maps links, and recent ships *before* viewpoints. Both already had the same trusted AIS silhouettes and type-count adapter. This is a real paired-tool recognition gap, not a need for another tracker.

Baseline mobile screenshot: Calumet's map began about halfway down the first phone screen, below a large dark hero; Cuyahoga's map was reached earlier and surfaced ship reports prominently. These screenshots were visually inspected in the connected browser; capture sizes were 390×844 and 1920×1080. Exact click depth and Core Web Vitals: **NOT MEASURED**.

## Two credible directions

**A. One unified city-switching live river explorer.** One route, the same primary layout and controls, city tab swaps a source/guide and interpretive model. First phone screen: city selector + current reported ships + map; desktop: one map/list layout; missing AIS: explicit unavailable state. Benefit: lower future duplicate UI maintenance. Cost: large migration, more state coupling, risk to distinct noindex routes, separate AIS source-scopes, Chicago industrial public-place qualification, Cleveland parks and both educational diagrams. Not selected now.

**B. Two sister river desks, same navigation and evidence grammar, distinct places and mechanism stories.** First phone screen: consistent small header, Chicago/Cleveland switch, compact light lead and observation card, then map. Desktop: matching width, map frame and right-side evidence→viewpoint→selected detail flow; shared source age, type counts, list buttons, map framing and failure patterns. Calumet still calls out lift bridges and Chicago's industrial canal with brass accents; Cuyahoga still teaches the bends and offers more public parks with freshwater-teal accents. Minimal new CSS and Calumet-only JS framing use the current map/data. **Selected**, small-to-medium surface risk, high reuse, no added production cost.

## Implemented changes

- One stylesheet **\`public/assets/working-rivers-family.css\`**, loaded last and scoped to \`body.river-family\`, with two subtle accent variants. Shared nav/header, hero hierarchy, status evidence, cards, map frame, list typography, source/type controls, mobile shell, focus outline and footer. No global CSS changes or new runtime.
- Both headers have the same accessible cross-river Chicago/Cleveland switch with \`aria-current\`. Brand and ship-tracker navigation retained; reciprocal links in both footers. Neither current page is indexed yet (\`noindex,follow\` unchanged).
- Calumet right side now follows the same ship reports → viewpoint choices → selected visitor details order as Cuyahoga. Its two existing viewpoint buttons carry grounded **direct Google Maps** links to general public areas; this is not a promise of safe entrance, parking or sightline. All original source material and industrial safety qualifiers remain.
- Calumet gets working **Show ships / Viewing places** framing controls, using the current fresh local AIS report and authoritative existing public-area points. The same logic is already on Cuyahoga. Both have manually expandable source-scoped vessel type counts. Empty or stale AIS disables the ship framing control, never claims the river is empty.
- Calumet's bascule/vertical-lift schematic and Cuyahoga's ship-turning lesson, licensed Sam Laud photography, park illustrations, map pins and Coast Pilot reference data remain purposely distinct and unchanged.

## Technology Fit Review

| Candidate | Judgment | Why |
|---|---|---|
| Semantic HTML + scoped CSS | **Keep / expand** | Accounts for the visual drift and information order with no new network requests, no runtime or CSS changes elsewhere |
| Browser JS | **Keep / small extension** | Only Calumet's map framing actually changes answer/state; reuses its existing Leaflet layers and source guard |
| Existing Node / Vercel APIs | **Keep unchanged** | Current regional Cleveland/Calumet fresh AIS adapters already work, no new source required |
| Python | **QA only** | Existing Playwright suite uses Python; no visitor-facing Python needed |
| Rust/WASM | **Reject** | No measured CPU/geospatial bottleneck |
| Java | **Reject** | A new JVM service doesn't help static layouts or map state |
| Images, 3D, new frameworks | **Reject** | Adds weight without helping route recognition; reuse existing real licensed Cuyahoga photo |

**Performance benchmark:** not measured; no claim of faster load or higher CTR. **Rollback:** revert this PR (shared style, two page edits and Calumet map controls) without altering any source feeds.

## Protected contracts and QA

No modifications to \`/api/freighter-ais\`, scripts for Soo/Duluth, Google/OSM licenses, person JSON-LD, canonical URLs, robots/noindex, sitemap, auto-ads settings, published Coast Pilot records, live time/source definitions, privacy, parking qualification, viewport gestures, or existing engineering demonstrations. No new site dependencies, build steps, Vercel Functions, Redis or paid providers.

**Before merge:** run Node \`tests/working-rivers-family.test.js\`, existing Calumet/Cuyahoga/AIS tests, \`npm run verify:all\`, and actual Playwright before/after at 360/390/768/1280/1440 with map tiles, nav, keyboard, type filtering, two-way framing, no-JS, source outage/stale and overflow. Inspect screenshot artifacts; do not infer scores or user outcomes from a mere passing unit test.

**After merge:** verify production on both canonical URLs and crosslinks, confirm deployed new stylesheet; launch is separate from merge.
