'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {analyzeObserved}=require('../lib/rockhounding/live-photo-free-pulse.cjs');
const {currentPulse}=require('../api/rockhounding-wave-pulse.js')._test;
const T=Date.parse('2026-10-16T12:00:00Z'),H=3600000;
function row(ago,h=0.5,dir=328){
 return {time:new Date(T-ago*H).toISOString().replace('.000Z','Z'),
  waveHeightM:h,waveFromDeg:dir,meanPeriodS:4.2,
  lat:46.695671,lon:-86.003799,
  source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',phase:'OBSERVATION'};
}
function series(fn,n=48){return Array.from({length:n},(_,i)=>row((n-1-i)/2,fn((n-1-i)/2)))}
const now='2026-10-16T12:00:00Z';
test('offshore wave easing requires ongoing recent measured coverage; photos never required',()=>{
 const rows=series(ago=>ago>=9&&ago<=11?2:ago<6?.48:1.2);
 const r=analyzeObserved(rows,{nowISO:now,hazardStatus:'CLEAR'});
 assert.equal(r.status,'OFFSHORE_WAVES_EASING');
 assert.equal(r.photosRequired,false);
 assert.equal(r.peakLast48hM,2);
 assert.equal(r.latestOffshoreSignificantWaveHeightM,.48);
 assert.equal(r.canPredictNewAgates,false);
 assert.equal(r.canPublishSafeVisitWindow,false);
 assert.equal(r.canClaimBeachSafety,false);
 assert.equal(r.rockExposureScore,null);
 assert.equal(r.hazardStatus,'CLEAR');
 assert.match(r.hazardCaveat,/NOT a shoreline safety clearance/);
});
test('waves rebuilt after lower interval are not mislabeled easing',()=>{
 const r=analyzeObserved(series(ago=>ago>=12&&ago<=14?2:ago>=5&&ago<=9?.4:ago<4?1.3:.8),{nowISO:now,hazardStatus:'UNKNOWN'});
 assert.equal(r.status,'OFFSHORE_WAVES_REBUILDING');
 assert.equal(r.waveRebuildDetected,true);
 assert.equal(r.canClaimBeachSafety,false);
 assert.equal(r.hazardStatus,'UNKNOWN');
});
test('current elevated offshore observations do not imply beach rock exposure',()=>{
 const r=analyzeObserved(series(()=>1.35),{nowISO:now,hazardStatus:'ACTIVE'});
 assert.equal(r.status,'OFFSHORE_WAVES_ELEVATED');
 assert.match(r.hazardCaveat,/warning\/advisory active/);
 assert.equal(r.measuredBreakingSurfM,null);
 assert.equal(r.canInferBayshoreSurf,false);
});
test('low offshore source values NEVER cause a safe shoreline conclusion',()=>{
 const r=analyzeObserved(series(()=>.2),{nowISO:now,hazardStatus:'CLEAR'});
 assert.equal(r.status,'LOWER_OFFSHORE_WAVE_ACTIVITY');
 assert.equal(r.canClaimBeachSafety,false);
 assert.equal(r.canPredictNewAgates,false);
});
test('sensor stale, source empty, large missing gaps and timestamp conflicts fail closed',()=>{
 const stale=analyzeObserved(series(()=>.2).map(r=>({...r,time:new Date(Date.parse(r.time)-36*H).toISOString().replace('.000Z','Z')})),{nowISO:now,hazardStatus:'CLEAR'});
 assert.equal(stale.status,'OFFSHORE_SENSOR_STALE');
 const empty=analyzeObserved([],{nowISO:now,hazardStatus:'UNKNOWN'});
 assert.equal(empty.status,'NO_OFFSHORE_SOURCE_OBSERVATIONS');
 const sparse=analyzeObserved([row(10,2),row(8,1),row(3,.5),row(0,.2)],{nowISO:now});
 assert.equal(sparse.status,'OFFSHORE_OBSERVATIONS_GAPPY');
 assert.throws(()=>analyzeObserved([row(0,.3),row(0,.8)],{nowISO:now}),/Conflicting/);
 assert.throws(()=>analyzeObserved([row(-4)],{nowISO:now}),/Future/);
 assert.throws(()=>analyzeObserved([], {nowISO:now,hazardStatus:'safe'}),/alert/);
});
test('API calls only source-constrained original GLOS wave fields and three official NWS alert URLs',async()=>{
 const fields=['time','longitude','latitude','sea_surface_wave_significant_height','sea_surface_wave_from_direction','sea_surface_wave_mean_period'];
 const table=[
  fields.join(','),
  'UTC,degrees_east,degrees_north,m,degree,s',
  ...series(ago=>ago<3?.6:ago<10?1.4:.45).map(x=>
   [x.time,x.lon,x.lat,x.waveHeightM,x.waveFromDeg,x.meanPeriodS].join(','))
 ].join('\n');
 const urls=[];
 const f=async url=>{
  urls.push(url);
  if(url.startsWith('https://seagull-erddap.glos.org/erddap/tabledap/obs_140.csv'))
   return {ok:true,text:async()=>table,headers:{get:()=>null}};
  if(url.startsWith('https://api.weather.gov/alerts/active?'))
   return {ok:true,json:async()=>({features:[]})};
  throw Error('Unexpected provider URL '+url);
 };
 const result=await currentPulse({nowISO:now,fetchFn:f});
 assert.equal(urls.length,4);
 assert.equal(urls.filter(x=>x.startsWith('https://api.weather.gov/')).length,3);
 assert.equal(result.status,'OFFSHORE_WAVES_EASING');
 assert.equal(result.hazardStatus,'CLEAR');
 assert.equal(result.dataSourceAvailable,true);
 assert.equal(result.provenance,'NO_PHOTOS_USED');
 assert.equal(result.canClaimBeachSafety,false);
 assert.equal(result.canPredictNewAgates,false);
 assert.equal(result.latest48hObservedSeries.length,48);
});
test('GLOS provider outage and NWS failures are reported independently with unknown alert status',async()=>{
 const r=await currentPulse({nowISO:now,fetchFn:async()=>{throw Error('offline')}});
 assert.equal(r.status,'OFFSHORE_SOURCE_UNAVAILABLE');
 assert.equal(r.hazardStatus,'UNKNOWN');
 assert.equal(r.sourceFresh,false);
 assert.equal(r.rockExposureScore,null);
 assert.equal(r.canPublishSafeVisitWindow,false);
});
test('NWS active marine warning veto does not rewrite actual measured wave status',async()=>{
 const tab=[
  'time,longitude,latitude,sea_surface_wave_significant_height,sea_surface_wave_from_direction,sea_surface_wave_mean_period',
  'UTC,degrees_east,degrees_north,m,degree,s',
  ...series(()=>1.1).map(x=>[x.time,x.lon,x.lat,x.waveHeightM,x.waveFromDeg,x.meanPeriodS].join(','))
 ].join('\n');
 const fetchFn=async url=>url.startsWith('https://seagull-')?
  {ok:true,text:async()=>tab,headers:{get:()=>null}}:
  {ok:true,json:async()=>({features:[{properties:{event:'Gale Warning',severity:'Severe',ends:'2026-10-17T12:00:00Z'}}]})};
 const r=await currentPulse({nowISO:now,fetchFn});
 assert.equal(r.status,'OFFSHORE_WAVES_ELEVATED');
 assert.equal(r.hazardStatus,'ACTIVE');
 assert.ok(r.matchedNWSAlerts.some(x=>x.event==='Gale Warning'));
 assert.equal(r.canClaimBeachSafety,false);
});
