# “Is this the week I should go?” — outdoor decision standard

Status: first-party portfolio pilot, October 18, 2026. **Not a standalone indexable hub or a generic AI-generated score.** The existing Tools directory is the entrypoint. Each specialist remains its own canonical destination and the source of its scientific logic.

## Product contract

A living calendar of natural phenomena should answer **what is happening**, **what conditions could make the next outing worthwhile**, **what would change the answer**, and **how certain the evidence is**. It must never turn monthly averages into current observations, or general weather into observed wildlife activity.

Shared card fields: `id`, `state`, `headline`, `reason`, `trigger`, `source`, `updated`, `scope`, `details`. States are:
- `opportunity`: evidence supports a **specific environmental window**; it does **not** guarantee the target event or safety;
- `check`: promising or inconclusive context requires a local ground/access check;
- `wait`: currently unfavorable or a source-verified reason to wait;
- `seasonal`: editorial season information, not an observed or live event;
- `unavailable`: data missing/stale, never fallback to fake reassurance;
- `context`: interpretive link without a verified weekly event signal.

## Source-by-source rules (independent physics and ecology)

| Pilot | Current source | Honest scope | Never claim |
|---|---|---|---|
| Michigan shed antlers | NWS 7-day + dated NOAA gridded snow cover | Regional **search visibility** context; user must inspect actual snow and avoid wintering deer | When a buck sheds, probability of finding a shed, deer-yarding locations |
| Michigan maple | NWS freeze/thaw window (in-season only) | Possible **sap-weather** opportunity; tree readiness remains unverified | Actual sap flow, guaranteed gallon yield, exact sugarbush event |
| Michigan rockhounding | Recent 72h modeled onshore wind; NDBC and NWS alerts | Specific sampled public beach after a blow, with safety caveats; rank only permitted-collection example locations | Safe every beach, finds guaranteed, National Park Service collecting permission, a 7-day wave forecast |
| Waterfowl freeze-line | NWS hourly freeze exposure + NOAA dated large-water ice chart at a reference point | Regional shallow-marsh freezing **pressure** vs independent large-water ice context, not field-verified marsh ice | Observed birds, relocation, congregations, flock sizes or safe ice |\n| Winter eagles | Existing first-party eagle viewing guide with dated observations and NWS weather | Interpretive **planning**; open water and flight displays are distinct | Today’s birds, actual congregation, cartwheel flight or courtship probability from NWS weather |

Four source-backed cards fetch independently. The eagle card intentionally has no pseudo-real-time status. In October, shed and maple tools must remain off-season. The region selector applies to shed/maple forecast points and maps waterfowl to its **own** region IDs (Bay City → Saginaw Bay, Traverse City → Northern Lower, Marquette → Upper Peninsula). The shoreline sample is separately labeled statewide, not local to Bay City/Traverse City/Marquette.

## Front-end implementation

- Static HTML cards always contain a meaningful initial explanation, source meaning, and usable destination links.
- `public/assets/this-week-engine.js` is a UMD pure interpreter, tested through Node; no network operations, page rendering or fake predictions.
- `public/assets/this-week.js` loads from existing first-party `/api` products on intersection or user refresh; `Promise.allSettled` isolates failures. It never sends precise device location or uses third-party keys, user IP geolocation or tracking coordinates.
- `public/assets/this-week.css` is scoped to the rail; do not move/suppress Auto ads or invent ad-intent calls to action.
- An environmental window has a temporal boundary and provenance. A link to an evergreen guide is **not** equivalent to current evidence.
- Results are per-tool and source-updated, not mixed into an overall numerical score. Cache and freshness limits are per source, and missing safety information blocks a "go" message.
- The rock source scores the past **72 hours**, not 7 days. Do not label it a seven-day forecast.
- The region selector does not assert personal GPS, proximity, beach access or land ownership.
- The homepage and each tool retain their canonical intent and shared `https://chrisizworski.com/#person` identity.

## Rollout to broader outdoor network

Do **not** mass-install cosmetic badges on every tool or clone dozens of city landing pages. Add a new weekly card only when the owner repo passes:
1. A named environmental event or outing **and a defensible timing trigger**, separated from the event itself.
2. An accessible live/observational feed and source freshness; otherwise a clearly static seasonal context.
3. A specialist-specific rule and adverse-condition safety/access stop.
4. A test fixture for stale/missing/contradictory data, weather ≠ observed event, and the actual UI path.
5. A canonical link and legitimate intent relation to existing network nodes.
6. A measured repeat-use question (weekly revisit or click-through to an actual outing planner), **not** a claimed CTR boost.

Candidates for future specialist-owned adapters: lake smoke, Michigan spring smelt, waterfowl freezing-line movement, hoarfrost, salamander migration, woodcock sky dance, hummingbirds, mayflies, fall color, trout stream windows and frost, *once their owning repos supply a stable evidence contract*. Source API contracts must be implemented in the owning repo; the first-party Tools directory must not import or rewrite extracted national tools' business logic.

## Verification and measurement

Required: `node --test tests/this-week-engine.test.js`, `npm run verify:quick`, `npm run verify:all`, emitted output authority audit, desktop/mobile rendered smoke, live endpoint statuses and no duplicate loader. Search Console/GA4/AdSense baseline: **NOT AVAILABLE** from this brief. Capture week-panel engagements versus launches into each specialist when analytics can provide comparable data. Do not assert that readers actually went outside, that natural events occurred, or that revenue grew.

## October 18 expansion: depth-model retreat series

The NOAA NOHRSC live MapServer is **not time enabled**; its latest snapshot cannot furnish a verified 14-day history. The shed API therefore retrieves `hourly=snow_depth&past_days=14` from the keyless Open-Meteo forecast endpoint at the selected permitted forecast point. Open-Meteo uses numerical forecast-model archives, **not** local measurements or historical NOAA grid samples. The pure `lib/shed-snow-retreat.cjs` interpreter checks `hourly_units.snow_depth === 'm'`, samples **completed Michigan-local days at 12:00** only, requires at least ten valid daily samples and a recent final day, never coerces missing values to bare, and detects the distinct conditions: a seven-day persistently modeled bare cell, two-day retreat after prior snow, one-day possible thaw, still-covered thinning, and model-covered/unknown. Charts show all available day-depth values; the NOAA **current** grid is always shown separately. Disagreements visibly trigger caution, **never** an activity guarantee.

The fifth specialist adapter consumes existing first-party `/api/waterfowl-freeze-line?mode=region` data, not fabricated migration data. It uses actual 72-hour NWS forecast exposure and a separate dated NOAA ice-chart point only when the specialist supplies it. Dated birds and managed-marsh counts are only available within the specialist tool. One cold front cannot establish a wildlife concentration. When the upstream region call fails, the weekly card is unavailable without blocking other activities.

Run `node --test tests/snow-retreat-weekly.test.js` plus the 53-step full repository verification, search-protection and emitted public-output audit. Live smoke should demonstrate October off-season shed/maple and bounded waterfowl cold signals; no historical model can override field-ground input or wildlife ethics.
