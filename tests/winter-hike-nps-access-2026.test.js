'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Routes = require('../lib/winter-hike-routes.cjs');
const Parking = require('../lib/winter-hike-parking.cjs');
const API = require('../api/winter-hike-lab.js');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root,'public/winter-hike-snowshoe-lab/index.html'),'utf8');
const app = fs.readFileSync(path.join(root,'public/winter-hike-snowshoe-lab/app.js'),'utf8');
const id='piro-sand-point-marsh';
const ref='https://www.nps.gov/places/sand-point-marsh-trail-in-winter.htm';
const response=()=>({setHeader(){},status(code){this.code=code;return this},json(body){return{code:this.code,body}}});

test('a 2026 NPS source-backed Sand Point Marsh route appears in the real 51-route weather catalog',async()=>{
 const route=Routes.routeById(id);
 assert.ok(route);
 assert.equal(route.lengthMiles,.5);
 assert.deepEqual(route.supportedActivity,['hike','snowshoe']);
 assert.equal(route.routeEvidenceUrl,ref);
 assert.equal(route.referencePoint.lat,46.448947);
 assert.equal(route.referencePoint.lon,-86.605869);
 assert.match(route.referencePoint.meaning,/NPS 2026 ranger event meeting coordinate/);
 assert.equal(route.navigationReady,false);
 assert.equal(route.verifiedDriveTarget,null);
 assert.equal(route.currentWinterAccess,'unverified');
 assert.deepEqual(Routes.validateRoute(route),[]);
 const r=await API({method:'GET',query:{mode:'catalog'}},response());
 assert.equal(r.code,200);
 assert.equal(r.body.routes.length,51);
 const card=r.body.routes.find(x=>x.id===id);
 assert.equal(card.miles,.5);
 assert.equal(card.winterAccess.checkpointId,'piro-sand-point');
 assert.equal(card.winterAccess.navigationReady,false);
 assert.equal(card.winterAccess.parking,'unknown');
 assert.equal(card.winterAccess.road,'unknown');
 assert.match(card.winterAccess.publishedWinterMaintenance,/normally plowed/i);
 assert.match(card.winterAccess.knownAccessIssue,/October 1/);
 assert.equal(card.winterAccess.currentConditionsUrl,'https://www.nps.gov/piro/planyourvisit/conditions.htm');
});

test('NPS normal seasonal plowing description cannot become an open-road assertion for 2026-27',()=>{
 const checkpoint=Parking.registry.checkpoints.find(x=>x.id==='piro-sand-point');
 assert.ok(checkpoint);
 assert.equal(checkpoint.parkingEntranceCoordinates,null);
 assert.equal(checkpoint.winterParkingVerified,false);
 assert.equal(checkpoint.drivingDirectionsEnabled,false);
 assert.ok(checkpoint.source.startsWith('https://www.nps.gov/'));
 for(const day of ['2026-11-06','2027-01-15','2027-03-15']){
  const date=Date.parse(day+'T16:00:00Z');
  const result=Parking.assess(id,{tripDay:day,now:date});
  assert.equal(result.status,'verification-needed');
  assert.equal(result.trail,'unknown');assert.equal(result.road,'unknown');assert.equal(result.parking,'unknown');
  assert.equal(result.managerAccessConfirmed,false);
  assert.equal(result.drivingDirectionsUrl,null);
 }
 const fabricated={kind:'parking',status:'open',checkpointId:'piro-sand-point',routeId:id,
  season:'2026-27',sourceUrl:ref,sourceType:'static-manager-description',
  winterSpecific:true,managerObservedAt:'2027-01-15T15:30:00Z',
  effectiveFrom:'2027-01-15',effectiveThrough:'2027-01-15',
  plowedConfirmed:true,parkingEntranceConfirmed:true,
  waypoint:{kind:'winter-parking-lot',managerLotName:'invented Sand Point entrance',lat:46.448947,lon:-86.605869}};
 assert.equal(Parking.validateObservation(fabricated,checkpoint,id,'2027-01-15',Date.parse('2027-01-15T16:00:00Z')),false);
 assert.equal(Parking.audit().ok,true,JSON.stringify(Parking.audit().failures));
});

test('a closed Munising Falls trail is excluded, while NPS winter policy and access uncertainties are visible',()=>{
 assert.ok(!Routes.catalog.routes.some(r=>/munising-falls/i.test(r.id)));
 assert.match(html,/Munising Falls Trail: closed/);
 assert.match(html,/2026 construction caveat/);
 assert.match(html,/2\.65 mi · marked winter snowshoe loop/);
 assert.match(html,/data-select-route="piro-sand-point-marsh"/);
 assert.match(html,/nps.gov\/places\/snowshoe-trail-piro.htm/);
 assert.match(html,/nps.gov\/piro\/planyourvisit\/conditions.htm/);
 assert.match(html,/NPS reports most other Pictured Rocks roads are unplowed/);
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(app,/\[data-select-route\]/);
 assert.match(app,/state\.routes\.find\(item=>item\.id===id\)/);
 assert.match(app,/pick\(id,true\)/);
 assert.doesNotMatch(app,/google\.com\/maps\/dir/);
});

test('NPS past road closure stays a named unresolved access issue, never a fabricated reopening',()=>{
 const c=Parking.registry.checkpoints.find(x=>x.id==='piro-sand-point');
 assert.match(c.knownAccessIssue,/reopening status must be checked/i);
 assert.match(c.question,/reopen after the 2026 construction closure/i);
 assert.match(c.sourceMeaning,/not a dated 2026.27 open\/cleared report/i);
});
