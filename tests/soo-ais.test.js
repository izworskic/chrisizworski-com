const test=require('node:test');
const assert=require('node:assert/strict');
const {normalize}=require('../lib/soo-ais');
const handler=require('../api/soo-ais');
const now=Date.parse('2026-09-17T12:30:00Z');
const feature=(changes={},coordinates=[-84.35,46.5])=>({type:'Feature',id:366904910,geometry:{type:'Point',coordinates},properties:{mmsi:366904910,name:'KAYE E BARKER',seen:'2026-09-17T12:25:00Z',sog:0,source:'aishub',...changes}});
const collection=features=>({type:'FeatureCollection',features,attribution:{aishub:'AISHub via Open Waters AIS'}});
test('Soo feed preserves real zero speed, unknown heading, vessel names, timestamps and source credit',()=>{
 const d=normalize(collection([feature()]),now);assert.equal(d.vessels.length,1);
 assert.equal(d.vessels[0].speedKnots,0);assert.equal(d.vessels[0].heading,null);assert.equal(d.vessels[0].seen,'2026-09-17T12:25:00.000Z');assert.equal(d.attribution[0].credit,'AISHub via Open Waters AIS');
 assert.equal(normalize(collection([feature({sog:null,heading:511,cog:360})]),now).vessels[0].speedKnots,null);
});
test('out-of-area, old, undated, future, malformed and missing-coordinate reports do not become current ships',()=>{
 const raw=collection([feature({},[null,46.5]),feature({},[-122.4,47.6]),feature({seen:'2026-09-17T11:00:00Z'}),feature({seen:null}),feature({seen:'2026-09-18T12:00:00Z'}),feature({},{}),feature({mmsi:'bogus'})]);
 assert.deepEqual(normalize(raw,now).vessels,[]);assert.throws(()=>normalize({features:[]},now));
});
test('duplicate MMSIs keep only the newest position',()=>{
 const d=normalize(collection([feature(),feature({seen:'2026-09-17T12:29:00Z'},[-84.34,46.51])]),now);assert.equal(d.vessels.length,1);assert.equal(d.vessels[0].lon,-84.34);
});
test('a failed AIS provider is an unavailable response rather than an empty successful map',async t=>{
 t.mock.method(global,'fetch',async()=>({ok:false,status:500}));const res={headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v}};
 await handler({method:'GET'},res);assert.equal(res.code,502);assert.equal(res.body.ok,false);assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(res.body.vessels,undefined);
});
