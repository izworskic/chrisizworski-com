# Michigan Ski Hills | skills audit and experience investment | 2026-11-24

## Ownership, evidence, and visitor task

Canonical: https://chrisizworski.com/michigan-ski-hills/ in `izworskic/chrisizworski-com`. The hub is generated from `scripts/generate-michigan-ski-pages.mjs`; interaction lives in `public/assets/michigan-ski.js`; the existing API and `lib/michigan-ski/official-reports.js` supply resort/NWS data. Do not commit generated destination subpages.

Visitor task: "Which resorts have lifts confirmed open now, and what official opening dates could I plan around?" The 2026-11-24 production API at 06:25 ET showed 0 confirmed open, 1 confirmed closed, 5 undated zero-lift listings, 16 operator-report links, and only 1 current dated operator status. Official opening plans were available for 6 operators. This does NOT establish that all other resorts are closed. The failure is information navigation and source completeness, not evidence that more resorts should be marked open.

Primary sources already approved in code are operator pages. Ski Brule's November 23 update states Thanksgiving November 26 remains a weather-dependent opening target: https://skibrule.com/brule-mountain/snow-conditions/. Dates in the existing build-time table remain source-attributed, qualified plans, not live lift reports. An undated number or forecast cannot certify operations. No third-party aggregated status is promoted to ground truth.

## Two distinct designs compared (Experience Investment and Foundry)

A. **Two evidence questions, same board (chosen).** First screen: operator-confirmed open and closed counts with checked time, then the native "Open now" and "Opening plans" filters and area selection. The first isolates dated reports; the second shows the six existing operator-published plans in date order with source links and explicit non-confirmation. The lower resort comparison applies the same filter and area. If all feeds fail, the static 17-row operator opening table and caveats remain useful. Mobile: no giant chart or decorative image, small native controls. Desktop: same evidence hierarchy and space for comparisons. Cost: three client assets plus focused tests, no new function/feed.

B. **Full opening-season calendar.** First screen would show a dated strip of all 17 hills, allowing week-by-week filtering. Rejected: 11 of 17 have no supported operator opening dates; a largely empty timeline wastes first-screen space and encourages visitors to assume missing dates. Future credible dates may justify the calendar later, but historical/projected dates must never be silently substituted.

Closest site comparators: Michigan Snow Totals (observations and time windows) and Michigan Snowmobile Trails (official source freshness and regional browsing). Reuse their evidence/provenance discipline, not their page skin. The selected ski design is operator-status-first rather than a map-first snow forecast or broad trail list.

## Relevant skill applications

| Skill or family | Decision and work |
| --- | --- |
| experience-investment; Experience OS; Experience Foundry | Diagnosed dated-versus-undated source gap, compared two feasible designs, chose targeted evidence filters, source failure contract and unchanged indexable answer |
| playwright-browser-qa | Extended the real generated-page browser test to 360, 390, 768, 1280, 1440 pixels, five filter/area transitions, source-down, undated counts, reduced motion and no-JS |
| web-quality-audit, accessibility, SEO, performance, core-web-vitals, best-practices | Added Ski Hills to isolated axe-core and Lighthouse CI pilot. Static fallback, main heading, metadata, canonical and critical accessibility issues checked. These are lab tests; live CrUX, GSC and ad impact are NOT MEASURED |
| plain-voice | Replaced generic empty-filter language with concrete status explanations; preserved pinned 159-word answer, source facts and title |
| public-data-scout | Reviewed existing 16 operator-controlled pages and six sourced plan entries; no new feed, no inferred lift report, no altered source timestamps |
| vercel-cost-guard | Adds 0 Vercel functions, 0 production crons, 0 paid features, 0 builds per day from automation. GitHub PR checks run an additional existing lab workflow; this consumes runner minutes, not Vercel production infrastructure |
| return-visit-design | Seasonal return contract below. Did not add distracting follow-up prompts or unproven subscriptions |
| design-reconnaissance | Compared with Snow Totals and Snowmobile tool interaction patterns; no externally hosted design tool or unlicensed media needed |

