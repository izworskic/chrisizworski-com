# Space Coast: NPS active restrictions and historic GIS connectivity audit
Source research: November 1, 2026

## What visitor question this answers

Playalinda official parking and boardwalk geography is not sufficient to
establish current launch-day access. The new source-evidence layer separates
verified active NPS closure notices from historical GIS infrastructure,
while withholding actual walking routes and NASA launch-day exclusion
boundaries that have not been published or verified.

## Current official closure

Official live park JSON: https://www.nps.gov/cana/park-alerts-cana.json
Visitor NPS conditions: https://www.nps.gov/cana/planyourvisit/conditions.htm
2026 NPS superintendent's compendium:
https://www.nps.gov/cana/learn/management/superintendent-s-compendium.htm

November 1 source check found alert ID
99D85491-1733-4A65-85D7-987ADE3EF82F, category Park Closure,
title Playalinda District: Parking Lot #8-13, started October 25, 2026.

The notice expressly closes three different things:
- Main Playalinda road north of Eddy Creek to vehicles, people and bikes.
- Numbered parking lots 8–13 to visitor use.
- Beach north of Eddy Creek boardwalk to visitor use.

These restrictions are NOT a claim of boarded walkway structural failure,
precise barricade coordinates, beach exclusion boundaries, or a separate
NASA launch security order.

The existing launch endpoint reads the official NPS park alerts through
its normal 15-minute CDN cache; no added API call, scheduler or key. This
new overlay is displayed as current only when source verification succeeds
with an alert check no older than 90 minutes. Stale/unavailable results
yield unknown status, no fresh closure overlay, and an NPS direct link.

## Geographic source to scope NPS wording

Official NPS Roads service:
https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Roads/FeatureServer/0

Official NPS Trails Geographic service:
https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails_Geographic/FeatureServer/0

Audited fixture: data/space-coast-eddy-creek-nps-gis.json

The road is the actual historic NPS road feature facility 60814,
object 19954. Eddy Creek boardwalk is official trail facility 60932,
object 25516. The road line north of Eddy was derived by finding the
nearest official road centerline to the named historic boardwalk; the
gap is approximately 35 meters. That NOT a verified current barricade
position. The map marks a historic geographic reference for NPS verbal
closure, NOT a real-time road traffic stream or turn-by-turn route.

Each officially named closed parking lot is shaded using its original
NPS parking polygon, not an invented temporary exclusion boundary.
The beach boundary is displayed using the historic named Eddy Creek
boardwalk line; NO ocean/beach exclusion polygon is generated.

## Spatial connectivity audit

The actual 2025 NPS boardwalk GIS line endpoints and official NPS lot
polygon boundaries can be compared without guessing a connecting route.
All paired numbered boardwalks 1–13 have an endpoint approximately
0–9 meters from their matching lot's footprint boundary. One endpoint
overlaps the lot 5 polygon. These are **GIS topological proximity** facts,
not a complete walking route, legality certification, surface condition,
accessible path, or safe launch spectator position.

GIS boardwalk 14 remains deliberately unpaired: no public parking lot
14 exists in the NPS parking footprint inventory. Nothing routes a visitor
there. Source physical edits are from 2025 and don't confirm 2026 storm
repair status.

NPS September 2026 storm resilience plan is proposed work and must not be
presented as completed repairs:
https://www.nps.gov/cana/learn/news/canaveral-national-seashore-invites-public-feedback-on-plans-to-strengthen-storm-resilience-in-playalinda-district.htm

## Mission exclusion and marine hazard distinction

USSF/Coast Guard launch danger polygons offshore and in regulated navigable
water are NOT Playalinda public land closure polygons. KSC mission-specific
ticket/venue rules are separate. NASA/NPS may restrict land access without a
public GIS polygon. The engine explicitly reports that it cannot verify
NASA mission-specific LAND closure geometry and draws no guessed radius,
beach hazard polygon or pathway.

Official NPS launch policy:
https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm
Official NASA guidance:
https://www.nasa.gov/kennedy/see-a-launch-up-close/

## User interface and test gates

The Playalinda section now shows a source-dated current NPS access summary,
its named closed lots/road/beach, and original official links. The map has a
separate active-closure-reference toggle distinct from the historical
boardwalks and ordinary T-30 road policy. Selected lot detail includes
the approximate boardwalk-endpoint-to-lot-footprint gap in feet, explicitly
NOT a walking distance or path connection.

New tests guard fresh vs stale sources, exact closure scopes, official
notice metadata, lot polygons and scoped named road/boardwalk references,
missing NASA land polygons, and no invented parking-to-beach route.

Run:
node --test tests/space-coast-access-evidence.test.js
node --test tests/space-coast-boardwalk-gis.test.js
node --test tests/space-coast-geo.test.js

Release gate: full GitHub Actions repository tests, public-page audit,
identity checks and Vercel preview. After merge, verify exact production
commit READY and public desktop/mobile map, 13 parking cards, 14 historical
boardwalks, current NPS source timestamps and source links.

Next authoritative source opportunity: current NPS facility-level boardwalk
repair/completion reports, and mission-specific machine-readable LAND
exclusion maps published by NASA/NPS. Do not reverse-engineer map shapes
from Coast Guard marine launch danger notices.
