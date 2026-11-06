# U.P. Waterfalls | B72: Turn the six-stop shortlist into a trip-ready field sheet

## Why this is a useful visitor investment
The explorer already shows 75 curated waterfall destinations, access caveats, nearby geography and a six-stop saved list. But copying names/links alone loses the parking and land-manager evidence at the moment travelers leave the website. This release converts *the existing shortlist* into an opt-in, source-linked day sheet without adding another prominent planning dashboard or an invented multi-stop route.

## Implemented
- A **Prepare / share day sheet** control nested in the current shortlist (closed by default, including on mobile).
- Selected stops retain their current order, region, recorded arrival/parking and walking notes, seasonal or restricted cautions supplied by the existing visit-date lens, and original source/guide links.
- A multi-region selection explicitly warns that stops may be hours apart; **no drive time, waypoint optimization, forecast, live opening or road right is invented**.
- **Copy trip notes** (plain text), **copy shareable link** (bounded six waterfall IDs plus an optional date), and **print day sheet**. URL import safely replays existing save actions, preserving the six-stop limit and UI state. Unknown, closed, research-only, or unverified-arrival imported IDs are skipped with a visible explanation.
- Google Maps directions only to independently sourced *visitor-parking* lat/lon, with geographic bounds, a valid HTTPS source URL and a non-closed verified-arrival record. Missing parking coordinates yield **no directions**; the GIS waterfall pin is never substituted, even when coincidentally duplicated in the parking field.
- No new public falls, map pin, trail or parking assumptions. No indexing, sitemaps, metadata, author identity, ads, analytics, infrastructure, cookies, or localStorage changes.

## Source/conservation boundaries
The prior B69–B71 Montreal and Warner evidence investigations remain research-only. Their public driving and walking access thresholds remain unmet. A downloaded or shared plan is **not** an authority confirmation; it is a checklist for checking the current land-manager and road/gate conditions.

## QA
Run:
- \`node --test tests/up-waterfalls-day-sheet.test.js\`
- \`npm run verify:all\`
- Waterfall mobile/browser smoke and creator-identity/SEO protection checks.
- Preview: verify both 375px and desktop, save/remove synchronization, date changes, invalid query IDs, mixed-region warning, copy/print, and fall-pin-vs-parking routing.
- After merge, verify production script load, share-link hydration and live HTML remains canonical.

## Success criterion
A visitor can save known-access waterfalls and leave with source-backed parking and walking cautions in their hand, with no unsafe navigation shortcut and no additional always-visible page clutter. Actual visitor adoption/CTR impact is **not yet measured**.
