/**
 * Independently retrieved OSM node-to-way relationships for public Hattie Cove
 * day hikes. Source: OSM API 0.6 GET /node/<nodeId>/ways and /way/<wayId>/full.
 * Checked 2026-11-01; ODbL attribution: OpenStreetMap contributors.
 *
 * These records prove shared OSM node IDs between already-approved named
 * walking ways and road/footway features. They DO NOT prove that the point is
 * signed, legally accessible, a hiking entrance, or safely reachable from
 * Visitor Centre parking. No coordinates, track export or routing is offered.
 */
export const OSM_JUNCTION_AUDIT = Object.freeze({
  checkedOn: '2026-11-01',
  originalData: 'https://api.openstreetmap.org/api/0.6/',
  rights: 'https://www.openstreetmap.org/copyright',
  licence: 'https://opendatacommons.org/licenses/odbl/1-0/',
  sourceClass: 'community-mapped shared OSM node; not Parks Canada trailhead surveying',
  parkSurveyedStartCoordinates: false,
  fromParkingRoutingAuthorized: false,
  canOpenRoute: false,
});

const relation = (id, label, nodeId, trailWay, adjoiningWay, adjoiningClass, adjoiningName) =>
  Object.freeze({id,label,nodeId,trailWay,adjoiningWay,adjoiningClass,adjoiningName,signedTrailheadVerified:false});

export const MAPPED_JUNCTIONS = Object.freeze({
  'boardwalk-beach': Object.freeze([
    relation('boardwalk-south-loop','Boardwalk Beach Trail meets the mapped South Loop campground road.',4411571772,1307756994,443602401,'service-road','South Loop'),
    relation('boardwalk-beach-join','The named Boardwalk Beach line shares a node with Beach Trail.',6949726638,742332531,1434966490,'named-footway','Beach Trail'),
  ]),
  'southern-headland': Object.freeze([
    relation('headland-service-road','Southern Headland Trail meets an OSM service road and an unlabelled footway.',6949507750,742973686,742318982,'service-road','Campground service road'),
    relation('headland-beach-join','Southern Headland Trail shares a named footway node with Beach Trail.',4411571777,769800690,1434966490,'named-footway','Beach Trail'),
  ]),
  'bimose-kinoomagewnan': Object.freeze([
    relation('bimose-service-road','Bimose Kinoomagewnan meets an unnamed mapped campground service road.',10200596433,1115333798,443605468,'service-road','Campground service road'),
    relation('bimose-north-loop','The other end of the named Bimose line meets the mapped North Loop road.',10200614934,1115333798,72003674,'service-road','North Loop'),
  ]),
  'beach': Object.freeze([
    relation('beach-north-loop','Beach Trail meets the mapped North Loop campground road.',6954921565,1434966491,72003674,'service-road','North Loop'),
    relation('beach-headland-join','Beach Trail and Southern Headland Trail share a recorded way node.',4411571777,1434966490,769800690,'named-footway','Southern Headland Trail'),
    relation('beach-boardwalk-join','Beach Trail and Boardwalk Beach Trail share a recorded way node.',6949726638,1434966490,742332531,'named-footway','Boardwalk Beach Trail'),
  ]),
  'manito-miikana': Object.freeze([
    relation('manito-beach-join','Manito Miikana meets the named Beach Trail footway in OpenStreetMap.',6954949495,742973685,1434966489,'named-footway','Beach Trail'),
  ]),
});

const gaps = Object.freeze({
  'hattie-cove-fire-walk':'Parks Canada describes the Fire Walk via the Coastal Hiking Trail, but there is no reviewed, named public OSM way-to-road junction for this short itinerary.',
  'combination-hike':'Parks Canada gives a named multi-trail circuit, but neither a single continuously reviewed walking graph nor each intervening junction has been independently verified.',
  'white-river-bridge':'The White River Suspension Bridge hike is excluded from mapping and selection because of its documented closure. No candidate junction can override it.',
});

export function mappedJunctionEvidence(id,{blocked=false}={}) {
  const items = blocked ? [] : (MAPPED_JUNCTIONS[id] || []);
  const haveRoad = items.some(entry=>entry.adjoiningClass==='service-road');
  const haveNamed = items.some(entry=>entry.adjoiningClass==='named-footway');
  let heading;
  if (blocked) heading = 'Closed route · no access guidance';
  else if (haveRoad) heading = 'Mapped trail-to-road junctions exist';
  else if (haveNamed) heading = 'A named trail-to-trail junction exists';
  else heading = 'No reviewed mapped entrance junction';
  const summary = blocked
    ? 'A map record cannot overrule the official closure. Do not use trail lines to approach the White River bridge.'
    : items.length
      ? 'OpenStreetMap has matching node IDs for the relationships below. They establish where community-mapped ways meet, not a signed trailhead or an approved walking route from parking.'
      : gaps[id] || 'No independently reviewed public node-to-way relation is available for this itinerary.';
  return {id,heading,summary,items,checkedOn:OSM_JUNCTION_AUDIT.checkedOn,
    safety:'None of these community-map junctions establishes a signed entrance, current trail access, permission to use an adjoining road, or a complete walking route from the Visitor Centre.',
    source:'© OpenStreetMap contributors · ODbL 1.0'};
}
export const osmNodeUrl = id => 'https://www.openstreetmap.org/node/' + id;
export const osmWayUrl = id => 'https://www.openstreetmap.org/way/' + id;
