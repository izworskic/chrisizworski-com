# Calumet River Freighter & Bridge Watch — first implementation

**Owner:** izworskic/chrisizworski-com. **Reviewed:** 2026-11-22. **Source:** public/calumet-freighter-watch/index.html, public/calumet-freighter-watch/guide.json, public/assets/calumet-watch-*. **Status:** noindex development route; PR review required. This is not evidence that the page is publicly deployed.

## Visitor decision

Where can someone legally watch a commercial ship and the spectacular bridge machinery on Chicago's Calumet River, and what does the available evidence actually say about a ship being nearby?

The first screen is a compact industrial title, truthful AIS status, and large working-river map, with two explicit public choices: (1) the general public-sidewalk area by the 95th Street Bridge, subject to verifying sidewalk closure and public approach on arrival; (2) Calumet Park's public lakefront, where specific channel sightlines remain unverified. Bridge and ship markers never imply public access.

## Existing boat tools reused without changing them

- Read-only use of the existing `/api/freighter-ais` feed. The Calumet region-bound core independently applies the same 30-minute check/position timestamp model and source-credit handling found in Cuyahoga. No changes to the existing endpoint, tracked ship data, Soo Locks, Welland, Freighter Central, Cuyahoga, or Detroit River tools.
- Existing `/assets/visitor-map-links.js` for place-only Google Maps searches, not directions to bridge pin markers, private docks, terminals or moving ships.
- Static Leaflet 1.9.4 plus OpenStreetMap tiles with visible attribution, the pattern used in existing river maps. The page has a no-JavaScript plain-text fallback.
- Shared visual idea of indicative AIS cargo/tanker/tug/passenger categories, not copied CSS and not exact hull geometry.

## Experience Investment: competing concepts

**Option A — general vessel ledger (rejected):** A live-ship list above a small harbor map. It replicates the broad Great Lakes tracker and doesn't solve the public place / bridge machinery visitor problem.

**Option B — industrial river observation desk (selected):** A large bridge-corridor map, one connected public-place detail and source-bounded vessel positions. A stand-alone manually operated inline SVG double-leaf bascule diagram explains how lift bridges work without implying an actual opening. Distinct from Cleveland's bending-river public-park decision and Soo Locks' chamber flow. No generic cloned multi-card snow dashboard.

Mobile prioritizes the chart and the selected public view, with the recent AIS receipt and source caveats secondary. Bridge selection updates the same detail panel. The manual SVG control is keyboard-operable and has a reset button; reduced motion does not prevent learning. No animated ship route or ETA interpolates between AIS fixes.

## Source ledger (sources available online, no paid subscription)

- Ship-watching destination: https://www.chicagomag.com/city-life/the-best-place-in-the-city-to-watch-boats/ and https://www.chicagomag.com/chicago-magazine/august-2024/best-of-chicago/place-to-wait-for-your-ship-to-come-in/
- Public park: https://www.chicagoparkdistrict.com/parks-facilities/calumet-park
- Official chart context and bridge references: https://nauticalcharts.noaa.gov/publications/coast-pilot/index.html; archived reference https://websites.umich.edu/~lpt/Divegeek/CoastPilot6.pdf
- Current marine notices *external link only*: https://www.navcen.uscg.gov/local-notices-to-mariners-by-cg-district
- Industrial port context: https://www.iipd.com/about

Coordinates are broad reference points, not surveyed bridge spans, legal parking locations or certified visible/safe sidewalk positions. Exact public sightlines and current closures not established. No industrial facility is a visitor viewing destination. No historical AIS positions or bridge-opening schedules have been fabricated. Live AIS commercial use follows the owner's existing site permission assumption and preserves upstream credits when provided; actual provider contract not inspected.

## Technology fitness

Use HTML/CSS for responsive first answer, native links and accessible fallbacks; vanilla browser JavaScript for Leaflet, local guide selection, and same-site AIS observations. The original SVG bascule diagram is a teaching aid and not a measured representation. Python/Rust/Java not selected because no forecast model, heavy GIS job or performance bottleneck is justified. No new Vercel function, paid service, Redis, production dependency, cron, or geolocation.

## Verification and publication gate

Targeted Node tests: `node --test tests/calumet-watch.test.js`. Required for merge: full `npm run verify:all`, verified route/JSON-LD/canonical/noindex conditions and five-viewport real Playwright at 360, 390, 768, 1280 and 1440 px; real map tile load, 95th → Calumet Park → 95th selection, bridge selector, live fresh/stale/unavailable states, upstream attribution, no-JS fallback, keyboard/focus, reduced motion, mobile overflow and AdSense placement. Do **not** call browser/CI or post-deploy acceptance passing unless actual logs and screenshots substantiate them.

Keep off sitemap, site Tools directory and indexation until a separately approved reviewed launch. Existing Auto ads and identity are not altered. Do not auto-merge.
