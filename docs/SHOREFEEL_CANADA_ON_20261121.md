# ShoreFeel Canada: first 18 Ontario Great Lakes beaches

## What is now built

A distinct Canadian shoreline field desk at `/great-lakes-beaches/canada/`. It retains a human geography and park-interpreter voice, a four-lake Canadian selection with an honest Lake Michigan U.S. handoff, a source-grounded 18-destination beach list, and a visible map that collapses when tiles cannot load. The selected place's report provides local setting, current or near-term *city-area* air and wind forecasts when verified, the forecast city and distance, official park and public-health links, and a Google Maps search for the named place. No ad or existing Michigan Beach Report settings are changed.

**18 initial locations:** Superior 4 (Agawa Bay, Katherine Cove, Pancake Bay, Neys); Huron including Georgian Bay 5 (Pinery, Inverhuron, Wasaga, Sauble, Grand Bend); Erie 4 (Port Burwell, Long Point, Port Stanley, Crystal/Bay Beach); Ontario 5 (Sandbanks Lakeshore, North Beach, Presqu'ile, Cobourg Victoria Beach, Toronto Woodbine).

Only the Canadian shores of the four Great Lakes that reach Canada are represented. Lake Michigan is entirely U.S.; this page hands visitors to the previously merged American regional explorer.

## Source register and spatial integrity

1. **ECCC Meteorological Service of Canada:** Experimental City Page Weather through GeoMet OGC API Features. `https://api.weather.gc.ca/collections/citypageweather-realtime/items?bbox=...`. Documented by https://eccc-msc.github.io/open-data/msc-data/citypage-weather/readme_citypageweather_en/ . The API supplies official city weather forecasts, **not** a forecast at the named beach. The proxy accepts only catalog beach slugs, constructs a bounded official query itself, rejects feature points farther than 55 km, checks a 16-hour data revision age and a 24-hour hourly forecast source timestamp, and displays only the present or imminent hourly value. The selected city and approximate distance remain visible.
2. **Ontario Parks:** sampled provincial park beach results via https://www.ontarioparks.ca/beachresults and current park alerts from the individual linked parks. Last season's samples do not mean swimming is currently safe.
3. **Local Ontario health and beach operators:** Grey Bruce Public Health; Lambton Public Health; Central Elgin; Niagara Region; Lakelands Public Health; City of Toronto. The curated source list contains direct official links for each municipal beach. The app does not scrape or fabricate a live bacterial status.
4. **ECCC licensing:** https://eccc-msc.github.io/open-data/licence/readme_en/ permits commercial uses with attribution. Every UI includes the required reference to ECCC's Data Server End-use Licence. We do not suggest ECCC endorsement.
5. **Coordinates:** approximate park or beach vicinity references, never validated parking pins, official swim boundaries, or physically observed thermometers. Google Maps links search the named park rather than navigate to an unverified point.

## Science boundary

An hourly forecast from a nearby ECCC town supplies temperature °C and 10-m forecast wind km/h. If the conditions qualify (air at or below 0°C with wind of at least 5 km/h), the standard Canadian wind-chill equation is applied; otherwise the unmodified forecast air value is shown. °F is a supporting conversion only. Water temperatures, regional averages, shoreline air adjustments, swim-safe flags, wave hazards and numerical confidence are **never inferred** from this city forecast. If no recent ECCC source or sufficiently close city forecast exists, the weather card explicitly says unavailable. This is not a calibrated beach-specific temperature.

Ontario Parks' beach results are seasonal; the app labels their link and never claims a current official sampling status. For marine safety, check the linked beach authority, beach flags and current weather before swimming.

## Experience investment and technology fit

- The selected Canadian page leads with recognizable park setting and a useful decision: nearby air outlook + wind + current official guidance.
- Reuses the regional responsive field-desk CSS and local Leaflet implementation, rather than creating a second competing beach ranking or large dashboard. Adds a forest-and-lake visual variant.
- Node.js + native fetch for the bounded public ECCC request. No Redis, cron, paid API, key, Java, Rust or Python runtime necessary. Source QA and historical comparison would be a separate future research job.
- No fake meteorological map heat layers or animated "live" badges. Park link, official safety link and a named Google Maps search appear before optional map tiles.
- Fully crawlable 18-row destination list in HTML, with links and source attribution even when JavaScript and tiles are disabled.
- Canada remains separate from Michigan's EGLE BeachGuard and the American NWS source policy.

## Release and future phases

Checks: `node --test tests/shorefeel-canada.test.js`; dedicated Chromium at 360/390/768/1280/1440, switching lake and beaches, checking distinct municipal authorities, missing ECCC, blocked tiles, mobile overflow and no-JS; full `npm run verify:all`; production build audit; canonical and `sitemap-beaches.xml` presence; Vercel preview.

This is the *first* Canadian atlas, not a complete inventory of every Ontario swimming beach. Later expand through verified individual municipality and park inventories, public access conditions and actual paired sand/inland air observations with permission and reliable calibration. Never generate a city-grid beach temperature correction without evidence.
