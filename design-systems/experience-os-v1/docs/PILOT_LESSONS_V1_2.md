# v1.2 learning ledger — Sleeping Giant and Tahquamenon

**Reviewed:** October 31, 2026 · **Evidence type:** shipped implementation / browser QA / CI and release records. **Not evidence of traffic or visitor-conversion lift.** This document records transferable contracts, not an identical visual template for future pages.

## Tahquamenon: the first experience pilot

**Owner:** [Tahquamenon tool repository](https://github.com/izworskic/tahquamenon-falls-live); [implementation PR #20](https://github.com/izworskic/tahquamenon-falls-live/pull/20); [browser evidence](https://github.com/izworskic/tahquamenon-falls-live/actions/runs/41207601493). See [full pilot review](TAHQUAMENON_PILOT_20261031.md).

- Real browser interactions caught a selector error that static JS inspection did not; test actual user actions.
- A narrow phone exposed 17px overflow from a scrollable section; width checks must inspect the actual culprit rather than globally hiding overflow.
- Leaflet/CDN failure created an oversized empty panel; fail compactly into sourced choices.
- A selected photograph could be blank before load; show only successfully loaded exact-place photography and keep the text path.
- The strongest information architecture was original visit plan → selected place → map/photo evidence; avoid repeating giant card grids.

## Sleeping Giant: second pilot, with additional proof

**Owner:** [chrisizworski-com](https://github.com/izworskic/chrisizworski-com); [Experience OS implementation PR #1331](https://github.com/izworskic/chrisizworski-com/pull/1331); merged SHA `ec7371bd39e4dbc009927d1d5f92e5bac124adae`; [Sleeping Giant engine, four-viewport browser and combined build checks](https://github.com/izworskic/chrisizworski-com/actions/runs/41241413084); [full repository gate](https://github.com/izworskic/chrisizworski-com/actions/runs/41241413082). Exact page: https://chrisizworski.com/sleeping-giant-provincial-park/.

- Existing independent controls did not offer a unified visitor answer. The release made planner preferences, featured outing, six route cards and map-side native selector share a stable trail ID. **Lesson:** every change should have a causal invariant verified in real Chromium.
- The first new test reported “desktop map and feature are out of sync” because the legitimate map title added “route line not available” for an unmapped trail. Test was corrected to allow the truthful qualifier; **do not delete uncertainty to make a fragile exact-text test pass**.
- Inspection of a successful browser screenshot showed unused space below a desktop photograph; a second screenshot revealed an oversized mobile hero. These were presentation failures despite functional tests passing. **Lesson:** load and visually inspect the exact output in changed states; inspect image composition and first useful answer, not just markup.
- Narrow-screen browser coverage was expanded to **360, 390, 768 and 1440px**. Changes were rerun through the Sleeping Giant engine/GIS workflow, full source/repo checks and Vercel preview on the final branch.
- The page was converted from kilometers to miles for its audience in [PR #1300](https://github.com/izworskic/chrisizworski-com/pull/1300), retaining Ontario Parks' kilometer source alongside converted display. **Lesson:** units and rounding are a presentation layer; the decision engine and official route totals remain unchanged.
- Three credited route-relevant Wikimedia images were used; other trails intentionally stayed text-first rather than showing unrelated scenery. Async image selection must prevent stale A images/credits from appearing during B's selection.
- Four research-only trail overlays and unresolved parking connectors remain openly described as non-navigation. **Lesson:** source truth and uncertainty do not become safer simply because the map becomes more engaging.
- The PR passed the owning repo checks and was merged. The production provider later reported **READY for the exact merged SHA**; an independent post-release public HTML fetch was **not** evidenced in that turn. Record “deployed, live smoke not independently verified” rather than “live verified.”

## Three cross-pilot principles now formalized

1. **One decision, many synchronized surfaces:** the visitor's choice needs the same stable ID and evidence in cards, maps, photos and detail. “Changes a CSS class” is not sufficient.
2. **The whole response matters on a real device:** a correct dataset can still create an unusable page via tall heroes, blank photos, empty map containers, clipped credits or misplaced focus.
3. **Truth must survive the happy path and failures:** authoritative measurements, source age, map completeness, photo rights and current opening status remain distinct from suggestion and depiction.

## Limits and follow-up

No controlled user test, organic CTR change, attribution model, perceived latency field p75 or conversion improvement has been demonstrated by these pilots. “91/100” on the Tahquamenon internal implementation rubric is not user-outcome validation. Keep source details up to date and review new pilot evidence before any future version bump.

**One next reusable experiment:** apply the filled selection-state matrix to a different experience family (e.g., a time-slider forecast) before standardizing any new page UI. That tests transferability beyond park planning.
