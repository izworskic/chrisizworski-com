'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Parking=require('../lib/winter-hike-parking.cjs');
const Routes=require('../lib/winter-hike-routes.cjs');
const API=require('../api/winter-hike-lab.js');
const NOW=Date.parse('2027-01-15T14:00:00Z');
const DAY='2027-01-15';
const SOURCE='https://www.michigan.gov/recsearch/trails/vasa-pathway';
const route='vasa-snowshoe-orange';
function row(kind,status='open',override={}){
 return {kind,status,routeId:route,checkpointId:'vasa-bartlett',
   sourceUrl:SOURCE,sourceType:'dated-manager-operational',winterSpecific:true,
   season:'2026-27',managerObservedAt:'2027-01-15T13:00:00Z',
   effectiveFrom:DAY,effectiveThrough:'2027-01-16',
   namedRouteConfirmed:true,roadMaintenanceConfirmed:true,plowedConfirmed:true,
   parkingEntranceConfirmed:true,
   waypoint:{kind:'winter-parking-lot',lat:44.7509,lon:-85.4934},
   ...override};
}
function apiResponse(){
 let code=200;const headers={};
 return {setHeader(k,v){headers[k]=v},status(n){code=n;return this},
 json(body){return {code,headers,body}}};
}
test('ten official-source winter-access checkpoints exist for 22 specific named routes',()=>{
 const a=Parking.audit();
 assert.deepEqual(a.failures,[]);assert.equal(a.ok,true);
 assert.equal(a.checkpoints,10);assert.equal(a.assignedRoutes,22);
 assert.equal(Parking.list({tripDay:DAY,now:NOW}).length,10);
 assert.ok(Parking.registry.checkpoints.every(s=>s.winterParkingVerified===false&&
   s.drivingDirectionsEnabled===false&&s.parkingEntranceCoordinates===null));
});
test('all researched facilities retain unknown seasonal plowing, including known trailhead GPS and Vasa address',()=>{
 const sites=Parking.registry.checkpoints;
 assert.equal(Parking.operational.observations.length,0);
 assert.ok(sites.some(s=>s.id==='sleepbear-alligator'&&s.parkingType==='official-trailhead-gps-not-plowed'));
 assert.ok(sites.some(s=>s.id==='vasa-bartlett'&&s.parkingHint.includes('4450 Bartlett')));
 for(const s of sites){
  const a=Parking.assess(s.routeIds[0],{tripDay:DAY,now:NOW});
  assert.equal(a.status,'verification-needed');
  assert.equal(a.parking,'unknown');assert.equal(a.road,'unknown');assert.equal(a.trail,'unknown');
  assert.equal(a.managerAccessConfirmed,false);assert.equal(a.navigationReady,false);
  assert.equal(a.parkingWaypoint,null);assert.equal(a.drivingDirectionsUrl,null);
 }
});
test('no ghost plowed-lot navigation is available on any of the 50 research routes',()=>{
 for(const r of Routes.catalog.routes){
  const s=Parking.assess(r.id,{tripDay:DAY,now:NOW});
  assert.equal(s.navigationReady,false);
  assert.equal(s.drivingDirectionsUrl,null);
  assert.equal(API.compactRoute(r).navigationReady,false);
  assert.ok(!('directionsUrl' in API.compactRoute(r)));
 }
});
test('static page visited today is not evidence that a lot was plowed',()=>{
 const bad=row('parking','open',{managerObservedAt:null,sourceRetrievedAt:'2027-01-15T13:59:00Z'});
 assert.equal(Parking.validateObservation(bad,Parking.registry.checkpoints[0],route,DAY,NOW),false);
 assert.equal(Parking.assess(route,{tripDay:DAY,now:NOW,observations:[bad]}).parking,'unknown');
});
test('old, future, off-season, forged, mixed-route and non-specific assertions all fail closed',()=>{
 const site=Parking.registry.checkpoints[0];
 for(const q of [
 {managerObservedAt:'2027-01-10T13:00:00Z'},
 {managerObservedAt:'2027-01-16T13:00:00Z'},
 {season:'2025-26'},
 {routeId:'vasa-snowshoe-red'},
 {checkpointId:'sleepbear-alligator'},
 {sourceUrl:'https://michigan.gov.attacker.invalid/parking'},
 {sourceUrl:'http://www.michigan.gov/recsearch/trails/vasa-pathway'},
 {sourceType:'generic-static-page'},
 {winterSpecific:false},
 {effectiveFrom:'2027-01-16'},
 {effectiveThrough:'2027-01-14'},
 {effectiveThrough:'2027-03-21'},
 {plowedConfirmed:false},
 {parkingEntranceConfirmed:false},
 {waypoint:{kind:'dnr-gis-point',lat:44.7509,lon:-85.4934}},
 {waypoint:{kind:'winter-parking-lot',lat:0,lon:0}},
 ])assert.equal(Parking.validateObservation(row('parking','open',q),site,route,DAY,NOW),false,
   'invalid record accepted '+JSON.stringify(q));
 assert.equal(Parking.seasonOf('2027-01-15'),'2026-27');
 assert.equal(Parking.seasonOf('2027-07-15'),null);
 assert.equal(Parking.assess(route,{tripDay:'2027-11-15',now:Date.parse('2027-11-15T14:00:00Z'),observations:[row('parking')]}).parking,'unknown');
});
test('three independent winter operational checks may complete access evidence but NEVER auto-grant directions',()=>{
 const observations=[row('trail'),row('road'),row('parking')];
 const a=Parking.assess(route,{tripDay:DAY,now:NOW,observations});
 assert.equal(a.status,'manager-access-evidence-complete');
 assert.equal(a.managerAccessConfirmed,true);
 assert.equal(a.navigationReady,false);assert.equal(a.parkingWaypoint,null);assert.equal(a.drivingDirectionsUrl,null);
 assert.equal(a.evidence.parkingWaypoint.kind,'winter-parking-lot');
 const partial=Parking.assess(route,{tripDay:DAY,now:NOW,observations:observations.slice(0,2)});
 assert.equal(partial.status,'verification-needed');
 assert.equal(partial.parking,'unknown');assert.equal(partial.managerAccessConfirmed,false);
});
test('closures and contradictions prevent positive access even with three other open statements',()=>{
 const base=[row('trail'),row('road'),row('parking')];
 const closed=Parking.assess(route,{tripDay:DAY,now:NOW,observations:[...base,row('road','closed')]});
 assert.equal(closed.status,'access-closed');assert.equal(closed.road,'conflict');
 assert.equal(closed.managerAccessConfirmed,false);assert.equal(closed.navigationReady,false);
 const restricted=Parking.assess(route,{tripDay:DAY,now:NOW,observations:[row('trail','restricted'),row('road'),row('parking')]});
 assert.equal(restricted.status,'verification-needed');assert.equal(restricted.managerAccessConfirmed,false);
 const blocked=Parking.assess(route,{tripDay:DAY,now:NOW,observations:[row('trail','closed'),row('road'),row('parking')]});
 assert.equal(blocked.status,'access-closed');
});
test('NPS evidence cannot be satisfied by a DNR page, or vice versa',()=>{
 const site=Parking.registry.checkpoints.find(s=>s.id==='sleepbear-alligator'),trail=site.routeIds[0];
 const nps={...row('parking'),checkpointId:site.id,routeId:trail,
  sourceUrl:'https://www.nps.gov/places/000/alligator-hill-trail-stocking-drive-trailhead.htm'};
 assert.equal(Parking.validateObservation(nps,site,trail,DAY,NOW),true);
 assert.equal(Parking.validateObservation({...nps,sourceUrl:SOURCE},site,trail,DAY,NOW),false);
 assert.equal(Parking.validateObservation({...row('parking'),sourceUrl:nps.sourceUrl},
  Parking.registry.checkpoints[0],route,DAY,NOW),false);
});
test('research catalog API displays access checkpoint without inventing a GPS route or parking green light',async()=>{
 const result=await API({method:'GET',query:{mode:'catalog'}},apiResponse());
 assert.equal(result.code,200);
 const v=result.body.routes.find(r=>r.id===route);
 assert.equal(v.winterAccess.checkpointId,'vasa-bartlett');
 assert.equal(v.winterAccess.parking,'unknown');
 assert.ok(v.winterAccess.managerQuestion.includes('plowed'));
 assert.equal(v.winterAccess.navigationReady,false);
 const other=result.body.routes.find(r=>r.id==='negwegon-algonquin');
 assert.equal(other.winterAccess.tracked,false);
 assert.equal(result.headers['X-Robots-Tag'],'noindex, nofollow');
});
