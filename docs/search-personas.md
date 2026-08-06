# Search personas for chrisizworski.com

Created 2026-08-06. These are arrival personas, not marketing personas. Each one is defined by
how the person reaches the site from a search result, what the SERP snippet has to do to earn
the click, and what fails. They exist to make title and description decisions non-arbitrary.

Evidence base: GSC page rows (2026-02-12 to 2026-08-01), device split from the same export,
and Google autocomplete pulled 2026-08-04 as a demand proxy. Autocomplete is not GSC data.

---

## 1. The Tonight Checker
**Cluster:** `/northern-lights-michigan/` (45.7% of measured impressions)
**Query shape:** "northern lights michigan tonight", "tonight time", "tonight tracker live"
**Device and moment:** mobile, evening, low patience, standing outside or about to drive
**Measured:** 18,461 impressions, 1.85% CTR at position 10.36
**Read:** this persona already converts ABOVE the modeled curve for its position. The snippet
is working. Do not touch it.
**Lever:** impressions, not CTR. More of the query surface, not a better title.
**Anti-pattern:** rewriting a title that is already outperforming. Any CTR "optimization" here
is as likely to cost clicks as gain them.

## 2. The Boat Watcher
**Cluster:** `/soo-locks/`, `/great-lakes-freighter-tracking/`, `/mackinac-bridge-live/`
**Query shape:** "soo locks ships today", "ship schedule today", "live cam", "is the bridge open"
**Device and moment:** mixed, daytime, often planning a visit that day or the next
**Measured:** Soo Locks 11,919 impressions, 1.26% CTR at position 9.41. Modeled expectation at
that position with low zero-click risk is 2.30%.
**Read:** the largest recoverable click pool on the site, roughly 123 clicks across the window.
But the page passes every snippet gate already, so the snippet is not the cause.
**Lever:** intent split. This one URL competes for visitor intent (tours, tickets, hours) and
ship intent (schedule, traffic, cam) at the same time. It probably wins impressions on one and
clicks on neither.
**Blocked on:** GSC query rows. Do not guess at this one. See the plan, Phase 1.

## 3. The Weekend Planner
**Cluster:** the 16 `/fall-color/` pages plus `/fall-color-northern-lights-michigan/`
**Query shape:** "michigan fall color map 2026", "peak fall color michigan", "where to see fall color"
**Device and moment:** mixed, Thursday through Saturday, planning a drive 1 to 7 days out
**Measured:** no GSC history. Migrated to the hub 2026-08-04.
**Read:** the largest untapped opportunity of 2026 and the reason this plan exists. Internal
linking is already strong (up to 19 inbound). The snippet surface is not.
**Lever:** snippet hygiene, urgently, before the season. 12 of 16 titles truncate. Most
descriptions run 170 to 231 characters and lose their second half in the SERP.
**Anti-pattern:** adding features to these pages instead of fixing how they appear in results.

## 4. The Local Grower
**Cluster:** `/when-to-plant-tomatoes-michigan/`, `/michigan-frost-dates/`
**Query shape:** "when to plant tomatoes michigan", "michigan last frost date"
**Device and moment:** desktop, spring, single fact wanted
**Measured:** 5,479 impressions at 0.26%, and 2,651 at 0.11%
**Read:** these look like the biggest CTR failures on the site and were treated that way. That
read is wrong. Both queries are answered inline by the SERP itself, so the click never happens
regardless of the snippet. Both pages already pass every gate: 56 and 57 character titles,
front-loaded, 2026 dates present, descriptions inside 158. They were optimized in the Aug 3 pass
and CTR did not recover.
**Lever:** none available through the snippet. Modeled recoverable clicks after a zero-click
discount are roughly 26 across a 171 day window, about 5 per month combined.
**Decision:** stop working on this persona. Revisit only if the pages are rebuilt to answer a
decision ("can I plant this weekend at my location") rather than a fact.

## 5. The Field User
**Cluster:** trout, morel, whitetail, ice, birding, Saginaw Bay, xcski
**Query shape:** "michigan morel report", "saginaw bay fishing report", region plus conditions
**Device and moment:** mobile, seasonal, high intent, small audience
**Measured:** small. Birding subdomain carries the best CTR on the network at 4.5%, position 7.32,
on 111 impressions.
**Read:** high quality, low volume. Worth protecting, not worth optimizing for scale.
**Lever:** seasonal timing. Each of these has exactly one window a year where work pays.
**Anti-pattern:** building features for this persona in a month that is not its season.

---

## Excluded on purpose: The Name Searcher
Queries for "Chris Izworski". Eight of nine SERP slots already belong to the site and no rival
entity exists. This work is finished and returns no revenue. It is excluded from CTR scoring in
`benchmarks/ctr-surface-baseline.json` so that identity pages cannot dilute the score.
