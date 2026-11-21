# ShoreFeel: first measured shoreline source, GLOS Petoskey

**Research date:** 2026-11-21.
**Status:** offline source adapter and CI research probe. These are not calibrated *at-the-sand* measurements and do not authorize a published beach temperature correction.
**Owning source:** GLOS Seagull ERDDAP `obs_127`, operated by the Little Traverse Bay Bands of Odawa Indians. Public file: https://seagull-erddap.glos.org/erddap/info/obs_127/index.html . Data access: https://seagull-erddap.glos.org/erddap/tabledap/obs_127.html .

## Problem and choice

Existing ShoreFeel Saginaw Bay code already provides research-only HRRR/URMA *model grids* and a strict offline field-validation harness. The missing ingredient is verified, independently sourced actual shoreline air observations. GLOS has an existing weather station at **Petoskey State Park Bay Beach**, measuring air and wind. Its ERDDAP metadata lists an instrumental time series and QARTOD-style aggregate flags. It is one **coastal weather station**, not a proven dry-bulb air logger placed at the exact sand, and does not include a paired inland site.

Three paths were compared:
- **Pull more NOAA GRIB hindcasts:** not selected; valuable atmospheric context, but not independent observed beach truth.
- **Reuse the real GLOS Petoskey station for a bounded, provenance-controlled historical experiment:** selected as a source ingestion test. Existing data, legal accessibility, no new physical installation or production dependency.
- **Construct a coast-minus-MBS-airport gradient:** rejected. Saginaw MBS International Airport and Saginaw Bay lighthouse sensors are not a matched beach/inland pair. Different siting, distances and times would yield misleading precision.

GLOS reports the dataset covers at least 2022 onward. The ERDDAP data access metadata inspected on 2026-11-21 listed **time_coverage_end: 2025-02-19T07:20:00Z**, so the source is **historical**, not a confirmed current shoreline reading. The importer never pretends today's weather comes from an old record.

## Source register and rights

- GLOS source information: https://seagull-erddap.glos.org/erddap/info/obs_127/index.html
- GLOS provider API instructions: https://glos.org/data/faq/
- The dataset's published license permits free use and redistribution but disclaims inaccuracies and warranties. Cite operator and GLOS when discussing the data. No provider endorsement implied.
- Published unit contract: `air_temperature` Kelvin, `wind_speed` meters per second, `wind_from_direction` degrees, `time` UTC. Aggregate quality flags: **1 = GOOD; 2 = NOT_EVALUATED; 3 = SUSPECT; 4 = BAD; 9 = MISSING**. Restrict research observations to temperature quality GOOD. Wind values are retained only when wind speed and direction both have GOOD aggregate flags.
- Published approximate station reference: 45.407589 N, 84.912903 W. Accept only data points within a conservative 0.025 deg latitude and 0.035 deg longitude window for station-identity integrity. This is not proof of an instrument within 200 m of the actual water edge, a validated wind fetch, height, exposure or proper radiation shielding.
- Metadata and provider values can be corrected after publication. Preserve query date/window, raw source URL and any source revisions separately if used for real scientific evaluation.

## Implemented research adapter

`scripts/shorefeel-glos-observations.py` is an offline/optional network CLI with exactly one hardcoded source dataset and only bounded UTC ranges of at most 24 hours. No arbitrary remote URLs, redis, keys, cron, Vercel Python runtime, new front-end, advertising or canonical changes. A response above 2MB or 5,000 records fails. The tool checks column names/physical units, time/coordinates, QARTOD aggregate flags, temperature/wind ranges and duplicated/conflicting timestamps. It converts Kelvin to Fahrenheit and m/s to mph.

Output contract `shorefeel.glos-shore-observations.v1` separates `observations`, source/station metadata, good air/wind coverage, missing and conflicting counts, six-hour source freshness, and explicit science gates. It **always** returns:

