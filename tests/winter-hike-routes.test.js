'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Routes=require('../lib/winter-hike-routes.cjs');
const data=require('../data/winter-hike/michigan-curated-routes.json');
const DNR=require('../data/winter-hike/michigan-dnr-candidates.json');
const {routes,quarantined}=data;
test('curation v1 is a non-live catalog with independent explicit source and parking contracts',()=>{
 const a=Routes.auditCatalog();
 assert.equal(a.ok,true,JSON.stringify(a.errors));assert.equal(a.count,38);
 assert.equal(a.measured,25);assert.equal(a.unknown,13);assert.equal(a.groups,13);
 assert.equal(data.operationalDefaults.directionsEnabled,false);
});
test('official route identities are unique and evidence scoped to particular route, not entire state park',()=>{
 assert.equal(new Set(routes.map(r=>r.id)).size,routes.length);
 assert.ok(routes.every(r=>r.routeEvidenceUrl.startsWith('https://www.michigan.gov/')));
 assert.ok(routes.every(r=>r.currentWinterAccess==='unverified'&&r.navigationReady===false));
});
test('exact DNR point joins match original UUID and coordinates, but never create GPS directions',()=>{
 const map=new Map(DNR.records.map(r=>[r.ID,r]));
 for(const r of routes.filter(r=>r.sourceDnrTrailId)){
  const original=map.get(r.sourceDnrTrailId);
  assert.ok(original);assert.equal(r.sourceDnrTrailName,original.Title);
  assert.equal(r.referencePoint.lat,original.Latitude);
  assert.equal(r.referencePoint.lon,original.Longitude);
  assert.equal(r.verifiedDriveTarget,null);
 }
});
test('Negwegon route lengths are map-proven 3.6, 3.7 and 3.1 miles',()=>{
 const a=routes.filter(r=>r.placeGroup==='negwegon');
 assert.deepEqual(a.map(r=>r.lengthMiles),[3.6,3.7,3.1]);
 assert.ok(a.every(r=>r.caveats.join(' ').includes('two-track')));
});
test('Muskegon named map itinerary lengths do not reuse contradictory older management plan distances',()=>{
 const a=routes.filter(r=>r.placeGroup==='muskegon');
 assert.equal(a.length,8);
 const hike=a.find(r=>r.id==='muskegon-hearty-hiker');
 const ridge=a.find(r=>r.id==='muskegon-dune-ridge');
 assert.equal(hike.lengthMiles,3);assert.equal(ridge.lengthMiles,2.5);
 assert.ok(a.every(r=>r.routeEvidenceUrl.includes('muskegon_hiking.pdf')));
});
test('Vasa snowshoe stacked loops have their own length, without inventing an additive total',()=>{
 const a=routes.filter(r=>r.placeGroup==='vasa');
 assert.equal(a.length,4);
 assert.equal(a.find(r=>r.id==='vasa-snowshoe-orange').lengthMiles,1.5);
 assert.equal(a.find(r=>r.id==='vasa-snowshoe-green-yellow').lengthMiles,.6);
 assert.equal(a.find(r=>r.id==='vasa-snowshoe-red').lengthMiles,.25);
 assert.equal(a.find(r=>r.id==='vasa-snowshoe-complete').lengthEvidence,'approximate_official');
 assert.ok(a.every(r=>r.winterUse==='marked_dedicated_snowshoe'));
});
test('Tahquamenon Lower Falls blue and green loops are actual winter snowshoe routes',()=>{
 const a=routes.filter(r=>r.placeGroup==='lower');
 assert.deepEqual(a.map(r=>r.lengthMiles),[1.6,2.4]);
 assert.ok(a.every(r=>r.winterUse==='marked_dedicated_snowshoe'));
 assert.ok(a.every(r=>r.caveats.some(s=>/winter|plowing|maintained/i.test(s))));
});
test('Upper Falls only includes real snowshoe and packed walking paths; not ski-only Lantern Loop',()=>{
 const a=routes.filter(r=>r.placeGroup==='upper');
 assert.equal(a.length,2);assert.ok(a.every(r=>r.lengthMiles===null));
 assert.equal(a.find(r=>r.id==='tahq-upper-packed-walking').supportedActivity.includes('snowshoe'),false);
 assert.ok(!routes.some(r=>r.displayName.includes('Lantern Loop')));
 assert.ok(quarantined.some(q=>q.id==='tahq-upper-lantern-loop'));
});
test('official seasonal unplowed road warning quarantines Anderson Lake ski loops',()=>{
 assert.equal(quarantined.filter(q=>q.id.startsWith('anderson-loop-')).length,3);
 assert.ok(!routes.some(r=>r.displayName.includes('Anderson Lake')));
 assert.ok(quarantined.filter(q=>q.id.startsWith('anderson-loop-')).every(q=>q.parkingRestricted));
});
test('Hartwick broken Au Sable loop is not included as an intact trip',()=>{
 assert.ok(!routes.some(r=>r.id.includes('hartwick-au-sable')));
 assert.ok(quarantined.some(q=>q.id==='hartwick-au-sable-loop'));
 const forest=Routes.routeById('hartwick-old-growth');
 assert.equal(forest.lengthMiles,1.25);
 assert.equal(Routes.routeById('hartwick-mertz-grade').lengthEvidence,'historical_official');
});
test('Muncie 9.8mi network is not misrepresented as one fixed winter outing route',()=>{
 assert.ok(quarantined.some(q=>q.id==='muncie-pathway-whole-system'));
 assert.ok(!routes.some(r=>r.id.startsWith('muncie')));
});
test('Bay City, Port Crescent and Grand Mere unsized real named trails remain unknown mileage',()=>{
 for(const group of ['bay','port','grand']){
  const a=routes.filter(r=>r.placeGroup===group);
  assert.ok(a.length>=2);assert.ok(a.every(r=>r.lengthMiles===null));
 }
});
test('listed winter snowshoe routes differ from boots-only packed Upper Falls walking corridor',()=>{
 const snow=Routes.listRoutes({activity:'snowshoe'});
 const boots=Routes.listRoutes({activity:'hike'});
 assert.ok(!snow.some(r=>r.id==='tahq-upper-packed-walking'));
 assert.ok(boots.some(r=>r.id==='tahq-upper-packed-walking'));
 assert.equal(Routes.listRoutes({region:'upper-peninsula'}).length,9);
});
test('length filter excludes unverified mileage instead of estimating it',()=>{
 assert.equal(Routes.listRoutes({onlyMeasured:true}).length,25);
 assert.ok(Routes.listRoutes({onlyMeasured:true}).every(r=>r.miles>0));
 assert.throws(()=>Routes.listRoutes({activity:'trailrunning'}));
});
test('route research destination retains DNR reference but cannot become parking or route geometry',()=>{
 const d=Routes.routeToResearchDestination('negwegon-algonquin');
 assert.equal(d.activities.snowshoe,true);
 assert.equal(d.navigationReady,false);
 assert.equal(d.routeGeometryObjectIds,null);
 assert.equal(d.dnrIdNotRouteGeometry,true);
 assert.equal(Routes.routeToResearchDestination('not-found'),null);
});
test('invalid official website host, missing provenance or fake navigation fails catalog validation',()=>{
 const seed=routes[0];
 assert.ok(Routes.validateRoute({...seed,routeEvidenceUrl:'https://michigan.gov.evil.com/'}).length);
 assert.ok(Routes.validateRoute({...seed,verifiedDriveTarget:{lat:44,lon:-85},navigationReady:true}).length);
 assert.ok(Routes.validateRoute({...seed,lengthMiles:90}).length);
 const duplicate={...data,routes:[seed,seed]};
 assert.equal(Routes.auditCatalog(duplicate).ok,false);
});
