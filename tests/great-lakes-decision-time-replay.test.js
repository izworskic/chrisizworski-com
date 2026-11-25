'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {issueForecasts,continuous,resolve,summarize}=require('../scripts/great-lakes-decision-time-replay.cjs');
const M=60000,T=Date.parse('2024-09-04T00:00:00Z'),iso=t=>new Date(t).toISOString(),p=t=>({seen:iso(t),lat:46.5,lon:-84.4,shipType:70});
const track=Array.from({length:43},(_,i)=>[T+i*3*M,p(T+i*3*M)]);
const engine={RIVER_BBOX:[],inBox:()=>true,buildCandidate(v,now){assert.ok(Date.parse(v.seen)<=now);return {direction:'downbound',window:{start:iso(now+20*M),midpoint:iso(now+30*M),end:iso(now+40*M)}};}};
test('fixed grid chooses first qualifying issue with no outcome input or future fix',()=>{
 const a=issueForecasts(new Map([['v',track]]),T,T+1440*M,engine);
 const b=issueForecasts(new Map([['v',track.slice(0,1)]]),T,T+1440*M,engine);
 assert.deepEqual(a.issued,b.issued);assert.equal(a.issued.length,1);assert.equal(a.issued[0].issuedAt,T);
 const c=issueForecasts(new Map([['v',[[T+M,p(T+M)]]]]),T,T+1440*M,engine);assert.equal(c.issued.length,0);
});
test('unmatched, incomplete, opposing, ambiguous and censored outcomes kept distinct',()=>{
 const issue=issueForecasts(new Map([['v',track]]),T,T+1440*M,engine).issued[0],end=T+1440*M,c={lo:T+30*M,hi:T+33*M,direction:'downbound'};
 assert.equal(resolve(issue,track,[c],end).status,'matched');
 assert.equal(resolve(issue,track,[],end).status,'no_detected_crossing_continuous');
 assert.equal(resolve(issue,track.slice(0,4),[],end).status,'no_detected_crossing_incomplete');
 assert.equal(resolve(issue,track,[{...c,direction:'upbound'}],end).status,'opposite_direction');
 assert.equal(resolve(issue,track,[c,{...c,lo:T+60*M,hi:T+63*M}],end).status,'ambiguous_multiple_crossings');
 assert.equal(resolve(issue,track,[{...c,lo:T-M}],end).status,'boundary_bracket');
 assert.equal(resolve(issue,track,[c],T+120*M).status,'day_end_censored');
 assert.equal(resolve(issue,track.filter(([t])=>t!==T+15*M),[c],end).status,'discontinuous_observation');
 assert.equal(continuous(track,T,T+120*M),true);
});
test('uncertain all-issued bounds retain unresolved forecasts in denominator',()=>{
 const d={kind:'DEVELOPMENT_DECISION_TIME_PROXY_REPLAY',date:'2024-09-04',productionCalibrationAuthorized:false,issued:5,matched:2,unresolved:3,counts:{matched:2,no_detected_crossing_incomplete:3},oldContained:1,nextContained:2,oldWidthSum:40,nextWidthSum:64,maeDeltaLowerSum:-10,maeDeltaUpperSum:-2,lossDeltaLowerSum:-12,lossDeltaUpperSum:2};
 const s=summarize([d]);assert.equal(s.issued,5);assert.equal(s.matchedOnly.existingContainment,.5);assert.deepEqual(s.allIssuedContainmentIdentificationBounds,{existing:[.2,.8],challenger:[.4,1]});assert.equal(s.pendingDates.length,2);
 assert.throws(()=>summarize([d,d]));assert.throws(()=>summarize([{...d,unresolved:0}]));
});