```json
{
  "hasVerifiedBeachSandThermometer": false,
  "hasIndependentlyVerifiedSensorSitingAndShielding": false,
  "hasSameHourInlandObservation": false,
  "shoreInlandGradientF": null,
  "candidateForecastSkill": null,
  "calibrationAuthorized": false,
  "publicationAuthorized": false
}
```

These values are a schema **example of forced safeguards**, not an actual result or station sample.

Run the source probe, only on a research workstation with permitted public access:

```bash
python3 scripts/shorefeel-glos-observations.py \
  --start 2022-06-01T12:00:00Z \
  --end 2022-06-01T16:00:00Z \
  > /tmp/petoskey-historical-research.json
```

The date is supported by a source archived file listing: https://seagull-erddap.glos.org/erddap/files/PSP_archive/2022/ . It is **not evidence the exact four-hour window has any good readings**. The test is designed to return an explicit NO_QC_APPROVED_OBSERVATIONS status when no usable observation is present.

The reproducible GitHub Actions workflow `.github/workflows/shorefeel-glos-observations.yml` runs Python science tests and retrieves that bounded real source window. Its JSON is retained in an ephemeral 14-day CI artifact. The exact successful source retrieval is documented below; each later sample remains independently gated.

## Distinction from previously developed paired-field engine

No GLOS station value is automatically ingested into the Saginaw Bay `fieldAudit` ground-truth contract. That contract requires independently verified radiation shielding, station height, distance from water, permissions, co-temporal inland measurements, archived pre-issued NWS/candidate forecasts and independent holdout events. A coastal single-station archive cannot satisfy those requirements by itself.

Research questions this source can answer: Is there a real measured air/wind archive with usable timestamps, units and quality? What are its coverage gaps? Does an observed, older coastal meteorological feed behave as expected under source interruption and missing QC?

Questions it **cannot** answer: What is the real beach temperature today? Is Bay City State Park 8F cooler than a quarter mile inland? Has the idealized parcel model beaten the NWS beach-area forecast?

## Verified real-source evidence (not a beach correction)

**Exact source test:** [GitHub Actions run 44937215800](https://github.com/izworskic/chrisizworski-com/actions/runs/44937215800) completed successfully on the branch at commit `8277e81a76eb00fa68c3955e9f4da878a4c78315` on 2026-11-21. The live, bounded ERDDAP request for **2022-06-01 12:00 to 16:00 UTC** returned 25 historical station rows: 23 air temperatures passed aggregate QC, and 21 of those also had passing wind speed and wind direction. Two air rows were rejected by QC; two otherwise accepted air records had unusable wind. There were no invalid timestamp/location rows, duplicate rows, or conflicting revisions in that four-hour result. A source JSON output was retained as a 14-day GitHub Actions artifact.

This is **one four-hour historical test of remote retrieval**. It is not evidence of current 2026 availability, seasonal coverage, representativeness, paired shore/inland calibration, or better predictive skill. The 23 accepted readings are all from **one station** and the withheld two readings are not silently interpolated. The source query's current QARTOD variable names end in `_aggregate_test`; older descriptive metadata abbreviated them as `_aggregate`, and the real retrieval revealed the distinction. ERDDAP's physical-unit labels also use `m/s` and degree glyph/labels; the importer accepts only documented equivalent spellings.

## Evidence and release

Run `python3 -m unittest discover -s tests -p 'test_shorefeel_*.py' -v`, the exact-head GLOS Actions job and full `npm run verify:all`. The new science path is offline; no new live-browser UI state requires review, but the current owning-repository regression gate must remain green.

**Next scientific dependency:** procure or partner for a verified dual-station observational setup at an approved Saginaw Bay shoreline and inland control. Preserve actual station provenance and calibration certificates outside the public repository. If the full peer-reviewed field validation later proves meaningful out-of-time improvement versus pre-issued NWS forecasts, revisit a public correction. Until then, retain the existing live source-based ShoreFeel answer.
