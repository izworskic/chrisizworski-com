'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {TARGETS,reconstruct,evaluateParity}=require('../scripts/shorefeel-native-grid-parity.cjs');
const H=3600000,T=Date.parse('2026-11-21T00:00:00Z'),at=h=>new Date(T+h*H).toISOString(),sha='a'.repeat(64);
function nodes(c,overrides={}){
 return [{id:1,lat:44.001,lon:-86},{id:2,lat:44,lon:-86.001},{id:3,lat:43.999,lon:-86}].map(n=>({...n,wet:true,sameWetComponent:true,layers:[{depthM:0,tempC:c},{depthM:2,tempC:c+2}],...overrides}));
}
const point={lat:44,lon:-86,depthM:1};
function artifact(c,lead,product){
 const date=c.slice(0,10),ymd=date.replaceAll('-',''),hour=c.slice(11,13);
 return {url:'https://opendap.co-ops.nos.noaa.gov/thredds/dodsC/NOAA/LMHOFS/MODELS/'+date.replaceAll('-','/')+'/lmhofs.t'+hour+'z.'+ymd+'.'+product+'.f'+String(lead).padStart(3,'0')+'.nc',sha256:sha,geometrySha256:product==='fields'?'b'.repeat(64):sha,modelVersion:'synthetic-model'};
}
function fixture(){
 const cycles=[at(0),at(6),at(12)],rows=[];
 for(const c of cycles)for(const [target,cell] of Object.entries(TARGETS))for(const lead of [0,24,48]){
  const value=10-lead/24;
  rows.push({cycleAt:c,validAt:new Date(Date.parse(c)+lead*H).toISOString(),leadHours:lead,target,point:{...point,...cell},regularWet:true,regularTempC:value,nativeNodes:nodes(value-1),regular:artifact(c,lead,'regulargrid'),native:artifact(c,lead,'fields')});
 }
 return {schemaVersion:1,kind:'synthetic',cycles,rows};
}
test('vertical interpolation and candidate IDW preserve an exact linear field',()=>{
 assert.ok(Math.abs(reconstruct(point,nodes(10))-11)<1e-9);
 const n=nodes(10);n[0].lat=44;n[0].lon=-86;n[0].layers=[{depthM:0,tempC:6},{depthM:2,tempC:8}];
 assert.equal(reconstruct(point,n),7);
});
test('dry, disconnected, too distant, duplicate or unsupported vertical samples abstain',()=>{
 for(const overrides of [{wet:false},{sameWetComponent:false},{lat:46},{layers:[{depthM:2,tempC:10},{depthM:3,tempC:10}]},{layers:[{depthM:0,tempC:null},{depthM:2,tempC:11}]}])
  assert.equal(reconstruct(point,nodes(10,overrides)),null);
 const n=nodes(10);n[1].id=n[0].id;assert.equal(reconstruct(point,n),null);
});
test('same cycle, exact cell and horizons are measured separately from observed accuracy',()=>{
 const d=fixture(),r=evaluateParity(d);
 assert.equal(r.status,'SYNTHETIC_NOT_PARITY');
 assert.equal(r.expected,54);assert.equal(r.accepted,54);
 assert.equal(r.groups[24].changePairs,18);assert.equal(r.groups[24].changeMAE_F,0);
 assert.deepEqual(r.reasons,[]);assert.equal(r.canSubstituteArchive,false);assert.equal(r.canCalibrateProduction,false);
 d.rows.find(x=>x.leadHours===24).nativeNodes=nodes(11);
 const diff=evaluateParity(d);
 assert.ok(diff.reasons.includes('MODEL_CHANGE_DIFFERENCE'));assert.ok(diff.reasons.includes('ABSOLUTE_GRID_DIFFERENCE'));
});
test('wrong source product, date, grid cell, model version and valid time are invalid',()=>{
 for(const mutate of [x=>x.native.url=x.regular.url,x=>x.native.url=x.native.url.replace('/2026/11/21/','/2026/11/20/'),x=>x.point.i++,x=>x.native.modelVersion='other',x=>x.validAt=at(99)]){
  const d=fixture();mutate(d.rows[0]);assert.equal(evaluateParity(d).invalid,1);
 }
});
test('missing baseline or changed spatial anchor prevents model-change comparison',()=>{
 const d=fixture();d.rows[0].point.depthM=0;
 const r=evaluateParity(d);assert.equal(r.groups[24].changePairs,17);
 const e=fixture();e.rows=e.rows.filter(x=>x.leadHours!==0);
 const z=evaluateParity(e);assert.equal(z.groups[24].changePairs,0);assert.ok(z.reasons.includes('MODEL_CHANGE_DIFFERENCE'));
});
test('conflicting revisions quarantine and fixed cohort hash is independent of order',()=>{
 const d=fixture(),a=evaluateParity(d);d.cycles.reverse();assert.equal(evaluateParity(d).cohortSha256,a.cohortSha256);
 d.rows.push({...d.rows[0],regularTempC:13});assert.equal(evaluateParity(d).quarantined,1);
 d.rows.reverse();assert.equal(evaluateParity(d).accepted,53);
});
