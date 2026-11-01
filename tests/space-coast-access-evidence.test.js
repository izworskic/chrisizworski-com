'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
  EDDY,endpointAudit,currentSource,alertHasActiveLot,roadwayNorthOfEddy,
  shorelineNorthOfEddy,buildCurrentNpsAccess,validAlertUrl
}=require('../lib/space-coast-access-evidence');
const {PLAYALINDA_GIS,BOARDWALK_GIS,buildGeographicViewing}=require('../lib/space-coast-geo');
const {VIEWPOINTS,viewAccess}=require('../lib/space-coast-decision');
const NOW=Date.parse('2026-11-01T20:35:00Z');
const AUTH='https://www.nps.gov/cana/park-alerts-cana.json';
const OFFICIAL={
  id:'99D85491-1733-4A65-85D7-987ADE3EF82F',
  title:'Playalinda District: Parking Lot #8-13',
  category:'Park Closure',
  start:'October, 25 2026 00:00:00',end:null,
  url:AUTH,
  description:'Attention Visitors: Due to strong winds and sand and water on the road, the following areas of the Playalinda District of Canaveral National Seashore are temporarily closed to all visitor use, including driving, walking, and biking:\nThe main Playalinda road north of Eddy Creek.\nParking Lots #8-13\nThe beach north of Eddy Creek boardwalk.\nNo backcountry hiking permits will be issued during this closure.'
};
const source=(alerts=[OFFICIAL],checkedAt=new Date(NOW).toISOString(),verified=true)=>({
  checkedAt,verified,alerts
});
const lotRecords=PLAYALINDA_GIS.lots;
const boardRecords=BOARDWALK_GIS.boardwalks;
function access(alerts=[OFFICIAL],checkedAt=new Date(NOW).toISOString(),verified=true) {
  return buildCurrentNpsAccess(lotRecords,boardRecords,source(alerts,checkedAt,verified),NOW);
}
function matchGeometry() {
  const b=BOARDWALK_GIS.boardwalks;
  return b.filter(x=>x.number<=13).map(x=>({
    number:x.number,
    ...endpointAudit(x,lotRecords.find(l=>l.number===x.number))
  }));
}

test('NPS current alert maps exactly the six named Playalinda lots, not inferred ocean exclusion polygons',()=>{
  const result=access();
  assert.equal(result.sourceStatus,'fresh');
  assert.equal(result.lotClosures.length,6);
  assert.deepEqual(result.summary.closedParkingLots,[8,9,10,11,12,13]);
  assert.equal(result.roadClosure.status,'official-alert-road-north-of-eddy');
  assert.equal(result.beachRestriction.status,'official-alert-beach-north-of-eddy');
  assert.equal(result.evidenceNotices.length,1);
  assert.equal(result.evidenceNotices[0].id,OFFICIAL.id);
  assert.equal(result.evidenceNotices[0].title,OFFICIAL.title);
  assert.equal(result.evidenceNotices[0].firstPosted,OFFICIAL.start);
  assert.equal(result.preciseNASAExclusionGeometryVerified,false);
  assert.equal(result.npsPublishedMissionLandExclusionPolygonVerified,false);
  assert.equal(result.features.type,'FeatureCollection');
  const geoms=result.features.features;
  assert.equal(geoms.length,8);
  assert.equal(geoms.filter(f=>f.geometry.type==='Polygon').length,6);
  assert.equal(geoms.filter(f=>f.geometry.type==='LineString').length,1);
  assert.equal(geoms.filter(f=>f.geometry.type==='MultiLineString').length,1);
  assert.ok(geoms.every(f=>!f.properties.exactClosureLimitsVerified));
  assert.ok(geoms.every(f=>f.properties.category!=='rocket-flight-trajectory'));
  assert.ok(geoms.every(f=>!f.properties.officialNASAExclusionPolygon));
  assert.ok(geoms.filter(f=>f.geometry.type==='Polygon').every(f=>
    f.properties.not.includes('barricade')));
  assert.equal(result.roadClosure.boundaryLocationVerified,false);
  assert.equal(result.beachRestriction.exactAreaGeometryVerified,false);
});

test('Eddy Creek current closure road marker derives from historically mapped NPS road and named boardwalk',()=>{
  assert.equal(EDDY.road.facilityId,'60814');
  assert.equal(EDDY.eddyCreekBoardwalk.facilityId,'60932');
  assert.equal(EDDY.coordinateSystem,'WGS84');
  assert.match(EDDY.roadSource,/mapservices\.nps\.gov/);
  assert.match(EDDY.boundarySource,/mapservices\.nps\.gov/);
  assert.ok(EDDY.spatialAudit.closestNpsRoadMeters<60);
  assert.ok(EDDY.road.northOfEddyReference.coordinates.length>=14);
  assert.ok(EDDY.road.northOfEddyReference.coordinates.at(-1)[1]>EDDY.road.northOfEddyReference.coordinates[0][1]);
  assert.match(EDDY.geographicMeaning,/not-current-barricade/);
  assert.match(EDDY.spatialAudit.accuracyNotice,/NOT verified/);
});

