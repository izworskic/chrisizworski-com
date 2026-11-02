# Rocket Launch Truth Engine v1 — Mission Evidence Reconciliation
November 2, 2026

## Mission
Give launch visitors a dated source history of what changed, what independent reporting says, and whether a second schedule agrees. Do not create another generic calendar or turn a target time into an official launch GO.

## Inputs
1. Launch Library 2 v2.3: two bounded U.S. upcoming queries, plus up to four filtered per-mission update queries (created_on, comment, info_url). Provider contributor updates are NOT operator timestamps.
2. RocketLaunch.Live: https://fdo.rocketlaunch.live/json/launches/next/5 — a second curated next-five global sample. Explicitly credit “Data by RocketLaunch.Live”. Only exact unique mission IDs and minute-precise LL2 targets may be compared; missing records, day-only dates and repeated identity markers cannot be considered disagreements.
3. Spaceflight News API: https://api.spaceflightnewsapi.net/v4/articles/?launch=LL2-UUID&limit=4 — news indexed by LL2 mission UUID, with original URLs, publishers and publication timestamps.
4. Spaceflight Now: existing editorial news card remains. Its registered custom WordPress API routes are not yet reliable or confirmed permitted for automated ingestion, so this release does not scrape them.
5. Official operators, NPS, Kennedy Space Center, 45WS and NWS continue to control their respective operational, access and weather judgments.

## Architecture
- Existing private Postgres ToolState; no Redis, Supabase, new API keys, third-party browser requests or copied article bodies.
- Existing authenticated KSC monitor runs its old 15-minute checks and an isolated hourly Launch Truth watcher (55-minute minimum).
- At most two LL2 schedule queries and four LL2 contributor update queries per hour, plus one RocketLaunch.Live next-five query and four SNAPI news requests. It samples one imminent mission per available U.S. coastal region, at most four. All other missions are explicitly unmonitored, not silently assumed absent.
- 14-day expiring state, separate lock, bounded source sizes and timeouts, 30 event history per mission, short retention of historical-only entries for missions leaving the sampled list.
- First-seen changes show monitor detection timestamps, not invented operator publication dates.
- Read-only GET /api/rocket-launch-truth?launchId=UUID never polls external providers.
- Frontend source ledger on national and Florida pages displays change chronology, attributed LL2 updates, exact launch-ID-indexed news and a cross-calendar comparison. Unknown/stale/conflicting results have explicit explanations and no GO calls. The main LL2 countdown and official weather/access decisions stay untouched.
- No change to canonical paths, existing maps, ad placement or the SEO identity stack.

## Source confidence
Original operator statement controls flight decision. LL2 is a third-party scheduled target. RocketLaunch.Live is another curated schedule, but common upstream evidence cannot be excluded even if times match. SNAPI and Spaceflight Now report news rather than certify range status. A missing record or missing news does not mean a scrub or successful launch.

## Benchmark scenarios
- Exact named mission and same time: report matching calendar targets, never a GO.
- Exact named mission and different time: show dated disagreement and direct reader to operator.
- Date-only mission: comparison blocked even if another provider supplies a seemingly precise time.
- Mission not in free next five: no disagreement claimed.
- Repeated/ambiguous mission marker: comparison blocked.
- Source outage, stale observation, or more recent LL2 target on the page: old agreement suspended.
- Mission drops from sample: retain bounded history but label historical only, never infer launch completion.
- Scheduled monitor source errors do not disable the existing KSC workflow.
- End-to-end regression and production build must pass before merging.

## Source example
USSF-432 LL2 updates on October 28 and November 1, 2026 shifted the published target from November 3 at 01:42 UTC to November 4 at 01:28 UTC. The separately retrieved RocketLaunch.Live next-five entry listed November 4 at 01:28 UTC. These are observed provider claims, not a verified delay cause or operator GO.

## Remaining limitations
Anonymous LL2 calls are throttled. GitHub scheduled jobs are nominal, not guaranteed at precise intervals. The free RocketLaunch.Live feed covers five worldwide missions only; most national missions are not in the sample. News indexing can associate a broad round-up with a mission. On launch day, only official operator and range messages can establish flight operations.

## Verification
Tests: tests/rocket-launch-truth.test.js, tests/space-coast-launch-day.test.js, tests/space-coast-ksc-watch.test.js, tests/rocket-launch-usa.test.js, tests/spaceflight-now-editorial.test.js.
Dedicated GitHub Actions gate, full repository gate, Vercel preview, production API and static-asset checks required.
