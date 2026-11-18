# Rideau Canal Explorer | Connected state matrix
Date: 2026-11-17
Owner: izworskic/chrisizworski-com
Canonical candidate: https://chrisizworski.com/rideau-canal/
Stage: PLANNED ONLY. No browser implementation, screenshots or demonstrated state transitions.

## Stable model
- Primary state: `mode` from `visit | cruise | paddle`; `selectedPlaceId` from the immutable, officially reconciled inventory; `timeBudget` for visitor outing; `travelDirection`, `startNodeId`, `endNodeId` and `visitDate` for cruising. No default choice may silently override explicit selection.
- Source truth: typed, source-linked station, chamber, bridge, island, landing and segment records. Closure/currentness is separate from source-independent identity.
- Source measurement: preserve km, metres, local calendar/date and source issue zone. Miles and feet are derived display only.
- Selected place and map: the text, map/list focus, official link, exact photo/credit and Google Maps place-search action must all use the same stable ID. A missing coordinate must disable map focus, not fake a lat/lon.
- Public route: not a navigation chart and not a paddling route GPX. No directions for unverified parking or restricted lock infrastructure.

## Scenario matrix
| Scenario | User action and keyboard counterpart | Expected outcome | Safe failure and proof status |
| --- | --- | --- | --- |
| Initial no-JS load | Open /rideau-canal/ | Text-first intro, 2026 season-closed label, official sources and station links visible | PLANNED; NOT TESTED |
| Set visit journey | Activate "Watch the locks" native radio/button | Short-visit recommendations with exact visitor-stop source links, no vessel ETA | PLANNED; NOT TESTED |
| Change time budget | Select short / half day / day | Meaningfully different itinerary and comparison rationale; no estimated road minutes without routing evidence | PLANNED; NOT TESTED |
| Choose another stop | Activate map marker or accessible list button | Shared ID updates details, official source, image and external place search | PLANNED; NOT TESTED |
| Reverse selection | Select place A, B, then A; reset | All selected surfaces return to matching A, stale image requests ignored | PLANNED; NOT TESTED |
| Enter cruise mode | Activate Cruise, choose direction and endpoints | Ordered graph selection with lock chambers and independently sourced distances or explicit unavailable fields | PLANNED; NOT TESTED |
| Future date missing hours | Select an arbitrary 2027 date before official 2027 hours exist | Displays "2027 hours not confirmed"; never claims passage or last lockage | PLANNED; NOT TESTED |
| Current source unavailable | Inject status fetch failure, expired notice or off-season data | Status unknown/season ended, preserve historical explanations, official portal link; no positive "open" verdict | PLANNED; NOT TESTED |
| Unsupported draft/clearance | Input vessel dimensions outside sourced limits or known data | Refuse supported passage estimate with specific unsatisfied/unknown constraint and chart handoff | PLANNED; NOT TESTED |
| Select paddle mode | Activate Paddle, change section | Curated section advice; no map-drawn straight line treated as channel/paddle trail | PLANNED; NOT TESTED |
| Missing verified launch | Choose a section without documented legal launch/portage | Do not provide point-to-point paddle plan; official guidance and alternative | PLANNED; NOT TESTED |
| Missing map / tiles | Block mapping provider and reload | Hide dead map, retain complete station list, official links and Google Maps search | PLANNED; NOT TESTED |
| Missing / slow photo | Block image and A -> B rapidly | Text and sources stay correct; wrong image or credit never appears; avoid blank giant panel | PLANNED; NOT TESTED |
| Units | Toggle km/mi, metres/feet | Presentation changes only; source values and rankings unchanged | PLANNED; NOT TESTED |
| Share-state link | Copy and restore visit mode, selected station or section | Same original state is validated and rehydrated; malformed inputs ignored | PLANNED; NOT TESTED |
| Off-season land access | Load in November | Warn that Parks Canada's lockstations are closed and unmaintained outside navigation season; no assertion a specific site is walkable | PLANNED; NOT TESTED |

## QA before any release
Real browser 360, 390, 768, 1440px. Capture first screen and below-the-fold loaded map, at least two stop selections, all three modes, keyboard focus, reduced-motion, slow asset, no-photo, failed tiles and JS-disabled states. Inspect screenshots, loaded licensed photo bytes, source credits and official Google Maps destination roles. Confirm no overflow, erroneous line routing, unsourced directions, fake opening, stale selection or wrong station photos.

Main-site verification: dedicated tests, Experience OS structural record, actual map tiles, full `npm run verify:all`, true Tools card and ItemList parity, sitemap, Person schema, shared Auto ads loader, PR head SHA, post-merge production public smoke. Until measured, scorecard and live status remain NOT MEASURED / NOT VERIFIED.
