# Holiday Travel flight data ("Will I make it?")

`/holiday-travel/` stress-tests a concrete holiday flight plan: route (nonstop or one connection), scheduled departure, and the time the traveler must arrive. It reports the chance of missing that deadline, where the risk comes from, what a cancellation means on that route, the cheapest changes that lower the odds, first-flight-of-the-day evidence, and (in the final 7 days) a live National Weather Service check. Driving mode is separate and unchanged (AAA/INRIX 2025 timing guidance + EIA fuel).

## Sources

- BTS Reporting Carrier On-Time Performance (1987-present), one zip per month:
  `https://www.transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_YYYY_M.zip` (~28 MB each).
  November and December of 2018, 2019, 2022, 2023, 2024, 2025. 2020-2021 excluded on purpose.
- OurAirports `airports.csv` (public domain) for coordinates: `https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv`. PBI has a manual override.
- Live layer (browser, at view time): `api.weather.gov` points -> forecast, and `alerts/active?point=`.

## Rebuild

```
python3 -I scripts/holiday-travel/build-flight-history.py <dir with the 12 zips> <airports.csv> --out public/holiday-travel/data
```

Needs pandas and numpy; ~2 minutes. Output is committed: `national.json` (~120 KB) and `routes/<ORIGIN>.json` (240 shards, ~1.9 MB total, the page loads only the origin and candidate hubs). Vercel never runs Python.

## Model

Times are minutes from 00:00 local on the holiday (Thanksgiving Thursday or Dec 25).

1. **National surfaces**, per season, holiday, day offset (-6..+6) and scheduled departure band (5-8, 8-11, 11-14, 14-17, 17-20, 20-5):
   `cd` = cancelled or diverted; `sop[x]` = operated and arrived more than x minutes late (x in 0..1440). The page averages seasons (each counts equally) and also evaluates each season alone for the typical (median) and worst season.
2. **Factors** on "trouble" (cancelled, diverted, or arrived 60+ min late): origin airport per holiday and time group, `(obs+25)/(exp+25)`; then a pooled route residual `(obs+15)/(exp_airport+15)`; clamped 0.3-3.5. Leg rates = national x airport x route.
   Leave-one-season-out check (Spearman rank correlation of predicted vs actual route trouble, routes with 100+ held-out flights): route model 0.53 / 0.45 / 0.13 / 0.34 / 0.33 / 0.44 for 2018 / 2019 / 2022 / 2023 / 2024 / 2025, versus airport-only 0.36 / 0.33 / 0.05 / 0.23 / 0.20 / 0.34. Storm years (2022) are weakly predictable, which is why the worst season is always shown.
3. **Scheduled arrival** = departure + the route's median (local arrival clock - local departure clock).
4. **Stranding** (per route and time group): for each flight, if it had been cancelled, how late you would arrive on the *second* later operated flight of the same airline on the same route (holiday flights are full; the first is shown as the optimistic case). Stored as a survival curve over hours, plus the share where that flight left on a later calendar day.
5. **Miss probability**, slack S = deadline - scheduled arrival:
   - Nonstop: `cd x P(rebooking > S) + P(operated and arrival delay > S)`.
   - One stop with layover L (minimum connection 35 min): misconnect `m = P(leg-1 arrives > L-35 late)`; `P = cd1 x max(rec1, rec2)(S) + m x rec2(S) + (1-cd1-m) x [cd2 x rec2(S) + late2(S)]`.
6. **Fixes** tested: other departure times the same day, one or two days earlier (7 AM and the same time), nonstop vs other hubs. Shown only when they cut the odds by at least 15% and 1 point.
7. **First flight of the day**: tail-number sequences per day give whether a departure was the aircraft's first trip. National trouble rates by band for first vs later trips, and each airport's share of first trips by band.
8. **Live layer**: active only 0-7 days before the departure date. Lists NWS hazards (winter storm, blizzard, ice, lake effect, high wind, fog, tropical, etc.) overlapping the travel day and the forecast periods for that date at origin, hub and destination. It does not change the odds; with a significant hazard it points the traveler to the worst-season figure and airline travel waivers.

## Known limits

- Airline-specific risk, rebooking onto other airlines, fares and seat availability are not modeled.
- Two-stop trips and routes with fewer than 300 window flights are not scored.
- Christmas weekday layout is not adjusted.
- Tests: `tests/holiday-travel-engine.test.js` (model) and `tests/holiday-travel.test.js` (page, including mocked NWS responses).
