# North Shore: three independent engines — value/loss governance
Research and initial implementation: 2026-10-12. This is a design and test plan, **not** measured user conversion or traffic growth.

## Product boundaries
1. **Grand Portage → Isle Royale Ferry Planner** belongs in \`izworskic/isle-royale-outdoors\`, canonical proposed \`/isle-royale-ferry/\`. Its separate source repository includes an independently versioned timetable engine and benchmarks. Do not implement another ferry calculator in this monolith.
2. **Split Rock River Loop Bridge & Alternate** belongs to \`/split-rock-river-loop/\`. Route choice and bridge-truth only. No extrapolated fording safety and no broad hiking-condition forecast.
3. **Split Rock Lighthouse Admission & Fitzgerald Memorial** belongs to \`/split-rock-lighthouse-visit/\`. Historic-site/state-park separation, interior access, ticket type, memorial rules. No unrelated weather / driving score.

No generic North Shore page is necessary to own these intents. Preserve Isle Royale map, existing lighthouse lists and their canonical ownership; do not cannibalize those queries.

## Value functions per engine
Scores are development priorities (weights normalized to 100), never fabricated measured user satisfaction.

### A. Ferry: V_ferry
\`V = 25 correct sailing-calendar pairing + 20 trip/dock feasibility + 15 permit/entrance distinctions + 15 total cost clarity + 10 Central/Eastern clock clarity + 10 honest booking/source freshness + 5 mobile comprehension\`.

**Hard veto / effectively infinite loss:** showing a past 2026 sailing as 2027 available; claiming live seats without an inventory feed; permitting a Rock Harbor same-day Grand Portage itinerary; silently switching a boat's time zone; declaring a campground permit reserved for a small party; omitting group camping obligations for 7+.

**Soft losses:** $1/round-trip fare error (25 points per occurrence); omission of one-day park-fee rule (20); failure to explain return booking (10); user must read 3+ competing operator pages for a basic decision (15). Each distinct failure is tracked separately.

**Component-level goals:** Input validity 15; calendar pairing 25; boat/dock graph 20; fees 15; permit gates 10; date/version display 10; source-link CTA 5. Benchmark cases: future-unpublished, 2026 matched day trip, unmatched weekday, valid overnight pair, no Rock Harbor day trip, reversed/invalid date, one-hour zone difference, park fee includes both days, no seats claim. Production needs operator-approved next-year dates, not extrapolation.

### B. River: V_river
\`V = 30 accurate bridge/segment status + 25 correctly sourced alternative routing + 15 trip-goal fit + 10 parking/access specificity + 10 version/provenance + 10 mobile legibility\`.

**Hard veto:** classifying the open east/west sections as a completed bridged loop; claiming crossing safe without on-site evidence; turning the Highway 61 underpass description into an unverified, precise navigable GPS route; claiming a past bulletin is fresh.

**Soft losses:** missing named wayside trailhead (10), omission of no-overnight parking (10), vague detour answer forcing user to search again (20), inaccessible form (15), off-topic general weather verdict (15).

**Component goals:** Status 30; route selection 25; local directions 15; parking 10; source freshness 10; mobile behavior 10. Benchmark cases: ford request, clockwise/counterclockwise out-and-back, loop, thru, short time, future stale-date. Official source: SHTA trail conditions (updated 2026-10-05) and section details.

### C. Lighthouse: V_lighthouse
\`V = 25 right operator/pass + 25 correct experience entitlement + 15 memorial specificity + 15 2026 price/availability truth + 10 parking qualification + 10 accessible comprehension\`.

**Hard veto:** a park vehicle sticker described as admission to historic buildings; grounds pass described as interior ticket; normal admission described as November 10 event access; event ticket represented as guaranteed parking/seating; inventing 2027 schedule or a real-time ticket inventory.

**Soft losses:** wrong adult/senior/child arithmetic (15), failure to disclose off-season/ongoing construction uncertainty (10), missing authoritative ticket CTA (10), >60 character SERP title (5), mobile input overflow (10).

**Component goals:** Experience 25; date rules 15; entitlement 20; pricing 15; memorial 15; source audit 5; responsive input 5. Benchmark cases: indoor, grounds, park-only, 2026 event, wrong event date, later year, after Oct 19, age totals.

## Stage gates and weighted loss functions

| Phase | Value gained | Dominant loss to minimize | Hard stop |
|---|---|---|---|
| Problem definition | Specific, query-ready decision | Thin duplicate intent / generic location answer | Cannot state unique user decision |
| Evidence | Primary source with dated rule | Stale, contradictory or source-less condition | No credible rule or version |
| Data model | Machine-checkable exceptions | Month/day / zone / status collisions | Dates and rules disagree |
| Decision core | Correct branch-by-branch verdict | False certainty or wrong permissions | Any high-consequence red test |
| Interface | Outcome within 2 useful actions | Buried verdict or mobile clipping | Keyboard/360px failure |
| SEO | Exact canonical intent | Cannibalization or unverifiable claims | Missing Person identity/canonical |
| Build | No regression to existing tools | Failed inherited CI gate | Any required workflow red |
| Deployment | Preview and production parity | Preview-only assumptions / red deploy | Production not verified |
| Growth | More qualified clicks per impression | Impressions with zero utility or false CTR uplift claims | Missing dated comparable GSC sample |

### Quantitative acceptance policy
All hard vetoes must be **zero**. Structural tests and page gates **100%**; at least 3 distinct personas for each engine and at least 2 known-failure controls, with no unresolved unsafe output. Human smoke test widths 360, 390, 768 and 1280 px, keyboard/tab sequence, assistive status announcements, large tap targets. Measured 28-day clicks/impressions/CTR after indexing; don't claim future ranking or revenue. Use source timestamps, page versions and HTML-only fallbacks. Benchmark scripts reflect implementation correctness, **not** evidence of real visitor satisfaction.

### Operations
- A 2026 timetable is archival after its final date; future seasons must fail closed until operator publishes future-year schedule.
- SHTA notice used here: October 5, 2026. Manual editorial refresh required; stale date prompts source recheck. No automation is assumed.
- MNHS regular 2026 hours and pricing are date-bounded; special events and unconfirmed years have unknown pricing.
- Main site runs \`npm run verify:all\` and companion \`npm run benchmark:north-shore\`. Isle Royale owner runs \`npm test\` and its ferry benchmark.
- New pages should be linked and indexed only after full gating and production composition, not advertised as live while still on PR branches.

## Source audit
- GPIR official 2026 schedules https://www.isleroyaleboats.com/schedules.html ; 2026 rates https://isleroyaleboats.com/rates.html
- NPS fees https://www.nps.gov/isro/planyourvisit/fees.htm ; permits https://www.nps.gov/isro/planyourvisit/permits.htm
- SHTA https://superiorhiking.org/trail-conditions/ ; section map https://superiorhiking.org/trail-section/two-harbors-to-silver-bay/
- MNHS hours https://www.mnhs.org/splitrock ; memorial https://www.mnhs.org/events/53149640550 ; parking https://www.mnhs.org/splitrock/visit
