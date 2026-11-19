# Experience Investment: Spring Awakening Field Notebook

- Date: 2026-11-19
- Mode: IMPLEMENT, review then implementation
- Owner: izworskic/chrisizworski-com
- Canonical: https://chrisizworski.com/michigan-spring-awakening-field-guide/
- Scope: Existing Michigan spring guide only. All twelve chapters, original licensed photographs, source links, canonical, structured data, ads and regional phenology data remain intact. This is not a new forecast or new route.
- Browser baseline: NOT CAPTURED. Source baseline shows an extensive long-form introduction, three photographs ahead of a latitude scrubber, and no month-to-chapter departure flow.

## Visitor job

A curious Michigan walker or forager asks, "What might I look for in my region this month, and how can I check before going?" The first useful action is choose March, April or May and one of four broad regions. The result gives a plausible historical seasonal field cue, links to existing source-backed chapters and hands off to an appropriate current-condition specialist.

## Evidence and limits

Existing source: `public/assets/michigan-spring-awakening-field-guide.js` supplies four editorial LAT_ZONES and the twelve event records with peakMonth and latitude bounds. This is coarse educational chronology, not observed emergence, forecast peak, harvest permission, a verified wildlife sighting or navigability statement. The written default April/Mid-Michigan answer is visible without JavaScript. Existing independent trackers remain responsible for current observations.

External interaction references from Experience OS inspiration library (official documentation, not newly screenshot-audited):
- NPS App: https://www.nps.gov/subjects/digital/nps-apps.htm - self-guided, visitor-task-first interpretation and practical handoffs. Do not imply NPS endorsement or public access for an unverified location.
- iNaturalist Explore help: https://help.inaturalist.org/en/support/solutions/articles/151000169670-how-to-search-inaturalist-observations - time/place scoping and evidence distinction. Do not mistake modeled seasonal windows for actual sightings.

## Competing concepts

**A. Spring Field Notebook (selected).** A restrained editorial reading desk, month buttons, region select, one regional field cue, chapter links and a current tracker link. First 390px screen begins with a compact original title and naturalist framing, then the field notebook before the existing photo strip. Desktop pairs controls and a field-note ledger. If JS fails, a fully useful April/Saginaw Basin note and three chapter links remain. Cost: small, dependency-free HTML/CSS/JS.

**B. Animated northward emergence map (rejected).** A whole-state stage map with a time scrubber would look striking, but there is no verified observed point geometry or date series to animate. It could encourage readers to mistake historical latitude estimates for precise live bloom locations. Cost, data uncertainty and visual risk outweigh value today.

## Distinctiveness audit

Closest tools:
- Michigan Bird Migration: habitat-first, six documented field stops with actual map focus and separate dated radar/sighting checks.
- Michigan Bloom Tracker: March-October flowering timeline across nineteen source-linked destinations.

This field guide instead connects a Michigan **month and latitude region to educational biological milestones**, with a field-notebook hierarchy and in-page botanical/wildlife chapters. It has no map or fabricated current observations. Its chief interaction is **month + region -> regional cue + matching chapters + current-source handoff**, unlike habitat-to-map or bloom-date-to-destination. Its visual language is a plain field note with numbered chapter lines, not a location pin deck, snow report dashboard or generic cards.

Originality score: NOT MEASURED until actual mobile/desktop review. Purpose-driven structural differences are implemented; distinctiveness gate requires visual review before merge.

## Linked state and failure

| Action | Changed answer | Linked state | Fallback |
| --- | --- | --- | --- |
| Choose March/April/May | Regional field cue, month label, event chapters, specialist link | `state.selectedMonth` + `state.selectedLat` | April/Saginaw HTML answer |
| Choose region | Latitude scrubber state, zone name, cue and chapter filtering | `state.selectedLat` | Last native HTML content |
| Move original latitude slider | Notebook region and cue update | `state.selectedLat` | Native select remains |
| Open chapter after old category filter | Filter resets to All before anchor navigation | Exact event ID | All chapters already in HTML |
| No matching events | Honest no-match message, never guessed seasonal event | Same state | Specialist link retained |

No invented observations or safety verdict. No photos are added; three original images and linked visible credits are retained and moved below the decision. No new external scripts, paid APIs, Redis, Vercel functions or build stages. Source text, metadata and SEO intent are preserved.

## Acceptance

- Source-level and VM interaction tests: `tests/spring-field-notebook.test.js`; existing `tests/michigan-spring-awakening-field-guide.test.js`.
- Original 12 cards, 3 credited hero photos, canonical, Person and existing category/latitude controls must remain intact.
- Require full `npm run verify:all`, exact-head CI, 360/390/768/1280/1440 Chromium screenshots, A-B-A, keyboard, no-JS and mobile scroll check before release.
- Status at authoring: commits created on feature branch, tests and browser screenshots NOT VERIFIED, production NOT DEPLOYED, CTR/engagement/revenue NOT MEASURED. Do not merge automatically.

Exactly one next action: run exact-head CI and browser acceptance, fix any failures, then request owner review.
