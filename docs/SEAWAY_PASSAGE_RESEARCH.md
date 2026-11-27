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
