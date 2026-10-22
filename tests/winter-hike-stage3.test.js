'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Geometry=require('../lib/winter-hike-spatial.cjs');
const GIS=require('../lib/winter-hike-arcgis.cjs');
const Access=require('../lib/winter-hike-access.cjs');
const Trip=require('../lib/winter-hike-trip.cjs');
const E=require('../lib/winter-hike-decision.cjs');
const sample=require('../data/winter-hike/hartwick-spatial-fixture.json');
const candidate=require('../data/winter-hike/michigan-dnr-candidates.json');
const dest=E.normalizePoint(candidate.records.find(x=>x.ID===sample.destinationId));
const now=Date.parse('2026-12-12T15:00:00Z');
const check=(kind,extra={})=>({kind,trailId:dest.id,status:'open',
  sourceUrl:'https://www.michigan.gov/recsearch/parks/hartwick',
  checkedAt:'2026-12-12T14:00:00Z',winterSpecific:true,
  plowedConfirmed:true,roadMaintenanceConfirmed:true,
  ...extra});
const verified=[check('trail'),check('parking',{parkingEntranceConfirmed:true,
  location:{kind:'winter-parking-lot',lat:44.73,lon:-84.65}}),check('road')];
const trailRows=sample.hikingSegments,closureRows=sample.closureSegments;
function dnrMock(u) {
 if(u.includes('/0/query'))return Promise.resolve({features:closureRows});
 if(u.includes('/2/query'))return Promise.resolve({features:trailRows});
 if(u.includes('/6/query'))return Promise.resolve({features:trailRows.filter(x=>x.attributes.OBJECTID===2091)});
 throw Error('Unanticipated DNR URL');
}
test('live official geometry fixture shows closed segment at Hartwick OID 2043',()=>{
 const s=Geometry.audit(dest,{closureSegments:closureRows,hikingSegments:trailRows});
 assert.deepEqual(s.closedObjectIds,[2043]);assert.equal(s.closure.geometryVerified,true);
 assert.equal(s.routeStatus,'partial-closure-route-unknown');
 assert.deepEqual(s.identityConflicts,[2091]);
});
test('closed segment in a selected route is excluded, not entire park',()=>{
 const c=Geometry.audit(dest,{closureSegments:closureRows,hikingSegments:trailRows,routeObjectIds:[2043]});
 assert.equal(c.closure.routeAffected,true);
 const r=E.interpret(dest,{closure:c.closure});
 assert.equal(r.state,'excluded');
 assert.match(r.blockers.join(' '),/selected route segment/);
});
test('another mapped segment is NOT automatically closed or navigable',()=>{
 const r=Geometry.audit(dest,{closureSegments:closureRows,hikingSegments:trailRows,routeObjectIds:[1864]});
 assert.equal(r.closure.routeAffected,false);
 assert.equal(r.routeStatus,'proposed-route-avoids-known-closure-unverified');
 assert.ok(r.closedObjectIds.includes(2043));
});
test('same ID but wrong Mertz Grade trail name is identity conflict, not an unrelated closure',()=>{
 const r=Geometry.audit(dest,{closureSegments:[],hikingSegments:trailRows,routeObjectIds:[2091]});
 assert.deepEqual(r.identityConflicts,[2091]);
 assert.equal(r.routeStatus,'route-not-provided');
});
test('touching trail vertices never prove an entire adjacent segment is closed',()=>{
 const p=trailRows.find(x=>x.attributes.OBJECTID===20008).geometry.paths[0];
 const close=closureRows[0].geometry.paths;
 const stats=Geometry.closenessMeters(p,close);
 assert.ok(stats.totalMeters>50);
 assert.ok(stats.nearMeters<stats.totalMeters*.8);
});
test('same OBJECTID alone is insufficient without matching co-located line geometry',()=>{
 const dislocated=JSON.parse(JSON.stringify(closureRows[0]));
 dislocated.geometry.paths=[[[ -85.4,44.5 ],[-85.401,44.501]]];
 const r=Geometry.audit(dest,{closureSegments:[dislocated],hikingSegments:trailRows});
 assert.deepEqual(r.closedObjectIds,[]);assert.deepEqual(r.missingGeometry,[2043]);
});
test('strictly rejects malformed or non-Michigan geometry',()=>{
 assert.equal(Geometry.lines({geometry:{paths:[[[0,0],[0,1]]]}}).length,0);
 assert.equal(Geometry.lines({geometry:{paths:[[[ -84,44 ],[Infinity,44]]]}}).length,0);
});
test('GIS layer URLs accept only official curated DNR UUID and fixed layer names',()=>{
 assert.match(GIS.url('closure',dest.id),/DNRTrailsOPENDATA\/MapServer\/0\/query/);
 assert.match(GIS.url('hiking',dest.id),/returnGeometry=true/);
 assert.throws(()=>GIS.url('closure',"something' OR 1=1--"));
 assert.throws(()=>GIS.url('bad',dest.id));
});
test('complete live DNR layer lookup preserves partial closure and mismatched names',async()=>{
 const r=await GIS.lookup(dest,{fetchJson:dnrMock,routeObjectIds:[2043]});
 assert.equal(r.status,'fetched');assert.equal(r.spatial.closure.routeAffected,true);
 assert.deepEqual(r.spatial.identityConflicts,[2091]);
});
test('failed DNR closure layer leaves spatial result unavailable',async()=>{
 const r=await GIS.lookup(dest,{fetchJson:u=>u.includes('/0/query')?Promise.reject(Error('offline')):dnrMock(u)});
 assert.equal(r.status,'unavailable');assert.deepEqual(r.missingLayers,['closure']);
});
test('pagination failure never certifies the absence of closure',async()=>{
 const r=await GIS.lookup(dest,{fetchJson:u=>u.includes('/0/query')?{features:[],exceededTransferLimit:true}:dnrMock(u)});
 assert.equal(r.status,'unavailable');
});
test('official source host is required for every status check',()=>{
 assert.equal(Access.validateCheck(check('trail',{sourceUrl:'https://michigan.gov.evil.com/'}),now),false);
 assert.equal(Access.validateCheck(check('trail',{sourceUrl:'http://www.michigan.gov'}),now),false);
 assert.equal(Access.validateCheck(check('trail'),now),true);
});
test('static winter directions cannot be promoted to an open parking lot',()=>{
 const a=Access.accessFromChecks(dest.id,[check('trail'),check('parking',{plowedConfirmed:false}),check('road')],now);
 assert.equal(a.managerConfirmed,false);assert.equal(a.navigationReady,false);
});
test('three fresh winter manager checks are independently necessary',()=>{
 const a=Access.accessFromChecks(dest.id,verified,now);
 assert.equal(a.managerConfirmed,true);assert.equal(a.winterSpecific,true);
 assert.equal(a.navigationReady,true);
 assert.equal(a.winterParkingCoordinates.lat,44.73);
 const b=Access.accessFromChecks(dest.id,verified.slice(0,2),now);
 assert.equal(b.managerConfirmed,false);
});
test('parking may be open but an unverified parking entrance cannot create driving directions',()=>{
 const rows=[check('trail'),check('parking',{location:{kind:'park-center',lat:44.73,lon:-84.65}}),check('road')];
 const a=Access.accessFromChecks(dest.id,rows,now);
 assert.equal(a.managerConfirmed,true);assert.equal(a.navigationReady,false);
});
test('current manager report staleness blocks even three otherwise open statuses',()=>{
 const outdated=verified.map(x=>({...x,checkedAt:'2026-12-01T10:00:00Z'}));
 assert.equal(Access.accessFromChecks(dest.id,outdated,now).managerConfirmed,false);
});
test('manager closed parking cannot be overridden by model snow',()=>{
 const checks=[check('trail'),check('parking',{status:'closed'}),check('road')];
 const a=Access.accessFromChecks(dest.id,checks,now);
 assert.equal(E.interpret(dest,{access:a}).state,'excluded');
});
test('source-level real DNR closure is not confused with a site-wide closure',()=>{
 const r=Geometry.audit(dest,{closureSegments:closureRows,hikingSegments:trailRows});
 const d=E.interpret(dest,{closure:r.closure});
 assert.equal(d.state,'verify');assert.equal(d.blockers.length,0);
});
