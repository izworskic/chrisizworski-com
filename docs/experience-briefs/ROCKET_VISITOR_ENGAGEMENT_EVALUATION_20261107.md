# Rocket Launch Live visitor-funnel evaluation | November 7, 2026

**Owner:** `izworskic/chrisizworski-com`  
**Canonical:** https://chrisizworski.com/national-tools/rocket-launch-live/  
**Context:** Flight Desk Experience OS v1.2.1 merged PR #1553, production SHA `6d1d94c4663e5de4b80f89f3e867f83f8fa70ca4` on November 7, 2026. This change introduces **measurement only**, not a new design, live forecast or canonical.

## The question and what can be concluded today

Do visitors notice the mission-first Flight Desk, deliberately choose rockets, locate the launch pad, and follow through to legitimate public viewing advice?

**Insufficient behavioral sample.** The November 5 GSC Web export for October 7–November 3, 2026 includes the national rocket page with **29 impressions, 0 clicks, 0% CTR, average position 20.41**. This is the historical discovery baseline and includes dates before the Flight Desk redesign. No query-specific rocket searches appear in the exported top 1,000 Queries rows. Query omission is a reporting limitation, not proof of no searches.

Source workbook: https://docs.google.com/spreadsheets/d/1NTZ8TmB_FAGDBPHTtmaSTSMl9Pss4ssXPiTnlainO_Y/edit?usp=drivesdk (Filters: Search type Web, last 28 days).

The Vercel Web Analytics connector reports **0 tracked pageviews** for `/national-tools/rocket-launch-live` for October 11–November 7 inclusive, while the project recorded **8,441 total pageviews** in that window. Live inspection found the canonical page lacked the `/_vercel/insights/script.js` loader, although Google Analytics was present. Thus the route's Vercel zero is a **tracking coverage gap**, not reliable proof no person opened the page. The fix below restores the exact first-party Vercel Analytics script already used elsewhere on the site. It adds no new analytics provider.

**Do not claim the November 7 redesign improved impressions, CTR, map use, guide opens, launch planning or visitor conversion.** Previous calls to action were not consistently measured. A controlled before/after behavioral treatment comparison is impossible using that baseline.

## Source of truth / consent and privacy constraints

- Existing GA4 tag (`G-Y5D2V2W7HN`) and existing Vercel Analytics client only. No new provider, client ID, cookie, local/session storage, fingerprint, paid data service, server endpoint, Redis, Supabase or ad modification.
- Tracking is additive: no navigation interception, client delay, screen recording or geolocation request. If analytics is blocked, all mission and map interactions continue normally.
- Do **not** put mission UUIDs, mission names, launch-pad GPS, user GPS, search text, raw hrefs, full URLs or query parameters in event metadata. Only allowlisted region, UI surface, status, schedule precision and action/outcome enums are emitted.
- Initial page load and default mission selection do **not** count as visitor mission choices. A selection counts only after a validated explicit user action AND the shared national API subsequently confirms the selected mission.
- A map-focus request is an interaction, **not** proof that the basemap tiles rendered, the user saw the pad or the public was admitted.
- The official viewing-source click is a navigation intention, **not** proof that the visitor traveled, bought a ticket, entered a range or observed a launch.

## Funnel schema (Vercel event name / GA4 event name)

| Visitor action or signal | Vercel event | GA4 event | Valid data |
| --- | --- | --- | --- |
| Flight Desk was visible (15% intersection) and current API selection loaded, at most once/page | `Rocket Flight Desk Exposed` | `rocket_flight_desk_exposed` | region, status, precision |
| Human-selected rocket confirmed after the same API response, not a default | `Rocket Mission Selected` | `rocket_mission_selected` | region, surface: flight_desk/native_picker/map_marker/national_board, precision |
| Visitor explicitly switched launch coast | `Rocket Coast Selected` | `rocket_coast_selected` | region, surface: coast_picker/region_map/national_board |
| Visitor asked to focus the selected rocket or selected a mission from map | `Rocket Map Engaged` | `rocket_map_engaged` | region, surface, outcome: pad_marker_focused/coast_fallback/mission_request/locate_request |
| Visitor activated a real guide, official access/source link or on-page viewing guidance | `Rocket Viewing Next Step` | `rocket_viewing_next_step` | region, surface, destination: regional_guide/official_access/viewing_options |
| The national shared API failed, at most once/page | `Rocket Schedule Unavailable` | `rocket_schedule_unavailable` | no mission-specific data |

