# Michigan Ice Caves: HTML and JavaScript interaction specification

**Date:** October 19, 2026. **User direction:** continue needed research and use interactive scripting alongside HTML. Interpret “Java” as **JavaScript**, the browser scripting language. This is the Phase 1 technical handoff for the same `feature/michigan-ice-caves-2026` branch, not a separate project or a claim that interactions are deployed.

The [research report](ICE_CAVES_RESEARCH_2026.md) controls destination eligibility, formation evidence, access and safety. Interactivity must preserve those distinctions. This document recommends a small HTML/CSS/JavaScript implementation that fits the existing site; no Java runtime, frontend-framework migration or new data provider is required.

## 1. The experience to deliver

The visitor's question stays: **“Are the ice formations confirmed, and is this a trip worth planning?”** The interaction supports comparison across places and time. It does not turn a weather graph into a live observation of a cave.

Use a coordinated destination selector, cold/thaw timeline, evidence inspector and trip context. Plain HTML carries the essential destination answer, report/source dates, seasonal explanation, safety and official links. JavaScript enhances those elements after validated data arrives. This progressive-enhancement approach keeps a useful page when scripting or a data request fails [J1].

The decision area belongs near the top, after the short destination framing and essential safety message. The main evidence comes before optional technical explanations and long destination prose. Mobile controls must not push the answer and timeline far down the page. This is a functional reading order, not an approved visual mockup or a finished design.

## 2. Specific interactions

| Interaction | What a visitor can do | What changes and what stays visible |
| --- | --- | --- |
| **Choose a destination** | Select Eben, Sand Point, Grand Island shore viewing, Wagner or Tahquamenon. | Update viewing scope, source basis, access, weather timeline and relevant official links together. Grand Island always says mainland viewing. Closed/deferred candidates have plain explanatory notices, not selectable open destinations. |
| **Explore the season** | Switch between the recent 30 days and the observed season; tap a date, use a date input, or press Previous/Next day. | Show that day's max/min, cumulative FDD, thaw exposure and any real report marker. The inspector explicitly says when no formation report exists for that date. Selecting old weather never rewrites the current formation/access verdict. |
| **Inspect the thaw** | Select a warm spell on the timeline. | Highlight the dated air-temperature exposure and explain why ice may weaken. Show “thaw exposure,” not a made-up percentage of ice lost. |
| **See what is confirmed** | Select a dated report marker or open “How do we know?” | Reveal the source, observation/publication date, viewing area and supported claim. The compact modeled/confirmed label and date are always visible without opening details. |
| **Compare up to three places** | Add/remove destinations from a comparison table. | Compare viewing experience, actual report freshness, access, cold-history completeness and forecast coverage. Shared weather stations are identified so identical data do not look like independent local measurements. No automatic “winner” from total FDD. |
| **Plan this weekend** | Choose the next weekend or a specific date; choose Detroit, Grand Rapids or Bay City as the starting city. | Show supported forecast days, daylight/travel preparation context and verified arrival information when available. An origin change affects travel context only, never the ice evidence. Beyond the forecast horizon, say that an outlook is not yet issued. |
| **Understand formation** | Step through “Water seeps,” “Cold builds ice,” and “Thaw changes the scene.” | A labeled explanatory SVG reveals each mechanism with concise guide-style text. It is a schematic, not a reconstruction of today's ice or a model of its actual size. All three explanations remain readable without animation. |
| **Share a plan** | Copy a URL with destination, compare choices, origin, date and chart range. | Restore those choices on open while fetching the latest evidence. The URL does not preserve an old “Prime” verdict. Reset and browser Back/Forward work predictably. |

Travel ranges and directions stay disabled/omitted until their legal destination and basis are verified. A city selector alone is not a drive-time calculation. No background geolocation permission, precise home address, account or database is necessary.

## 3. Timeline encoding and renderer

