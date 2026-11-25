'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluate,DATES,CONFIRM_DATES,STATIONS}=require('../scripts/shorefeel-forecast-reliability.cjs');
function fixture(dates=DATES){
 const cycles=dates.map(day=>({pairs:STATIONS.flatMap(station=>[24,48].map(leadHours=>({station,cycleAt:day+'T00:00:00+00:00',leadHours,reason:'missing observation'})))}));
 const cohort=cycles.flatMap(c=>c.pairs.map(({station,cycleAt,leadHours})=>({station,cycleAt,leadHours})));
 return {status:'FROZEN_WARM_SEASON_RELIABILITY_REVIEW_ONLY',canPromoteModel:false,cycles,cohort};
}
test('fixed candidates share identical observed rows, no missing-as-zero',()=>{
 const d=fixture(),p=d.cycles[0].pairs[0];delete p.reason;
 Object.assign(p,{baselineC:20,actualC:20,modelBaseC:20,modelValidC:18,modelChangeErrorF:-3.6,persistenceErrorF:0});
 const a=evaluate(d);assert.equal(a.canPromoteModel,false);
 assert.equal(a.leads[24].expected,80);assert.equal(a.leads[24].matched,1);
 assert.equal(a.leads[24].methods.persistence.maeF,0);
 assert.equal(a.leads[24].methods.conservative.maeF,.9);
 assert.equal(a.leads[24].methods.equalBlend.maeF,1.8);
 assert.equal(a.leads[24].methods.original.maeF,3.6);
 assert.equal(a.leads[48].methods.original.maeF,null);
});
test('reject modified cohort, repeated slots, mismatched arithmetic and promoted data',()=>{
 const a=fixture();a.cycles[0].pairs.pop();assert.throws(()=>evaluate(a),/Incomplete/);
 const b=fixture();b.cycles[0].pairs.push(b.cycles[0].pairs[0]);assert.throws(()=>evaluate(b),/duplicate/);
 const c=fixture();c.canPromoteModel=true;assert.throws(()=>evaluate(c),/Wrong/);
 const d=fixture();const p=d.cycles[0].pairs[0];delete p.reason;Object.assign(p,{baselineC:20,actualC:20,modelBaseC:20,modelValidC:18,modelChangeErrorF:0,persistenceErrorF:0});assert.throws(()=>evaluate(d),/Inconsistent/);
});

test('confirmation freezes horizon-specific candidates and fails missing coverage',()=>{
 const d=fixture(CONFIRM_DATES);d.status='FROZEN_HORIZON_RELIABILITY_CONFIRMATION_ONLY';
 const r=evaluate(d);assert.equal(r.leads[24].expected,100);assert.equal(r.leads[48].expected,100);
 assert.equal(r.leads[24].confirmation.weight,.25);assert.equal(r.leads[48].confirmation.weight,1);
 assert.equal(r.leads[24].confirmation.passesResearchGates,false);assert.equal(r.leads[48].confirmation.passesResearchGates,false);
 assert.equal(r.canPromoteModel,false);
});
test('preserved eight-date review reproduces from exact source bytes',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
 const raw=fs.readFileSync(path.join(__dirname,'../data/shorefeel/reliability-cohort-actual-20261125.json'));
 const archived=require('../data/shorefeel/reliability-review-actual-20261125.json');
 const actual={...evaluate(JSON.parse(raw)),sourceSha256:crypto.createHash('sha256').update(raw).digest('hex')};
 assert.deepEqual(actual,archived);
});

test('preserved ten-date confirmation reproduces exactly and remains blocked by exact coverage',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
 const raw=fs.readFileSync(path.join(__dirname,'../data/shorefeel/horizon-confirm-cohort-actual-20261125.json'));
 const archived=require('../data/shorefeel/horizon-confirm-review-actual-20261125.json');
 const actual={...evaluate(JSON.parse(raw)),sourceSha256:crypto.createHash('sha256').update(raw).digest('hex')};
 assert.deepEqual(actual,archived);
 for(const [h,matched] of [[24,72],[48,69]]){
  const lead=actual.leads[h];assert.equal(lead.expected,100);assert.equal(lead.matched,matched);
  assert.equal(lead.confirmation.gates.exactCoverage,false);
  for(const gate of ['allTenBlocks','maeBeatsPersistence','maeNoWorseThanOriginal','p90NoWorseThanBoth'])assert.equal(lead.confirmation.gates[gate],true);
  assert.equal(lead.confirmation.passesResearchGates,false);
 }
 assert.equal(actual.canPromoteModel,false);
});
test('recovered near-time rows do not turn into exact matches or authorization',()=>{
 const d=require('../data/shorefeel/reliability-near-time-actual-20261125.json');
 const review=require('../data/shorefeel/reliability-review-actual-20261125.json');
 assert.equal(d.sourceDatasetSha256,review.sourceSha256);
 assert.equal(d.originalCohortSha256,review.cohortSha256);
 assert.equal(d.maximumOffsetMinutes,15);assert.equal(d.canPromoteModel,false);
 for(const [h,n] of [[24,54],[48,51]]){
  const m=d.metrics[h];assert.equal(m.originalExact,n);assert.equal(m.newNearTime,16);
  assert.equal(m.originalExact+m.newNearTime+m.remainingMissing,m.expected);
  assert.equal(m.originalExact,review.leads[h].matched);
 }
});
