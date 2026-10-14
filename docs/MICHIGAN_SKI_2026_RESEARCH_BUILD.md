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
Source files: lib/michigan-ski/resorts.js, engine.js, api/michigan-ski.js, public/assets/michigan-ski.js, .css, scripts/generate-michigan-ski-pages.mjs. Models use a provisional 100-point decision index: nearby reported snow up to 20, NWS weekend snow forecast up to 25, drive time up to 27, verified ticket up to 14, verified base depth up to 14. Active winter warnings suspend resort ranking entirely. Wind alignment and warnings never add powder points. Separate NWS Saturday and Sunday local 4 PM snowfall outlooks come from the same point grids. Missing data never earns points. Off-season displays OFF_SEASON_PLANNING. Unknown lift operations and unknown ski base prevent a verified go/no-go endorsement.

One unparameterized cached GET API; 18 resorts entail 36 NWS requests per cold full refresh plus NWS alerts and IEM LSR, six-way concurrency. Twenty-minute in-process refresh guard and 15-minute Vercel CDN cache; region caches are not a global throttle. NWS API availability and rate limiting remain production validation risks. No paid Open-Meteo, SNOTEL, traffic provider or scheduler.

## Acceptance before merge
- Verify 19 sitemap pages (board + 18 detail pages), responsive display and 2026-27 metadata, full Person JSON-LD.
- Verify 18 hill point forecasts and wind direction responses with actual NWS, zone matching and warning-zone synthetic fixtures.
- Verify no guessed price, lift status, base depth, or on-mountain 24h snowfall.
- Compare Detroit and Grand Rapids ranking and ensure Garland is not ranked as downhill.
- Run full verify:all including Utah tests, then deployment preview API/HTML; observe latency and provider 429s.
- Utah source files must remain untouched. Main auto-deploys to production on merge; no merge on failing gates.

SEO observation plan: Search Console Web 28-day query/impression/CTR by hill and lake-effect intent; official-resort outbound use; report weather-source accuracy and Vercel runtime costs. No guaranteed traffic gain.

## Standout v2 — Powder Chase + Worth the Drive (October 14, 2026)

### Independent evidence
1. **NWS forecast:** all 18 resorts use NWS point grids; Saturday/Sunday have separate 4 PM-to-4 PM resort-local snowfall, temperature and wind windows. Ski Brule, Big Powderhorn and Snowriver use Central Time. No third-party weather credits.
2. **Snow observed nearby:** NWS Local Storm Reports via Iowa Mesonet show report timestamp and original accumulation amount. Intervals vary: they are NOT 24-hour resort snow totals. The nearest report within 35 miles is used as proximity evidence.
3. **Official mountain operations:** allowlisted parsers for Caberfae Peaks, Crystal Mountain and Shanty Creek. Both lift and trail counts must parse plausibly, or source status is UNVERIFIED. Checked-at timestamp means page inspection time, not resort report publication time. Current counts do NOT guarantee future weekend operation. Other resorts intentionally show not verified.

### Loss functions
- **Unsafe false green:** active winter warnings exclude resort from normal shortlist. Wind-sector alignment never implies observed lake-effect bands or safe travel.
- **Unverified lift claim:** no verified official source means never assert open lifts. Current published zero does not guarantee future closure. No NWS forecast means no powder winner.
- **Unknown money equals free:** never treat missing adult/child prices, rental rates or fuel mileage as zero. All-in total displays incomplete until the user provides missing quotes and round-trip miles.
- **Wrong skier:** an expert-only mountain such as Mount Bohemia cannot win the family shortlist. Editorial terrain tags are planning context, not current operating status.
- **Incorrect time:** Saturday/Sunday and lake-effect wind match the selected day in each resort's time zone, including DST transition and Sunday morning.
- **Fake map precision:** public US geographic-boundary multipolygon with plotted 18 NWS forecast points; no snowfall interpolation between hills, no map API keys/tiles, marker leader lines mark precise locations when closely spaced.
- **Misleading shoulder season:** air temperatures <=28F are an NWS snowmaking-cold-air *potential* only. Wet-bulb temperature, equipment operation, snowmaking confirmation and ski opening are unknown. Off-season has no numeric ski-day rank.

### Required release gates
1. Full repository gates and generated-page authority audits passing.
2. Regression tests covering official report parser fails closed, DST, Central/Eastern windows, freeze-thaw, snowmaking air-temperature qualification, warnings and no off-season rankings.
3. Visually check deployed preview on desktop and mobile for map dots, day-switch state, cost changes, navigation, resort page and warning visibility.
4. Test real NWS response and real official websites. Do not claim successful live parsing until actual page responses are verified. Blocked official sites return UNVERIFIED.
5. Keep draft PR unmerged until source and browser checks satisfy this gate.
