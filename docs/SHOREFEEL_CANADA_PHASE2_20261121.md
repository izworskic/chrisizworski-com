# ShoreFeel Canada: phase 2, Ontario shoreline density

**Source review date:** 2026-11-21
**Change type:** Curated geographic expansion of the existing Canadian explorer. No new API or forecast model, no ad or canonical changes.
**Status:** Implemented in a feature branch. Full repository CI, live ECCC, real-browser screenshots and production deployment require separate evidence before merge.

## What changes for visitors

The original 18 destination Canadian atlas now has 30 public shoreline references across the four Great Lakes with Canadian shores. Lake Superior 7; Huron, including Georgian Bay 9; Erie 6; Ontario 8. Lake Michigan remains a U.S. handoff.

Each additional shore has a named park or municipal operator, a direct official information page, an appropriate official beach-status authority, a location reference with its evidence URL and an interpretive field note. Visitors select a shore, see a nearby *city-area* ECCC forecast only when supported, and open official park and public-health guidance. The map marker is not a parking entrance or sand thermometer.

New shoreline destinations:

| Lake | Place | Park or local source | Advisory owner | Reference evidence |
| --- | --- | --- | --- | --- |
| Superior | Batchawana Bay Provincial Park | https://www.ontarioparks.ca/park/batchawanabay | Ontario Parks | https://www.ontarioparks.ca/park/batchawanabay/maps |
| Superior | Old Woman Bay | https://www.ontarioparks.ca/park/lakesuperior | Ontario Parks | https://www.ridelakesuperior.com/listings/old-woman-bay/ |
| Superior | Terrace Bay Beach | https://visitterracebay.ca/attractions/terrace-bay-beach/ | Thunder Bay District Health Unit: https://www.tbdhu.com/beaches | https://www.ridelakesuperior.com/listings/terrace-bay-beach/ |
| Huron | Awenda Provincial Park | https://www.ontarioparks.ca/park/awenda | Ontario Parks | https://www.ontarioparks.ca/park/awenda/maps |
| Huron | Killbear Provincial Park | https://www.ontarioparks.ca/park/killbear | Ontario Parks | https://www.ontarioparks.ca/park/killbear/maps |
| Huron | Station Beach, Kincardine | https://www.kincardine.ca/be-active/beaches-parks-trails-and-facilities/beaches/ | Grey Bruce Public Health | https://mapcarta.com/W115940874 |
| Huron | Bayfield Pier Beach | https://www.municipalityofbluewater.ca/parks-recreation-and-culture/beaches-and-marinas/beaches/ | Huron Perth Public Health: https://www.hpph.ca/inspections-reporting/beach-water-quality/ | https://mapcarta.com/W614330563 |
| Erie | Rondeau Provincial Park | https://www.ontarioparks.ca/park/rondeau | Ontario Parks | https://www.ontarioparks.ca/park/rondeau/maps |
| Erie | Turkey Point Beach | https://www.ontarioparks.ca/park/turkeypoint | Ontario Parks | https://www.ontarioparks.ca/park/turkeypoint/maps |
| Ontario | Darlington Provincial Park | https://www.ontarioparks.ca/park/darlington | Ontario Parks | https://www.ontarioparks.ca/park/darlington/maps |
| Ontario | Bluffer's Beach, Toronto | https://www.toronto.ca/explore-enjoy/parks-recreation/places-spaces/beaches-gardens-attractions/beaches/ | City of Toronto | https://mapcarta.com/W43106675 |
| Ontario | Cherry Beach, Toronto | https://www.toronto.ca/explore-enjoy/parks-recreation/places-spaces/beaches-gardens-attractions/beaches/ | City of Toronto | https://geonames.nrcan.gc.ca/search-place-names/unique?id=FARWO |

The named source authority is an **external page to check**, not a live ingestion or present-day water-quality verdict. Toronto's lifeguard/beach monitoring is seasonal. The Kincardine municipal beaches page links a Smart Beach Light program separately from Grey Bruce Public Health bacterial monitoring. An old Ontario Parks sample is never displayed as current.

## Data and science boundary

- The existing `/api/shorefeel-ca` accepts only allowlisted catalogue slugs. Nearest ECCC hourly city forecasts pass source-age, distance and timestamp checks, otherwise the current value is withheld.
- Standard Canadian wind chill applies only in its existing cold and windy domain. The displayed value does **not** combine air and lake temperature into a novel, unvalidated on-sand temperature.
- Shoreline exposure stories are geographic interpretation, not measured wind direction, measured water temperature, wave advice or promises of safety.
- No Redis, paid forecast service, key, cron or new function. Existing SEO and advertising contracts remain untouched.
- New location reference coordinates identify approximate beach or park vicinity. Use named-place Google Maps search, not unverified driving directions.

## Technical change list

1. Add 12 source-backed records in `data/shorefeel-canada-ontario.json`.
2. Regenerate 30 crawlable destination rows in `public/great-lakes-beaches/canada/index.html` using the exact existing generator contract.
3. Update visible site-to-site Canadian counts in the Canadian explorer, U.S. shoreline explorer and Michigan beach hub.
4. Extend fixture tests and responsive/no-script browser assertions from 18 to 30, with independent checks for new municipal authorities.

## Release checklist

- Run `node scripts/generate-shorefeel-ca.mjs` and assert there is no generated diff.
- Run `node --test tests/shorefeel-canada.test.js`.
- Run `node scripts/verify-shorefeel-ca-browser.cjs` in a real Chromium environment at widths 360, 390, 768, 1280 and 1440.
- Switch Superior to Huron to Erie to Ontario and back. Check a new municipality, missing ECCC, blocked map tiles, keyboard and no-script links.
- Run `npm run verify:all`. Inspect exact PR head CI and a Vercel preview. Do not merge if red or unverified.
- After deployment, check current ECCC place/source hours separately and confirm new beach choices work on the public canonical.

## Next science investment, not claimed here

Collect independently observed pairs of shoreline and nearby inland air temperatures, plus wind direction, wind speed, lake temperature and observation time at named stations. Evaluate uncertainty and event-blocked holdout performance before promising a corrected actual-at-the-beach temperature. The present expansion improves places and sourcing, not the physical model's calibration.
