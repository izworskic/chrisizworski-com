# Michigan Ski Hills 2026–27 — inventory, research and release gates

Date: 2026-10-14. Branch: feat/michigan-ski-worth-drive-2026-27. Status: development branch; not live/deployed.

## Phase 1: Utah baseline
The Utah source at /utah-ski-access/ uses lib/utah-ski/udot.js (three UDOT traffic feeds and conservative safety classification), road-service.js (cached source freshness and unknowns), policy.js (parking and Ikon rules), decision.js (blockers/actions/unknowns), api/utah-ski-road.js and a single static page. It does not ingest SNOTEL, NWS snowfall forecasts, resort reports or snow base, and has no numerical ski ranking or individual resort detail pages. Michigan borrows its serverless caching, freshness, conservative source and deterministic decisions, but adds new weather and scoring engines in isolated files. No Utah source files are modified.

## Phase 2: inventory and verified source choices
Eighteen named destinations: Boyne Mountain, The Highlands, Crystal Mountain, Nub's Nob, Shanty Creek (Schuss), Caberfae Peaks, Treetops, Garland Lodge (Nordic only, exclude from downhill score), Mt. Holly, Pine Knob, Alpine Valley, Cannonsburg, Mt. Bohemia, Marquette Mountain, Big Powderhorn, Snowriver, Ski Brule, Porcupine Mountains.

All 18: NWS /points/LAT,LON -> forecastGridData for numerical snowfall and wind direction, NWS /alerts/active?area=MI for alert polygon and affectedZones, Iowa Environmental Mesonet NWS local storm report GeoJSON for nearby measured snow events. Existing /api/michigan-snow-totals already uses the latter two data families. No resort-specific reliable SNOTEL network. Missing standardized live resort-reported 24/48h snow, base and lift operations must be marked NOT VERIFIED; resort pages link to official sources instead. Open-Meteo free tier forbids advertising-supported sites (https://open-meteo.com/en/terms); not used in default build. Drive times are rough baseline estimates, not live traffic. Resort adult ticket prices are stored only where official 2026-27 day-session prices could be verified; unpriced dynamic rates remain unknown. Big Powderhorn's currently published $99 day ticket is for 2025-26 and is NOT a valid 2026-27 value.

## Distinct lake-effect research angle
NWS Gaylord https://www.weather.gov/apx/les : northwest commonly favors Mancelona, west-northwest Boyne Falls and Gaylord, west-southwest Harbor Springs. These are historical TOWN effects and cannot certify on-mountain snowfall. NWS Duluth https://www.weather.gov/dlh/lakesnow : northern flow favors Lake Superior south-shore snowbelt, with terrain and lake temperature differences; individual hill placement matters. NWS Grand Rapids https://www.weather.gov/grr/windAndLakeEffectSnow : modest wind-direction changes change southern snowband destinations. Scientific context: https://glisa.umich.edu/resources-tools/climate-impacts/lake-effect-snow-in-the-great-lakes-region/.

Michigan lead board has three separate lanes: (1) NWS alerts matched to hill zones/polygons; (2) snow actually reported by a nearby observer with distance/time and UNKNOWN measurement interval, not a resort 24h total; (3) potential wind alignment, explicitly NOT evidence of a snowband. Lake-effect alerts can mean unsafe travel, not a powder bonus.

## Phase 3: model, costs and unknowns
Source files: lib/michigan-ski/resorts.js, engine.js, api/michigan-ski.js, public/assets/michigan-ski.js, .css, scripts/generate-michigan-ski-pages.mjs. Models use a provisional 100-point decision index: nearby reported snow up to 20, NWS weekend snow forecast up to 25, drive time up to 22, verified ticket up to 14, verified base depth up to 14, active lake-effect signal up to 5, and warning-risk penalty -12. Wind alignment has no points. Missing data never earns points. Off-season displays OFF_SEASON_PLANNING. Unknown lift operations and unknown ski base prevent a verified go/no-go endorsement.

One unparameterized cached GET API; 18 resorts entail 36 NWS requests per cold full refresh plus NWS alerts and IEM LSR, six-way concurrency. Twenty-minute in-process refresh guard and 15-minute Vercel CDN cache; region caches are not a global throttle. NWS API availability and rate limiting remain production validation risks. No paid Open-Meteo, SNOTEL, traffic provider or scheduler.

## Acceptance before merge
- Verify 19 sitemap pages (board + 18 detail pages), responsive display and 2026-27 metadata, full Person JSON-LD.
- Verify 18 hill point forecasts and wind direction responses with actual NWS, zone matching and warning-zone synthetic fixtures.
- Verify no guessed price, lift status, base depth, or on-mountain 24h snowfall.
- Compare Detroit and Grand Rapids ranking and ensure Garland is not ranked as downhill.
- Run full verify:all including Utah tests, then deployment preview API/HTML; observe latency and provider 429s.
- Utah source files must remain untouched. Main auto-deploys to production on merge; no merge on failing gates.

SEO observation plan: Search Console Web 28-day query/impression/CTR by hill and lake-effect intent; official-resort outbound use; report weather-source accuracy and Vercel runtime costs. No guaranteed traffic gain.
