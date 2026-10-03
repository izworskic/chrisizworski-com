# Niagara Border Crossing Decision Engine — Research and Production Architecture

Date: 2026-10-02

Canonical product: `https://chrisizworski.com/niagara-border-crossing/`

## Architectural parent

The Niagara product extends the existing Michigan Border Crossing system rather than creating a parallel stack. Reused patterns include CBP/CBSA normalization, direction-safe lane selection, fail-soft source retrieval, official timestamps, provenance, immutable static crossing facts, weather-alert separation, and compact border-decision UI. The CBBT implementation is the precedent for strict static-vs-dynamic freshness behavior and explicit source-conflict handling. The Mackinac/Border camera implementations are the precedent for fail-soft camera treatment.

## Source inventory

| Data need | Authority | URL / endpoint | Structured? | Refresh | Timestamped? | Crossing coverage | Reliability | Production suitability | Classification |
|---|---|---|---|---|---|---|---|---|---|
| U.S.-bound passenger/commercial/NEXUS waits and lane counts | U.S. Customs and Border Protection | `https://bwt.cbp.gov/api/bwtnew` | JSON | Dynamic | Yes | Peace, Rainbow, Whirlpool, Lewiston–Queenston | High | Production primary for U.S.-bound processing | PRIMARY AUTHORITY |
| Canada-bound passenger/commercial waits | Canada Border Services Agency | `https://www.cbsa-asfc.gc.ca/bwt-taf/bwt-eng.csv` | Delimited CSV | Dynamic | Yes | Peace, Rainbow, Lewiston–Queenston; Whirlpool absent | High | Production primary for covered Canada-bound processing | PRIMARY AUTHORITY |
| NFBC bridge traffic/operations and Whirlpool NEXUS context | Niagara Falls Bridge Commission | `https://www.niagarafallsbridges.com/services/traffic-conditions` | HTML table | NFBC states hourly for non-real-time values | Yes | Rainbow, Whirlpool, Lewiston–Queenston plus regional Peace comparison | High for NFBC bridge operations | Production operator source; Whirlpool is explicitly not real-time technology | PRIMARY AUTHORITY |
| Peace Bridge traffic/operations | Buffalo and Fort Erie Public Bridge Authority | `https://www.peacebridge.com/Traffic/index.php` | HTML table | Page says regional bridges updated hourly; Peace includes live lane counts | Yes | Peace plus regional comparison | High for Peace operations | Production operator source for Peace | PRIMARY AUTHORITY |
| Crossing eligibility and vehicle rules | NFBC | `https://www.niagarafallsbridges.com/crossing-info/which-bridge-do-i-take` | HTML/static | Policy change | Page publication context | Rainbow, Whirlpool, Lewiston–Queenston | High | Production static rules | PRIMARY AUTHORITY |
| Peace crossing rules / NEXUS / tolls | Peace Bridge Authority | `https://www.peacebridge.com/` | HTML/static | Policy change | Page publication context | Peace | High | Production static rules | PRIMARY AUTHORITY |
| NFBC tolls | NFBC | `https://www.niagarafallsbridges.com/crossing-info/toll-cost-vehicle-definitions` | HTML/static | Rate change | Effective date | Rainbow, Whirlpool, Lewiston–Queenston | High | Production static snapshot with source | PRIMARY AUTHORITY |
| Peace tolls | Peace Bridge Authority | `https://www.peacebridge.com/e-zpass/` | HTML/static | Rate change | Effective/current page | Peace | High | Production static snapshot with source | PRIMARY AUTHORITY |
| Regional traffic, incidents, construction and cameras | NITTEC | `https://www.nittec.org/` | Public traveler UI; no stable production JSON endpoint proven | Dynamic | UI-dependent | Western NY / Southern Ontario, including Peace, Rainbow, LQ | High | Link as official approach context in V1; do not scrape unproven internals | SECONDARY AUTHORITY |
| New York events, alerts, cameras and road conditions | 511 New York | `https://511ny.org/developers/doc` | REST API | Dynamic | Resource-dependent | New York approaches | High | API requires developer key for most calls; V1 links official service until key is configured | SECONDARY AUTHORITY |
| New York work zones | 511 New York WZDx | `https://511ny.org/api/wzdx` | WZDx endpoint documented | Dynamic | Feed-dependent | New York work zones | High | Candidate future integration; not used in V1 decision until runtime contract is proven | SECONDARY AUTHORITY |
| Ontario events, cameras, alerts and road conditions | Ontario 511 | `https://511on.ca/` / developer API | REST API | Dynamic | Resource-dependent | Ontario approaches | High | Documented developer-key requirement; V1 links official service | SECONDARY AUTHORITY |
| U.S. weather alerts | National Weather Service | `https://api.weather.gov/alerts/active?point=...` | GeoJSON/JSON | Dynamic | Yes | Buffalo, Niagara Falls, Lewiston approaches | High | Production context only; never overrides bridge operator | PRIMARY AUTHORITY |
| Canadian weather alerts | Environment and Climate Change Canada MSC GeoMet | `https://api.weather.gc.ca/collections/weather-alerts/items` | OGC API Features / JSON | Dynamic | Yes | Niagara Region bbox | High | Production context only; fail-soft | PRIMARY AUTHORITY |
| Bridge/approach cameras | NITTEC / NFBC / Peace Bridge Authority | Official camera pages | Mixed iframe/image UI | Dynamic | UI-dependent | Peace, Rainbow, LQ; Whirlpool context varies | High visually, not quantitative | V1 links official cameras. Embed/proxy only after upstream rights and stability are proven. | VISUAL CONTEXT ONLY |
| Third-party border wait sites / search snippets / tourism pages | Third parties | Various | Mixed | Mixed | Mixed | Mixed | Variable | Never outrank official sources; not used for production decisions | UNSUITABLE FOR PRODUCTION |

