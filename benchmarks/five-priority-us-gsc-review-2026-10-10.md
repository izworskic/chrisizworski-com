# Five-priority U.S. Search Console review — October 10, 2026

Source: connected Search Console via Windsor.ai, property `sc-domain:chrisizworski.com`, country United States, September 10–October 7, 2026. This is a retrospective analysis, not a predicted CTR uplift.

| Priority | Canonical path | U.S. impressions | Clicks | CTR | Avg position | Dominant query |
|---|---|---:|---:|---:|---:|---|
| 1 | /great-lakes-freighter-tracking/ | 4,967 | 58 | 1.17% | 7.41 | great lakes ship tracker (1,107 impressions, 7 clicks) |
| 2 | /mackinac-bridge-tolls/ | 3,067 | 6 | 0.20% | 8.86 | mackinac bridge toll (721 impressions, 1 click) |
| 3 | /northern-lights-michigan/ | 2,717 | 17 | 0.63% | 9.14 | northern lights michigan tonight (323 impressions, 3 clicks) |
| 4 | /mackinac-bridge-live/ | 2,006 | 2 | 0.10% | 9.41 | mackinac bridge conditions today live (415 impressions, 1 click) |
| 5 | /fall-color/ | 3,680 | 93 | 2.53% | 9.53 | michigan fall color map 2026 (900 impressions, 15 clicks) |

## Query ownership decisions

- **Freighters:** Protect lake-wide AIS map and canonical. NOAA conditions rejected-promise retry fix merged via PR #892; production deployment for commit `276849c` was still BUILDING at last verified check. Live AIS/map behavior not independently verified.
- **Tolls:** Existing title, description, H1 and lead already explicitly give the 2026 passenger-car price and payment options. Protect; inspect real SERP snippet and official competitors before changes.
- **Aurora:** Existing title/H1 and description already focus on Michigan tonight and NOAA/cloud/moon context. Protect; validate live tonight verdict and stale/unavailable behavior before changing metadata.
- **Bridge Live:** Existing title and description own open/closed, conditions, cameras and restrictions. Do not merge or canonicalize into the toll page. Validate official status freshness and camera failures.
- **Fall color:** Existing title/description own the Michigan 2026 live map. Protect ranking winner and compare live regional signal freshness; do not replace site-specific color icons with one statewide verdict.

## Release and measurement guardrails

No content or metadata changes in this review: low CTR alone does not prove an SEO defect. No verified revenue uplift, AdSense RPM, live browser map interaction, or production AIS readback. Recheck identical U.S. GSC date windows after any verified product repair. Preserve Chris Izworski Person graph, canonical ownership and Auto ads.

**Next single action:** Confirm production deployment `dpl_FkHensQgCR7rpEyx2MRXXzGydMvG` READY and verify live AIS, mobile controls, and NOAA retry in an interactive browser; if still building or failed, diagnose the deployment before another production change.
