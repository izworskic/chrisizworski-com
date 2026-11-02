# Garden Pest Watch: goal-led execution prompt, value and loss governance
Date: 2026-11-02. Owner: izworskic/chrisizworski-com. Source research: issue #1416 and November 2026 Deep Research dossier.
Canonical proposed: https://chrisizworski.com/michigan-garden-pest-watch/
Status: feature branch; NOT a production claim.

## REWRITTEN MASTER EXECUTION PROMPT

Act as a multidisciplinary lead gardener, Michigan extension/IPM researcher, pest-phenology scientist, data engineer, UX designer, accessibility tester and release manager. Build Michigan Garden Pest Watch as a living, evidence-accountable home-garden scouting desk, not a generic pest calendar or pest encyclopedia. The visitor must be able to answer in under 60 seconds: "What should I inspect in my specific crops today or over the next week, where should I look, why now, what evidence justifies the alert, and what should I do if I find the pest?" Success means timely practical prevention, fewer avoidable losses, protection of beneficial insects, and transparent scientific uncertainty.

Read Deep Research findings, GitHub issue #1416, owning repo AGENTS.md, canonical Experience OS v1.2.1, existing garden-tool value gate and seasonal-intelligence source contract. Use authoritative MSU Enviroweather, USA-NPN, NWS, Cornell NEWA, MDARD and Extension sources. Independently verify every numeric heat model, original algorithm, accumulation start, upper bound, biofix, geography, evidence dates, licensing and image rights. The existing Jan-1 base-50 simple-mean seasonal-heat provider is useful environmental context; it is NOT interchangeable with pest-specific DD43 or single-triangle DD50/92 models. Do not silently scrape public model user interfaces as if they were licensed APIs.

Implement a Garden Watch Desk user journey that differs materially from the existing Michigan Gardening question directory and Leafcutter Bee lifecycle tool. Show an immediately useful seasonal scouting action first; visitor-selected crop, plant stage, ZIP/city and self-reported findings change the answer. Keep independent evidence lanes: (1) qualified modeled biological stage when validated, (2) current official weather favorability, (3) dated verified regional reports or state detection, and (4) gardener self-reports. Never confuse these lanes; no local "confirmed infestation" from weather, regional or volunteered input. When data is missing, explicitly show UNKNOWN and fall back to correctly labeled seasonal scouting. Demonstrate selection A→B→A, keyboard, 360/390/768/1440 responsive, no-JS and outage resilience; don't add a fake pest heatmap.

Offer 12–17 source-anchored pest modules with stage-specific prevent / scout / if-found steps. Cabbage maggot and Japanese beetle are quantitative-model candidates but must remain REFERENCE_ONLY until exact math, historical inputs and authorized data access are validated. Squash vine borer is seasonal scouting first: MSU's public model page does not document its complete algorithm. Other pests use sourced crop/season scouting rather than fabricated thresholds. Prefer mechanical/cultural and beneficial-preserving IPM; do not recommend exact pesticide brands, doses, spray schedules or imply organic means harmless.

Use existing node/Vercel static-site tools, shared Census ZCTA adapter, official NWS API and existing phenology architecture. Do not add Redis, an unneeded Postgres database, geolocation prompts, opaque AI diagnosis, unlicensed imagery or undocumented paid APIs. Build complete engine, API, page, test suite, benchmark ledger and integration plan; propose PR. Do not merge to auto-deployed main until full repository CI, source rights/science, all Experience OS gates and real browser checks pass. Record separate implemented, tested, deployed and live-verification states; never invent measured traffic, outcomes or usage.

## OBJECTIVE AND GOVERNING VALUE FUNCTIONS
Scores apply only to measured proof. NOT MEASURED is not a passing grade. These are product QA ratings, never pest outbreak probabilities.

**V1 Gardener Decision Value: 35 percent of overall.** Crop-stage correct action 25, prevention lead time when scientifically supported 20, practical inspect/why/next 20, first-answer friction 10, beneficial protection 10, take-away/share utility 15. Gate >=90/100. Test beginner, Midwest zucchini, upper Michigan cabbage, tomato in August, fall cleanup, changing crop/stage and source outages. Time-to-answer target <60 seconds in observed usability tests.

**V2 Scientific Evidence and IPM Integrity: 35 percent.** Algorithm provenance/parity 25, evidence-kind truth 20, geographic/age precision 15, host-stage correctness 15, source rights 10, safe IPM 15. Gate >=95/100. **Infinite LOSS / release veto:** incorrect or substituted DD algorithm; forecast misreported as observed local pest; missing data interpreted as low risk; unsafe/unregistered pesticide prescription; unlicensed source/photos; invented detection county or expert identification. Audit separate rates for misleading alerts, misses, stale sources and bad crop matches, never bury in an aggregate score.

**V3 Experience OS visitor value: 20 percent.** Use canonical 100-point OS v1.2.1 scorecard: decision 25, distinctiveness 15, causal interaction 15, source/rights 15, visual 10, mobile/accessibility 10, resilience 5, integration 5. Gate >=90/100 AND every category >=4/5 AND distinctiveness veto passed. Browser screenshots and actual interaction inspection required; unmeasured is not passed.

