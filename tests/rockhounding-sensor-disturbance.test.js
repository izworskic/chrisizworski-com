'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {blankLedger}=require('../lib/rockhounding/glos-spotter-event-ledger.cjs');
const {weightedWindow,analyzeSensorDisturbance,pct,proxy}=require('../lib/rockhounding/sensor-disturbance.cjs');
const H=3600000,nowISO='2026-10-16T10:00:00.000Z',now=Date.parse(nowISO);
function row(t,height=.45,dir=329,period=4.5){
 return {time:new Date(t).toISOString().replace('.000Z','Z'),
  waveHeightM:height,waveFromDeg:dir,meanPeriodS:period,
  source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',phase:'OBSERVATION',
  lat:46.695671,lon:-86.003799};
}
function data({stormEndH=28,stormStartH=45,gapLast24=false,removeLatest=false}={}){
 const rows=[];
 for(let h=360;h>=0;h--){
  if(gapLast24&&h>=5&&h<=16)continue;
  if(removeLatest&&h<7)continue;
  const height=h>=stormEndH&&h<=stormStartH?2.1:.45;
  rows.push(row(now-h*H,height));
 }
 const ledger=blankLedger(nowISO);ledger.records=rows;return ledger;
}
test('Hs² mean-period proxy has explicit dimensionless comparison semantics, not absolute beach wave power',()=>{
 const r=row(now,2,329,5);
 assert.equal(proxy(r),20);
 assert.equal(pct([1,2,3,4,5],.9),4.6);
 const v=weightedWindow([row(now-2*H,2),row(now-H,1),row(now,.5)],now-2*H,now);
 assert.equal(v.observedHours,2);
 assert.equal(v.coverageFraction,1);
 assert.equal(v.observedElevatedHours,1);
 assert.ok(v.integratedProxyM2SecHours>0);
 assert.equal(v.maxGapHours,1);
});
test('actual measured 2.1 m event followed by 28h lower valid sensor readings can report OFFSHORE decline only',()=>{
 const r=analyzeSensorDisturbance(data(),{nowISO,hazardSnapshot:{
   status:'CLEAR',checkedAtUTC:nowISO}});
 assert.equal(r.status,'OFFSHORE_HEIGHT_DECLINED_AFTER_MEASURED_EPISODE');
 assert.equal(r.source,'GLOS_SPOT1361_OBS_140_MEASURED_OFFSHORE');
 assert.equal(r.recent72hQualifiedOffshoreEpisodes,1);
 assert.equal(r.mostRecentStrongOffshoreEpisode.peakHeightM,2.1);
 assert.ok(r.recent24h.coverageFraction>=.75);
 assert.equal(r.latestHeightM,.45);
 assert.equal(r.historical2014ChartWaveFromDifferenceDeg,7.74);
 assert.equal(r.proxyIsPhysicalWavePowerWattsPerMeter,false);
 assert.equal(r.proxyIsLocalSedimentTransportModel,false);
 assert.equal(r.newGravelOrAgatesObserved,false);
 assert.equal(r.canPredictFreshAgates,false);
 assert.equal(r.canPublishVisitWindow,false);
 assert.equal(r.canClaimSafeShore,false);
 assert.match(r.alertSnapshot.meaning,/NOT a shoreline safety clearance/);
});
test('active warnings override otherwise declining offshore research phase',()=>{
 const r=analyzeSensorDisturbance(data(),{nowISO,hazardSnapshot:{status:'ACTIVE',checkedAtUTC:nowISO}});
 assert.equal(r.status,'ACTIVE_NWS_ALERT_WITH_OFFSHORE_MEASUREMENTS');
 assert.equal(r.alertSnapshot.status,'ACTIVE');
 assert.equal(r.canClaimSafeShore,false);
 assert.equal(r.canPublishVisitWindow,false);
});
test('gappy time series, stale data and no rows cannot become calm/settled access verdicts',()=>{
 const g=analyzeSensorDisturbance(data({gapLast24:true}),{nowISO});
 assert.equal(g.status,'INSUFFICIENT_CONTINUOUS_24H_SOURCE_COVERAGE');
 const s=analyzeSensorDisturbance(data({removeLatest:true}),{nowISO});
 assert.equal(s.status,'STALE_OR_FUTURE_SOURCE_OBSERVATIONS');
 const empty=blankLedger(nowISO);
 const z=analyzeSensorDisturbance(empty,{nowISO});
 assert.equal(z.status,'NO_SOURCE_OBSERVATIONS');
 assert.equal(z.latestHeightM,null);
 assert.equal(z.recent24h.observedHours,0);
 for(const v of [g,s,z]){
  assert.equal(v.canPublishVisitWindow,false);
  assert.equal(v.canPredictFreshAgates,false);
  assert.equal(v.canClaimSafeShore,false);
 }
});
test('no recent qualified offshore event means no outcome or safe conditions are inferred',()=>{
 const r=analyzeSensorDisturbance(data({stormStartH:150,stormEndH:125}),{nowISO});
 assert.equal(r.status,'NO_QUALIFIED_OFFSHORE_EPISODE_IN_PAST_72H');
 assert.equal(r.recent72hQualifiedOffshoreEpisodes,0);
 assert.equal(r.canClaimSafeShore,false);
 assert.equal(r.newGravelOrAgatesObserved,false);
});
test('Bayshore protected harbor explicitly cannot inherit Agate offshore wave proxy as surf',()=>{
 const r=analyzeSensorDisturbance(data(),{nowISO,siteId:'grand-marais-harbor'});
 assert.equal(r.status,'HARBOR_BREAKWATER_TRANSMISSION_NOT_MODELED');
 assert.equal(r.historical2014ChartWaveFromDifferenceDeg,null);
 assert.equal(r.canInferHarborBreakingWaves,false);
 assert.equal(r.canClaimSafeShore,false);
});
test('wrong buoy, forecast, dangerous tampering and future records fail closed',()=>{
 const l=data();
 for(const change of [
   x=>{x.stationId='45004'},
   x=>{x.records[0].phase='FORECAST'},
   x=>{x.records[0].source='NOAA_model'},
   x=>{x.records[0].waveHeightM=-1},
   x=>{x.canPublishVisitWindow=true},
   x=>{x.records.at(-1).time='2026-10-18T00:00:00Z'}
 ]){
  const copy=structuredClone(l);change(copy);
  assert.throws(()=>analyzeSensorDisturbance(copy,{nowISO}));
 }
 assert.throws(()=>analyzeSensorDisturbance(l,{nowISO,siteId:'lake-erie'}),/Unsupported/);
});
