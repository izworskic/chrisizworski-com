'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const ledger=require('../data/sleeping-giant/visitor-access-evidence.json');
const routes=require('../data/sleeping-giant/official-routes.json');
const {validateLedger,evaluateAccess,auditAccess,anchorById,ROUTE_ANCHORS}
  =require('../lib/sleeping-giant/visitor-access-engine.cjs');

test('Seven official named wayfinding anchors have real park-source claims but no manufactured coordinates',()=>{
 assert.equal(validateLedger(),true);
 assert.equal(ledger.anchors.length,7);
 for(const a of ledger.anchors) {
   assert.ok(a.namedAccessVerified);
   assert.equal(a.precisePointCertified,false);
   assert.equal(a.coordinates,null);
   assert.equal(a.parkingCoordinates,null);
   assert.equal(a.currentOpeningVerified,false);
   assert.equal(a.turnByTurnEligible,false);
   assert.ok(a.evidence.length);
   assert.ok(a.evidence.every(x=>ledger.sources[x.source].startsWith('https://')));
 }
});

test('South Kabeyun signed parking and highway are official; no invented car-navigation pin or live capacity',()=>{
 const lot=anchorById('south-kabeyun');
 assert.equal(lot.existingParkingVerified,true);
 assert.equal(lot.roadApproachTextVerified,true);
 assert.equal(lot.roadKmAsPublished,36.5);
 assert.match(lot.approach,/Highway 587/);
 assert.match(lot.approach,/brown-and-yellow sign/);
 assert.ok(lot.evidence.some(x=>x.source==='parkCamping'));
 assert.equal(lot.parkingCoordinates,null);
 const sourceRecord=routes.accessPoints.find(x=>x.id==='south-kabeyun');
 assert.equal(sourceRecord.namedParkingFacilityVerified,true);
 assert.equal(sourceRecord.signedParkingApproachVerified,true);
 assert.equal(sourceRecord.parkingCoordinates,null);
 assert.equal(sourceRecord.currentAccess,'unverified');
 const r=evaluateAccess({routeId:'sea-lion'});
 assert.equal(r.lot.existsByOfficialSource,true);
 assert.equal(r.lot.gpsParkingPin,null);
 assert.equal(r.lot.parkingCapacityNow,'unverified');
 assert.equal(r.googleMapsParkingDirectionsEligible,false);
});

test('Biking permission and rack at Kabeyun/Talus are independently documented by park',()=>{
 const top=anchorById('kabeyun-talus');
 assert.equal(top.legalBikeBoundaryVerified,true);
 assert.equal(top.bikeRackVerified,true);
 assert.ok(top.evidence.some(x=>x.source==='parkActivities'));
 assert.ok(top.evidence.some(x=>x.source==='parkBikeGuide'));
 const report=evaluateAccess({routeId:'top-of-the-giant',mode:'bike_and_hike'});
 assert.equal(report.modePermittedBySource,true);
 assert.equal(report.journeyDistanceRoundTripKm,21.8);
 assert.equal(report.bikePlan.officialBikeKmReturn,13.4);
 assert.equal(report.bikePlan.officialWalkKmReturn,8.4);
 assert.equal(report.bikePlan.leaveBikeAt,top.name);
 assert.equal(report.bikePlan.rackDocumented,true);
 assert.equal(report.bikePlan.actualBikeStopCoordinates,null);
 assert.equal(report.visitorNavigationEligible,false);
});

test('Head and Nanabosho each use documented walking transitions with NO official rack',()=>{
 for(const [id,bike,walk,anchorId] of [
   ['head-of-the-giant',12.2,4,'head-foot-transition'],
   ['nanabosho-lookout',11.8,5.2,'nanabosho-foot-transition']
 ]) {
   const report=evaluateAccess({routeId:id,mode:'bike_and_hike'});
   const anchor=anchorById(anchorId);
   assert.equal(report.bikePlan.officialBikeKmReturn,bike);
   assert.equal(report.bikePlan.officialWalkKmReturn,walk);
   assert.equal(report.bikePlan.rackDocumented,false);
   assert.equal(anchor.bikeRackVerified,false);
   assert.equal(report.bikePlan.leaveBikeAt,anchor.name);
   assert.equal(report.bikePlan.actualBikeStopCoordinates,null);
   assert.equal(report.visitorNavigationEligible,false);
 }
});

