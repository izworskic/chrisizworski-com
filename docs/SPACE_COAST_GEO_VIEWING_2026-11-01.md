# Space Coast Geographic Viewing Intelligence v1
Research and release: November 1, 2026

## Purpose
The Space Coast launch tool already knew the selected mission, LL2 pad coordinates,
NPS closure alerts and official KSC viewing notices. This release connects the
mission pad to an evidence-attributed inventory of public viewing sites and
official entrances, not invented parking-lot GPS.

## GIS provenance
All coordinates are WGS84 decimal latitude/longitude. Geographic evidence has
three distinct roles:

1. Restricted launch pad: dynamic LL2 pad, never a navigation destination.
2. Site reference: approximate park/pier/trailhead reference, corroborated by
   the park operator's official launch-viewing listing. Not an exact spectator
   position or guaranteed parking stall.
3. Official entrance: published KSC or NPS arrival coordinates; not a viewing
   lawn, beach lot, or road access clearance.

| Reference | Coordinates | Role | Access authority | Coordinate evidence |
|---|---|---|---|---|
| Space View Park | 28.6139417, -80.8037278 | Public park/pier reference | Brevard County | SaltChef GPS pier listing |
| Parrish Park | 28.624745, -80.792944 | Public park/trailhead reference | Brevard County | FloridaHikes trailhead |
| Rotary Riverfront Park | 28.566364, -80.798183 | Public park entrance reference | Brevard County | SaltChef GPS entrance |
| Jetty Park | 28.407304, -80.591899 | Public park/trailhead reference | Port Canaveral | FloridaHikes trailhead |
| KSC Visitor Complex | 28.515556, -80.681667 | Official arrival entrance only | KSC | Official KSC published GPS |
| Playalinda entrance | 28.6450, -80.6834 | Official entry checkpoint only | NPS | Official NPS directions GPS |

Full primary and coordinate-source links are attached to every record in
lib/space-coast-geo.js. Source audit date is 2026-11-01, NOT a continuously
verified claim of site accessibility.

Intentionally unpinned: individual Playalinda lots, Gantry, Apollo/Saturn V
Center, Alan Shepard Park, and any unverified visitor entrance. Their official
rules and descriptions remain on the page in the original access desk.
Do not route to KSC restricted viewing facilities or the launch pad.

## Safety and evidence
- No extra LL2 calls: geographicViewing is joined onto the existing cached
  selected-launch response.
- Pad coordinates must be finite within Florida and cannot become zero when
  LL2 omits a field.
- Ground-arc distance and true initial compass bearing go from an approximate
  public park reference toward the pad. They cannot prove line-of-sight, rocket
  trajectory, launch weather, or road travel times.
- Official NPS park alert status is reused; a missing alert is NOT evidence that
  a numbered beach lot is open or that the launch will proceed.
- Playalinda official entrance coordinates are not individual parking GPS.
  NPS published inbound entry generally stops around T-30. NASA may override
  or close areas at any time. We do not manufacture a closure polygon.
- Port Canaveral Jetty Park regular 7am-9pm visitor hours, pass requirements,
  and special launch-hours changes remain explicit and operator-dependent.
- KSC visitor entry GPS is published by KSC. Special launch viewing is
  mission-specific and often accessible only by KSC security buses.
- Profiles Family, Photography, Pad Proximity, Less Walking reorder known
  choices by documented features; they are NOT scored confirmations of access
  or certified accessible routes.
- Driving links use documented public facility addresses or official entrance
  GPS only. Restricted facilities never have directions links.

## Design, map and costs
- Dedicated geo-map.js script listening to space-coast:launch-loaded from the
  existing page after mission selection; no independent launch-feed polling.
- Leaflet 1.9.4 and CARTO Voyager via existing public /api/carto-basemap-config.
  OSM tile fallback retains attribution and maps without an additional key,
  provider or Redis. If Leaflet fails, source cards and safe links remain.
- Unique marker styles: public park, access checkpoint, restricted pad.
  The dashed line between public park and pad denotes ground bearing only;
  it is not a route or rocket trajectory.
- Responsive, mobile-safe scroll behavior; no disruption to SEO, ads, other
  tools, or existing KSC source history.

## Tests
node --test tests/space-coast-geo.test.js

Tests guard provenance, map role semantics, missing LL2 GPS, distance and
bearing validity, disabled geometry for entrance points, NPS uncertainty,
County launch access, Port Canaveral nighttime caveat, and frontend wiring.

## Next verification investment
Verify individual numbered Playalinda lot map references and lawful pedestrian
paths against actual NPS GIS; use official currently dated restriction geometry
only when published. Add per-viewpoint NWS cloud grids and live public road
closures only with authenticated, authoritative sources.
