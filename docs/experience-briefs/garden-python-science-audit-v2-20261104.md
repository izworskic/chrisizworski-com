# Python Garden Pest Intelligence v2.0: scientific readiness, regional archive and release gates

Date: 2026-11-04

## Scientific goal

Make Michigan Garden Pest Watch better at distinguishing **what a published species model means**, **where climate history changes timing**, and **what the model cannot prove**. Do not turn a broad weather signal or a thermal accumulation into an infestation warning.

This is an actual implementation in the existing `izworskic/chrisizworski-com` repository. Python performs scientific source QC and deterministic offline calculations. The existing JS/HTML visitor tool remains responsible for presentation and decision-making. No Supabase, Redis, self-reported pests or added backend storage.

## Five evidence gates / loss functions

1. **Source provenance loss:** no source URL, unsupported source host, missing year or mismatched location makes a result unavailable. Primary evidence: archived NASA Daymet tmax/tmin for exact coordinates, and published MSU/USA-NPN thermal thresholds.
2. **Data completeness loss:** a duplicate, invalid, out-of-order, missing, or inverted source row invalidates that climate-year/city build. Zero-fill is prohibited.
3. **Biology mismatch loss:** pest-specific thermal starts, bases, caps, formulas, thresholds and stage names must not be mixed. Japanese beetle and cabbage maggot cannot use the same generic degree-day sum.
4. **False-precision loss:** event ranges from past weather are **not** local pest flight dates or forecasts. If a threshold is not reached in any historic year, no five-year timing band is shown. Official model parity and observed-pest accuracy remain **unvalidated**, not scored as 100%.
5. **Visitor-decision loss:** no unsupported probability, spray recommendation, inferred ZIP location, or simulated 2026/2027 record. The regional panel gives a useful seven-city climate comparison and truthful source limitations, while the existing official Japanese beetle forecast and garden pest identification tools remain independent.

## Model readiness audit

