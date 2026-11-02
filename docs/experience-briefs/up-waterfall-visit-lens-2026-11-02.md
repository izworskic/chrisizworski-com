# U.P. Waterfall Visitability Lens — Experience OS v1.2.1 / Issue #1258 B55
Reviewed November 2, 2026. Owning repository izworskic/chrisizworski-com. Canonical https://chrisizworski.com/upper-peninsula-waterfalls/. Primary change: source-backed choice-making for 72 curated destinations; not a new indexable page.

## Visitor decision / evidence gap
**Question:** Given the U.P. region, intended date and maximum on-site time, which waterfall **might be reasonable to research**, and what important access caveat could make it unsuitable?

The prior map and 72 cards could identify waterfalls, but left a visitor to infer seasonal gates and estimate whether a 45–90-minute walk would fit a 60-minute stop. A generic "Exclude known closure" filter hid known closed entries but still included a research-only location. The map used a green-looking marker for the research entry. A giant original hero preceded the first actionable decision. A saved itinerary did not show season-aware caution.

No live opening API or waterfall-specific flow model exists across 72 sites. This release is **NOT an open-now prediction**, real-time route verifier, road-distance calculator or water discharge forecast. No additional GIS points, promoted route, alleged public easement, private parking lot, live camera or data-storage infrastructure.

## Two external primary examples / source scope
- **NPS Pictured Rocks waterfalls and Munising Falls** (checked 2026-11-02): https://www.nps.gov/piro/planyourvisit/waterfalls.htm and https://www.nps.gov/places/munising-falls.htm . NPS distinguishes waterfall experience from signed route, seasonal access and documented Munising trail closure (April 2025 washout). NPS states visitor-center parking may remain accessible while waterfall trail is not.
- **Minnesota DNR Gooseberry Falls self-tour** (checked 2026-11-02): https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html . The 30–45-minute and 45–90-minute walks are explicitly different experiences, and only a particular upper approach is maintained in winter. Lesson: use the HIGH end of the time range; a minimum is not a confident fit.
- **Michigan DNR Porcupine Mountains** (checked 2026-11-02): https://www.michigan.gov/recsearch/parks/porkies . South Boundary Road between Headquarters Road and Pinkerton, plus M-107 at Whitetail, close to vehicles December 1–late spring. We mention that some approaches are affected, rather than claiming all western U.P. falls or every road is closed.
- **Michigan DNR Bond Falls**: https://www.michigan.gov/recsearch/parks/bondfalls . Site's usual seasonal vehicle window does not confirm today's gate.
- **MDOT 2026 roadside park notice**: https://www.michigan.gov/mdot/news-outreach/pressreleases/2026/10/15/mdot-roadside-parks-set-to-close-for-season . Most roadside parks close; does not certify Fumee, Agate or Tioga specific gates.
- **USFS Black River works**: https://www.fs.usda.gov/r09/ottawa/alerts/black-river-waterfall-platforms-and-trails-undergoing-major-repairs . Site-specific construction/closures, not a blanket river shutdown.

## Two materially distinct concepts
**A. Real-time "Open waterfall now" map:** visually appealing green pins, flow and parking claims. Rejected: no comprehensive official access/open sensors, reliable road network, or verified live flow for 72 locations. Would reward false precision.

**B. Access-aware decision desk (selected):** source-grounded date and full-time budget filter, three modest visitor candidates, explicitly described caveats, selected fall ID synchronized with CARTO and existing saved-stop comparisons. Static HTML provides the full 72 profiles and official citations without JavaScript; no algorithm claims current opening.

**Originality / distinctiveness:** This differs from the site's Gooseberry single-park route chooser and Sleeping Giant trail decision model. It compares **heterogeneous waterfalls across the whole U.P.**, where visitor safety and location completeness differ by manager, instead of implying one traversable park route. Its core interaction is a time/caution evidence desk, not a photo carousel or route polyline. Layout uses waterfall ink-and-paper interpretation, source-first trip notes and a constrained deck of three; not cloned Experience OS cards. Shared technology and accessibility are deliberate, not a mandatory skin.

## State, interaction and source contract
Selected ID = curated data-id on each HTML card. Region, date and upper on-site minute limit are preferences, not agency permissions. Inputs and causal output:
- Region: synchronizes the existing U.P. dropdown, visible card pool and map pins; choosing "All" explicitly warns that matches are not a day trip.
- Time: selects only stops with parsable two-ended minute ranges whose **upper** value is at or below the budget. Unmeasured visits are excluded from bounded results, not silently assigned a duration.
- Date: adds scoped warnings for Bond Falls; MDOT-managed parks; and named Porcupine Mountains roads in winter. It neither suppresses all other roads nor predicts reopening.
- Status: known closures and research-only entries are never promoted as candidates. "Verified arrival" describes stored source review, not current conditions. Seasonal/restricted entries retain caution.
- Select suggestion / marker: maps stable ID back to the existing Leaflet marker; map symbol is a fall coordinate, never driving arrival. Selected stop and shortlist retain source cautions.
- No matches/no tile/no JavaScript/stale source: relevant full HTML list, original agency sources, and explicit unknown remain available. No invented ETA, route geometry, parking or status badge.

Selection A→B→A, search and region filters, date changes, no-JS, map offline, unknown time, date far beyond the research window, keyboard and 360/390/768/1440 layout are browser acceptance scenarios.

## Safety / SEO / infrastructure scope
Same hub canonical, visible author Person graph, structured ItemList (70 indexable destinations among 72 curated records), sitemaps, data/up-waterfalls.json and 97 research candidates unchanged. No new page, API, photo asset, extra dependency, map tile provider, ad placement, Redis, Supabase or sensor. The information sources were checked Nov 2; individual waterfall source dates vary. No visitor outcome measurement has been made.

## QA scorecard (not invented)
Decision 25, originality 15, interaction 15, truth 15, imagery 10, mobile 10, performance 5, integration 5. Proposed design meets the conceptual gates, but **scores are NOT MEASURED** until real branch browser/screenshots, full repository gate and production smoke. Reject merge on failed categories. No GA4 conversion uplift claim.

Next validation: targeted node regression; deterministic source inventories unchanged; GitHub full repo check, waterfall Chromium mobile/map smoke, name-SERP guard, Vercel preview; inspect screenshots and verify the merged production page independently.