test('Walks remain described; undocumented bike-and-hike routes fail closed',()=>{
 const ids=routes.routes.map(r=>r.id);
 for(const id of ids) {
   const walk=evaluateAccess({routeId:id,mode:'walk'});
   assert.equal(walk.modePermittedBySource,true);
   assert.equal(walk.bikePlan,null);
   assert.equal(walk.gpsTrailRouteEligible,false);
   assert.equal(walk.elevationProfileRouteEligible,false);
   assert.equal(walk.liveAccess,'unverified');
   assert.ok(walk.sourceLinks.some(s=>s.name==='parkAlerts'));
 }
 for(const id of ['sea-lion','middlebrun-beach','pass-lake-overlook']) {
   const report=evaluateAccess({routeId:id,mode:'bike_and_hike'});
   assert.equal(report.modePermittedBySource,false);
   assert.match(report.modeRejection,/not document/i);
   assert.equal(report.bikePlan,null);
 }
});

test('An official named relationship never turns a GIS proximity result into navigation',()=>{
 const summary=auditAccess();
 assert.equal(summary.namedAnchorsVerified,7);
 assert.equal(summary.existingParkingFacilitiesVerified,1);
 assert.equal(summary.bikeRacksConfirmed,1);
 assert.equal(summary.coordinateCertified,0);
 assert.equal(summary.roadAccessOpenNowConfirmed,0);
 assert.equal(summary.parkingDirectionsEligible,0);
 assert.equal(summary.routeGeometryCertified,0);
 assert.match(summary.outcome,/NO_GPS_ROUTING/);
 assert.ok(ROUTE_ANCHORS['top-of-the-giant'].includes('kabeyun-talus'));
 for(const a of ledger.anchors)assert.equal(a.turnByTurnEligible,false);
});

test('Forged parking and routing coordinates, live status or unauthorized racks are rejected',()=>{
 for(const mutate of [
   a=>a.policies.turnByTurnRouteEnabled=true,
   a=>a.policies.anyCoordinateCertified=true,
   a=>a.anchors[0].parkingCoordinates=[-88.9,48.3],
   a=>a.anchors[0].currentOpeningVerified=true,
   a=>a.anchors[1].existingParkingVerified=true,
   a=>a.anchors.find(x=>x.id==='head-foot-transition').bikeRackVerified=true,
   a=>a.anchors.find(x=>x.id==='kabeyun-talus').legalBikeBoundaryVerified=false
 ]) {
   const modified=structuredClone(ledger);
   mutate(modified);
   assert.throws(()=>validateLedger(modified));
 }
});

test('Mode boundaries cannot be silently altered by stale GIS or wrong distance components',()=>{
 const bad=structuredClone(ledger);
 bad.anchors.find(a=>a.id==='kabeyun-talus').bikeRoundTripKmFromSouthKabeyun=21.8;
 assert.throws(()=>validateLedger(bad),/distance conflict/);
 const badSource=structuredClone(ledger);
 badSource.anchors.find(a=>a.id==='kabeyun-talus').evidence[0].source='someUnofficialBlog';
 assert.throws(()=>validateLedger(badSource),/official evidence/);
 assert.throws(()=>evaluateAccess({routeId:'top-of-the-giant',mode:'driving'}),/Invalid travel mode/);
 assert.throws(()=>evaluateAccess({routeId:'invented-lookout',mode:'walk'}),/Unknown/);
});

test('Every visitor brief includes source-date caveat and official alerts, never open-now',()=>{
 for(const route of routes.routes) {
   for(const mode of ['walk','bike_and_hike']) {
     const r=evaluateAccess({routeId:route.id,mode});
     assert.match(r.sourceStatement,/not a live inspection/);
     assert.equal(r.googleMapsParkingDirectionsEligible,false);
     assert.equal(r.visitorNavigationEligible,false);
     assert.equal(r.liveAccess,'unverified');
     assert.ok(r.verificationRequired.some(x=>x.includes('current road')));
   }
 }
});
