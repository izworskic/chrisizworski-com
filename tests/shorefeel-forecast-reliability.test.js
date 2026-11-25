'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluate,DATES,STATIONS}=require('../scripts/shorefeel-forecast-reliability.cjs');
function fixture(){
 const cycles=DATES.map(day=>({pairs:STATIONS.flatMap(station=>[24,48].map(leadHours=>({station,cycleAt:day+'T00:00:00+00:00',leadHours,reason:'missing observation'})))}));
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
