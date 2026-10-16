# Grand Marais rockhounding without photographs — observed wave tendency

**Research implementation: October 16, 2026.** A dated picture of the same beach is **not a prerequisite** for answering whether the lake experienced sustained storms, wave decreases, or renewed disturbance.

## What public evidence permits today

Michigan [EGLE's rockhounding guidance](https://www.michigan.gov/egle/public/learn/geology/rockhounding) explicitly recommends checking shorelines after storms because wave action can expose fresh material, while cautioning against visits **during** storms or high waves. The [NWS Great Lakes safety guide](https://www.weather.gov/safety/great-lakes) emphasizes that even when waves are diminishing, piers, structural currents and shore-specific conditions can remain hazardous. A data-based **offshore wave-history** service is therefore useful even if there are no before/after photographs. A verified fresh-agate observation or quantitative chance of collecting one would still need separate physical evidence.

Already built and preserved on main:

- Original **GLOS Grand Marais Spotter SPOT-1361** height, *wave-from direction*, period and UTC time, with a 2026 5,243-source-row historical archive and eight well-sampled offshore episodes.
- A live, cacheable original-observation route `/api/rockhounding-wave-pulse` with current source freshness and independent **NWS marine alerts**.
- Separate **Marquette, Michigan NOAA 9099018** 24-hour water-level trend, in **IGLD 1985**, explicitly remote from Grand Marais and not a local seiche or beach wetline.
- A historical relative offshore **Hs² × observed mean period × time** activity comparison; source gaps are not interpolated and historic ~337° Agate orientation is chart-derived, not surveyed present shore.

## This increment: Does the measured offshore activity trend up or down versus yesterday?

`lib/rockhounding/rolling-offshore-wave-tendency.cjs` uses ONLY GLOS wave samples that the existing live API **already fetched**. It evaluates two **adjacent 24-hour source-observed windows** ending at the latest original sample, not at an invented rounded hourly instant:

1. Use original GLOS source records with independently checked station ID, coordinates, physical units, UTC time, height and mean period. Reject future dates, contradictory duplicates, wrong station and invalid units.
2. Integrate `Hs² × T_mean` over each adjacent 24-hour window using actual trapezoidal source measurement intervals.
3. Require at least **90% observed temporal coverage** in *both* periods, at most **90-minute** gaps, and source measurements near the start/end. Missing observations never count as zeros.
4. Require the **latest original buoy reading within three hours**. If the buoy was removed or stopped reporting, status becomes `SOURCE_STALE`, not “waves calm”.
5. Compare consecutive periods' relative research index. **30%** change bins are descriptive **interface thresholds**, not validated gravel-transport or public safety limits. The result is `higher`, `lower`, `similar`, `gappy`, `stale`, or `unavailable` offshore activity. Numeric percentages are relative to the preceding *observed* 24-hour wave window, not the odds of fresh agates.
6. The direction-facing contribution is always labeled **historic NOAA chart research orientation**, never current site breaking surf. The index is *not* measured wave power in kW/m because the source reports mean period rather than spectral energy period, and beach wave transformation is unmodeled.
7. Preserve *separate* NWS warnings, and refuse safe visit windows, exposed agate scores, probabilities, sheltered Bayshore wave transmission, or legal collecting access claims.

`api/rockhounding-wave-pulse.js` adds `waveTendency48h` to its existing JSON using the **same source fetch**, not a second GLOS/NWS/NOAA request. The responsive noindex lab has a “Has offshore wave activity changed since yesterday?” panel next to the latest offshore buoy measurements, active NWS hazard status, remote NOAA lake-level context, and a 48-hour observed wave chart.

If the source is stale or incomplete, the UI reads **“48-hour comparison unavailable”** instead of implying water is calm.

## Acceptance checks

- Original artificial half-hour test fixture with past 24 hours **0.5 m** and preceding day **1.5 m** detects falling offshore activity while preserving all safety denials.
- Reversal detects increasing wave activity; equal windows stay similar.
- NOAA historic-facing factor never becomes surveyed beach-wave height; remote level and marine warnings are independent.
- More than **90 minutes of unobserved source gap** suppresses any numerical tendency.
- Stale/missing readings, contradictory timestamps, future readings, wrong buoy or unknown alert value fail closed.
- No changes to ads, indexed pages, canonical URL, sitemaps, photos, paid services or visitor-side upstream API call count.

## The product decision

Do **not** make photographs a launch gate for **measured offshore lake disturbance**. They are optional eventual research if we want the *stronger* claim “this specific storm changed this exact pebble deposit.”

The next functional milestone is to make these clean observed waves usable as a location-aware “recent lake activity” explanation *without suggesting a trip is safe*; hazard advisories and specific property/collecting permissions remain separate user checks. Publishing a future numeric "new agates" probability would require real outcome calibration, not an invented index.
