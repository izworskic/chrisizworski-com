# ShoreFeel outside Michigan: U.S. Great Lakes coast expansion

**Release candidate:** 2026-11-21. The first outside-Michigan atlas adds 16 curated public shoreline references in Minnesota, Wisconsin, Illinois, Indiana, Ohio, Pennsylvania and New York. This is a **source-specific, limited catalog**, not all public Great Lakes beaches. It is stacked on the unmerged 50-Michigan-site PR #1815.

## Visitor job and design choice

A visitor asks "What might it feel like at this beach?" and needs to choose a place, read a credible current forecast, distinguish wind exposure from a made-up beach microclimate correction, and open the right official swimming status authority.

Existing neighboring tools: the authoritative 50-place **Michigan Beach Report**, which handles BeachGuard and ranked Michigan swims, and **Saginaw Bay ShoreFeel**, whose specific NOAA satellite pixels, separate onshore/land NWS grid and scenario research cannot be copied to all beaches.

- **Concept A, rejected:** add non-Michigan destinations to Michigan's existing Beach Report. It would silently inherit Michigan EGLE BeachGuard logic, NWS surf-office matching and Michigan seasonal ranking dates outside their jurisdiction. This would be operationally misleading and weaken the existing 50 Michigan canonicals.
- **Concept B, chosen:** a distinct, tightly scoped **Great Lakes shoreline field desk**, with a five-lake geographical switcher, a source-reviewed static list, an interpretive weather report for the selected beach, a map with linked list fallback, and the state's official health authority and park links. Lake Huron deliberately delegates to Michigan. This does not copy the beach ranking or falsely equate comfort with water safety.

On a small screen the regional intro and lake choice lead into the selected forecast report **before** the long list; on desktop the place list and map-backed report sit side by side. The visitor can change lake, select a location, open official notices and Google Maps, then reverse that selection. Map pins represent documented shore reference coordinates, **not** trailheads or a guaranteed road to the beach.

### Geography and access

The file `data/shorefeel-us-coast.json` is the authoritative source. Its source links, coordinate provenance, weather reference and notes stay with each location. The covered lakes are Lake Superior (2), Lake Michigan (6), Lake Erie (5) and Lake Ontario (3). Lake Huron is intentionally covered by Michigan's 50-beach guide via a live handoff. Canada is **not** covered by this U.S. project. Several non-site-centroid coordinates are indicative park-level references and are visibly labeled; do not market them as a precise swimmer access point.

**Access caution:** Wisconsin Big Bay State Park's official `conditions` page reports a beach parking construction closure from September 8, 2026 to approximately June 30, 2027. The interpretive UI shows the caveat rather than claiming open parking. Check current official conditions before travel. Some parks close swimming outside the guarded season. None of the 16 has a live authorized swimming flag in this product.

## Science and source contracts

- **NWS land-area grid** `https://api.weather.gov/points/{lat},{lon}` supplies an official `forecastHourly` URL. This URL is strictly allowlisted to `https://api.weather.gov/gridpoints/{office}/{gridX},{gridY}/forecast/hourly`. It is never a client-supplied fetch proxy. The `/points` location must report `type:land`; otherwise the answer is unavailable. Read the source `updateTime` no older than 18h and a currently valid hour period; do not borrow a future or yesterday's period.
- **Air comfort** uses NWS forecast temperature, humidity and wind with established NWS heat-index / wind-chill methods, otherwise the NWS forecast air temperature. Never change the air result based only on nearby lake water. The page labels this as area forecast, not a thermometer on the beach.
- **Water:** there are no measured beach-water readings in this regional expansion. Never substitute a Great Lakes average, a distant buoy reading or a city forecast for a swimming-area thermometer.
- **Safety:** current lake bacteria advisories, posted flags, waves/currents and beach opening hours are **not integrated**. The UI does not display an all-clear. It links to official state or local authority resources instead. The API's `advisoryState` is `not-integrated`.

