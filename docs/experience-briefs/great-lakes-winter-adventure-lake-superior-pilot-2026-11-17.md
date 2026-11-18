# Great Lakes winter adventure: Lake Superior pilot research and distinctiveness gate

Date: 2026-11-17
Status: research and experience acceptance only. No public tool, live data feed, visitor release, or search result claimed.
Decision owner: Chris Izworski
Build issue: https://github.com/izworskic/chrisizworski-com/issues/1751

## Decision worth building

A visitor has a free Saturday and wants a rewarding outdoor winter experience, not a list of picturesque towns. The tool must answer: **Which specific outing is a credible match for my interest and available effort, what exactly is known about access and weather, and what should I check before setting out?**

The first supported region is the Lake Superior shore of Michigan, Wisconsin and Minnesota. This is **not** a pan-Great Lakes live-conditions claim. Start with one verified land-based trip per regional shore and expand only as source and access evidence supports it.

### Reuse versus overlap

| Existing product | Already owns | What the pilot may uniquely do |
| --- | --- | --- |
| /michigan-destinations/ | Twenty Michigan destinations by season and activity | Cross-state short outings, not a second scenic Michigan directory |
| /michigan-winter-activities/ | Eighteen distinct Michigan activities with place photography | A dated trip decision joining a named outing with access and conditions |
| /michigan-winter-weekends/ | Twelve two-day Michigan base towns with thaw alternatives | A specific excursion for one available time window, including WI and MN |
| /michigan-winter-trails/ | Fifteen trail systems and fifty named loops | Link to that owner for detailed Michigan trail rules, not mirror its trail guide |
| /michigan-ice-caves/ and /frozen-michigan/ | Michigan ice destinations and conditions | Connect to the specialist; do not reclassify ice as safe or formed |
| /lake-effect-snow/ and /michigan-snow-totals/ | Forecast context and official snow reports | Ingest documented observations as context, not duplicate snowfall search intent |
| /frozen-lighthouses-michigan/ | Forecast freezing-spray windows at pier lights | Link for pier photography; no overlapping pier forecast engine |
| /tools/ seasonal field desk | Which tool is worth opening this month | Specific visitor outing recommendation from dated evidence |

Do not create a new indexable regional URL until canonical intent, measured query demand and source-backed live utility beat linking or extending an existing owner. Other agents are editing /frozen-lighthouses-michigan/ and /michigan-destinations/; do not modify either.

## Three independently sourced visitor journeys

The table establishes *seasonal activity plausibility and important restrictions*, not current-day open status or winter safety.

| ID | Visitor | Proposed land outing | Evidence and hard boundary | Official check | Arrival/location rule |
| --- | --- | --- | --- | --- | --- |
| munising-snowshoe | Wants a forest snowshoe route, prepared for genuine winter terrain | Pictured Rocks dedicated Snowshoe Trail near Munising, Michigan | NPS publishes a specific snowshoe trail and winter routes. Munising Falls Trail is closed until further notice after 2025 storm damage, with repair anticipated as late as 2027. Never silently substitute closed Munising Falls. | https://www.nps.gov/places/snowshoe-trail-piro.htm and https://www.nps.gov/piro/planyourvisit/conditions.htm and https://www.nps.gov/places/munising-falls.htm | Show NPS route and source first. Verify exact official winter parking before any directions deeplink; a regional place-search may be shown instead |
| bayfield-clifftop | Wants sandstone cliffs and forest hiking, not ice travel | Lakeshore Trail from Meyers Beach on the Bayfield Peninsula, Wisconsin | NPS describes the trail starting at Meyers Beach; it is usable in winter but may be snow-packed, icy or deep snow. This is a land trail **above** the cliffs. It is NOT walking across lake ice to the mainland ice caves. Ice cave access is rare and determined by NPS, not by a model. | https://www.nps.gov/apis/planyourvisit/hiking.htm and https://www.nps.gov/apis/planyourvisit/conditions.htm and https://www.nps.gov/apis/mainland-caves-winter.htm | NPS identifies 90500 Meyers Beach Road, Bayfield, WI 54814. Confirm same-day area and road access; do not direct users onto ice |
| gooseberry-upper | Wants an approachable winter waterfall walk rather than a deep-snow trek | Gooseberry Falls State Park Upper Falls winter walking route, Minnesota | Minnesota DNR states the only maintained winter walking route in its waterfall walk is to the Upper Falls. Other waterfall circuits are not offered as maintained winter walks. Park, parking and trail conditions still require current confirmation. | https://www.dnr.state.mn.us/state-parks/gooseberry-falls/self-tour-waterfalls-walk.html and https://www.dnr.state.mn.us/trailconditions/index.html and https://www.dnr.state.mn.us/state-parks/park.html?id=spk00172 | Use official park map for true arrival and visitor center lot, verify seasonal entry before turn-by-turn directions |

