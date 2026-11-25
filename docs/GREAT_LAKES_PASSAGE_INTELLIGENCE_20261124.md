# Great Lakes vessel passage intelligence, historical pilot 2026-11-24

## Investment

Build a reusable offline passage-evidence layer, independent of live AIS normalization PR #1902. Use existing JS rather than adding MovingPandas/Turf or Python runtime, because the inputs are bounded timestamped observations and the existing NOAA reference analyzer already supplies bracket evidence. Future offline Python/DuckDB is appropriate for large archive joins only. No new provider, endpoint, route, recurring job, paid dependency, persistent vessel tracking or ad/SEO change.

Source: NOAA AccessAIS (https://coast.noaa.gov/accessais/), NOAA 2025 broadcast-point metadata (https://www.fisheries.noaa.gov/inport/item/77594), CC0 as stated by NOAA (https://github.com/NOAA-OCM/ocm-marinecadastre-ais-vessel-traffic). Existing checked-in extracts contain archive URLs and original checksums; nationwide archive checksums were not independently re-downloaded in this run. Reuse existing Coast Pilot rounded points and ODOT comparison; no new bridge coordinates or surveyed axes asserted.

## Method

Reject conflicting same-time fixes, invalid UTC and coordinates. Split tracks on >180 s report gaps or >40-knot straight-chord implied speed; these conservative research policies are not vessel speed limits or measured error cutoffs. Retain real observations; no interpolation. Only compare adjacent eligible reference brackets when they are strictly nonoverlapping and in one uninterrupted segment. Direction is the ordering of reference miles, not confirmed route direction or a full transit. Low-displacement episodes require at least four observed fixes over >=10 min, within 75 m of the first point; this is not proof of a stop, dock, bridge queue or continuous occupancy. Aggregate directed pair sample count, date count and vessel count; no statistical estimate, confidence interval or prediction from these samples.

## Actual result from repository NOAA archive

| Vessel-day | Unique fixes | Gap breaks | Jump breaks | Qualified reference intervals | Low-displacement episodes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mark W. Barker 2025-07-07 | 434 | 95 | 0 | 2 | 2 |
| Sam Laud 2025-08-15 | 215 | 29 | 0 | 0 | 3 |
| Mark W. Barker 2025-08-21 | 353 | 100 | 0 | 5 | 4 |

Total 1002 fixes, 3 selected dates, 2 distinct vessels, 7 eligible observed reference intervals, 9 low-displacement episodes. Withheld 4 overlapping and 3 discontinuous adjacent comparisons. None is validated bridge-axis crossing time, full passage or ETA ground truth. Selection is not representative traffic, and absence is not evidence of no ships.

Generated evidence: data/cuyahoga/passage-evidence-2025.json (internal research, not a public asset). Reproduce with node scripts/vessel-passage-study.cjs; use --out only with a new file. No raw nationwide archive is added.

## QA and release

Executed exact core, source adapter and existing bracket analyzer in isolated JS over the checked-in NOAA source. 5/5 targeted synchronous groups passed with minimal assertion adapter, not Node test runner. Exact regenerated JSON and full Node/owning repo CI remain to verify. Browser/production not applicable to offline code but no deployment verification claimed. Scientific calibration and independent surveyed crossing outcomes missing. No live ETA is enabled.

Scope: Cuyahoga pilot; reusable core for Soo, Duluth, Welland, Seaway, Detroit and Calumet only after separately reviewed checkpoint definitions, date coverage and provenance. Priority assessment (judgment): visitor decision 5/5, reliability 4/5, visual distinctiveness 2/5, cost 5/5, discovery 3/5; blocked live-prediction gate. Rollback: revert PR. Next action: collect separately dated completed passages using NOAA public historical broadcast points and independently verified crossing axes/outcomes, then hold out later dates for baseline comparison. No new estimates until supported.
