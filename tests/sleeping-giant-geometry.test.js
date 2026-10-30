'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {EXPECTED_IDS,PARKING_RESEARCH,validateHighDetailCollection,nearestPointOnPolyline,
  polylineMeters,meters,sliceBetween,buildResearchOverlay,auditParkingCandidate,audit,references,
  CONTINUITY_TOLERANCE_METRES}=require('../lib/sleeping-giant/geometry-reconciliation.cjs');
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data/sleeping-giant',name),'utf8'));
const full=read('otn-unsimplified-core-research.geojson');
const simplified=read('otn-trail-geometry-research.geojson');
const official=read('official-routes.json');

test('All 7 unsimplified trails preserve government OGF and OBJECTID and more vertices than prior geometry',()=>{
 assert.equal(validateHighDetailCollection(),true);
 assert.equal(full.features.length,7);
 assert.equal(Object.keys(EXPECTED_IDS).length,7);
 for(const f of full.features){
  const prior=simplified.features.find(x=>x.properties.OBJECTID===f.properties.OBJECTID);
  assert.ok(prior,'unchanged source ID');
  assert.equal(prior.properties.OGF_ID,f.properties.OGF_ID);
  assert.ok(f.geometry.coordinates.length>prior.geometry.coordinates.length);
 }
 assert.ok(full.features.find(f=>f.properties.TRAIL_NAME==='Kabeyun Trail').geometry.coordinates.length>2500);
 assert.ok(full.features.find(f=>f.properties.TRAIL_NAME==='Sawyer Bay Trail').geometry.coordinates.length>2000);
 assert.equal(full.metadata.routeEligible,false);
 assert.equal(full.metadata.parkSignedJunctionCoordinatesVerified,false);
 assert.equal(full.metadata.currentTrailConditionsKnown,false);
});

test('Core mapped intersections are physically coincident but NEVER source-certified signed crossings',()=>{
 const result=audit();
 assert.equal(result.measuredMappedJunctionCandidates,8);
 assert.ok(result.allMappedJunctionsWithinResearchTolerance);
 for(const j of result.routes)assert.equal(j.turnByTurnEligible,false);
 assert.equal(result.signedJunctionsCertified,0);
 assert.equal(result.verifiedRoadToTrailLinks,0);
 assert.equal(result.navigatorEligible,false);
 assert.equal(result.conclusion,'RESEARCH_GEOMETRY_RECONCILED_NO_VISITOR_DIRECTIONS');
});

test('Calculated geometry exposes missing parking connector instead of silently shifting official trip lengths',()=>{
 const result=audit();
 for(const route of result.routes){
  const source=official.routes.find(x=>x.id===route.routeId);
  assert.equal(route.officialReturnKm,source.roundTripKm);
  assert.ok(route.unmappedOrSourceDifferenceReturnKm>=0.2 && route.unmappedOrSourceDifferenceReturnKm<2,
   route.routeId+' source difference must remain visible');
  assert.equal(route.parkingConnectorMapped,false);
  assert.equal(route.activeTrailOpen,false);
  assert.equal(route.legalBikeCutoffCoordinatesCertified,false);
  assert.ok(route.sections.length>=2);
  assert.ok(route.sections.every(x=>x.sourceObjectId && x.calculatedOneWaySectionKm>0));
 }
});

