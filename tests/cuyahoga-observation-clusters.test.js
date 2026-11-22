'use strict';
const {test,before}=require('node:test');
const assert=require('node:assert/strict');
let mod;
before(async()=>{mod=await import('../scripts/cuyahoga-observation-clusters.mjs');});
const sample=(m,lat=41.49912,lon=-81.70848)=>({lat,lon,seen:new Date(Date.parse('2025-06-20T04:00:00Z')+m*60000).toISOString()});
test('geodesic distance at same coordinate is zero',()=>{assert.equal(mod.metersBetween(sample(0),sample(1)),0);});
test('a measured position cluster is not labeled a bridge or grounding event',()=>{
 const points=[...Array(60)].map((_,i)=>sample(i,41.49912+(i%3)*.000003,-81.70848));
 const r=mod.findPositionClusters(points);
 assert.equal(r.length,1);assert.equal(r[0].observations,60);
 assert.equal(r[0].durationMinutes,59);assert.match(r[0].kind,/NOT_CONFIRMED/);
});
test('reporting gaps or spatial motion end a position cluster',()=>{
 const rows=[...Array(50)].map((_,i)=>sample(i)).concat([...Array(40)].map((_,i)=>sample(i+75,41.501,-81.712)));
 const r=mod.findPositionClusters(rows);
 assert.equal(r.length,2);assert.equal(r[0].observations,50);assert.equal(r[1].observations,40);
});
test('sparse reports fail closed and dates must have UTC timezone',()=>{
 const r=mod.findPositionClusters([sample(0),sample(50)]);
 assert.deepEqual(r,[]);
 assert.throws(()=>mod.findPositionClusters([{lat:41.5,lon:-81.7,seen:'2025-06-20T04:00:00'}]),/Invalid observed/);
});
