# Michigan rockhounding — photographs are optional for the condition-driven engine

**October 16, 2026.**

## Product decision

Do not hold up the Grand Marais rockhounding **living conditions** tool waiting for verified before/after beach photographs. The product can already provide useful, authentic observations of:

1. Grand Marais GLOS Spotter **offshore** significant wave height, observed direction and mean period, peak history and measured wave rebuild/decline. Existing live photo-free endpoint displays authentic measurements, original timestamps and descriptive rather than safety thresholds.
2. **Regional Lake Superior lake-level movement** — two independently measured NOAA CO-OPS gauges, IGLD 1985 water-level datum, 6-minute preliminary/verified samples. Important because prolonged seiches, wind setup and sudden changes can occur even after offshore wind/waves appear to settle. NOAA GLERL described a major June 21, 2025 Lake Superior meteotsunami/seiche event with dramatic rises/falls at Point Iroquois: https://www.glerl.noaa.gov/blog/2025/07/18/june-21-2025-storm-causes-significant-meteotsunami-and-seiche-on-lake-superior/
3. NWS original current relevant shoreline/marine alerts; active/unknown coverage overrides reassurance regardless of buoy data. No alert does **not** certify safe access.

**Do not** infer an agate-finding probability, actual moving pebble layer, safety at Agate Beach, or harbor surf at Bayshore Park from these sources. Historic 2014 coastline orientation is not a currently surveyed lakeward wetline. Existing photographed shoreline evidence is retained as optional longer-term validation, collapsed in the research archive.

## Newly verified primary inputs

The NOAA CO-OPS [data API](https://api.tidesandcurrents.noaa.gov/api/prod/) supports original 6-minute `water_level` measurements, `datum=IGLD`, `time_zone=gmt`, `units=metric` for Great Lakes stations. First flag counts out-of-3-sigma one-second readings; remaining flags detect flatline, rate-of-change, and height-limit problems; `q=p` is preliminary and `q=v` verified. Source [quality guidance](https://api.tidesandcurrents.noaa.gov/api/prod/responseHelp.html).

Independent source stations:

| NOAA station | What it actually measures | Limit |
|---|---|---|
| [9099018 Marquette C.G.](https://tidesandcurrents.noaa.gov/stationhome.html?id=9099018) | Lake Superior regional gauge west of the pilot | **NOT** Grand Marais shoreline waterline |
| [9099004 Point Iroquois](https://tidesandcurrents.noaa.gov/stationhome.html?id=9099004) | Lake Superior regional gauge east of the pilot | **NOT** Grand Marais shoreline waterline |

This two-station approach can detect regional lake-water-level variability but **cannot interpolate local wave runup or precise Agate Beach stage between these distant gauges**. Neither observation is a tide prediction.

### First independently verified October 16, 2026 source capture

[Original NOAA + GLOS + NWS research run](https://github.com/izworskic/chrisizworski-com/actions/runs/38910972246), evaluated **2026-10-16 at 13:50:43 UTC**:

| Original source | Observation time UTC | 6-hour original gauge range | Original 6-hour net change |
|---|---|---:|---:|
| Marquette C.G. (9099018) | Oct 16 13:42 | **0.113 m (11.3 cm)** | **+0.050 m** |
| Point Iroquois (9099004) | Oct 16 13:42 | **0.083 m (8.3 cm)** | **−0.034 m** |

Each query returned **719 original NOAA 6-minute samples** across the broader 72-hour retrieval. Marquette accepted 719; Point Iroquois rejected one original QC-flagged record. Sensor signals are recorded as **preliminary**. Original source URLs and SHA-256 checksums preserved in the [dedicated research data branch](https://github.com/izworskic/chrisizworski-com/tree/research/rockhounding-glos-observed-data).

The original Grand Marais Spotter GLOS reading at research time was **more than 14 hours old**: last Oct 15 23:46 UTC, 0.37 m, observed wave-from 69.01°, so the engine says **STALE_BUOY_SOURCE** rather than current calm water. NWS returned **ACTIVE** warnings/advisories. State = `NWS_ALERTS_ACTIVE`, no-safe-visit/no-exposed-rock conclusion. All displayed dates are historic snapshots, not live claims.

## Implementation

- `data/rockhounding/lake-superior-regional-water-level-sources.json`: fixed two independent NOAA gauges, physical location scope, correct 1985 IGLD datum and explicit no-inferred-beach-stone flags.
- `lib/rockhounding/noaa-regional-water-level.cjs`: bounded 96-hour original API source URLs, strict source metadata/units/UTC, preliminary vs verified quality, 6-minute quality flag exclusion, deduplication and source freshness/gap checks; 6-hour min/max/range/net delta **individually** for each station; never average/interpolate gauges into local beach stage.
- `lib/rockhounding/photo-free-poststorm.cjs`: original GLOS wave height/direction/mean period, 36-hour peak and strict last-six-hour sustained lower-wave check (without promoting a lone trough into "settled"), original chart-facing context, independent two-source region-level status and NWS active/unknown gate; always research classifications, **never rock find or safe to go**.
- `scripts/rockhounding/capture-photo-free-poststorm.cjs`: NOAA source and NWS reads from GitHub Actions; one source hash per gauge, station ID and original timestamp provenance, bounded queries and explicit unavailable states if a gauge is down.
- Existing `rockhounding-glos-event-ledger.yml` six-hour research schedule collects this 2-gauge photo-free report into the **separate observed-data branch**, rather than asking site visitors or charging image/scraping credits.
- First frozen original-source research snapshot `public/rockhounding-lab/no-photo-regional-lake-stage-oct2026.json` renders as a **dated, non-live** two-gauge explainer under the existing current Marquette gauge context. It uses original 11.3 cm and 8.3 cm measurements; all real-time values continue to come from the existing `api/rockhounding-wave-pulse.js` route. Source labels explicitly distinguish *live* Marquette context from *historical* two-gauge verification.
- `tests/rockhounding-photo-free-conditions.test.js` and `tests/rockhounding-photo-free-two-gauge-ui.test.js`: QC, source location/IGLD unit, timestamp, independent 2-gauge context, stale/partial-provider handling, no-fabricated calm states, persistent warnings veto and no-photo UX regressions.

## Next model upgrade once two-gauge cycles accumulate

Use recorded **regional seiche variability and observed wave episode phase** to explain the physical evidence, not turn a remote level change into a local beach slope or new stone count. The useful consumer product can state "recent waves elevated", "waves have rebuilt", "measured offshore activity easing", "lake levels fluctuating regionally" and "source stale / marine warning active." Do not attach a percent chance of finding agates without actual independent sediment outcome validation.

**Costs and protections:** two free NOAA observations reads per six-hour research cadence, zero photos needed, no paid imaging or scraping, no new per-visitor external source calls, no changes to indexed URLs, ads, canonicals or collecting permissions.
