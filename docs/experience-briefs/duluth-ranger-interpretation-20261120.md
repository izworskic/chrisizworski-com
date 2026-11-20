# Duluth Canal Park: ranger-style editorial interpretation

Date: 2026-11-20
Mode: editorial improvement within Experience Investment, not a new tool or UI template
Owner: izworskic/chrisizworski-com
Canonical: https://chrisizworski.com/duluth-canal-park/
Prior experience: PR #1789, two-horizon harbor decision desk

## Visitor task

A visitor searching for a Duluth ship schedule wants to know which vessel might pass the lift bridge and whether it is worth going to the canal. Once there, they want to understand the ship, the bridge and what makes each viewing place different.

The prior page presented accurate data distinctions but spoke in system terminology: "supported candidates", "spatial picture", "decision layer", "visual cross-check" and "model". That language requires effort without helping the visitor read the waterfront.

## Editorial decision

Use the voice of an informed National Park Service interpreter: concrete things to look for and learn, short direct explanations, an invitation to explore, and precise safety and uncertainty statements. Not a fake ranger persona, an invented personal visit, a script of breathless excitement, or a story above the visitor's first answer.

Three supported place facts:
- Duluth Ship Canal was cut through Minnesota Point in 1871, leaving Park Point separated from the city. Source: https://www.asce.org/about-civil-engineering/history-and-heritage/historic-landmarks/duluth-aerial-lift-bridge/
- The 1905 bridge carried a suspended gondola; the roadway was converted to a vertical-lift span in 1929-30. Source: the same ASCE landmark history.
- The Port of Duluth-Superior handles iron ore, coal, grain, limestone and other cargo; the free USACE Maritime Visitor Center provides exhibits, ship models and pilot-house displays. Source: https://duluthport.com/about-us/frequently-asked-questions/

Other useful corroboration: https://visitduluth.com/lake-superior/aerial-lift-bridge/ and https://lsmma.com/content.aspx?club_id=605134&module_id=524613&page_id=22

Research reviewed November 20, 2026. These history and public-visitor references are not current weather, posted public access, camera uptime or ship arrival confirmations.

## What changed

1. Shortened and made the first-screen lede tangible: visitors picture a vessel entering from Lake Superior, then choose the next AIS-backed watch or the separately published forecast. Did not add a hero or push the answer below new storytelling.
2. Added a post-map "What to look for when the bridge rises" interpretation: canal cut and Park Point, bridge evolution, working-port cargo and a ship-watching observation to make at the piers. Visible primary-source links.
3. Rewrote the three viewing locations as three meaningfully distinct experiences: close ship scale beside the museum, bridge-and-ship photography from Park Point, flexible Lakewalk waiting.
4. Replaced generic live JS language for a supported ship, no supported candidate, AIS failure, camera context and uncertainty. Kept exact source quality rules; a quiet/no-data state never means the port is empty.
5. Improved the how-it-works explanation and visitor FAQs so terms like AIS, course, candidate, and passage window have real visitor meaning.
6. Updated the build-time Duluth discovery tuner to preserve the new text instead of restoring an older SEO treatment. Search title/description, canonical and Person identity are protected.

## Technical scope

Touched original HTML, one existing JS client, the discovery tuner, two regression tests and one new editorial regression test. No API, geolocation, AIS model, subscriptions, external photo rights, additional photography, pricing, storage, ad script or Vercel function changes. No new route or duplicate query intent. On-page "historical" sources are clearly distinguished from the live ship feed.

Avoid changing map markers, generated vessel values, video loading and keyboard navigation. Landing page still has its key next-ship result and published later forecast immediately after the lead. The added story is below the map and viewing choices.

## Verification and measurement

- Baseline GSC last-12-month Web row from November 20: 6,214 impressions, 34 clicks, 0.55% CTR, average position 9.68, not a post-change performance measurement.
- Tests: tests/duluth-ranger-interpretation.test.js, tests/duluth-harbor-decision-desk.test.js, tests/duluth-canal.test.js and tests/duluth-source-date-build.test.js plus full repository verification.
- Browser 360, 390, 768, 1280, 1440; camera and map failure behavior; exact deployed text: NOT VERIFIED until checked.
- Exact-head CI, production deployment and CTR/engagement effect: NOT VERIFIED or NOT MEASURED at drafting. Do not claim a change in search CTR from editorial work alone.
- Distinctiveness: This place interpretation is specific to an operating harbor and a lift bridge, unlike a regional AIS map or a lock schedule. It adds no generic photographic hero or card layout.

**Exactly one next action:** run the full branch gate and emitted-page checks, address any failures, then review PR and its browser evidence before merge.
