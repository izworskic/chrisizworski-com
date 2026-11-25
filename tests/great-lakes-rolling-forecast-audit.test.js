'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {lifecycle,analyze,aggregate}=require('../scripts/great-lakes-rolling-forecast-audit.cjs');
const M=60000,T=Date.parse('2024-09-04T00:00:00Z'),iso=t=>new Date(t).toISOString();
const p=(n,speedKnots=5,extra={})=>({seen:iso(T+n*M),lat:46.5,lon:-84.4,shipType:70,speedKnots,...extra});
const first={id:'v',issuedAt:T,observationTime:T,midpoint:T+45*M,start:T+35*M,end:T+55*M,direction:'downbound'};
const engine={RIVER_BBOX:[],inBox:()=>true,inChamber:v=>v.inChamber===true,buildCandidate(v,now){assert.ok(Date.parse(v.seen)<=now);return {direction:v.direction||'downbound',window:{start:iso(now+35*M),midpoint:iso(now+45*M),end:iso(now+55*M)}};}};
test('past-only lifecycle withdraws and resumes without retaining stale ETA',()=>{
 const track=[[T,p(0)],[T+15*M,p(15,.1)],[T+30*M,p(30)],[T+45*M,p(45,5,{direction:'upbound'})],[T+60*M,null],[T+75*M,p(75,5,{inChamber:true})]];
 const q=lifecycle(first,track,T+1440*M,engine);
 assert.deepEqual(q.map(x=>x.state),['forecast_available','low_reported_speed','forecast_available','direction_changed','invalid_or_conflicting','observed_in_chamber','stale_or_missing','stale_or_missing']);
 assert.equal(q[1].transition,'withdrawn');assert.equal(q[1].forecast,null);assert.equal(q[2].transition,'resumed');assert.equal(q[3].transition,'withdrawn');
 const short=lifecycle(first,track.slice(0,2),T+1440*M,engine);
 assert.deepEqual(short.slice(0,2),q.slice(0,2));
});
test('revision records absolute arrival-time changes, not countdown',()=>{
 const q=lifecycle(first,[[T,p(0)],[T+15*M,p(15)]],T+1440*M,engine);
 assert.equal(q[1].revision,15);assert.equal(q[2].revision,null);
 assert.throws(()=>lifecycle({...first,midpoint:T+46*M},[[T,p(0)]],T+1440*M,engine));
});
test('separate episode-weighted matched metrics and all-slot counts',()=>{
 const track=Array.from({length:43},(_,i)=>[T+3*i*M,p(3*i)]),q=lifecycle(first,track,T+1440*M,engine);
 const frozen={shiftMinutes:14,extraEarlyMinutes:6,extraLateMinutes:6,criteria:{missPenalty:4}};
 const a=analyze(first,q,track,[{lo:T+60*M,hi:T+62*M,direction:'downbound'}],T+1440*M,frozen);
 const b=analyze(first,q,track,[],T+1440*M,frozen);
 const s=aggregate([a,b]);assert.equal(s.episodes,2);assert.equal(s.slots,16);assert.equal(s.forecastAvailableSlots,16);assert.equal(s.matchedEpisodes,1);assert.equal(s.initialOutcomeCounts.no_detected_crossing_continuous,1);assert.equal(s.matchedUpdates,5);
 assert.equal(aggregate([]).episodeWeightedMatchedExistingContainment,null);
});
