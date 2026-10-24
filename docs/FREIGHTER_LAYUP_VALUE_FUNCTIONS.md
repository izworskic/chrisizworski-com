# Winter Layup: Review, Value Functions and Release Benchmark

> Baseline review retained below. Chris approved the paired desktop/phone direction on October 24, 2026. Implementation uses the same criteria; candidate evidence is appended at the end.

Chris Izworski · October 24, 2026 · Baseline: `af6da58c7d495d2453791845c6ba9b0a1ee3e40b`

**Decision:** strengthen the existing canonical tool. Prioritize a shorter path from arrival → ship → winter record → source → return. Keep the warm maritime interpretation, real photography, curated identities and clear separation of historical and upcoming winters.

**Status:** audit and design concepts complete; implementation has not started. No production files, ad settings, ship evidence, canonical URLs or live tracking tools changed. Desktop and phone concept images are layout proposals; their schematic map is not geographic evidence.

## What was actually checked

- Read the current HTML, CSS, interaction code, evidence/identity model, registry, biography renderer and tests from the owning repository, `izworskic/chrisizworski-com`.
- Main's latest Agent branch verification was successful at audit start.
- Ran `node --test tests/freighter-layup.test.js tests/freighter-layup-biographies.test.js`: **14 passed, 0 failed**. These check data contracts, identity, attribution, deterministic biography generation and other source requirements; they are not human usability tests.
- Inspected the live page and exercised the existing release preview in Chrome: alias search, ship detail, closing detail, all-lakes reset, full filter reset, winter switching, an irrelevant harbor in an earlier winter, empty search, archive recovery, selection loss after reload and a permanent biography.
- Desktop viewport: 1363 × 936. Observed horizontal overflow: 0 px. On the live page, map top was approximately 1,616 px and search top approximately 2,642 px. Those distances include that session's ad layout and are not universal timing or Core Web Vitals measurements.
- On the release preview, the full fleet grid began around 2,426 px and Lee A. Tregurtha detail around 4,476 px: about **2,049 px past the start of the results grid**. Automatic scrolling reaches it, but comparison and return cost remain high.
- Phone runtime, permission-denied location, simulated network outages, screen-reader behavior and visitor completion times were **not measured**. Existing CSS and fallback code were inspected; this does not prove those runtime paths.
- GSC, GA4, AdSense, conversion and operating-cost attribution: **NOT AVAILABLE**. No impression, click, revenue or retention gain is claimed.

## The evidence worth protecting

| Winter | Records | Verified | Reported | Harbors | Photographs in registry |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2025–26 archive | 12 | 10 | 2 | 5 | 4 |
| 2024–25 archive | 2 | 2 | 0 | 1 | 1 |
| 2026–27 upcoming/unconfirmed | 0 | 0 | 0 | 0 | 0 |

The 2025–26 sample is Superior 6, Sturgeon Bay 3, Milwaukee 1, Owen Sound 1, Toledo 1. This is a partial documented archive, not a fleet-wide layup rate. All map locations are approximate harbor references, not ship positions, individual docks or public entrances. American Spirit and Manitoulin remain reported records. A stationary or missing AIS signal must never become layup confirmation.

## Value function for every portion

Each portion has its own observable criteria and weights. For portion i:

`V_i = sum(weight_j × pass_j)`

Weights sum to 100 within each row. A criterion passes only with the named source or observed behavior. Partial credit is not invented. **P** means passed against the inspected artifact or observed desktop behavior; **F** means the inspected artifact fails the proposed benchmark. **Unmeasured** stays unscored. These are engineering rubric scores, not measured satisfaction or task-success rates. The rubric was established during this baseline review and must be frozen before implementation, then run unchanged on the candidate release.

