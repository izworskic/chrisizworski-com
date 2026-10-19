# /snowmobile/what-you-need/: Michigan snowmobile permit, registration and rules

Added October 19, 2026 as a supporting page to `/snowmobile/`, not a new tool. It answers the "what do I need to ride" questions the planner's visitors ask before they buy a permit.

## Why this page exists (measured before building)

`benchmarks/snowmobile-rules-demand-2026-10-19.json` holds the pull. It is a **proxy**: Google autocomplete for eight "michigan snowmobile ..." phrasings, each expanded a to z, 576 unique queries. It is not Search Console data and has no volumes.

| Bucket | Queries | Covered before |
|---|---|---|
| Town and region trails | 177 | yes, region pages |
| Conditions, open or closed, report | 107 | yes, planner |
| Rules: permit, registration, title, safety, age, helmet | 75 | **no** |
| Map and app | 64 | yes |
| Rentals, tours, lodging | 45 | no, not pursued |
| Dealers, shows, races, dog sleds, accidents | 80 | no, not pursued |
| Season timing | 14 | partly |

The rules cluster was 13% of the pull and the snowmobile pages contained none of its words. A SERP check for the trail-permit cost query returned the DNR release, local TV, radio and trade press, so the page targets the tail phrasings and the combined "what do I need" decision, not the head term the DNR owns.

Not built, on purpose: rentals, dealers, shows, town pages (doorway pattern).

## Where the facts come from

All figures live in `lib/snowmobile/rules.mjs` with the DNR URL they were read from and `CHECKED_ON`. The page (`scripts/generate-snowmobile-need-page.mjs`), the checker (`public/assets/snowmobile-need.js`) and the tests all read that file. Checked October 19, 2026 against:

- DNR permits and requirements, fee announcement (May 11, 2026), age restrictions, safety certificate, Free Snowmobiling Weekend, rules, and the Snowmobile Handbook PDF.

Not stated by those sources, so not on the page: insurance, the Secretary of State registration fee, lug height, and the 2027 Free Snowmobiling Weekend dates.

## Updating it

1. Re-read the DNR pages above (the fee is fixed for five years from the May 2026 change, but check each September).
2. Edit `lib/snowmobile/rules.mjs` (facts, `CHECKED_ON`, `CHECKED_ON_LONG`).
3. If wording in the checker changes, edit `public/assets/snowmobile-need.js`.
4. `node scripts/generate-snowmobile-need-page.mjs`, then `node scripts/stamp-freshness.mjs`, then `node --test tests/snowmobile-need.test.js`.

Add the Free Snowmobiling Weekend dates once the DNR publishes them. Do not state a date from news coverage alone.

## Privacy

The checker runs in the browser. Choices are kept in the URL hash so a result can be shared, and nothing is stored or sent. A test fails if the script ever calls fetch, gtag, storage or geolocation.

## Measure after release

Use comparable complete 28-day Search Console windows for this URL: impressions, position, CTR and clicks on permit, registration and rules queries, and clicks from here to `/snowmobile/`. No ranking or revenue effect is established by shipping it.
