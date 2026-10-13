# ShoreFeel — V1 Lake Michigan pilot product and measurement contract
**Date:** 2026-10-13 · **Status:** Feature-branch candidate, not a production launch

## Promise
"Know how the lake will actually feel." One Great Lakes lakewide temperature desk and two first-place guides that distinguish air comfort, water immersion and cooling after swimming. This is NOT a numeric air-to-water "feels like" index, hazard score, water safety certification or locally measured beach temperature forecast.

## Canonicals and intent ownership
- /great-lakes-water-temperature/ — five NOAA GLSEA lakewide daily means (all five lakes)
- /lake-michigan-water-temperature/ — Lake Michigan daily average, history, shore comparison, field guide
- /lake-michigan-water-temperature/grand-haven/ — Grand Haven open-shore experience and station 45029 **offshore** comparison
- /lake-michigan-water-temperature/traverse-city/ — Grand Traverse Bay geography and seasonal station 45020; no open-lake substitution
- /great-lakes-buoys/ keeps the raw real-time station dashboard intent.
- /great-lakes-beaches/ keeps beach hazard, warning and closure evaluation. Do not copy its verdicts.

## Live source contract
- NOAA GLERL GLSEA 3 plain-text daily lakewide mean https://apps.glerl.noaa.gov/coastwatch/ftp/glsea/avgtemps/glsea-temps_1024_3.dat — year/ordinal and six waterbody columns; first five lakes. Header parsed, future records rejected, implausible values dropped; >3 days old = unavailable as *current*.
- NOAA NDBC 45-day realtime station feed https://www.ndbc.noaa.gov/data/realtime2/{45029|45020}.txt — WTMP by HEADER NAME; must be 0–36 °C and <=6 hours old; unknown on recovered/offline days. A station's position is displayed; no geographic extrapolation.
- NWS /points and forecastHourly at exact city point; 12 forecast periods. Hourly is explicitly forecast, not a current measurement. Weather inference contains no safety claim.
- All external failures are tolerated independently with unknown states. API has CDN cache 15 minutes, stale-while-revalidate 30 minutes, request deadlines and whitelisted user-input keys. No background scheduled jobs, external persistent database, AI model calls, or paid APIs.
- The NOAA source's surface satellite blend can use observations from previous days and smoothing; quote exact analysis date and limitations.

## Deterministic interpretation and user value
Each place has four visitor intents: swim, family, paddle, relax. Every intent sees:
1. Beach/air comfort from the NWS hourly air temperature, wind and forecast wording (NOT a radiant heat calculation).
2. Water immersion context from recent, geographically labeled NDBC WTMP only; UNKNOWN if missing. Does not infer actual sand/beach temperature.
3. Post-swim evaporative cooling from wind and wet-skin exposure; qualitative only.
4. Correct next action: check beach hazards for water entry; inspect source for conditions; cold water protection for paddlers.
5. Optional *weather-only* daylight window from relative air temperature, wind and precipitation probability, never called "safe to swim" or a water temp forecast.

### Value function (weighted rubric, 100)
- Provenance and truthful location / recency 30
- Action-dependent clarity and next steps 20
- Differentiated local explanation 15
- Mobile scanability and accessibility 15
- Reliable outages and modest operating cost 10
- Indexable unique answer, stable canonicals and Person identity 10

### Loss functions / publication blocks
- Any lake average labeled "beach temperature": BLOCK
- Any station report older than six hours labeled current: BLOCK
- Any stale NOAA average labeled current: BLOCK
- Any NWS favorable-air period labeled safe swimming: BLOCK
- Any Grand Traverse Bay reading silently replaced by open-lake buoy: BLOCK
- API endpoint indexable or unbounded arbitrary external URLs: BLOCK
- Missing person attribution, route link, canonical, working asset, or failing site CI: BLOCK
- Mobile overflow, inaccessible picker, dead map fallback: BLOCK
- Claim that ranking, 1m impressions or 5% CTR already achieved: BLOCK

## National expansion gate
Build Lake Michigan and two destinations first. Expand other four lake-specific canonical hubs only after station/source coverage, seasonality, citation, differentiated place guidance and measured search intent are verified. Avoid thin mass-generated directories. User-supplied Semrush terms suggest opportunity; current keyword difficulty, current GSC baseline, page RPM and search outcome NOT AVAILABLE in this session.

## Release checklist
- npm run verify:all on complete Git history; full successful test and production build.
- Vercel preview READY and smoke: 200 HTML, CSS and JS; endpoint status; working choice tabs; NOAA measured timestamps; independent weather and buoy outage fallbacks; <=375px without horizontal overflow.
- Review full linked content, external destination/NDBC sources, map controls and attribution. Add live National Tools integration via authoritative national-outdoor-tools-hub owner only.
- Merge only when CI green and review satisfied, then verify production response and exact released commit.
- Baseline GSC 28-day page/query clicks, impressions, CTR, position, branded split; compare at 7/14/28 days. Track monetization and page experience separately. Never claim improvement from shipping alone.

**Exactly one next action:** Verify the full pilot against required CI, preview, live-source, and mobile acceptance gates; do not merge until these pass.
