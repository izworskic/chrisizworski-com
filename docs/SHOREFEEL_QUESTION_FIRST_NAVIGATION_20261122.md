# ShoreFeel question-first navigation investment | November 22, 2026

**Owner:** izworskic/chrisizworski-com · **Mode:** IMPLEMENT · **Affected routes:** /great-lakes-beaches/, /great-lakes-beaches/around-the-lakes/, /great-lakes-beaches/canada/

## The visitor job, before a design

A reader arrives to answer one of three questions: **Which beach should I choose? What will it feel like there? Can I use the water?** They may know the name of a beach or only the town. They need an actionable match and a nearby forecast, followed by an official safety source. A model number is not an on-sand thermometer; a weather forecast cannot establish water safety.

**Observed source-level friction:** The Michigan hub presents summer rankings and 50 static links before the working 50-beach explorer. The U.S. and Canadian explorers require choosing a lake, start on Superior, and have no beach/town search. The regional answer panel has no clearly labeled link to the selected canonical individual beach report. This diagnosis is from repository source inspection, not a user-study finding.

## Skills applied and concrete jobs

| Existing repository skill | Concrete contribution |
|---|---|
| Experience Investment | Define task and first-answer priority; compare distinct design directions; smallest capable code |
| Experience OS v1.2.1 + scorecard | Preserve accurate source/status boundaries, unique visitor value, accessible responsive behavior |
| Experience Foundry 0.3 | Compare baseline and implemented tasks; replay search → selected answer → alternate → return and source-unavailable |
| Design Reconnaissance | Avoid replicating a generic row of identical cards or a map-first template unrelated to the task |
| Web Quality Audit + Accessibility | Native details, links with real hrefs, keyboard focus, source-visible no-JS paths, mobile legibility |
| Playwright Browser QA | Browser fixture tests at 360, 390, 768, 1280, 1440px, search, no-match, recovery, lake switching, deep links and tile failure |

## Opportunity review

1. **Make the answer finder the first destination.** Reuse Michigan's existing weather/data explorer instead of building a second engine. High visitor impact, no new API.
2. **Find a shoreline by town or name, regardless of selected lake.** Filter the vetted U.S. (16) and Ontario (30) catalogs on the client, keeping real links and sources. No geocoder or paid search.
3. **Join a quick weather answer to the full field note.** Provide a changing first-party link for the selected beach. Keep official swimming authorities separately displayed.

### Two credible interaction concepts

**Chosen: Question-first field desk.** Compact three-region wayfinding, specific question links, visible search, an all-lakes view, an existing source-backed weather card that follows the selected beach, and a complete field-note link. On phones, search then lake choice then weather answer precede the long list/map. Empty results hide stale readings. MI preserves all 50 crawlable links in a native disclosure below its working explorer. This changes a concrete decision rather than just a color treatment.

**Alternative: Map-first lake atlas.** All 96 shoreline pins become the principal first-screen control, with an expandable weather overlay. Attractive for geographic browsing, but weak for a person searching a town or known name, can crowd the phone, depends on map tiles, and costs more to test. Retain the existing map as a secondary geographic aid instead.

### Technology fit

Use native HTML, CSS and existing vanilla JavaScript plus source-controlled catalogs. **Reject Python, Rust, Java, a new Vercel function, a geocoder, Redis, paid services or production browser packages** because none improves the particular search/selection task. Keep existing weather models, scores, maps and API untouched.

## Preservation contract and verification

- Retain all 50 Michigan, 16 U.S., and 30 Ontario canonical child links, region hub URLs, Person/SEO schema, source provenance and official water notices.
- Retain AdSense Auto ads and all existing ad placement configuration untouched.
- A search result never becomes an unverified swimming guarantee; no match hides the old selection rather than showing a stale number.
- Native links and summaries work without JavaScript; blocked map tiles leave the source-linked list.
- No user-location permission is requested by search; the existing Michigan Near me flow remains opt-in.
- Evidence: `tests/shorefeel-question-navigation.test.js`, updated `verify-shorefeel-us-browser.cjs` and `verify-shorefeel-ca-browser.cjs`, and exact-commit CI. Do not declare live production traffic or UX conversion improved without measurement.
- Browser QA, `npm run verify:all`, source audit and visual screens must pass before merge. Explicit owner instruction required for merging. Live ads cannot be certified by fixture browser screenshots.
