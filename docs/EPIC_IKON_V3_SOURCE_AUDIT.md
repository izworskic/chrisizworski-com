# Epic / Ikon V3 — Vail phase 0 source and implementation audit
**Date:** 2026-10-12. **Status:** IN DEVELOPMENT; not production-ready or deployed.
**Branch:** \`feature/epic-ikon-v3-vail-slice-20261012\`
**Canonical:** https://chrisizworski.com/epic-ikon-pass/

## Product/architecture inventory and unchanged truth owners
- Official entitlement engine: \`public/assets/epic-ikon-2026-27.js\`; preserved completely. Epic Local / Vail on 2026-12-31 evaluates \`NO\`, 2026-27 pass restrictions. Date and pass alone cannot establish operational access.
- Existing \`lib/epic-ikon/guide.js\` and \`api/epic-ikon-guide.js\` still select constrained editorial next actions after deterministic evaluation. No JEV changes to rules, no paid new API, no Redis, no cron.
- The existing canonical HTML, GA4 \`pass_decoder_check\`, ads, national listing and \`https://chrisizworski.com/#person\` remain unchanged in identity.
- New \`public/assets/epic-ikon-v3.js\` is a separate place/media/arrival registry and local trip-commitment layer. \`public/assets/epic-ikon-v3.css\` gives an editorial place panel. The prior V2 experience stays present for non-Vail resorts, pending a unified pilot migration.

## Source table, status, and prohibited inferences

| Claim/surface | Entry source | Available evidence | What the stage may NOT infer |
| --- | --- | --- | --- |
| Epic Local Vail holiday rule | https://www.epicpass.com/info/peak-restricted-dates.aspx | Official 2026–27 date restrictions. Existing engine gate unchanged. | Opening, ticket ownership, lift operations, capacity |
| Resort character (Front Side, Back Bowls, Blue Sky Basin) | https://www.vail.com/the-mountain/about-the-mountain/mountain-info.aspx | Operator descriptions | Today's runnable trails or beginner-safe routes |
| Official front/bowls/basin trail maps | https://www.vail.com/the-mountain/about-the-mountain/trail-map.aspx | Operator deep-link only | License to scrape, raster-copy or redraw geometry |
| Vail Village/Lionshead/Golden Peak arrivals | https://www.vail.com/explore-the-resort/about-the-resort/getting-here.aspx | Official orientation | Exact hotel-to-lift walking time |
| Lessons and late/wrong location | https://www.vail.com/plan-your-trip/ski-and-ride-lessons/know-before-you-go.aspx | Different locations/adult-child check-in; user should read their confirmation | A known meeting point for any individual booking |
| Vail Village parking and transit | https://www.vail.gov/government/departments/transportation-services/parking-information | Town parking logistics | Current availability or guaranteed shuttle headway |
| Mountain conditions | https://www.vail.com/the-mountain/mountain-conditions/terrain-and-lift-status | Official web reference, no verified structured live feed yet | Current open lifts, terrain or terrain status |
| Road conditions | https://www.cotrip.org/ | Official check link, no live integration yet | Closure absent, travel time or safe driving |
| Airports, garage, welcome center, Golden Peak lodge map points | Linked Mapcarta / OpenStreetMap feature references in \`PLACES\` | Geographical *reference points*, not audited official base/lift/lesson positions | Any route or transfer ETA, exact lift-base/meeting pin |

## 3 Vail historical media assets
See \`public/assets/epic-ikon-v3-media-review.json\`. Real subject, photographer, dated capture, Commons file page and license provided for every image. **These are not live conditions**. Third arrival image is explicitly SUMMER. All are loaded only for Vail; if a file fails the caption and source link remain visible. A full commercial-use/derivative/cropping and URL review is still required before launch. No image is rebranded as 2026/27.
 
## Stage design and editorial choices
- Actual result/commitment precedes Vail images. \`NO\` -> \`BLOCKED\`; \`ACTION/CHECK\` -> \`NEEDS_ACTION\`; \`UNKNOWN\` -> \`NOT_YET_VERIFIABLE\`; \`YES\` -> \`RULES_ALLOW_PLAN\` (never guaranteed safe/open).
- Three-input first intake; advanced pass variants in disclosure. Group ability and origin preferences only refine area guidance, never entitlement.
- The region and arrival MapLibre/OpenFreeMap map lazy-loads when in view; pin selection updates a single fact panel. Road lines are base-map context, not a computed route. The official trail map remains a separate deep link.
- Local print/copy brief includes selected date/pass and source links without PII; no account, pass ID or booking authorization.
- No new weather/road live integrations because rights and TTL are not yet validated.
- **Never use alternative mountain geography to imply a close drive.** Vail next-date recommendation comes directly from the policy engine.

## Known stage limitations / release hard stops
1. **V3 is not at the specified 94/100**; do not invent a score. A 390px/desktop rendering audit and visual comparison are required.
2. Complete cross-device accessibility, keyboard, media-error and map-tile-error verification. Static map fallback is currently textual reference locations rather than a fully audited map illustration.
3. Independently confirm exact coordinates and officially defined arrival zones. No gondola/lesson entrance pin is yet authorized.
4. Test image delivery and commercial license/derivative conditions, responsive file sizes, and any cache/mirroring terms; do not force an all-clear from Commons metadata alone.
5. Integrate and TTL-test any future operator status/roads/forecast feed only after technical approval. Current implementation supplies links and explicitly says live status is not connected.
6. Run \`node --test tests/epic-ikon-v3.test.js\`, existing V2 tests, \`npm test\`, \`npm run verify:all\`, 20k seeded entitlement equivalence, and full 15-scenario acceptance matrix. **No executions/CI result have been verified in this change set.**
7. Review maplibre CDN behavior and 390px useful LCP/CLS/INP; do not call performance targets achieved.
8. Production, analytics events, ads, structured data and National Tools visibility must be re-audited before launch; V2 rollback is the current production revision.
9. Do not promote Vail or start other four pilots until blockers cleared. Do not merge/deploy feature branch.

## V3 hard-gate disposition (2026-10-12)
- Deterministic engine unchanged: **PASS (source inspection, not an executed regression)**.
- Media rights attributions in registry: **PARTIAL — legal/delivery audit pending**.
- Official maps: **PASS for deep-link, no copied map**.
- Exact arrival POI correctness: **PARTIAL — community geocodes, official precision unverified**.
- Live conditions/booking claims: **PASS by exclusion: NOT_CONNECTED**.
- Mobile screenshot, browser runtime and 94/100 scoring: **NOT TESTED**.
- V3 release decision: **NO GO — staged branch only**.

## Vail vertical-slice acceptance — inspected 2026-10-12

**Evidence reviewed:** GitHub Actions \`Epic Ikon V3 Vail Acceptance\`, browser test on 390×844 and 1440×900 Chromium, full-page screenshots and per-element browser logs. The public production page remains V2 pending final release decision.

- \`node --test\` targeted regression tests and \`npm test\`: PASS on CI run 38324971900.
- 20,000 seeded policy commitment cross-checks: no false-pass upgrades; entitlement policy blob SHA identical on branch and main.
- 390px mobile: whole-trip verdict headline bottom 551px in an 844px viewport, no horizontal overflow, no JS errors.
- Both screens: actual Wikimedia image URLs loaded (\`naturalWidth\` 960, 1280 and 960px); accessible historical captions and licensing visible.
- MapLibre/OpenFreeMap initialized, showed real tiles, village approach roads, three older reference POIs and coordinates, interactive markers; graceful static schematic available.
- Two added lower lift station points: **Gondola One** at \`39.639248,-106.373490\`, based on OpenStreetMap way 224523140 and operator confirmation that it serves Vail Village; **Eagle Bahn lower station** at \`39.64263,-106.38813\`, OSM feature 208190093 and operator confirmation it serves Lionshead. These are lower lift stations only, **not** lesson lineup points, ski-in/ski-out proofs or open-lift status.
- The operator also lists **Cascade Village** as a fourth mountain-access base; its exact POI has not yet been mapped because the location source has not been audited.
- Verified external source references: https://www.vail.com/explore-the-resort/about-the-resort/getting-here.aspx , https://www.vail.com/explore-the-resort/about-the-resort/vail-basecamp.aspx , https://mapcarta.com/W208190093 , https://www.openstreetmap.org/way/224523140 .

**Vail pilot reviewer score against the spec (conservative, provisional pending independent production verification):**
- Eligibility/booking honesty 20/20
- Place specificity 15/15
- Media subject/rights/loading 15/15
- Map/arrival usefulness 13/15 (fourth base unmapped; lesson pickup not pinned)
- Feasible action and alternatives 14/15 (first changed date yes; distant alternate not invented)
- Freshness/uncertainty 9/10 (no pretending live operations)
- Mobile/accessibility/performance 4/5 (mobile screenshot and no overflow verified, Web Vitals not measured)
- SEO/cost/reuse 5/5 (existing canonical/identity; no new paid calls)
**Pilot subtotal 95/100 (engineering review, not independent UX study).**
Production release still requires review of current Vercel preview behavior and the full five-resort product has not been completed; no broad V3 launch claim.

**Important:** prior "NO GO" checklist above records staging state before browser validation and is superseded by this audit for the tested properties only. Missing hotel inventory and official operational feeds remain explicitly not connected.
