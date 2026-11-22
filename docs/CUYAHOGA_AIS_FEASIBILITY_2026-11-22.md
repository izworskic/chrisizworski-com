# Cuyahoga freighter and bridge watch: AIS coverage feasibility

Checked: 2026-11-22. Status: RESEARCH ONLY, NOT LIVE VERIFIED. Owner: izworskic/chrisizworski-com.

## Decision

Advance with a Cuyahoga river-and-bridge *research pilot*, not a live bridge-ETA page. Existing AIS normalization and the NOAA public-domain historical record make a low-cost proof of concept credible. No sampled coverage percentage, historical crossing time, verified bridge opening, or public arrival window is established by this document.

Visitor job: pick a recently observed vessel; understand whether it is actually traveling the Cuyahoga, which movable bridges lie along its verified route, and where public watching is permissible. The first answer must degrade to last observed position plus age when crossing times cannot be proven.

## Source ledger and permissions

1. Open Waters AIS reference: https://openwaters.io/api/ais/ (checked 2026-11-22). Snapshot GET /v1/vessels returns GeoJSON; sample fields include feature geometry, MMSI, seen, speed, heading and source. The provider describes personal use as free and commercial service as paid. A public advertising-supported site MUST obtain explicit applicable permission before expanding its production use. Existing use is not proof of rights. HTTP requests are limited and may return stale stationary ships. Provider-derived positions are observations, never bridge openings.
2. Open Waters vessel track and MCP guide: https://openwaters.io/ais/mcp/ (checked 2026-11-22). Per-vessel tracks can span up to 366 days. The MCP tool returns at most 200 positions in a call and can simplify or truncate. Short subranges must be inspected for crossing precision; track playback cannot invent intermediate positions. Provider source attribution must be preserved.
3. NOAA Marine Cadastre AccessAIS: https://coast.noaa.gov/accessais/ and https://github.com/NOAA-OCM/ocm-marinecadastre-ais-vessel-traffic (checked 2026-11-22). NOAA supports geographic and time-window exports, 2024 broadcast point files, 2024-2025 monthly historical tracks, and recent data catalogs. NOAA's project describes its materials as CC0. Confirm each specific downloaded dataset and column-level timestamps, not just a track-line geometry, before computing times between bridges. Public historical data is the preferred offline calibration source.
4. NOAA electronic navigational charts: https://nauticalcharts.noaa.gov/charts/noaa-enc.html (checked 2026-11-22). ENC channel geometry is a candidate for a source-verified centerline. The coarse bounding box in the audit script is an inclusion filter only, NOT a navigational channel or bridge coordinate.
5. US Coast Guard 33 CFR 117.848 Cleveland Harbor: https://www.ecfr.gov/current/title-33/chapter-I/subchapter-J/part-117/section-117.848 (regulation, verify current text before public use). Published 2025 regulation identifies Norfolk Southern railroad bridge at river mile 0.76, Willow Avenue 1.02, Center Street 1.28, Columbus Road 1.93, Flats Industrial Railroad 2.24, City of Cleveland Railroad 2.42, Carter Road 2.43, West 3rd Street 3.42, CSX 4.75, Cleveland Cliffs Railroad #1 5.42, and additional upriver railroad bridges. These are regulatory river-mile references, NOT map-verified point coordinates. A July 2026 Coast Guard proposal concerning radio hailing is NOT assumed final. Opening rules are not live opening events.
6. Coast Guard Cuyahoga PAWSA 2018: https://www.navcen.uscg.gov/sites/default/files/pdf/pawsa/WorkshopReports/Cuyahoga%20River%20PAWSA%20Report%20%282018%29.pdf (historical navigation-risk context, not current clearance or schedule).

## Existing code and architecture

Reuse lib/soo-ais.js for normalized MMSI, report age, coordinates and source credits; existing api/soo-ais.js already makes a bounded Open Waters request. Do not introduce an independent live feed, Redis, a polling worker, a new domain or a commercial AIS service. Cuyahoga-specific path matching, public vantage points and bridge coordinates are not yet implemented.

Research-only utility: scripts/cuyahoga-ais-audit.mjs. No dependencies, network, writes, credentials or production invocation. It audits supplied local GeoJSON snapshot observations and a normalized historical sample format, and returns explicit no-ETA statuses. This does not measure geographical AIS receiver coverage by itself. Do not read snapshot zeros as an absence of ships.

Example locally supplied historical sample format:

    {"schemaVersion":1,"tracks":[{"mmsi":"123456789","truncated":false,"points":[{"lon":-81.70,"lat":41.50,"seen":"2026-10-20T12:00:00Z"}]}]}

Run:

    node scripts/cuyahoga-ais-audit.mjs --snapshot local-snapshot.geojson --tracks normalized-tracks.json
    node --test tests/cuyahoga-ais-audit.test.js

Do not commit raw AIS track archives, personal receiver identifiers or unreviewed downloaded data. The sample format is a test interface, not an assertion about NOAA's published file schema.

## Evidence gaps and next experiments

A. Receiver coverage: collect or lawfully access multiple dated observations for the river entrance, The Flats and industrial upstream reach. Compare to independent documented passages. A one-time empty AIS snapshot is NOT evidence of poor coverage. Verify source attribution and commercial distribution terms.

B. Historical transit precision: use AccessAIS broadcast points or equivalently timestamped NOAA records for a focused time window. Check that bridge crossings can be reconstructed at useful temporal resolution from real positions. Report gaps, invalid fixes, time ordering, sample truncation and source-age distributions by segment and direction. A simplified LineString alone is insufficient to infer passage times. The current coarse-bbox script cannot establish crossing location.

