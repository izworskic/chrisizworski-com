# Great Lakes freighter tracker: U.S. search opportunity audit — 2026-10-10

Source: connected Search Console through Windsor.ai; property `sc-domain:chrisizworski.com`; United States; 2026-09-10 through 2026-10-07 inclusive. Search data is retrospective, not a ranking prediction.

## Page baseline

- Canonical: https://chrisizworski.com/great-lakes-freighter-tracking/
- 4,967 U.S. impressions; 58 clicks; 1.17% CTR; average position 7.41.
- The page already has an accurate ship-tracker title, visible answer-first content, corridor selector, live AIS map, no-account claim, source limitations, and Person JSON-LD.
- Do not rewrite title or replace live tracking with generic article content without better evidence.

## Top U.S. queries (page + query dimensions)

| Query | Impressions | Clicks | Average position |
| --- | ---: | ---: | ---: |
| great lakes ship tracker | 1,107 | 7 | 6.95 |
| great lakes freighter tracker | 508 | 2 | 7.38 |
| ship tracker great lakes | 263 | 4 | 6.22 |
| great lakes ship tracker live map | 209 | 8 | 8.38 |
| freighter tracker great lakes | 178 | 6 | 6.04 |
| marine traffic great lakes | 163 | 0 | 8.33 |
| great lakes shipping tracker | 160 | 3 | 7.54 |

## Decision

PROTECT current canonical, title, map and shipping data contract. Query intent is predominantly **live ship tracking**, already owned by this page; avoid adding thin variants or cannibalizing it with new URLs. Before modifying the product, reproduce the production AIS feed and map interaction in a browser and inspect Google snippets/competitor result presentation. Do not infer a code defect solely from low CTR.

Other U.S. 28-day opportunities: Mackinac Bridge Tolls 3,067/6; Northern Lights Michigan 2,717/17; Mackinac Bridge Live 2,006/2; Michigan Fall Color 3,680/93. These are impressions/clicks, not projections.

Revenue, page RPM, and live end-to-end AIS readback: not verified in this audit. No SEO or revenue lift claimed.

**Next single mission:** test production vessel loading and map controls on mobile and desktop; repair only reproducible failures in the owning implementation and run the full `npm run verify:all` gate before merge.
