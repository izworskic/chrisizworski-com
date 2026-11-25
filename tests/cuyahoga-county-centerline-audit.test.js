'use strict';
const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const coast=require('../data/cuyahoga/noaa-coast-pilot-bridge-references.json');
let auditCountyCenterlines,segmentOverlapMeters;
before(async()=>({auditCountyCenterlines,segmentOverlapMeters}=await import('../scripts/cuyahoga-county-centerline-audit.mjs')));
const line=(id,name,c)=>({type:'Feature',properties:{OBJECTID:id,fullname:name},geometry:{type:'LineString',coordinates:c}});
const area=(polygon)=>({type:'FeatureCollection',features:[{type:'Feature',properties:{sdsfeaturename:'CUYAHOGA RIVER'},geometry:{type:'Polygon',coordinates:[polygon]}}]});
const boundary=[[-81.70070,41.4880],[-81.70020,41.4880],[-81.70020,41.4888],[-81.70070,41.4888],[-81.70070,41.4880]];
const sourceRoads={type:'FeatureCollection',features:[
 line(378160,'Columbus Road',[[-81.70046192608424,41.488754089232856],[-81.70046092659275,41.48840708844921]]),
 line(379730,'Center Street',[[-81.70339192740286,41.49430608890061],[-81.70317092713304,41.49425708892183]]),
 line(377879,'Carter Road',[[-81.69762605370289,41.493920819340104],[-81.69747606941051,41.493772408906715]]),
 line(377133,'W 3rd Street',[[-81.68584892060812,41.48832408868996],[-81.68558492069766,41.48806708964988]]),
 line(375668,'Main Avenue',[[-81.70672073216156,41.495992877118624],[-81.70707405093194,41.49523038955006]])
]};
test('finite segment clipping detects actual overlap with polygon including exterior endpoint',()=>{
 const poly=[[[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20},{x:0,y:0}]]];
 assert.ok(Math.abs(segmentOverlapMeters({x:-10,y:10},{x:30,y:10},poly)-20)<.00001);
 assert.equal(segmentOverlapMeters({x:-10,y:40},{x:30,y:40},poly),0);
});
test('real county centerline coordinates remain evidence-only and unsupported bridges stay unknown',()=>{
 const x=auditCountyCenterlines(coast,sourceRoads,area(boundary));
 const col=x.checks.find(q=>q.bridgeId==='columbus-193');
 assert.equal(col.status,'COUNTY_ROAD_CENTERLINE_OVERLAPS_CHANNEL_NEAR_CHART_REFERENCE');
 assert.equal(col.matchedSegments[0].countyObjectId,378160);
 assert.ok(col.matchedSegments[0].channelOverlapMeters>=10);
 assert.equal(x.checks.find(q=>q.bridgeId==='eagle-280').status,'NO_NAMED_COUNTY_ROAD_GEOMETRY');
 assert.equal(x.checks.find(q=>q.bridgeId==='center-st-139').status,'NEARBY_COUNTY_ROAD_WITHOUT_CONFIRMED_CHANNEL_OVERLAP');
 assert.equal(x.checks.find(q=>q.bridgeId==='main-avenue-101').status,'COUNTY_ROAD_GEOMETRY_TOO_FAR');
 assert.equal(x.surveyedBridgeAxisValidated,false);
 assert.equal(x.futureArrivalPredictionEnabled,false);
 assert.equal(x.visitorDirectionsVerified,false);
});
test('unsupported USACE area / duplicate area must fail closed',()=>{
 assert.throws(()=>auditCountyCenterlines(coast,sourceRoads,{type:'FeatureCollection',features:[]}),/Exactly one/);
 const poly=area(boundary);
 poly.features.push(structuredClone(poly.features[0]));
 assert.throws(()=>auditCountyCenterlines(coast,sourceRoads,poly),/Exactly one/);
});
test('renamed unrelated road cannot be treated as a matching bridge',()=>{
 const other=structuredClone(sourceRoads);
 for(const f of other.features)f.properties.fullname='UNKNOWN';
 const x=auditCountyCenterlines(coast,other,area(boundary));
 assert.ok(x.checks.every(x=>x.status==='NO_NAMED_COUNTY_ROAD_GEOMETRY'));
});
