# Photo-free Grand Marais current offshore conditions (October 16, 2026)

Yes: original measured offshore waves and NWS alerts support a meaningful photo-free rockhounding research tool, without using or requiring photographs. The evidence supports **lake-activity patterns**, not verified newly exposed stones, safe shore access, or beach wave heights.

## Direct no-key source

- Original GLOS Seagull `obs_140` Grand Marais SPOT-1361: https://seagull-erddap.glos.org/erddap/info/obs_140/index.html . Bounded 72-hour UTC observation query: measured significant wave height (m), wave-from direction (degrees), mean period (s), UTC time and original position.
- NWS original active alerts: LSZ250, LSZ251 and Grand Marais point, queried independently and concurrently. ACTIVE, CLEAR (no matched checked alert, **NOT safe**) or UNKNOWN (outage/partial check).
- Edge cache 15 minutes + 15-minute stale-while-revalidate; up to four public no-key reads per cache revalidation. No paid API, photo, per-visitor third-party fan-out or user-supplied endpoint.

## Descriptive wave phases, not stone forecasts

- OFFSHORE_WAVES_ELEVATED: observed latest significant height at least 1.0 m (a research bin, **not a hazard threshold**).
- OFFSHORE_WAVES_REBUILDING: observed waves rise after a sampled trough, meaning the lake has not simply settled.
- OFFSHORE_WAVES_EASING: actual recent offshore peak plus at least three hours of lower measured readings, with sufficient time coverage.
- RECENT_OFFSHORE_WAVE_ACTIVITY and LOWER_OFFSHORE_WAVE_ACTIVITY: distinguish recent offshore disturbance from lower observed activity; neither grants safe passage.
- OFFSHORE_SENSOR_STALE, OFFSHORE_OBSERVATIONS_GAPPY, NO_OFFSHORE_SOURCE_OBSERVATIONS and OFFSHORE_SOURCE_UNAVAILABLE: fail closed on old, missing or interrupted provider data. Source UTC age over three hours prevents current-condition statements; the client reevaluates age after edge caching too.

## Code and UX

- `lib/rockhounding/live-photo-free-pulse.cjs`: source-validated observed-only phase engine, 48-hour measured chart sample, no interpolated gaps, independent hazard context.
- `api/rockhounding-wave-pulse.js`: GET/HEAD-only Vercel endpoint, constrained original source URLs and 8-second GLOS / 6.5-second concurrent NWS request timeouts, noindex, edge cache.
- `public/rockhounding-lab/index.html`: new current photo-free readings, 48-hour observed offshore wave chart with gaps disconnected, original sample timestamp in Michigan time, NWS alerts, and explicit warnings before the existing historical 2026 chart. Research lab remains noindex; no ad or canonical URL changes.
- `tests/rockhounding-live-photo-free-pulse.test.js` and `tests/rockhounding-live-photo-free-ui.test.js`: original provider field/units, source, event phase and missing data, distinct NWS hazard flag, privacy and no unsafe access recommendation, maintained responsive historical panels.

## Permanent evidence limits

- Original GLOS Spotter measures **offshore Lake Superior**, not surf on Agate Beach and not sheltered Bayshore harbor waves. The 2014 chart-derived facing direction is historical orientation research, not a present-day shoreline refraction model.
- Photo verification is **not required** for reporting a measured wave pattern.
- The API explicitly denies new-agate predictions, newly exposed stone claims, rock-exposure score, shore safety clearance, safe visit windows and harbor surf estimates. It reports separate NWS alerts as planning context. No alert is never equivalent to safe.

**Next independent environmental input**: verified water-level observations with known datum and source proximity, for lake-level change context. It must not invent exposed-stone outcomes or assume a remote gauge directly captures Grand Marais water level.