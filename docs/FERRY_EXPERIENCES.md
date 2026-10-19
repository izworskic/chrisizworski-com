# Individual ferry planning experiences — October 18, 2026

The owner rejected eight thin calculators as a substitute for independent, useful destination tools. The Mackinac ferry product is the experience benchmark. Existing canonical routes stay in place. Manitou is added at `/manitou-island-ferry/`; it covers both Michigan islands without inventing two keyword variants. Ontario's Manitoulin is explicitly distinguished.

## Source and build ownership

`data/ferry-planners.json` owns nine route profiles, public fare references, source links, dated access states, guide copy and image credit. `scripts/generate-ferry-planners.mjs` emits their HTML, FAQ/Person metadata and directory entry during `build:site`. Edit the source data and generator, then regenerate. All core answers, restrictions, guidance and links are in initial HTML. The existing extracted `/isle-royale-ferry/` owner remains untouched; the comparison is `/isle-royale-ferry-comparison/`.

Shared code is plumbing, not a reason for interchangeable destination content. The tools model different decisions: Put-in-Bay's arrival dock and transfer, cross-lake local clocks, Isle Royale's gateway and island end, Chi-Cheemaun's booking/check-in and seasonal crossing duration, Pelee's mainland gateway, Beaver's passenger/vehicle distinction, Toronto's seasonal island docks, and Manitou's access/restart status.

## Evidence ledger

Reviewed October 18, 2026; not a continuously polled closure/schedule feed.

- Manitou: NPS `https://www.nps.gov/slbe/planyourvisit/the-manitou-islands.htm` and operator `https://manitoutransit.com/` report no regular 2026 ferry. NPS anticipates 2027 dock/village reopening; no confirmed ferry restart or fares inferred. Separate North/South and backcountry pages explain the scope of facility closures. Historical crossing durations from `https://www.manitoutransit.com/islands/boat.html` never generate a current trip timeline.
- Lake Express: official plan-your-trip and travel-faqs pages identify ports, approximate 150-minute crossing, 90-minute boarding opening and 15-minute gate closure. The model uses a 90-minute planning allowance, not a newly asserted check-in rule.
- Badger: official operator schedule and contact pages distinguish the ports and approximately four-hour voyage. A 60-minute lead is explicitly a planning allowance, subject to operator instructions.
- Chi-Cheemaun: official operator landing/general information states 60-minute check-in and about 105 minutes peak / 120 off-peak.
- Pelee: official schedule and general information identify the dated Leamington/Kingsville shift, 90-minute Canadian crossing and 60-minute check-in. Sandusky is described separately and is not priced as a Canadian route.
- Beaver: operator passenger FAQ states a 60-minute passenger arrival allowance; vehicle-reservation rules require 90 minutes. The core changes its minimum when a car is selected.
- Toronto: city passenger and timetable pages identify the three island docks, any-operating-dock return ticket, winter Ward's operation and approximate Ward's–Centre walking connection. Queue allowances are planning assumptions, not observed wait times.
- Isle Royale: NPS ferry, directions and vessel-specific pages identify the four ferry options, passenger-only access and island ends. Voyageur timing covers the first Windigo leg only. Ranger III/Voyageur same-day plans are not fabricated. The actual operator itinerary remains authoritative.

## Map method and fallback

Leaflet 1.9.4 is already vendored. CARTO light raster tiles use no API key and retain CARTO/OpenStreetMap attribution. WGS84 marker coordinates identify approximate terminal or island areas, not parking-lot entrances or new dock survey positions. Addresses and official terminal sources support external Google directions. Dashed connections are schematic, never navigation routes or GPS vessel tracks. Two visible point markers correspond to the selected crossing; selection resets their bounds. Labels/popups stay screen-sized and wrap on phones. Mobile one-finger dragging is disabled so the page remains scrollable; explicit zoom/pinch remain available. Tile or script failure leaves terminal direction cards and a clear unavailable message. No geolocation is requested.

## Timeline and money contracts

Sailing times are blank until supplied by the visitor. They are never scraped, inferred or defaulted to fictitious departures. IANA port time zones convert each local input into an instant before adding elapsed sailing time. The timeline shows port-local clocks. Outward unloading and return check-in are removed from time ashore. A return earlier than arrival, unsupported return season, or modeled impossible same-day itinerary gets a warning rather than an invented overnight correction.

2026 suspension, out-of-season dates and unsupported years suppress numerical trip/fare claims. A reference-season match is not current operational approval. Fare subtotals preserve existing supported categories and incomplete-rate withholding. Parking and local transfers are visitor-entered; blank is unpriced, not zero. Crossing durations are approximate and return-leg timing reuses the same duration as a stated planning assumption. Fare references use the outward date and can differ from a cross-season checkout quote.

Share links contain only explicit public form settings in query parameters; no database or account. Copy-denied environments get a selectable link field. Print has its own readable layout. Neither action reserves transportation.

## Real imagery

Historical vessel/shore photographs are labeled as references, not today's conditions. Source files and licenses are linked in each caption. Miller: James St. John, CC BY 2.0; Lake Express: Jeff Dean, attribution permission; Badger: WMrapids, CC0; Chi-Cheemaun: Francine Pallister, CC BY-SA 3.0; Pelee: Chris Woodrich, CC BY-SA 4.0; Toronto: Chicken4War, CC BY-SA 4.0; Manitou lighthouse: Geoffrey George, public domain. Beaver uses NASA/USGS Landsat 9 imagery from August 2, 2024, with NASA Earth Observatory credit. Isle Royale uses the credited NPS reference image. CSS display crops do not purport to be new photographs. External photo delivery is recorded independently from script/layout test results.

## Validation and limits

Pure tests cover clocks, impossible returns, seasonal and year gates, Manitou suspension/restart, Pelee gateway changes, Beaver vehicle check-in, Toronto winter and published-fare withholding. Browser smoke runs the exact source at widths 320/390/1280, checks JavaScript, layout width, timelines, map geometry and shared-link restoration. NWS is intentionally failed to exercise unavailable-data behavior; map tiles and photographs remain external and their delivery is not inferred from geometry success. The full repository and emitted-page build gates remain required. Preserve Auto ads integration; no account ad settings changed or delivery/revenue claims made.