## Authority hierarchy

1. **Bridge operational status and static restrictions** — the bridge owner/operator. Peace Bridge Authority is authoritative for Peace Bridge; NFBC is authoritative for Rainbow, Whirlpool Rapids and Lewiston–Queenston.
2. **Entering the United States processing wait** — CBP. The bridge operator is retained as validation/provenance and can hard-veto an operator-reported closure.
3. **Entering Canada processing wait** — CBSA for Peace, Rainbow and Lewiston–Queenston. Whirlpool is not present in the CBSA wait feed; NFBC is the authoritative live/operator context there.
4. **Approach incidents/congestion/construction** — NITTEC and the relevant 511 agency. V1 does not manufacture a structured incident feed when the documented 511 APIs require keys.
5. **Weather alerts** — NWS on the U.S. side and ECCC on the Canadian side. Weather is contextual unless an operational authority changes bridge status.
6. **Cameras** — visual context only. A camera is never interpreted as a measured wait.

If authoritative sources materially disagree, the engine returns `SOURCE_CONFLICT` and removes that observation from recommendation logic. It does not silently pick the more convenient number.

## Crossing × traveler eligibility matrix

| Crossing | Passenger auto | NEXUS | Commercial truck | Pedestrian | Bicycle | Bus/coach | Trailer/tow | Key rule |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Peace Bridge | Yes | Supported | Yes | Yes | Yes | Yes | Yes | Peace operator rules apply; dedicated NEXUS service is published |
| Rainbow Bridge | Yes | Traveler may use crossing; no dedicated current NEXUS wait is published by the core federal Canada-bound feed | **No** | Yes | Yes | Yes | Yes | Commercial trucks prohibited |
| Whirlpool Rapids | NEXUS auto only | **Required** | **No** | **No** | **No** | **No** | **No** | NEXUS cardholders only; NFBC also states Global Entry is accepted U.S.-bound only; 7 a.m.–11 p.m. |
| Lewiston–Queenston | Yes | Supported during published dedicated-lane windows | Yes | **No** | Yes | Yes | Yes | Primary NFBC commercial crossing; pedestrians prohibited |

Bus/coach and trailer/tow eligibility is useful static information, but CBP/CBSA do not provide a dedicated comparable current wait class in the feeds used here. V1 therefore **does not** optimize those travelers using passenger-car waits as a proxy.

## Freshness model

Static authoritative facts and dynamic observations are separate objects. Dynamic freshness can remove a wait from comparison but can never erase a static restriction.

| Source type | Stale after | Hard expiry | Behavior |
|---|---:|---:|---|
| CBP | 30 min | 120 min | Fresh values may drive recommendation; older values are shown as stale/expired and not used to select a crossing |
| CBSA | 45 min | 120 min | Same separation; static eligibility remains available |
| Bridge operator wait table | 90 min | 180 min | Reflects the operators' hourly-update statement and allows delay; stale data cannot create a confident recommendation |

