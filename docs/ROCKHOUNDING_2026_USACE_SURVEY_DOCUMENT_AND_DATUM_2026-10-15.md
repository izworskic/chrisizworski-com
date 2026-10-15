# Michigan rockhounding: 2026 Grand Marais USACE hydrographic survey deliverable

**Research checked October 15, 2026.** The verified Grand Marais Harbor July 2026 USACE survey is now traced to an original public *survey plot* and original survey-data archive location. This is evidence of a dated harbor hydrographic survey, not a safe-water, navigation, or fresh-agate prediction.

## Newly verified primary sources

1. Official [USACE eHydro SurveyJob feature 125722](https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/eHydro_Survey_Data/FeatureServer/0/query?where=OBJECTID%3D125722&outFields=%2A&returnGeometry=false&f=pjson). **SurveyJob ID** `GR_01_MAS_20260730_CS`, Grand Marais Harbor, Detroit District `CELRE`, survey type `CS`, **July 30, 2026**. Catalog entry uploaded **September 11, 2026**. The latter date is **not** the survey date.
2. [Official July 30, 2026 survey plot (PDF)](https://ehydroprod.blob.core.usgovcloudapi.net/ehydro-surveys-pdf/CELRE/CELRE_DIS_GR_01_MAS_20260730_CS.PDF), publicly accessible and text inspected on October 15, 2026. Its NOTES identify:
   - Depth/sounding vertical reference **IGLD 1985**; low water datum reference **601.1 feet**.
   - Instrument: **R2SONIC 2024 multibeam sonar**.
   - **RTK GPS** horizontal positioning, corrections from **Michigan CORS**.
   - **NAD83 Michigan State Plane North (2111), US survey feet** coordinates.
   - Navigation aid locations are illustrative and **not for navigation**.
3. Official [source survey archive (ZIP)](https://ehydroprod.blob.core.usgovcloudapi.net/ehydro-surveys/CELRE/CELRE_DIS_GR_01_MAS_20260730_CS.ZIP) listed in the *same* USACE survey job's `sourcedatalocation`. Its **advertised manifest** includes `.XYZ`, `.XML`, `.GEN`, a survey conditions report, `.PDF`, `.DAT`, `.gdb` and `_tin`. **We have not downloaded, decompressed, spatially clipped or validated the XYZ/TIN**, and cannot claim depth coverage at Bayshore or Agate from this catalog alone. A listed ZIP file is not proof of archive payload integrity.

For context, earlier [NOAA ENC survey-depth research](ROCKHOUNDING_HARBOR_CHART_DEPTH_EVIDENCE_2026-10-15.md) covers charted sources dated 2004–2020 and has no independently reconciled chart datum/units. Never directly mix these historic chart values with IGLD85 survey-plot values without a documented datum and sampling comparison.

## Implementation and verification

- `data/rockhounding/grand-marais-usace-2026-survey-source.json` freezes the precise original USACE job ID, source links, 2026 date, chart-datum notes and no-safety flags.
- `scripts/rockhounding/verify-usace-2026-source.py` makes **one** small official ArcGIS REST query of a known source feature. It verifies dates, survey ID, exact official archive and plot locations, projection and advertised archive manifest. This does not download survey raster, XYZ, ZIP, or PDF files and is never called per visitor.
- `lib/rockhounding/usace-2026-survey.cjs` enforces provenance, datum and publication-claim gates. Integrated with `lib/rockhounding/harbor-bathymetry.cjs`; it yields **2026 survey plot source confirmed / depth XYZ unreviewed** and continues to return null for measured harbor waves and visitor-safe windows.
- Python and Node tests prevent upload dates from substituting survey dates, bogus datum units, modified source links, invented calibrated model parameters or surf/safety claims.
- `.github/workflows/rockhounding-usace-2026-survey.yml` checks a single real public eHydro record plus offline tests. No API key, paid service, public ad/SEO setting, sitemap, public report route or user-side lookup.
- The existing noindex research lab provides the directly linked official 2026 USACE harbor plot next to source-role explanations.

## Exactly what remains to unlock useful post-storm visitor decisions

First, separately validate **where** the July 2026 XYZ survey points fall (harbor footprint vs. open Lake Superior shoreline), survey elevation units and datum, vertical comparability to NOAA chart depths and whether this data helps explain harbor shelter geometry. **A recent bathymetric survey alone still cannot establish how offshore waves propagate past the piers**, or guarantee safety. If no measured harbor-wave sensor/calibrated transformation exists, keep the protected harbor as qualitative context and prioritize the exposed Agate Beach offshore storm event engine.

Second, collect dated beach observations from actual post-storm days, incorporate current NWS marine hazard alerts and public collection-permission gates. Avoid synthetic probability scoring or publishing 'best time to rockhound' before observation-based calibration.

Live source validation evidence is retained in the GitHub Actions research workflow.
