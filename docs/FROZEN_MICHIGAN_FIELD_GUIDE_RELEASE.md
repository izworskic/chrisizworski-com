# Frozen Michigan — standalone field guide release · 2026-10-27

## Product identity
Distinct from /michigan-ice-caves/ (specific evidence), /michigan-ice/ (whole-lake observations, **never** safety), /upper-peninsula-waterfalls/ (waterfall inventory), and /michigan-winter-activities/ (activity selection).

Eleven real places with primary access sources and conservative static claims. No fake current open/formation statuses. Full answers and links survive JavaScript failure. Map is regional orientation, not safe ice crossings or proven winter parking.

## Access source findings
- Sand Point inland curtains: NPS viewing page, plowed Sand Point road, park at beach lot, walk back 1/4–1/2 mi and uphill. No parking on road; no pets at formations.
- Grand Island: visible *from Sand Point beach*, binoculars. NPS warns **never walk on Lake Superior or Munising Bay ice**.
- Sand Point winter beach: NPS plowed parking, land-only shoreline viewing.
- Munising Falls: **NPS trail remains closed until further notice** after April 2025 washout (official alert visible October 27, 2026). Do not list as open.
- Tahquamenon: DNR Upper/Lower official viewing areas and winter trails. Lower to Upper connecting trail not maintained in winter per state winter trail map.
- Eben: Pure Michigan describes 0.75-mile historic route via private land; no guarantee of current permission/plowing/parking.
- Wagner: DNR 0.1-mi trail and parking; winter plowing not established.
- Bond: DNR vehicle access generally mid-May–mid-Oct; trail year-round but neither monitored nor groomed in winter.
- Ocqueoc: DNR marked public pathway but winter parking not verified and adjoining state forest campground has seasonal closure.
- Grand Haven: DNR official land-based state park and pier views; city warns about ice and piers.
- St Joseph: regional destination guide recommends Silver Beach and Tiscornia shore views; Berrien County discourages South Pier access in icy conditions.

## Photography
Three NPS images and Commons licensed winter photographs credited individually in captions with creator, source, license link, archive age. No invented visual, no substituted imagery from elsewhere. Photo blocked/missing => clearly labelled editorial placeholder preserving original credit. External hosts may rate-limit. 100/100 source availability not claimed without all actual photo loads.

## Tests & release gates
- node --test tests/frozen-michigan-release.test.js
- npm run verify:all
- browser 320/390/768/1366 + no-JS + forced image-block fallback
- map tiles, grouped markers, science explorer, access/region filters, photo provenance and screenshot review
- no ad-system change; protect all unrelated routes
- first deploy candidate via PR; merge only after green.

GSC effects and external live conditions remain unknown; this is a trip research interface, not a live predictor.

## Geometry correction
Individual mapped waterfall nodes, not the general park entrance centroid: Upper Tahquamenon Falls at 46.5748,-85.2568 (OSM node 1594106217 via https://mapcarta.com/Tahquamenon_Falls), Lower Tahquamenon Falls at 46.60432,-85.20687 (OSM node 1595401845 via https://mapcarta.com/22346198). These are feature markers only, not car parking. Pointing both to the park-office centroid would be misleading.

## 2026-10-27 integration fixes
- The existing winter activities regression suite previously prohibited any link to Frozen Michigan because it was unpublished. In this same new-guide release, the link is now intentionally real and the test explicitly checks the reciprocal guide handoff, while all other unreleased sibling guides stay prohibited.
- Updated dateModified and sitemap lastmod together for the three existing edited entry points (/tools/, /michigan-destinations/, /michigan-winter-activities/), preserving the site's freshness contract.
- On mobile, the ice-process number receives a fixed two-digit horizontal column, with title/subtitle text in an independent flexible column. This prevents vertical number wrapping at 320/390px.
