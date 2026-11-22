# Blue Ridge Parkway guided visitor flow (2026-11-22)

## Visitor job

Someone unfamiliar with Parkway mileposts wants an actual sequence: **where am I starting, what kind of day do I want, which drive should I take, what will I experience at each stop, and what should I verify before I leave?**

The previous main page exposed five form fields, eight interests, gateway snapshots, a multi-card ranking, all stop cards and a timeline at once. It also made an API request for a full personalized result on initial page load, before the visitor selected a gateway. Useful information existed but a person had to invent their own order of operations.

## Experience Investment: competing directions

**A. Polished single-page form:** keep the entire form visible with stronger labels, condensed descriptions and fewer borders. Lower engineering cost, but the first action remains ambiguous and the site still displays a premature result. Rejected.

**B. Guided Parkway visit:** start with a named gateway, move to personal interests and time, then show one route answer and a synchronized map/field note, with a deliberate way to edit or inspect evidence. Chosen because the visitor's choice now visibly causes the next question and answer. Compact, place-specific selections rather than an all-purpose stepper skin.

The nearby Parkway best-stops guide is a cluster comparison; the Parkway main tool becomes the interactive day-planning flow. The broader Lake Superior Circle Tour is a multiday geographic explorer; the Parkway remains a short-drive guide with a human-scale result.

## State matrix

| State | First useful content | Action | Source boundary |
| --- | --- | --- | --- |
| First visit | Starting-town cards, native select fallback | Choose one town | No default live route claims |
| Gateway chosen | Interests, time chips, native exact-hours select | Build route | No implied open road |
| Optional edits | Native finish, date, departure time controls | Confirm route | Long trip still governed by existing time/model |
| Route returned | One clear route, trip duration, return/finish, reason disclosure | Follow stop sequence, select stop | NPS gate and NWS model remain source of truth |
| Stop selected | Field interpretation and matching map marker | Next/previous, official stop link | Google Maps place search is not verified parking |
| Route rebuilt | Selected ID, map, timeline and source state regenerated from existing engine | Edit or share | No stale result left behind |
| Error | Visible refresh failure and official NPS link | Change choices/retry | Never invent open status |
| Map unavailable | Stop selector and field note persist | Follow itinerary/official map | No simulated route |
| No feasible sightseeing stops | Route/time explanation without invented stops | Change time/start | Destination constraints preserved |
| JS disabled | Readable guides and official NPS link | Use static network | No false interactive promise |

## Implementation scope

- Main Parkway owner `public/blue-ridge-parkway/index.html`; original canonical, title/meta description, Person schema, NPS/photography credit, breadcrumb, search-intent links and ads are preserved.
- Two short, accessible visitor steps followed by a route response. Gateway buttons and time chips control the original native form fields. URL query parameters prefill the second step for deep linked gateways; a map/list alternative remains.
- Date, departure time, finish point remain available via an optional native disclosure (no detail removed). Explicit interests required so a route is not quietly generated for an unwanted default.
- Single selected route first; evidence, alternatives and detailed stop inventory are disclosed on demand. Road alerts appear before map exploration. At phone widths the selected stop interpretation sits before the large map.
- Gateway snapshots link into the same guided questions, not direct automatic form submission.
- No automatic personalized route request on first visit. No new data, analytics claims, APIs, packages, infrastructure or production build steps.

## Technology fit

Existing semantic HTML and CSS manage disclosure and layout; existing browser JS handles selection, focus and state. The Node route engine and its source-verified data model stay intact. Python, Java, Rust and a new UI framework would not improve the question sequence and add unjustified complexity. No new production dependency.

## Acceptance

- At 360, 390, 768, 1280, 1440: see the first starting choice before a huge photo; no horizontal overflow; legible labels/controls and visible keyboard focus.
- Selection A→B→A and editing a built route must update all state (the result must not remain visible while editing).
- Direct `?gateway=boone` and `?finish=...` have a coherent first useful screen; finish cannot equal start.
- Changed route produces map marker/list/field note updates. Missing map tiles, no stop, failed API and blocked road never become fabricated guidance.
- Browser QA must exercise the flow itself; capturing a pretty static screenshot is insufficient.
- Full owning repository CI and public audit pass before any merge.

## Interpretation and facts

The November 22 interpretive editorial ledger remains the source for park voice and place context: `docs/experience-briefs/blue-ridge-interpretive-editorial-20261122.md`. NPS closures https://www.nps.gov/blri/planyourvisit/roadclosures.htm are the independent access authority. Guidance about a route is always conditional on official access.

This is a scoped main-page UX investment. **Do not merge without owner instruction.** Browser screenshots show the fixture, not live NPS conditions or real ad placement.
