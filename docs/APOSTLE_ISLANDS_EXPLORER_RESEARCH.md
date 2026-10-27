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
