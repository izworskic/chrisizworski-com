# Python Official Launch Notice Intelligence — six coastal ranges
November 5, 2026 · Python Intelligence OS v1 / Experience OS v1.2
Owner: izworskic/chrisizworski-com · canonical: /national-tools/rocket-launch-live/

## What the traveler actually needs
A scheduled mission cannot answer whether beach access, public parking, a visitor-center gate, a road, or a range safety area is open. Distinguish three independently timestamped questions: **when the mission is scheduled** (existing signed LL2 snapshot), **what an official authority published about an actual event or local status** (this worker), and **whether the visitor can legally enter the location for that mission** (often unknown). An older executive order cannot be declared active; yesterday's open beach cannot be tomorrow's launch clearance.

## Python vs alternatives
- A: extend browser JS and scrape sources on every visitor request — rejected: source limits, anti-bot, broken provenance and latency.
- B: scheduled Python stdlib extractor, signed compact POST to existing Vercel Node API, private Postgres ToolState, existing JS viewer — **chosen**: independent normalize/deduplicate/freshness tests, no visitor Python startup, existing managed auth/storage, at most ten publisher GETs every 30 minutes, no new servers.
- C: Python Vercel per-request function — rejected: duplicate runtime, uncertain cold start, no evidence benefit.

Five-factor preliminary score (0–5): visitor decision 5, source reliability 3, differentiated interface 4, operational cost 4, discovery 4 = **81/100**, warrants a bounded evidence-first implementation (not a predictive model). Missing/failing public sources never become verified GO.

## Official sources and terms
Official public pages listed in scripts/rocket_official_notices.py: Vandenberg SLD 30 news & voluntary GovDelivery alerts (government announcements), NPS Canaveral Playalinda launch policy, KSC Visitor Complex official viewing policy, City of Starbase Boca Chica beach/road order page, NASA Wallops launch schedule and visitor program, Alaska Aerospace Kodiak closures and news, PMRF Navy designated shoreline policy. These sites are used only for small attributed factual source observations with links, not republishing whole articles or images. No commercial API or paid scraping source is introduced.

Source limitations:
- Space Force news links are **articles**, not always future launch authorizations. Subscription signup is **not** an alert feed.
- NPS and KSC general pages give standing rules; the existing mission-linked KSC watcher remains the Florida event-level authority.
- Starbase City **current** published beach and road status can be read at scan time, while *Previous Orders* is archival; source parser cannot infer next launch closure from archive dates.
- NASA Wallops **public** schedule may exclude sounding or defense operations. A stale Visitor Center Next Launch card cannot authorize admission.
- Alaska Aerospace current "no active closures" is a website observation, not a launch-day road pass.
- PMRF can block automated requests; its general public-beach policy does not authorize a launch spectator venue or Coast Guard water access.
- Coast Guard localized safety activation requires current official broadcast/notices. No artificial active/clear zone.

## JSON v1 and security
Batch worker emits \`{version:1,checkedAt,sourceCount:10,availableSources,partial,regions:{...}}\`; each source is allowlisted by immutable ID, region, scope and exact HTTPS origin/path and has \`status:retrieved|limited|unavailable\`, \`fingerprint\`, independently labeled \`signals[]\`. Signed API requires a GitHub OIDC JWT with repo id, owner, workflow path, main branch, audience, fresh lifetime and RS256 verification, then validates every record before private Postgres write. Only 10 source entries and max 4 short signals/source; no raw HTML retained. No visitor can submit URLs for the Python job to fetch. No Supabase/Redis.

30-minute scheduled refresh best effort: last check is displayed; >90m makes state overdue and strips any "current-published-status" claim; >24h is stale. Entire snapshot state expires after 72h. A source fetch failure stays unavailable and cannot carry "beach open" from the previous scan. Detect changed normalized evidence using SHA256, but call it **page evidence changed**, not a closure.

## Baseline and release targets
Before: six-region national LL2 and specialist engines plus regional official links, but no side-by-side independently refreshed official-source observation for every region. After: one national desk with source-by-source partials, last scan and official links, safe status/archive distinction and mission-specific context but no unverified automatic mission-to-notice join. Current baseline: 0 of 6 regions shown through this batch product; target six. Event-specific source claims are shown only when clearly published and attributable. Python source availability will be measured after real first prod scan; no 100% availability claim.

Gates: Python unit tests for all six regions, false current-from-historical, source redirect bounds and source failures; Node tests for untrusted URLs, signed authorization, false GO, freshness and source history; existing full repo test suite; protected Vercel preview READY; production POST success, API GET evidence and national desktop/mobile visitors. Rollback via reverting the API/UI/workflow; existing LL2 and all specialized engines are unaffected.

GSC measurement: annotate release date, compare 28-day matched demand windows for national/coastal launch pages, segment returning direct clicks vs impressions before attributing any CTR effect. No fabricated search lift.
