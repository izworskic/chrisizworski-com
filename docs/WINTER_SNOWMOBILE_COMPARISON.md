# Michigan snowmobile trip comparison

October 5, 2026. Existing canonical owner: `/snowmobile/`; the seven existing regional URLs remain unchanged. No new search landing pages.

## Visitor decision

Choose a starting city and maximum one-way drive. Compare road time to seven regional hubs alongside the existing current trail-surface, grooming, closure, snowfall and thaw evidence. Continue to the regional map with the named city and drive limit intact. Local staging notes and report links are available without the live API.

Evidence ranking and shortest-drive sorting are separate views. A short drive or deep natural snow cannot promote an unknown surface into a good riding recommendation. A stronger trip candidate requires the existing route score of at least 72, confidence of at least 50, verified closure checking, a fresh bundle and an available road time within the visitor's limit. This is a current-evidence decision, not a forecast of future trail quality. The existing 72-hour weather window remains weather context only.

## Evidence audit

Grayling–Gaylord is the only region with automated structured club reports. Six other regions remain unknown for surface quality; their local source links are manual verification handoffs with explicit coverage limits. Source URLs were checked against MISORVA's club directory and Visit Keweenaw on October 5. Several source pages retain reports from the previous winter. Do not import those as current observations.

During the October 5 production check, the DNR open-data service returned HTTP 500 for its metadata, trail query and closure query. The legacy Grayling geometry fallback remained available. No successful closure check is inferred from the outage, and no weaker source is substituted to recommend riding. The regional pipeline now retains independently available snow/weather context when geometry fails, but returns zero route confidence and unverified legality. All regional pages provide the official DNR maps link and local-report handoffs when live geometry is unavailable. This external outage remains a live-data limitation.

The emitted index and regional pages retain one standard AdSense loader each. Code coverage does not establish account approval or ad delivery. Existing auto-ad policy remains authoritative.

## Measurement

GA4 events: `snowmobile_compare_start`, `snowmobile_compare_complete`, `snowmobile_region_open`, `snowmobile_source_verify`, plus the existing regional decision and origin events. Parameters include named origin or the label `browser-location`, region, drive limit and available-route count. Browser coordinates are never sent as analytics parameters or inserted into region links; they are sent only to the road-routing request.

Observe the existing canonical pages in comparable complete 28-day Search Console windows. Separate preseason October/November discovery from riding-season December–March traffic. Measure non-branded clicks, impressions, position, return visits, comparison use, local-source verification and AdSense revenue. Neither this release nor additional page count demonstrates growth by itself.

## Release and rollback

The separate Maryland search-description repair restores the previously failing baseline. The winter change is additive: all existing regional maps, corridor checks, route planner, local reports, forecast context, camera and companion links are retained. The main-page introduction is shortened; regional title/description generation is brought within the existing length limits. Two new sections supply comparison intake and a static regional directory; every regional page gains local planning/source context.

Rollback the winter commit without reverting the Maryland repair. No data migration, new dependency or change to condition scoring is required.
