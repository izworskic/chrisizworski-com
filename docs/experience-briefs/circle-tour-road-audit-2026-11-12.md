# Lake Superior Circle Tour — Road-source audit, phase 2
Reviewed 2026-11-12. The 31-stop route, map geometry, specialist tools, Journey Atlas and advertising remain unchanged.

## Why the correction was necessary
Before this pass the published final North Shore day was approximately 192 miles, but adding the individual stop-card distances produced 303 miles. One card claimed 115 miles from Thunder Bay to the Pigeon River border. Destination Ontario instead reports about 38 miles / 62 km to that border. This does not independently measure the Grand Portage State Park parking approach.

The Whitefish Point card claimed 71 miles from Tahquamenon Falls. The museum's own published directions describe an 11-mile spur north from Paradise along Whitefish Point Road. That is NOT the full Tahquamenon-to-Whitefish travel distance. The Sault stop card no longer purports to measure a route from Tahquamenon when the previous stop is Whitefish Point.

The Keweenaw stop combined Houghton and Copper Harbor into one unqualified distance. Copper Harbor/Brockway Mountain requires a distinct scenic detour, and Brockway is seasonal. The regular Google Map day uses Houghton; a separate optional link adds Copper Harbor with no claim that the day mileage still applies. On the 15-day Copper Harbor departure day, Copper Harbor is the actual route origin.

## Primary published evidence, scoped precisely
- Official signed Lake Superior Circle Tour: approximately 1,300 miles. Source: https://superiorcountry.ca/touring/drive-and-rv-tours/lake-superior-circle-tour/ . Not proof of our optional park detours.
- Thunder Bay to Pigeon River border: approximately 38 mi / 62 km. Source: https://www.destinationontario.com/en-ca/travel-resources/ontario-lake-superior-road-trip . Not a measured park arrival.
- Grand Portage roughly 150 miles from Duluth and 50 miles from Thunder Bay, by NPS. Source: https://www.nps.gov/grpo/planyourvisit/directions.htm . These are regional references and include distinct site endpoints.
- Duluth to Thunder Bay published 190-mile Highway 61 touring corridor. Source: https://www.ridelakesuperior.com/itineraries/lake-superior-tour/duluth-mn-to-thunder-bay-on/ . Excludes optional park trails/parking approaches. The 150+50 NPS figures are not exact additive legs to this 190-mile estimate.
- Paradise to Great Lakes Shipwreck Museum at Whitefish Point: 11 miles. Source and physical address (18335 N Whitefish Point Road, Paradise, MI): https://shipwreckmuseum.com/visit/admission-hours-location/ .
- Alger County H-58 between the M-28 and M-77 junctions: 52 miles, per NPS. Not full Marquette–Munising or Munising–Tahquamenon mileage. Source: https://www.nps.gov/piro/planyourvisit/roadmileage.htm .
- NPS says to navigate specifically to Munising Falls Visitor Center, 1505 Sand Point Road, not a generic Pictured Rocks park pin. It also explains seasonal H-58 and park-road closures. https://www.nps.gov/piro/planyourvisit/directions.htm and https://www.nps.gov/piro/planyourvisit/winter-road-closures.htm .
- Visit Keweenaw confirms Brockway Mountain Drive is seasonal and has two entry points off M-26. Source: https://www.visitkeweenaw.com/things-to-do/scenic-drives/brockway-mountain-drive/ .
- Ontario Highway 17 closures, collisions and roadwork require a current 511 check: https://511on.ca/ . A September 2026 government announcement identified highway work near Nipigon; it is historical context rather than a current closure verdict. https://news.ontario.ca/en/release/1008058/ontario_expanding_trans_canada_highway_near_nipigon .
- Minnesota North Shore Highway 61 route and border approach: https://www.visitcookcounty.com/plan/getting-here/ . Current road conditions must be checked through Minnesota 511.

## Implemented visitor decisions
Each relevant day in the route preview has expandable Road reality notes, which distinguish official source facts from unsourced total estimates. Google Maps directions now use named Houghton / Copper Harbor, the NPS Pictured Rocks arrival at Sand Point Road, the museum at Whitefish Point, and a limited Highway 61 core corridor. The North Shore core route intentionally skips individual state-park parking lots and identifies those as separate stops. Clockwise routing reverses corridor order.

Source-partial miles are never treated as complete stop-to-stop distances by the existing live day-sheet. The four stop-card entries with ambiguous or partial distances are marked in the HTML; the day-sheet returns unavailable for those legs rather than manufacture an arrival time.

## All 30 legs accounted for, not all verified
The JSON file data/circle-tour-road-evidence.json records all consecutive pairs in the 31-stop itinerary and source-precision state:
- 26 published estimate/unverified full legs
- 2 arrival-choice unresolved full legs
- 2 source-backed partial segments, not full legs
- 0 independently measured complete stop-to-stop driving legs

The JSON also stores seven separately sourced benchmark mileages with exact endpoints. It must not be used to sum a new full trip total.

## Release and remaining work
Tests cover all 30 stop pairs, reverse order, precise source scopes, unambiguous Google route destinations, fallback on unknown mileage, and preservation of the 31-stop planner. Final release additionally requires exact-head CI, browser checks at 360/390/768/1366/1440, Vercel preview and production verification after merge.

The next numerical threshold is independent route-provider measurement for each major stretch, with explicit origin, destination, chosen route, source/date, and any seasonal restrictions. Start with Keweenaw, Pictured Rocks–Whitefish–Sault, Wawa–Marathon–Nipigon–Thunder Bay, and the Pigeon River / Minnesota North Shore approach. Do not mark a full leg verified from a shorter published subsegment. The existing protected-homepage freshness CI issue must be resolved separately, without bypassing SEO protections.