### Official authority register

| State | Official beach-health authority | URL |
|---|---|---|
| MN | Minnesota Lake Superior Beach Monitoring | https://mnbeaches.org/ |
| WI | Wisconsin DNR Beach Health | https://apps.dnr.wi.gov/beachhealth/ |
| IL | Illinois Department of Public Health BeachGuard | https://idph.illinois.gov/envhealth/ilbeaches/public/ |
| IN | Indiana IDEM BeachAlert | https://portal.idem.in.gov/beachalert/ |
| OH | Ohio Department of Health BeachGuard | https://odh.ohio.gov/know-our-programs/bathing-beach-monitoring/BeachGuard |
| PA | Erie County beach water testing | https://eriecountypa.gov/departments/health/services-and-programs/health-and-wellness/beach-water-testing-results/ |
| NY | New York State beach advisory database | https://beachadvisory.health.ny.gov/ |

Additional scientific references: https://www.weather.gov/documentation/services-web-api, https://www.weather.gov/apx/lake_breeze, https://www.weather.gov/safety/heat-index, https://www.weather.gov/safety/cold-wind-chill-chart and https://www.ndbc.noaa.gov/.

**Licensing/operating guardrail:** Open-Meteo's free API has noncommercial restrictions (see https://open-meteo.com/en/terms and https://open-meteo.com/en/pricing). The ad-supported U.S. expansion uses NWS's public-domain/free-for-any-purpose API and does not introduce a new free Open-Meteo dependency. The existing Michigan Beach Report weather service is separate and warrants its own licensing review.

## Technology Fit Review

- **Semantic HTML/CSS: keep.** Exact canonical, useful 16-place park list with real park links when JS is off, responsive first answer and accessible controls.
- **Browser JavaScript: keep, no new framework.** Coordinates the five lake buttons, list selection, source status, selected mark, map and safe failure. State updates use textContent; stale network fetch is aborted.
- **Existing Node.js serverless: keep.** One modest allowlisted source endpoint. Time-limited NWS requests, cache success and prevent non-catalog URL queries. No Redis or paid API.
- **Python: reject for runtime.** Useful later only for offline NOAA grid/source audit and paired sensor field validation, not for a basic park forecast.
- **Rust/WASM: reject.** No quantified CPU or numerical load justifies a new runtime.
- **Java: reject.** No required library, service owner or measured bottleneck.
- **Maps:** reuse vendored Leaflet and a source-attributed OpenStreetMap layer, with visible list and shortened map fallback when tiles are blocked. Do not introduce an unconfigured CARTO key.

Operational cost is additional NWS fetches for selected beaches only, not 16 per page load. No claims about verified live API coverage or measured response times until actual production probing and browser tests.

## Evidence and required release gates

- Static/Node tests: all 16 positions, authority isolation by state, strict NWS endpoint validation and stale periods, no synthetic correction, invalid URLs, 400 unknown beach, preserve 16 static park links.
- Real Chromium tests at 360, 390, 768, 1280 and 1440: Lake Superior→Ontario→Huron Michigan handoff→Superior, current modeled result, official authority changes, first-screen report, Big Bay closure notice, document width, keyboard, blocked OSM tiles and no-JS browse.
- Full owning-repo verification, build, sitemap/Person/ad integrity and Vercel preview required. No real beach-air thermometer or observed field accuracy implied by mocked browser weather.
- New canonical: `/great-lakes-beaches/around-the-lakes/`. Existing Michigan hub canonical and 50 detail pages, ads and Michigan safety gates protected.
- Next phase: independently verified U.S. beach breadth (not fake directory entries); Canadian Ontario parks with ECCC and provincial beach-health/municipal authority separately; local bath-water readings and validated on-sand data, if obtained.

**Release status:** PR, final test run and deployment states are recorded separately. A checked-in page or passing fixture is not proof of public live weather.
