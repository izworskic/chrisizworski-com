# Michigan Rockhounding: photo-free observed-signal reliability checkpoint

**October 16, 2026 UTC · source-verified scientific product milestone**

## Product decision: photographs are optional

The Grand Marais rockhounding engine **does not need before/after photos** to deliver a meaningful Lake Superior environmental tool. It already has:

- Actual open-water significant wave height, wave-from bearing, and mean period measured by GLOS Grand Marais Spotter **SPOT-1361**.
- A measured **48h / two adjacent 24h** offshore wave-activity comparison using a nonphysical relative `Hs² × observed mean period × time` *activity proxy*; no physical wave power or pebble transport inference.
- **Seven-day measured offshore wave history** with the latest source-verified elevated period, last peak, observed decline, renewed waves, and unfilled source gaps.
- Current independently checked **NWS marine/shore alerts**, with active or failed/unknown alerts preventing safety-related interpretation.
- **NOAA Lake Superior water-level context** at distant Marquette, separately labeled as not a Grand Marais beach gauge.
- A historic **336.74° NOAA chart-derived Agate orientation**, used only in a directional comparison, never treated as present surveyed shoreline or breaking surf.

The original source data/alerts can describe lake behavior whether or not anyone takes a beach photograph. Independent rock-exposure documentation could later be useful for a *separate calibrated stone-finding probability*, but it is not a prerequisite for the environmental tool or its user experience.

## What was actually backtested

We retrieved and pinned the **original GLOS research archive at commit `35f480d073de3dc1ff38000d62aaed23c8b579c7`**, containing **5,291 timestamped measured wave observations** from June 26 to October 15, 2026 UTC. This is the live research archive grown by 48 genuine samples beyond the original **5,243-row 2026 summer–fall frozen baseline**. The older eight sampling-qualified offshore episodes remain a source-stamped *historic reference*, not eight new rock findings.

We executed the **existing live engine**, not a bespoke threshold model, with a rolling seven-day input from ONLY source measurements available **at or before** each historical evaluation. It ran every 12 hours after an initial seven-day warm-up:

| Source-internal finding | Actual source result |
| --- | ---: |
| Original wave observations | **5,291** |
| Real-data replay checkpoints (12h cadence) | **209** |
| Fresh-enough measured wave coverage | **205 / 209 (98.1%)** |
| Both 24h comparison windows complete | **195 / 209 (93.3%)** |
| Checkpoints with lower observed offshore activity | **129** |
| Checkpoints describing offshore wave easing | **50** |
| Checkpoints with currently elevated waves | **16** |
| Checkpoints with recent unconfirmed elevated activity | **7** |
| Checkpoints identifying wave rebuilding | **3** |
| Stale-buoy checkpoints | **3** |
| Recent insufficient/gappy checkpoints | **1** |
| Actual independent Agate Beach stone-exposure outcomes | **0** |
| Photo inputs required | **0** |

**These are correlated evaluation checkpoints, not 209 statistically independent storms.** The percentages measure the *availability and integrity of the offshore signal*, **not the model's accuracy at predicting agates, sediment motion, or safe shore conditions**. In-sample 2026 replay cannot be claimed as cross-year predictive validation; no photographic or field outcome labels were used.

Historic NWS warnings are **not reconstructed** from today's alert feed. Every replay evaluation is deliberately marked `UNKNOWN` for old alert status, and the source-dependent condition interpreter keeps any visitor-safety interpretation blocked. A warning-free historic label was never fabricated.

## Failure and physical-safety checks

The new replay tests exercise:
- **Six-hour lost-buoy source reporting:** observation freshness fails; even formerly low readings do not become calm or safe beach advice.
- **Missing a 12-hour run inside the preceding 48-hour period:** short-term current data may be available, but the two-day comparison is withheld rather than bridging the gap.
- **No rows:** data unavailable, not no waves or safe conditions.
- **Time travel/future source rows:** rejected.
- **Tampered/origin-invalid observations:** rejected by existing original buoy station, physical limits and source-class validators.
- All derived source/data quality states keep **no agate, visit window, local wave-height, or legal access claims**.

## Implemented

- `lib/rockhounding/photo-free-observation-replay.cjs`: actual source-only walk-forward implementation, uses existing live offshore, wave tendency, seven-day memory and condition interpretation modules. No future rows, no assumed historic alerts, no photos.
- `scripts/rockhounding/replay-photo-free-observations.cjs`: run full 2026 archive replay offline; produce a detailed timestamped JSON artifact with 209 independent time evaluations of the same real engine.
- `scripts/rockhounding/check-photo-free-replay-summary.cjs`: pins and verifies original source archive SHA, expected source counts, exact state frequencies, coverage percentages and timestamp direction in the *entire* replay before publication.
- `public/rockhounding-lab/wave-signal-quality-2026.json`: **frozen historical data quality summary** as of the original source commit. Live provider data will continue to grow separately.
- `public/rockhounding-lab/index.html`: an accessible, responsive **measured-source quality** section near the live offshore storm board; two graphical completeness bars, sample/checkpoint counts, and plain-language scope labels. The default visitor flow remains photo-free.
- `tests/rockhounding-photo-free-observation-replay.test.js`, `tests/rockhounding-photo-free-quality-ui.test.js`: timed artificial outages, full original 2026 provenance, chronology safety, source-quality interpretation and all original source safety flags.
- `.github/workflows/rockhounding-photo-free-observation-replay.yml`: pinned authentic source data from the separate existing observed-data branch, reproducible artifact, exact static UI summary gate and full repository regressions. No paid APIs, visitor-side source reads for quality history, new scraping, source keys or image calls.
- Existing marine hazard checks, live pulse and 2026 public historical wave data, map, ads, SEO/canonical, and the optional photo research appendix were **not changed**.

## Next meaningful research gate

Improve shoreline-specific physical interpretation from **wave direction, spectral wave periods, water-level context and coast geometry** without inventing local breaker heights or gravel movement. Longer GLOS histories across multiple seasons can verify wave-event lifecycle *out of sample*, independent of photos. A future beach-rock exposure claim would require physical sediment validation; the existing tool need not wait for it.
