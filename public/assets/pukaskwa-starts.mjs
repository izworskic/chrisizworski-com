/**
 * Pukaskwa signed-start evidence. This is visitor orientation, never a GPS
 * route, trailhead pin, map connector, current access report or navigation file.
 * Verified on 2026-11-01 against Parks Canada's published eight day hikes.
 */
export const OFFICIAL_HIKES = 'https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking';
export const OFFICIAL_VISITOR_CENTRE = 'https://parks.canada.ca/pn-np/on/pukaskwa/visit/services/boutique';
export const OFFICIAL_PARK_RULES = 'https://parks.canada.ca/pn-np/on/pukaskwa/visit/reglement-rules-and-regulations';
export const OFFICIAL_RESPONSIBLE_VISIT = 'https://parks.canada.ca/voyage-travel/conseils-tips/guide';

const caveat = 'Signed trail starts and junction coordinates are not independently verified. Use the official illustrated trail map and on-site signs; the optional community-mapped line is incomplete.';
const starts = Object.freeze({
  'boardwalk-beach': {
    destination: 'Horseshoe Bay',
    guidance: 'Parks Canada describes the return walk from the Visitor Centre toward Horseshoe Bay by the Boardwalk Beach Trail. The official guide labels it an accessible trail; current surface conditions still need checking.',
    namedSequence: ['Visitor Centre', 'Boardwalk Beach Trail', 'Horseshoe Bay', 'Return to Visitor Centre'],
  },
  'hattie-cove-fire-walk': {
    destination: '2012 Hattie Cove prescribed-fire area',
    guidance: 'Parks Canada names this short Fire Walk via the Coastal Hiking Trail. It does not have its own dated trail-condition row or an approved mapped line on this page.',
    namedSequence: ['Visitor Centre', 'Fire Walk via Coastal Hiking Trail', 'Return to Visitor Centre'],
  },
  'beach': {
    destination: 'Middle Beach',
    guidance: 'Parks Canada describes a return walk from the Visitor Centre along the Beach Trail to Middle Beach. Driftwood and sand are part of the published trail description; the mapped line lacks verified start and return connectors.',
    namedSequence: ['Visitor Centre', 'Beach Trail', 'Middle Beach', 'Return to Visitor Centre'],
  },
  'southern-headland': {
    destination: 'Southern Headland and Lake Superior views',
    guidance: 'Parks Canada describes a return walk from the Visitor Centre onto the Southern Headland, with views of Hattie Cove, Pulpwood Harbour and Horseshoe Bay. The red-chair map pin identifies a viewpoint, not the signed trail start.',
    namedSequence: ['Visitor Centre', 'Southern Headland Trail', 'Headland viewpoints', 'Return to Visitor Centre'],
  },
  'manito-miikana': {
    destination: 'Lake Superior and Pic River Dunes overlooks',
    guidance: 'The official Manito Miikana return walk begins at the Visitor Centre and reaches two viewing decks. The public GIS parking point is not an independently verified entrance to this named trail.',
    namedSequence: ['Visitor Centre', 'Follow park signs for Manito Miikana', 'Viewing decks', 'Return to Visitor Centre'],
  },
  'bimose-kinoomagewnan': {
    destination: 'Halfway Lake and Seven Grandfather Teachings',
    guidance: 'Parks Canada describes this 3.7 km return from the Visitor Centre around Halfway Lake. Allow time to engage with the Seven Grandfather Teachings shared by local Ojibway elders and youth. No starting-path connector is verified.',
    namedSequence: ['Visitor Centre', 'Follow park signs for Bimose Kinoomagewnan', 'Halfway Lake teachings', 'Return to Visitor Centre'],
  },
  'combination-hike': {
    destination: 'Headland, shore, North Loop and Halfway Lake',
    guidance: 'Parks Canada explicitly publishes this sequence: begin at the Visitor Centre, take Southern Headland to Horseshoe Beach, join Beach Trail to the North Loop Campground, continue around Halfway Lake, then return to the Visitor Centre via the road. The connecting paths have not been verified in the live trail feed or coordinate map.',
    namedSequence: ['Visitor Centre', 'Southern Headland', 'Horseshoe Beach', 'Beach Trail', 'North Loop Campground', 'Halfway Lake', 'Road return to Visitor Centre'],
  },
  'white-river-bridge': {
    destination: 'White River Suspension Bridge',
    guidance: 'The official 18 km hike begins at the Visitor Centre via the Coastal Hiking Trail. The most recent documented closure bars this from the chooser. No trail geometry or bridge approach is published here.',
    namedSequence: ['Visitor Centre', 'Coastal Hiking Trail', 'White River Suspension Bridge (subject to closure)'],
  },
});

export function startAdvice(id,{closed=false,hasApprovedGeometry=false}={}) {
  if (!Object.hasOwn(starts,id)) return null;
  const entry=starts[id];
  return {
    id,
    start:'Pukaskwa Hattie Cove Visitor Centre',
    startProof:'Parks Canada gives the full return duration and distance from the Visitor Centre.',
    officialParking:'Day-use parking is documented at the Visitor Centre, but seasonal parking and road access are not confirmed.',
    destination:entry.destination,
    guidance:entry.guidance,
    sequence:[...entry.namedSequence],
    closureNote:closed
      ? 'Closure takes precedence: do not enter this route based on a line or older map.'
      : 'This sequence describes named places from the official guide; do not use it as turn-by-turn navigation.',
    geometryNote:hasApprovedGeometry
      ? caveat
      : 'No approved coordinate centerline for this outing is displayed. Use the official illustrated map and park signs; do not infer a path from the parking pin.',
    evidence:[OFFICIAL_HIKES,OFFICIAL_VISITOR_CENTRE],
    signedCoordinatesVerified:false,
    routeNavigationCertified:false,
    parkingToSignedEntranceVerified:false,
    pedestrianAccessEvidence: id==='combination-hike'
      ? 'Parks Canada expressly describes the named hiking circuit and the road return to the Visitor Centre. The exact signed entrances, road junctions and coordinate-by-coordinate parking connection remain unverified.'
      : id==='white-river-bridge'
        ? 'A published Visitor Centre origin does not override the documented White River Suspension Bridge trail closure. No approach directions are authorized.'
        : 'Parks Canada publishes this outing from the Visitor Centre, but no authoritative coordinate-by-coordinate walk from parking to its signed trail entrance has been verified.',
    accessEvidenceClass: id==='white-river-bridge' ? 'closed-no-route' : id==='combination-hike' ? 'official-named-circuit-no-gps' : 'official-origin-no-gps',
    establishedPathRule:'Follow established hiking or walking trails and park roadways. Stay off unmarked shortcuts; do not cut across campsites or enter protected areas.',
    pathRuleSources:[OFFICIAL_PARK_RULES,OFFICIAL_RESPONSIBLE_VISIT],
  };
}

export const EIGHT_DAY_HIKE_IDS = Object.freeze(Object.keys(starts));
