# Michigan rockhounding — public destination assumption and offshore wave spike (2026-10-15)

## Owner decision

The user explicitly declined sending an email to Burt Township and requested we proceed on normal practical assumptions from repeated Grand Marais visits. **An owner email is no longer a development prerequisite.** Do not record a user's private travel details in a public repo or imply that they personally authorized municipal rock-collecting rules.

**Documentary upgrade:** Burt Township's 2026 recreation plan independently identifies Agate Beach as a township-owned **public rockhounding destination** and states that **public parking is available at the boardwalk**. The previous township recreation plan also calls Agate Beach a public beach popular with rock and agate collectors. Therefore the destination discovery gate passes without an email.

Sources:
- 2026 township recreation plan: https://burttownshipacmi.gov/wp-content/uploads/2026/01/Burt-Twp-Rec-Plan-FINAL-1-9-26-comp.pdf
- 2021–2025 township plan: https://www.burttownship.com/wp-content/uploads/2022/08/Final-Recreation-Plan-2021-2025.pdf
- Official Agate Beach: https://burttownshipacmi.gov/recreation/agate-beach-lake-superior/
- Official Bayshore Park: https://burttownshipacmi.gov/recreation/bayshore-park-public-swimming-areas/
- General EGLE rock collecting limitations: https://www.michigan.gov/egle/public/learn/geology/rockhounding

## Practical decision contract

**Agate Beach:** May appear as a public rockhounding destination and can show owner-source general directions: public parking at the boardwalk, follow current posted signs. No fabricated exact GPS. Distinguish rockhounding destination from explicitly permitted rock removal. Current posted rules, park hours, hazards and any local restrictions must still be checked. 2026 boardwalk alteration/ADA status is unknown: never claim a completed step-free route.

**Bayshore Park:** Public harbor swimming beach and valid sheltered-wave **comparison**; may show general township-supported downtown access advice, but must **not** automatically become an agate-finding recommendation.

**Two-tier decision engine:** `assessSite()` now returns `canListPublicBeachForVisitPlanning`, `canListRockhoundingDestinationLead`, `canGiveGeneralArrivalAdvice`, `generalArrivalAdvice`, `researchExposureModelMayProceed`, and `collectionRuleDisplay`. The existing strictly permissioned `canPublishCollectingRecommendation` and `canPublishWaveBasedRecommendation` remain independent and false until proven. No email dependency on the destination/research tier. Existing NPS prohibitions are unaffected.

## NOAA research adapter — no invented local waves

`lib/rockhounding/superior-wave-reference.cjs` consumes the no-key **NOAA NDBC station 45004** East Superior text feed, using the already-established NDBC standard meteorological parser. Source: https://www.ndbc.noaa.gov/data/realtime2/45004.txt and https://www.ndbc.noaa.gov/station_realtime.php?station=45004. Return fields always label measurements as **regional open-water context, NOT nearshore Grand Marais beach observations**. The station is over 50 km from the Grand Marais study area. No local wave-to-shore transfer, bathymetric refraction, spectral transformation or weather safety judgment is assumed.

The adapter checks for HTTP errors, invalid format, missing data, freshness, UTC timestamps and unavailable station observations; a stale or failed reading never causes a calm/search recommendation. Six deterministic adapter tests use a fixture that mirrors the NDBC 45004 data columns, including intermittent missing WVHT. It is a backend prototype, not yet deployed or scheduled.

**Still required before a meaningful wave opportunity verdict:** retrieve nearby offshore/nearshore **NOAA GLWU gridded** HTSGW/wave direction at properly validated wet-cell(s) for each shore, resolve actual waterline exposure directions from surveyed/reviewed geometry, apply seasonal ice, nearshore hazard and wind/wave settling safety vetoes, and backtest actual storm episodes. Never use remote station 45004 measurements as a precise beach prediction.

## Status, tests and next action

- User-facing discovery assumption: **APPROVED FOR RESEARCH PROTOTYPE**, not an official legal permit or guaranteed open/accessible status.
- Grand Marais beaches: **two public visit locations**, **one officially described rockhounding lead**, **one sheltered control**, **zero certified rock-removal permissions**, **zero beach-level live wave verdicts**.
- New tests: four discovery-tier tests in `rockhounding-grand-marais-verification.test.js` and six NDBC-adapter tests in `rockhounding-superior-wave.test.js`. The previously committed twenty-one research tests (six wave parser, eight access/geometry, seven municipal gate) remain; the branch now has **31** deterministic tests in total.
- PR #1001 remains draft, no production deployment or SEO claim.
- **Exactly one next development priority:** build a NOAA GLWU small-area wet-cell sampler and compare exposed Agate Beach to sheltered Bayshore Park for a dated storm episode, with independent local shoreline normals and explicit missing-data handling. No municipality email required.