**Research checked:** 2026-11-17, publicly reachable park and land manager pages. Web result freshness is **not** a same-day operator access report. Do not render any of these as "open now" without a current dated direct source. Do not claim any three sites have an actual snow depth, trail grooming report, public ice access or wind safety evaluation at this stage.

### Three useful decision scenarios

1. **One-hour winter waterfall walk:** Filter for a short, maintained winter walking route. Gooseberry Upper Falls may qualify as a researched option; the long waterfall loop must be excluded. Need the actual winter route length and confirmed current access before a timed plan.
2. **Snowshoeing among snow-covered trees:** Munising Snowshoe Trail may qualify for a longer forest outing. Never show the currently closed Munising Falls Trail as an add-on. Show the winter trail land manager link and distinguish trail choice from how much snow has fallen.
3. **Bayfield cliffs without dangerous lake-ice assumptions:** Offer the inland/overland Lakeshore Trail with clear uncertainty about surface and access. The mainland ice caves are a separate authority-controlled opportunity, never an advertised alternative unless NPS confirms access.

## Competitive and existing-site comparison

External references checked 2026-11-17:
- AllTrails help describes filters for nearby trails, difficulty and features: https://support.alltrails.com/hc/en-us/articles/37227964040852-How-to-use-filters-to-find-trails . Useful for showing destination choices, but a trail filter does not establish current winter parking, allowed uses or open access.
- Minnesota DNR's winter hiking and trail status pages describe winter uses and warn that conditions change: https://www.dnr.state.mn.us/state-parks/winter-hiking.html and https://www.dnr.state.mn.us/trailconditions/index.html . Useful source-first model, but official status pages are not a trip chooser.
- Existing /michigan-winter-weekends/ is a twelve-town itinerary guide. Existing /michigan-destinations/ is a photogenic Michigan catalog. Neither should be re-created with a different color palette.

### Two credible design concepts

**Concept A: Map-first winter atlas.**
The visitor starts with Great Lakes pins and layer toggles. Useful for spatial exploration, but initial pins imply comparable status, invite false "nearest is best" conclusions and repeat Adventure Finder patterns. Maps also become a blank blocker if tiles fail. **Reject for the first release.**

**Concept B: Field assignment desk.**
The first screen asks "What kind of winter day do you want?" and offers three explicit goals: an accessible waterfall walk, a longer snowshoe route, or a cliff-and-forest exploration. Selection yields *one* richly verified outing, evidence and one competing alternative, with a source-check action before any route action. A compact map is secondary and synchronized to the selected destination. Unique aspect: the interface explains **why the assignment fits and exactly what could stop it** rather than pretending every place is ready. **Select this concept for the prototype.**

Material differences from both closest site tools:
1. **Decision and hierarchy:** one outing with confidence and blocker, not an evenly weighted catalog or a two-day town itinerary.
2. **Interaction:** choose outdoor goal plus effort and actual future visit window; the same ID controls answer, alternative, official-source status, photograph and map. User can reverse A -> B -> A without mismatched status.
3. **Editorial design:** an interpretive field card anchored to one park outing with explicit seasonal land-manager evidence, not a copy-paste scenic photo card grid.

### Opening screen content sketch, not approved public copy

- Headline: "Where should winter take you this weekend?"
- One primary interaction: choose **Waterfalls**, **Snowshoe woods**, or **Sandstone coast**.
- Answer region: named exact outing, one sentence describing the landscape, two lines of factual visit evidence, **Access check needed** when current proof is absent, direct official-source link.
- One meaningful action: "Check today's park conditions" and only then a documented, independently verified arrival link.
- One alternative: another *activity-compatible* outing, never a convenience replacement that changes the visitor's sport or routes them onto lake ice.
- Below: photo-led editorial story and the regional map, with a real-place licensed photo credit for each selected outing.

