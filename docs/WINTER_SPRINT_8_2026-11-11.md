# Sprint 8 | Frozen Great Lakes visitor decisions

**Release date:** November 11, 2026
**Primary URL:** /frozen-michigan/
**Connected owners:** /michigan-ice/regions/saginaw-bay.html, /michigan-ice/, /michigan-ice-caves/ and five source-owned formation destination guides, /upper-peninsula-waterfalls/.

## Visitor problem and solution

A visitor searching for frozen Michigan could find eleven attractive winter photographs, an honest five-site formation evidence model and NOAA regional ice charts, but little help distinguishing whether *their desired scene* is worth planning around now. The new progressive-enhancement field desk on the **existing** 11-location field guide starts with interests (shoreline/lighthouses, ice curtains, waterfalls, short walk, Saginaw Bay observational freeze-up), region and tolerance for winter-access uncertainty. It returns only a **curated subset of the eleven published entries** and shows the original land-manager source and card-level winter access note. Nothing new is claimed to be open, formed, safe, or groomed.

Its optional first-party observation source is `/api/ice?view=caves` (existing `lib/michigan-ice/caves.mjs`). The browser accepts only a fresh, five-site bundle. Current formation promotion requires a dated official site report, <=72-hour observation age, explicit fresh reporting, a separate access review within 24 hours, and valid current viewing window. Stale source, unreviewed access, and no report all explicitly **fail closed**. The site's current source registry has zero validated formation observations or access reviews, so this will normally show *unconfirmed*, not a fabricated "formed" signal. A weather forecast, NOAA whole-lake chart, a cold metric or an archived winter can never substitute.

## Scope mismatch protection

The site evidence owner maps **five** individual feature scopes: Sand Point inland curtains (stop 1), Grand Island across Munising Bay from shore (stop 3), Eben inland curtains (stop 4), Upper Tahquamenon (stop 5) and Wagner (stop 7). Sand Point beach (stop 2) is **not** a surrogate inland-curtain report; Lower Tahquamenon (stop 6) does **not** inherit Upper Falls evidence. No other waterfall or lighthouse is given an unverified dynamic formation signal.

For Saginaw Bay the planner routes to the dedicated `/michigan-ice/regions/saginaw-bay.html` tool. Wind and thermal history are context. NOAA Lake Huron whole-lake concentration does not equal Saginaw Bay local percent, measured ice thickness, crack status or travel safety. No ice-walking, angling or vehicle-route directions are generated.

## Official access corrections checked 2026-11-11

- Pictured Rocks NPS winter activities and road closures: https://www.nps.gov/piro/planyourvisit/winteractivities.htm and https://www.nps.gov/piro/planyourvisit/winter-road-closures.htm . Only Sand Point Road is normally plowed. NPS signposts ice-viewing areas but explicitly says **there are no designated trails** to the inland escarpment. Corrected erroneous "signed uphill winter trail" to unmaintained uphill approach. Check current road/park alerts before departure.
- NPS conditions: https://www.nps.gov/piro/planyourvisit/conditions.htm lists Munising Falls trail CLOSED until further notice after 2025 washout. The new field desk never treats the former short walkway as open.
- Michigan DNR Lower Falls winter map and park: https://www.michigan.gov/recsearch/parks/tahquamenonfalls . Winter trail and Hemlock area are documented but current parking/plowing and exact walk are **not** verified here. Corrected "Park Service" error (state DNR manages it), removed falsely assured plowed parking, reclassified Lower Falls as conditional access. The walking trail connecting Upper and Lower Falls is not maintained in winter.
- Michigan DNR ice safety: https://www.michigan.gov/dnr/education/safety-info/ice . Ice presence alone is never a safe-ice determination.

## Engineering and SEO guardrails

No new indexable route, duplicate ice model, outdoor access pin, new photo, altered ad loader, title/H1, or user-location data collection. The filtered 11 scenic cards, image licensing/fallback, grouped Leaflet map, science illustration and non-JS source notes remain. The new client engine uses `textContent` and DOM-derived card data, not HTML from the evidence feed, to avoid interpreted source text. The live /api source is capped at a nine-second request and fails to the static trip guide.

The ice-caves source generator and all six existing output pages now link back to the new Frozen Michigan desk, with correct 2026-11-11 dateModified and existing `sitemap-winter.xml` freshness dates. The original Noindex/ads/network safety remains unchanged.

## Release gates and measurement

Run `node --test tests/winter-sprint8-frozen-readiness.test.js`, existing frozen field guide and caves/ice model tests, full `npm run verify:all`, built public page audit and browser smoke with map/JS disabled and 320/390-pixel widths. Preview and production Vercel status must be green before considering the sprint deployed. Compare complete post-release GSC 7- and 28-day impressions, clicks and CTR on the 11-place hub, five-site evidence hub, regional Saginaw Bay and water/shore tool cohorts. Do **not** infer new AdSense revenue or claim an outing became safer from publishing these UI changes.