test('Bike/walk overlays match Ontario Parks permission boundaries but remain research geometry',()=>{
 for(const [id,bike,foot] of [
  ['top-of-the-giant',13.4,8.4],['head-of-the-giant',12.2,4.0],['nanabosho-lookout',11.8,5.2]
 ]){
  const r=buildResearchOverlay(id,{withCoordinates:true});
  const route=official.routes.find(x=>x.id===id);
  assert.equal(route.bikeApproachRoundTripKm,bike);
  assert.equal(route.bikeHikeRemainingRoundTripKm,foot);
  assert.equal(r.sections[0].modeOnMappedTrail,'bike');
  assert.ok(r.sections.slice(1).every(s=>s.modeOnMappedTrail==='walk'));
  assert.ok(r.sections.every(s=>s.researchGeometry?.type==='LineString'));
  assert.ok(r.mappedCyclingReturnKm>0 && r.mappedWalkingReturnKm>0);
  assert.equal(r.visitorRouteReady,false);
  assert.equal(r.turnByTurnEligible,false);
 }
 const sea=buildResearchOverlay('sea-lion');
 assert.equal(sea.mappedCyclingReturnKm,0);
 assert.ok(sea.sections.every(s=>s.modeOnMappedTrail==='walk'));
});

test('Independent parking representations converge spatially but the actual signed driveway remains unproven',()=>{
 const a=auditParkingCandidate();
 assert.equal(a.nearbyGovernmentTrailAccessPoint.otnObjectId,6001);
 assert.equal(a.nearbyGovernmentTrailAccessPoint.otnOgfId,319510517);
 assert.ok(a.osmCenterToOtnAccessMetres>20 && a.osmCenterToOtnAccessMetres<80);
 assert.ok(a.osmCenterToMappedTrailStartStraightLineMetres>300);
 assert.ok(a.osmCenterToMappedTrailStartStraightLineMetres<600);
 assert.equal(a.mappedParkingResearchPoint.osmWayId,151289776);
 assert.equal(a.mappedParkingResearchPoint.eligibleForDirections,false);
 assert.equal(a.mappedParkingResearchPoint.isOfficialParkCoordinate,false);
 assert.equal(a.completePedestrianConnectorAvailable,false);
 assert.equal(a.preciseParkSignedParkingEntranceVerified,false);
 assert.equal(a.carNavigationEligible,false);
});

test('Source route geometry contains no invented car parking or season opening state',()=>{
 const report=audit();
 assert.equal(report.parking.noOnRoadParkingAssurance,true);
 assert.equal(report.seasonalTrailStatus,'unverified');
 assert.equal(report.navigatorEligible,false);
 for(const r of report.routes){
  assert.match(r.statement,/no verified public-parking connector/);
  assert.equal(r.parkingConnectorMapped,false);
 }
});

test('Coordinates and Ontario source IDs are strictly validated; corrupt or degenerate paths fail',()=>{
 const bad=structuredClone(full);
 bad.features[0].properties.OBJECTID=999999;
 assert.throws(()=>validateHighDetailCollection(bad),/source feature ID/);
 const badCoords=structuredClone(full);
 badCoords.features[0].geometry.coordinates[1]=[90,-33];
 assert.throws(()=>validateHighDetailCollection(badCoords));
 const badFlags=structuredClone(full);
 badFlags.metadata.routeEligible=true;
 assert.throws(()=>validateHighDetailCollection(badFlags),/Uncertified/);
 assert.throws(()=>nearestPointOnPolyline([0,0],[[0,0],[1,1]]),/Invalid/);
 assert.throws(()=>sliceBetween([[ -88.4,48.4],[-88.5,48.4]],[-88.7,48.3],[-88.5,48.4]),/Unjoined/);
 assert.throws(()=>polylineMeters([[-88.4,48.4]]),/Invalid/);
 assert.throws(()=>buildResearchOverlay('unlisted-route'),/No source-supported/);
});

test('Source-computed junction gap is meter-scale, not authority to publish a route',()=>{
 const p=references();
 const kabeyun=full.features.find(x=>x.properties.TRAIL_NAME==='Kabeyun Trail');
 const candidate=nearestPointOnPolyline(p['talus-kabeyun'],kabeyun.geometry.coordinates);
 assert.ok(candidate.meters<CONTINUITY_TOLERANCE_METRES);
 assert.ok(candidate.meters>=0);
 assert.equal(PARKING_RESEARCH.isOfficialParkCoordinate,false);
 assert.ok(meters(p.south,PARKING_RESEARCH.center)>300);
});
