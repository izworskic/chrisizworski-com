# Connected experience contract — v1.2

**Applies to:** substantial visitor-facing interactions in EXPERIENCE_OS_V1. **Status:** source-only quality governance, not a reusable page skin. Owning-repo safety and authority prevail.

## 1. A visitor makes a decision, not a collection of clicks

For every core action define the **selection invariant**:
- A stable source ID identifies the selected place, trail, stop, route, event or time window.
- The primary answer, selected card, map highlight or explicit unavailable state, image, detail, evidence and native selector refer to that same ID.
- A change via any supported input path updates the same information; going back or resetting restores consistent state.
- Distinguish visitor **preferences** (time, interest, transport) from explicit **selection**. Preference updates may suggest a different selected option only using the existing validated decision engine. A planning candidate is not an open/safe claim.
- Keep an equivalent keyboard or list route when a map is absent. Do not create a hidden click-only control just to synchronize the presentation.

**Release test:** at least three causal journeys (initial, alternate, reversible selection) compare the actual visible answer and state at each touchpoint, not only CSS class, data attribute, or a static snapshot. An unavailable geometry state such as “route line not available” is a **valid synchronized result**, not a test failure for containing extra safety language.

## 2. First-screen utility is a measured composition contract

At **360, 390, 768 and 1440px**, inspect full-page and changed-state screenshots with the correct loaded images and map. Capture where the visitor's first useful answer, principal action and source/status note land. Shorten a hero or reorder information when it makes the visitor scroll past editorial material to reach the actual decision; do not impose one global height or clone a house layout. Check real typography, contrast, touch targets, no horizontal overflow and relevant focus placement. Images support the decision; they do not consume a separate second hero-sized viewport.

## 3. Images are asynchronously verified evidence, not decoration

Every location-specific image has a ledger row: exact depicted subject, image source URL, author, license/rights, linked credit and intended crop. Use real photography or omit it.
- **Load**: until the selected photograph really loads, leave the text answer usable; do not leave a large blank/spinner panel.
- **Race**: if A is selected then B, a slower response for A must never replace B's image/credit. Keep photo, caption, title, alt text and selected ID consistent.
- **Failure**: missing image, HTTP error, slow load or no appropriate place photo collapses the photo panel and retains the source-linked answer/map or map-free choice.
- **Layout**: test the selected photo after loading at phone, tablet and desktop, including credit legibility and object-fit. Test no-photo and failed-photo states.
- **Truth**: archival imagery never serves as proof of present access, safety or conditions.

## 4. Source facts and display units have distinct ownership

Preserve original authoritative distance and route data in its published units and precision. Display miles/kilometers or other user-facing units via an explicit conversion layer with documented rounding. Distinguish one-way versus full return, biking versus walking and surveyed versus inferred distances. Conversion must not recalculate ranking, permit status, source eligibility or route coordinates. Verify representative small/large distances, totals and zero/unknown behavior using unit tests and no-JS HTML.

## 5. Faults remain useful and honest

Define a failure branch for JavaScript disabled, no tiles, map library unavailable, slow/error images, missing/stale official sources and unavailable route geometry. The fallback must remain an **actionable, readable visitor answer**, not a huge empty placeholder plus warning text. Show “unverified” instead of guessing present access or rendering invented lines. The source URL, source checked/issued time (if applicable), and limitations remain clear.

Do not mistake image HTTP success for visible usable photography, map HTTP 200 for actual tiles, or an accessibility name for confirmed navigation.

## 6. Test meaning, not incidental wording

Use **exact equality** only for stable data contracts: canonical URL, route ID, numeric units, aria/selection state, official measurements and other fixed identifiers. For descriptive UI, prefer semantic assertions: correct route name and relevant qualifier, expected meaning, accessible actionable label and absence of contradictory claims. Never weaken a safety caveat to satisfy a brittle string assertion. A failed browser check needs a logged cause and a fresh full rerun on the final commit.

## 7. Five distinct evidence levels (the first four describe delivery status)

1. **Implemented**: source commit and PR exist. Not yet tested.
2. **Verified**: actual owning-repo CI, real browser scenarios and screenshot inspection pass on a particular PR head. Not yet merged.
3. **Deployed**: production provider reports READY (or equivalent) for the *expected merged SHA*. No public HTML assertion implied.
4. **Live verified**: independent request to canonical public URL confirms actual changed output, canonical/schema, expected interactions where possible and no regressions. If public fetch cannot be performed, record “not verified”.
5. **Outcome measured** (later): comparable usage/traffic/visitor decision evidence, not inferred from QA, a screenshot or a ready deployment.

A release report records these separately. Never say “live verified” merely because the PR merged or Vercel is READY. Do not promise asynchronous follow-up.

## 8. Keep the implementation proportional

Prefer the original engine, server/build-rendered HTML, minimal JavaScript and existing CARTO/Leaflet/OSM fallback. Make no forced React, Rust, 3D, motion or shared-component migration. Preserve repo ownership, original canonical and Person ID, indexing, Auto Ads, no-Redis rules, source licenses and current verified routing limits.

## Required evidence files for substantial work

- A source-backed brief (visitor decision, exact owner, two design approaches, reasons for rejection).
- `templates/STATE_MATRIX.md` filled for at least three journeys and error/slow states.
- Rendered screenshots at all four widths, including changed selection and fallback; a useful photo must be visually confirmed.
- `templates/RELEASE_REVIEW.md` with tests/commit/CI/deploy/live facts, scorecard and unresolved gaps.
- One transferable lesson, with the exact failing behavior, fix and rerun evidence, added to the learning ledger.

Use fast-path checks for simple typo/link/metadata fixes; do not burden minor work with a ceremonial experience brief.
