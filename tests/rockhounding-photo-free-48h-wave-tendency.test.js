'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {rollingWaveTendency}=require('../lib/rockhounding/rolling-offshore-wave-tendency.cjs');
const now='2026-10-16T12:00:00Z',MS=3600000;
function row(ago,h=.5,dir=337,period=4){
 return {time:new Date(Date.parse(now)-ago*MS).toISOString().replace('.000Z','Z'),
  waveHeightM:h,waveFromDeg:dir,meanPeriodS:period,
  lat:46.695671,lon:-86.003799,
  source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',phase:'OBSERVATION'};
}
const series=fn=>Array.from({length:97},(_,i)=>row(48-i*.5,fn(48-i*.5)));
test('measured offshore wave activity compares 24h against prior 24h, not photo evidence or stone probability',()=>{
 const x=rollingWaveTendency(series(ago=>ago>24?1.5:.5),{nowISO:now,hazardStatus:'ACTIVE'});
 assert.equal(x.status,'OBSERVED_WAVE_ACTIVITY_LOWER_VS_PRIOR_24H');
 assert.ok(x.changePercentVsPrior24h<-80);
 assert.equal(x.current24hActivity< x.previous24hActivity,true);
 assert.deepEqual(x.comparedWindowCoveragePct,[100,100]);
 assert.equal(x.directionFacingSharePct,100);
 assert.equal(x.observedPast48h.sampleCount,97);
 assert.equal(x.hazardInterpretation,'ACTIVE_NWS_ALERT_VETO_ON_VISIT_GUIDANCE');
 assert.equal(x.photosRequired,false);
 assert.equal(x.physicalWavePowerKWPerM,null);
 assert.equal(x.probabilityFreshAgates,null);
 assert.equal(x.canForecastNewStones,false);
 assert.equal(x.canPublishVisitWindow,false);
 assert.equal(x.canClaimBeachSafe,false);
});
test('same live sensor shows renewed offshore activity, but not agate finds or beach safety',()=>{
 const x=rollingWaveTendency(series(ago=>ago>24?.5:1.6),{nowISO:now,hazardStatus:'CLEAR'});
 assert.equal(x.status,'OBSERVED_WAVE_ACTIVITY_HIGHER_VS_PRIOR_24H');
 assert.ok(x.changePercentVsPrior24h>600);
 assert.equal(x.hazardInterpretation,'NO_MATCHED_NWS_ALERT_NOT_A_SAFETY_CLEARANCE');
 assert.equal(x.canClaimBeachSafe,false);
});
test('roughly identical observed 24h blocks report stable relative activity',()=>{
 const x=rollingWaveTendency(series(()=>1),{nowISO:now});
 assert.equal(x.status,'OBSERVED_WAVE_ACTIVITY_SIMILAR_VS_PRIOR_24H');
 assert.equal(x.changePercentVsPrior24h,0);
 assert.equal(x.canClaimBeachSafe,false);
});
test('single blank or stale GLOS source does not give a false calm-water tendency',()=>{
 const missing=rollingWaveTendency([],{nowISO:now});
 assert.equal(missing.status,'NO_SOURCE_OBSERVATIONS');
 assert.equal(missing.current24hActivity,null);
 const stale=rollingWaveTendency(series(()=>.5),{nowISO:'2026-10-17T12:00:00Z'});
 assert.equal(stale.status,'SOURCE_STALE');
 assert.equal(stale.changePercentVsPrior24h,null);
 assert.equal(stale.canClaimBeachSafe,false);
});
test('bad source coverage refuses to bridge more than 90 minutes and suppresses the comparison',()=>{
 const rows=series(()=>1.3).filter(r=>{
  const ago=(Date.parse(now)-Date.parse(r.time))/MS;
  return ago<12||ago>17;
 });
 const s=rollingWaveTendency(rows,{nowISO:now});
 assert.equal(s.status,'SOURCE_GAPPY_NO_48H_COMPARISON');
 assert.equal(s.changePercentVsPrior24h,null);
 assert.equal(s.directionFacingSharePct,null);
 const subset=rollingWaveTendency(series(()=>.3).filter(r=>Date.parse(r.time)>=Date.parse(now)-12*MS),{nowISO:now});
 assert.equal(subset.status,'SOURCE_GAPPY_NO_48H_COMPARISON');
});
test('out-of-order duplicate conflicts, future rows, wrong station and wrong alert status fail closed',()=>{
 const a=series(()=>.8);
 assert.throws(()=>rollingWaveTendency([a[0],{...a[0],waveHeightM:2}],{nowISO:now}),/Conflicting/);
 assert.throws(()=>rollingWaveTendency([row(-4)],{nowISO:now}),/Future/);
 assert.throws(()=>rollingWaveTendency([{...row(0),source:'OTHER_BUOY'}],{nowISO:now}),/Source-invalid/);
 assert.throws(()=>rollingWaveTendency([],{nowISO:now,hazardStatus:'SAFE'}),/Invalid/);
});
