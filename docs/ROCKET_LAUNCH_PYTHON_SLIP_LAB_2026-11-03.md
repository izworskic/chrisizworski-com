# Rocket Launch Live — Python-tested Delay Intelligence v1
November 3, 2026 · Experience OS mission-specific enhancement

## Visitor decision
A visitor may plan for the published launch target, but a 1–6 hour hold can change
the forecast at a spectator's *regional weather reference points*. The previous
national viewer used NWS hourly and gridded sky cover at one instant. The new
**What if the rocket slips?** panel evaluates +0, +1, +3 and +6 hours from the
same forecast request, letting a visitor examine a hypothetical change before
making a time-sensitive travel decision. It never predicts a hold, launch
probability, official range approval, or a pad-to-viewer sightline.

## Python versus visitor runtime
- `scripts/rocket_launch_slip_lab.py` is an independent, standard-library
  Python science oracle. It checks UTC/DST, strict interval end times,
  fresh-source gates, false precision, cloud comparison thresholds, hazards
  and seven-day forecast cutoffs. It emits deterministic NWS-shaped fixtures
  as JSON for cross-language parity tests.
- `lib/rocket-launch-slip.js` is the production implementation because the
  existing Vercel API is Node and already owns the NWS fetches and source
  validation. Running a second live Python function would duplicate work,
  complicate provenance and add latency for no visitor benefit.
- The Python oracle and JavaScript consumer are both required by
  `.github/workflows/rocket-launch-truth-tests.yml`.
- No new upstream requests, cron, Postgres tables, Redis, Supabase, keys or
  third-party data sources. Forecast grids remain server-side and are
  never exposed as raw NWS response bodies.

## Evidence rules
- Require a precise (minute/second) target in the NWS seven-day hourly window.
- Evaluate no more than four scenarios from exactly two existing regional
  spectator-weather **reference points**.
- A grid must have a valid update timestamp no older than 18 hours, percent
  units, a valid forecast interval covering the hypothetical time, and a
  numeric cloud value within 0–100.
- Compare areas only if both reference grids and surface forecasts exist
  and neither has `poor` or `unknown` assessed conditions. A total
  cloud-cover gap smaller than 20 percentage points is called similar.
  A larger gap is explicitly **relative cloud cover**, never a verified
  trajectory visibility advantage.
- A stale launch schedule suppresses all comparison winners. A failed or
  partial source is displayed as unavailable, never a sunny 0% default.
- Regions without currently configured regional NWS reference points
  (Florida specialist, Alaska and Hawaiʻi) receive the explicit unavailable
  state; the panel does not invent viewing positions or maps.
- The visitor can switch +0/+1/+3/+6 without additional network traffic.

## Acceptance benchmarks
| Dimension | Target |
|---|---|
| Incremental NWS API requests | 0 |
| Extra databases or scheduled jobs | 0 |
| Python oracle cases | 6 multi-hour scenarios; 8 science tests |
| JS/Python forecast checks | 24 scenario outcomes including source vetoes |
| Stale-target viewing comparison | 0 winners |
| Null/invalid clouds displayed as 0% | 0 |
| Raw hourly/grid forecast JSON in public API | 0 |
| Current canonical, indexability and tools links | unchanged |
| Mobile interaction | four controls in two columns at small widths; keyboard accessible |
| Flight-weather / trajectory probabilities | never inferred |

## Testing & release
```bash
python3 scripts/rocket_launch_slip_lab.py --test
node --test tests/rocket-launch-slip.test.js tests/rocket-launch-usa.test.js
node --test tests/space-coast-official-weather.test.js tests/spaceflight-now-editorial.test.js
```

Then full repository gate, Vercel preview and public smoke:
open the national tool on Texas or California and select a minute-level
mission within seven days. Verify all four local-clock cases, one missing
future hour, a stale grid, mobile tabs, and unchanged official-access guidance.
Production READY does not independently prove that a particular NWS grid is
fresh, so the live data check must inspect actual API evidence.
Official source documentation:
https://www.weather.gov/documentation/services-web-API