## Other installed agent skills: review and scope

The repository has 32 skills under `.agents/skills`. All were considered for applicability; *reading a skill is not execution of an unrelated tool*.

- **No measured case for this work:** computed-windows (astronomy); editorial-diagrams (no verified new structure to diagram); interactive-2d-scenes (no animation); stitch-concept-review (third-party concept generation unnecessary); skill-eval (no skill definition edited).
- **Deferred behind evidence and owner value:** my-spots-offline (save favorite hills and last-check comparison may warrant a later release), condition-alerts (a subscribed feed requires a verified change/event contract), return-metrics (GA4 returning share unavailable). No push notifications.
- **Not justified by a measured task:** hf-cli, hf-forecast-benchmark, hf-semantic-discovery, hf-visual-evidence, huggingface-best, huggingface-datasets, huggingface-tool-builder, transformers-js. No model weights or text embeddings can replace current operator report timestamps.
- **Tool-specific or permission scoped:** agent-browser-qa (existing Playwright supplies reproducible browser evidence); penpot-design (not requested); rea (explicit reverse-engineering authorization absent).
- **Applied quality subsystems named individually above:** web-quality-accessibility, web-quality-audit, web-quality-best-practices, web-quality-core-web-vitals, web-quality-performance, web-quality-seo, playwright-browser-qa and plain-voice.

## Accessibility, resilience, source contracts

- The opening-plan filter and the dated open-lift filter are mutually exclusive and share the same regional state with the main resort list.
- Current dated reports remain the only source of verified open/closed status. A planned opening can appear beside an unverified operating status.
- The entire 17-row dynamic DOM is no longer a polite live announcement. A small status line announces count and selection; no-JS controls do not appear interactive.
- Semantic operator links and the build-time table remain in the HTML even when the API fails; no map/third-party tile changes, no modification of AdSense slots, Person JSON-LD, canonical URLs or source ownership.

## Technology fit

Keep generated semantic HTML and scoped CSS for the static answer, vanilla browser JS for reversible state, and existing Node/official/NWS API for truth. Python is unnecessary for this finite, nonnumeric filter. Rust/WASM is unnecessary for 17 rows. Java requires infrastructure without a visitor benefit. No new Vercel Function, cron, Redis, external parser, model, new route or production dependency.

## Seasonal return contract (no new feature from this review)

- Trigger: an operator transitions from zero/unknown to a dated open-lift report, or updates an officially published opening target. Changes can be observed by revisiting; no alert channel is added here.
- Save: a visitor might eventually save their two or three preferred ski hills locally. NOT IMPLEMENTED; first establish whether visitors actually use the opening-plan comparison.
- Changed answer: dated open/closed reports plus a named target and checked timestamp. No future guarantee. No artificial daily habit.
- Channels: none in this PR; no push, no subscriptions, no server-side identity.
- Measurement baseline: GSC click-through, GA4 returning share, AdSense and field CWV are NOT MEASURED for this PR.
- Success proposal: observe actual use and return traffic over a comparable early-season window before investing in saved hills or feeds.

## Release review and known limits

Expected gates: full-history `npm run verify:all`, changed-route generation, dedicated 360/390/768/1280/1440 Playwright QA, web-quality pilot axe and Lighthouse lab at 390/1280, no-JS, source failures, title/canonical/Person/ads checks. CI results belong in PR # and are not asserted as passing in this pre-merge document.

Known limitations: Most operator sites publish undated or unreadable status data. Source count is NOT confirmed coverage. Static opening targets are dated to November 24; they will need the next operator review. Local simulated browser responses cannot prove actual ski conditions. Any Lighthouse score is lab, not field. This branch is not merged or production-deployed.

**Exactly one next action:** inspect the exact-head CI and screenshots, then request owner review for a merge.
