# Release quality scorecard — FIELD_GUIDE_V1

Review with **actual rendered browser screenshots**, not just a green build or a map endpoint response.

Score every category on **0–5**, multiply by weight. Maximum 100.

| Category | Weight | What earns 5/5 |
|---|---:|---|
| Place desire & authentic imagery | 20 | Each destination visually unmistakable, inviting; provenance and credits verified |
| First-screen clarity & visual rhythm | 15 | Compact hero, intentional montage, visitor can act without decorative scrolling |
| Useful decision handoffs | 15 | Grounded advice and authoritative live/specialist sources; no fake precision |
| Mobile experience & accessibility | 15 | Clean 390px composition, readable cards, forms, focus, keyboard and fallback |
| Map utility & reliability | 10 | Tiles fully fill map, markers/controls visible, filters sync and fallback works |
| Source/licensing/data integrity | 10 | Correct license/source, dated truth labels, no invented availability |
| Performance & graceful degradation | 10 | Main answer is readable in static HTML, images lazy, no critical layout issues |
| Search intent & site integration | 5 | Self-canonical and distinct purpose, appropriate internal discovery, no cannibalization |

Score `sum(categoryScore / 5 × weight)`.

**Release threshold: ≥ 90/100, no category below 4/5, and all hard gates green.** Don't call a “90” if you did not perform the evaluation; mark it **not measured**.

## Hard gates (a score cannot waive these)

- All production place images verified and independently licensed; attribution linked.
- Main answer and useful links visible without JavaScript.
- No copied content or fake AI photography; no fake “live” status, park access or safe ice.
- Actual rendered image check on mobile + desktop, scroll into lazy cards.
- Map tested for multiple tiles, visible pins and zoom; transparent fallback on error.
- No ad-system changes unless the owner separately requests them.
- Existing owning repo CI and search/canonical guardrails green.
- Tested release branch, PR and merge/deploy status stated truthfully; live production smoke after deployment.

## Suggested benchmark test cases

1. **Photo trap:** wrong but beautiful waterfall image under the wrong waterfall name → reject.
2. **Lazy-loading trap:** full-page screenshot at deep Y looks blank but targeted card loads → don't replace working photo; test actual user scroll.
3. **Map trap:** API returns 200, one tile visible with no controls → fail; missing Leaflet CSS or dimensions.
4. **No-JS trap:** remove scripts; cards, evidence source labels and direct links should remain useful.
5. **Mobile trap:** at 390px controls, photo credit and destination title cannot overlap.
6. **Truth trap:** seasonal beauty photo cannot claim current trail opening or a safe ice crossing.
7. **Ad trap:** ad covers trip actions; fix structure within authorized scope, never silently alter AdSense.
8. **SEO trap:** a new guide must not compete with a pre-existing live “tonight” or “this weekend” decision engine.
