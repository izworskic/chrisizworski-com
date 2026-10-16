# Michigan rockhounding — original GLOS 2026 measured-wave season backfill

## Result: 5,243 independently observed offshore readings, not invented event scores

On **October 16, 2026 UTC**, a one-time GitHub Actions source audit downloaded **16 original GLOS Seagull `obs_140` SPOT-1361 tabledap windows covering 112 days**. It used the existing observation-only converter, verified station identity, observed latitude/longitude, original UTC timestamps and original measurement units, and merged authentic measurements into the already functioning dedicated research-data branch.

The first end-to-end original source run: [Actions #38833508075](https://github.com/izworskic/chrisizworski-com/actions/runs/38833508075).

| Measured source and independent episode finding | Result |
| --- | ---: |
| Requested historical lookback | **112 days** |
| Provider-query windows | **16 × 7 days** |
| Historical source windows reporting zero measurements | **0** |
| Independently parsed original rows | **5,243** |
| Retained unique dated rows | **5,243** |
| Invalid original measurements rejected | **0** |
| Distinct UTC calendar days with data | **111** |
| Actual observation range | **June 26–October 14, 2026 UTC** |
| Elevated (> or = 1.0 m) wave-episode groups | **11** |
| Groups with enough continuous wave observations | **8** |
| Actual independent beach-exposure observations | **0** |
| Can publish "new agates likely" | **NO** |
| Current GLOS sensor at archive time | **STALE** |
| Current independently checked NWS hazard state at time of capture | **ACTIVE** (Gale Warning and Small Craft Advisory) |

The **1.0 m** boundary is a source-research *episode detection* bin, **not an NWS hazard or collecting safety threshold**. A 48-hour separation is used to conservatively group correlated elevated readings. Multi-day storm systems can merge into one group; these counts should not be described as a meteorological storm census.

### Event examples grounded in original measurements

- **July 21, 2026:** measured offshore peak **1.62 m**, source observation coverage through a further 48-hour record.
- **August 23, 2026:** measured offshore peak **1.94 m**.
- **September 9, 2026:** measured offshore peak **1.91 m**.
- **September 14, 2026:** measured offshore peak **1.94 m**, followed by additional elevated readings after a temporary decrease.
- **October 5, 2026:** measured offshore peak **2.51 m** (part of an extended elevated episode in the later October cluster).
- **October 12, 2026:** measured offshore peak **2.57 m**, within an extended episode of renewed elevated conditions. Storm ending **not verified**.

The chronology, peak heights, and derived **11** groups and **8** sampling-qualified groups come from the original observed source; there are **no** modeled wave reconstructions, external prediction multipliers, or calibrated predictions of agate exposure.

### Implementation and verification

- `scripts/rockhounding/backfill-glos-spotter.cjs`: one-time, source-bounded original-provider historical research (7–119 days; default 112), exactly 7-day requests (16 at the default), explicit source-time-window bounds, HTTP and no-results differentiation, row hashes per response, and atomic write after original-source retrieval succeeds.
- `tests/rockhounding-glos-season-backfill.test.js`: exact 16-window chronology, deduplication, distinct-event accounting, GLOS no-results handling, unexpected source row times, outages and strict no-safety claims.
- `.github/workflows/rockhounding-glos-history-backfill.yml`: **manual/branch-only one-time research workflow**, never scheduled per visitor. Pushes historical source data **only** to `research/rockhounding-glos-observed-data`, separate from main.
- Persisted `data/rockhounding/spotter-offshore-backfill-audit.json` records all 16 original source query windows, source SHA-256 hashes, measurement row counts and source date bounds; `spotter-observed-wave-ledger.json` retains the original per-measurement wave data; `spotter-offshore-event-research.json` groups related elevated measurements while independently appending a **current** NWS hazard snapshot.
- `public/rockhounding-lab/glos-season-2026-research.json`: bounded, source-backed **frozen** 11-episode snapshot for the **noindex** research interface. The historical source chart adds a separate visual representation of the archive rather than hijacking the existing example storm picker or claiming those are present conditions.
- `tests/rockhounding-glos-season-visual.test.js`: confirms original sample counts, event count, 8 sample-qualified episodes, storm peaks, source date range, noindex, and withholding of every beach safety/stone claim.

### Scientific limitations

The Spotter measures offshore open-lake wave conditions; it **does not measure breaking waves, wet shoreline changes, new stone exposure or protected Bayshore Harbor wave heights**. Historic NOAA chart directional comparison at Agate is still not a validated current waterline orientation.

The currently running NWS hazard check cannot be retroactively assigned to individual July–October storms. A lack of alerts would not prove safe collecting.

The source archive now supports deeper date-specific research into actual wave event height, duration, direction and recovery. It **still does not validate an opportunity score or collecting window**. The next step is independent beach-change evidence, remotely obtained from dated shoreline imagery or publicly available observations, plus explicit field-validated permissions and hazard checks before publishing site conditions.

**Cost:** no paid API, no per-visitor polling, no ad/canonical/sitemap changes.