| Portion and user value | Weighted benchmark criteria, with baseline outcome | Baseline |
| --- | --- | ---: |
| Opening: understand the tool and start | Intent explained in opening copy 20 P; archive/current distinction visible 20 P; search in first desktop viewport 30 F; map begins within one viewport 30 F | **40** |
| Winter selector: stay in the correct season | No future carryover 40 P; season totals update 20 P; stable cross-winter identity 20 P; harbor options limited to that winter's records 20 F | **80** |
| Coverage summary: understand what the archive covers | Correct season totals 30 P; partial-sample disclosure 25 P; all scope wording matches five-harbor data/static fallback 25 F; confidence totals for selected results presented locally 20 F | **55** |
| Search: find a known ship quickly | Curated aliases match 35 P; normalized punctuation matching 20 P; entry accessible on first desktop screen 25 F; recovery button inside empty result 20 F | **55** |
| Filters: narrow without getting stuck | Harbor filter works 25 P; berth filter works 25 P; offered harbors have records in season 25 F; all-lakes reset clears a ship query as well as harbor 25 F | **50** |
| Map: orient and select a documented harbor | Approximate-harbor meaning explicit 35 P; season pin counts correct 25 P; selection coordinates with panel/list 20 P; chosen harbor has visible active marker state 20 F | **80** |
| Harbor panel: discover the fleet and context | Listed ships open records 30 P; original source accessible 25 P; public-waterfront search avoids industrial routing 25 P; return wording scales beyond two harbors 20 F | **80** |
| Fleet results: compare without a long scroll | Vessel identity visible 30 P; evidence status visible 25 P; compact list option 25 F; direct evidence-status filter 20 F | **55** |
| Ship detail: understand this winter and keep context | Faithful berth/story summary 25 P; dated source/limits visible 30 P; detail adjacent to results or above them 25 F; close returns focus to originating ship control 20 F | **55** |
| Timeline: understand documented events | Events come from record 35 P; event dates displayed 25 P; each event links evidence 25 P; chronological ordering 15 P | **100** |
| Photography: recognize ships honestly | License/provenance in data/detail 30 P; historic photo/date labeled 30 P; explicit image-error fallback implemented 15 P; genuine photo coverage at least 80% of active sample 25 F | **75** |
| Biographies: follow one hull across winters | Authored sourced chapters 35 P; independent cross-winter rows 25 P; link back opens this vessel's selected record 25 F; context survives reload/return URL 15 F | **60** |
| Interpretation: learn what winter work means | Useful plain-language explanations 40 P; supporting sources/contextual links 30 P; a simple user-controlled explanatory mechanism 30 F | **70** |
| State and recovery: return or share without rework | Static archive/source fallback exists 20 P; URL encodes winter/filter/selected vessel 30 F; reload restores selection 30 F; archive failure offers an inline retry 20 F | **20** |
| Accessibility: operate without pointer precision | Named/labeled controls 25 P; opening detail moves keyboard focus 25 P; all custom action targets at least 44 × 44 CSS px 25 F; closing restores originating control 25 F | **50** |
| Load resilience: deliver useful content promptly | Static roster available 30 P; local Leaflet assets 20 P; optional biography fetch does not block core map/search 25 F; data-error retry without whole-page reload 25 F | **50** |
| Phone experience: complete the same tasks | 360/390/768 px, keyboard, touch, panel order, wrapping, maps and zoom ownership require actual runtime checks | **UNMEASURED** |

Photography's fallback pass is a source-code check, not a successful outage simulation. Timeline's 100 means only that its four stated engineering checks passed; it does not establish comprehension. Do not average phone/visitor unknowns into a flattering overall score.

## Observed defects and friction

