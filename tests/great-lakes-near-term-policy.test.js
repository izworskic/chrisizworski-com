'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {policies,compare}=require('../scripts/great-lakes-near-term-policy.cjs');
const M=60000,T=Date.parse('2024-09-04T00:00:00Z'),iso=t=>new Date(t).toISOString();
const track=Array.from({length:45},(_,i)=>[T+i*3*M,{seen:iso(T+i*3*M),lat:46.5,lon:-84.4,shipType:70}]);
const engine={RIVER_BBOX:[],inBox:()=>true,buildCandidate(v,now){assert.ok(Date.parse(v.seen)<=now);const lead=now===T?50:25;return {direction:'downbound',window:{start:iso(now+(lead-10)*M),midpoint:iso(now+lead*M),end:iso(now+(lead+10)*M)}};}};
test('nested policies use past-only observations and retain the early denominator',()=>{
 const {early,near}=policies(new Map([['v',track]]),T,T+1440*M,engine);
 assert.equal(early.issued.length,1);assert.equal(near.issued.length,1);assert.equal(near.issued[0].issuedAt,T+15*M);
 const truncated=policies(new Map([['v',track.slice(0,1)]]),T,T+1440*M,engine);
 assert.deepEqual(truncated.early.issued,early.issued);assert.equal(truncated.near.issued.length,0);
});
test('same crossing comparison and withheld opportunities are explicit',()=>{
 const tracks=new Map([['v',track]]),{early,near}=policies(tracks,T,T+1440*M,engine),crossings=new Map([['v',[{lo:T+48*M,hi:T+51*M,direction:'downbound'}]]]);
 const frozen={shiftMinutes:14,extraEarlyMinutes:6,extraLateMinutes:6,criteria:{missPenalty:4}};
 const q=compare(early.issued,near.issued,tracks,crossings,T+1440*M,frozen);
 assert.equal(q.matchedSameCrossing,1);assert.equal(q.paired.meanIssueDelayMinutes,15);assert.equal(q.paired.meanNearWarningLowerMinutes,33);
 const w=compare(early.issued,[],tracks,crossings,T+1440*M,frozen);assert.equal(w.counts.near_not_issued,1);assert.equal(w.baselineVesselDays,1);
});
