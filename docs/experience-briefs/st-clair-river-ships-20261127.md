# Experience brief: St. Clair River Ship Watch (`/st-clair-river-ships/`)

Mode: IMPLEMENT (new canonical, owner-approved 2026-11-27: "Build these using the production engineering OS"). Owner: `izworskic/chrisizworski-com`.

## Visitor job

- **Who:** a visitor at, or heading to, a St. Clair River town: Port Huron, Marysville, St. Clair, Marine City or Algonac. This is Michigan's best-known freighter-watching shoreline, about an hour from metro Detroit.
- **Question:** "Is a ship coming past my town, and when should I be at the water?"
- **Before this page:** the Blue Water Area CVB lists viewing spots and 24/7 river cameras, and at BoatNerd's Vantage Point volunteers announce ships as they pass. No site predicts when the next ship reaches a given town.
- **First useful answer:** the next window for the chosen town, for example "2:27–2:35 PM, in about 1 h 38 min", with the ship, its direction and the tested accuracy.

## Evidence

- **Model:** `docs/ST_CLAIR_DETROIT_PASSAGE_RESEARCH.md`. NOAA 2025, 36 days, 762 passages, held-out split-conformal windows. All five towns pass at 0–2 hours (78–92%, 7–28-minute windows). Four towns also pass at 2–6 hours (88–91%, 61–107 minutes); Port Huron does not.
- **Live:** a new bounded region on the existing `api/freighter-ais.js` (`?region=st-clair-detroit`) with the shared 45-second CDN cache. **No new function.**
- **Viewing spots:**

| Spot | Sources |
| --- | --- |
| Thomas Edison Park Boardwalk, 2200 Thomas Edison Parkway | Blue Water Area CVB |
| Chrysler Beach and the Marysville riverwalk | Bridge to Bay Trail; OSM way 755919824 |
| Palmer Park boardwalk, 201 N. Riverside Ave. | Pure Michigan and the CVB; OSM way 572118013 |
| Water Street riverfront parks, Marine City | Blue Water Area CVB; Pure Michigan |
| Algonac Riverfront Park boardwalk | Bridge to Bay Trail; OSM relation 16660231 |

## Two concepts

| | A. Town arrival board (selected) | B. River strip with all towns at once |
| --- | --- | --- |
| First phone screen | Town chips and the next windows for one town | A vertical strip of five towns with every ship's window at each |
| Decisive action | Pick your town; the list re-computes | Scan down the strip for your town |
| Strength | One clear answer for where you are | Shows a ship's progress down the river |
| Weakness | One town at a time | Five rows times several ships is dense on a phone; the visitor's own town is buried |

**Selected:** A. Visitors stand in one town; the board answers for that town. The progress view is a natural "Follow a boat" feature for later.

## Distinctiveness

| | Thousand Islands Ship Watch | Detroit River freighters | St. Clair River Ship Watch |
| --- | --- | --- | --- |
| Decision | When does a ship pass Boldt Castle or Clayton | Is a freighter passing Detroit now | When does the next ship pass my river town |
| Composition | Two-place board with the Seaway season band | Live map and passage list | Five-town chip board; both directions meet mid-river |
| Shared on purpose | Board pattern, engine and refusal rules | Same corridor and ships | Same engine math, proven identical by test |

## Technology fit

- **HTML/CSS plus vanilla JS:** accepted.
- **Existing API:** extended with one bounded region.
- **Model:** built offline in Node, 8 KB inline.
- **No map or library.** Python, Rust and Java are not needed.

## State matrix (browser-verified locally on 2026-11-27, with the local API handler against live Open Waters)

| State | Board shows |
| --- | --- |
| Windows | Live: ALGOMA NIAGARA (downbound) and ALGOTERRA (upbound) both forecast at Marine City |
| Empty (forced) | "No ship is forecast…" plus the reasons a ship can still appear |
| Error (forced 502) | "Ship reports are unavailable right now…" |
| No JS | Points to the viewing spots and CVB river cameras; the refresh button is hidden |
| Town A→B→A, keyboard Enter, reload | `?view=` kept; aria-pressed and the list agree |

Viewports checked: 360, 390, 768 and 1280 px, with no horizontal overflow. The town chips scroll sideways on a phone.

## QA scorecard

| Area | Score | Note |
| --- | --- | --- |
| Answers the real decision | 5 | |
| Distinct composition | 4 | |
| Causal interaction | 4 | |
| Truth and provenance | 5 | |
| Visual | 4 | No photography; none needed |
| Accessibility | 4 | Screen reader NOT MEASURED |
| Resilience | 5 | |
| Integration | 5 | |

Visitor outcome is NOT MEASURED.
