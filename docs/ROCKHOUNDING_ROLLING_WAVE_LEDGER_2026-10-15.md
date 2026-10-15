# Michigan Rockhounding — rolling issued-model NOAA wave ledger (Oct 15, 2026)

## Outcome

**Implemented, downloaded real NOAA data twice, and confirmed persistence on a separate research-data branch.**

- Main feature PR: [#1001](https://github.com/izworskic/chrisizworski-com/pull/1001), still draft, no visitor-facing prediction or production deployment.
- Persistent independent branch: [research/rockhounding-wave-data](https://github.com/izworskic/chrisizworski-com/tree/research/rockhounding-wave-data).
- [Real archive run 18Z](https://github.com/izworskic/chrisizworski-com/actions/runs/38813458764).
- [Real archive run 20Z](https://github.com/izworskic/chrisizworski-com/actions/runs/38813847153).
- [Separate focused validation](https://github.com/izworskic/chrisizworski-com/actions/runs/38813985896): **105 Node tests and 7 Python tests green.**
- Research data:
  - `data/rockhounding/issued-cycle-ledger.json` **on the data branch only**.
  - `data/rockhounding/issued-cycle-research-report.json` **on the data branch only**.
- New library: `lib/rockhounding/glwu-cycle-ledger.cjs` (original NOAA issue-time ledger, rolling retention, same-grid/same-cell/time model revision comparison).
- Capture: `scripts/rockhounding/capture-fixed-wave-cycle.py` (one no-key NOAA NOMADS Great Lakes 500 m subset at anchored **46.680000,-85.984978**, four directional wave fields, fail-closed on missing/masked cell).
- Persistence runner: `scripts/rockhounding/rolling-cycle-ledger.cjs`.
- Workflow: `.github/workflows/rockhounding-issued-archive.yml` persists only the research-data branch and retains an artifact; **does not write to main or public pages**.

## Actual dated example — real model-to-model comparison

Two actual NOAA issued cycles for Grand Marais's provisional open-north 500 m **model** point:

| 2026-10-15 UTC event | Model field | NOAA significant-wave height |
| --- | --- | ---: |
| 18:00 issue predicts 20:00 | **MODEL_FORECAST** issued at 18:00 | **0.08 m** |
| 20:00 issue starts at 20:00 | **MODEL_ANALYSIS / initial model field** issued at 20:00 | **0.08 m** |

The observed *revision between these two model values* is **0.00 m** at a two-hour forecast lead. It is one pair, **not** a trustworthy forecast accuracy estimate. The later zero-lead model field is **not an independent buoy observation**. This result is source-correct but does not establish conditions at Agate Beach or rock exposure. The fixed candidate passes same-UTC-time / same-exact-cell tests but remains a **northern-sector research proxy** without physically verified shoreline fetch and waterline orientation.

At the completion of the second run:

| Grid | Issues archived | Initial model fields | Original issued forecast rows | Independent model-to-model matches |
| --- | ---: | ---: | ---: | ---: |
| 500 m Great Lakes | 2 | 2 | 94 | 1 |
| 2.5 km Great Lakes | 1 (initial seed only) | 1 | 48 | 0 |

All previously issued forecast valid-times remain on the rolling ledger **even after those times are in the past**. No past forecast is relabeled `MODEL_ANALYSIS` or retroactively overwritten by newer predictions. A checksum-like duplicate key (grid, cell ID, issue time, valid time) prevents duplicate or conflicting source data. The archive retains up to **21 days**; the output always includes `canPublishPostStormWindow=false`.

## Runtime and cost limits

- NOAA Great Lakes 500 m operational files occur at **hourly UTC issue times**. The CLI now supports 00–23, while the intended automatic long-running collection interval is **every six hours**, avoiding per-visitor NOAA requests and API keys. Product evidence: https://nomads.ncep.noaa.gov/pub/data/nccf/com/glwu/prod/
- GitHub workflow six-hour UTC schedule: `35 2,8,14,20 * * *`, fetching the completed cycle from approximately two hours earlier to accommodate product publication.
- **Critical deployment truth:** GitHub Actions scheduled workflows only run from the repository **default branch**. The workflow currently exists on **draft PR #1001 only**; therefore the schedule is **not yet automatically active**. Two validation executions ran via branch push; the archive has two cycles. After the code is reviewed/merged to default, scheduling can begin; no background harvesting is implied before that.
- The research bootstrap used a single authentic October 15 18Z NOAA model file; the 20Z run downloaded a **different real NOAA issue**. No fabricated 72-hour history or backward model analyses.
- The work is confined to a research PR and separate data branch. It does not alter ads, sitemap, canonical tags, search indexing or active live Michigan outdoor tools.

## Model evidence vs independent ground truth

These are different questions, and the engine must never conflate them:

1. **Internal model revision consistency** — earlier 500 m model forecast vs later initial model field at the identical cell/time. This is now implemented and has one real matching pair.
2. **Independent model skill** — regional NOAA model forecast vs subsequently recorded NDBC buoy wave height at a model grid location **collocated with the buoy and same valid UTC time**. **Not implemented yet.** Buoy 45004 is ~111 km offshore from Grand Marais; do not compare Agate Beach model-cell predictions directly with that remote buoy as if they were colocated.
3. **Actual rockhounding usefulness** — verified shoreline exposure, beach movement and dated rock-finding outcomes. **Not yet available.** Even a wave model that perfectly reproduces another model cannot prove new stones or safe collecting.

The independent harbor/Bayshore shelter/breakwater model and fully reviewed Agate shoreline normal also remain unverified. Never imply NWS alert checks certify shoreline safety.

## Next focused engineering milestone

**Add a separately sampled Great Lakes model point near NDBC 45004**, archive model issue and valid times for that point, and match them to the station's real wave observations (explicit time tolerance and missing-data handling). That permits *offshore* forecast skill estimates without inventing shore-level validation. Continue the anchored Agate 500 m archive and validate land/water connectivity through remotely sourced shoreline geometry. No contacting anyone or onsite visits required.
