'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {band,replay,summarize,evaluate}=require('../scripts/soo-continuous-approach.cjs');
const date='2025-06-15',start=Date.parse(date+'T12:00:00Z'),M=60000;
const row=(min,lon,speed=8)=>({seen:new Date(start+min*M).toISOString(),lat:46.5,lon,speedKnots:speed,course:90,shipType:70,lengthMeters:230});
const engine={LOCK_POINT:[46.5,-84.35],LOCKS:{a:{lat:[46.49,46.51],lon:[-84.351,-84.349]}},ROUTES:{upper:'upper',lowerUpbound:'up',lowerDownbound:'down'},RIVER_BBOX:[],inBox:()=>true,inChamber:()=>false,
 project:(_route,p)=>({alongNm:Math.abs(p[1]+84.35)*100,lateralNm:0}),
 buildCandidate:(v,t)=>({direction:'downbound',confidence:.8,channelNmToLocks:Math.round(Math.abs(v.lon+84.35)*100),window:{start:new Date(t+40*M).toISOString(),midpoint:new Date(t+60*M).toISOString(),end:new Date(t+80*M).toISOString()}})};
const first={date,issuedAt:new Date(start).toISOString(),direction:'downbound',existingMinutes:60,outcome:{state:'OBSERVED_CHAMBER_REFERENCE_BRACKET',previousOutsideAt:new Date(start+23*M).toISOString(),firstInsideAt:new Date(start+24*M).toISOString()}};
test('distance bands partition valid distance without rounding twice',()=>{
 assert.deepEqual([15,10,5,3,1,0,16,-1,NaN].map(band),['10_to_15','5_to_10','3_to_5','1_to_3','0_to_1','0_to_1',null,null,null]);
});
test('fixed five-minute grid, no future leakage, withdrawal and closure from observed fixes only',()=>{
 const rows=[row(0,-84.47),row(5,-84.43),row(20,-84.39),row(23,-84.36),row(24,-84.35)];
 const slots=replay(first,rows,engine),prefix=replay({...first,outcome:{state:'NO_QUALIFYING_CHAMBER_OBSERVATION'}},rows.slice(0,2),engine);
 assert.equal(slots.length,96);assert.deepEqual(slots.slice(0,4),prefix.slice(0,4));
 assert.equal(slots[0].band,'10_to_15');assert.equal(slots[1].band,'5_to_10');
 assert.equal(slots[3].state,'stale_or_missing');assert.equal(slots[3].transition,'withdrawn');
 assert.equal(slots[4].band,'3_to_5');assert.equal(slots[4].transition,'resumed');
 assert.equal(slots[5].state,'after_observed_chamber');assert.equal(slots[5].f,null);
 const summary=summarize([{first,slots}],s=>s.band==='3_to_5');
 assert.equal(summary.matchedEpisodes,1);assert.equal(summary.matchedUpdates,1);
 assert.equal(summary.episodeWeightedWarning,3);
});
test('episode weights are equal despite unequal numbers of updates',()=>{
 const s=(t,minutes)=>({t,band:'1_to_3',state:'forecast_available',motion:'supported',f:{midpoint:start+23.5*M+minutes*M,lo:start+20*M,hi:start+25*M,naive:start+23.5*M}});
 const a={first,slots:[s(start,10),s(start+M,10),s(start+2*M,10)]},b={first,slots:[s(start,30)]};
 const z=summarize([a,b],()=>true);
 assert.equal(z.matchedUpdates,4);assert.equal(z.matchedEpisodes,2);assert.equal(z.episodeWeightedMAE,20);
 assert.equal(z.episodeWeightedContainment,1);
});
test('fresh or partial date cohorts cannot enter development evaluation',()=>{
 assert.throws(()=>evaluate([{date:'2025-10-22'}]),/original spent dates/);
});
