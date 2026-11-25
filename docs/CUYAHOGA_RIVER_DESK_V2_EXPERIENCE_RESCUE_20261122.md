# Cuyahoga River Desk v2 · Experience Investment / Foundry improvement

Owner: izworskic/chrisizworski-com. Source: public/cuyahoga-freighter-watch/index.html, public/assets/cuyahoga-watch.css and app/core JS. Baseline: main, merged PR #1841. Checked: 2026-11-22. Intended output: reviewed PR; **no merge or deployment authorized**. Preserve noindex, Person and canonical, existing Auto ads, source credits and the 30-minute AIS evidence gate.

## Visitor job
I want to see a freighter from the Cleveland riverfront. Which publicly managed place gives me the experience I want, and are there any genuinely recent AIS observations that justify watching now?

## Observed failure
Desktop and 390px mobile Playwright screenshots from PR #1841 were reviewed as full-page captures (browser-verified static page with a simulated AIS fixture, **not independent proof of live Cleveland AIS coverage**). The first mobile screen is mostly header, vague prose and status before a small pin-filled river map; the place decision is a stack of identical little cards below a placeholder focus box. Desktop wastes a wide upper region on typography, while the important map covers only part of the page width. Dense technical caveats and the engineering bridge catalog compete with public viewing places. Many elements use similar white rectangles and type sizes. The static page does have valuable 4 Metroparks sites, 1,002 real NOAA archived fixes, 19 bridge references, and source-safe no-ETA behavior. **Preserve the useful engine; redesign presentation, not source truth.**

## Source-backed evidence
- Cleveland Metroparks Scranton Flats Pier: https://www.clevelandmetroparks.com/parks/visit/parks/lakefront-reservation/scranton-flats-pier · exact park page explicitly recommends watching cargo ships negotiate bends
- Cleveland Metroparks Rivergate Park: https://www.clevelandmetroparks.com/parks/visit/parks/lakefront-reservation/rivergate-park · signed riverfront park and ship-channel caution
- Cleveland Metroparks Lakefront Reservation: https://www.clevelandmetroparks.com/parks/visit/parks/lakefront-reservation · Heritage, Wendy, regional access
- NOAA Historical AIS: https://coast.noaa.gov/accessais/ · discrete recorded positions, not continuous route or ETA
- NASA? Not applicable. This is an urban river, not a rocket- or weather-forecast tool.
- Inspiration: NOAA nowCOAST observation/time distinction https://oceanservice.noaa.gov/facts/nowcoast.html, NPS app place-first public visit model https://www.nps.gov/subjects/digital/nps-apps.htm, Flightradar24 history/time split https://www.flightradar24.com/blog/inside-flightradar24/playback-is-now-available-in-the-flightradar24-app/ . These references describe mechanisms, not copies or claims of visual inspection.

## Opportunities
1. **First-screen decision**. Remove decorative hero and make map + four public choices available before the first scroll. Existing HTML/Leaflet and public park catalog; medium effort; critical risk map/list sync or missing no-JS fallback.
2. **Selection detail**. Replace vague initial "Choose a park or a bridge" with Scranton Flats as a featured sourced *visit suggestion*, with its exact park URL. Keep selected park/bridge/ship state, direct reported-distance and history handoffs; medium effort; risk framing a park as open now or a recent AIS count as an ETA.
3. **Evidence restraint**. Move attribution/legal explanation and full bridge inventory under accessible disclosure; keep seen-time and report count immediately visible. CSS/HTML and native details; low effort; risk hide source that visitors need. The source must remain accessible, so never remove these paragraphs.
4. **Meaningful interpretation**. Tighten unsupported generic language and add a short interpretive river chapter below the tool; optional exact-location credited photo when legal rights are verified. No giant scenic hero or AI-generated real-place imitation. Medium risk for photo rights.

## Two materially different concepts
**A. Vessel ledger**: first phone screen is an observed-report ticker and one narrow table, then map and public places. Very fast for frequent ship spotters, easy to build, but without public decision first it reproduces the general freighter tracker and makes new visitors ask "where do I stand?"
**B. River observation desk, SELECTED**: compact site identity and truthful AIS evidence strip; a large river canvas as dominant stage; four directly selectable public places as the primary action; one responsive selected-place dossier with managing-agency link; distinct observation and history modes. On desktop, the right bank of the map hosts place selection; on mobile, an easy-to-scan place ribbon appears at the map edge. Source proof and the dense 19-crossing catalog remain one tap away. Empty AIS state is a normal honest observation, not a broken visit planner. Distinctive estuary/industrial chart identity without generic card grid. Retains real map and source facts. No new dependency.

