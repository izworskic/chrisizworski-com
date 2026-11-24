'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildRegistry,mapCatalog,resolve,distanceKm,ASSOCIATIONS}=require('../lib/shorefeel/beach-registry');
const mi=require('../data/beaches.json'),us=require('../data/shorefeel-us-coast.json'),ca=require('../data/shorefeel-canada-ontario.json');
const epaMi=require('../data/shorefeel-epa-mi-2025.json'),epaOther=require('../data/shorefeel-epa-other-2025.json');
const asset=require('../public/assets/great-lakes-beach-registry.json');
const registry=buildRegistry();
test('all original records resolve exactly once, including all original guides and source IDs',()=>{
 const expected=[...mi.beaches.map(b=>'mi:'+b.slug),...us.beaches.map(b=>'us:'+b.slug),...ca.locations.map(b=>'ca:'+b.slug),
  ...[...epaMi.records,...epaOther.records].map(b=>'epa:'+b.id)];
 const actual=registry.entries.flatMap(e=>e.refs.map(r=>r.key));
 assert.deepEqual([...actual].sort(),[...expected].sort());
 assert.equal(new Set(actual).size,actual.length);
 assert.equal(new Set(registry.entries.map(e=>e.id)).size,registry.entries.length);
 for(const key of expected)assert.ok(resolve(registry,key),key);
 for(const e of registry.entries)for(const ref of e.refs){
  assert.match(ref.guide,/^\/great-lakes-beaches\//);
  assert.ok(['mi','us','ca'].includes(ref.forecast.adapter));
  assert.equal(typeof ref.forecast.key,'string');
  assert.ok(Number.isFinite(ref.point.lat)&&Number.isFinite(ref.point.lon));
 }
 assert.equal(registry.stats.sourceRecords,expected.length);
 assert.equal(registry.stats.entries,expected.length-Object.keys(ASSOCIATIONS).length);
});
test('reviewed associations collapse one map destination, never discard distinct reference coordinates or URLs',()=>{
 for(const [key,id] of Object.entries(ASSOCIATIONS)){
  const entry=resolve(registry,key);
  assert.equal(entry.id,'epa:'+id);
  assert.equal(entry,resolve(registry,'epa:'+id));
  assert.equal(entry.refs.length,2);
  assert.ok(distanceKm(entry.refs[0].point,entry.refs[1].point)<=1);
 }
 assert.notEqual(resolve(registry,'mi:bay-city-state-park'),resolve(registry,'epa:MI000290'));
 assert.ok(registry.pending.some(x=>x.curated==='mi:bay-city-state-park'&&x.source==='epa:MI000290'));
 // Different beach segments at the same park remain independently addressable.
 assert.notEqual(resolve(registry,'epa:OH182884'),resolve(registry,'epa:OH318877'));
 assert.notEqual(resolve(registry,'epa:MI000326'),resolve(registry,'epa:MI001394'));
});
test('cross-border map has five lakes, eight states and Ontario; unknowns and non-beaches are honest',()=>{
 const map=mapCatalog(registry);
 assert.deepEqual(new Set(map.beaches.map(b=>b.lake).filter(Boolean)),new Set(['Superior','Michigan','Huron','Erie','Ontario']));
 assert.equal(new Set(map.beaches.filter(b=>b.country==='US').map(b=>b.region)).size,8);
 assert.equal(map.beaches.filter(b=>b.country==='CA').length,ca.locations.length);
 assert.ok(map.beaches.some(b=>b.lake===null));
 assert.ok(registry.entries.some(e=>e.kind==='viewpoint'));
 assert.ok(!map.beaches.some(b=>b.id==='mi:wenonah-park'||b.id==='epa:OH318877'));
 for(const b of map.beaches){
  assert.equal(b.swimStatus,'unknown');
  assert.equal(b.access,'not-verified-current');
  assert.ok(Number.isFinite(b.lat)&&Number.isFinite(b.lon));
 }
 assert.equal(map.beaches.length,registry.stats.mapEntries);
 assert.equal(registry.stats.unknownLake,map.beaches.filter(b=>b.lake===null).length);
});
test('committed browser catalog is identical to the normalized registry and deterministic',()=>{
 assert.deepEqual(asset,mapCatalog(registry));
 assert.deepEqual(mapCatalog(buildRegistry()),asset);
});