| Evidence class | Publisher/source | Published biological detail | Current operational status | Independent precision / observed validation | Decision |
| --- | --- | --- | --- | --- | --- |
| Japanese beetle adult and egg stages | USA National Phenology Network, [Pheno Forecast](https://www.usanpn.org/data/maps/forecasts/Japanese_beetle) | Published 873 and 1543°F-degree-day single-triangle thresholds, base 50°F, upper 92°F, Jan 1 start | Existing, separate official USA-NPN raster forecast remains authoritative for actual 2026/2027 seasons when sources are dated and available | Historical Daymet reconstruction has **no verified parity** with DDRP input/weather grid or field emergence | Seven-city historical comparison is permissible; not a substitute current forecast |
| Cabbage maggot first, second and third adult stages | MSU Enviroweather [Cabbage Maggot](https://enviroweather.msu.edu/crops/coleCrops/cabbagemaggot) | Base 43°F starting Mar 1, thresholds 300 / 1476 / 2652°F-degree-days | MSU runs an official station model; no verified output API or direct local integration exists in this tool | Public page does not specify a full degree-day accumulation formula; Python uses a **provisional simple-average** interpretation | Historical experimental comparisons only; current flight or application timing blocked |
| Squash vine borer | MSU Enviroweather [squash vine borer](https://enviroweather.msu.edu/crops/cucurbits/squashvineborer) | Incomplete independent operational reuse contract | Tool has local photo evidence but not complete verified phenology-model parity | Unvalidated for a heat-threshold forecast | Existing photo identification and crop-stage scouting remain; do not create a thermal emergence date |
| Corn earworm | [MSU vegetable crop report, September 2, 2026](https://www.canr.msu.edu/news/michigan-vegetable-crop-report-september-2-2026) | Reported moth captures, not a single calibrated garden emergence forecast | Existing measured 2026 county trap archive and separately gated 2027 source discovery | Confirmed historic field-trap measurements, but not ZIP-accurate trap coverage or garden infestation | Preserve observation dates, zeros versus nonreports and trap-type caveats. Do not borrow thermal models |
| Weather-scouting hints (mites, leaf disease) | National Weather Service hourly forecast | Broad wet/hot-dry conditions | Existing 72-hour weather signals | No species-specific calibration or field accuracy demonstrated | Qualitative check-now guidance only |

Numerical prediction error or forecast skill cannot be responsibly scored until a matched dataset of **observed pest first flights at known stations and dates** is available. No synthetic sighting submissions will be solicited. A claimed 85% confidence score would be fabricated.

## Python archive implementation

### Actual source rows, not fabricated fixtures

`data/garden-pest-daymet-2021-2025/*.csv` contains all **seven** original NASA Daymet CSV responses, each with **1,825** daily rows: 2021, 2022, 2023, 2024, and 2025, exactly 365 rows per year. Each record is the historic **1 km gridded meteorological field** for a known Michigan reference point, not a garden air/soil sensor or a pest trap. Points are the existing site's official named-city reference coordinates.

The seven fixed reference locations are Bay City, Detroit, Grand Rapids, Kalamazoo, Traverse City, Marquette, and Houghton. 7 × 5 × 365 = **12,775** source daily temperature rows. Daymet leap-year behavior is preserved; in 2024 its yday 365 corresponds to **December 30**, not an invented December 31 reading. Source NOAA/Daymet claims must not be confused with field-measured pest counts.

### Independent model math

- Japanese beetle: daily single-triangle horizontally capped heating: area above 50°F minus area above 92°F; start Jan 1; published stages 873/1543°F-degree-days. Source method is published but **parity with operational DDRP implementation is unverified**. The separate existing USA-NPN raster endpoint remains the only current species-specific operational forecast.
- Cabbage maggot: daily positive mean GDD43 after March 1, thresholds 300/1476/2652°F-degree-days, each shown as a provisional assumption because the cited MSU page does **not** document enough calculation details to establish method parity.
- Every threshold emits its earliest actual **model heat-crossing date** per reconstructed climate year, or null if not crossed. Never claim emergence was observed.
- The seven-city time-band uses only seasons with all five crossings. A missing crossing vetoes the 5-year range, rather than interpolating or dropping the missing year.

`scripts/build_garden_pest_python_fieldbook.py` validates raw NASA input, compiles a deterministic versioned JS asset, and runs in `--check` mode in CI. `tests/test_garden_pest_python_fieldbook.py` covers method math, geographic provenance, missing/duplicate/inverted inputs, leap calendar, no crossing, and output reproduction.

### Visitor-facing product

The existing Pest Watch page gains a purpose-built **Python Regional Fieldbook** below its on-demand historical Japanese beetle lab. It supplies:
- seven comparative climate-reference tracks, not inferred user locations;
- species-specific model and life-stage controls;
- exact five-year historical heat-crossing dates, no forecast extrapolation;
- original NASA, MSU and USA-NPN source links and explicit model/field-validation caveats;
- accessible no-JS/failure states, and mobile layouts.

The original current-season Japanese beetle forecast, crop guidance, photo evidence, MSU 2026 corn earworm traps and 2027 review gate are unmodified.

## Benchmark scorecard

| Gate | Target |
| --- | --- |
| Real source daily rows | 12,775 / 12,775 complete |
| Gridded climate cell-years | 35 / 35 complete |
| Named Michigan reference points | 7 / 7 |
| Published stage thresholds | Japanese 2, cabbage maggot 3, kept independent |
| Operational parity claimed | 0 |
| Local pest presence claimed | 0 |
| Inferred outbreak probabilities / spray schedules | 0 |
| Browser checks | 360, 390, 768, 1440 px; stage changes, ZIP independence, invalid source, no-JS |
| Site quality | Existing canonical and current source-verification processes preserved |

## Next scientific investment after this release

Obtain a published/permissioned **observed station-level first-flight dataset** for cabbage maggot, validate and calibrate heat-threshold crossing against actual field dates, measure out-of-sample absolute timing error (median and 90th percentile), and only then consider live operational forecasting. Do not describe a retrospective threshold calculation as a validated predictor. Also pursue official MSU model result access rather than scraping undocumented endpoints.

NASA citation: Thornton et al. (2022), Daymet Version 4 R1, NASA ORNL DAAC, DOI: https://doi.org/10.3334/ORNLDAAC/2129.