Comparison: unlike the **Great Lakes Freighter Tracker** (region-wide vessel monitoring), the Cuyahoga desk organizes by *public place and winding-river geography*; unlike the **Soo Locks** viewing tool (watch one chamber), it highlights several publicly accessible park perspectives along an industrial waterway, with separate ship-history evidence. Map and spot detail are synchronized; report status and visit guidance are separate evidence types.

## Technology Fit
- HTML/CSS: **keep/rebuild layout**, semantic static park destinations, first answer, site integrity.
- Browser JS + Leaflet: **keep**; existing state/markers/NOAA historic scrubber can be retained, with small connected-state enhancements if necessary.
- Node serverless: **keep existing AIS** only; no new endpoint, polling subscription, paid feed, or cron.
- Python: **no new production role**; existing offline Playwright Python smoke already meets QA needs. Source analysis unchanged.
- Rust/WASM: reject; five bridge markers and 1,002 archived fixes do not demonstrate a computational bottleneck.
- Java: reject; no Java integration, JVM deployment cost unwarranted.
- React/MapLibre/3D: reject; native controls and Leaflet already solve the task, avoid CPU and layout fragility.
- Photography: no image until correct-rights verified and the site actually benefits. Exact destination photos must never be invented.

## Review constraints / test journeys
- Default 390px: within first screen, visitor sees river-first UI and a concrete public park action; map occupies significant width; no status-banner/card stacks.
- A source-verified park is highlighted; selecting Rivergate from map or list updates same detail and map center, supports back and keyboard.
- Recent AIS / 2025 NOAA history: manual controls retain state, source date and no-future-prediction contract.
- No AIS / stale / unavailable, no tile / no JS: still actionable managing-agency park links and plain-English observation limitation.
- Original NOAA, Coast Pilot, USCG source references remain accessible; no bridge ETA or access promise.
- 360, 390, 768, 1280, 1440 browser screenshots + keyboard, reduced motion, map tile real load and no-JS fallback.
- Full tests and repository gates before any merge, and post-deploy smoke only after authorization. No asserted SEO/AdSense uplift without measured data.

Design principles read: Experience Investment, Experience OS v1.2.1, Foundry 0.3, design reconnaissance, browser QA and web-quality audit. REA and Penpot are explicitly opt-in for specifically named targets; the owner asked for broadly applicable skills, not an external Penpot workspace or runtime install. No unrelated plugin is a substitute for a verified code-and-browser result.

## November 22 next investment: the vessel bend explained

The original concept promised a visitor-readable answer to **why a long freighter seems to turn around a corner**. The v2 ship map and archived AIS fixes could locate a vessel but did not yet teach that geometry. Research checked against the [Port of Cleveland's navigation safety guidance](https://www.portofcleveland.com/tourism-recreation/tools/safety-guidelines/) and [Case Western Reserve's Encyclopedia of Cleveland History](https://case.edu/ech/articles/c/cuyahoga-river) supports narrow navigation bends and historic channel adaptation; neither source supplies a measured three-stage trace. Do not use a fictional freighter animation as current AIS, an actual path, bridge clearance evidence or a certified turning model.

- **Alternative A, REJECTED:** Animate a ship marker between archived NOAA AIS broadcasts on the real Leaflet map. That would visually fabricate continuous traveled positions between discrete reports, confuse visitors with the current AIS feed and imply reconstructed bridge crossings without ground truth.
- **Alternative B, SELECTED:** A source-labeled, deliberately non-geographic top-down SVG channel diagram below the live visitor decision. A long rigid hull follows a **simplified** S-shaped guide, with three manually selectable moments, a native slider, and an optional pausable teaching animation. The interpretation updates with the illustrated stage, never with map or archived AIS state. The shape, dimensions and timing are not to scale and not measurements. With JS missing, first stage and explanatory prose remain visible.

**Technology / boundaries:** Inline semantic SVG + scoped CSS and 4.6 kB vanilla JS, no Canvas, React, PixiJS, Rust, Python data pipeline, Java runtime, new dependency, map tiles or production function. Control state is local to the diagram; the shore-watch selection spine remains untouched. Native step buttons and range input, pointer/keyboard, disabled controls until initialization, browser visibility cancel, reduced-motion autoplay suppression, ARIA stage state and HTML text fallback. Port and local river history sources linked beside the diagram. No navigational instructions, AIS replay fabrication or source forecast claims.

**QA contract on this change:** Add a focused source/contract test and run Playwright on 360, 390, 768, 1280, 1440. Verify manual A→B→C→A exact transform restore, range input and reset, disabled playback under reduced motion, no horizontal overflow, map status and NOAA history separation, actual diagram screenshot, keyboard and no-JS static explanation. CI and public deployment status must be captured from the latest head; no old green workflow can validate the new demo. The existing noindex release gate remains unchanged. Future bridge ETA still requires independent physical/passage ground truth.