These are conservative product thresholds, not agency service guarantees.

## Diversion-cost policy

No sufficiently stable, public, authoritative live routing endpoint was proven for the exact bridge-to-bridge diversion calculation. NITTEC exposes traveler travel-time products, while 511 APIs require keys. V1 therefore uses a deliberately conservative **bridge-switch guardrail** rather than false precision.

The traveler identifies the bridge naturally on their route. An alternate is only recommended when:

1. it is legally eligible,
2. it is not operator-reported closed,
3. its wait is fresh,
4. no material official-source conflict exists,
5. its observed wait plus a conservative bridge-switch buffer is lower than the normal crossing, and
6. it still clears an additional 10-minute minimum benefit.

The pairwise buffers are explicitly labeled product guardrails, not live route estimates. This biases the engine toward keeping the normal bridge unless the alternate advantage is large enough to matter.

## Decision-state architecture

The Niagara layer reuses existing border/bridge semantics and adds only states needed for multi-crossing choice:

- `USE_PRIMARY_CROSSING`
- `ALTERNATE_CROSSING_BETTER`
- `COMPARABLE_OPTIONS`
- `CROSSING_INELIGIBLE`
- `CROSSING_CLOSED`
- `SOURCE_CONFLICT`
- `SOURCE_STALE`
- `SOURCE_UNAVAILABLE`
- `INSUFFICIENT_DATA`

No weighted magic score chooses a bridge. The rule order is: eligibility → operator closure → authoritative wait availability/freshness → material source conflict → conservative diversion comparison.

## Historical intelligence

CBP exposes historical/typical wait context in the existing site infrastructure. Peace Bridge also publishes traffic volumes. Those sources are useful future inputs for a separate “When should I cross?” layer, but V1 does not convert them into a predictive recommendation. Historical averages are not a guarantee of a specific future crossing time.

## Search/product architecture

**V1 uses one canonical Niagara decision product** at `/niagara-border-crossing/`.

Reasoning:

- users commonly search a named bridge wait, but the high-value unanswered problem is comparison across bridges;
- the same traveler decision requires shared direction, eligibility and diversion context;
- four thin child pages would duplicate official facts and risk search cannibalization;
- the canonical desk can contain strong crossing-specific sections and earn named-bridge intent without doorway pages;
- individual crossing pages can be added later only if they contain materially distinct depth (construction, toll detail, historical patterns, unique camera systems) rather than copied summaries.

Existing Niagara Falls rainbow/viewing tools remain separate because they solve a tourism/weather decision, not border routing.

## Benchmark

Pre-build competitor pattern: official sites have the strongest authority but generally present wait tables and separate crossing-rule pages; third-party products commonly list waits without a transparent detour/eligibility decision layer.

V1 acceptance target is a weighted product score of at least 9.0/10 after runtime verification. No category may hide a catastrophic loss-function failure.

| Dimension | Weight | V1 acceptance condition |
|---|---:|---|
| Immediate decision usefulness | 12 | First mobile screen states stay/switch/uncertain and why |
| Authority | 10 | Federal processing sources + actual bridge owners; no unofficial fallback |
| Freshness | 10 | Timestamp-based state; stale values cannot drive recommendation |
| Crossing comparison | 10 | All four crossings in the correct direction |
| Eligibility accuracy | 12 | Static rules hard-veto ineligible crossings |
| Mobile UX | 8 | 390px first-screen hierarchy; no horizontal-table dependency |
| Transparency | 8 | Source and freshness shown per option |
| Resilience | 10 | Partial/all source outages preserve static rules and degrade explicitly |
| Camera usefulness | 4 | Official visual context; no broken forced embed |
| SEO/search-intent fit | 6 | Canonical decision page covers named bridge and comparison intent |
| Repeat-use value | 5 | Shareable state + live refresh path |
| Clarity under uncertainty | 5 | Conflict/stale/unavailable are visible, not converted to zero |

## Known limitations intentionally not disguised

- Current exact approach-route travel times are not yet incorporated because the authoritative API contracts require additional access or were not proven stable for production.
- Whirlpool does not have the same real-time technology as the other published NFBC wait values; it is treated separately.
- V1 links official cameras rather than shipping an embed that has not been proven legal and reliable.
- Bus/coach and trailer/tow users get authoritative eligibility, but no fabricated current category-specific wait comparison.
