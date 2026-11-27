# Seaway passage research (coverage logger, NOAA study, passage engine)

Status: **research only**. No passage window is shown to visitors until the held-out evaluation below meets the release bar.

## Why

The Seaway hub's live AIS feed (Open Waters, regional queries) reports ships at Montreal, Beauharnois and the Thousand Islands, but has repeatedly returned **zero** reports for Massena (Eisenhower and Snell) and Iroquois: at launch on 2026-10-23, and again on 2026-11-27. The proposed visitor feature is "When will a ship pass Eisenhower, Iroquois or Alexandria Bay while I'm there?" It needs two things before it can be honest:

- measured coverage per region;
- historical travel times across the gap.

## Pieces

| Piece | What it does |
| --- | --- |
| `scripts/seaway-coverage-log.mjs` + `.github/workflows/seaway-coverage-logger.yml` | Polls the five regional queries every 3 minutes in four runs of about 5h45m per day on GitHub Actions. It uploads NDJSON artifacts kept for 90 days. It skips itself while the Seaway is closed, using `seaway-season.js`, and resumes at reopening. It makes no Vercel calls, commits or deploys. |
| `scripts/seaway-noaa-corridor.mjs` + `.github/workflows/seaway-noaa-passage-study.yml` | Manual dispatch. It extracts corridor positions from public-domain NOAA Marine Cadastre daily AIS files (US-received), four consecutive days a month, April to December. |
| `lib/seaway-passage.js` | Builds an approximate channel centreline (chainage from St. Lambert), then finds passages, direction and interpolated viewpoint crossings (only between fixes 45 minutes or less apart). It turns these into empirical travel-time windows (p10 to p90) from 5 km checkpoints to viewpoints, and runs a held-out evaluation. |
| `scripts/seaway-coverage-report.mjs` | Produces coverage share per region, passages, viewpoint crossings and held-out hit rates, from live logs and/or NOAA extracts. |

## Release bar for a visitor-facing window

All of these must hold for a viewpoint and lead-time bucket before it is shown:

- **Held-out hit rate:** at least 75% for a nominal 80% window, with at least 50 held-out forecasts.
- **Median window width:** short enough to plan a visit, about 3 hours or less at lead times of 6 hours or less.
- **Live start points:** the live feed actually supplies the starting positions for that viewpoint. A model trained on NOAA history is useless if the live source never sees the ship.
- **Labelling:** the page says it is a typical-pace window from observed passages, not a schedule, queue position or lock assignment. The official order of turn stays the authority.

If the bar fails, the result is recorded and nothing ships.

## Downloading logs

```bash
gh run list --workflow seaway-coverage-logger.yml --limit 100 --json databaseId -q '.[].databaseId' \
  | xargs -I{} gh run download {} --dir seaway-coverage --pattern 'seaway-coverage-*'
node scripts/seaway-coverage-report.mjs --dir seaway-coverage --summary
```

## Results: NOAA 2025 study (run 46020845579, 2026-11-27)

**Data:** 36 days, four consecutive days a month from April to December 2025. That gave 347,176 corridor positions from 460 ships, forming 454 passages (228 upbound, 226 downbound).

**Viewpoint crossings with fixes 45 minutes or less apart:**

| Viewpoint | Crossings |
| --- | ---: |
| Alexandria Bay | 289 |
| Clayton | 272 |
| Brockville | 120 |
| Iroquois | 67 |
| Eisenhower | 35 |
| Snell | 31 |
| St. Lambert | 1 |

US receivers cover the Thousand Islands well and Massena poorly. Montreal is out of range.

**Raw empirical windows were overconfident.** They hit 55–77% against a nominal 80%. A split-conformal calibration fixed that. The split uses day-of-year mod 3 (train, calibrate, test), with no passage shared between splits, and one forecast per passage, viewpoint and lead bucket:

| Viewpoint, lead | Test passages | Hit rate (target 80%) | Window | Median abs error | Meets bar |
| --- | ---: | ---: | ---: | ---: | --- |
| Alexandria Bay, 0–2 h | 72 | 85% | 10 min | 2 min | **yes** |
| Alexandria Bay, 2–6 h | 50 | 76% | 35 min | 11 min | **yes** |
| Clayton, 0–2 h | 73 | 79% | 7 min | 2 min | **yes** |
| Clayton, 2–6 h | 31 | 81% | 33 min | 8 min | no (too few passages) |
| Brockville, 0–2 h | 29 | 66% | 7 min | 3 min | no |
| Brockville, 2–6 h | 25 | 64% | 41 min | 9 min | no |
| Eisenhower, Snell, Iroquois | fewer than 20 calibration passages | — | — | — | no forecast |

**Conclusions**

- An honest "when will a ship pass" window is supported **for Alexandria Bay and Clayton**, up to about 6 hours ahead for Alexandria Bay and 2 hours for Clayton.
- The live feed covers this stretch: the Thousand Islands region reported ships in every check so far. The coverage logger will confirm its gap rate.
- **Eisenhower cannot be forecast** from either source today. Neither feed hears ships reliably at Massena. The Eisenhower page keeps the official order of turn and the daily recording as its schedule answer.
- Remaining caveats before release:
  - These are typical-pace windows from 2025 passages. Ice, weather, anchoring and lock queues upstream are not modelled; the 12-hour-plus bucket is refused.
  - The live feed's own fix interval and gaps (from the logger) must be checked before a visitor sees a window.
  - Calibration should be refreshed each season, with the 2026 NOAA archive once it is published.