1. “All Great Lakes” calls a harbor reset but preserves the name query. Searching Oberstar, then pressing it, still showed one result. Make this a true full-scope reset, and retain a separately named map-only fit action if useful.
2. In 2024–25 only Owen Sound has records, yet all five harbors remain selectable. Superior produces an empty panel rather than an informative choice. Derive options from the selected winter.
3. Ship detail is placed after every fleet card. Keep the selected record close to the map/results and provide a clear back action with preserved filters, scroll and focus.
4. Current selections are absent from the URL. Reload after choosing Owen Sound/Algoma Compass resets to the default winter and all harbors. Encode state with validated IDs; make Back/Forward behavior explicit.
5. Empty search offers instructions but no inline recovery action. Provide “Clear search” that preserves the selected winter and harbor, plus an obvious reset-all control.
6. Scope copy contains old assumptions: “Superior harbor archive” in the hero; “Show both harbors” in the selected panel; “single map marker” in methods; a three-harbor static panel heading despite a five-harbor archive.
7. Ship-specific photo coverage is 4/12 for 2025–26. Keep existing licensed photographs and fallback hull art. Research additional rights-verified images separately; never solve this score with a generated or wrong-vessel photo.
8. Optional biography metadata is awaited before map/search boot, with a seven-second timeout. Initialize the validated core registry first; progressively add biography links without clearing search or selection.
9. Several custom map/chip/card actions have CSS sizes below the 44 px benchmark. Increase targets, preserve focus visibility and respect reduced motion consistently.
10. A full-screen ad interrupted the live navigation review. This is a real observed session interruption, not a diagnosis of the earlier Chrome warning. Ad configuration was not changed. Account-controlled formats remain separate from page usability work.

## Proposed visual and interaction contract

- Preserve the navy, ivory, teal and restrained gold identity; shorten the opening so the task starts early. Keep the existing canonical, title/H1 decisions and full author identity under review rather than silently replacing them from a mockup.
- One compact toolbar contains winter, name search, harbor and Reset all. Berth and evidence-status refinements remain near results, without a second competing dashboard.
- Desktop: a genuine geographic map and compact fleet list sit together. Selecting a ship highlights its harbor and opens one nearby detail panel. Real licensed images belong in the selected record and can appear as compact thumbnails where helpful.
- Phone: compact introduction and controls, then map, selected detail when open, and compact results. No full-screen scroll trap, no hover-only facts, no hidden exit from selected state.
- Selection, filters, result totals, map emphasis, panel, season labels and URL share one validated state model. Browser history is part of the state contract.
- An SVG harbor-count graphic may compare only documented records for the chosen winter. Use a zero baseline, direct labels and keyboard-operable selection. It must say “documented records in this sample,” never “share of the Great Lakes fleet.” Data remains the registry; do not generate the numeric graphic as a bitmap.
- A small HTML/JavaScript winter-work explainer can let visitors step through documented general phases (arrival, winter work, return to service). It must be labeled interpretation, not a timeline prediction for a particular ship; specific repairs require ship-specific evidence.
- All factual text, numbers and image rights come from existing or newly verified source records. The concept images are visual references only.

## Reproducible acceptance journeys

Run on baseline and candidate with the same fixtures. Record actions, result count, visible labels, selection, URL, focus, errors and screenshot evidence. Do not alter the benchmark between those runs to manufacture improvement.

