# White Christmas Confidence Resilience Master Execution Prompt

## Mission
Upgrade the existing canonical White Christmas tool so a location does not fall to `unavailable` merely because one nearby climate station has incomplete December 25 snow-depth history. Preserve honest uncertainty. Never substitute false precision for missing evidence.

Canonical product: `/national-tools/white-christmas/`
Backend: `api/national-white-christmas.js`
Benchmark: `benchmarks/white-christmas-confidence-resilience.json`

## Product truth
A White Christmas estimate is an evidence synthesis, not an official NOAA forecast. The historical anchor must represent the searched location as well as the available network permits, while clearly identifying whether the estimate comes from a single station or a regional blend.

The system must prefer useful lower-confidence evidence over avoidable total failure, but it must never claim a local observation when it is using regional evidence.

## Loss function
Minimize:

`L = 35U + 25P + 15S + 10D + 8R + 7X`

Where:
- U = avoidable unavailability
- P = false precision
- S = spatial mismatch
- D = unacknowledged data-depth weakness
- R = source reliability fragility
- X = explanation failure

Target weighted loss: <= 10/100.

## Hard vetoes
Do not ship if any is true:
1. West Branch, Michigan returns unavailable under normal source availability while usable regional Christmas snow-depth records exist.
2. A regional blend is presented as an exact local observation.
3. Failure of CPC, snowpack, or NWS destroys an otherwise usable historical estimate.
4. The UI assumes `climatology.station` always exists.
5. Confidence ignores historical evidence quality.

## Historical evidence ladder
Search climate evidence in staged radii: 50, 100, then 175 miles.

Use these evidence tiers:
- Strong single station: >=25 valid 1991-2020 December 25 snow-depth years.
- Moderate single station: 20-24 valid years.
- Regional candidate: >=15 valid years.
- Regional blend: use the best 2-4 compatible candidates when no strong single station is available and a blend is more representative than a weak fallback.

Do not stop at the first merely usable fallback if expanding the search can discover materially stronger evidence. Strong single-station evidence should win. Otherwise choose the best fallback by evidence quality, spatial fit, coverage, and station agreement.

## Station quality
Rank candidate stations using at minimum:
- normal-period coverage
- distance to searched location
- station agreement for regional blending

If reliable target elevation becomes available later, add elevation mismatch as a ranking penalty. Do not invent elevation similarity without source data.

## Regional blending
Regional blending must:
- use 2-4 best candidates
- weight by distance and record depth
- expose participating station names, distances, valid years, and station probabilities
- expose station probability spread
- lower confidence when stations disagree
- set `baseline_type: regional_blend`

Never call the regional blended rate a measured local frequency.

## Confidence model
Historical evidence quality is the base confidence layer.

Suggested baseline confidence:
- high: strong nearby single station
- moderate: good 20-24 year station or strong regional agreement
- low: sparse/distant station or regional disagreement
- unavailable: only after all staged searches and fallback paths fail

Current-season data may increase event confidence as Christmas approaches, but cannot erase the provenance of the historical baseline.

## Independent source families
Treat these as separate evidence families:
1. RCC-ACIS / NCEI-NWS historical December 25 snow depth
2. CPC monthly/seasonal temperature and precipitation outlooks
3. NOHRSC / SNOTEL current snowpack
4. NWS short-range Christmas-period forecast

A failure in one family must not destroy useful evidence from another. Return degraded status and source-specific availability instead.

## Last-known-good behavior
Cache a successful climatology lookup and use it when a later live climatology request fails. Clearly label it `last-known-good`.

An in-memory cache is warm-instance resilience only. Do not describe it as durable persistence across cold starts or deployments unless a durable store is actually implemented.

## API observability
Return enough non-personal diagnostic metadata to understand failure modes:
- `baseline_type`
- `candidate_count`
- `search_radius_miles`
- historical confidence level/reason
- `reason_code`
- source-family degraded status
- blend station count and station probability spread where relevant

Do not store exact user coordinates as telemetry.

## UX requirements
Never display a naked `unavailable confidence` message.

Examples:
- `Moderate confidence · nearby station with 22 valid normal-period years`
- `Lower confidence · blended from 3 nearby climate stations`
- `Historical estimate available · NOAA outlook temporarily unavailable`
- Final true failure only: `Not enough reliable Christmas snow-depth history was found for this location.`

The historical card must support both a single station and a regional blend without crashing.

## Regression scenarios
Mandatory:
- West Branch, MI: station-gap/regional fallback
- Bay City, MI
- Marquette, MI
- Detroit, MI
- Minneapolis, MN
- Denver, CO
- Seattle, WA
- Phoenix, AZ
- Miami, FL
- ACIS temporary failure with warm-instance last-known-good
- CPC failure
- snowpack failure
- NWS failure inside short-range window

## Tests
Unit tests must not depend on live network calls. Test fixtures for:
- 20-year history is usable
- <15-year history is rejected
- strong station selection
- regional blend creation
- regional blend probability remains finite
- confidence calibration
- West Branch-style station-gap fallback never becomes unavailable
- no-history path still becomes unavailable
- search radii remain 50/100/175
- page handles `station: null` for a regional blend

## Release benchmark
Use `benchmarks/white-christmas-confidence-resilience.json`.
Ship only if total benchmark score >=90 and every critical value function >=85.

## Completion standard
Do not call this complete merely because code compiles. Completion requires:
1. implementation
2. deterministic tests
3. repository release gate green
4. merge verified
5. production deployment verified
6. live West Branch request returns an estimate or a defensible true-unavailable result with reason metadata
7. live Bay City regression remains healthy

Fix demonstrated release blockers without introducing unrelated product changes.
