# Rockhounding: photo-free seven-day last-storm memory

**October 16, 2026.** User-facing question: *When was the last meaningful observed offshore wave spell, and what happened afterward?* No photos or beach visit are required to answer this limited lake-data question.

## Why this is worth building

Michigan EGLE's [original rockhounding guidance](https://www.michigan.gov/egle/public/learn/geology/rockhounding) says waves and storms can expose material, but explicitly discourages visiting during storms or high-wave action. It does not provide a numerical offshore buoy threshold or predict agate finds at a specific beach. The prior rockhounding prototype already used the free GLOS Grand Marais Spotter for a live 48-hour trend and a summer–fall 2026 relative baseline. It **forgot storm context after 48 hours**, even though a measured offshore wave spell three or four days earlier is a useful historical fact to show.

## What this increments

- `lib/rockhounding/seven-day-offshore-storm-memory.cjs` reads original, validated GLOS `SPOT-1361` significant wave-height observations and determines the most recent **measured elevated offshore spell** in seven days. This is **not** a scientifically validated beach gravel-movement model or a meteorological storm taxonomy.
- Uses the source's existing **1.0 m descriptive elevated-wave threshold**. Six or more elevated observations spanning at least three hours with no >90-minute missing-data gap support a sampled "elevated wave spell". A single high sample never becomes a fully verified storm event. Multiple elevated spells separated by >3 hours may be distinct wave runs within one actual storm; do not misstate count as individual meteorological storms.
- Records **actual observed peak**, peak time, last observed elevated reading, elapsed hours since each, event sample count and source coverage.
- A **descriptive offshore wave easing** classification requires **at least 18 hours** of original buoy observations after the last elevated record, with at least twelve subsequent readings, no >90-minute gap and all subsequent waves below the descriptive 1.0 m bin. No observations are interpolated across gaps. A missing buoy reading does **not** establish calm conditions or event completion.
- Current buoy age >3h, fewer than 12 source records in the most recent measured 12h, or unreviewed station input fails closed without a current last-storm interpretation. Independent current NWS marine hazards remain a separate input, **never** a safe-visit clearance.
- The existing `api/rockhounding-wave-pulse.js` requests **168 hours rather than 72 hours in the *same single GLOS query***. The existing original 48h tendency, NWS alert queries and remote NOAA Marquette gauge continue unchanged, still **five upstream calls**, with CDN caching.
- The noindex `public/rockhounding-lab/index.html` adds the **When was the last sustained offshore wave activity?** card above its 48h trend and a responsive original-source SVG chart. The line **breaks across >90-minute source gaps**; if integrity/freshness fails, no live seven-day wave chart or declared storm end is supplied.
- The only allowed interpretations: *offshore elevated waves recently*, *last elevated offshore spell measured*, *offshore readings continuously below this threshold for 18 hours*, *historical elevation with incomplete follow-up*, or *source unavailable*. These are source-based wave histories, **not** local breaking-wave heights, newly exposed stones, safe shores, any legal collecting permission, or a probability of agate finds.

## What a user actually learns

A user may now get a source-stamped statement such as "The buoy's last elevated offshore wave readings ended 90 hours ago; measured peak was 1.9 m, and the following 18 hours of sampled open-lake observations remained below the research threshold." This is an **example**; the live interface only displays this when it can verify the source timestamps and coverage. It **does not** mean conditions are safe, rocks have moved, or the beach is newly accessible.

## Verification

- Tests backtest a synthetic elevated wave spell four days ago, continuous 18-hour lower readings, recent renewed elevated offshore waves, no elevated measurements, gappy/stale/wrong station sources, changed timestamps, and a real October 2026 short-window buoy sample.
- The test for the actual October 12–14 **142-row short-window sample** uses the peak **1.57 m within that shorter source window**; the full longer June–October 2026 archive independently records **2.57 m** on October 12. These are not inconsistent readings, just different query windows.
- Integration checks that the API still performs **exactly one GLOS call, three NWS checks and one NOAA level check**, and that the existing source-verified 48h tendency and alert veto still work.

**Safety and publishing:** No beach-level wave transmission, no photographs required, no fresh-agate claims, no numeric transport threshold, no exposed-stone probability, no collecting recommendation, no ad changes, no indexed page edits, and no new API keys or visitor-side requests. Research tool remains **noindex** until site/access and physical outcome claims are independently validated.

**Next research priority:** track repeatable measured storm recovery patterns over multiple years and verify public shoreline collecting permissions by property (without emails or onsite visits); do not assume a seven-day offshore decline implies a new agate window.