| Journey | Release expectation |
| --- | --- |
| First visit, desktop 1363 × 936 | Winter and search visible without scrolling; map begins within one viewport; archive/current distinction visible |
| Search Oberstar / James R Barker | Correct alias identity; no fuzzy cross-hull merge; result count and filter scope clear |
| Search nonexistent ship | Inline Clear search restores same harbor/winter; Reset all restores full selected-winter archive |
| All-lakes reset after query/harbor/berth/selection | Query, harbor, berth and selected ship clear; all selected-winter records/pins restore; stale popup closes |
| Select 2024–25 | Two records, one harbor; no unsupported harbor choices; Algoma Compass/Oakglen only |
| Select 2026–27 | Zero sourced locations; no old ship markers; “not confirmed yet” means missing evidence, not proof the fleet is sailing |
| Select Manitoulin or American Spirit | Reported badge and correct lower-confidence explanation visible; excluded from verified count |
| Select Lee A. Tregurtha | Correct historical berth, dated source, story, photo attribution; detail close to evidence rather than after full grid |
| Close ship detail | Same filters and results retained; focus returns to the originating ship action |
| Map harbor / fleet action / filter | Same harbor and selection state; active emphasis visible; map-only fitting does not unexpectedly erase a search |
| Share, reload, Back, Forward | Known winter/harbor/berth/query/vessel restore; invalid IDs safely normalize; no script injection or duplicate history spam per keystroke |
| Cross-winter vessel jump | Same curated hull identity, independent dated berth, correct season context |
| Biography round trip | Biography links to the actual selected winter record; no new present-location claim |
| Archive JSON fails, then recovers | Honest failure label, static sources retained, inline Retry works and does not duplicate listeners |
| Biography metadata stalls/fails | Core map/search usable without waiting for optional metadata; selection stays intact when links arrive |
| Photo fails | Correct fallback, no misleading photo-year ribbon; identity and source remain readable |
| CARTO/Leaflet fails | Appropriate basemap fallback or readable harbor/list alternative; no permanent loading spinner |
| Location denied/unavailable | Clear message and usable harbor selection; no invented public access route |
| 360/390/768/1440 px and 200% zoom | No page overflow; 44 px custom actions; no obscured selected panel/close; controls and text wrap |
| Keyboard and reduced motion | Visible focus, natural order, no map trap, restored close focus; no forced smooth animation |

Engineering release gates: every relevant journey passes, zero new runtime exceptions, zero evidence/identity/current-season violations, deterministic biography generation intact, no legacy shipping/ice API changes, valid canonical/Person/byline metadata, appropriate freshness/source registration, and the repository's full `npm run verify:all` passes before a PR. Run browser checks through the authorized browser interface; the existing standalone Playwright script was not run in this review.

Rubric targets for the next candidate: opening/search/filters/details/state recovery at least 85; season/map/harbor at least 90; no regression in sourced timeline, photos, biographies or static content. A score threshold never overrides a failed evidence or interaction hard gate. Photo expansion and visitor research remain separately disclosed until actually completed.

Visitor benchmark after engineering acceptance: at least five representative people attempt “find a familiar ship,” “explain where/when it laid up and confidence,” “compare its other winter,” and “return to all records.” Record actual completion, confusion, time and backtracking. Targets: at least 90% unaided completion; median familiar-ship discovery under 20 seconds; no participant mistakes archive pins for live positions. These are proposed targets, not results and not a statistically representative population study.

## Implementation order and investment value

Prioritize `benefit × affected task frequency × measured deficit ÷ implementation effort`, with evidence integrity as a hard constraint. Task-frequency assumptions stay explicit until analytics or user research exist; do not invent numeric ROI.

1. Unified state, valid winter options, meaningful reset, inline recovery, URL/history and focus return. Definition of done: corresponding journeys pass on desktop and phone.
2. Compact toolbar/map/list/detail composition. Definition of done: approved desktop/phone direction, shorter observed task distance, responsive/keyboard/zoom checks pass.
3. Progressive optional metadata, retry/error handling and source/static copy corrections. Definition of done: outage/slow-source paths retain usable core content.
4. Add the sample-only harbor comparison and general winter-work explainer only when they improve a stated learning task. Definition of done: direct labels, accessible controls, source framing and correct non-predictive semantics.
5. Expand licensed photography and observe visitors. Record unavailable photo rights and unmeasured behavior honestly.

**Exactly one next action:** approve or revise the paired desktop/phone concept direction, then implement the first candidate against this frozen benchmark in the existing repository. No layout implementation or merge has occurred in this review.


## Approved implementation candidate — October 24, 2026

