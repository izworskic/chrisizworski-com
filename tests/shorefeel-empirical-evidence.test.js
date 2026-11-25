'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.join(__dirname,'../data/shorefeel');
const name=s=>s+'-actual-20261124.json';
const load=s=>JSON.parse(fs.readFileSync(path.join(dir,name(s)),'utf8'));
const hash=s=>crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,name(s)))).digest('hex');
const key=p=>[p.station,p.cycleAt,p.leadHours].join('|');
const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`expected ${a} to equal ${b}`);
const records=[
 ['october-20',8,6],['october-expanded',40,20],['october-timing-sensitivity',16,9],
 ['october-november-multistation',180,83],['early-october',80,59],['warm-season',80,58]
];
// First three historical filenames differ from the later convention.
const special={'october-timing-sensitivity':'october-timing-sensitivity-20261124.json'};
const read=s=>special[s]?JSON.parse(fs.readFileSync(path.join(dir,special[s]),'utf8')):load(s);
const rows=d=>d.pairs??(d.cycles??d.cycleResults).flatMap(c=>c.pairs);
test('frozen empirical cohort denominators, hashes, and pair arithmetic remain intact',()=>{
 for(const [id,expected,n] of records){
  const d=read(id),p=rows(d);
  assert.equal(d.canPromoteModel,false,id);
  assert.equal(d.cohort.length,expected,id);assert.equal(p.length,expected,id);
  assert.equal(new Set(p.map(key)).size,expected,id);
  assert.deepEqual(p.map(key).sort(),d.cohort.map(key).sort(),id);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(canon(d.cohort))).digest('hex'),d.cohortSha256,id);
  const scored=p.filter(x=>Number.isFinite(x.modelChangeErrorF));
  assert.equal(scored.length,n,id);
  for(const x of scored){
   near(x.persistenceF,x.baselineC*1.8+32);near(x.actualF,x.actualC*1.8+32);
   near(x.predictedF,x.persistenceF+(x.modelValidC-x.modelBaseC)*1.8);
   near(x.modelChangeErrorF,x.predictedF-x.actualF);near(x.persistenceErrorF,x.persistenceF-x.actualF);
  }
  for(const x of p.filter(x=>!Number.isFinite(x.modelChangeErrorF)))assert.ok(x.reason,id);
  assert.ok(d.sourceRun?.head&&d.sourceRun?.runId&&d.sourceRun?.jobId,id);
 }
});
test('near-time recoveries are disjoint from original exact matches, bounded, and linked to frozen bytes',()=>{
 for(const [original,recovery,n] of [['october-november-multistation','near-time-recovery',18],['early-october','early-october-near-time',9],['warm-season','warm-season-near-time',10]]){
  const src=load(original),d=load(recovery),p=rows(src);
  assert.equal(d.canPromoteModel,false);assert.equal(d.sourceDatasetSha256,hash(original));
  assert.equal(d.originalCohortSha256,src.cohortSha256);assert.equal(d.recovered.length,n);
  const missing=new Set(p.filter(x=>!Number.isFinite(x.modelChangeErrorF)).map(key));
  const recovered=new Set(d.recovered.map(key)),unresolved=new Set(d.unresolved.map(key));
  assert.equal(recovered.size,n);assert.equal(recovered.size+unresolved.size,missing.size);
  for(const k of recovered)assert.ok(missing.has(k)&&!unresolved.has(k));
  for(const k of unresolved)assert.ok(missing.has(k));
  for(const x of d.recovered){
   assert.ok(x.baselineOffsetMinutes>=-15&&x.baselineOffsetMinutes<=0);
   assert.ok(Math.abs(x.targetOffsetMinutes)<=15);
   assert.match(x.baselineSha256,/^[a-f0-9]{64}$/);assert.match(x.targetSha256,/^[a-f0-9]{64}$/);
   near(x.modelChangeErrorF,x.predictedF-x.actualF);
  }
 }
 assert.equal(records.reduce((s,r)=>s+r[2],0)+18+9+10,272);
});
test('cause evidence is linked, preserves adverse cases, and never authorizes promotion',()=>{
 const depth=load('warm-season-depth-watch'),spatial=load('warm-season-spatial-cause'),wind=load('warm-season-wind-cause'),atmos=load('atmospheric-satellite-cause');
 for(const d of [depth,spatial,wind,atmos])assert.equal(d.canPromoteModel,false);
 assert.equal(depth.sourceDatasetSha256,hash('warm-season'));
 assert.equal(spatial.sourceSha256,hash('warm-season'));assert.equal(spatial.alignedSha256,hash('warm-season-depth-watch'));
 assert.equal(wind.sourceSha256,hash('warm-season-spatial-cause'));
 assert.equal(depth.metrics[24].alignedMatched,29);assert.equal(depth.metrics[24].alignedSurfaceWatch.FP,8);
 assert.equal(spatial.metrics.falseWatches,3);assert.equal(spatial.metrics.falseWatchesWithMajorityNeighborhoodCooling,3);
 assert.equal(spatial.metrics.falseWatchesWithLaterCycleCooling,3);
 assert.equal(wind.cycles.flatMap(c=>c.stationHistories).reduce((s,r)=>s+r.hours.length,0),960);
 assert.equal(atmos.cycles.flatMap(c=>c.exactForcingProbes).filter(x=>x.status===404).length,12);
 assert.equal(atmos.cycles.flatMap(c=>c.exactForcingProbes).filter(x=>x.status===403).length,6);
 assert.equal(atmos.cycles.flatMap(c=>c.gfsProxy).reduce((s,r)=>s+Object.keys(r.fields).length,0),20);
 assert.equal(atmos.cycles.flatMap(c=>c.dailySatelliteContext).reduce((s,r)=>s+r.dailySamples.length,0),24);
});
