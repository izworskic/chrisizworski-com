# Michigan rockhounding — Grand Marais contemporary hydrographic and wave-feed audit

Research milestone: **October 15, 2026**. This is a **source-discovery and provenance gate**, not a public post-storm collecting forecast.

## Verified primary-source discoveries

1. **USACE hydrographic source:** The official [USACE eHydro SurveyJob polygon catalog](https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/eHydro_Survey_Data/FeatureServer/0) supports bounded queries and exposes `sdsfeaturename`, `surveydateend`, `dateuploaded` and `sourcedatalocation`. These are **survey metadata** and must never be treated as a measured harbor wave or depth field. The official [USACE Grand Marais project page](https://www.lrd.usace.army.mil/Missions/Projects/Article/3639890/grand-marais-harbor-michigan/) links **2021, 2022 and 2023 project condition surveys**, without establishing 2026 dredging completion or current harbor depth. A link to a PCS does not validate the newest survey delivered through eHydro.
2. **Local station GRMM4:** [NDBC/NWS station](https://www.ndbc.noaa.gov/station_page.php?station=GRMM4), ~46.684,-85.972, reports local winds. Published recent standard meteorological rows show wave/period/direction columns unavailable. A coastal wind station with blank `WVHT` is **not** a measured harbor surf sensor.
3. **Offshore station 45172:** [NDBC Grand Marais buoy](https://www.ndbc.noaa.gov/station_page.php?station=45172), ~46.740,-85.980, approximately 6 km north of the harbor; its current station page says **recovered for winter / no recent reports**. Even when operating, it represents offshore, not sheltered harbor, waves. Not proof of safe inland shoreline.
4. **Regional reference 45004:** Existing [NDBC East Superior](https://www.ndbc.noaa.gov/station_page.php?station=45004) historic observed-wave events remain valuable as offshore forcing evidence, not Grand Marais beach validation.

## Implementation

- `scripts/rockhounding/verify-usace-ehydro.py` queries USACE public ArcGIS FeatureServer/0 once for a narrow Grand Marais bbox (-86.01,46.65,-85.94,46.71). It uses no API key; validates source identifiers, proper epoch-millisecond survey dates, clipping, truncation, and actual place name (including historical typo `Grand Marias`). It never substitutes `dateuploaded` for `surveydateend`. If no named catalog job is returned, it reports **no named match in this geographic query**, not proof no harbor surveys exist.
- `data/rockhounding/grand-marais-contemporary-source-register-2026-10-15.json` distinguishes dated project links from query results **not yet checked in production**, and marks all three NOAA station roles. It does not invent a harbor sensor.
- `lib/rockhounding/contemporary-harbor-evidence.cjs` validates source records and fails closed if any USACE catalog row, station role, or safety/collecting flag is promoted. Even a genuine recent USACE survey does not supply measured wave attenuation.
- Existing `lib/rockhounding/harbor-bathymetry.cjs` now reports the contemporary source gate alongside historic ENC pier/depth coverage.
- Python and Node regression tests guard missing sensor data, bad dates, wrong geography, truncated responses, and unsupported surf claims.
- `.github/workflows/rockhounding-usace-ehydro.yml` queries the **actual** USACE catalog on research-branch push or manual workflow run and archives the full source response for review. Not scheduled or called on each visitor.
- `public/rockhounding-lab/index.html` (noindex) explains current data-source roles plainly; all simulated wave readouts remain labeled as examples.

## Remaining hard gates

- Inspect the live bounded eHydro catalog audit artifact. If survey jobs are returned, review the actual attached deliverables, survey date and geographic coverage before calling the bathymetry current. A survey catalog entry alone does not validate depth or wave attenuation.
- **Measured local harbor wave observation or calibrated sheltered-harbor numerical wave model remains missing.** Neither 45172 nor GRMM4 fills that gap.
- Validate observed post-storm reshuffling/rock finds, shore access/collecting permissions, nearshore hazards and ice. **Never publish "best time to rockhound", "safe beach" or "fresh agates" until these independent gates are satisfied.**

**Next priority after catalog audit:** strengthen the *open exposed shoreline* historical event-validation track with real locally relevant wind plus buoy waves and model-skill comparisons, while keeping Grand Marais harbor waves unknown. No emails, site visits, API credits or new visitor-side requests required.
