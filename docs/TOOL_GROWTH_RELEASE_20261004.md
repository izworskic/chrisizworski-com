# Tool growth release — 2026-10-04

This release improves discovery, evidence presentation and measurement before expanding ad placement. Changes are proposals until the owner merges the PRs and production is verified.

## Growth hypothesis and shipped scope

| Surface | Problem | Change | Measure after release |
| --- | --- | --- | --- |
| Michigan directory | Search sits behind multiple large sections; generated discovery and structured counts diverge | Put the finder near the top; hide introductions while filtering; retain all source cards; restore boat-launch discovery; include Mackinac Island and existing build-time additions; derive ordered schema from final cards | Tool opens per directory session, segmented by mobile/desktop and placement |
| National directory | Ready tools have no directory entry; search follows intent buttons and seasonal copy | Add CBBT, Niagara border, Old Sow and Oregon Coast with four destination links; search first; 51 cards and matching schema | Tool opens per session, new destination referral sessions, organic impressions on linked canonical pages |
| White Christmas forecast | Christmas snowfall query intent risks implying a specific distant weather forecast | Question-based title with creator attribution; opening answer distinguishes snowfall from snow on the ground; retain the local estimator | Search Console query/page CTR, position, clicks to the local estimator |
| Moonbow | Dark-moon lunar factor becomes NaN; public percentage is uncalibrated | Clamp before square root; show opportunity /100 and separate confidence; preserve API compatibility; creator and methodology links | Engine error/NaN incidence, tool use, repeat visits and feedback |
| Measurement | Directory choices are not consistently available in GA4 | Add tool_open and tool_filter with stable tool IDs/placement; preserve existing Vercel events; do not transmit typed searches or locations | Production-host event coverage and referral funnels |
| Monetization | Moonbow has an account meta tag without the shared loader | Root-layout shared integration plus ads.txt; add its verified canonical host to the policy | Actual AdSense impressions/pageviews and revenue/session, alongside engagement |

## Evidence and interpretation

The prior portfolio audit found White Christmas forecast had 2,159 impressions and one click at average position 8.98. It is an intent/snippet opportunity, not evidence that a particular title guarantees improvement. Retain its canonical URL and differentiate the calculator from the forecast explanation.

Fall Color and Soo Locks have demonstrated organic demand and ad delivery. This release preserves their titles, calculation logic and primary layouts. It changes the directories and selected weaker surfaces instead.

Authorship and source explanations describe actual ownership and evidence. No expert reviews, firsthand destination visits or calibrated probabilities are invented. The Moonbow public score remains an index; confidence and source freshness remain distinct.

## Release and observation

1. Merge reviewed owner changes and the main-site directory mirror. Merge the main-site shared ads host policy before Moonbow depends on it.
2. Confirm the deployed commit for each production project. Inspect /tools/, /national-tools/, White Christmas /forecast/ and Moonbow. Verify primary canonical URLs, schema/card parity, GA4 and shared loader coverage.
3. Perform desktop and mobile visual checks. Protected Vercel previews and local browser access blocked visual verification in this environment; successful build/DOM checks do not substitute for it.
4. Record production release dates in analytics. Compare the next 14 and 28 days with a comparable prior window, segmented by query, page, device, country and production host. Exclude preview and identified builder traffic. Fall and winter seasonality prevents a clean causal claim from a before/after comparison alone.
5. Assess organic CTR at comparable ranking positions alongside clicks, impressions and estimator/tool use. Avoid changing the same snippet again before there is meaningful evidence unless it is inaccurate.
6. Evaluate monetization using actual served impressions and revenue per session, with engagement and layout shifts as guardrails. Never optimize accidental ad clicks.

## Remaining operational work

- Auto ad exclusions for directory search and decision controls are account settings. data-no-ads only protects the shared manual placement layer; it does not configure Google's Auto ads. The audit observed large Auto ads above directory content. This release does not claim those areas are excluded.
- Au Sable and Whitetail loader coverage remains unresolved. The registered Whitetail repository was inaccessible through both Git clone and the connected repository API; Au Sable has no discoverable active source owner in the creator contract. Do not alter unrelated deployments to compensate.
- AdSense site approval and serving on standalone Vercel hosts must be checked in the account. A loaded script or account tag does not prove ad delivery.
- National tools retain their specialist owners and engines. The main site synchronizes only its directory HTML/JS mirror; no canonical migration or new White Christmas sitemap route is proposed.

Google guidance used for this release: https://developers.google.com/search/docs/fundamentals/creating-helpful-content and https://support.google.com/adsense/answer/12626543.
