# ShoreFeel Intelligence 2.0: investment 2
2026-11-24. Stacked on registry PR #1913. No new public page or serverless function.

## Contract
Use the existing /api/shorefeel-us endpoint, with additive query parameters:
- ?id=epa:MI000290 or ?id=ca:agawa-bay: one selected-beach detail. NOAA offshore water and lake influence are optional, plus up to 12 actual source hourly samples.
- ?ids=epa:MI000290,ca:agawa-bay: up to four registered map IDs. No water lookup or detail series. Duplicate aliases resolve to the same registry ID. Non-map destinations and unknown IDs are rejected.
- Existing ?beach=... and all Michigan and Canadian endpoints remain unchanged.

All 1,050 map-eligible records have official forecast descriptors. NWS land-grid data in the United States, including Michigan; ECCC city forecast data in Ontario. This does not certify that every upstream provider has a usable current forecast every hour. Michigan legacy scores and advisories remain in their existing product; the shared map uses NWS rather than extending Open-Meteo usage. NWS apparent temperature and ECCC wind chill/humidex remain method-specific, not a calibrated on-sand temperature or strictly identical meteorological metric. Current and upcoming forecast periods are distinguished. Source times, expiry, actual provider reference and unavailable results travel with each result. No safety verdict.

## Cost and performance
One existing Vercel function, additive response modes. No paid API, new dependency, cron, database, or blanket fetch of 1,050 beaches. Limit map requests to four IDs; warm-process cache shares identical upstream URLs and concurrent in-flight requests, TTL 120 seconds, 256 entries; cache failures removed. NOAA fetched only for selected detail. This is not a persistent or distributed forecast snapshot, and does not eliminate each distinct NWS points lookup or ECCC bbox lookup. Browser must query bounded visible beach groups, respect expiry, cancel outdated selections, and avoid loading every beach at national zoom. Full-lake snapshot coverage remains a future measured investment. No ads, canonical, sitemap, legacy UI or source inventory change.

## Verification
New tests exercise all map-eligible provider descriptors, cross-border fixtures, source time gates, upcoming ECCC hours, aliases, invalid IDs, bounded cache and shared-grid fetch, isolated failure. Source-level isolated fixture run verified all 1,050 descriptors and three mixed-country results with one shared NWS grid request; the sandbox lacks Node URL and NOAA/network, so the exact fixture URL and no-water path were stubbed. Not a live forecast test or full Node gate. Require CI and real provider smoke before exposing new map. Registry PR #1913 green but not merged; stack must land in order. Separate legacy map PR #1911 has a real overlapping-cluster browser failure; not superseded by an API.
