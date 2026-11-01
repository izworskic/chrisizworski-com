'use strict';

// A park's mapped reference, its legal public entrance and the actual
// spectator position are NOT interchangeable. Coordinates without a
// documented entrance must never be sent to turn-by-turn navigation.
const R = 3958.7613;
const PLAYALINDA_GIS = require('../data/space-coast-playalinda-gis.json');
const { npsLotClosure, npsParkWideClosure } = require('./space-coast-decision');
const RAMP_LOTS = new Set([2,3,8,10,11,12]);
const CALENDAR = '2026-11-01';
const SOURCE_NPS = 'https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm';
const REFERENCE_POINTS = [
  {
    id: 'space-view', lat: 28.6139417, lon: -80.8037278,
    coordinateRole: 'site-reference', coordinateEvidence: 'secondary-park-pier',
    geographicSource: 'https://www.saltchef.com/catch_fish/FL/Brevard/fishing_piers.html',
    sourceChecked: CALENDAR,
    accessSource: 'https://www.brevardfl.gov/ParksAndRecreation/ParkDirectory/SpaceView',
    category: 'public-viewpoint',
    visitorFeatures: ['Restrooms', 'Riverfront', 'Free parking listed', 'County says open for launches'],
    profiles: ['family','photo','low-walk'], parking: 'The county lists free parking; specific spaces and launch-day availability are not verified.',
    geographyCaveat: 'Pin is an approximate park/pier reference, not a surveyed viewing position or exact parking entrance.',
    navigation: { type: 'address', value: '8 Broad St, Titusville, FL 32796', caveat: 'County street address; check local parking signs and event restrictions.' }
  },
  {
    id: 'parrish', lat: 28.624745, lon: -80.792944,
    coordinateRole: 'site-reference', coordinateEvidence: 'secondary-published-trailhead',
    geographicSource: 'https://floridahikes.com/parrish-park/',
    sourceChecked: CALENDAR,
    accessSource: 'https://www.brevardfl.gov/ParksAndRecreation/ParkDirectory/Parrish-Titusville',
    category: 'public-viewpoint',
    visitorFeatures: ['Restrooms', 'Riverfront', 'Paved vehicle parking listed', 'East side pedestrian-only'],
    profiles: ['photo','close','family'], parking: 'Brevard County lists parking but does not guarantee launch-day spaces. Eastern park areas are pedestrian-only.',
    geographyCaveat: 'Published trailhead coordinate is an approximate location reference, not a guaranteed parking space.',
    navigation: { type: 'address', value: '1 A Max Brewer Memorial Pkwy, Titusville, FL 32796', caveat: 'County street address; verify open approach roads and parking.' }
  },
  {
    id: 'rotary', lat: 28.566364, lon: -80.798183,
    coordinateRole: 'site-reference', coordinateEvidence: 'secondary-published-entrance',
    geographicSource: 'https://www.saltchef.com/catch_fish/FL/Brevard/county_city_parks.html',
    sourceChecked: CALENDAR,
    accessSource: 'https://www.brevardfl.gov/ParksAndRecreation/ParkDirectory/RotaryRiverfront',
    category: 'public-viewpoint',
    visitorFeatures: ['Playground', 'Restrooms', 'Riverfront', 'County says open for launches'],
    profiles: ['family','low-walk','photo'], parking: 'The county lists free parking but spaces can fill. No live capacity feed.',
    geographyCaveat: 'Entrance coordinate from a secondary park directory; precise accessible routes and launch-day parking not verified.',
    navigation: { type: 'address', value: '4141 S Washington Ave, Titusville, FL 32780', caveat: 'County street address; confirm parking on arrival.' }
  },
  {
    id: 'jetty', lat: 28.407304, lon: -80.591899,
    coordinateRole: 'site-reference', coordinateEvidence: 'secondary-published-trailhead',
    geographicSource: 'https://floridahikes.com/jetty-park/',
    sourceChecked: CALENDAR,
    accessSource: 'https://www.portcanaveral.com/park-services/jetty-park/beach-and-pier/-page-1-',
    category: 'public-viewpoint',
    visitorFeatures: ['Beach', 'Pier', 'Restrooms', 'Paid pass required'],
    profiles: ['family','photo'], parking: 'Port Canaveral requires a purchased park pass; regular daytime-to-evening hours apply. Launch exceptions require confirmation.',
    geographyCaveat: 'Published trailhead map reference. It does not identify a specific public parking stall or launch viewing position.',
    navigation: { type: 'address', value: '9035 Campground Circle, Cape Canaveral, FL 32920', caveat: 'Purchase park access as required; check official hours for this launch.' }
  },
  {
    id: 'ksc-visitor', lat: 28.515556, lon: -80.681667,
    coordinateRole: 'verified-public-entrance', coordinateEvidence: 'official-operator-gps',
    geographicSource: 'https://www.kennedyspacecenter.com/info/plan-your-visit/travel-information-and-parking/',
    sourceChecked: CALENDAR,
    accessSource: 'https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/launch-viewing-locations',
    category: 'ticketed-entry',
    visitorFeatures: ['Ticketed admission', 'Official visitor entrance', 'Bus-only access to restricted viewing areas'],
    profiles: ['family','low-walk'], parking: 'The coordinate is the official visitor-complex arrival reference, not North Atlantis Lawn, Banana Creek, or The Gantry.',
    geographyCaveat: 'This is an operator-published visitor arrival coordinate. Distance to a launch pad from this entrance would not equal the distance from a viewing lawn.',
    navigation: { type: 'coordinates', value: '28.515556,-80.681667', caveat: 'KSC official visitor-complex GPS. Never navigate directly to a restricted viewing facility.' }
  },
  {
    id: 'playalinda-gate', lat: 28.6450, lon: -80.6834,
    coordinateRole: 'verified-public-entrance', coordinateEvidence: 'official-nps-gps',
    geographicSource: 'https://www.nps.gov/cana/planyourvisit/directions.htm',
    sourceChecked: CALENDAR,
    accessSource: SOURCE_NPS,
    category: 'access-checkpoint',
    visitorFeatures: ['NPS entrance station', 'Restricted inbound traffic beginning around T−30', 'Beach lot access varies'],
    profiles: [], parking: 'Not a parking destination. NPS recommends entering several hours early. NASA and NPS may restrict park access.',
    geographyCaveat: 'NPS published entrance-station GPS. This is NOT a beach viewing point or a verified lot #1–13 coordinate.',
    navigation: { type: 'coordinates', value: '28.6450,-80.6834', caveat: 'NPS entrance station only; do not treat as a viewing location or parking lot.' }
  }
];

