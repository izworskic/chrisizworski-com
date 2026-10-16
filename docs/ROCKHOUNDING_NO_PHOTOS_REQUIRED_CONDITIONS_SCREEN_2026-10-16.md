# Grand Marais rockhounding — photo-free conditions screen

Date: October 16, 2026. This is a standalone **noindex product-preview screen** at `/rockhounding-conditions/`. It answers the prior prototype's product bottleneck: photographs are optional research evidence and **are not needed to explain measured offshore storm conditions**.

## What works now

One on-page request to the *existing* Vercel `/api/rockhounding-wave-pulse` endpoint supplies:
- GLOS Seagull **SPOT-1361**, observed original Grand Marais-area open-Lake-Superior waves, timestamped significant height, wave-*from* direction, and mean period. The route retrieves seven days, analyzes the last 48 hours and seven-day measured episode memory.
- Source-verified wave-phase states (building/rebuilding, elevated, lower/easing, unavailable), with 3-hour maximum source age and adequate last-12-hour sample coverage. The frontend reevaluates source age even after CDN caching.
- 48-hour observed wave activity comparison to the previous 24 hours, **only** when both observation windows are sufficiently sampled. This is a relative *offshore* metric, not rock-exposure likelihood.
- Independent **NWS marine warnings/advisories** checked at LSZ250, LSZ251 and a Grand Marais shoreline point. **ACTIVE** alerts stand out; **UNKNOWN** remains unknown. No alert is never a shore-safety clearance.
- Independent **NOAA Marquette C.G. 9099018 remote Lake Superior water-level context** with IGLD 1985 datum, displayed only for a valid current 24-hour reference; it does not measure the beach waterline.
- A 48-hour/7-day **SVG wave-height time series**, entirely rendered from the existing API's original reading arrays, with source gaps over 90 minutes **not joined**; an explicit sampled-wave-peak marker, source timestamps in Michigan time, and no false interpolation.

The screen has responsive mobile cards and chart, original source links, a refresh control, explicit beach/hazard interpretation, and **zero required images, photographs, accounts, paid API keys, maps, or frontend third-party data calls**. Its hero landscape is CSS-only and explicitly labeled as a schematic.

## Why both beaches are not scored alike

The Spotter measures *offshore open-lake* wave conditions north of Grand Marais. **Agate Beach** faces the open lake, but there is no calibrated transfer model from the buoy to breaking waves, sediment transport or specific new stones on that beach.

**Bayshore Park** is sheltered inside Grand Marais harbor. The open-lake Spotter height cannot be represented as Bayshore surf. The nearby USACE 2026 entrance-channel soundings likewise do not cover the research beach footprints.

The page does not award a numerical rockhounding probability, recommend access to water, claim legal collecting permissions, or predict fresh agates. Wave activity, lake-level context and safety alerts remain **separate** sources.

## Implementation

- `public/rockhounding-conditions/index.html` — standalone mobile-friendly photo-free view, with only one GET request to the pre-existing edge-cached aggregation API.
- `tests/rockhounding-photo-free-conditions-screen.test.js` — verifies source identifiers, 48h/7d chart controls, browser JS parse, stale data, current alerts, unverified remote gauge treatment, no new provider fetches, no image/ad/map/SEO modification, and no public new-stone or safety claim.
- `.github/workflows/rockhounding-photo-free-conditions-screen.yml` — screen and complete science regression tests.

The existing `/rockhounding-lab/` full research notebook is unchanged. New preview remains **noindex** pending separate publication, access-legality checks and explicit product review. The new page and API have been implemented in the repository; public deployment/route smoke is a separate verification step.

## Sources

- GLOS Grand Marais SPOT-1361: https://seagull-erddap.glos.org/erddap/info/obs_140/index.html
- NOAA Great Lakes observed levels: https://glerl.noaa.gov/data/wlevels/
- NOAA CO-OPS Marquette 9099018: https://tidesandcurrents.noaa.gov/stationhome.html?id=9099018
- NWS active marine warnings: https://api.weather.gov/alerts/active?zone=LSZ250
- USGS wave climate and lakebed context: https://pubs.usgs.gov/publication/70018025

**Next priority:** Real-world route verification, on-screen mobile acceptance tests and choosing whether/how to promote the noindex page to the eventual public rockhounding tool. No photo dependency is required for the visitor experience.
