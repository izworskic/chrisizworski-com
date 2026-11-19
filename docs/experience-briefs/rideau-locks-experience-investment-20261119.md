# Rideau Locks | Experience Investment pilot

Date: 2026-11-19
Mode: REVIEW, then IMPLEMENT
Owning repository: izworskic/chrisizworski-com
Canonical: https://chrisizworski.com/rideau-canal/
Scope: The lock-flight teaching instrument within the existing Rideau page. Do not alter the other three visit/cruise/paddle journey modes.
Release status: Feature branch, not merged or deployed. Evidence must be updated after exact-head CI.

## Visitor decision

A visitor standing beside the Rideau Canal, or researching a visit, wants to know: how does a boat climb the Ottawa flight, and why do Jones Falls' four locks look different? The visitor should understand which chamber comes next, where the turning basin fits, and which parts are explanatory rather than live navigation information.

The existing five-step hand-operated lock mechanism teaches one lock. This investment makes the four- versus eight-chamber journey comprehensible without turning the page into another generic information dashboard.

## Baseline and diagnosis

The production Rideau lock diorama was inspected at a 390px viewport on November 19, 2026 using an element screenshot of .rideau-diorama. Its detailed side-elevation SVG is attractive but too wide for the phone and therefore shows only the first few locks. The chamber chooser beneath was a wrapped grid of separate rectangular buttons, and the physical continuity of the flight was not expressed in the control. A selected label and a drawing changed together, but the visitor could not see the entire flight and the selected detail simultaneously.

The real-world content and existing historic SVGs are valuable: preserve them. Distinctiveness is needed in how the visitor travels through the explanation, not another shell/hero and not a new data engine.

The production screenshot is a browser inspection result; it has not been committed or attached to this PR. The existing rideau-browser-qa.cjs creates review artifacts in CI. New 390px and 1280px post-change screenshots and the exact-head run URL must be inspected before approving release.

## Two genuinely different concepts

### A. Connected lock-flight exhibit (selected)

First show a scaled entire-flight elevation, then a magnified scrollable engineering drawing that centers the selected chamber. Beneath it, a connected horizontal sequence illustrates the route and selected progress, instead of eight disconnected action boxes. On Ottawa all eight numbered nodes connect. At Jones Falls a water-textured basin explicitly interrupts the three connected lower locks before Lock 39. Tapping a node, using Prev/Next, or choosing a point in the detailed SVG updates selected progress, overview, narrative and magnified drawing. The route works with touch and keyboard; no JavaScript still shows both labeled static historic schematics.

Benefits: Uses the existing source-backed cutaway; teaches the engineering difference; low maintenance; no framework or feed cost. Tradeoff: Requires two representations of the same SVG when JavaScript is active and a 390px browser check for legibility/height.

### B. Photo-and-walkway lock field guide (not selected for this section)

Lead with licensed photographs of the Ottawa flight, views from published public paths, and an interpretive walking sequence. Make a place the primary choice and open the relevant photo, official source, and Google Maps place search. A static simplified diagram illustrates the engineering underneath.

Benefits: Stronger sense of place and visit preparation. Tradeoff: The parent page already has station-specific source-backed viewpoints and photography, and this design would not explain the geometry of linked gates or the Jones basin as effectively. It is an option for a later *visitor sightseeing* improvement, not an excuse to add a giant hero above the tool.

## Originality and closest comparisons

Closest site experiences: Welland Canal visitor/seaway desks and Soo Locks vessel-watching guide. They prioritize navigation, vessel observations, camera/map handoffs, and practical visit questions. Rideau's exhibit instead is a manually controlled historic sectional explanation with chamber sequencing, one selected engineering stage and a deliberately discontinuous basin.

Two material differences from those existing tools:
1. **Decision and interaction:** Follow one boat's explanatory progression chamber by chamber, rather than monitor vessel position or select a live traffic report.
2. **Composition and visual identity:** A continuous lock-flight pathway and sectional diagram, not a generic status-card row, data table or live map dashboard.

Compared with Michigan Snow Totals: no oversized hero numeral, blue magnitude ramp, report ranking, or snow-style page structure. Shared accessibility, typography and evidence principles are intentional.

## External references checked November 19, 2026

- Parks Canada, Ottawa lockstation history: https://parks.canada.ca/lhn-nhs/on/rideau/histoire-history/histoire-decluse-lock-history/ottawa . Eight in-flight locks, 24.1 m combined lift.
- Parks Canada, Jones Falls history: https://parks.canada.ca/lhn-nhs/on/rideau/histoire-history/histoire-decluse-lock-history/jonesfalls . Four locks, three connected below, separate upper lock and turning basin, 17.4 m combined lift.
- Parks Canada, how locks work: https://parks.canada.ca/lhn-nhs/on/rideau/visit/navigation/ecluser-lock-through . Source for gravity, valves and staff-operated gate mechanics.
- Parks Canada, Ottawa Locks walking tour: https://parks.canada.ca/lhn-nhs/on/rideau/activ/sentier-trail/ottawa . Source-linked context for what visitors can learn on site.
- Rideau Canal official lockstation list: https://parks.canada.ca/lhn-nhs/on/rideau/visit/posteeclusage-lockstation . Seasonal status remains authoritative and separate from the simulation.

Neither a per-chamber lift nor actual operational water levels are asserted. The mini-diagram is a scaled **illustration of an existing explanatory SVG**, not a measured longitudinal profile, a live water simulation, or navigation guidance. Current lockstation access/2027 hours remain uncertain as stated on the page.

## Implementation and connected states

Changed surface: public/rideau-canal/index.html, public/assets/rideau-canal.css, public/assets/rideau-lock-flights.js, Rideau browser QA, and a dedicated Node regression test. Original SVG asset files, content/data pipelines, source inventory, APIs and all other tools remain unchanged.

State authority: site id (ottawa or jones) and selected chamber index. On initial load, all surfaces agree on the first chamber. Selecting a chamber updates selected labels, explanatory text, overview selected icon, large SVG and the connected rail. Selecting Jones preserves the previous Ottawa selection. Reversing A to B to A restores the selected Ottawa chamber. No new persisted data or network calls.

Source/unknown handling: the diagrams remain not-to-scale, no-JavaScript fallback uses both existing static SVGs and official links, reduced motion keeps manual interactions without animated transitions, and recorded films never become live feeds.

## Acceptance evidence and release gates

- Code-level tests: tests/rideau-experience-investment.test.js and existing tests/rideau-experiential.test.js.
- Browser acceptance: scripts/rideau-browser-qa.cjs at 360, 390, 768, 1280 and 1440px, including basin separator, one selected route node, selected overview, reverse state, no-JS, map failure and current existing source-link checks.
- At 390 and 1280px: save both Ottawa and Jones after-change section screenshots; compare with actual production baseline. Check element height, overlay placement, typography and horizontal overflow.
- Scorecard per Experience OS: visitor decision 25, distinctiveness 15, causal interaction 15, source truth 15, visual 10, access/mobile 10, performance/resilience 5, integrity 5. Scores NOT MEASURED until browser review, then require >=90/100, each area >=4/5 and all hard gates.
- Existing full repo verification and exact PR CI must pass; no merge while red.
- Live/public, analytics and SEO changes are NOT MEASURED until independently verified. No claims of improved CTR or visitor engagement.
