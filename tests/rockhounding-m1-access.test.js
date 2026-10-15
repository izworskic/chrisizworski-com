'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pilotAudit,inspectResearchFootprints}=require('../lib/rockhounding/pilot-audit.cjs');
const reviews=require('../data/rockhounding/pilot-access-reviews.json');
const shapes=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../data/rockhounding/grand-marais-research-footprints.geojson'),'utf8'));
test('nine priority sites have traceable operator public-facility evidence',()=>{
 const result=pilotAudit();assert.equal(result.length,9);
 assert.equal(new Set(result.map(x=>x.id)).size,9);
 assert.equal(result.filter(x=>x.publicFacilityVerified).length,9);
});
test('site-level source does not imply a surveyed parking gate or walking route',()=>{
 assert.equal(pilotAudit().filter(x=>x.exactGateVerified).length,0);
 assert.equal(pilotAudit().filter(x=>x.walkRouteVerified).length,0);
});
test('statewide EGLE weight limit cannot be promoted to local permission',()=>{
 const status=pilotAudit();assert.equal(status.filter(x=>x.collectingVerified).length,0);
 assert.ok(status.every(x=>!x.collectionReady));
 assert.ok(reviews.policy.disclaimer.includes('not proof'));
});
test('only independent, correctly labeled coordinates may be distinguished from parking gates',()=>{
 const ag=reviews.pilotReviews.find(x=>x.id==='grand-marais-agate');
 const har=reviews.pilotReviews.find(x=>x.id==='grand-marais-harbor');
 const lake=reviews.pilotReviews.find(x=>x.id==='lakeport-day-use');
 assert.equal(ag.entryCoordinate,null);
 assert.equal(ag.thirdPartyCandidateCoordinate.status,'THIRD_PARTY_NOT_ROUTABLE');
 assert.equal(har.entryCoordinate.coordinateType,'PARK_ACCESS_AREA_GPS_NOT_EXACT_GATE');
 assert.equal(lake.entryCoordinate.coordinateType,'DAY_USE_AREA_CENTER_NOT_PARKING_GATE');
});
test('fishermans vehicle and lakeport seasonal caveats survive review',()=>{
 const fish=reviews.pilotReviews.find(x=>x.id==='fishermans-island');
 const lake=reviews.pilotReviews.find(x=>x.id==='lakeport-day-use');
 assert.match(fish.parking,/No legal alternate parking/);
 assert.match(lake.parking,/Memorial Day–Labor Day/);
 assert.ok(pilotAudit().find(x=>x.id==='fishermans-island').reasons.includes('ACCESS_RESTRICTION_REQUIRES_FRESH_CHECK'));
});
test('research geometry is two sourced closed polygons and is not a wetline',()=>{
 const f=inspectResearchFootprints();assert.equal(f.length,2);
 assert.ok(f.every(x=>x.pointCount>=4 && !x.collectionReady));
 assert.equal(shapes.metadata.license,'ODbL');
 assert.ok(shapes.features.every(x=>x.properties.shorelineWaterwardNormalDeg===null));
 assert.ok(shapes.features.every(x=>x.properties.osmWayId>0));
});
test('Grand Marais geometry separates documented open and sheltered beach research',()=>{
 const ag=shapes.features.find(x=>x.properties.siteId==='grand-marais-agate');
 const har=shapes.features.find(x=>x.properties.siteId==='grand-marais-harbor');
 assert.equal(ag.properties.exposureClass,'OPEN_SUPERIOR_CANDIDATE');
 assert.equal(har.properties.exposureClass,'SHELTERED_HARBOR_CANDIDATE');
 const coordsA=ag.geometry.coordinates[0],coordsH=har.geometry.coordinates[0];
 assert.ok(coordsA.some(p=>p[1]>46.675));
 assert.ok(coordsH.some(p=>p[1]<46.672));
});


test('OSM footpaths are candidate geometry and cannot be published as legal parking-to-shore directions',()=>{
 const routes=JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname,'../data/rockhounding/grand-marais-route-candidates.geojson'),'utf8'));
 assert.equal(routes.features.length,3);
 assert.ok(routes.features.every(f=>f.properties.routeStatus==='OSM_CANDIDATE_CURRENT_ACCESS_UNVERIFIED'&&!f.properties.legalPublicUseVerified));
 assert.ok(routes.features.every(f=>f.geometry.type==='LineString'&&f.geometry.coordinates.length>=2));
 assert.ok(routes.features.some(f=>f.properties.osmWayId===369178056&&f.properties.siteId==='grand-marais-agate'));
 assert.ok(routes.features.some(f=>f.properties.tags.highway==='steps'));
});
