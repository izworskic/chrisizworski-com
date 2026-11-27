# Experience brief: Thousand Islands Ship Watch (`/thousand-islands-ships/`)

Mode: IMPLEMENT (new canonical, owner-approved 2026-11-27). Owner: `izworskic/chrisizworski-com`.

## Visitor job

- **Who:** a visitor on the riverbank at Alexandria Bay or Clayton, or planning the next couple of hours there. They want to see a freighter pass Boldt Castle or the Clayton waterfront.
- **Question:** "Is a ship coming past here, and when should I be at the water?"
- **Before this page:** no site answers it. Ship watchers read AIS apps by hand. A Thousand Islands Life contributor describes logging ships "up" or "down" from the Marine Traffic app (thousandislandslife.com/ship/, checked 2026-11-27). The Soo CVB tells visitors there is no set schedule and offers rules of thumb such as "near De Tour, about five hours from the locks" (saultstemarie.com, checked 2026-11-27).
- **First useful answer:** the next window, for example "10:20–10:30 AM, about 1 minute away", with the ship's name and direction and the tested accuracy behind it.

## Evidence and sources

- **Model:** NOAA Marine Cadastre 2025 AIS (public domain), 36 days, 454 passages (GitHub Actions run 46020845579). The split is train / calibrate / test by day, with split-conformal windows. Published only where held-out hit was at least 75%, there were at least 50 test passages, and the window was 3 hours or less. That gives Alexandria Bay at 0–2 h (85%, 10 min) and 2–6 h (76%, 35 min), and Clayton at 0–2 h (79%, 7 min). See `docs/SEAWAY_PASSAGE_RESEARCH.md`.
- **Live:** the existing `/api/st-lawrence-seaway?region=thousand-islands` (Open Waters). No new function.
- **Viewpoints:**
  - Scenic View Park, Alexandria Bay. Chamber directory, Public Facilities (visitalexbay.org/?p=1927); OSM way 469073736.
  - Frink Park and the Riverwalk, Clayton. Village LWRP Map 6 (March 2026); NY DOS LWRP page. Coordinates approximate.

## Two concepts

| | A. Riverbank arrival board (selected) | B. Projected-position map |
| --- | --- | --- |
| First phone screen | Viewpoint toggle and the next window, ship, direction and tested accuracy | Map of the river with ships and projected arrival rings |
| Decisive action | Choose Alexandria Bay or Clayton; the list re-computes | Pan or zoom, tap a ship, read a popup |
| Desktop | One wide board, with "where to stand" and the method below | Full-width map with a side list |
| Failure state | Explicit error, empty, closed-season and no-JS text inside the board | Blank map risk (A05/A22); harder fallback |
| Cost | Vanilla JS on an existing API and a 5 KB static model | Leaflet plus tiles, more QA surface, slower first answer |

**Selected:** A. The decision is a time at a fixed place; a map adds nothing to "when" and duplicates the Seaway hub's map-first explorer.

## Distinctiveness against the two closest tools

| | St. Lawrence Seaway hub | Soo Locks Lock Watch | Thousand Islands Ship Watch |
| --- | --- | --- | --- |
| Decision | Where are ships, and how do the locks work | Which ships reach the locks during viewing-platform hours | When does a moving ship pass this riverbank |
| Composition | Map-first corridor explorer, lock model, history | Lock arrival windows against park hours and daylight | Dark arrival board with time windows first; no map |
| Interaction | Region, ship and lock selection on a map | Lock timeline | Viewpoint toggle re-computes tested windows |

**Shared on purpose:** the seaway.css base tokens, the season band and engine (`seaway-season.js`), the AIS API and the movement contract (`approachEligible`).

## Technology fit

- **HTML/CSS plus vanilla JS:** accepted. A static answer page, client-side math on a small model.
- **Existing backend:** reused; no new API or function.
- **Python:** rejected at runtime. The model is built offline in Node from the same engine used for evaluation.
- **Rust, Java:** rejected; no compute or concurrency need.
- **New dependencies:** none.

## State matrix (browser-verified locally on 2026-11-27)

| State | Board shows |
| --- | --- |
| Windows | Ordered windows; the first is highlighted (live: FEDERAL MONTREAL, downbound) |
| Empty | "No ship is forecast within the next 2/6 hours…" plus the reasons a ship can still appear |
| Error (API 502) | "Ship reports are unavailable right now…"; no window |
| Closed season (clock 2027-01-20) | The band shows the winter closure; the board says no freighters are expected |
| No JS | Explains how to use the official order of turn and the viewing notes; the refresh button is hidden |
| Viewpoint A→B→A, keyboard Enter, reload | `?view=` kept; aria-pressed and the list agree |

Viewports checked: 360, 390, 768 and 1280 px, with no horizontal overflow.

## QA scorecard (honest)

| Area | Score | Note |
| --- | --- | --- |
| Answers the real decision | 5 | Window, ship and direction on the first screen; three journeys tested |
| Distinct composition | 4 | Arrival board with no map; differs from the hub and Soo in decision, composition and interaction |
| Causal interaction | 4 | The toggle changes the computed windows and the horizon; the refresh button re-polls |
| Truth and provenance | 5 | Tested accuracy shown per window; refusals for anchored, off-channel and untested leads; sources linked |
| Visual and photography | 4 | No photography; none needed for the decision, and no unverified imagery |
| Mobile, keyboard, accessibility | 4 | aria-pressed toggles, a live status region, keyboard checked; a screen-reader pass is NOT MEASURED |
| Performance and resilience | 5 | No map or library; failure and closed states verified |
| Integration | 5 | `verify:all` 60/60: registry, Tools card and ItemList, sitemap, entity graph, hub search |

**Release stages:** PR, CI, merge, deploy and live check are recorded separately in the PR. Visitor outcome is NOT MEASURED.