No invented "today" status, driving time, percentage confidence, personal-geolocation estimate, current ice thickness, current groomed track or unverified trailhead directions.

## Source and status architecture

| Data type | Cadence proposal | Status rules |
| --- | --- | --- |
| Land manager trail and access | Before launch, then scheduled and pre-visit re-check | Explicit closure wins over favorable forecast; missing current proof = "Check current conditions" |
| Weather forecast | Source-issued timestamp and hourly freshness gate, e.g. 6h for issued forecast | Forecast is opportunity context; not trail ready, guaranteed views or ice safety |
| Snow depth/observations | Source measurement time, location and coverage | Snow in nearby weather cell never means route is groomed |
| Photos | Original file page, exact location, rights, credit, crop | Missing correct rights = no photo; scenic substitution cannot masquerade as site |
| Location/parking | Exact manager-published entrance/lot, reviewed date | Google Maps search for a grounded feature is NOT navigation; directions only after authoritative entrance verification |
| Visitor recommendation | Recomputed on selection and source status updates | Never call a candidate "open", "safe" or "best today" on unknown or stale evidence |

The location precision and 6-hour weather budget are design proposals, not verified deployed values. Source refresh automation and data science still require engineering and failure-mode tests. Models must not decide closures or lake-ice safety.

## Technical baseline and lifecycle

- Existing central site is HTML, CSS, JavaScript and precomputed data. Start with a small **pure JavaScript recommendation and state model** so it can be tested without a provider or runtime framework change.
- Let existing national snow or lake-effect engines supply source records through their owning repos if they expose a compatible contract. Never scrape an HTML page and claim it is an authoritative weather API.
- Python is a candidate for offline reconciliation of parks/conditions/photography if repeatable audits warrant it. Rust is not needed to rank three park outings and should not be introduced for appearances.
- Initial HTML carries a useful researched static assignment even when JavaScript or a map fails.
- No Redis, unapproved ad edits, new live national canonical, reverse-geocoding without intent, or arbitrary confidence scores.
- Verify the source owner, network registry, `#person`, sitemap, photo rights and ads policy when authorizing publication.
- Read the main repo `AGENTS.md`, `design-systems/experience-os-v1/AGENTS.md`, QA scorecard, Foundry and Field Guide standards before implementation. Respect independently owned tool repositories.

## Proof matrix for the first code slice

| Scenario | Required result |
| --- | --- |
| Waterfall goal with short-time constraint | Gooseberry Upper Falls may rank; full waterfall circuits excluded |
| Snowshoe woods goal | NPS Munising snowshoe routes shown; Munising Falls Trail not suggested |
| Bayfield cliffs goal | Lakeshore Trail explicitly overland; no lake-ice walking invitation |
| A -> B -> A | Same selected ID synchronizes answer, source, image, map and alternate |
| Source says closure | Destination is not recommended as currently visitable even with excellent weather |
| Source undated or stale | Honest check-needed state, no false "open now" |
| Snow data missing | Preserve candidate with unknown snow, no guessed groomed status |
| Image fails/slow | No misleading prior destination photo; decision remains usable |
| Map tiles fail or JS is off | HTML outing and official links still make sense |
| Winter parking missing | No driving directions; approved Google Maps place search only |
| Browser widths 360/390/768/1440 | Initial answer and official check readable, no horizontal scroll |
| External source misstates trail | Source-to-destination identity mismatch fails closed |

**Launch bar:** Experience OS score >=90/100 and >=4/5 in each category; side-by-side distinctiveness veto; full owning-repo CI; browser at four widths; official source and photograph rights verification; actual post-deploy inspection. None of these are claimed complete in this research PR.

## Explicit go/no-go

**GO for a local, noindex prototype or existing-page enhancement:** distinct cross-state, condition-aware same-day excursion matching is absent from the inspected Michigan directories, and three park land-manager sources support a meaningful proof.

**NO-GO for immediate public release:** current condition ingestion, true winter parking/directions for all three, rights-cleared photos, source snapshots and full browser QA are not yet complete. No indexable city clones.

## Exactly one next implementation

Implement **the first source-status-aware field assignment** using the three location records above, without a new public route, and create a test suite for closure precedence, unknown access, choice reversal and false ice-access suggestions. Then produce two actual mobile/desktop compositions and inspect them in a browser. Only after that authorize the first photographed public visitor experience.
