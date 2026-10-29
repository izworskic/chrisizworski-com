'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {audit,sourceFeatures,permissionFor,candidateDistance,
  CORE_TRAIL_PAIRS,JUNCTION_TOLERANCE_METRES} = require('../lib/sleeping-giant/topology-audit.cjs');
const input = require('../data/sleeping-giant/official-routes.json');
const fs=require('node:fs');
const path=require('node:path');
const geo=name=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data/sleeping-giant/',name),'utf8'));
const lines=geo('otn-trail-geometry-research.geojson');
const access=geo('otn-access-points-research.geojson');

test('Ontario public-source GIS extract has 30 park trails, 13 unlabelled access points and unique source IDs',()=>{
 assert.equal(sourceFeatures(lines).length,30);
 assert.equal(access.features.length,13);
 assert.equal(new Set(lines.features.map(f=>f.properties.OBJECTID)).size,30);
 assert.equal(lines.metadata.routeEligible,false);
 assert.equal(access.metadata.parkingVerified,false);
 assert.equal(lines.metadata.layer,19);
 assert.equal(access.metadata.layer,20);
});

test('all nine named trail relationships have an OTN endpoint proximity CANDIDATE, not an eligible route edge',()=>{
 const result=audit();
 assert.equal(result.junctionCandidates.length,CORE_TRAIL_PAIRS.length);
 assert.equal(result.junctionCandidates.length,9);
 for(const link of result.junctionCandidates){
   assert.equal(link.candidateOnly,true,link.from+' to '+link.to+' not even a mapped candidate');
   assert.ok(link.nearMetres>=0 && link.nearMetres<=JUNCTION_TOLERANCE_METRES);
   assert.equal(link.manuallyCertified,false);
   assert.equal(link.routeEligible,false);
   assert.ok(link.sourceFeatureIds.every(Number.isInteger));
 }
 assert.equal(result.gate.junctionsCertified,0);
 assert.equal(result.gate.routeEligibleEdges,0);
 assert.equal(result.outcome,'RESEARCH_ONLY_DO_NOT_ROUTE');
});

test('none of 13 governmental OTN access POINTS may be advertised as named parking or road entry',()=>{
 const result=audit();
 assert.equal(result.accessPointAudit.length,13);
 assert.ok(result.accessPointAudit.every(p=>
   p.accessPointVerified===true && p.parkingVerified===false &&
   p.roadAccessVerified===false && p.routeEligible===false &&
   Number.isInteger(p.otnObjectId)));
 assert.equal(result.gate.parkingAnchorsCertified,0);
});

test('park authored cycling restriction supersedes GIS blanket Kabeyun cycling permission',()=>{
 const kab=lines.features.find(f=>f.properties.TRAIL_NAME==='Kabeyun Trail');
 assert.match(kab.properties.PERMITTED_USES,/Cycling/);
 assert.equal(permissionFor('Kabeyun Trail').bike,'partial_only');
 assert.equal(permissionFor('Talus Lake Trail').bike,'no');
 assert.equal(permissionFor('Top of the Giant Trail').bike,'no');
 assert.equal(permissionFor('Head Trail').bike,'no');
 assert.equal(permissionFor('Nanabosho Lookout Trail').bike,'no');
 const report=audit();
 assert.ok(report.permissionConflicts.some(f=>f.name==='Kabeyun Trail'&&f.conflict===true));
 assert.ok(report.permissionConflicts.every(f=>f.routingEligible===false));
});

test('Ontario Parks says Sawbill cycling permitted even though OTN cycling flag absent',()=>{
 const f=lines.features.find(f=>f.properties.TRAIL_NAME==='Sawbill Lake Trail');
 assert.doesNotMatch(f.properties.PERMITTED_USES,/Cycling/);
 assert.equal(permissionFor('Sawbill Lake Trail').bike,'yes');
 assert.ok(audit().permissionConflicts.some(x=>x.name==='Sawbill Lake Trail'));
});

test('official and OTN trail lengths remain separate where the versions disagree',()=>{
 const disputes=audit().knownMileageDisagreements;
 const kab=disputes.find(x=>x.name==='Kabeyun Trail');
 assert.equal(kab.parkKm,37);
 assert.equal(kab.otnKm,40);
 assert.equal(kab.needsReconciliation,true);
 const nan=disputes.find(x=>x.name==='Nanabosho Lookout Trail');
 assert.equal(nan.parkKm,0.8);
 assert.ok(Math.abs(nan.otnKm-0.7)<0.01);
 assert.equal(nan.needsReconciliation,true);
 // Neither GIS class length is the parking-to-summit round trip.
 assert.equal(input.routes.find(x=>x.id==='nanabosho-lookout').roundTripKm,17);
});

test('source corruptions fail the audit instead of inventing routes',()=>{
 const bad=structuredClone(lines);
 bad.features[0].properties.OBJECTID=bad.features[1].properties.OBJECTID;
 assert.throws(()=>sourceFeatures(bad),/duplicate/);
 const broken=structuredClone(lines);
 broken.features[0].geometry.coordinates[0]=[NaN,48];
 assert.throws(()=>sourceFeatures(broken),/Invalid lon\/lat/);
});

test('geographic nearness alone does not promote a disconnected/fictional path',()=>{
 const result=audit();
 assert.ok(result.junctionCandidates.every(x=>x.routeEligible===false));
 assert.ok(result.sourceUrls.parkManagementPlan.includes('ontario.ca'));
 assert.ok(result.geometryNature.includes('not calibrated'));
 const a=lines.features.find(x=>x.properties.TRAIL_NAME==='Kabeyun Trail');
 const b=lines.features.find(x=>x.properties.TRAIL_NAME==='Sawyer Bay Trail');
 assert.ok(candidateDistance(a,b)<=JUNCTION_TOLERANCE_METRES);
});
