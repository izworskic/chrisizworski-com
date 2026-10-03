# Niagara Border-Crossing Decision Engine — research and architecture

Updated: 2026-10-02

## Architectural parent

The direct parent is the existing Michigan border-crossing engine (`lib/border-crossings.js`, `api/border-crossings.js`, `public/michigan-border-wait-times/`). It already proves the most important international-border behaviors:

- CBP controls entering-the-U.S. processing waits.
- CBSA controls entering-Canada processing waits.
- direction, vehicle class, and lane program are never mixed.
- missing/closed data never becomes a zero-minute wait.
- approach traffic stays separate from customs-processing delay.
- source failures degrade independently.
- same-origin camera proxying/fail-soft behavior is available where source rights and URLs support it.

CBBT contributes the stricter static-vs-dynamic modeling rule: freshness may degrade confidence but must never erase still-valid authoritative restrictions. Mackinac contributes the proven compact first-screen and camera/failure-state patterns.

## Source inventory

| Data need | Authority | URL / endpoint | Structured? | Refresh / timestamp | Coverage | Role | Production suitability |
|---|---|---|---|---|---|---|---|
| U.S.-bound passenger/commercial/NEXUS waits, lane counts, port status | U.S. Customs and Border Protection | `https://bwt.cbp.gov/api/bwtnew` | JSON | Agency lane timestamps | Peace, Rainbow, Whirlpool, Lewiston | PRIMARY AUTHORITY | High |
| Canada-bound passenger/commercial waits | Canada Border Services Agency | `https://www.cbsa-asfc.gc.ca/bwt-taf/bwt-eng.csv` | CSV | Row timestamp | Peace, Rainbow, Lewiston; no Whirlpool row | PRIMARY AUTHORITY | High |
| Cross-Niagara operator traffic table | Niagara Falls Bridge Commission | `https://www.niagarafallsbridges.com/services/traffic-conditions` | HTML table | Operator timestamp; page says hourly | Lewiston, Rainbow, Whirlpool, Peace | BRIDGE OPERATOR / VALIDATION | High for operator context; Whirlpool wait is context-only because NFBC says real-time technology is unavailable there |
| Peace Bridge traffic table / lanes | Buffalo and Fort Erie Public Bridge Authority | `https://www.peacebridge.com/Traffic/index.php` | HTML | Timestamp; operator says hourly for bridge table | Peace plus regional comparison | BRIDGE OPERATOR / VALIDATION | High |
| NFBC bridge eligibility / NEXUS / hours | Niagara Falls Bridge Commission | `https://www.niagarafallsbridges.com/crossing-info/which-bridge-do-i-take` | HTML/static | Static operational rules | Lewiston, Rainbow, Whirlpool | PRIMARY AUTHORITY for bridge rules | High |
| Peace pedestrian/bicycle rules | Buffalo and Fort Erie Public Bridge Authority | `https://www.peacebridge.com/cyclist-pedestrian-crossing/` | HTML/static | Static | Peace | PRIMARY AUTHORITY for bridge rules | High |
| NFBC truck-load restrictions | Niagara Falls Bridge Commission | `https://www.niagarafallsbridges.com/crossing-info/trucker-services/truck-loads-program` | HTML/static/notices | Notice-dependent | Lewiston | PRIMARY AUTHORITY | High; unusual loads require approval |
| Peace special / oversize loads | Buffalo and Fort Erie Public Bridge Authority | `https://www.peacebridge.com/crossing-information/loads/` | HTML/static | Notice-dependent | Peace | PRIMARY AUTHORITY | High; approval required |
| New York approach incidents/cameras/winter conditions | 511NY | `https://511ny.org/developers/doc` | JSON/XML API | Event timestamps; live feed | U.S. approaches | SECONDARY AUTHORITY for approach roads | High only with registered developer key; 10 calls / 60 s |
| Ontario approach incidents/cameras/road conditions | Ontario 511 | `https://511on.ca/developers/doc` | JSON/XML API | Event timestamps | Canadian approaches | SECONDARY AUTHORITY for approach roads | High only with registered developer key; key required since 2026-09-24 |
| U.S. weather alerts | National Weather Service | `https://api.weather.gov/alerts/active` | GeoJSON/JSON | Alert timestamps | U.S. approaches | PRIMARY WEATHER AUTHORITY | High |
| Canadian weather alerts | Environment and Climate Change Canada | `https://weather.gc.ca/warnings/index_e.html?prov=son` | Official web warning surface | Alert timestamps | Ontario approaches | PRIMARY WEATHER AUTHORITY | Link-only in V1 until a documented structured feed is selected |
| NFBC cameras | Niagara Falls Bridge Commission / NITTEC | NFBC traffic page links to official NITTEC/camera streams | Mixed iframe/video | Live visual | Lewiston, Queenston plaza, Rainbow | VISUAL CONTEXT ONLY | Link-first in V1; embed only after exact stream-to-view mapping is verified |
| Peace cameras | Peace Bridge Authority | `https://www.peacebridge.com/media-room/canadian-webcams/` | Images/web | Live visual | Peace | VISUAL CONTEXT ONLY | Link-first in V1 |

## Authority hierarchy