function validFlorida(lat, lon) {
  return typeof lat === 'number' && typeof lon === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lon) && lat > 27.5 &&
    lat < 29.5 && lon > -81.5 && lon < -79.8;
}
const radians = n => n * Math.PI / 180;
function groundGeometry(a, b) {
  if (!validFlorida(a?.lat, a?.lon) || !validFlorida(b?.lat, b?.lon)) return null;
  const lat1 = radians(a.lat), lat2 = radians(b.lat);
  const diffLat = lat2 - lat1, diffLon = radians(b.lon - a.lon);
  const h = Math.sin(diffLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(diffLon / 2) ** 2;
  const miles = 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  const y = Math.sin(diffLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(diffLon);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const directions = ['N','NE','E','SE','S','SW','W','NW'];
  return {
    miles: Math.round(miles * 10) / 10,
    bearingDegrees: Math.round(bearing),
    bearingCardinal: directions[Math.round(bearing / 45) % 8],
    method: 'approximate-ground-arc',
    not: 'Driving time, line of sight, launch azimuth or trajectory'
  };
}
function safePad(launch) {
  if (!launch || !validFlorida(launch.lat, launch.lon) ||
      typeof launch.pad !== 'string' || !launch.pad.trim()) return null;
  return {
    name: launch.pad.slice(0, 140), lat: launch.lat, lon: launch.lon,
    padId: Number.isInteger(launch.padId) ? launch.padId : null,
    source: 'https://ll.thespacedevs.com/',
    coordinateRole: 'restricted-launch-facility',
    status: 'not-public-navigation',
    note: 'Launch Library 2 pad coordinate. Restricted launch facility; not a destination or launch trajectory.'
  };
}
function pointAccess(point, viewpoints, launch, npsVerified) {
  if (point.category === 'access-checkpoint') {
    const beach = (viewpoints || []).filter(x => /^nps-/.test(x.class || ''));
    const blocked = beach.filter(x => x.level === 'closed');
    if (!npsVerified) return {
      level: 'unknown', label: 'NPS alert feed unavailable',
      reason: 'NPS entrance GPS only. Without current alerts, park access cannot be inferred.'
    };
    if (beach.length && blocked.length === beach.length) return {
      level: 'closed', label: 'NPS closure across listed beach groups',
      reason: 'NPS alerts indicate all of our listed Playalinda lot groups are closed. Confirm the park notice; this entrance is never a viewing destination.'
    };
    if (blocked.length) return {
      level: 'verify', label: 'Some Playalinda lot groups closed',
      reason: 'NPS alerts restrict certain listed Playalinda lots. The entrance GPS does not prove which lots remain accessible.'
    };
    return {
      level: 'verify', label: 'Entrance, not a viewing lot',
      reason: 'NPS entrance GPS only. No parsed lot closure was detected, but NASA may impose mission-specific restrictions without notice.'
    };
  }
  const v = viewpoints.find(x => x.id === point.id);
  if (v) return { level: v.level, label: v.label, reason: v.reason };
  return { level: 'unknown', label: 'Access not evaluated', reason: 'A site position alone cannot verify access.' };
}
// NPS public parking footprints provide actual geospatial lots, not current
// right of access. NPS GIS records explicitly say OPENTOPUBLIC: Unknown.
function playalindaLotAccess(lot, viewpoints, accessSource) {
  const npsVerified = accessSource?.verified === true;
  if (!npsVerified) return {
    level: 'unknown', label: 'NPS alerts unavailable',
    reason: 'Official parking footprint is known, but current NPS closure and launch security information could not be checked.'
  };
  const alerts = accessSource?.alerts || [];
  if (npsParkWideClosure(alerts) || npsLotClosure(alerts,lot.number,lot.number)) return {
    level: 'closed', label: 'Closed in active NPS alert',
    reason: 'A currently checked National Park Service closure notice identifies this parking area or the Playalinda district. Check the original alert and any NASA restrictions.'
  };
  const group=(viewpoints || []).find(v => Array.isArray(v.lotRange) &&
    lot.number>=v.lotRange[0] && lot.number<=v.lotRange[1]);
  if (!group) return {
    level: 'unknown',label: 'Launch access not verified',
    reason: 'Current pad-specific conditions and park hours were not established.'
  };
  if (group.level === 'closed') return {
    level: 'unknown', label: 'Nearby lots have reported closures',
    reason: 'The NPS alert affects a lot in this broader group. No specific closure is established for this numbered lot, but park entry remains unverified.'
  };
  return { level: group.level, label: group.label,
    reason: group.reason };
}
function playalindaPoint(lot, viewpoints, source, pad, checkedAt) {
  const access=playalindaLotAccess(lot,viewpoints,source);
  const accessible=RAMP_LOTS.has(lot.number);
  const flatter=lot.number>=8;
  return {
    id:lot.id,number:lot.number,
    name:'Playalinda Beach · Lot '+lot.number,
    lat:lot.lat,lon:lot.lon,level:access.level,label:access.label,
    reason:access.reason,
    category:'beach-parking',
    coordinateRole:'nps-verified-parking-footprint',
    coordinateEvidence:'official-nps-public-gis-polygon',
    mapAccuracy:'NPS mapped parking footprint (pin is polygon centroid, not beach ramp or parking space)',
    geographicSource:PLAYALINDA_GIS.parkingLayer,
    accessSource:'https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm',
    accessCheckedAt:source?.checkedAt||null,
    sourceChecked:PLAYALINDA_GIS.checkedAt,
    sourceEditedAt:lot.sourceEditedAt,
    facilityId:lot.facilityId,
    roadMilepost:lot.roadMilepost,
    parking:'Parking area is documented geographically; current public opening is unknown in the NPS GIS. Park capacity and launch closures can restrict entry.',
    summary:'Official NPS lot polygon. NASA can close the area for launch security; no live parking inventory or beach-visibility guarantee.',
    geographyCaveat:'This is the centroid of an official parking-area polygon, not a verified spectator spot, legal pedestrian route or live parking vacancy.',
    visitorFeatures:[
      'NPS-mapped parking area',
      'Accessible parking spaces documented by NPS',
      ...(accessible?['NPS FAQ identifies accessible beach ramp']:[]),
      ...(flatter?['NPS notes generally flatter dunes from lot 8 northward']:[])
    ],
    accessibility:{
      accessibleParkingListed:true,
      beachRampInOfficialFaq:accessible,
      coastalDuneNote:lot.number<=5?'Tall dune access reported at first five lots':
        flatter?'NPS reports dune profile flattens toward northern lots':'Beach ramp grade must be confirmed',
      routeVerified:false,accessOpenVerified:false
    },
    profiles:accessible?['low-walk','family','photo']:['family','photo'],
    geometry:pad?groundGeometry({lat:lot.lat,lon:lot.lon},pad):null,
    polygons:lot.polygons,
    navigation:null
  };
}

function buildGeographicViewing(launch, viewpoints, accessSource, now = Date.now()) {
  const pad = safePad(launch);
  const verified = accessSource?.verified === true;
  const points = REFERENCE_POINTS.map(p => {
    const access = pointAccess(p, viewpoints || [], launch, verified);
    // No 'distance from viewing lawn' for ticketed or entrance records.
    const geometry = p.coordinateRole === 'site-reference' && pad
      ? groundGeometry(p, pad) : null;
    const v = (viewpoints || []).find(x => x.id === p.id);
    return {
      ...p, ...access, geometry,
      name: v?.name || (p.id === 'playalinda-gate' ?
        'Playalinda entrance station (not viewing)' : p.id),
      summary: v?.summary || p.geographyCaveat,
      mapAccuracy: p.coordinateRole === 'site-reference' ?
        'Approximate park site reference; not a precise viewing/parking location' :
        'Official entrance coordinate; not a spectator location'
    };
  });
  const playalinda=PLAYALINDA_GIS.lots.map(lot =>
    playalindaPoint(lot,viewpoints,accessSource,pad,now));
  points.push(...playalinda);
  const unlocated = (viewpoints || []).filter(v =>
    !String(v.class || '').startsWith('nps-') &&
    !REFERENCE_POINTS.some(p => p.id === v.id)).map(v => ({
      id: v.id, name: v.name, category: 'source-only',
      level: v.level, label: v.label, reason: v.reason,
      accessSource: v.source,
      coordinateStatus: 'not-verified-enough-to-pin'
    }));
  return {
    version: 1, generatedAt: new Date(now).toISOString(),
    pad, points, unlocated,
    playalindaInventory:{
      count:playalinda.length,verifiedGeometry:playalinda.length,
      gisStatus:'official-lot-geometry-but-live-access-unknown',
      lastSourceAuditAt:PLAYALINDA_GIS.checkedAt,
      lotIds:playalinda.map(p=>p.number),
      rampEvidenceUrl:PLAYALINDA_GIS.npsAccessibility,
      parkingGisUrl:PLAYALINDA_GIS.parkingLayer,
      lotCountNote:'NPS guidance inconsistently references 13 parking areas and 14 beach access areas; the public GIS has 13 individually numbered parking lots.'
    },
    roadCorridor:{
      ...PLAYALINDA_GIS.policyCorridor,
      status:'published-entry-policy-not-live-closure',
      entrySource:PLAYALINDA_GIS.npsPolicy
    },
    dataSource: 'Curated public-access inventory + selected LL2 pad coordinates',
    coordinateSystem: 'WGS84',
    npsAlertCheckedAt: accessSource?.checkedAt || null,
    npsAlertsVerified: verified,
    policy: {
      title: 'Playalinda inbound road restriction',
      entryPointId: 'playalinda-gate',
      source: SOURCE_NPS,
      kind: 'published-policy-not-geofenced-closure',
      detail: 'NPS normally restricts inbound Playalinda Beach Road about 30 minutes before a launch. NASA may close additional areas without notice. No dynamic closure polygon has been verified.'
    },
    // Machine-readable WGS84 GIS points for future audited layers. Coordinates
    // remain explicitly typed so a consumer cannot confuse an entrance,
    // public park reference, or launch pad with a confirmed spectator position.
    geojson: {
      type: 'FeatureCollection',
      features: [
        ...(pad ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [pad.lon, pad.lat] },
          properties: { id: 'selected-pad', name: pad.name, coordinateRole: pad.coordinateRole,
            access: 'restricted', source: pad.source } }] : []),
        ...points.map(p => ({
          type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: { id: p.id, name: p.name, coordinateRole: p.coordinateRole,
            category: p.category, accessLevel: p.level,
            locationSource: p.geographicSource, accessSource: p.accessSource }
        })),
        { type:'Feature', geometry:{
          type:'LineString',coordinates:PLAYALINDA_GIS.policyCorridor.coordinates
        },properties:{
          id:'playalinda-published-inbound-corridor',
          category:'road-policy-reference',source:PLAYALINDA_GIS.roadLayer,
          liveClosure:false,
          note:'NPS public road centerline representing the normally controlled inbound route, not a current closure or routing instruction.'
        } }
      ]
    },
    safety: [
      'Distances and compass bearings are approximate straight-line geometry from a park site reference to the scheduled pad. They are not a line-of-sight or launch trajectory model.',
      'Official NPS Playalinda entrance GPS is not a beach parking lot, accessible trail or public viewing coordinate.',
      'Restricted launch pads and KSC viewing areas behind NASA gates must never be destinations.',
      'Unknown/unchecked access never implies open parking or tickets.',
      'NPS lot polygons are verified geographic footprints, not launch-day access permission. The mapped road corridor is a published policy reference, not a live closure.',
      'No dynamic closure geometry is drawn without authoritative, current GIS boundaries.'
    ]
  };
}
module.exports = { REFERENCE_POINTS, validFlorida, groundGeometry, safePad,
  buildGeographicViewing,playalindaLotAccess,playalindaPoint,RAMP_LOTS,PLAYALINDA_GIS };
