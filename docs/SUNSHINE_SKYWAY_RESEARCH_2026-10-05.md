# Sunshine Skyway Bridge Decision Engine — Research, Value and Loss Architecture

Date: 2026-10-05  
Canonical target: `https://chrisizworski.com/sunshine-skyway-bridge/`  
API: `/api/sunshine-skyway`

## Product objective

The product exists to answer one human question quickly:

> Can I cross the Sunshine Skyway now, is there an official closure or major I-275 impact, what do the wind conditions mean for this trip, and what will the toll cost?

This deliberately combines the best proven bridge-product patterns already in this repository:

- **Mackinac Bridge:** bridge authority first, environmental measurements as context, explicit freshness and a persistent visual viewer.
- **CBBT:** official operational state before weather, backend-owned rules, fail-closed UNKNOWN states and a 390 px first-screen decision.
- **Niagara:** one dominant answer, progressive disclosure, in-place visual interactions, no blocked keyed map dependency, and hard loss-function vetoes.
- **Maryland Chesapeake Bay Bridge:** operator state first, live traffic next, tolls and vehicle consequences server-side, planned/live separation, explicit unavailable states, and one persistent embedded camera viewer rather than link-only camera cards.

The goal is not to clone any one page. The goal is to reuse the strongest system behavior and avoid the iterations that already taught us what fails.

## Research findings and authority hierarchy

### 1. FDOT / Florida Highway Patrol — operational authority

FDOT hurricane-response guidance states that bridges in an impact area are monitored for flooding and wind speeds and that, once winds increase beyond 40 mph, **FHP may deem closure necessary**; law enforcement then stops traffic. That language is intentionally conditional. A 40 mph observation is not an automatic browser-side closure rule.

Official reference:
`https://www.fdot.gov/info/co/news/2024/08052024`

The same FDOT update explicitly listed the I-275 / Sunshine Skyway Bridge as closed during Hurricane Debby, demonstrating the type of official language that is appropriate to treat as an operational closure signal.

### 2. FL511 — current road/bridge traffic surface

FL511 is FDOT's official statewide traveler-information system. It publishes traffic events, alerts, closures, traffic cameras, congestion, construction and other real-time traveler information.

References:
- `https://www.fdot.gov/traffic/its/fl511`
- `https://fl511.com/list/events/traffic`
- `https://fl511.com/list/alerts`

The engine may use explicit Sunshine Skyway / I-275 bridge closure language from FL511 as an operational signal. It must not turn generic site labels such as “Closures” into a bridge state.

### 3. Florida's Turnpike Enterprise — toll authority

Current official toll schedule:
`https://floridasturnpike.com/wp-content/uploads/2026/04/West-Central-Florida-4-2026.pdf`

Effective April 12, 2026, the Sunshine Skyway I-275 plazas are all-electronic. Current rates represented by the engine:

| Axles | SunPass | Toll-By-Plate |
| --- | ---: | ---: |
| 2 | $1.16 | $1.62 |
| 3 | $2.32 | $3.24 |
| 4 | $3.48 | $4.86 |
| 5 | $4.64 | $6.48 |
| Each additional axle | +$1.16 | +$1.62 |

The North Plaza serves the southbound crossing and the South Plaza serves the northbound crossing. A normal one-way crossing is charged once, not once at each plaza.

### 4. National Weather Service — environmental context only

The National Weather Service publishes a point marine forecast named **Sunshine Skyway Bridge FL** near 27.61 N, 82.65 W.

Reference:
`https://marine.weather.gov/MapClick.php?lat=27.61&lon=-82.65`

NWS forecasts and active alerts may explain wind, thunderstorms and other travel context. They never establish an FDOT/FHP closure or opening.

### 5. FL511 camera

Official FL511 camera page:
`https://fl511.com/tooltip/Cameras/2553`

FL511 identifies it as **Skyway Bridge View / CCTV I-275 07.8 NB Fixed** and provides a Show Video control. V1 embeds this official camera surface directly in the page, with a fallback link. It is visual context only and is never interpreted as measured delay or an operational state.

## Authority hierarchy

1. **FDOT / FHP and explicit FL511 operational closure signals** — closure / reopen / bridge-impact truth.
2. **FL511** — bridge-area alerts, traffic events and official camera context.
3. **Florida's Turnpike Enterprise** — toll rates and collection method.
4. **National Weather Service** — forecast and alerts as environmental context only.
5. No third-party traffic or weather source may override an official operational signal.

## Operational states

The product intentionally avoids a fabricated generic `OPEN` state unless an official source explicitly provides suitable current language.

- `CLOSED` — explicit official source says the Sunshine Skyway / I-275 bridge is closed, traffic is stopped, or all bridge lanes are closed.
- `IMPACTED` — explicit official source reports a bridge-specific major traffic impact without a complete closure.
- `NO_CLOSURE_SIGNAL_FOUND` — official FL511 sources were successfully checked and no explicit bridge closure signal was found. This is not a weather-derived declaration that the bridge is open.
- `UNKNOWN` — the official operational sources are unavailable or insufficient to support a current conclusion.

A stale cached operational source may be shown as stale context but may not silently become a fresh `NO_CLOSURE_SIGNAL_FOUND` state.

## Wind-context rule