**V4 Reliability and site integration: 10 percent.** Deterministic tests 25, source failure/freshness 20, responsive/keyboard/no-JS 20, SEO/card/ItemList/sitemap/registry integrity 20, production verification 15. Gate >=90/100, and npm run verify:all green on proposed merge revision.

Weighted score = .35 V1 + .35 V2 + .20 V3 + .10 V4. Overall target >=92/100 AND every threshold and veto satisfied. Cost/loss optimization: expected useful decisions × affected crop coverage × source confidence / implementation + annual operation/maintenance; decorative UI without changed gardener decision scores zero utility.

## MEASURABLE PORTION BENCHMARKS

| Portion | Minimum evidence | Current status at kickoff |
| --- | --- | --- |
| Scientific catalog | >=12 host/stage-scoped, sourced, independently reviewable pest modules; three distinct model candidates accurately represented | Research references exist; expert parity unmeasured |
| Deterministic engine | >=12 persona and invariant tests; zero false local confirmations or invented DD | Not yet tested |
| NWS official weather | <24h source issue freshness; 72h weather characterization; error/stale -> unknown, never zero-risk | To build/test |
| Page and UX | First-screen decision, changed crop-stage, shareable state; 360/390/768/1440, A→B→A, no JS, keyboard and outages | Browser NOT MEASURED |
| Sourced visual ID | All embedded photos have clear author, license, original URL; otherwise link to official field ID | Embedded photos deferred until rights proved |
| Biological forecasts | Distinct, model-specific actual inputs; multi-year hindcast parity; event date residual reports before predicting | BLOCKED pending method/access/validation |
| Site integrity | Release record, discovery, ordered JSON-LD, sitemap, canonical, full CI and independent production smoke | NOT MEASURED |
| Outcomes | Task success, useful actions and repeat visits observed; GSC comparisons in complete 28-day windows | NOT MEASURED |

## SCIENTIFIC REGISTRY AND EVIDENCE CONTRACT
Store modelId, version, taxon, hostCrops, event, region, algorithm, lowerF, upperF, start date or verified biofix, threshold, source, checkedAt, rights, validation dataset, error statistics and release status. Input must record grid/station ID, coordinate meaning, observed/forecast designation, issue time, last sampled time, missing days and version. An existing generic Jan1 base50 simple-average total is NOT an eligible input for the USA-NPN Japanese beetle Jan1 single-triangle 50F/92F model. If missing model inputs, emit MODEL_UNAVAILABLE and show sourced seasonal guidance. No derived fake exact dates or numerical property-level pest probability.
Evidence status vocabulary: SEASONAL_REFERENCE, CONDITIONS_FAVORABLE, BIOLOGY_MODELLED, REGION_REPORTED, GARDENER_REPORTED, OFFICIAL_COUNTY_DETECTION, UNAVAILABLE. User reports must not be called expert confirmed.

## BUILD ORDER
1. Inventory source and rights, inspect owning source contract and two adjacent garden designs; choose Watch Desk, not imitation of existing card grids.
2. Implement verified crop-stage prevention, where-to-scout and after-identification actions for 12–17 important Michigan pests.
3. Add deterministic, season-aware decisions and explicit NWS forecast-only hot/dry or wet signals; no implied model calibration.
4. Use existing Census 2020 Michigan ZIP interior-point resolver, explicit Bay City city default and accurate spatial disclaimers.
5. Build distinctive readable accessible Watch Desk, specimen/source links and shareable state with useful HTML-first/no-JS fallback.
6. Run tests for seasonal timing, crop/stage, self-report, weather outage/stale, source truth, no risk percent, link/state reversible.
7. After validation, integrate separately licensed authoritative source outputs and modeled events, one taxon/version at a time; hindcast and prospectively observe spring 2027.
8. Run full repo CI/real browser/accessibility/Experience OS checker, add Tools card and exact visible-order ItemList, sitemap and registry, capture PR and production smoke before claiming shipped.

## PRIMARY SOURCES (reviewed 2026-11-02)
MSU cabbage maggot: https://enviroweather.msu.edu/crops/coleCrops/cabbagemaggot
MSU squash vine borer, incomplete public model method: https://enviroweather.msu.edu/crops/cucurbits/squashvineborer
USA-NPN Japanese beetle: https://www.usanpn.org/data/maps/forecasts/Japanese_beetle
USA-NPN forecast algorithm matrix: https://www.usanpn.org/data/maps/forecasts
NWS API: https://www.weather.gov/documentation/services-web-api
MSU pest scouting: https://www.canr.msu.edu/uploads/resources/pdfs/pest_scouting_in_vegetables.pdf
UMN home garden insects: https://extension.umn.edu/yard-and-garden-insects
MDARD state detection: https://www.michigan.gov/en/invasives/id-report/insects/spotted-lanternfly
MDARD product registration: https://www.michigan.gov/mdard/licensing/pesticide/pestregistration
Additional original sources, permissions and unknowns: https://github.com/izworskic/chrisizworski-com/issues/1416
