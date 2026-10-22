'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Map=require('../lib/winter-hike-map.cjs');
const catalog=require('../data/winter-hike/michigan-curated-routes.json');
const gis=require('../data/winter-hike/hartwick-spatial-fixture.json');
const API=require('../api/winter-hike-lab.js');
const sample=require('../data/winter-hike/official-live-shape-2026-10-22.json');
const Routes=require('../lib/winter-hike-routes.cjs');
function response(){
 let code=200;const headers={};
 return {headers,setHeader(k,v){headers[k]=v},status(c){code=c;return this},json(v){return {code,headers,body:v}}};
}
test('catalog endpoint has exactly 38 routes and disables every navigation target',async()=>{
 const o=await API({method:'GET',query:{mode:'catalog'}},response());
 assert.equal(o.code,200);
 assert.equal(o.body.routes.length,38);
 assert.equal(o.headers['X-Robots-Tag'],'noindex, nofollow');
 assert.ok(o.body.routes.every(r=>r.navigationReady===false&&r.parking==='unverified'&&Number.isFinite(r.point.lat)));
});
test('API only supports explicit read-only modes and GET',async()=>{
 assert.equal((await API({method:'POST',query:{mode:'catalog'}},response())).code,405);
 assert.equal((await API({method:'GET',query:{mode:'delete'}},response())).code,400);
 assert.equal((await API({method:'GET',query:{mode:'preview',route:'bogus',date:'2026-10-24'}},response())).code,400);
 assert.equal((await API({method:'GET',query:{mode:'preview',route:'vasa-snowshoe-orange',date:'banana'}},response())).code,400);
});
test('API refuses an activity not documented for an Upper Falls walking path',async()=>{
 const r=await API({method:'GET',query:{mode:'preview',route:'tahq-upper-packed-walking',date:'2026-10-24',activity:'snowshoe'}},response());
 assert.equal(r.code,400);
});
test('official GIS Hartwick fixture only supplies sourced partial line fragments',()=>{
 const dest={sourceDnrTrailId:gis.destinationId,sourceDnrTrailName:'Hartwick Pines - Au Sable River Trail'};
 const d=Map.toLines(dest,{hiking:gis.hikingSegments,closure:gis.closureSegments,snowshoe:[]});
 assert.equal(d.status,'partial-source-lines');
 assert.ok(d.features.some(x=>x.properties.kind==='closed-segment'&&x.properties.sourceObjectId===2043));
 assert.ok(d.features.every(x=>x.properties.meaning.includes('not a')||x.properties.meaning.includes('not a full')));
 assert.ok(d.features.some(x=>x.properties.kind==='unverified-trail-line'));
});
test('GIS identity conflict never draws Mertz Grade against Au Sable River closure',()=>{
 const mismatched=gis.hikingSegments.find(x=>x.attributes.OBJECTID===2091);
 const d=Map.toLines({sourceDnrTrailId:gis.destinationId,sourceDnrTrailName:'Hartwick Pines - Au Sable River Trail'},
   {hiking:[mismatched],snowshoe:[mismatched],closure:[]});
 assert.equal(d.status,'no-matched-geometry');
 assert.equal(d.features.length,0);
});
test('winter loops without a digital identity never receive invented mapped routes',()=>{
 const v=Routes.routeById('vasa-snowshoe-orange');
 const d=Map.toLines(v,{hiking:gis.hikingSegments,snowshoe:[],closure:gis.closureSegments});
 assert.equal(d.status,'no-direct-dnr-geometry-id');
 assert.equal(d.features.length,0);
});
test('invalid geometry and runaway source vertices fail closed',()=>{
 const dest={sourceDnrTrailId:gis.destinationId,sourceDnrTrailName:'Hartwick Pines - Au Sable River Trail'};
 const huge={attributes:{OBJECTID:991,RecreationSearchTrailID:gis.destinationId,TrailNamePrimary:'Hartwick Pines Au Sable River Trail'},
  geometry:{paths:[Array.from({length:5001},(_,i)=>[-84.65+i*.000001,44.75])]}};
 const d=Map.toLines(dest,{hiking:[huge],snowshoe:[],closure:[]});
 assert.equal(d.status,'geometry-too-large');assert.equal(d.features.length,0);
});
test('API compact cards never publish mistaken coordinates as lot navigation',()=>{
 for(const r of catalog.routes){
  const c=API.compactRoute(r);
  assert.equal(c.navigationReady,false);
  assert.equal(c.parking,'unverified');
  assert.ok(c.point.meaning.includes('not a confirmed trailhead'));
  assert.ok(!('directionsUrl' in c));
 }
});
test('official NWS sample includes seven source hours for graph and consistent coordinates',()=>{
 assert.equal(sample.nws.properties.periods.length,7);
 assert.equal(sample.coordinates.lat,44.65728);
 assert.equal(sample.coordinates.lon,-85.44774);
});
