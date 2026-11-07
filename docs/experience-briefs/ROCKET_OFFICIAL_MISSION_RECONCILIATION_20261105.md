# Rocket official mission reconciliation — 2026-11-05
Owner: izworskic/chrisizworski-com · public experience: /national-tools/rocket-launch-live/#official-notice-desk
Python Intelligence OS v1 + Experience OS v1.2 · "Standardize the quality. Never standardize away the imagination."

## Decision
The user asks: "Did the actual range authority announce **this** launch, or am I only looking at a third-party launch estimate / generic beach policy?" The distinction is crucial for deciding whether travel is worthwhile. A name collision or a dated executive order is not official launch permission.

### Existing baseline, alternatives and chosen architecture
- Baseline: national LL2 shared Postgres snapshot, 10-source Python official source ledger, region-specific specialist viewers and existing Florida/KSC exact-event watcher. **No direct Python official article → national mission UUID joins**.
- Alternative A: fuzzy front-end title/date string matching on visitor requests. Rejected: high false positive risk, misses official article provenance, duplicated latency.
- Alternative B: fresh cached national LL2 manifest served as bounded GET by the existing signed Vercel API; scheduled stdlib Python reads official NASA Wallops Range blog / Vandenberg news articles, matches exact unique designations plus local calendar day; signed publish to existing state; Node rechecks identity before serving; current JS interface displays evidence — **chosen**.
- Alternative C: live per-request Python or LLM semantic inference. Rejected: uncalibrated estimates and operational/runtime risk; no independent mission-ID truth.

Python OS score (weighted 30/25/15/15/15): decision value 5, evidence 3, differentiated experience 4, infrastructure 5, search 4 -> 84. No predictions are claimed.

## Source register and rights
Current 10 public official-source pages stay unchanged. This adds two **bounded public-agency news indexes**, with at most two HTTPS article fetches per index/check:
- NASA Wallops Range: https://www.nasa.gov/blogs/wallops-range/ , articles from the same host under /blogs/wallops/YYYY/MM/DD/ or /blogs/wallops-range/YYYY/MM/DD/ ; dated blog posts are official operational news. Do not infer public viewing from article or from old Visitor Center "Next Launch" copy.
- U.S. Space Force Vandenberg news: https://www.vandenberg.spaceforce.mil/News/ , article details under /News/Article-Display/Article/<ID>/... ; official public launch statements may be absent or block automated fetches. An outage means **unavailable**, not "none scheduled".

Both use 8–9s bounded stdlib HTTPS fetching, strict same-host redirect validation, max 440KB index / 430KB article. Store only short mission designation, event date, original link, source fingerprint and small title. Never store raw HTML or copyrighted article bodies. No new paid APIs, credentials, Supabase, Redis, or visitor location collection. No LL2 requests from Python: the manifest is served by the existing, authenticated shared Postgres-backed schedule API.

## Match contract and abstention
A published article can match only when all conditions hold:
1. Directly fetched approved official article on official host/path. List/link title must be about a rocket/launch/mission, publication within 21 days (NASA dated archive paths), and announce a **prospective** launch/attempt.
2. Explicit event date in a forward-looking launch sentence: never infer the launch date from the page publish date, a PDF index date, general park hours or a stale next-launch card. Date must fall from two days before the scan to 65 days after.
3. Exactly **one distinctive mission designation** (e.g. USSF-259, Starlink Group 15-24, HASTE-12) in title or planned-launch sentence; vehicle alone (Falcon 9, Electron, "sounding rocket") is not a mission identity.
4. Official article describes an operation at its registered range. A Wallops article about Poker Flat or another remote range is not a Wallops launch announcement.
5. Match the same designation to **exactly one** mission in the *recent* national LL2 schedule at the same region and within +/- one local calendar day of the event. No fuzzy nearest-date fallback, date-only mission success, or cross-coast propagation.
6. Signed Vercel POST independently verifies the claimed UUID, region, same designation and local event-day agreement against its live cached national schedule. If missing/stale/changed, match is dropped.

If none pass, show **no independently verified match**, not "launch canceled" or "range closed". Conflicting source notices are rejected rather than picking one. Different published event date and the LL2 target must be shown as source disagreement, not silently overwritten. The backend records bounded detection history for new matches, article changes or changed official dates, never calls a previous match's disappearance a cancellation.

## Versioned API and freshness
New GET: /api/rocket-official-notices?manifest=1 -> version 1, source shared-postgres-ll2-national-v2, health, checkedAt, bounded mission UUID/name/region/net/precision without weather or fresh LL2 call. This GET is internal-to-pipeline **and public but sanitized**.

Existing signed OIDC POST accepts legacy version 1 ten-source snapshots plus an optional \`reconciliation\` version 1 object with source status, checkedAt, manifestCheckedAt, exact positive matches and counters. v1 remains backward compatible; only committed signed worker state may carry reconciliation. GET returns matching notices per region through the same existing API; frontend filters to the selected mission UUID and rechecks local date. No separate indexable URL or new sitemap entry.

General ledger current-state freshness still expires after 90 minutes, with storage retained up to 72 hours. Mission positives are also suppressed when the scheduled source manifest or ledger is overdue; 30-minute GH Actions cadence is best effort.

## Validation and benchmark
Independent tests: Python article host/path, publication vs event date, false cross-range match, duplicate/ambiguous missions, historical orders and stale "Next Launch", conflicting official date, stale manifest, generic Falcon 9 names and true unique matches. Node tests signed post provenance, source age, schedule identity reread, changed event date history, unavailable override, and evidence-specific frontend. Require full repo GitHub public-page gate, launch-truth CI and preview READY, then merge; verify live national page and signed scheduled worker.

Baseline positive matches in the previous product: **0** (no match engine). Accuracy is a safety-first functional requirement, not a count-maximization goal; zero matches on a day with no officially linked future announcements is a legitimate result. Monitor official index retrieval rates, known event article match/abstention outcomes, 90-minute source SLA, visitor link engagement, and comparable GSC 28-day click/CTR windows without attributing causality absent controls.

Rollback: revert source/worker/API/JS changes; the original six-region national schedule and specialized access/ticket systems remain separate and functional.
