# Great Lakes historical vessel library pilot (2026-11-24)

## Design and source

Reusable offline collection, independent of unmerged PRs #1902 and #1903. Existing curated Cuyahoga export contains 1,002 points from three selected vessel-days; this pilot expands to all source-reported cargo/tanker classes 70-89 within ten existing waterway study boxes on three fixed calendar days in 2025 (June 15, August 15, October 15). These are not random or representative dates; August 15 overlaps earlier Cuyahoga research. NOAA publishes 2025 broadcast points and source metadata: https://www.fisheries.noaa.gov/inport/item/77594 and https://coast.noaa.gov/accessais/. CC0 public domain dedication; no Open Waters history collection, new live AIS rights or source request. Canada-only portions may lack NOAA reception. No Detroit-specific box asserted in this pass.

Choose single-pass streaming existing JS and existing NOAA CSV/date parser over repeated nationwide file scans, offline Python/DuckDB (useful for later large joins) and request-time runtime (unnecessary). One archive download per date, one scan across regions. Limit 600 MB compressed per date, 12 million input rows and 250,000 region-selected records per day; exceed budget -> fail, not silently truncate. 25-minute branch-only GitHub job, three bounded downloads, read-only credentials, five-day artifact retention, no recurring schedule or production storage. GitHub Actions minutes/artifact quotas may be consumed; no additional Vercel functions, scheduled builds/day, billed features or dependencies. Direct local archive retrieval blocked by DNS; actual archive checksums and observed counts must come from the research run. No fabricated results.

## Output and evidence

Versioned per-day regional track records retain MMSI, observed UTC time, position, SOG, COG, heading, reported vessel type and length. Strict explicit column aliases; reject ambiguous schema, preserve zero and unknown separately, quarantine contradictory same-time records within a region, never infer missing position. Report valid point counts, distinct vessels, missing/other classes, source gaps, invalid identities and dates; no cohort coverage estimate or no-traffic claim. Regions overlap; counts are not additive. Per-day data and manifest are inputs for future passage-engine adaptation, not verified completed transits. No route snapping, stop confirmation, lock/bridge crossing claims or arrival models.

## Verification

Exact collector evaluated in isolated JS with minimal assertion adapter: 4/4 synchronous regression groups passed. Full Node suite, real archive download and scan, generated coverage, and repository CI not verified when authoring. No visitor-facing changes or deployment claims. Current main verification completed/success: https://github.com/izworskic/chrisizworski-com/actions/runs/45389467812. One-time research workflow is restricted to this branch and does not push or publish results. Review artifact source hashes, actual counts, sample bias and source completeness before any subsequent commit. Existing historical data and public tools remain unchanged. Rollback: revert PR; remove research branch after artifacts reviewed.

Next action: use the actual completed regional library to define repeatable checkpoint geometry and independent outcomes, then feed those through PR #1903's offline passage engine. No new live estimates until independent out-of-time passage outcomes justify them.

## One-time execution record

Initial branch-only push started https://github.com/izworskic/chrisizworski-com/actions/runs/45390603940. The reviewed workflow is now manual-only and stages each day in runner temporary storage until the decompress/scan pipeline succeeds, preventing partial streams from being treated as completed days. The first run uses the prior workflow revision; accept its coverage only if the entire download/scan step succeeds. A failed first run must not supply a coverage claim. No second run was requested by this edit.
