# NYC Bridges Field Guide — source and product contract (2026-10-30)

## Separate purpose
- Guide canonical: `https://chrisizworski.com/nyc-bridges/`: bridge walks, official pedestrian guidance, photo viewpoints, engineering and history, qualitative outing selection and astronomical low-angle sunlight windows.
- Existing driver tool canonical: `https://chrisizworski.com/nyc-crossing/`: traffic, bridge and tunnel tolls, congestion pricing and vehicle suitability. **Do not move, copy or change its calculations.**
- Discover through the `/guides/` directory; link to the driving tool only for explicit driving intent.

## Evidence and temporal labels
- NYC DOT official infrastructure resources:
  - Brooklyn: https://www.nyc.gov/html/dot/html/infrastructure/brooklyn-bridge.shtml
  - Manhattan: https://www.nyc.gov/html/dot/html/infrastructure/manhattan-bridge.shtml
  - Williamsburg: https://www.nyc.gov/html/dot/html/infrastructure/williamsburg-bridge.shtml
  - Queensboro: https://www.nyc.gov/html/dot/html/infrastructure/queensboro-bridge.shtml
- NYC Parks High Bridge history and access: https://www.nycgovparks.org/park-features/highbridge-park/planyc
- Port Authority George Washington Bridge South Walk reopening October 15, 2026: https://www.panynj.gov/port-authority/en/press-room/press-release-archives/2026-press-releases/port-authority-opens-renovated-south-walk-on-george-washington-b.html
- Dates of bridge construction are history, not current notices. **Never infer actual open-now status or safe access from them.** The George Washington Bridge 2026 reopening is a dated agency statement, not a perpetual promise. The interactive map pins are bridge centers, *not* legal approach coordinates. Named viewpoints link to map search, not fabricated entrance points.

## Licensed photography
Each image is identified to an exact place and credited directly in `public/nyc-bridges/index.html`. Recheck upstream license/source before replacing. Photos illustrate the bridge, not today's conditions.

| Subject | Wikimedia Commons file | Credited author | License |
|---|---|---|---|
| Hero, Brooklyn Bridge | USA-NYC-Brooklyn_Bridge.jpg | Ingfbruno | CC BY-SA 3.0 |
| Brooklyn walkway | Walking_on_Brooklyn_Bridge_in_New_York.jpg | Nabiha.A | CC BY-SA 4.0 |
| Manhattan Bridge | Manhattan_Bridge_2025.jpg | Kidfly182 | CC BY 4.0 |
| Williamsburg Bridge | Williamsburg_Bridge_full.jpg | Praneeth Thalla | CC BY-SA 4.0 |
| Queensboro Bridge | Wiki_Takes_LIC_close_up_of_Queensboro_Bridge.jpg | GaoKyle | CC BY-SA 4.0 |
| George Washington Bridge from Fort Lee Historic Park | GWBfromFortLeeHistoricPark.JPG | Hudconja | CC BY-SA 3.0 |
| High Bridge | HighbridgeNewYork.jpg | Asaavedra32 | CC BY-SA 3.0 |

Use the original file description's attribution and license. If external thumbnail delivery fails, choose a compliant alternate rather than pretending a photograph loaded.

## Interactive behavior
- Six static source-linked guide entries readable without JS; JS filters and synchronizes visible atlas markers.
- Leaflet map loads local Leaflet CSS, requests the existing public CARTO key via `/api/carto-basemap-config`, and retains an OSM base if unavailable. Does not request precise user location or add Redis.
- Solar windows use approximate sun calculations at 40.7128 N, -74.006 W and local `America/New_York` display time. They are NOT a weather forecast, crowd count, terrain-shadow model or precise photography promise.
- Three itinerary sequences are editorial suggestions. No false travel times, pedestrian navigation or transit schedule claims.

## Release
- Site regression tests: `tests/nyc-bridges.test.js`.
- Playwright screenshot+image+map tests: `node scripts/verify-nyc-bridges-browser.cjs`, GitHub workflow `nyc-bridges-browser.yml` (mobile 390 and desktop 1366, captures artifact); source must pass before merge.
- Mandatory full gate: `npm run verify:all` through Agent branch verification and related checks; no merge while red.
- Vercel preview is protected by Vercel Authentication: direct unauthenticated browsing yields Vercel login, **not** an app screenshot. Browser QA instead runs the exact branch source on a local Actions server with real remote photo/tile requests.
- User-visible live status requires production deploy+live page verification after merge. A READY Vercel preview is not production.
- Neither advertising configuration nor the existing NYC Crossing page was changed.

## Measurement and next investment
The primary search query cluster is walk NYC bridges / best NYC bridge photography viewpoints / NYC bridge history. GSC baseline for this newly created route is not available. Measure indexation, search query ownership, bridge-profile interaction and guide-to-tool navigation over 28 days after launch without claiming uplift.

**Next investment:** replace approximate bridge-center markers with independently verified *pedestrian entrances and accessible approach* data (source, date, coordinates, construction caveat); until then remain explicit about unknown access routes.