1. **Bridge eligibility, hours, structural/vehicle restrictions, facility closure:** bridge owner/operator.
2. **Entering United States border-processing wait and U.S. lane status:** CBP.
3. **Entering Canada border-processing wait:** CBSA.
4. **Whirlpool Canada-bound NEXUS context:** NFBC operator table, explicitly lower-confidence because NFBC states real-time technology is not available there.
5. **Approach-road incidents/construction:** 511NY / Ontario 511 in their jurisdictions.
6. **Weather:** NWS / Environment and Climate Change Canada in their jurisdictions.
7. **Cameras:** visual corroboration only; never converted into an inferred wait.

Material official-source disagreement is retained as provenance and can disqualify a crossing from a confident comparison. The engine does not average conflicting waits.

## Crossing × persona matrix

| Crossing | Passenger | Commercial truck | Pedestrian | Bicycle | Bus | Trailer/tow | Trusted-traveler constraint |
|---|---:|---:|---:|---:|---:|---:|---|
| Peace | Yes | Yes | Yes | Yes | Yes | Yes | NEXUS optional; dedicated lanes published |
| Rainbow | Yes | **No** | Yes | Yes | Yes | Yes | No dedicated NEXUS wait used in decision model |
| Whirlpool | Yes | **No** | **No** | **No** | **No** | **No** | **NEXUS required; Global Entry U.S.-bound only; 7 AM–11 PM** |
| Lewiston–Queenston | Yes | Yes | **No** | Yes | Yes | Yes | NEXUS optional; dedicated lanes on published schedules |

Oversize/unusual commercial loads are not treated as ordinary truck eligibility: Peace and Lewiston–Queenston require operator review/approval, and the engine does not emit an unconditional recommendation for an oversize selection.

## Freshness model

Dynamic observations and static rules are separate objects.

- CBP: current ≤15 min, stale >15 min, hard-expired >45 min.
- CBSA: current ≤20 min, stale >20 min, hard-expired >60 min.
- NFBC validation: current ≤75 min, stale >75 min, hard-expired >150 min.

Only current, non-conflicting, non-context-only waits participate in a confident bridge-switch recommendation. Stale/expired values may still be displayed with their state. Static eligibility is never removed by freshness degradation.

## Diversion model

V1 deliberately does **not** pretend to know an exact navigation ETA between every origin/destination pair.

The user selects the bridge they are naturally approaching. A conservative pairwise bridge-switch buffer is then added to each alternate before waits are compared. An alternate must retain at least a 10-minute net benefit after that buffer before the engine emits `ALTERNATE_CROSSING_BETTER`.

This model is intentionally biased against unnecessary detours. Future routing can replace the fixed buffers only if a reliable, licensed live routing source is integrated and tested.

## Decision states

The implementation reuses existing border concepts and adds only states needed for an actual multi-crossing recommendation:

- `USE_PRIMARY_CROSSING`
- `ALTERNATE_CROSSING_BETTER`
- `COMPARABLE_OPTIONS`
- `BEST_CURRENT_CROSSING`
- `ELIGIBILITY_ONLY`
- `INSUFFICIENT_DATA`

Per-crossing hard states remain explicit:

- `CROSSING_INELIGIBLE`
- `CROSSING_CLOSED`
- `RESTRICTION_ACTIVE`
- `SOURCE_CONFLICT` (represented as a disqualifying result flag)
- freshness states `current`, `stale`, `expired`, `unknown`

## Highest-risk assumptions attacked

1. **Whirlpool can be compared like the other bridges — rejected.** NFBC explicitly says real-time technology is not available there; its operator value is context-only.
2. **A shorter border wait means a faster trip — rejected.** The decision model applies a conservative bridge-switch buffer and a net-benefit threshold.
3. **NEXUS traveler means every NEXUS lane is open — rejected.** Lane availability remains source-specific and standard lanes remain a fallback where legal.
4. **511 endpoints are safely anonymous — rejected.** Both New York and Ontario developer APIs require keys; V1 uses them only when configured.
5. **Stale dynamic data can change crossing eligibility — rejected.** Static rules and dynamic observations are separate and regression-tested.
6. **Camera imagery can be translated into a measured queue — rejected.** Camera evidence is visual context only.

## Product / SEO architecture

V1 uses **one canonical Niagara decision product** at `/niagara-border-crossings/` with strong crossing sections, not four thin doorway pages.

Rationale:

- the core search/user job is comparative (“which crossing / wait times / Buffalo–Canada border”),
- the primary value comes from cross-bridge decision logic,
- one canonical product minimizes early cannibalization and maintenance burden,
- individual crossing pages can be added later if GSC shows distinct durable demand that deserves a full non-duplicative product surface.

## Benchmark — pre-runtime-verification

| Dimension | Current implementation target (0–10) | Remaining risk |
|---|---:|---|
| Immediate decision usefulness | 9.4 | Must validate 390 px rendered first screen |
| Authority | 9.6 | ECCC remains link-only in V1 |
| Freshness | 9.4 | Live parser/runtime must be verified |
| Crossing comparison | 9.6 | Whirlpool intentionally excluded from equal-confidence comparison |
| Eligibility accuracy | 9.7 | Needs live regression confirmation |
| Mobile UX | 9.2 | Browser verification pending |
| Transparency | 9.7 | — |
| Resilience | 9.4 | Live source outage cases need runtime proof |
| Camera usefulness | 8.4 | Link-first until exact embeds are proven |
| SEO/search-intent fit | 9.3 | Search-performance data can refine title/sections later |
| Repeat-use value | 9.4 | — |
| Clarity under uncertainty | 9.7 | — |

Weighted readiness should not be called ≥9.0 until repository tests, production-like endpoint behavior, responsive rendering, and live source parsing all pass.