C. Geometry: extract a versioned channel centerline and bridge locations from authoritative NOAA/USCG materials, with feature-specific citations. Keep river mile and map coordinates separate until independently reconciled. Verify dock access and relevant vessel destinations; not every vessel entering Cleveland Harbor enters the Cuyahoga.

D. Evaluation: annotate a real held-out set of river passages. Compare observed crossing timestamps to candidate conditional arrival windows; report number of passages, missed events, window width and empirical containment by direction/bridge. Do not publish any ETA until validation has been repeated on independent dates and failures are documented. No source observation means UNKNOWN, not a positive forecast.

E. Public viewing and education: separately source Cleveland Metroparks public locations, entrances, bridges and sightlines. A ship point is never a visitor routing destination. An educational bend animation must be labeled a demonstration and must not animate an estimated ship track as observed live AIS.

## Technology fit and distinctiveness

HTML/CSS for accessible first answer and source-linked visitor guide; browser JS and lightweight SVG for selection and clearly labeled river mechanics; existing Node for bounded AIS only after use rights and coverage are verified. Offline Python may help with large NOAA GeoParquet subsets but is not required for this first audit. Rust and Java are rejected absent measured bottlenecks. No new production infrastructure, costs, build steps, API routes, ads or SEO changes.

The Cuyahoga job differs from the Soo Locks lock-chamber prediction and Welland Canal lock-by-lock visitor story: it centers on a complex moving bridge sequence and difficult channel bends, with public viewing handoffs. A simulated navigation lesson is distinct from a live route, and both must stay synchronized to honest evidence labels.

## Verification and handoff

Four local fixture tests passed on Node 22 on 2026-11-22. Repository full npm run verify:all, live AIS calls, historical NOAA extraction, receiver coverage assessment, rendered browser checks and PR CI: NOT VERIFIED at report creation. Nothing is deployed or indexed. Do not merge while the full gate is red or unknown.

Exactly one next action: source and normalize a small, dated NOAA broadcast-point sample covering at least one documented complete Cuyahoga river transit, then run this offline audit and establish whether successive bridge-crossing timestamps are reconstructible.


## Next priority implementation: NOAA broadcast-point event study (2026-11-22)

The offline importer at scripts/cuyahoga-noaa-points.mjs accepts actual NOAA nationwide daily CSV or .csv.zst archives and emits the version-1 normalized historical format accepted by scripts/cuyahoga-ais-audit.mjs. It handles the **different 2018–2024 and 2025+ field names**, requires UTC dates, verifies identity/coordinates/time, preserves raw observed positions and groups by MMSI. A separate audit reports maximum time gaps, duplicate timestamps and incomplete samples. Every output remains BRIDGE_ETA_NOT_VALIDATED. No bridge coordinates, crossing times or opening events are fabricated.

Authoritative NOAA 2025 data dictionary (two schema versions): https://coast.noaa.gov/data/marinecadastre/ais/data-dictionary.pdf
Public source file catalog: https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/index.html

**Independent real event selected for receiver stress test, NOT ordinary transit calibration:** US Coast Guard report, *Sunnanvik* grounded at Cleveland's Cuyahoga entrance June 20, 2025. Watchstanders were first notified at **12:43 a.m. EDT (04:43 UTC)** and the vessel was refloated around **6 a.m. EDT (10:00 UTC)**. Those are Coast Guard incident/report times, NOT confirmed AIS timestamps or bridge crossings.
Source: https://www.dvidshub.net/news/501106/coast-guard-responds-motor-vessel-aground-cuyahoga-river-cleveland
Vessel IMO 7633375, which must be matched with the actual NOAA broadcast record. No fixed MMSI is assumed because publicly surfaced vessel registries disagree.

Primary dated broadcast-point archive:
https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/ais-2025-06-20.csv.zst
NOAA lists this file at 252.4 MB compressed. The nationwide file is intentionally NOT committed or published to the website.

Once the NOAA source file is available locally (requires zstd for the compressed file), execute:

    node scripts/cuyahoga-noaa-points.mjs \
      --input ais-2025-06-20.csv.zst \
      --name SUNNANVIK --imo 7633375 \
      --from 2025-06-20T00:00:00Z --to 2025-06-21T00:00:00Z \
      --out /tmp/sunnanvik-2025-06-20-observations.json
    node scripts/cuyahoga-ais-audit.mjs --tracks /tmp/sunnanvik-2025-06-20-observations.json

The --name / --imo match is an OR against NOAA's actual fields; each returned MMSI group is inspectable separately. The output is a date-scoped observational **candidate**, not proof the vessel followed a particular bridge sequence. Empty results mean NO OBSERVATIONS MATCHED, not no ship passage.

A single-use GitHub Actions research run is defined in .github/workflows/cuyahoga-noaa-2025-study.yml, scoped to this branch only. It downloads the one exact NOAA day, runs the parser and test suite without credentials, and uploads only the small filtered study JSON for review. Retention is three days. It does not create a production feed, scheduled process, paid service or visitor page. The NOAA download/run is separate from the repo full npm run verify:all gate.

**Next acceptance condition:** inspect real source data from that job. Identify actual point count, first/last observed time, reporting gaps, stationary periods and any inconsistent identity. Do not claim successful receiver coverage or bridge ETA validation if data are unavailable or if only an abnormal grounding is observed. The next independent calibration dataset should contain ordinary, complete, documented upriver and downriver passages with versioned bridge coordinates and leave-one-date-out testing.
