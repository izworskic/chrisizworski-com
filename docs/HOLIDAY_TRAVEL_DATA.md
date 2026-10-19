# Holiday Travel flight data

`/holiday-travel/` ranks Thanksgiving and Christmas round trips by the observed odds of a major flight disruption. This file records where the numbers come from and how to refresh them.

## Source

Bureau of Transportation Statistics, Reporting Carrier On-Time Performance (1987-present): one zip per month,
`https://www.transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_YYYY_M.zip` (about 28 MB each).
Needed: November and December of every season in `SEASONS` (2018, 2019, 2022, 2023, 2024, 2025). 2020-2021 are excluded on purpose.

## Rebuild

```
python3 -I scripts/holiday-travel/build-flight-history.py <dir with the 12 zips> --out public/holiday-travel/data
```

Needs `pandas` and `numpy`. The output (`public/holiday-travel/data/national.json`, about 30 KB) is committed, so builds on Vercel never need Python or the raw zips. The script prints the window departure count and a DTW check figure. Add a season by appending to `SEASONS` once its November and December files exist.

## Definitions

- **Major disruption**: cancelled, diverted, or departed 60 or more minutes after scheduled time.
- Window: 6 days either side of Thanksgiving Thursday and of Dec 25 (offsets -6..+6).
- Time bands (scheduled local departure): 5-8, 8-11, 11-14, 14-17, 17-20, 20-5. Airport factors use three groups: morning (bands 0-1), midday/afternoon (2-3), evening/night (4-5).

## Estimator (`public/assets/holiday-travel-engine.js`)

1. National rate per holiday, offset and band = mean over seasons of that season's rate.
2. Airport factor per holiday and time group = (observed events + 25) / (expected events + 25), where expected uses the national rates on that airport's own day and hour mix. Clamped to 0.3-3.5. Airports with fewer than 6,000 window departures are omitted (85 listed).
3. Leg risk = min(0.95, national x factor). Round-trip risk = 1 - (1 - outbound)(1 - return), with the return leg using the return airport.
4. Per-season trip risk pairs the same season's rates for both legs, which gives the typical (median) and worst season shown on the page. A season is "rough" at 20% or more.
5. Trips are ranked by mean risk. The conventional benchmark is Wed -> Sun (Thanksgiving) and Dec 23 -> Dec 28 (Christmas).

## Known limits

- No airline, connection, weather-forecast or security-line modeling.
- Christmas weekday layout is not adjusted: a weekday effect was not statistically supported and 2026's layout has not been observed.
- Day-level outcomes are event-dominated (a single storm can set a season), which is why spread is shown, not only the average.
- Driving mode is unchanged: AAA/INRIX 2025 timing guidance and EIA fuel prices; no free route-level traffic history exists.
- Tests: `tests/holiday-travel-engine.test.js` (estimator) and `tests/holiday-travel.test.js` (page behavior).
