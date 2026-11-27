# St. Clair River and Detroit River passage research

Status: the **St. Clair River towns are published** on `/st-clair-river-ships/`. **Belle Isle and the Detroit RiverWalk pass the bar but are not published yet**; see "Detroit River" below.

## Corridor

`data/passage-corridors/st-clair-detroit.json` is an approximate ship-channel centreline running downbound from the Lake Huron Cut through the St. Clair River, Lake St. Clair and the Detroit River to Lake Erie. It is about 145 km long.

**Geometry check:** against 62,784 moving commercial fixes from 2025, the median distance from the line is 0.30 km, p90 1.11 km and p95 1.70 km. Positions more than 3 km off the line are ignored.

## Data

- NOAA Marine Cadastre 2025 daily AIS (public domain, US-received).
- The same 36 days as the Seaway study: four consecutive days a month, April to December.
- Extracted with `scripts/seaway-noaa-corridor.mjs --bbox 41.98,-83.3,43.12,-82.35`.
- Input file SHA-256 values are in `data/st-clair-river-ships/noaa-2025-inputs.sha256`.
- Result: 1,096,803 corridor points, 622 ships, 762 passages (369 downbound, 393 upbound).
- Viewpoint crossings, with fixes 45 minutes or less apart: port-huron 449, marysville 486, st-clair 475, marine-city 471, algonac 447, belle-isle 512, detroit-riverwalk 545.

## Held-out results

Split-conformal calibration as in `docs/SEAWAY_PASSAGE_RESEARCH.md`. The split is day-of-year mod 3: train 275, calibrate 258, test 229 passages. Each passage gives one forecast per viewpoint and lead bucket.

**Release bar:** at least 50 test passages, a hit rate of at least 75% against an 80% target, and a window of 3 hours or less.

| Viewpoint, lead | Test passages | Hit rate | Window | Median abs error | Meets bar |
| --- | ---: | ---: | ---: | ---: | --- |
| algonac, 0–2 h | 135 | 92% | 9 min | 2 min | **yes** |
| algonac, 2–6 h | 126 | 88% | 82 min | 12 min | **yes** |
| algonac, 6–12 h | 21 | 86% | 816 min | 326 min | no |
| belle-isle, 0–2 h | 150 | 87% | 40 min | 5 min | **yes** |
| belle-isle, 2–6 h | 131 | 86% | 306 min | 8 min | no |
| belle-isle, 6–12 h | 31 | 87% | 984 min | 241 min | no |
| detroit-riverwalk, 0–2 h | 149 | 85% | 40 min | 5 min | **yes** |
| detroit-riverwalk, 2–6 h | 126 | 84% | 90 min | 8 min | **yes** |
| detroit-riverwalk, 6–12 h | 39 | 82% | 675 min | 49 min | no |
| marine-city, 0–2 h | 142 | 79% | 7 min | 2 min | **yes** |
| marine-city, 2–6 h | 127 | 91% | 64 min | 9 min | **yes** |
| marine-city, 6–12 h | 32 | 84% | 723 min | 206 min | no |
| marysville, 0–2 h | 146 | 78% | 11 min | 3 min | **yes** |
| marysville, 2–6 h | 80 | 88% | 107 min | 13 min | **yes** |
| marysville, 6–12 h | 66 | 86% | 513 min | 34 min | no |
| port-huron, 0–2 h | 134 | 81% | 28 min | 5 min | **yes** |
| port-huron, 12 h or more | 17 | 82% | 1738 min | 355 min | no |
| port-huron, 2–6 h | 65 | 77% | 227 min | 20 min | no |
| port-huron, 6–12 h | 61 | 84% | 405 min | 115 min | no |
| st-clair, 0–2 h | 142 | 79% | 9 min | 2 min | **yes** |
| st-clair, 2–6 h | 82 | 89% | 71 min | 12 min | **yes** |
| st-clair, 6–12 h | 61 | 87% | 572 min | 30 min | no |

## What this supports

- **Every river town** (Port Huron, Marysville, St. Clair, Marine City, Algonac) gets windows up to 2 hours ahead.
- **Marysville, St. Clair, Marine City and Algonac** also get windows at 2 to 6 hours.
- **Port Huron at 2–6 hours fails on width.** Ships approaching from Lake Huron wait and anchor offshore, which makes the windows too wide to plan around.
- **Live coverage:** the Open Waters bounded query (`/api/freighter-ais?region=st-clair-detroit`) returned 17 to 18 ships across the corridor on 2026-11-27. Five were moving with a steady course, enough to produce windows at all five towns.

## Detroit River (not yet published)

- **Belle Isle:** passes at 0–2 hours (87%, 40-minute window); fails at 2–6 hours on width.
- **Detroit RiverWalk:** passes at 0–2 hours (85%, 40 minutes) and 2–6 hours (84%, 90 minutes).
- **Why not yet:** the existing `/detroit-river-freighters/` page carries its own freshness contract (8- and 10-minute signal limits), its own intent pages and its own tests. Adding windows there should be a separate, additive change reviewed against that contract, not part of this PR.

## Reproduce

```bash
node scripts/passage-study.mjs --corridor data/passage-corridors/st-clair-detroit.json --points scd-2025-*.ndjson --summary
node scripts/build-passage-model.mjs --corridor data/passage-corridors/st-clair-detroit.json \
  --viewpoints port-huron,marysville,st-clair,marine-city,algonac --points scd-2025-*.ndjson \
  --source "..." --out data/st-clair-river-ships/passage-model.json
```

The engine is `lib/river-passage.js`, a generalized copy of `lib/seaway-passage.js`. A test proves both give identical results on the Seaway corridor. The Seaway pages still use the original engine; migrating them is a separate follow-up.
