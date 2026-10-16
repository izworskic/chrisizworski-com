# Rockhounding — one photo-free condition-driven offshore wave reading

**October 16, 2026 | Grand Marais, Michigan | research-only**

## Decision: photographs are optional, not a prerequisite

This tool already has independently observed 2026 waves from the GLOS Grand Marais Spotter (**SPOT-1361**), 48-hour rolling original readings, a relative activity comparison, a measured summer–fall source baseline, independently checked NWS marine/shore alerts, and a NOAA CO-OPS Marquette (**9099018**) water-level context.

The next step is **not more shoreline photography**. This milestone exposes a single, understandable *offshore disturbance reading* using only these existing feeds.

## Observed evidence and release boundaries

| Source | Can legitimately report | Cannot legitimately report |
| --- | --- | --- |
| GLOS SPOT-1361 original significant wave height, direction, mean period | Measured offshore wave conditions, rebuilding, duration and drops | Agate Beach breaking surf, gravel transport or confirmed freshly exposed stones |
| Two independently measured, ≥90%-covered 24h wave-activity windows | Whether observed offshore wave activity rose or fell relative to yesterday | Physical wave power; probability of finding agates |
| GLOS 5,243-row June–October 2026 archive | How the current measured offshore wave activity compares with sampled 2026 source windows | Long-term climatology, independent storm-sample counts, any stone-success percentile |
| NOAA CO-OPS Marquette C.G. 9099018 (IGLD 1985) | A **remote** Lake Superior still-water context and 24h gauge level change | Instantaneous Grand Marais seiche, Agate Beach waterline or safe exposure |
| NWS active marine/shoreline alerts | Relevant current warning/advisory presence, and the inability to verify feeds | A safety clearance when no alert appears |

Primary research: [GLOS SPOT-1361 Seagull](https://seagull-erddap.glos.org/erddap/info/obs_140/index.html); [NOAA station Marquette](https://tidesandcurrents.noaa.gov/stationhome.html?id=9099018); [NOAA's explanation of Great Lakes seiches](https://oceanservice.noaa.gov/facts/gltides.html/seiche.html); [USGS wave and nearshore lakebed response research](https://pubs.usgs.gov/publication/70018025).

### State precedence

1. **Unverified original-source freshness, wrong buoy identity, missing observed time, incomplete 12h sample coverage:** no current offshore phase or movement result. A separate current NWS warning is still shown prominently.
2. **NWS active alert:** warning/advisory headline overrides any attractive-looking offshore easing. Never return a beach safety or trip window.
3. **NWS unknown:** show valid offshore wave observations, but prominently state marine alert status cannot be verified. Never interpret as safe.
4. **Actual observed waves rebuilding:** prioritizes later renewed wave height over apparent daily decline.
5. **Elevated observed offshore waves:** descriptive 1.0 m grouping; NOT a hazard or sedimental mobilization threshold.
6. **Easing after an actual elevated peak:** require original buoy fresh and sufficiently sampled, repeated lower heights, plus a separately covered ≥90% two-window rolling 48h activity comparison showing lower last 24h activity. This says only **offshore waves eased**, not “go searching,” not “storm exposed agates.”
7. **Some offshore decline without verified 48h comparison:** don't upgrade to a settled post-storm reading.
8. **Lower activity:** describes offshore context only, never proof of safety or fresh stones.

The separate Marquette level is deliberately **display-only context**, not a hidden multiplicative rock-exposure or safety input. The historic 2014 NOAA shoreline bearing is not a surveyed present-day wetline.

## Implementation

- `lib/rockhounding/photo-free-condition-reading.cjs`: deterministic interpretation of already retrieved, source-validated GLOS/NWS/NOAA data, explicit phase/alert precedence, fail-closed freshness and source-gap handling, independent remote-gauge provenance, and permanent zero stone-probability/safe-visit fields.
- `api/rockhounding-wave-pulse.js`: includes `photoFreeConditionReading` in the **same preexisting response** without any additional upstream provider request. Edge caching still serves the same 15-minute request schedule.
- `public/rockhounding-lab/index.html`: a single near-top, phone-responsive text status directly after the live panel heading and before the detailed wave-height, activity, period and remote lake-level charts. If source data have gone stale since API cache time, client downgrades the headline rather than continuing to show an upbeat historic status.
- `tests/rockhounding-photo-free-condition-reading.test.js`: NWS warning precedence, warning feed unknown, strong offshore-wave recovery, renewed waves, stale buoy, gappy daily comparison, remote Marquette level not acting as local site wave/waterline evidence, spoofed unsafe claims, and **no extra network calls**.
- `.github/workflows/rockhounding-photo-free-condition-reading.yml`: focused checks plus complete rockhounding science suite.

**What remains unverified:** actual rock exposure, local beach safe access, site-specific breaking surf, hydraulic sediment thresholds or a calibrated agate-find probability. These require independent physical or outcome evidence. That lack of photographs must not prevent a well-grounded, labeled **offshore conditions tool**.

This work leaves ads, public indexed pages, canonical URLs, sitemap and the existing photo archives unchanged. No paid API key or license is required.
