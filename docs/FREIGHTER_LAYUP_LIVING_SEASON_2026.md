# The Living Great Lakes Winter Fleet — Annual Layup Story Engine

**Product goal:** A repeat-visit, source-backed tracker, not a static page of last year's docked ships.

## How the public page works
1. Opens on the **2026–27 developing winter**. It starts empty and visibly says when no sourced arrivals have been recorded.
2. **Winter story feed** shows dated reported arrivals, dock moves, maintenance and eventual departures with a link to the specific reporting page. Counts reflect distinct ship identities, not the number of articles published about them.
3. **13 Great Lakes harbor areas** across the United States and Canada are monitored as geographic references. They are never asserted to be exact vessel berths, accessible private docks, or live vessel locations.
4. **AIS harbor watch** separately shows fresh transponder signals from Open Waters, deduplicated across three region-specific queries. Maximum age for an AIS watch signal is 20 minutes; incomplete regional results are explicitly flagged. An absent signal is never an absence-of-ship claim, and a stationary ship is never a confirmed winter layup.
5. Prior winter records stay available by year. The season opens each November 1 at midnight **America/Detroit**. Old ships never populate a new season automatically.

## Source pipeline and publication policy
- Four public feed endpoints, checked every 6 hours during November–April by a scheduled GitHub Action (initially Duluth Harbor Cam, Wisconsin Marine Historical Society, Duluth Seaway Port Authority, and Community Waterfront Heritage Centre at Owen Sound). The URLs returned feed content during development, but there is **no guarantee of complete reporting across all 13 harbors**.
- A report must be within the active shipping winter, link to the source publisher's HTTPS host, explicitly mention winter layup or winter berth, specify one known/clearly headed M/V vessel identity, specify one harbor, and describe an actual completed event. Future plans are never accepted as completed arrivals.
- Named/dated arrival evidence from the Duluth port authority may be classified `confirmed` when explicit; other journalistic and museum reports are `reported`. An unfamiliar hull mentioned with an explicit M/V heading enters as **reported**, never automatically as verified.
- Departures and yard work require a prior documented same-season arrival. Ambiguous port, identity, earlier-season, unsourced, unrelated, or out-of-order items never become an unsourced layup.
- A **review queue** is saved in `data/freighter-layup-review.json` for ambiguous reports. An editor can publish a properly attributed and date-validated event from `data/freighter-layup-editorial.json`. No invented records.
- GitHub Action writes a new static JSON ledger **only when evidence, review decisions, or annual season state changes**, preventing paid builds from occurring on every empty scan. The ledger drives visitor UI. There is no Redis, new database, or continuous AIS server process.
- AIS is **not** an arrival classifier. The live watch caches the upstream request on the API route for ~3 minutes; this is distinct from reporting cadence.

## Seasonal reset contract
- At November 1 00:00 Michigan time, `seasonForDate` advances the active winter.
- The previous event ledger enters `previousSeasons` (up to 12 rolling years). A zero-record new season remains empty and asks visitors to follow harbor watch, rather than copying previous berths.
- The season start is pre-created during October only as an upcoming shell; scans do not accidentally roll backward during the October 31 UTC-to-Michigan boundary.
- Spring departure events close their individual ship stories. There is no blanket assumption that all undeparted ships are still docked later in the year.

## Operational verification
- Native Node tests: `node --test tests/freighter-layup*.test.js`
- Browse test: `node tests/freighter-layup-browser.cjs` (Chrome on desktop and mobile; simulated source arrival, map, historical season isolation, source link, and zero-event new winter)
- Generator stays aligned: `node scripts/generate-freighter-layup-profiles.cjs --check`
- GitHub PR release gate runs all of the above; full repository verification and public audit remain separate.
- Automated source workflow: `.github/workflows/freighter-layup-source-watch.yml`; manual `workflow_dispatch` supported. Scheduled source scans do not make overnight discoveries instantaneous.

## Known coverage limits and next expansion
- AIS receiver coverage varies substantially by harbor; the network may return no live vessels in some regions.
- A source can publish a late report or no report at all. The site makes no claim to capture *every* ship until a verified fleet-wide data source exists.
- The 13 harbors are a monitoring footprint, not 13 verified layup locations this winter.
- Additional operator, shipyard and Canadian port reporting sources, with vessel-identity resolution and image-rights research, should be added iteratively. Never fill gaps with inferred AIS positions.
