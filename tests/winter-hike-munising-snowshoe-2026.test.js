'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Routes=require('../lib/winter-hike-routes.cjs');
const Parking=require('../lib/winter-hike-parking.cjs');
const API=require('../api/winter-hike-lab.js');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/winter-hike-snowshoe-lab/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'public/winter-hike-snowshoe-lab/app.js'),'utf8');
const routeId='piro-munising-snowshoe';
function response(){let code=200;return{setHeader(){},status(n){code=n;return this;},json(body){return{code,body};}};}

test('Munising official 2.65-mile snowshoe circuit is integrated into real route inventory without converting it to a hiking route',async()=>{
 const route=Routes.routeById(routeId);
 assert.ok(route);
 assert.equal(Routes.auditCatalog().ok,true,JSON.stringify(Routes.auditCatalog().errors));
 assert.equal(Routes.catalog.routes.length,52);
 assert.equal(route.lengthMiles,2.65);
 assert.equal(route.lengthEvidence,'official_named_route');
 assert.deepEqual(route.supportedActivity,['snowshoe']);
 assert.equal(route.winterUse,'marked_dedicated_snowshoe');
 assert.equal(route.routeEvidenceUrl,'https://www.nps.gov/places/snowshoe-trail-piro.htm');
 assert.equal(route.officialMap,'https://www.nps.gov/piro/planyourvisit/upload/PIRO-Ski-and-Snowshoe-Trails-508.pdf');
 assert.equal(route.sourceDnrTrailId,null);
 assert.equal(route.navigationReady,false);
 assert.equal(route.verifiedTrailhead,null);
 assert.equal(route.verifiedDriveTarget,null);
 assert.equal(route.verifiedWinterParking,null);
 assert.ok(!Routes.listRoutes({activity:'hike'}).some(x=>x.id===routeId));
 assert.ok(Routes.listRoutes({activity:'snowshoe'}).some(x=>x.id===routeId));
 const result=await API({method:'GET',query:{mode:'catalog'}},response());
 assert.equal(result.code,200);
 const card=result.body.routes.find(x=>x.id===routeId);
 assert.ok(card);
 assert.equal(card.miles,2.65);
 assert.equal(card.winterAccess.checkpointId,'piro-munising-snowshoe');
 assert.equal(card.navigationReady,false);
 assert.equal(card.parking,'unverified');
 assert.match(card.point.meaning,/General Munising-area map reference/);
 assert.match(card.point.meaning,/not a confirmed trailhead/);
 assert.equal(card.winterAccess.navigationReady,false);
 assert.equal(card.winterAccess.drivingDirectionsUrl,null);
 const wrongActivity=await API({method:'GET',query:{mode:'preview',route:routeId,activity:'hike',date:'2026-11-08'}},response());
 assert.equal(wrongActivity.code,400);
});

test('normal plowing descriptions and conflicting NPS road policy cannot give a false green access verdict',()=>{
 const site=Parking.registry.checkpoints.find(x=>x.id===routeId);
 assert.ok(site);
 assert.equal(Parking.audit().ok,true,JSON.stringify(Parking.audit().failures));
 assert.equal(Parking.audit().checkpoints,12);
 assert.equal(Parking.audit().assignedRoutes,24);
 assert.equal(site.source,'https://www.nps.gov/places/snowshoe-trail-piro.htm');
 assert.equal(site.secondarySource,'https://www.nps.gov/piro/planyourvisit/conditions.htm');
 assert.match(site.publishedWinterMaintenance,/normally plowed/);
 assert.match(site.knownAccessIssue,/only Sand Point Road/);
 assert.match(site.parkingHint,/East City Limits Road/);
 assert.match(site.restriction,/groomed ski tracks/);
 assert.equal(site.parkingEntranceCoordinates,null);
 assert.equal(site.winterParkingVerified,false);
 assert.equal(site.drivingDirectionsEnabled,false);
 for(const day of ['2026-11-06','2027-01-15','2027-11-15']){
  const a=Parking.assess(routeId,{tripDay:day,now:Date.parse(day+'T16:00:00Z')});
  assert.equal(a.status,'verification-needed');
  assert.equal(a.trail,'unknown');
  assert.equal(a.road,'unknown');
  assert.equal(a.parking,'unknown');
  assert.equal(a.managerAccessConfirmed,false);
  assert.equal(a.navigationReady,false);
  assert.equal(a.drivingDirectionsUrl,null);
 }
});

test('public visitor controls select the actual Munising route; an unverified Munising town pin is excluded',()=>{
 assert.match(html,/data-select-route="piro-munising-snowshoe"/);
 assert.match(html,/Normally plowed ski lots|NPS describes normally plowed ski lots/);
 assert.match(html,/general Munising reference, not the snowshoe trailhead/);
 assert.match(html,/Munising Falls Trail: closed/);
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(app,/General Munising-area map reference/);
 assert.match(app,/if\(\/General Munising-area map reference\/\.test\(r\.point\?\.meaning\|\|''\)\)continue/);
 assert.match(app,/Munising snowshoe entrance is not mapped/);
 assert.match(app,/\[data-select-route\]/);
 assert.match(app,/Map\/forecast reference:/);
 assert.doesNotMatch(app,/google\.com\/maps\/dir/);
});

test('historic NPS 1.75-mile news release cannot override updated official 2.65-mile trail',()=>{
 const route=Routes.routeById(routeId);
 assert.equal(route.lengthMiles,2.65);
 assert.ok(!route.caveats.some(x=>/1\.75-mile/i.test(x)));
 assert.ok(route.caveats.some(x=>/G loop/i.test(x)));
 assert.ok(route.caveats.some(x=>/blue-blazed/i.test(x)));
});
