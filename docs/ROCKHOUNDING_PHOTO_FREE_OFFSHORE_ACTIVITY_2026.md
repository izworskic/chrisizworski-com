# Grand Marais rockhounding — photo-free measured offshore wave activity

**Built October 16, 2026.** No photos are needed for the core measured lake-conditions model. The result is *descriptive storm activity*, not a verified agate-exposure probability or a safe-shore verdict.

## Why photos no longer block the central engine

The core visitor question is **"Did Lake Superior experience sustained, directionally relevant waves here, and did waves subsequently decline or rebuild?"** That can be answered in a strictly observational form from [GLOS Seagull Grand Marais Spotter SPOT-1361](https://seagull-erddap.glos.org/erddap/info/obs_140/index.html) and the separate current [NWS marine alert feed](https://api.weather.gov/alerts/active?zone=LSZ250). **Neither a same-vantage photograph nor a confirmed exposed agate is required to report actual offshore weather history.**

**The inverse remains crucial:** measured offshore storm activity does NOT mean sediment changed at Agate Beach. Harbor Bayshore cannot inherit open-lake wave height without a wave-transfer model. Access/collecting rules and nearshore hazards cannot be inferred from a no-alert snapshot.

The existing [photo-free Storm Pulse](../lib/rockhounding/photo-free-storm-pulse.cjs) already summarized 8 source-qualified episodes. This phase adds a dimension previously missing: *prolonged wave activity*, not merely the highest wave.

## Actual original-source analysis

The research-data branch `research/rockhounding-glos-observed-data` contains the **5,243 real observed 2026 wave records** retrieved in the [original 112-day GLOS archive job](https://github.com/izworskic/chrisizworski-com/actions/runs/38833508075). This model re-reads the actual archived file in CI; it does not reconstruct missing observations, interpolate source outages, query an API per visitor, or interpret uploaded photos as wave readings.

For each of eight sample-qualified 2026 offshore episodes:

- Take the measured significant height **Hs in meters**, mean wave period **Tmean in seconds**, and recorded wave-from direction from the *same original buoy*.
- Compute a **relative comparison ingredient** `Hs² × Tmean` for each recorded observation. Integrate it using the trapezoid rule over successive actually observed sample intervals **no more than 90 minutes apart**. Source intervals with a longer gap do not contribute; do not assume calm water or backfill them.
- Compare that interval-integrated *offshore measured activity proxy* among the same station's episodes in 2026. Use **100% for the largest sufficiently sampled episode**; every other value is a ratio to that event, **not a likelihood or physical probability**.
- Separately show the fractional directional alignment of the same descriptive proxy with the **historically NOAA-charted Agate Beach-facing direction ~336.74°**. It is clearly not a surveyed 2026 waterline, and it is **not a beach-breaking surf wave-transfer/attenuation model**.
- Require at least 6 samples, at least 85% observed-time coverage, and no internal source gap above three hours to produce the ranking. A bad/missing source record or mismatched original peak fails the build; absent data never count as zero activity.
- Continue to describe **post-storm rebuilding** from the already validated wave-event history. Current NWS alert status remains independent and is never assigned retroactively to historical waves.

### Scientific distinction: NOT wave power

[NOAA's wave-energy primer](https://spo.nmfs.noaa.gov/sites/default/files/tm92.pdf) explains the relationship between deep-water wave power and **Hs² times energy period Te**. [NOAA NDBC wave definitions](https://www.ndbc.noaa.gov/faq/wavecalc.shtml) distinguish various wave periods. Our original GLOS field is `sea_surface_wave_mean_period`, **not the spectral energy period Te**. We therefore do **not** multiply by 0.49 or label the result energy flux in kW/m, wave stress, sediment transport or shoreline wave height. `Hs² × Tmean × observed hours` is useful only as a within-source **relative research indicator**.

Direction is directional *alignment* with a historic NOAA-chart normal, not measured wave shoaling, rock movement or guaranteed access. All activity outputs carry `canPredictNewStones:false`, `canPublishVisitWindow:false` and `canClaimSafeAccess:false`.

## Verified 2026 research result

[Original 5,243-row source-exact CI verification](https://github.com/izworskic/chrisizworski-com/actions/runs/38891330357) reports all **eight** episodes sufficiently measured for the relative comparison.

| Episode peak (UTC) | Peak significant Hs | Relative accumulated activity | Recorded-time coverage | Historic-facing directional fraction |
|---|---:|---:|---:|---:|
| **October 5** | **2.51 m** | **100.0%** (largest in 2026 study) | 97.4% | 93.2% |
| October 12 | **2.57 m** | **78.3%** | 100.0% | 76.4% |
| August 23 | 1.94 m | 41.6% | 100.0% | 98.9% |
| September 14 | 1.94 m | 39.9% | 100.0% | 81.2% |
| September 20 | 1.58 m | 13.5% | 100.0% | 78.2% |
| July 21 | 1.62 m | 12.0% | 100.0% | 91.3% |
| September 9 | 1.91 m | 11.7% | 100.0% | 80.4% |
| August 27 | 1.24 m | 4.7% | 100.0% | 91.9% |

**Key new finding:** The higher **October 12** peak did **not** represent the largest accumulated observed offshore activity. **October 5** had a slightly lower peak but greater height-squared/period/time integral under this specific comparison method. They are *not* ranked as rock collecting opportunities.

## Implementation

- `lib/rockhounding/photo-free-wave-activity.cjs`: source-validated observed-only numeric integration, no gaps bridged, bounded sensor metadata, honest directional proxy and explicit null for beach breaking surf, absolute power and stone probability.
- `scripts/rockhounding/build-photo-free-wave-activity.cjs`: deterministic source file ingestion, `--check` compares a frozen static JSON report exactly with the complete independent research-data ledger.
- `public/rockhounding-lab/photo-free-wave-activity-2026.json`: original-source-derived 2026 report with the eight measured episodes, source coverage/gap diagnostics and refusal flags.
- `.github/workflows/rockhounding-measured-wave-activity.yml`: no-key, no-photo exact verification against the separate original 5,243-row GLOS data branch, with original calculation artifact retained. No new per-visitor source requests or paid subscriptions.
- Existing primary **photo-free Storm Pulse** section in `public/rockhounding-lab/index.html` now adds a time/period/activity comparison linked to its *existing real storm selector*, and a small expandable **eight-episode relative activity chart**. Historical photo-sourcing studies remain optional and collapsed under the research shelf.
- Tests validate `H²` scaling, proportional period scaling, no-gap interpolation, opposite-direction wave origins, event matching, original 2026 study rankings, and the safe source/UX boundary.

**Next valuable, no-photo milestone:** Add a properly location-labeled Lake Superior water-level context from **NOAA Marquette C.G. station 9099018**, with source-age and surge/setdown checks. Never confuse it with **Grand Marais, Minnesota station 9099090**. The water-level observation is regional, not an Agate waterline sensor. Pair it with the current NWS hazard gate before any attempt at an actionable condition label.

No changes to ads, public indexed pages, canonical URLs or original photo assets.
