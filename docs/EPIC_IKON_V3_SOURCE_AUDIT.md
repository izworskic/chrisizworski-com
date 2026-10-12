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
