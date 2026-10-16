# Grand Marais rockhounding — PHOTO-FREE offshore wave activity engine

Research revision: October 16, 2026.

## Decision: no photographic evidence required to make the tool useful

Photographs are *not necessary* to report **measured offshore storm behavior** or to distinguish major Lake Superior wave-activity episodes from weaker ones. Repeated before/after shoreline photography would only be needed to **calibrate a claim of actual new-rock exposure or measured sediment movement**, not to build a useful source-stamped lake conditions product.

The primary photo-free data are already available at no extra paid API cost:

- [GLOS Seagull Grand Marais Spotter SPOT-1361](https://seagull-erddap.glos.org/erddap/info/obs_140/index.html), original actual significant wave height in meters, *wave-from* bearing and mean wave period with UTC timestamps. Open lake a few miles north of Grand Marais, **not** measured Agate Beach breakers and **not** Bayshore Park harbor waves.
- Original offshore storm-grouping and relative 2026 archive in the existing [GLOS observed-data branch](https://github.com/izworskic/chrisizworski-com/tree/research/rockhounding-glos-observed-data).
- Existing independent NWS LSZ250/LSZ251 nearshore-zone and Grand Marais point alert query. **ACTIVE** alerts veto benign interpretations; **UNKNOWN** isn't clear, and **CLEAR** isn't a beach safety certification.
- Independent NOAA historic Agate chart bearing 336.74° can be shown as descriptive geographic context but must not be promoted into an actually surveyed 2026 beach-face, quantified wave transmission or a wave-power conversion factor.

## The observed offshore-activity metric

For each sampling-qualified original storm episode, integrate only original adjacent buoy observations across intervals at most **1.5 hours**:

`relative_offshore_wave_activity = Σ (average(Hs_i² × Tmean_i, Hs_i+1² × Tmean_i+1) × observed_hours_between_samples)`

Here `Hs` is significant wave height (m) and `Tmean` is the provider-reported **mean** period (seconds). The outcome is **m² × s × hours**, useful only as a comparative source-relative observed wave-activity proxy.

It is **NOT** physical spectral energy flux or actual wave power: the latter requires wave energy period, water depth and group velocity assumptions that cannot be substituted from the mean wave period. It is **NOT** a calibrated model of sediment transport, breaking nearshore surf, shoreline wave runup, public beach safety or exposed agate likelihood. This method is motivated by the physically grounded dependence of wave energy on the square of wave height and wave period, documented in [NOAA research on wave energy](https://repository.library.noaa.gov/view/noaa/9709/noaa_9709_DS1.pdf). [USGS Lake Michigan nearshore research](https://pubs.usgs.gov/publication/70018025) further supports withholding precise beach-morphology predictions without local sediment and bathymetry calibration.

Do not interpolate source outages; ignore inter-reading gaps >90 minutes. An episode is only rankable with at least 80% observed interval coverage, no more than two >90-minute missing intervals, at least six authentic samples and an already-qualified original buoy event. Research ranking percentages are **percentiles among the qualifying episodes in this one retained 2026 source archive**, not historical storm recurrence probabilities, site suitability or probability of finding stones.

### Original source-verified 2026 experiment

[GitHub Actions real original-wave calculation #38936042512](https://github.com/izworskic/chrisizworski-com/actions/runs/38936042512) successfully read **5,291** actual source-stamped 2026 GLOS wave observations and evaluated **11** grouped offshore episodes, **8** with sufficient coverage for the relative calculation. NWS snapshot at the source computation was **ACTIVE**, the GLOS feed status **STALE**.

| Original offshore buoy peak | Peak significant wave | Relative activity proxy | Rank within 8 qualified episodes |
| --- | ---: | ---: | ---: |
| October 5, 2026 | **2.51 m** | **953.898** | 94th percentile |
| October 12, 2026 | **2.57 m** | **746.469** | 81st percentile |
| August 23, 2026 | 1.94 m | 396.863 | 69th percentile |
| September 14, 2026 | 1.94 m | 381.014 | 56th percentile |
| September 20, 2026 | 1.58 m | 128.529 | 44th percentile |
| July 21, 2026 | 1.62 m | 114.313 | 31st percentile |
| September 9, 2026 | 1.91 m | 112.043 | 19th percentile |
| August 27, 2026 | 1.24 m | 44.654 | 6th percentile |

**Key value:** October 5's source-observed period of higher sustained activity outranks October 12 in this proxy even though October 12 had a higher instantaneous maximum. That is exactly the distinction a wave-height-only beach tool cannot show. **This does not imply October 5 exposed more stones or was safe for rockhounding.**

The 11-event source group count comes from original GLOS records, not 11 proven independent weather systems. These episodes can group multiple physically separate storms if high-wave source periods are less than 48 hours apart.

## Implemented

- `lib/rockhounding/photo-free-wave-pulse.cjs`: pure original-data computations; checks source and UTC time identity, coverage and time gaps, measured height/mean period, original true wave-from and vintage chart direction as descriptive research context only. Explicit null/false for every beach morphologic, rock and safety forecast.
- `scripts/rockhounding/build-photo-free-wave-pulse.cjs`: recomputes the 2026 source sample from the original GLOS archived ledger and NWS report. Verifies consistent original report timestamps and source record count before writing a fresh external research artifact. No field photos necessary.
- `scripts/rockhounding/rolling-glos-spotter-events.cjs`: reuses the *existing six-hour scheduled research collection* to emit the photo-free wave-activity report **with no new external API requests**. The next regular archival research data update includes the new physical proxy and current hazard status.
- `public/rockhounding-lab/photo-free-offshore-wave-activity-2026.json` and the noindex existing prototype: real dated eight-event comparison bar chart, methodology, transparent source counts, no visitor external data fetches and no agate probability.
- Test suites: original observed 2026 frozen chronology, photo-free current report, power-versus-proxy confusion, source gaps, synthetic storm shape, hazard ACTIVE/CLEAR/UNKNOWN, harbor non-transfer and missing input fail-closed logic.
- `.github/workflows/rockhounding-photo-free-wave-pulse.yml`: reads the existing archived original data branch in CI only, recomputes the genuine report and uploads a small source-stamped artifact.

No ad placement, sitemap, canonical, existing rockhounding access rules or other public indexed tools modified.

## Scientific product boundary

**Can we build something useful without photos? YES.**

The result can tell readers which recent offshore periods had stronger, longer and more directional waves and whether the source data are fresh, with independent alert status. That is a useful **measured lake-storm context tool**.

**Can it honestly say a storm exposed agates? NO, not yet.** We do not have verified shore sediment mobilization thresholds, local breaking-wave conditions, beach sediment/hydrodynamic calibration or independent stone counts. Without that local evidence, a probability such as "83% likely to find new agates today" would be invented.

**Next useful photo-free additions:** verified local/regional lake-level trend (separate from shoal wave force), wind measurements only from a true anemometer, NWS hazard gating for *current* reports, and geographically verified public access. The current page already uses separate GRMM4 wind, regional gauge level, and several-day wave trend controls; the new engine adds an independently repeatable **whole-storm, height–period–duration** comparison rather than duplicating those existing components.

A future, well-calibrated sediment transport study or verified post-storm aggregate counts could support deeper inferences; photos are just *one* possible source and are not a dependency for this release.