**Primary:** native inline SVG controlled by plain JavaScript, with an adjacent HTML data table and date inspector. **Fallback:** the same dated observations and source explanations in text/table form. Inline SVG can be updated with ordinary DOM events and attributes [J2]. Existing `public/winter-eagle-watching/app.js` already creates SVG with `createElementNS`; its `flight-guide.js` demonstrates an explanatory stepper and reduced-motion handling. Reuse those patterns, not the eagle-specific content, endpoint, status labels or animation paths.

Two aligned tracks share a date axis:

1. **Accumulated cold:** observed cumulative FDD in °F·days, with a direct label. This line never falls during a thaw. A net-cold comparison, if offered, is explicitly named and optional; it must not be mislabeled FDD.
2. **Daily thaw exposure:** bars in thaw degree-days, separately labeled with their own scale. Report dates are distinct markers with source details. Forecast exposure belongs in an adjoining visibly labeled forecast region, not inside observed totals.

Do not use a single dual-axis plot that suggests FDD and degree-days of thaw are direct measurements of formed/lost ice. No “formation threshold” line is drawn without calibration. No continuous line bridges a missing observation period; an incomplete cumulative total is withheld or explicitly bounded rather than plotted as an exact seasonal value. A last-valid-date label is not enough to conceal an earlier gap.

One active chart on the hub and one on each detail page is sufficient. Compare mode may display up to three cold-history lines with direct labels, distinct line patterns and synchronized date inspection. Do not instantiate full charts inside every card. A season contains only hundreds of daily samples per site; Canvas, WebGL and 3D are unnecessary for this requirement. Add a chart dependency only if a measured implementation need justifies its cost.

The formation schematic is a separate illustration with no numeric height/thickness scale. No melting animation or simulated growing wall may appear to encode observed site conditions. Reference photographs require verified rights, place and historical-date labels; photography is not a live sensor.

## 4. Data and interaction state

Reuse the existing ice aggregation path and NWS/ACIS adapters described in the research report. The client consumes a validated destination record containing:

- `siteId`, `viewingScope`, season/accounting window and station identity;
- daily observed max/min values, valid dates and coverage; clearly named derived metrics;
- separately dated forecast periods and issue time;
- formation-report records, observation dates and source URLs;
- access restriction, its basis and last review; fixed safety-gate identifiers.

This is a proposed contract, not an existing endpoint response. Do not call `/api/ice-now?region=munising-bay` until the unsupported-region fallback is corrected. All consumers must reject a site/region mismatch. The server owns evidence eligibility and recommendation gates; JavaScript also expires stale displayed labels while a page remains open. Query strings or local storage cannot declare a destination formed or open.

| State | Required behavior |
| --- | --- |
| Before enhancement | Readable HTML with honest dated/seasonal answer, access and source links. No empty chart scaffolding. |
| Pre-season | State when accounting begins and what typically drives formation. Show no invented curve. Still allow destination comparison of access and viewing experience. |
| Ready | Render validated values and make the chart/date/compare controls available. |
| Partial history | Identify actual gaps and withhold any unsupported exact total or full-season comparison. Other valid modules keep working. |
| No current formation report | Keep weather context available; say formation is not recently confirmed. Do not translate this into “not formed.” |
| Request failure | Preserve any genuinely last-good value with its observation date and stale label, or omit the module. A failed request does not become “pre-season.” |
| Fast destination changes | Cancel/ignore superseded responses; a late Eben response must never repaint the Grand Island selection. |
| Report expires or access changes | Remove/suspend the prime/weekend recommendation. Interaction must not preserve a stale recommendation because the graph is still visible. |

Fetch once per shared destination/station request on page load and deduplicate in-flight requests. Controls use the loaded data; scrubbing the timeline must not make an upstream request for every date. A refresh action respects server caching and reports the actual observation/issue date. Do not set a rapid polling loop or add a cron/data pipeline for the interactive layer.

## 5. Shareable state and ordinary links

