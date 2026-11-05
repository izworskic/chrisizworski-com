# Cabbage maggot field validation: November 5, 2026

## Decision: real field evidence is present, first-flight calibration remains scientifically blocked

An April 2026 *predicted* flight window is not a field observation. A May 2026 crop trial is not an independent documented first adult trap capture. No official matching station-year first-positive adult-trap dataset for Michigan 2021–2025 was located in this investigation. Do not print an accuracy score, MAE, P90, field-validated badge, probability or localized outbreak prediction.

The independently documented **2025 MSU Extension biological field observations** were recovered and added to the page. They support *confirmed cabbage maggot presence and injury* in a particular spring, not an accurately known first flight.

### Original MSU reports, audited November 5, 2026

1. **May 7, 2025**, [report](https://www.canr.msu.edu/news/michigan-vegetable-crop-report-may-7-2025), **west-central Michigan**: cabbage maggot eggs observed in one brassica planting **"this week"**. Unknown first egg date, exact field location, adult first flight and sample effort.
2. **May 7, 2025**, same issue, eggs at bases of turnips in **at least one Michigan field**. Not established as an independent field or station relative to the brassica report. Censor by issue date; no forced first-egg timestamp.
3. **May 14, 2025**, [report](https://www.canr.msu.edu/news/michigan-vegetable-crop-report-may-14-2025): cabbage maggot stem feeding reported along field edges; geography unspecified. The adults must have preceded observed larval feeding, but their first emergence day is unknowable from this statement.
4. **June 4, 2025**, [report](https://www.canr.msu.edu/news/michigan-vegetable-crop-report-june-4-2025): reports of spring cabbage maggot damage across Michigan, without coordinates of independently sampled sites.

**Evidence counts: 4 mentions, 3 publication issues, one documented calendar season (2025), zero independent adult first-flight trap-station/year pairs.** A duplicated week of field reporting cannot be treated as four separate first flights, a zero-trap count or a statistically representative sample. It is not a current 2026 outbreak either.

These are model-independent organism reports, not a means of deriving the model's first-flight accuracy.

### Model source discrepancies discovered

- [MSU Enviroweather cabbage maggot](https://enviroweather.msu.edu/crops/coleCrops/cabbagemaggot) describes base 43°F, accumulating from March 1, and 300, 1476 and 2652°F-degree-day milestones. The public model page does not completely specify its formula or station weather input.
- [MSU Extension 2017 species review](https://www.canr.msu.edu/news/cabbage_maggots_of_cole_crops) separately identifies **first adult emergence at 300 DD43** and a **spring first-generation peak flight/egg laying near 565 DD43**. The latter is not the same biological event as the first emergence.
- [UC IPM model summary (March 2026)](https://ipm.ucanr.edu/weather/phenology-models-description/cabbage-maggot/) attributes the cabbage-host 300 DD43 original field model to Eckenrode & Chapman 1972, Wisconsin field tests with **modified max/min**, and recommends **single sine** as a modern calculation. Wisconsin validation is evidence that a model exists, not a validation of our Michigan Daymet implementation.
- [UMN Extension](https://extension.umn.edu/garden-and-home/yard-and-garden/yard-and-garden-insects/root-maggots) provides an alternative positive daily-mean DD43 monitoring formula, but does not establish exactly the MSU March 1 implementation. Neither approach's current MSU parity is established.

### Python comparison: sensitivity to method, not truth error

Original NASA ORNL Daymet 2021–2025, seven source-verified 1-km gridded reference points, **35 full station-grid years**, is used for two *independent calculations* of first 300 DD43 from March 1:
- positive daily mean (current archival model's unverified method)
- analytical single sine above the same lower threshold, per UC IPM's recommended method class

Both are compared on identical temperature records, never calibrated to the MSU field observations. The sine method reaches the first 300 DD43 **1–15 days earlier** across these 35 gridded historical years. The difference is in model formulas, **not** a 1–15 day forecast error. Calculations include distinct 565 DD43 first spring flight peak milestones to avoid confusing onset with peak.

Illustration: in Grand Rapids's *reference climate grid* in 2025, daily mean 300 DD43 crossing = May 6; single sine = April 28; daily mean 565 DD43 peak milestone = May 26. MSU's west-central Michigan *report* noted eggs by its May 7 publication. This is neither a matched site nor the first day adults flew; calling the May 6 vs May 7 relationship "one day accurate" would be manufactured.

The page therefore shows both evidence types, explains the missing geographic and timing precision, and disables numerical model-skill outputs.

### Quality / loss functions

1. **First-flight provenance:** Only adult `Delia radicum` first-positive trapping intervals, expert species ID, preceding negative trap checks, exact site coordinates, independent weather inputs, and time of sampling are eligible to score flight-date error.
2. **No model-to-itself validation:** Ignore messages derived from an Enviroweather predicted heat stage (including April 29, 2026 report) as "field evidence".
3. **Date precision:** Issue publication date can only prove organism observations existed by issue date. It is not day-of-first-flight.
4. **Spatial precision:** West-central Michigan is not Grand Rapids or Bay City station. Do not subtract an unlocated report date from a Daymet grid crossing to calculate a forecast error.
5. **Independent testing:** At least three *preregistered held-out* seasons and two independent stations must be assembled, with a locked formula, before calculating out-of-sample accuracy. One publication issue is one provenance source, not multiple station sample points.
6. **No outcome manipulation:** User-submitted observations are unnecessary. No Supabase, Redis, new infra or photo-based adult Delia IDs.
7. **Visitor truth:** The field context panel never changes the crop decision API, pesticide/treatment threshold, or official Japanese beetle and MSU corn earworm evidence.

### Implementation

- `data/garden-cabbage-maggot-official-evidence.json`: verified source-reviewed date and geography ledger; explicit modeled nonobservations excluded.
- `scripts/build_garden_cabbage_validation.py`: deterministic Python archive / data-quality veto / 35 grid-year algorithm sensitivity; future station-first-flight evidence is blocked until its own schema-and-method validation is formally approved.
- `public/assets/garden-cabbage-validation-data.js`: compiler-authored versioned browser data.
- `public/assets/garden-cabbage-validation.js` & `.css`: original source-linked biological proof desk and region-specific method comparison, with no-JS and failure fallback.
- `tests/test_garden_cabbage_validation.py`: 9 scientific tests including independent numerical sine integration, data-vetoes and output exactness.
- `scripts/verify-garden-cabbage-validation.cjs`: source/model/release & sitemap integrity.
- `scripts/verify-garden-cabbage-validation-browser.cjs`: source trust, main crop selection independence, mobile 360/390/768/1440, corruption failure and no-JS states.
- CI: garden pest visuals, source-stamp audit and garden browser workflow.

### Path to full calibration

Search for and license/obtain **official Michigan station-level 2021–2026 spring first-adult fly trap records** with sampling schedule, negative-to-positive transition, confirmed species, exact coordinates, and independently archived station weather. Lock both model methods before testing, hold out at least three seasons and multiple stations, compare interval-censored first catches (not assumed first emergence), measure median absolute timing error and upper-tail error, and evaluate against a predeclared calendar-only baseline. If raw data cannot be obtained, the scientifically correct result remains **"no site-matched independent flight validation"**, not a forced score.

This is the maximum honest science available from the currently accessible public MSU reports, with a working reproducible validation gate ready to admit genuinely matching future official evidence.
