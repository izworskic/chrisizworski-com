# Apostle Islands Explorer · evidence and release ledger
Research reviewed: October 27, 2026. New canonical: `/apostle-islands/`. Companion, not competitor, to Lake Superior Circle Tour's multi-state road itinerary.

## Primary user problem
Visitors confuse (1) a mainland sea-cave hike, (2) guided sea-cave sea kayaking, (3) sightseeing cruises that remain aboard, (4) island landings and lighthouses, (5) the separate Madeline Island vehicle ferry, (6) backcountry camping, and (7) rare winter ice-cave access. The explorer resolves the access/time/transport choice rather than copying the Circle Tour.

## Source ladder
- [NPS visitor planning](https://www.nps.gov/apis/planyourvisit/index.htm) – management jurisdiction and itineraries; 21 NPS islands, mainland section, Bayfield context.
- [NPS Meyers Beach](https://www.nps.gov/places/meyers-beach.htm) – parking, vehicle length, trail length and steep rocky terrain.
- [NPS sea kayak safety](https://www.nps.gov/apis/planyourvisit/kayaking.htm) – open-water boat specs, reflected waves, rescue skills and cold-water hazard.
- [NPS commercial services](https://www.nps.gov/apis/planyourvisit/commercial-services.htm) – authorised operators; no implied landing on sightseeing cruises.
- [NPS camping](https://www.nps.gov/apis/planyourvisit/camping.htm) – campsite reservations, transport and tent-only sites.
- [NPS infrastructure projects](https://www.nps.gov/apis/learn/infrastructure-projects.htm) – *dated 2026* Little Sand Bay construction/reduced parking and Devils Island marina rehabilitation/closure. Reverify for the visitor's travel season.
- [NPS ice caves](https://www.nps.gov/apis/learn/nature/caves.htm) – formal opening is the access gate, not ice percent or appearance.
- [NWS LSZ150 marine forecast](https://marine.weather.gov/MapClick.php?zoneid=LSZ150) – regional weather; not site-specific safe launch verdict.
- [UW Sea Caves Watch](https://wavesatseacaves.cee.wisc.edu/) and [Friends Wave Watch](https://friendsoftheapostleislands.org/wave-watch/) – site-specific wave monitoring, **temporarily unavailable when buoys are removed**; last readings must never be silently interpreted as current.
- [Apostle Islands Cruises](https://www.apostleisland.com/fares-schedules/) – published cruise lengths and seasonal schedule, not a purchase guarantee.
- [Madeline Island Ferry](https://madferry.com/frequently-asked-questions) – passenger/vehicle transport, distinct island outside NPS National Lakeshore.
- [Wisconsin DNR maritime cliffs](https://dnr.wisconsin.gov/topic/statenaturalareas/ApostleIslandsMaritimeCliffs) and [maritime forests](https://dnr.wisconsin.gov/topic/statenaturalareas/ApostleIslandsMaritimeForests) – sensitive cliffs, island forest ecology.
- [USGS island water resources](https://www.usgs.gov/publications/water-resources-apostle-islands-national-lakeshore-northern-wisconsin) – geology/hydrology context, no current launch or parking inference.
- [NPS geology atlas](https://www.nps.gov/articles/nps-geodiversity-atlas-apostle-islands-national-lakeshore-wisconsin.htm) – sedimentary origins and geomorphology.
- [Federal GIS tract/boundary](https://catalog.data.gov/dataset/apostle-islands-national-lakeshore-tract-and-boundary-data) – legal geographic jurisdiction only; boundaries do **not** identify launch permission, slip availability or a safe landing.
- [NPS IRMA portal](https://irma.nps.gov/DataStore/Reference/BrowseByUnit/APIS) – conservation source archive, not live visitor availability.

## Photo audit
Production photo sources are exact Commons file-level records:
- `Apostle Islands Sea Caves.jpg` – photographer DataThread, Commons CC BY 4.0.
- `A group of kayaks resting on the shore and a people getting a safety talk before heading out to the sea caves. (1bdb50e6-9d44-44e8-919d-fd0226f2ba93).JPG` – NPS, Commons public domain.
- `The lighthouse and utility buildings on Raspberry Island. (ea984e19-3d72-4166-9839-0e3c32892990).jpg` – NPS, Commons public domain.
- `Apostle Island Sea Cave in Winter.jpg` – Jeff the quiet, Commons CC0 1.0.
Source, creator and license link appear at every figure. Verify HTTP image responses and actual loaded crops in rendered 390px and 1366px before merging. Archival photography is explicitly not claimed as current access.

## Baseline behavior
- All nine option cards, access distinctions, direction hyperlinks, and primary source links are present in static HTML and discoverable without JavaScript.
- Leaflet map displays verified orientation landmarks only; Sand Island is *not* a dock/navigation waypoint.
- Filters are progressive enhancements and do not make safety decisions.
- CARTO tiles are configured by same-origin endpoint, with OpenStreetMap fallback and readable no-script directions. No new server-side service or Redis.
- No ad configuration/style changes were made outside the page's own scoped presentation.
- Existing Circle Tour owns road itinerary intent. Explorer owns choosing access and experiences in the Wisconsin islands.
- New schema/registry/sitemap listings verified with CI, not inferred from link existence.

## Release gate / open checklist
- [ ] `npm run verify:all` on final commit SHA, all required GitHub checks green.
- [ ] Vercel preview ready and route responds 200 with correct canonical; no production merge until verified.
- [ ] Desktop/mobile 1366/390 browser visual QA; 4 images load and have accurate subjects/credits.
- [ ] Leaflet shows multiple map tiles, four pins, zoom/popup and fallbacks when CARTO config fails.
- [ ] Verify filters, keyboard, no sideways scroll, reduced-motion mode and no-JS content.
- [ ] Validate NPS construction status and operator season before next annual season.
- [ ] Merge only after green gates and rendered QA; smoke-test live URL and record final SHA.
- [ ] Measure the specific canonical URL in GSC after a comparable observation period; no ranking or revenue claims before data.

## Island access decision layer — October 27, 2026

The next visitor-value investment is **one substantial island-by-island comparison on the existing indexable canonical**, not thin unvalidated child pages. The NPS site publishes documented docks, 17 trails for the eight curated islands below, and designated campsite requirements. The authorized cruise operator publishes island *types* of seasonal transport. These are separate categories of evidence: a dock is not a landing guarantee, a campground permit is not a transport booking, and a lighthouse named on a cruise route does not imply a landing.

### Eight island dossiers
| Island | NPS named public dock | Walk/experience evidence | Camping / transport qualification |
|---|---|---|---|
| Stockton | Presque Isle east/west; Quarry Bay | Julian Bay 0.4 mi; Anderson Point 1.4; Tombolo 2.8 | NPS designated accessible and group sites; operator seasonal day and overnight shuttles; bridge/wade alert |
| Oak | West dock | Loop 5.2; Overlook 1.8 (overlook 3.5 from dock); Sandspit 1.5 | Overnight camping shuttle, **not** promised day roundtrip; designated camping |
| Sand | East Bay | Lighthouse 2.0; Wellisch Cabin 0.6 | NPS accessible site 3/group C; unverified routine shuttle; private docks and West Bay Club excluded; old campsite coordinates unreliable |
| Raspberry | Light station east/west docks | West Bay 1.0; Sandspit 0.75 | Seasonal lighthouse tour; no designated campsite; excluded from primitive zones |
| Michigan | Light station dock | Sandspit 1.0; Lagoon 0.5 | NPS campsites; operator lighthouse tour listing; landing on selected trip must be confirmed |
| Rocky | East dock | West 1.0; South 0.9; North 0.45 | NPS campsites; no scheduled shuttle verified; private land around Group A protected |
| Basswood | West dock | 5.5-mile farm and quarry loop | NPS campsites; no scheduled shuttle verified |
| Devils | Southern marina **closed** | Historical Boathouse 1.0 **not offered as a route** | 2026 marina rehabilitation; campsites closed, no primitive zone. Recommend viewing only when conditions/operator permit |

### Primary evidence
- [NPS island hiking trail descriptions](https://www.nps.gov/apis/planyourvisit/trails-at-the-apostle-islands.htm) — names and trail lengths, reviewed Oct 27, 2026.
- [NPS boat docking table](https://www.nps.gov/apis/planyourvisit/boating.htm) — named landings; conditions and depths can change.
- [NPS park map and docks](https://www.nps.gov/apis/planyourvisit/park-brochure.htm) — geography, not GPS-perfect safe navigation.
- [NPS designated campsite directory](https://www.nps.gov/apis/planyourvisit/campsite-directory.htm) — per-island sites; **Sand Island campsite coordinates currently being updated by NPS**.
- [NPS camping practice and fees](https://www.nps.gov/apis/planyourvisit/camping.htm) — all camping permits and transport independent.
- [NPS primitive zone exclusions](https://www.nps.gov/apis/planyourvisit/primitive-camping-zones.htm) — excludes Devils/Raspberry among others.
- [2026 NPS construction alerts](https://www.nps.gov/apis/learn/infrastructure-projects.htm) — Devils dock remains closed until repair; Little Sand Bay launch remains open with possible delays.
- [NPS formal closure compendium](https://www.nps.gov/apis/learn/management/superintendents-compendium.htm) — Devils docks/boathouse closure.
- [NPS conditions and alerts](https://www.nps.gov/apis/planyourvisit/conditions.htm) — dated warnings, private inholdings and Stockton washed-out bridge.
- [Authorized concessioner shuttle options](https://www.apostleisland.com/hiking-and-camping-shuttles/) — Stockton seasonal day and overnight; Oak overnight; departure and return both must be reserved; 2026 season should not be depicted as current after October.
- [Authorized operator tours](https://www.apostleisland.com/fares-schedules/) — Raspberry and Michigan lighthouse experiences; not proof any future departure is bookable.

### Safety, editorial and measurement gates
- Keep eight evidence-backed dossiers in static HTML sourced from `public/apostle-islands/island-access.json`. This source document is a research dataset, not a live API; do not treat its review date as measurement freshness beyond October 2026.
- No invented boat taxi bookings, public ferry routes, precise dock or campsite coordinates, estimated paddling times, or safe-launch decisions.
- Explicit absence of public landing on Devils; closed campsites not presented as reservable.
- Intent filters and comparisons only change presentation, never unlock access.
- Separate newly expanded visitor intent ("which island should I visit?") from Circle Tour's road itinerary intent; no new thin indexable pages.
- Run full source tests plus dedicated real Chromium (390px/1366px), check no-JS static dossier evidence, accessibility, license attributions, broken links and existing field guide regressions.
- Commit only verified changed files. CI+Vercel must be green before merging; post-merge public route and canonical 200, new cards and interactions smoke-tested.
- Compare canonical `/apostle-islands/` GSC discovery in equivalent 28-day periods when data exists; cannot claim ranking uplift on publication.

## October 27, 2026 · Before You Leave Bayfield decision engine

### Why another layer?
The first two releases identified eight promising islands, their historic/official trail inventory, and named public docks. They did **not** yet answer the principal traveler decision: can a selected day or camping plan be arranged given the visitor's transport mode, group size and date? The incremental user value is **preventing bad bookings**, not adding unverified locations.

### Inputs and output contract
- User selects from eight existing island dossiers; chooses day trip or overnight, transport type (scheduled excursion, NPS-listed water taxi, private boat, none), departure date if known, party size 1–21 and 1–14 nights.
- Deterministic client-only logic (no Redis or booking integration) outputs a source-linked logistics **sequence**, never a safe-to-launch or current booking verdict.
- Before a trip is marked *conditionally plan-able*, reject Devils Island landings; reject overnight Raspberry; reject group-size 8–21 camping on islands without NPS-listed group sites; and reject a no-water-transport plan.
- The 2026 regular Stockton day/overnight and Oak overnight operator services are only *historical published offerings*. Oak day service is unverified. Raspberry and Michigan lighthouse tours are conditional on a verified landing and individual date. Other regular shuttles are not invented.
- User-selected date controls the NPS individual-site 30-day reservation-window explanation, but cannot check inventory. Group campsites operate on a March annual lottery/reservation process; do not apply the individual 30-day window to groups.
- NPS says campsite permits are not the emailed confirmation: visitors print the actual permit inside seven days of arrival or obtain it at Bayfield.
- Any ferry/shuttle return pickup is a separate booking decision. NPS commercial-services source warns of weather delays and schedule changes.
- Published campsite rates reviewed in October 2026: $15 per individual site/night, $30 per group site/night, plus $10 per trip reservation fee, excluding transport; not a live quote or availability. These facts must be reverified for future seasons.
- Copyable trip brief is on-device only and carries current verification disclaimers. Original visitor cards and full island source list remain readable without JavaScript; the static source-led booking checklist is server-rendered.

### Verified primary sources
- [NPS camping permits and reservations](https://www.nps.gov/apis/planyourvisit/camping-permits-reservations.htm) — trip length up to 14 nights, 30-day standard booking window, group lottery March, print permit within seven days, distinct $10 reservation fee.
- [NPS camping](https://www.nps.gov/apis/planyourvisit/camping.htm) — 1–7 individual sites, 8–21 group, published historic per-night fees, accessibility and group site inventory.
- [NPS concessioner shuttle types](https://www.apostleisland.com/hiking-and-camping-shuttles/) — Stockton day and overnight, Oak overnight; outbound and return bought separately. 2026 published dates must not be interpreted as a future-season guarantee.
- [NPS authorized commercial services](https://www.nps.gov/apis/planyourvisit/commercial-services.htm) — NPS lists authorized taxis, but does not approve any imagined itinerary, response, or launch.
- [NPS public dock guidance](https://www.nps.gov/apis/planyourvisit/boating.htm) — dock space first come, depths variable, navigational expertise and charts required.
- [NPS 2026 construction](https://www.nps.gov/apis/learn/infrastructure-projects.htm) and [NPS alerts](https://www.nps.gov/apis/planyourvisit/conditions.htm) — closure evidence, to be revalidated for visitor date.
- [NOAA/NWS marine forecast](https://marine.weather.gov/MapClick.php?zoneid=LSZ150) — regional forecast, not a safe-landings prediction.

### Release gates
- Static source and regression tests ensure eight previous cards, 17 verified trail claims, author links, Ads behavior, sitemap and original Circle Tour stay untouched.
- Chromium QA asserts conditions for Devils, Raspberry, Oak day vs overnight, unverified group-site inventory, party-size lottery, 30-day window, and no boat; no-JS checklist; desktop/mobile screenshots and maps must remain green.
- Full `verify:all`, emitted output audit and Vercel preview must pass on exact commit, before a merge.
- SEO outcome not measurable until actual GSC observation data; no new indexable route, duplicate tool page, or ad configuration change.

## October 27, 2026 · source freshness and 2027 rollover guard

**Problem:** The island-by-island planner stores a 2026 snapshot, and the scheduled-shuttle product menu shows dates without stating a new season. A user consulting the page in 2027 must not mistake the 2026 shuttle dates or construction state for current access.

### Public-source findings (checked October 27)
- [NPS conditions](https://www.nps.gov/apis/planyourvisit/conditions.htm) last displayed its general page update date as September 2, 2026. Embedded alert widgets are dynamic. **No visible static alerts is not evidence of no active alerts.**
- [NPS Devils Island construction](https://www.nps.gov/apis/learn/infrastructure-projects.htm): 2026 project underway, marina remains closed until completed; Little Sand Bay public boat access maintained with potential construction impacts. Re-check after any update. Do **not** automatically remove dock/campsite closure based on an archive being old.
- [Operator seasonal Stockton/Oak shuttles](https://www.apostleisland.com/hiking-and-camping-shuttles/): published June 20–August 30 season, Stockton day and overnight, Oak overnight. Neither a yearless on-page date nor a link to a booking button establishes future-season operation or available seats.
- [Cruise tours](https://www.apostleisland.com/fares-schedules/): Raspberry and Michigan island lighthouse products listed; actual landing, available departure and return require a separate operator check.
- [NPS API getting started](https://www.nps.gov/subjects/developer/get-started.htm): parkCode `apis` API alerts require a personal API key. This release neither invents a key nor scrapes a JS widget pretending to be an official API feed.
- [NPS permit rules](https://www.nps.gov/apis/planyourvisit/camping-permits-reservations.htm): 30-day individual and March group reservation logic; all fees, windows and sites subject to source review before travel.

### Implementation
- The canonical `/apostle-islands/` now has a six-source **static** source desk with reviewed date, next-editorial-review dates and official source links. The site does not claim to poll NPS alerts or concessioner ticket inventory in real time.
- Client JS updates reviewed/overdue/archived badges using the visitor's local calendar date. A current page view does not renew the historical 2026 evidence.
- Once June–August 2026 season has ended, the shuttle outcome explicitly changes to **Archive only · next season unverified**, while retaining the underlying published product descriptions and reservation requirements.
- `scripts/check-apostle-sources.mjs` checks stable visible text from public NPS construction and concessioner page(s), with timeout and explicit `changed` vs `unavailable` reports. It does **not** claim a completed source scan proves docks, permits, sea caves or ferry services safe/open/current.
- `.github/workflows/apostle-islands-source-watch.yml` runs weekly Tuesday and on manual dispatch. When a baseline signal disappears or a fetch fails, it creates a single open manual-review GitHub issue, without modifying visitor pages or quietly renewing an evidence date. A source change must be manually investigated and the snapshot revised only with grounded facts.
- The monitor is **drift detection**, not a complete NPS conditions feed. The workflow needs standard GitHub Actions issue write permission; if GitHub restricts this, the run fails visibly instead of claiming an issue was filed.

### Release/testing policy
- Source watch offline tests exercise changed sources, unreachable sources, scripts hidden in HTML, and no-live-verification semantics, including no API keys/Redis.
- Existing static-content tests protect all 8 island guides, 17 trails and 9 activity cards. Browser QA checks 390px phone, 1366px desktop, source desk, archive labels, actual Leaflet tiles and no-JS source links.
- Preserve author identity, all existing indexable canonicals, Circle Tour navigation and existing AdSense setup. No new indexed URL or ad changes.
- Full repository verify, browser QA, emitted-output audits and Vercel ready before merge. SEO outcome unmeasured.

## October 28, 2026 · NPS dock-to-trail arrival field desk

### Research investment
Until this change, the island planner had eight island dossiers and 17 hiking trails but mostly generic named landings. NPS publishes a **public dock table** with individual shore docks and historical published depth ranges, a separate **hiking trail directory** with actual trailheads and mileages, and a **campsite directory** with named sites and special accessible connections.

The public `/apostle-islands/` guide now pairs the three sources in **11 landings across eight islands**: 10 NPS-listed public dock locations and one expressly **closed** Devils Island south landing. These are not all 21 islands, nor inferred safe beach landings. Raw research inventory: `public/apostle-islands/landing-evidence.json`, last reviewed October 28, 2026.

| Island | NPS dock descriptions and published depth ranges | Grounded trail / campsite relationship |
|---|---|---|
| Stockton | Presque Isle west 6–7 ft, east 4–7 ft, Quarry Bay 5–6 ft | Julian Bay 0.4 mi from Presque Isle visitor area, Quarry Bay link 3.6 mi, Quarry Trail 1.5 mi. NPS says west dock boardwalk to accessible site #1, Quarry Bay dock boardwalk to group sites A/B. Prior bridge washout affects overland plans. |
| Oak | West dock 4–5 ft | 5.2-mi island loop; 1.8-mi overlook spur with NPS statement that overlook lies roughly 3.5 mi from dock. Campsite locations vary; do not treat sandspit as adjacent to dock. |
| Sand | East Bay dock 2–3 ft | Lighthouse trail 2.0 mi; Wellisch Cabin 0.6 mi. NPS reports accessible site #3 and group C from dock by boardwalk; older campsite GPS coordinates under correction. No maintained trail from East Bay to Lighthouse Bay sites 4/5. |
| Raspberry | Light station west dock 5–6 ft, east 3–4 ft | Two lighthouse-area forest trails; **no** designated campsite or primitive overnight option. |
| Michigan | Light station dock 3–5 ft | Sandspit 1.0 mi, lagoon 0.5 mi; bog route can appear to end. Island tour does not guarantee a landing. |
| Rocky | East dock 6–7 ft | North 0.45, South 0.9 and West 1.0 mile; NPS North Trail past campsites 4/5/A. Private inholding restrictions. |
| Basswood | West dock 2–4 ft | 5.5-mi quarry/farm loop; near-dock short branch to camps A/5/6, other sites by quarry. |
| Devils | **South landing struck through in NPS dock inventory, closed during rehabilitation** | Historic Boathouse Trail 1.0 mi is **not** offered as an accessible walk or landing route. No depth range shown. |

### Sources / safety constraints
- [NPS public docks](https://www.nps.gov/apis/planyourvisit/boating.htm): published ranges are broad, vary with lake levels, sediment and storms; dock space has no guarantee. **These are not current navigation clearances.**
- [NPS island hiking](https://www.nps.gov/apis/planyourvisit/trails-at-the-apostle-islands.htm): exact NPS trail names, distances, trail starts, and caution descriptions. We avoid falsely adding trail segments to infer trip length/time.
- [NPS campsite directory](https://www.nps.gov/apis/planyourvisit/campsite-directory.htm): official named sites, boardwalk accessibility, Sand Island coordinate corrections. Site descriptions do not establish reservations/availability.
- [NPS island transport](https://www.nps.gov/apis/planyourvisit/getting-to-the-islands.htm): 21 NPS islands require water access; Madeline Island is not an NPS island and uses a separate ferry.
- [NPS construction](https://www.nps.gov/apis/learn/infrastructure-projects.htm): Devils marina closure requires future manual revalidation. We do not treat the struck-through historic dock as public.
- [NPS park conditions](https://www.nps.gov/apis/planyourvisit/conditions.htm): critical decision must be rechecked for visitor date.
- Road map links navigate to the **Bayfield waterfront** and **Little Sand Bay visitor area** only. There is no inferred water route, berth coordinate, paddling duration or safe-launch indicator.
- Keep original eight island static dossiers, trail directory, source freshness desk, and 2026 archived transport honest. No new indexable pages or ad changes.

### Quality and release gates
- Unit source assertions verify exactly 11 dock records, 10 listed, 1 closed, 8 islands, 10 sourced NPS published depth ranges, no GPS points and 8 reciprocal island links.
- Browser QA verifies filter changes across Stockton (3 docks), Raspberry (2), Sand (1), Devils (1 closed), all (11), and source-only no-JS presentation, with screenshots at 390px/1366px.
- Trip brief retains proposed dock's name as **something to verify**, not a booking. Source citations and date remain the authority.
- Full `verify:all`, public rendered HTML audit, Vercel preview and exact-head checks must pass before merge; production deployment and page smoke after merge.
- Growth measurement not yet established; a new user path exists from Circle Tour → Apostle Islands → island → actual dock → trip brief, but GSC/GA should be assessed later rather than claiming engagement improvements.

## October 28, 2026 · Visual NPS Island Atlas and campsite reference layer

### Design decision: honor two different maps
Visitors need **trail geography** and **campsite geography**. These are distinct evidence types. NPS already produces original island maps with its own mapped trail linework and shoreline categories. The NPS campsite directory publishes site latitude/longitude for most islands. Redrawing trail polylines from narrative distances would invent actual alignments and give a dangerous impression of navigability. This release therefore shows both sources separately:

1. **Eight original NPS illustrated island maps** on `/apostle-islands/#island-atlas`. These are official map images, sourced from `https://www.nps.gov/apis/planyourvisit/maps.htm` (last published map update June 29, 2026). The guide includes 24 *NPS-described* trail segments (some historical or closed) and a short caution for each island, with enlarge-to-original and official trail-directory links.
2. **42 point locations from the NPS campsite directory** (`https://www.nps.gov/apis/planyourvisit/campsite-directory.htm`, NPS directory last updated February 9, 2026) on a Leaflet/CARTO-fallback basemap. These are dated reference positions only. The layer never generates trails, on-water routes, harbor positions, site availability, site-to-dock distances or safe-launch metrics.
3. The campsites are supplied via a small static `public/apostle-islands/island-atlas.json`. Every location has an official island and NPS site identifier, latitude and longitude. The in-page source-linked static HTML remains readable with JavaScript off or when the map data request fails.
4. **Sand Island has zero campsite dots.** NPS explicitly warns that its campsite coordinate table is **in the process of being corrected**, instructing visitors to use camping maps and on-site signage. We cite the official image and note that accessible site 3 and group C are documented, without guessing where they are.
5. **Devils Island has zero campsite dots.** NPS's historical directory oddly repeats the same latitude/longitude for Cat 1 and Devils 1. Coupled with the reviewed Devils south marina closure and campsite restrictions, the atlas withholds that misleading point and offers no landing recommendation.
6. **Raspberry Island has zero campsite dots** because it has no designated campsites or primitive-camping zone.
7. Stockton includes 21 NPS-dated site positions; Oak 7; Rocky 6; Basswood 7; Michigan 1; 21+7+6+7+1=42. Published accessible/boardwalk connections are explicitly noted only for Stockton campsite 1 and Quarry Bay group sites A/B. Other sites are not labeled accessible.
8. The UI is usable at 390px and 1366px, with island tabs, source-led hiking summaries, map site-type filters, clickable site records, a distinct visual group-site treatment, and direct handoffs to verified dock evidence and trip readiness.
9. Public site URLs and indexability remain unchanged. No Redis, paid map credentials in client HTML, AdSense changes, speculative route generation, or false ferry/campsite availability.

### Original official sources
- [NPS original island maps](https://www.nps.gov/apis/planyourvisit/maps.htm): eight direct map images in that page's own image collection. The island map is the canonical *visual trail alignment*, not our campsite point overlay.
- [NPS Trails at the Apostle Islands](https://www.nps.gov/apis/planyourvisit/trails-at-the-apostle-islands.htm): names, distances, trail caution and access limitations. NPS still lists historical paths on Devils; historic linework does not override closure.
- [NPS Campsite Directory](https://www.nps.gov/apis/planyourvisit/campsite-directory.htm): the per-site coordinate table, Sand Island correction caveat, accessible boardwalk sites, and site distinctions.
- [NPS Construction](https://www.nps.gov/apis/learn/infrastructure-projects.htm): historic Devils Island marina closure requiring recheck for each future season.
- [NPS park conditions](https://www.nps.gov/apis/planyourvisit/conditions.htm): do not infer landing clearance from map display.
- [NPS booking rules](https://www.nps.gov/apis/planyourvisit/camping-permits-reservations.htm): campsite permit is distinct from transport and availability.

### Release requirements
- `tests/apostle-islands-explorer.test.js`: exactly eight maps, 24 trails and 42 valid coordinates across five mapped islands, with Sand/Devils/Raspberry exclusions and no generated trail geometry.
- `scripts/verify-apostle-islands-browser.cjs`: responsive browser captures, selected island changes, all-site/group/accessible counts, site popup, original NPS map image load, correct withholding states and eight static island maps with JavaScript off.
- Full source/SEO/freshness gate; emitted-output audit; preview Vercel Ready; exact-head check green; post-merge production smoke.
- Analytics impact not yet measured. The new atlas should be linked internally from existing island dossiers and hero, but we will not create thin, duplicative indexable island URLs before independently verifying them.

## October 30, 2026 · NPS-verified dock → trail → campsite relationships

**Purpose:** The visual atlas previously showed 42 NPS campsite coordinates alongside eight original NPS trail maps but did not explain which dock, named trail and designated campsite truly connect. Visitors could mistake two nearby dots or an attractive NPS map for a guaranteed footpath. This release adds **21 source-grounded, three-stage planning sequences** across eight islands, without generating path lines, assigning invented walking mileage, asserting a dock open, or promising return transport.

**Evidence categories:** `boardwalk` means the NPS explicitly describes an accessible boardwalk between a named dock and campsite. `named-trail`/ `named-branch` means NPS identifies a named route connecting the area and campsite. `described-access` means the NPS campsite page describes proximity to a dock but not a fully surveyed path; *no named route or line* is implied. `day-trail`/ `day-only` names a visitor outing but makes no overnight campsite claim. `closed` blocks Devils Island south landing.

| Island | Verified visitor connections | Critical exclusions |
|---|---|---|
| Stockton | West Presque Isle dock boardwalk → accessible individual #1; Presque Isle Bay campground sites 2–19 described as along shoreline (no reconstructed trail); Quarry Bay dock boardwalk → accessible groups A/B; Quarry Bay site 20 about 0.25 mile west of dock; Julian Bay day trail from ranger station | Former inter-bay bridge washout requires current check, and site 21's unmaintained backcountry approach is not marketed as an easy water landing |
| Oak | West dock → sandspit trail → sites 1/group A; dock-side site 2/site 3/group B; Loop/Northwest Beach → site 4; Loop/North Bay → site 6; Loop/Overlook day outing | NPS trails and campsite directory disagree slightly about dock-to-site mileage (site 4 ~2.8 vs 3 miles; site 6 ~4 vs 3.7 miles). No false precision or plotted path geometry |
| Sand | East Bay dock boardwalk → accessible site 3/group C; Wellisch Cabin Trail → site 2/group A/group B; Lighthouse Trail → site 6; lighthouse day walk | NPS says campsite coordinates being corrected, so all Sand site markers remain withheld. No maintained trail to Lighthouse Bay sites 4/5 |
| Rocky | East dock/North Trail → sites 4/5/group A; near-dock sites 2 and 3 via NPS-described short walks | No invented trail to sites 2/3 and no assumption of crossing onto private land beyond group A |
| Basswood | West dock clearing/right-hand campsite branch → group A/sites 5/6; farm-and-quarry 5.5-mi loop as a day excursion | No claimed trail branch from the quarry to sites 1–4; NPS places them southwest of quarry but lacks a route sketch |
| Michigan | Light station → Sandspit/Campsite Trail → campsite 1 | NPS says site about 0.9 mile from light station while trail is listed 1.0 mile; do not offer a precise dock-to-site calculation |
| Raspberry | Lighthouse-area trail day visit, with verified operator landing and return as prerequisites | No designated campsite or primitive camping |
| Devils | Closed south marina visitor warning and historical-map clarification | No landing, campsite or alternate rock landing recommendation from a historical trail listing |

**Implementation:** `public/apostle-islands/verified-pathways.json` stores 21 records, each with NPS source URLs, three explicit planning stages, a named dock ID, associated campsite ID(s), evidence classification and a clear caution. All records are rendered **statically** into the single existing indexable guide. The island tab controls and the campsite filters remain compatible. Selecting an NPS-supported relationship highlights the corresponding *existing published campsite dots*; **it never draws a trail polyline**. Clicking a site dot reveals the related named source (when one exists) and selects its entry. A pathway can be handed to the existing trip readiness checklist; the copied brief includes the relationship and its caveat. Sand, Raspberry and Devils preserve the no-marker states. The page stays usable without JavaScript.

**Primary NPS pages checked:** [trail directory](https://www.nps.gov/apis/planyourvisit/trails-at-the-apostle-islands.htm), [designated campsite directory](https://www.nps.gov/apis/planyourvisit/campsite-directory.htm), [Stockton campsite details](https://www.nps.gov/apis/planyourvisit/stockton-campsites.htm), [Oak campsite details](https://www.nps.gov/apis/planyourvisit/oak-campsites.htm), [Sand campsite details](https://www.nps.gov/apis/planyourvisit/sand-campsites.htm), [Rocky campsite details](https://www.nps.gov/apis/planyourvisit/rocky-campsites.htm), [Basswood campsite details](https://www.nps.gov/apis/planyourvisit/basswood-campsites.htm), [Michigan campsite details](https://www.nps.gov/apis/planyourvisit/michigan-campsite.htm), [NPS construction](https://www.nps.gov/apis/learn/infrastructure-projects.htm), and [camping permits](https://www.nps.gov/apis/planyourvisit/camping-permits-reservations.htm). Individual NPS campsite pages were last updated June 23, 2022; they are corroborated by the current NPS trail directory but do not certify current access.

**Release gates:** new tests verify exactly 21 distinct relationships, three stages each, valid island and dock IDs, NPS-only evidence links, campsite identifiers that match published map references, no Sand campsite pins, and no generated polylines. Browser QA checks selected map dots, text/readout, Sand withheld state, trip handoff and no-JS access on mobile/desktop. Full repository verify, sitemap/dateModified, Vercel preview and public-output audit before merge. No new SEO pages, ads edits, Redis, booking calls or assumed live access.