FDOT's 40 mph language is represented as **closure-risk context**, not an automatic closure threshold.

- NWS wind below 30 mph: routine context, subject to official source status.
- NWS wind / gust 30–39 mph: elevated wind context for wind-sensitive travelers.
- NWS wind / gust at or above 40 mph: high-wind closure-risk context; FHP may deem closure necessary.
- Active Tropical Storm / Hurricane / High Wind warnings also raise the context state.

None of those context states can change the bridge operational state to `CLOSED` or `OPEN`.

## Vehicle treatment

No validated Sunshine Skyway vehicle-class prohibition table comparable to Maryland's MDTA rule set was found. Therefore the product does **not invent class-specific eligibility rules**.

V1 groups vehicles only to personalize environmental context:

- Car / SUV / pickup
- Motorcycle
- RV / motorhome
- Trailer / towing
- High-profile / box vehicle

A full official closure prohibits all selected vehicle classes. Otherwise, wind-sensitive classes may receive caution language when weather context is elevated, but never a fabricated legal prohibition.

## Camera interaction contract

The first release must already include the camera lesson learned from the Maryland Bay Bridge iteration:

- one persistent 16:9 embedded official viewer;
- camera controls remain adjacent to the viewer;
- no scroll jump to a remote viewer;
- no link-only camera grid as the primary experience;
- load one viewer at a time;
- always provide an official-source fallback link;
- physical versioned JavaScript filename from the first release so a CDN/browser cannot keep the obsolete renderer under a reused asset path.

## Value function — 100 points

| Dimension | Weight | Release target |
| --- | ---: | ---: |
| Immediate crossing decision | 20 | 20 |
| Operational authority / safety | 20 | 20 |
| Live traffic usefulness | 12 | 11+ |
| Wind-context separation | 10 | 10 |
| Toll correctness | 10 | 10 |
| Embedded camera usefulness | 8 | 8 |
| 390 px mobile first-screen utility | 8 | 8 |
| Freshness / provenance | 5 | 5 |
| Progressive disclosure / clarity | 4 | 4 |
| Accessibility / resilience | 3 | 3 |
| **Total** | **100** | **97+** |

## Hard loss function — release vetoes

Release is unacceptable if any of these occur:

1. raw NWS wind causes the bridge to become `CLOSED` or `OPEN`;
2. 40 mph is represented as an automatic Sunshine Skyway closure rule rather than an FHP decision point;
3. unavailable official data becomes an optimistic state;
4. stale cached operational data silently appears current;
5. generic FL511 navigation text such as “Closures” is misparsed as a Skyway closure;
6. a one-way trip is charged twice or the north/south toll plaza is assigned to the wrong travel direction;
7. pre-April-12-2026 cash collection is presented as current;
8. toll rates are calculated independently in browser code;
9. an invented vehicle prohibition is presented as official;
10. camera imagery is interpreted as a measured traffic delay or bridge status;
11. the camera experience regresses to link-only cards instead of an embedded viewer;
12. a camera click scrolls the user to another section or loses context;
13. an unofficial or invented camera ID is presented as authoritative;
14. critical mobile text is unreadable or the first-screen crossing answer is buried below secondary material;
15. weather, toll, camera, map or planned-work failure prevents the primary operational decision from rendering.

## Information hierarchy

1. Direction + vehicle context controls.
2. One dominant bridge operational answer with source freshness.
3. Vehicle context, traffic impact and toll — three compact decision cards.
4. Wind / weather context and official traffic alerts.
5. Persistent embedded FL511 camera viewer.
6. Official FL511 map / deeper source links.
7. Progressive disclosure for policy, source methodology and explanatory narrative.

## Execution prompt used for this build

Operate as a combined principal product engineer, transportation decision-system architect, FDOT/511 data integration engineer, weather-data engineer, reliability engineer, senior frontend engineer, mobile UX designer, accessibility engineer, SEO/search-intent strategist, skeptical product critic and verification engineer.

Do not invent a new bridge architecture. Inspect and reuse the proven Mackinac, CBBT, Niagara and Maryland Bay Bridge patterns. Build the Sunshine Skyway product around the authority hierarchy and value/loss functions in this document.

1. Build server-side operational, toll, weather and camera contracts first.
2. Preserve the semantic distinction between official operational state and environmental context.
3. Require explicit Skyway-specific official language for closure / major-impact states.
4. Never promote raw NWS wind into operational status.
5. Keep current toll rates and direction/plaza mapping server-side.
6. Keep vehicle treatment conservative: context only unless an official validated rule exists.
7. Put one dominant crossing answer above secondary detail.
8. Make the 390 px first screen useful without requiring scrolling through a tourism hero or long narrative.
9. Embed the official FL511 camera in-place from the first release; do not repeat the link-only camera iteration.
10. Use a physical release asset filename for the camera/interaction script from V1.
11. Add deterministic tests for authority separation, stale/unavailable behavior, toll correctness, vehicle non-invention, camera embed behavior and information hierarchy.
12. Add canonical metadata, large-image Open Graph/X cards, Chris Izworski Person/author linkage, sitemap/tool-directory/national-tools discovery and related bridge-network links.
13. Run the full repository verification gate. Merge only when green, then verify the exact production SHA is deployed and the public page/API behave as designed.
