# Space Coast: verified NPS boardwalk GIS and parking-to-beach evidence
Source audit: November 1, 2026
Status: implementation. Never assume approval, current walkability, or a complete walking route.

## Why this is different

Before this release the Space Coast map knew all thirteen official numbered
Playalinda parking polygons and could distinguish NPS restrictions. What it
could NOT know was where visitors actually go from the lots. A satellite
image or straight line between a lot centroid and an arbitrary beach point is
not sufficient for a safe hiking/accessible route.

We discovered the **NPS Public Trails Geographic FeatureServer**, an official
NPS dataset that includes specifically named Playalinda Boardwalks 1-14
with their real centerline vertices and Federal facility location IDs.

Source:
https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Trails_Geographic/FeatureServer/0

Filtered source: UNITCODE='CANA', TRLNAME='PD Boardwalk #', where # 1-14.
Full coordinates archived in data/space-coast-playalinda-boardwalks.json.

Every boardwalk was recorded TRLSTATUS=Existing, with GIS EDITDATE =
2025-08-12. OPENTOPUBLIC was NULL for all fourteen. **This is not evidence
of current walkable condition.** By November 2025 and again in 2026 the NPS
had reported significant storm damage and considered further repairs or
relocation. Published future alternatives are NOT actual current changes.

Official storm management 2026:
https://www.nps.gov/cana/learn/news/canaveral-national-seashore-invites-public-feedback-on-plans-to-strengthen-storm-resilience-in-playalinda-district.htm
https://planning.nps.gov/projectHome.cfm?projectID=132971

NPS access:
https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm
NPS ramp FAQ:
https://www.nps.gov/cana/faqs.htm
NPS mobility description:
https://www.nps.gov/cana/planyourvisit/physical-mobility.htm

## Source-certified lines (not a turn-by-turn pedestrian route)

| NPS boardwalk | NPS facility ID | Historic centerline (meters) | Approximate distance between a line endpoint and matching parking lot CENTROID (meters) |
|---|---|---:|---:|
|1|60925|47|43|
|2|60926|43|28|
|3|60927|45|38|
|4|60928|51|19|
|5|60929|45|50|
|6|60930|55|55|
|7|60931|64|48|
|8|60933|41|21|
|9|60934|37|20|
|10|60935|39|14|
|11|60936|42|62|
|12|60937|65|54|
|13|60938|28|62|
|14|60939|42|Unpaired; no public parking area #14|

Numbers 1-13 have exact matching named historical trail GIS assets, within
about 14-62 meters of the corresponding lot centroid; this is a useful source
cross-check. It does not establish that the paths touch the NPS parking
boundary or continue from an individual vehicle space. Do not draw fake
connectors. A centerline length of 47 m is NOT a 47 m walk from the car to a
public shoreline or safe viewing location.

Boardwalk 14 is a separately identified GIS line north of Lot 13.
NPS publicly describes fourteen beach accesses but maps thirteen numbered
parking areas. Do NOT invent Lot 14, connect boardwalk 14 directly to Lot 13,
or produce directions to its coordinate.

## Source confidence and current closures

For each matching lot:
- Stage 1: NPS parking footprint georeferenced, live opening unknown.
- Stage 2: NPS historic boardwalk geometry displayed and length of the
  centerline reported in approximate feet, not complete walking distance.
- Stage 3: the shoreline and spectator position are not verified as legally
  open or physically accessible at the mission's launch time.

NPS confirms access ramps listed in its FAQ at 2,3,8,10,11,12. These refer
to facilities, not certified safe passage on the launch day, not beach
wheelchair availability, and not the status of boardwalks needing repair.

When NPS active alerts identify numbered parking lots as closed, the
matching boardwalk carries 'access from parking restricted.' This is NOT a
claim of boardwalk structural damage or an independent closure.

A specific NPS active alert that names a closed boardwalk, or closes
the entire Playalinda district, may be surfaced as 'NPS official closure.'
'Beach north of boardwalk 8 closed' uses boardwalk 8 as a boundary and MUST
NOT falsely claim that boardwalk 8 itself is closed. Preserve unknown
statuses when source alerts fail, with no positive opening inference.

Road entry cutoff T-30 is independent of this GIS and remains the existing
mission-based *estimated* NPS policy, never a live traffic gate status.
Any current NASA security closure supersedes historical GIS existence.

## Visitor experience

- Responsive Space Coast map overlays **14 real NPS boardwalk centerlines**,
  never a drawn straight line from parking to beach.
- Historic line toggle kept separate from NPS T-30 road-policy toggle.
- Links to NPS official access rules and trail GIS provenance.
- A three-stage inspection when selecting any of the 13 Playalinda lots.
- The map includes boardwalk 14 for factual context with explicit
  “no matching public parking” warning, not a selectable route.
- Source dates, centerline length, closure confidence, dune and accessibility
  cautions accompany the physical line; no traffic, ticket, user-claimed
  visibility, or parking capacity is invented.
- Existing CARTO with OSM fallback, LL2/NPS weather and closure checks
  retained. No new keys, database migration or Redis.

## Quality gates

node --test tests/space-coast-boardwalk-gis.test.js
node --test tests/space-coast-playalinda-gis.test.js
node --test tests/space-coast-geo.test.js

Then full repository verification, public audit, protected Vercel preview,
merge, production commit READY, mobile and desktop user page QA and a live
API check for exactly 14 NPS boardwalk lines, 13 numbered lot associations,
and #14 unpaired.

### Future additional evidence, not implemented

We must obtain current park-certified lot-to-boardwalk connectors, exact
accessible gradients/surfaces, storm repair and beach opening records, and
updated NASA mission-specific exclusion geometry before providing actual
walking routes. New boardwalks or bridge designs shown as *alternatives*
in the September 2026 storm plan may not be displayed as constructed.
