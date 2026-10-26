# Mackinac Bridge toll SERP/CTR release — October 26, 2026

## Decision and owned route
Canonical owner: https://chrisizworski.com/mackinac-bridge-tolls/ in `izworskic/chrisizworski-com`.
Mackinac Bridge Live retains bridge-open/wind intent; the existing toll URL alone owns rate/calculator questions. Do not create a similar new URL. Do not combine the two canonicals, modify AdSense, or alter the fare formulas.

## Source-of-truth measurement before this change
Connected Google Search Console Web data via Windsor.ai, property `sc-domain:chrisizworski.com`, September 27–October 24, 2026, inclusive (28 days):
- Page: **5,683 impressions / 12 clicks / 0.211% CTR**, mean position **8.3391**.
- `mackinac bridge toll`: **544 impressions / 0 clicks**, mean position **9.9062**.
- `how much does it cost to cross the mackinac bridge`: **245 / 0**, mean position **8.0367**.
- `how much is it to cross the mackinac bridge`: **106 / 0**, mean position **7.5849**.
- `mackinac bridge toll cost`: **103 / 0**, mean position **8.835**.
- `mackinac bridge toll both ways`: **20 / 0**, mean position **7.45**.
- Other disclosure-limited page × query and page × device pulls returned fewer impressions than complete page totals. Never treat their omission as a different page-level baseline.

**Diagnosis:** The H1 and first answer already expose $4/one-way, $8/round-trip. The Google-result title previously buried the price behind a generic calculator label. The search audience is overwhelmingly asking **what the crossing costs**, and the vehicle-specific axle calculator is the non-zero-click utility. Improving visible relevance may improve click propensity; it cannot override position, official-domain preference, instant answers or Google rewrite behavior.

## Verified fare evidence
- Mackinac Bridge Authority official schedule: https://www.mackinacbridge.org/fares-traffic/fare-schedule/ — two-axle passenger car **$4**, passenger classification **$2/axle**, others **$5/axle**, lead-vehicle towing treatment and authority final classification; 2.3% credit/debit card fee.
- MacPass official FAQ: https://www.mackinacbridge.org/macpass/macpass-frequently-asked-questions/ — qualifying **passenger vehicle without trailer**, **same tag and same vehicle** for both directions **within 36 hours**: initial crossing $4, discounted return $0.

## Single-variable search presentation treatment
- New exact title (58 chars): **Mackinac Bridge Toll: $4 Car | Calculator | Chris Izworski**
- New exact meta description (149 chars): **Mackinac Bridge toll 2026: $4 car one-way, $8 round trip. Calculate RV and trailer tolls by axle; see the 2.3% card fee and MacPass 36-hour discount.**
- Align existing Open Graph/Twitter title/description and existing WebPage JSON-LD name/description with the title and snippet.
- Existing H1, first answer, vehicle-class calculator, JS/axle/math logic, MacPass eligibility explanation, FAQ question answers, photo, independent-author byline/Person graph, CTA links, canonical, robots, fee disclosures and bridge-live sibling remain unchanged.
- Record genuine same-day page review in `dateModified` and this canonical sitemap entry's `lastmod` as 2026-10-26. Existing https://picturedrocks.chrisizworski.com/mackinac-bridge-tolls/ mirror was independently observed serving duplicate content **with a declared canonical pointing to the preferred chrisizworski.com route**. Do not assert Google has selected that canonical without URL Inspection; don't change that external host/DNS in this content-only release.
- Update the previously pinned benchmark and tests instead of leaving an out-of-date exact-title contract.
- Scope the toll-only production smoke to the existing toll URL, with clean and cache-busted production HTTP checks after Vercel promotion. Not a site-wide per-merge audit.

## Release/stop-loss and measurement
1. Require full `npm run verify:all` and emitted production HTML/public audit to pass on the exact PR head, plus creator name/identity and Vercel preview gates. If any red or source drift, do not merge.
2. After merge, require GitHub `main` and production status and the toll-specific production smoke to confirm live correct description/title with no source route or fare regressions.
3. Preserve the first finalized 7-day and 28-day **Search Console Web** `page`, `page × query` totals after October 26. Compare exact head term, cost question family, and RV/trailer intent; account for changes in average position, impressions, device distribution and seasonal bridge trip demand. Targets (e.g., 1% CTR) are hypothesis benchmarks, not guaranteed outcome.
4. If CTR remains flat, do not spray city keyword pages, bulk retitle bridge siblings, manipulate AdSense or blindly revert. First inspect actual served Google snippets and whether the mirror is being clustered correctly in Google URL Inspection.

Next single worthwhile action: evaluate the first complete settled post-deployment seven-day window with actual query breakdown, then decide whether a separate toll-calculator UX test is justified.
