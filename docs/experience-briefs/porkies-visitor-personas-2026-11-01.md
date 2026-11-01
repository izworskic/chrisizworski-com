# Porcupine Mountains Experience OS — production visitor-persona study
**Performed:** November 1, 2026, 11:38–11:39 UTC  
**Public URL tested:** https://chrisizworski.com/porcupine-mountains/  
**Method:** 16 separate, read-only real Chromium browser journeys, using 390px mobile, 768px tablet and 1440px desktop, with date/arrival/vehicle/hours/walking comfort/interest selected through the real planner. Each tester then chose two matching A/B experiences and inspected the source-backed entry panel. Direct browser captures used live page HTML, JavaScript and source JSON. For the persona sweep only, two external ArcGIS GIS-query endpoints were given deterministic empty fixtures to avoid excessive traffic; this study **does not validate live GIS response quality or field access**. Source-outage, no-JavaScript, keyboard and mobile-entry baseline were separately tested.
**Full raw evidence:** [GitHub Actions 41302790278](https://github.com/izworskic/chrisizworski-com/actions/runs/41302790278), artifact `porkies-persona-research-20261101` (30-day retention), including `persona-results.json`, `readout.md`, and screenshots. The reproducible research harness is `scripts/audit-porkies-personas.cjs`. Not real human research or measured customer satisfaction.

## Outcome

- **16 / 16** reached and updated the deployed A/B comparison with a source-backed entry panel; no browser JavaScript exceptions reported in these journeys.
- **11 / 16** met every scripted goal/check; **5 / 16** were flagged for a missing expectation. These are *scripted rubric results*, not an observed human completion rate.
- **0 P0 unsafe claims** detected by the scripted checks. Not an assertion that no safety defects exist.
- **3 visitors (RV, trailer, winter motorhome)** saw no vehicle-specific caveat in the **primary planner answer**. The secondary comparison and DNR parking logic carry some restrictions, but visitors should not need to find a second feature to learn what their vehicle cannot reach.
- **2 visitors with a short visit and attraction-versus-arrival conflict** received a different attraction as the leading recommendation (west + panoramic view => Presque Isle falls; east + waterfalls => Lake of the Clouds) without a meaningful "stay local / make the separate trip" decision.
- **The first mobile planner starts at 4,876 CSS px, ~5.8 × an 844px phone viewport** down. The hero includes a working `#decision` jump link, a mitigating discovery affordance; measure real usage before assuming actual abandonment.
- **The initial date auto-hydrated to November 1, 2026**, correctly (the source HTML contains an older October 28 date used as no-JS fallback). This is **not a current live-JS defect**. The page remains `noindex,follow` on purpose; that is an **independent release gate**, not an emergent persona failure.
- Keyboard-open official proof, static no-JS comparison/3 stories/6 parking cards, and HTTP 503 entry-ledger fail-closed behavior all **passed**.

## Persona-by-persona evidence

| Persona | Trip context | Main plan | Scripted result |
| --- | --- | --- | --- |
| Newcomer east | 2h, low walking, views | Lake of the Clouds | Pass |
| Wisconsin waterfalls visitor | 2h, west entry, falls | Presque Isle River | Pass |
| West entry, wants panorama | 2h, low walking, views | Presque Isle River falls | **Flag: destination tradeoff unexplained** |
| Family with stroller | 4h, east, low walking | Lake of the Clouds + Union Bay | Pass (not a certified barrier-free route) |
| RV from Keweenaw | 4h, east, views | Lake of the Clouds + Union Bay | **Flag: primary result ignores RV** |
| Towing from Wisconsin | 8h, west, falls | Presque Isle River + Summit Peak | **Flag: primary result ignores trailer** |
| Winter ski visitor | January, east, forest | Winter Sports Complex | Pass |
| Winter western falls family | February, west, low walking | Presque Isle west access | Pass (conditional road access) |
| Spring forest traveler | May reopening uncertainty | Visitor Center Nature Trail area | Pass |
| Experienced remote hiker | 8h, high walking, forest | Summit Peak + wilderness | Pass; crossing risks not falsely cleared |
| Two-day tour | 16h, west, mix | Presque Isle + Summit + Clouds | Pass with regional cautions |
| Mobility-aid waterfall visitor | 2h, west, low walking | Presque Isle River | Pass; Nawadaha vs full trail caveat |
| East entry, wants falls | 2h, east, falls | Lake of the Clouds | **Flag: destination tradeoff unexplained** |
| November panoramic visitor | 4h, east, views | Lake of the Clouds + Union Bay | Pass with November caution |
| Crossing-aware backpacker | 16h, in park, forest | Lake + Summit + River + backcountry | Pass; crossings not certified |
| Winter motorhome | February, west, falls, low walking | Presque Isle west access | **Flag: primary result ignores motorhome** |

## Prioritized next engineering investments

**P1 — unify vehicle feasibility in the first recommendation.** Implement a single source-led `vehicle` policy shared by planner, comparison and parking notes; for campers, motorhomes and towing, prominently surface DNR vehicle staging limits and unverified turns. Do **not** invent a safe RV route or use a separate DNR lot's coordinates without evidence. Acceptance: all three flagged large-vehicle personas see the relevant caveat in the primary result and are not offered an unsupported driveable multi-stop itinerary. Test changing car↔RV↔trailer while preserving date and all other selections; test keyboard/no-JS source fallback.

**P2 — preserve stated attraction when arrival/time conflict.** Show two clearly named decision paths: "Explore what is close to your arrival" versus "Make the separate trip for the experience you requested (requires independent travel/access verification)." Do not override the visitor's attraction silently or fabricate cross-park drive ETAs. Acceptance: west+views+2h and east+falls+2h show both choices and the missing travel-time proof; selected paths update the relevant cards, not only explanatory paragraphs.

**P2 — improve plan visibility without cloning the design.** The visitor may scroll through 5.8 phone screens before the form; the hero CTA jumps there but is not a substitute for testing lower-page engagement. Prototype a compact, accessible "plan my day" access point near the top, preserve the editorial/photography identity, and measure viewport-visible action, keyboard landing, and actual interaction start. Do not replace the field-guide composition with generic template cards.

**Separate public-search release blocker:** `noindex,follow` remains by design while final signed trail/parking/access/road data is unresolved. Do not lift indexing to score an artificial audit pass. Run a distinct source/release decision after the outstanding real-world evidence is obtained.

## Experience OS verdict

**Core Experience OS behavior is working**: meaningful planner branching, distinct photo-led comparison, source-aware choices, winter and mobility warnings, maps and conservative uncertainty, usable no-JS/keyboard fallback. **Not yet a 100/100 release**: primary itinerary and secondary eligibility constraints diverge, a stated visitor goal can be silently substituted, and mobile planning is vertically buried. No real-user session outcomes, Core Web Vitals, traffic, long-term retention, source freshness in the field or map provider reliability were measured. Do not convert 11/16 scripted pass into a visitor satisfaction percentage.

## Next phase / study design

After the P1 and P2 fixes, rerun the same 16 production personas as a regression, plus an independent unmocked map/official-source smoke and 360px/390px/768px/desktop walkthrough. Test navigation CTA from hero, copy/share plan, browser back and keyboard selection. Only after that consider moderated human testing for comprehension/effort, and analytics that measure real starts/completions without adding unnecessary tracking. Compare before/after on identical tasks, and retain failure evidence.

**Confidence boundaries:** 16 controlled scenarios cannot establish real-world passability, accessibility certifications, vehicle turning feasibility, accuracy of DNR data, attractiveness to actual visitors, or expected SEO uplift.