Proposed query keys are `site`, `origin`, `visit`, `range` and `compare`. Validate site IDs against the GO roster, origin against the three offered cities, visit against a real ISO calendar date, range against supported options, and compare against at most three unique eligible sites. Ignore unknown values and restore a documented default; no parameter bypasses an access or safety gate.

Use a single state object to update all views. A deliberate destination/committed-plan change may add a browser-history entry; continuous date inspection replaces the current entry rather than creating hundreds of Back steps. Restore state on `popstate` without creating another entry. These behaviors follow the browser History API's distinct push/replace semantics [J3]. Share/copy failures fall back to a selectable ordinary URL. A copied link is a saved choice, not a frozen condition report.

All variants keep the route's single self-referencing canonical. Detail-page links and official-source links remain ordinary HTML anchors. Core destination facts do not depend on client-side navigation.

## 6. Touch, keyboard and motion

Every important value is available outside tooltips. Native buttons, selects and date/range controls have visible labels and focus states. A chart has a short accessible description plus an HTML table/long explanation carrying its essential evidence [J4]. Selected day, site, active comparison and freshness are conveyed in text, not just color.

Dragging is optional. Date input, Previous/Next buttons and tap-to-select provide alternatives; this follows W3C's guidance on avoiding drag-only actions [J5]. Use at least 44-by-44 CSS-pixel hit areas as a project target, test at 320/390 pixels and 200% zoom, and prevent inspectors/tooltips from extending beyond the viewport. A graph must not hijack vertical scrolling. If a narrow comparison requires horizontal scrolling, label that region and keep destination names readable.

Respect `prefers-reduced-motion` [J6]. Start the explanatory schematic as a still frame, with explicit step controls. Any optional play action has pause/replay and stops when hidden; reduced-motion users retain every explanation. No autoplay page-length scroll sequence, artificial falling snow, decorative ice growth or animation required to see a source date.

Neutral context, a cold accent and a separate thaw accent are sufficient. Selected focus and closure warnings have additional text/border treatment. Check contrast and grayscale; forecast uses a dashed pattern plus text, not color alone. Screen-reader announcements describe committed changes once rather than narrating every pointer move.

## 7. Implementation and verification handoff

Expected later files are a generated/static HTML hub and detail pages, a shared deferred JavaScript controller and stylesheet, and the existing-engine helper extraction/extensions. Naming will follow the repository's normal conventions. No library/framework migration or additional external API is part of this decision.

Before coding, settle the Phase 1 report-led status contract and GO roster. Before merging, verify the complete story:

- A phone visitor can select Eben, inspect the last observed day and distinguish weather from a real report without hover.
- A rapid switch between two sites cannot mix their facts, curve, source dates or warnings.
- Compare identifies a shared station, handles gaps, and never ranks an unconfirmed/closed destination as the best ice trip.
- A forecast-only date and a date beyond the forecast horizon have different honest results.
- Grand Island selections/share links never create a bay crossing; Eben warnings remain visible in every view.
- An expired report or stale data cannot be restored to “Prime” by URL state, Back, refresh or an old tab.
- Share, reset, Back/Forward, keyboard-only inspection, reduced motion and JavaScript-disabled HTML all work.
- A failed/slow source leaves useful content and no dead widget; existing six-region Michigan Ice outputs remain compatible.

Performance targets are design goals until measured. Record actual transferred JavaScript, request counts, mobile layout shifts and control responsiveness during Phase 2. Run the existing full repository/build gates and production verification described in the research report; documentation work is not a passing implementation test.

## Primary technical references

- **J1:** MDN, [Progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement).
- **J2:** MDN, [Scripting SVG with JavaScript](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/Scripting).
- **J3:** MDN, [Working with the History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API).
- **J4:** W3C WAI, [Complex images](https://www.w3.org/WAI/tutorials/images/complex/).
- **J5:** W3C WAI, [Understanding dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).
- **J6:** MDN, [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).

References checked October 19, 2026. The browser/HTML/SVG capabilities are documented features; destination controls, state policy, chart composition and verification cases are proposed product decisions.
