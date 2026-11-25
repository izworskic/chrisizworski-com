'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {statusChange,changeText,decisionImpact,impactText}=require('../public/assets/cbbt-view.js');
const NOW=Date.parse('2026-11-24T20:00:00Z'),M=60000;
function snapshot(at,state='OPEN',restrictionLevel='NONE',freshness={state:'fresh',ageMs:0}){
 return {engine:{generatedAt:new Date(at).toISOString()},officialStatus:{state,restrictionLevel},freshness:{officialStatus:freshness}};
}
test('first check and unchanged refreshes do not announce changes',()=>{
 let p=statusChange(null,snapshot(NOW),NOW);
 assert.equal(p.event,null);
 p=statusChange(p,{...snapshot(NOW+M),weatherNow:{wind:{gustMph:100}},vehicleEligibility:{decision:'RESTRICTED'}},NOW+M);
 assert.equal(p.event,null);
});
test('reported restriction changes retain detection time and suppress duplicates',()=>{
 const a=statusChange(null,snapshot(NOW),NOW);
 const b=statusChange(a,snapshot(NOW+M,'OPEN_WITH_RESTRICTIONS','LEVEL_1'),NOW+M+500);
 assert.equal(b.event.kind,'reported-change');
 assert.equal(b.event.detectedAt,new Date(NOW+M+500).toISOString());
 assert.match(changeText(b.event),/open with Level 1/);
 const c=statusChange(b,snapshot(NOW+2*M,'OPEN_WITH_RESTRICTIONS','LEVEL_1'),NOW+2*M);
 assert.equal(c.event,b.event);
 assert.equal(statusChange(c,snapshot(NOW),NOW+2*M),c);
 const d=statusChange(c,snapshot(NOW+3*M,'CLOSED','LEVEL_3'),NOW+3*M);
 assert.match(changeText(d.event),/reports closed/);
 const e=statusChange(d,snapshot(NOW+4*M),NOW+4*M);
 assert.match(changeText(e.event),/now reports open/);
});
test('recovery is not an inferred reopening or reconstruction of the gap',()=>{
 const a=statusChange(null,snapshot(NOW,'CLOSED','LEVEL_3'),NOW);
 const b=statusChange(a,null,NOW+M);
 assert.equal(b.event.kind,'source-lost');
 assert.match(changeText(b.event),/not a report of a closure/);
 const c=statusChange(b,snapshot(NOW+2*M,'OFFICIAL_STATUS_CONFLICT','UNKNOWN'),NOW+2*M);
 assert.equal(c.event.kind,'source-conflict');
 const d=statusChange(c,snapshot(NOW+3*M),NOW+3*M);
 assert.equal(d.event.kind,'source-recovered');
 assert.match(changeText(d.event),/What happened during the gap is not known/);
 assert.doesNotMatch(changeText(d.event),/reopened/);
});
test('stale, missing or impossible clocks and restrictions cannot certify a change',()=>{
 const p=statusChange(null,snapshot(NOW),NOW);
 for(const invalid of [
  snapshot(NOW+M,'CLOSED','LEVEL_3',{state:'stale',ageMs:0}),
  snapshot(NOW+M,'CLOSED','LEVEL_3',{state:'fresh',ageMs:null}),
  snapshot(NOW+2*M,'CLOSED','LEVEL_3'),
  snapshot(NOW+M,'OPEN_WITH_RESTRICTIONS','UNKNOWN'),
  snapshot(NOW+M,'OPEN','LEVEL_2')
 ]){
  const b=statusChange(p,invalid,NOW+M);
  assert.equal(b.event.kind,'source-lost');
 }
 assert.equal(statusChange(p,snapshot(NOW),NOW+10*M+1).event.kind,'source-lost');
 assert.equal(statusChange(p,snapshot(NOW),NOW+10*M).event,null);
 assert.equal(statusChange(p,snapshot(NOW,'CLOSED','LEVEL_3'),NOW+M),p);
});
test('session note uses text only, is initially hidden and attached to the official status surface',()=>{
 const html=fs.readFileSync('public/chesapeake-bay-bridge-tunnel/index.html','utf8');
 const js=fs.readFileSync('public/assets/cbbt-live.js','utf8');
 assert.match(html,/id="statusChange"[^>]*aria-live="polite"[^>]*hidden/);
 assert.match(js,/CBBTView\.statusChange\(previous,snapshot,Date\.now\(\)\)/);
 assert.match(js,/renderApiFailure\(configuration\)\{renderStatusChange\(null\)/);
 assert.match(js,/exact change time unknown/);
 assert.doesNotMatch(js,/localStorage|sessionStorage/);
});

const {vehicleEligibility}=require('../lib/cbbt/core.js');
function evaluated(at,state,level,vehicle){
 const s=snapshot(at,state,level);
 s.vehicleEligibility=vehicleEligibility(s.officialStatus,vehicle);
 return s;
}
test('same official change has different impact on a car and a motorcycle',()=>{
 for(const [type,expected] of [['car','eligibility-unchanged'],['motorcycle','eligibility-changed']]){
  const v={vehicleType:type};
  const a=decisionImpact(null,evaluated(NOW,'OPEN','NONE',v),type,NOW);
  assert.equal(a.decision,'ALLOWED');
  assert.equal(a.event,null);
  const b=decisionImpact(a,evaluated(NOW+M,'OPEN_WITH_RESTRICTIONS','LEVEL_1',v),type,NOW+M);
  assert.equal(b.event.kind,expected);
  assert.equal(b.decision,type==='car'?'ALLOWED':'RESTRICTED');
  assert.match(impactText(b.event),type==='car'?/unchanged/:/now restricted/);
  const c=decisionImpact(b,evaluated(NOW+2*M,'OPEN_WITH_RESTRICTIONS','LEVEL_1',v),type,NOW+2*M);
  assert.equal(c.event,b.event);
 }
});
test('changed vehicle inputs reset baseline and loss of evidence never grants permission',()=>{
 const car={vehicleType:'car'},bike={vehicleType:'motorcycle'};
 const a=decisionImpact(null,evaluated(NOW,'OPEN_WITH_RESTRICTIONS','LEVEL_1',car),'car',NOW);
 const b=decisionImpact(a,evaluated(NOW+M,'OPEN_WITH_RESTRICTIONS','LEVEL_1',bike),'motorcycle',NOW+M);
 assert.equal(b.event,null);
 assert.equal(b.decision,'RESTRICTED');
 const c=decisionImpact(b,null,'motorcycle',NOW+2*M);
 assert.equal(c.event.kind,'confirmation-lost');
 assert.equal(c.decision,'UNKNOWN');
 const d=decisionImpact(c,evaluated(NOW+3*M,'OPEN','NONE',bike),'motorcycle',NOW+3*M);
 assert.equal(d.event.kind,'confirmation-restored');
 assert.doesNotMatch(impactText(d.event),/now allowed/);
});
test('unchanged status with revised backend result is not an operating transition',()=>{
 const a=evaluated(NOW,'OPEN','NONE',{vehicleType:'car'});
 const p=decisionImpact(null,a,'car',NOW);
 const b=evaluated(NOW+M,'OPEN','NONE',{vehicleType:'car'});
 b.vehicleEligibility={decision:'UNKNOWN',reason:'MANUAL_REVIEW_REQUIRED_FOR_SPECIAL_VEHICLE'};
 const q=decisionImpact(p,b,'car',NOW+M);
 assert.equal(q.event.kind,'result-revised');
 assert.equal(q.decision,'UNKNOWN');
 assert.equal(decisionImpact(q,a,'car',NOW+M),q);
});
