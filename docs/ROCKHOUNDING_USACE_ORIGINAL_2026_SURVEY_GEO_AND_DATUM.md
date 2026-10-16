# Grand Marais post-storm rockhounding — authentic 2026 USACE survey ZIP and location gate

**Research date: October 15, 2026.** Unlike the earlier USACE eHydro survey-*catalog* entry and NOAA ENC chart values derived from older source surveys, this milestone retrieves and parses the **original July 30, 2026 USACE Grand Marais hydrographic survey deliverable**. The result is **not a shoreline wave sensor, beach bathymetry, current navigational clearance or evidence of freshly exposed stones**.

## Primary-source survey and its audited geographical footprint

The [USACE public eHydro SurveyJob FeatureServer](https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/eHydro_Survey_Data/FeatureServer/0) returned exact survey OBJECTID **125722**, name **Grand Marais Harbor**, USACE district **CELRE**, survey ended **July 30, 2026**, uploaded **September 11, 2026**.

- Original [USACE eHydro survey ZIP](https://ehydroprod.blob.core.usgovcloudapi.net/ehydro-surveys/CELRE/CELRE_DIS_GR_01_MAS_20260730_CS.ZIP), HTTP 200, **4,062,569 bytes**, source content SHA-256 `6dce01ac993dd991219be0da4718fd90b83f3e465099c67e1b3186394081ac5c`. This is an allowlisted US-government Azure blob, not a scraped or guessed filename.
- USACE source catalog lists `GR_01_MAS_20260730_CS.XYZ`, `GR_01_MAS_20260730_CS.XML`, `ReadMe_Survey_Data_Format.txt`, original chart/metadata and survey geodatabase.
- The original archive was safely downloaded and inspected in [run #38826206365](https://github.com/izworskic/chrisizworski-com/actions/runs/38826206365): **144 ZIP members**, source XYZ **17,804 numerical triplets**, with all XYZ records scanned.
- The original FGDC XML reports vertical datum **IGLD 85** and Z/elevation units **US Survey Foot**. The embedded geodatabase WKT reports `VERTCS["IGLD_1985"...]` and `UNIT["Foot_US",0.3048006096012192]` for horizontal State Plane. USACE catalog source projection is `NAD_1983_StatePlane_Michigan_North_FIPS_2111_Feet`. This matches the ESRI **102688** US-foot State Plane name; **do not substitute international-foot EPSG 2251 without addressing the unit difference**. We have not independently transformed all XYZ positions or reconciled dated water level against IGLD85.
- Raw XYZ horizontal coordinate extents in projected **US survey feet**: X **26,504,721.31–26,505,416.15**, Y **691,800.03–695,425.11**. Raw Z elevations relative to source datum range **−29.96 to −7.48 US survey feet**. **These negative elevation numbers are NOT current water depths or navigational clearance.** A dated independent lake level in IGLD85 would be necessary before any water-depth derivation and even then only at actual survey positions/times.

### Critical geographic exclusion

The source eHydro job is an actual **survey-coverage polygon**, not a broad harbor map. Original eHydro polygon: **161 vertices**, one ring, WGS84 envelope **longitude −85.971734 to −85.969027; latitude 46.675899 to 46.685841**. The polygon appears to trace a narrow harbor entrance/approach channel.

| Approximate research location | Point inside original July 30 survey polygon? | Implication |
| --- | --- | --- |
| Bayshore Park research point (46.6719, −85.9839) | **NO** | Do not use 2026 entrance-channel XYZ to assert beach depth or safe sheltered waves |
| Agate Beach research point (46.6760, −85.9853) | **NO** | Does not validate lakeward Agate shore bathymetry or locally breaking waves |
| Interior harbor study point (46.6747, −85.9780) | **NO** | Do not spread channel survey throughout the rest of harbor |
| Entrance-channel sample (46.6823, −85.9702) | **YES** | Valid survey-extent context only; datum and surface level still not calibrated into current depth |

**These point-in-polygon checks use the official surveyed extent**, not bounding-box coincidence. A surveyed *extent* also does not prove that every part within it has equal sounding density.

## What has been implemented

- `scripts/rockhounding/audit-usace-2026-deliverable.py` queries exact USACE official survey job 125722, verifies URL allowlist, source projection, end date, original contents, WGS84 polygon bounds and point-in-polygon classification of BOTH beaches, with bounded HEAD checks on original media.
- `scripts/rockhounding/inspect-usace-2026-zip.py` downloads the actual fixed ZIP with a hard 16 MB network cap, rejects unsafe filenames/encrypted or oversized entries, hashes the original archive, parses FGDC vertical metadata and all available numeric source XYZ rows without unbounded extraction.
- `data/rockhounding/grand-marais-usace-2026-survey-evidence.json` is a reproducible, source-hash-anchored research-only record: 17,804 XYZ elevations and strict beach exclusions. Its safety/bathymetry/surf flags remain **false/null**.
- `lib/rockhounding/usace-original-survey.cjs` validates that exact hash, date, XYZ count, datum and polygon exclusion, and fails closed if it is represented as a present-day lake-level-corrected depth, current safe harbor clearance, wave transmission factor, or beach stone exposure.
- `lib/rockhounding/harbor-bathymetry.cjs` now discloses the original survey's observed extent **does not cover Bayshore Park**, alongside earlier NOAA chart-depth and USACE catalog results.
- `public/rockhounding-lab/index.html` (noindex) presents this scope in the existing compact harbor research details. No ads, public visitor recommendations or paid feeds are changed.
- Regression tests check original source identity, unexpected vertical datum, ZIP traversal security, source polygon location and both rockhounding sites' explicit rejection.
- GitHub Actions `.github/workflows/rockhounding-usace-survey-deliverable.yml` verifies source over HTTPS with no API key, run-limited to research branch/dispatch, retains only a source-metadata JSON artifact. It does not ship raw sounding points to visitors or create recurring large downloads.

## What comes next

1. **Open shoreline timing:** use the more locally representative **NDBC 45172** seasonal Grand Marais offshore waves and GRMM4 land wind context as independent external-event inputs where available; retain existing NDBC 45004 far-offshore comparisons. When 45172 is winter-recovered or silent, say unavailable, not zero waves.
2. **Harbor wave transformation:** remain **unverified**. Neither survey dates, chart depths, pier geometry nor 45172 open-water waves provide sheltered harbor surf attenuation without a new model or paired observations.
3. **Actual rockhounding outcome:** dates when storm events exposed new material and legal access remain unobserved. Do not invent success scores or safe post-storm windows.

**Conclusions are site-specific:** one authentic July 2026 entrance-channel survey cannot validate all 2026 Grand Marais shorelines, much less predict fresh agates.