test('all thirteen NPS boardwalks have GIS-near matching lot edges, not certified walkable connections',()=>{
  const audits=matchGeometry();
  assert.equal(audits.length,13);
  assert.ok(audits.every(x=>x.namedFacilityAssociationVerified===true));
  assert.ok(audits.every(x=>x.nearestLotFootprintBoundaryMeters>=0));
  assert.ok(audits.every(x=>x.nearestLotFootprintBoundaryMeters<10));
  assert.ok(audits.every(x=>x.legalPedestrianConnectionVerified===false));
  assert.ok(audits.every(x=>x.wheelchairContinuityVerified===false));
  assert.ok(audits.every(x=>x.currentWalkabilityVerified===false));
  assert.equal(audits.find(x=>x.number===5).endpointFallsWithinMappedLot,true);
  assert.equal(audits.find(x=>x.number===5).nearestLotFootprintBoundaryMeters,0);
  assert.equal(audits.find(x=>x.number===12).endpointFallsWithinMappedLot,false);
  assert.ok(audits.find(x=>x.number===12).nearestLotFootprintBoundaryMeters>5);
  assert.equal(endpointAudit(boardRecords.find(b=>b.number===14),undefined),null);
  assert.equal(endpointAudit({geometry:{coordinates:[[[0,0],[0,1]]]}},lotRecords[0]),null);
});

test('GIS endpoints and source confidence attach to mission response but cannot produce directions',()=>{
  const launch={
    id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    pad:'LC-39A',lat:28.608,lon:-80.604,
    net:'2026-11-03T18:15:00Z',netPrecision:'minute'
  };
  const src=source();
  const v=VIEWPOINTS.map(x=>viewAccess(x,launch,src.alerts,true,{now:NOW}));
  const g=buildGeographicViewing(launch,v,src,NOW);
  assert.equal(g.boardwalks.length,14);
  assert.equal(g.liveAccess.lotClosures.length,6);
  assert.deepEqual(g.liveAccess.summary.closedParkingLots,[8,9,10,11,12,13]);
  for (let n=1;n<=13;n++) {
    const p=g.points.find(x=>x.id==='playalinda-lot-'+n);
    const b=g.boardwalks.find(x=>x.number===n);
    assert.ok(p.boardwalk.spatialConnectionAudit);
    assert.equal(p.boardwalk.spatialConnectionAudit.legalPedestrianConnectionVerified,false);
    assert.equal(p.boardwalk.spatialConnectionAudit.currentWalkabilityVerified,false);
    assert.equal(p.navigation,null);
    assert.equal(b.spatialConnectionAudit.namedFacilityAssociationVerified,true);
    assert.equal(Boolean(p.activeNpsClosure),n>=8);
    assert.equal(p.level==='closed',n>=8);
  }
  assert.equal(g.boardwalks.find(x=>x.number===14).spatialConnectionAudit,null);
  assert.equal(g.geojson.features.filter(f=>f.geometry.type==='Polygon').length,13,
    'Static NPS lot inventory preserved separately from live alert overlay');
  assert.ok(g.safety.some(x=>/official historical named geographic references/i.test(x)));
});

test('stale and failed NPS sources never display allegedly current closures or imply open parking',()=>{
  const stale=access([OFFICIAL],new Date(NOW-95*60000).toISOString());
  assert.equal(stale.sourceStatus,'stale');
  assert.equal(stale.lotClosures.length,0);
  assert.equal(stale.roadClosure,null);
  assert.equal(stale.beachRestriction,null);
  assert.equal(stale.features.features.length,0);
  const missing=access([OFFICIAL],new Date(NOW).toISOString(),false);
  assert.equal(missing.sourceStatus,'unavailable');
  assert.equal(missing.features.features.length,0);
  const noAlerts=access([]);
  assert.equal(noAlerts.sourceStatus,'fresh');
  assert.equal(noAlerts.summary.closedParkingLots.length,0);
  assert.equal(noAlerts.roadClosure,null);
  assert.equal(noAlerts.preciseNASAExclusionGeometryVerified,false);
  assert.equal(currentSource(source(),NOW),'fresh');
  assert.equal(currentSource(source([],new Date(NOW+600000).toISOString()),NOW),'stale');
});

test('NPS location word boundaries and non-closure notices do not fabricate closure geometry',()=>{
  assert.equal(roadwayNorthOfEddy(OFFICIAL),true);
  assert.equal(shorelineNorthOfEddy(OFFICIAL),true);
  assert.equal(alertHasActiveLot(OFFICIAL,8),true);
  assert.equal(alertHasActiveLot(OFFICIAL,7),false);
  const boundary={title:'Eddy Creek boardwalk',category:'Information',
    description:'There is a historical boardwalk near the road north of Eddy Creek.'};
  assert.equal(roadwayNorthOfEddy(boundary),false);
  assert.equal(shorelineNorthOfEddy(boundary),false);
  assert.equal(access([boundary]).features.features.length,0);
  assert.equal(validAlertUrl('https://attacker.test/nps'), 'https://www.nps.gov/cana/planyourvisit/conditions.htm');
  assert.equal(validAlertUrl('javascript:alert(1)'), 'https://www.nps.gov/cana/planyourvisit/conditions.htm');
});

test('visitor map shows labeled, source-dated active NPS closure references without drawing speculative space hazards',()=>{
  const root=path.join(__dirname,'../public/synced-national-tools/space-coast-launch');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'geo-map.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'viewing.css'),'utf8');
  assert.match(html,/id="geo-live-access"/);
  assert.match(html,/id="geo-current-closure-toggle"/);
  assert.match(html,/geo-map\.js\?v=20261101-access1/);
  assert.match(js,/function renderLiveAccess\(/);
  assert.match(js,/function updateActiveClosureDisplay\(/);
  assert.match(js,/activeClosureLayer=L\.layerGroup/);
  assert.match(js,/exact roadblock location is NOT established/i);
  assert.match(js,/NOT a mapped walkway or safe walking distance/);
  assert.match(css,/\.geo-live-access/);
  assert.doesNotThrow(()=>new Function(js),
    'The full client GIS script must parse as executable JavaScript');
  assert.doesNotMatch(js,/L\.Routing\.control/);
  assert.doesNotMatch(js,/L\.geoJSON\(/);
});