These are **event definitions**, not results. Vercel reporting gives total events and unique tracked visitors by name and properties; it does not establish that one visitor performed an ordered multi-step funnel unless a separate approved session-level report can join that visitor's events. Avoid reporting a sequential conversion rate using unjoined event totals.

## Evaluation after launch and predeclared decision rules

**Instrumentation start:** the exact production deployment of this measurement PR after Vercel READY and canonical public verification, NOT November 5 or the Flight Desk PR merge.

1. **Coverage gate (first):** Vercel Analytics records a non-test pageview for the canonical route and eligible action events; GA4 event configuration is present. A synthetic Playwright click validates wiring but **must not be counted as an actual visitor**. If one analytics provider blocks user events, disclose coverage as partial.
2. **Reach / activation:** ratio of unique visitors triggering `Rocket Flight Desk Exposed` to Vercel route visitors; rate of `Rocket Mission Selected`, `Rocket Map Engaged` and `Rocket Viewing Next Step` unique visitors relative to exposed unique visitors. Different privacy/ad-blocker coverage may cause denominator mismatches, which must be reported rather than hidden.
3. **Decision relevance:** break down engagement by six regions and by input surface. Avoid comparing raw counts without denominators or selecting only high-performing coasts.
4. **Source usefulness:** compare explicit verified selection vs. source outage; quantify what fraction of exposed visitors click official guidance or a regional guide, but do not call this a verified completed trip.
5. **Search discovery:** compare the same Google Search Console Web property/canonical over non-overlapping 28-day windows using real exports, with date latency and seasonal/launch-news confounds disclosed.

**Interpretation thresholds, not statistical guarantees:** with fewer than 30 independently counted exposed visitors, do not infer visitor preference. At 30–99, inspect qualitative paths and technical blockers only. At 100+ exposed visitors and stable event coverage, report directional segment rates with denominators and uncertainty. A redesign-improvement claim needs pre-intervention comparable instrumentation or a well-designed controlled test; this retrospective release has neither.

**Prioritized next decision rule:**
- If almost no tracked visitors reach this canonical route despite working pageviews and low GSC rank, invest in *discoverability and internal navigation*, not another interactive widget.
- If exposure is healthy but mission selection is rare, examine the first-screen mission picker and time-precision language.
- If mission selection is used but map engagement is rare, diagnose icon clarity/marker focus before styling changes.
- If map/mission engagement occurs but guide/source handoffs are rare, investigate missing legal viewing answers and link hierarchy.
- If source unavailable events dominate, prioritize schedule and map data reliability.

## Tests, independence and release ledger

- Source privacy tests allowlist every transmitted enum and disallow UUIDs, raw mission names/URLs and coordinates; A→B→A and source failure must not emit ghost conversions.
- Browser QA at 360/390/768/1440 asserts actual Vercel queue/GA calls, confirmed mission-selection events, working map focus, working regional-guide handoff and no duplicate exposure; still tests no-JS, missing photo, source outage and no tiles.
- Existing launch, SEO, map, Person/canonical, ads and regional-access gates must stay green.
- Implementation, exact-head CI, Vercel preview, production deploy and independent public HTML checks are separate stages.
- **Measured post-release uplift:** NOT MEASURED as of this report; traffic too small and this is a telemetry repair, not an A/B experiment.

Exactly one next investment once non-test coverage is established: use the first meaningful sample of unique visitor event rates and same-window GSC data to decide whether to improve **discovery** or the **Pad → Shore → Sky handoff**, instead of speculatively expanding the rocket UI.