Implemented: compact atlas toolbar, adjacent desktop map/list with selected detail below the workspace and before results on narrow screens; sample-only SVG harbor counts; evidence filter and ordering; validated shared URL/Back/Forward state; winter-specific harbor/berth options; full reset; inline recovery and retry; close focus return; non-blocking optional biographies; links back to independently dated winter records; general-process educational stepper. Existing registry, photo licenses, evidence classes and source events are unchanged. Title, description, canonical and Person schema remain; H1 now states the find-and-follow task approved in the concept.

New automated evidence: `node --test tests/freighter-layup*.test.js` passes 24 tests, including ten actual-application handler journeys. Native state tests isolate network and map drawing; they do not certify rendered layout. Full repository gate: all 59 steps passed on the initial candidate. Browser and responsive evidence will be recorded in the PR after checking the rendered preview.

Local visualization specialist pass: the map owns geographic orientation at harbor precision; DOM buttons with zero-based SVG bars compare only the selected winter's documented sample counts; the fleet list is the keyboard alternative; selected details carry source and season beside the claim. No voyage interpolation or current-season extrapolation. Direct labels and native buttons provide the text fallback; SVG marks are decorative to assistive technology. No new chart dependencies or API polling. The initial selected state is the full latest documented archive, with the upcoming season explicitly unconfirmed.


## Candidate acceptance evidence — October 24, 2026

- Added `npm run benchmark:freighter-layup` to the full repository gate. Final focused suite: 26 tests, including twelve application-handler journeys. Full repository gate: 60 steps passed. The PR's real-browser CI smoke passed on desktop 1320×950 and mobile 390×844. It blocks external imagery and basemap requests to test image fallback and local-map initialization. The initial image smoke failure was a test attempting to scroll an already-hidden failed image; it now scrolls the visible art container and retains the fallback assertion.
- Browser preview verified alias search, all-lakes reset, selected-harbor emphasis, source/confidence totals, 2024–25 two-record/one-harbor isolation, unconfirmed-winter zero pins and archive recovery, selected detail, keyboard focus return, reload restoration, Back/Forward, and a 2024–25 Algoma Compass biography round trip to the same record. A settled selected detail heading was 18 px from viewport top.
- Narrow iframe viewports verified actual responsive layouts, search/open/close, refinements and empty-search recovery. Frames were 390/360/768 px wide; desktop scrollbar leaves document content widths 375/345/753 px. All had 0 px horizontal overflow. Final phone map begins around 706 px; first phone candidate was 1,172 px. Custom atlas controls measured at least 44 px high. These are responsive browser checks, not physical-device touch or screen-reader certification. The temporary noindex QA fixture was removed after use.
- Desktop first candidate: search top about 306 px, map top about 642 px; both occur in the opening 936 px viewport. The original live-page distances included a different ad layout, so do not treat the before/after distances as a controlled performance or ad-delivery experiment.
- Remaining unmeasured runtime cases: 200% browser zoom, actual geolocation permission denial, full screen-reader operation and physical-device touch. Data-load failure/retry, absent Leaflet and stalled optional enrichment are exercised by actual-handler fixtures. Human visitor completion/learning and traffic/revenue outcomes remain unmeasured.

The frozen component criteria are now satisfied in opening (40→100), seasons (80→100), coverage (55→100), search (55→100), filters (50→100), map (80→100), harbor panel (80→100), compact fleet (55→100), selected detail (55→100), timeline (100→100), biographies (60→100), interpretation (70→100), state/recovery (20→100), named controls/targets/focus (50→100) and load resilience (50→100). Photography stays **75→75**, with four genuine registry photos out of twelve records; rights research was not replaced with generated imagery. Phone has verified responsive cases and remains unscored as a whole.

A component's 100 means its explicitly listed binary checks pass. It does not mean the tool is perfect or visitors have been observed succeeding. Do not weaken thresholds or remove missing observations to claim a sitewide quality score.

Exactly one next action: owner reviews the completed PR/preview and chooses whether to merge. Exact final SHA and CI state belong in the PR release record.
