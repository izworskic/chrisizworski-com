# ShoreFeel network integration — 23 November 2026

The visitor should be able to move from beach-air comfort to the right
NOAA water evidence without mistaking one for the other.

## Connected surfaces

- Michigan Beach Report: 50 existing beach canonicals. On each individual
  page, the ShoreFeel section now links to source-proven NOAA water evidence.
- Other U.S. shorelines: 16 beach canonicals using NWS land-area air
  forecasts, with links to lakewide NOAA evidence.
- Ontario: 30 beach canonicals using ECCC nearby city air forecasts, with
  the same contextual water-evidence links.
- Grand Haven State Park gets the deep Grand Haven water forecast page.
- Bay City State Park gets the Saginaw Bay satellite evidence and experimental
  shoreline analysis page. That page now links back to the named beach page.
- All other Lake Michigan locations link to the Lake Michigan water hub.
  Other Great Lakes link to the all-five-lakes water hub.
- The all-five-lakes hub now links to all three beach discovery regions.

The single source-controlled function in
`lib/shorefeel/network-links.js` selects links for both generator scripts.
`scripts/connect-shorefeel-network.mjs` synchronizes legacy static
Michigan pages at build time, and fails the build if any of the 96 detail
pages lacks a route to the correct water context.

## Scientific separation remains mandatory

The large number on individual U.S. beach pages is NWS temperature or
wind chill/heat index, not on-sand air. Canadian pages use ECCC local
city forecast or applicable wind chill. Michigan pages use an Open-Meteo
modeled apparent temperature. The linked NOAA lakewide water analysis is
not a beach thermometer and **never** silently alters the air reading.

The numeric shoreline physics pilot is currently specific to Saginaw
Bay and research-stage. Its source and scale limitations block general
application to 96 shores. This PR connects verified existing engines
and user journeys; it does not fabricate a unified 400 m shoreline
air-cooling model or add NOAA calls to 96 pages.

## Source and operating constraints

No new APIs, paid services, cron jobs, state store, AdSense changes,
canonical changes or new indexed page types. Existing original names,
government weather authorities and official advisory links remain.
Source CSS is scoped to a plain contextual link, not a new card.
