# Rockhounding — actual observed Grand Marais Spotter waves (GLOS 2026)

**Verified October 15–16, 2026 UTC. Research source only; no current beach/safety/stone exposure verdict.**

## Why this changes the post-storm roadmap

The previously available real offshore buoy data were from NDBC 45004 **~111 km from the Grand Marais study point**. The legacy NDBC **45172** Grand Marais station has no current data in its published NDBC standard-meteorological record. A better actual observation source exists: **Superior Watershed Partnership's Grand Marais SPOT-1361**, ingested to the [GLOS Seagull **obs_140** tabledap dataset](https://seagull-erddap.glos.org/erddap/info/obs_140/index.html). The physical buoy is approximately four miles north of Grand Marais harbor, open Lake Superior. [GLOS's 2026 SPOT-1361 archive](https://seagull-erddap.glos.org/erddap/files/SPOT-1361_archive/) provides historical continuity.

Its original fields, with units:
- `sea_surface_wave_significant_height` — observed significant wave height **meters**.
- `sea_surface_wave_from_direction` — observed **wave-from direction, degrees**; *not estimated buoy wind-from direction*.
- `sea_surface_wave_mean_period` — observed mean wave period **seconds**.
- `time`, `longitude`, `latitude` — source observations with UTC time and provider-recorded position.

GLOS notes that **wind fields estimated by Sofar Spotter from wave measurements are not direct measured wind**. The adapter intentionally does not use them for storm direction.

## Live original-source run (not mock observations)

[GitHub Actions verification run #38826852138](https://github.com/izworskic/chrisizworski-com/actions/runs/38826852138) fetched actual GLOS wave rows from the tabledap source:

| Directly reported source finding | Value |
|---|---|
| Distinct GLOS Spotter observations returned | **144** |
| Earliest included UTC reading | **2026-10-12 00:16:01** |
| Latest included UTC reading | **2026-10-14 23:46:01** |
| Largest sampled significant wave height (recent 72h window) | **1.57 m** |
| Last reported significant wave height | **0.95 m** |
| Latest observed wave-from direction | **329.11°** |
| Source-freshness decision | **STALE_OBSERVATIONS** |
| A Grand Marais harbor sensor? | **NO** |
| A measured Agate Beach breaking-wave or agate-exposure outcome? | **NO** |

The numeric change **1.57 m → 0.95 m** is an observed offshore change, not a predicted beach stone discovery. The last measurement is from the previous UTC calendar day; the engine appropriately declines to call the station current. Absence of a recent measurement is **not** evidence that waves are calm.

## Implementation

- `data/rockhounding/grand-marais-glos-spotter-source.json`: frozen independent site identity, station coordinates from actual 2026 rows, precise original GLOS variable names, physical observation units and strict source-role/claim limitations.
- `lib/rockhounding/glos-spotter.cjs`: bounded original-provider CSV query; source row/column/unit verification; station position checking; wave-from/wind-from non-confusion; exact UTC timestamps; missing values, duplicate conflicts, sample gaps, freshness, 72-hour actual wave peaks and declines. **Never publishes a visitor window**.
- `scripts/rockhounding/capture-glos-grand-marais-spotter.cjs`: one source retrieval by GitHub Actions, no per-visitor requests, no API key or credits. Retains compact source-stamped research artifact and the actual latest observations for independent validation.
- `.github/workflows/rockhounding-glos-spotter.yml`: manual/research-branch science and direct source check with 30-day source artifact. Not scheduled on main or exposed as live page data.
- `tests/rockhounding-glos-spotter.test.js`: real provider-column example, stale/sparse handling, synthetic drop controls, tampering, duplicate/invalid data and no-public-claims regression tests.
- `data/rockhounding/grand-marais-glos-spotter-observed-run-2026-10-15.json`: source-attested October 2026 run summary.
- No changes to public adsorption, URLs, sitemap, keys, deployment endpoints or access collection rules. The separate noindex prototype can explain the dated source without calling it real-time.

## Next highest-value milestone

1. Retain a rolling actual **GLOS Spotter** observed-wave ledger, with issued source timestamp, stale detection and seasonal offline fallback. Later compare its near-Grand-Marais observations to the **same-place verified GLWU model cell**; don't confuse NDBC 45004 model skill with this new station.
2. Research-only directional comparison of observed **wave-from** to the chart-derived historic **~337° NNW** Agate shore normal; *not* a current surveyed wetline or breaking-wave hazard forecast.
3. Await **multiple distinct offshore storm and post-storm events** and dated independent beach change observations before calibrating public "new stones likely" triggers. Keep verified NWS hazard veto and rock-collecting access permission gates separate.

Primary data [GLOS](https://seagull-erddap.glos.org/erddap/info/obs_140/index.html) and [original 2026 archived source](https://seagull-erddap.glos.org/erddap/files/SPOT-1361_archive/) remain available at no paid API cost.
