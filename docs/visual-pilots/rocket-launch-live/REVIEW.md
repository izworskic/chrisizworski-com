# Rocket Launch Live | Penpot pilot 01: Mission to Shore

**Status:** Design prototype and Penpot-importable SVG committed to GitHub. NOT a Penpot MCP edit, implementation release, or a production change.

**User assignment:** After the Penpot integration PR was merged, run the first Rocket Launch Live design pilot. The owner said Penpot is ready in their environment. This ChatGPT session does not expose Penpot MCP tools, and the connected browser requires a separate originating browser session. Do not claim that a Penpot file, component library or authorized design session has been inspected.

**Canonical visitor tool:** https://chrisizworski.com/national-tools/rocket-launch-live/

**Actual source paths:** `public/synced-national-tools/rocket-launch-live/index.html`, `app.js`, `styles.css`, and `public/assets/rocket-map-pins.js`. Preserve the site's central canonical, flight identity, published schedule precision, ads and original sources. Check `AGENTS.md` before changing any live source.

## Visitor question

"I've selected a mission at Wallops. Where can I watch from a public place, and what must I check before driving there?"

The **existing production** already has launch-calendar selection, region-specific access quick answers, documented place choices and directions to eligible public places. The new design must not claim a new feature or duplicate an existing planner. The opportunity is **visual hierarchy and completion of the visit-planning decision**, not a new backend.

## Baseline and competing concepts

The source baseline is the previously merged mission-bound viewing planner (#1745) and map-copy refinement (#1746). Reviewed repo source and previous browser fixture screenshots show the current list-and-dossier approach with a large green header and boxes. It's useful but it places all locations above the final arrival action on phones, while the hero does not clearly carry the selected mission into a visitor decision.

1. **Concept A, Mission to Shore, selected for the pilot.** A strong single headline, compact selected-mission context, native selectable places, a calm focused place explanation, and two real next steps: find the geographic place and check the responsible authority. Replaces repeated cautions with one contextual access message next to the selected location. No extra national map panel. Desktop and 390px phone frames share the same selected-place vocabulary without cloning the full page.
2. **Concept B, Atlas-first arrival map, not selected.** A region-scale launch map with nearby public pin clusters and a live travel card. It would provide stronger visual location comparison but available six-coast data lacks consistently verified visitor entry and parking coordinates. Until the public-place geodata contract is proven, this would risk pointing people toward restricted pads or manufacturing travel time.

The **two closest existing tools** are (1) the current national Rocket Launch Live place cards and (2) the Vandenberg location-first planner. Concept A differs from the current national list by aligning mission identity, candidate choice and the next action in one focused composition. It differs from Vandenberg's geographic map-first comparison by making **source authority and arrival verification**, not proximity, the central visitor decision. Shared parts are the same source-approved place IDs, verified location search, official-link chain, accessibility, visual tokens and mission reset; no competing source is created.

## Deliverables

- `preview.html`: standalone, responsive, interactive **prototype** with three sample Wallops destinations drawn from the existing source/test vocabulary. The selected place changes title, description, source caution, Google Maps place search and local authority link. It uses no API, analytics, network fonts or production assets; it is intentionally `noindex` and not linked from any public page.
- `mission-to-shore.penpot.svg`: a high-fidelity **editable text/vector import source** with desktop and mobile frames in one asset. All locations are examples and do not prove access on launch day. Importing SVG does **not** create native Penpot components automatically or connect the MCP.
- `tests/rocket-penpot-pilot.test.js`: source contracts protecting navigation intent, no false pad routing, no live-data claim, basic mobile CSS, explicit source boundary and SVG editability.
- This evidence brief, with explicit distinction between file creation, authenticated design editing, browser QA and release.

## State and functional contract

| State | Expected | Proof in this branch |
| --- | --- | --- |
| Before selection | No location implicitly recommended | Sample choices have `aria-pressed=false`, empty linked detail |
| Choose Wallops Visitor Center | Show NASA event rules and public place search only | Prototype data & control |
| Choose Robert Reed | Update detail, link to town notice and public map search | Prototype data & control |
| Choose Curtis Merritt | Update place, warning and map query | Prototype data & control |
| A to B to A | Native button selection is reversible | Prototype click handlers; automated real-browser replay pending |
| Unknown mission, stale schedule, closed viewing site | No real-world claim or "open" verdict | Prototype has **no live API**; production engine remains the only authority |
| Phone widths, keyboard, reduced motion | Stack places above detail, native buttons, strong focus ring, no forced motion | CSS source and contract checks; independent browser screenshot QA pending |
| Map tiles unavailable | Selection continues without requiring a map | Prototype uses no basemap or tile dependency |

### Guardrails

**Do not** merge this SVG or prototype into the production section just because the design looks better. Run Penpot MCP `high_level_overview` and read-only `execute_code` after connecting the actual file, then import to a review page **only after user-visible confirmation**. Obtain native Penpot screenshots and compare against real HTML at 360, 390, 768 and 1440. The real launch source and regional rules must remain the sole access and mission authority. Do not invent an open park, parking reservation, exact launch time or pad directions.

No photos are shown in this concept because there is no verified exact-location photo/rights evidence for this specific comparative frame. A photo slot should be added only after source and licensing checks.

### Status and next step

- Repository design files authored: **YES**.
- Design imported to a native Penpot file: **NOT VERIFIED**.
- Penpot MCP tool invocation: **UNAVAILABLE in this ChatGPT session**.
- Static source tests: **PR CI required**.
- Real-browser responsive and accessibility review: **NOT YET VERIFIED**.
- Implementation on the public Rocket page: **NOT DONE**.
- Organic click, engagement or revenue uplift: **NOT MEASURED**.

**Exactly one next action:** In the Penpot-enabled coding client, invoke `penpot-design` to import and inspect `mission-to-shore.penpot.svg` into a new review page alongside the existing Rocket Launch design, then capture desktop/mobile comparisons before any production changes.
