# ShoreFeel beach-water forecast

What it is: an estimate of water temperature at named beaches for the next 48 hours, shown as a range with a stated error. It is not a measurement and not swim safety.

## Method
1. **Level**: the best measured water number (buoy within 10 km and under 6 h old, else nearest valid NOAA satellite pixel). NOAA's lake model is never the level: it ran about 3.8°F off buoys; the satellite about 0.9°F.
2. **Change**: NOAA LMHOFS (regular 1 km grid) forecast change at the offshore reference cell, from the model state when the level was observed to now+lead.
3. **Shallow offset**: model difference between the beach cell and the reference cell, capped at ±2°F. Unvalidated against shore thermometers, so it widens the range by 1°F when it exceeds 0.5°F.
4. **Range**: ±2°F through 24 h, ±3°F at 36–48 h (1.5 × backtest mean error).
5. **Cooling watch**: model 24 h change ≤ −1.5°F. Sharp tier ≤ −3°F. No warming alert (skill was weak).

If there is no level or no model cycle the section is hidden. Nothing is estimated.

## Validation (data/shorefeel/backtest-2026-10.json)
Sept 1 – Oct 13 2026, four NDBC buoys, about 115 24 h samples.
- 24 h error: persistence 1.45°F, with model change 1.31°F. 48 h: 2.19°F vs 1.87°F.
- Cooling watch: flagged 22 of 115, caught 7 of 7 real drops ≥3°F, 32% precision. Sharp tier: 50% precision, caught 5 of 7.
- Limits: six weeks, open-water buoys, no summer, no shore thermometer comparison.

## Adding a beach
Add an entry to `BEACHES` in `lib/shorefeel/beach-forecast.js` (regular-grid cell, offshore reference cell, satellite cell key). Check the cells against `Latitude/Longitude` and a water mask before shipping.

## Next
Log each forecast against the buoy reading it targets, publish the misses, add shore loggers in spring, add a one-tap swimmer report.
