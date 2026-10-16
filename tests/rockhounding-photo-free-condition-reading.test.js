'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {conditionReading,DENIAL}=require('../lib/rockhounding/photo-free-condition-reading.cjs');
const {currentPulse}=require('../api/rockhounding-wave-pulse.js')._test;
const nowISO='2026-10-16T12:00:00Z',latest='2026-10-16T11:30:00Z';
function pulse(overrides={}){
 return {
  schemaVersion:'rockhounding-photo-free-live-offshore-pulse-v1',
  stationId:'SPOT-1361',photosRequired:false,rockExposureScore:null,
  canPredictNewAgates:false,canClaimBeachSafety:false,canPublishSafeVisitWindow:false,
  hazardStatus:'CLEAR',sourceFresh:true,recentMeasurementCoverageSufficient:true,
  latestMeasuredAtUTC:latest,status:'OFFSHORE_WAVES_EASING',
  latestOffshoreSignificantWaveHeightM:.55,peakLast48hM:2.1,
  waveTendency48h:{
   schemaVersion:'rockhounding-photo-free-48h-wave-tendency-v1',
   source:'ORIGINAL_GLOS_SPOT1361_OFFSHORE_OBSERVATIONS',
   latestObservedUTC:latest,photosRequired:false,
   canForecastNewStones:false,canClaimBeachSafe:false,canPublishVisitWindow:false,
   status:'OBSERVED_WAVE_ACTIVITY_LOWER_VS_PRIOR_24H',
   changePercentVsPrior24h:-57.1,comparedWindowCoveragePct:[99,98]
  },
  lakeSuperiorLevelContext:{
   schemaVersion:'rockhounding-remote-lake-level-context-v1',
   stationId:'9099018',levelDatum:'IGLD 1985',
   status:'REMOTE_LAKE_LEVEL_OBSERVED_24H_CHANGE',
   measuredAtAgateBeach:false,canPredictNewAgates:false,
   canClaimBeachSafety:false,canPublishVisitWindow:false,
   gaugeWaterLevelM:183.42,delta24hCm:-4.2
  },
  ...overrides
 };
}
test('photo-free, source-covered easing is a measured OFFSHORE description, not an agate window',()=>{
 const v=conditionReading(pulse(),{nowISO});
 assert.equal(v.state,'OBSERVED_OFFSHORE_POST_PEAK_EASING');
 assert.equal(v.offshoreWaveHeightM,.55);
 assert.equal(v.last48hOffshorePeakM,2.1);
 assert.equal(v.comparedObservedOffshoreWaveActivityPct,-57.1);
 assert.equal(v.remoteLevel24hChangeCm,-4.2);
 assert.equal(v.remoteGaugeCannotEstablishLocalExposure,true);
 assert.equal(v.evidenceGrade,'FRESH_OFFSHORE_WAVES_AND_COMPLETE_48H_TREND');
 assert.equal(v.photosRequired,false);
 assert.equal(v.canClaimNewRocksExposed,false);
 assert.equal(v.canPublishVisitWindow,false);
 assert.equal(v.newAgateProbability,null);
 assert.equal(v.modeledBeachWaveHeightM,null);
});
test('renewed wave growth takes precedence over a falling 24h comparison',()=>{
 const v=conditionReading(pulse({status:'OFFSHORE_WAVES_REBUILDING'}),{nowISO});
 assert.equal(v.state,'OFFSHORE_WAVES_REBUILDING');
 assert.match(v.explanation,/increasing again/);
 assert.equal(v.canClaimBeachSafe,false);
});
test('active NWS marine alert always overrides apparent offshore easing',()=>{
 const v=conditionReading(pulse({hazardStatus:'ACTIVE'}),{nowISO});
 assert.equal(v.state,'MARINE_ALERT_ACTIVE');
 assert.equal(v.headline,'Marine warning or advisory active');
 assert.equal(v.waveStatus,'OBSERVED_OFFSHORE_POST_PEAK_EASING');
 assert.equal(v.furtherInterpretationBlocked,true);
 assert.equal(v.canPublishVisitWindow,false);
});
test('NWS outage never silently turns an observed wave decline into safe advice',()=>{
 const v=conditionReading(pulse({hazardStatus:'UNKNOWN'}),{nowISO});
 assert.equal(v.headline,'Wave context available; marine alerts unverified');
 assert.equal(v.furtherInterpretationBlocked,true);
 assert.equal(v.canClaimBeachSafe,false);
});
test('delayed source and missing trend refuse post-storm phase even with previous high peak',()=>{
 const old=conditionReading(pulse({latestMeasuredAtUTC:'2026-10-16T03:00:00Z'}),{nowISO});
 assert.equal(old.state,'SOURCE_UNAVAILABLE');
 assert.equal(old.offshoreWaveHeightM,null);
 assert.equal(old.comparedObservedOffshoreWaveActivityPct,null);
 assert.equal(old.furtherInterpretationBlocked,true);
 const gappy=conditionReading(pulse({waveTendency48h:{...pulse().waveTendency48h,comparedWindowCoveragePct:[89,100]}}),{nowISO});
 assert.equal(gappy.state,'OFFSHORE_DECLINE_WITHOUT_VALIDATED_24H_COMPARISON');
 assert.equal(gappy.comparedTwoComplete24hWindows,false);
});
test('remote gauge must not become a local exposure or wave-safety data input',()=>{
 const high=conditionReading(pulse({lakeSuperiorLevelContext:{
  ...pulse().lakeSuperiorLevelContext,delta24hCm:-70
 }}),{nowISO});
 assert.equal(high.state,'OBSERVED_OFFSHORE_POST_PEAK_EASING');
 assert.equal(high.remoteLevel24hChangeCm,-70);
 assert.equal(high.remoteGaugeCannotEstablishLocalExposure,true);
 assert.equal(high.canPredictNewAgates,false);
 const missing=conditionReading(pulse({lakeSuperiorLevelContext:{status:'REMOTE_LEVEL_SOURCE_UNAVAILABLE'}}),{nowISO});
 assert.equal(missing.remoteLevel24hChangeCm,null);
 assert.equal(missing.state,high.state);
});
test('spoofed safer flags or station identity are rejected',()=>{
 for(const forged of [
  {canPredictNewAgates:true},{canClaimBeachSafety:true},{photosRequired:true},
  {stationId:'45172'},{schemaVersion:'unverified'},{rockExposureScore:87},
  {hazardStatus:'OK'}
 ])assert.throws(()=>conditionReading(pulse(forged),{nowISO}));
 assert.ok(Object.values(DENIAL).every(x=>x===false||x===null));
});
test('one existing API wave/NWS/level call produces unified summary with NO extra external fetches',async()=>{
 const urls=[],stamp=Date.parse(nowISO);
 const waveCSV=['time,longitude,latitude,sea_surface_wave_significant_height,sea_surface_wave_from_direction,sea_surface_wave_mean_period',
   'UTC,degrees_east,degrees_north,m,degree,s',
   ...Array.from({length:98},(_,i)=>[
    new Date(stamp-(97-i)*.5*3600000).toISOString().replace('.000Z','Z'),
    -86.003799,46.695671,i<28?1.55:.6,329.1,4.4].join(','))
 ].join('\n');
 const fetched=await currentPulse({nowISO,fetchFn:async url=>{
  urls.push(url);
  if(url.includes('seagull-erddap.glos.org'))
   return {ok:true,headers:{get:()=>null},text:async()=>waveCSV};
  if(url.includes('api.weather.gov'))
   return {ok:true,json:async()=>({features:[{properties:{
    event:'Gale Warning',ends:'2026-10-17T00:00:00Z',severity:'Severe'}}]})};
  if(url.includes('api.tidesandcurrents.noaa.gov'))
   return {ok:false,status:503};
  throw Error('unexpected request');
 }});
 assert.equal(urls.length,6);
 assert.equal(new Set(urls).size,6);
 assert.equal(fetched.photoFreeConditionReading.alertStatus,'ACTIVE');
 assert.equal(fetched.photoFreeConditionReading.state,'MARINE_ALERT_ACTIVE');
 assert.equal(fetched.photoFreeConditionReading.sourceObservedAtUTC,nowISO);
 assert.equal(fetched.photoFreeConditionReading.photosRequired,false);
 assert.equal(fetched.photoFreeConditionReading.canPublishVisitWindow,false);
 assert.equal(fetched.photoFreeConditionReading.remoteLevel24hChangeCm,null);
 assert.equal(fetched.dataSourceAvailable,true);
});
test('existing noindex first-screen card now includes a coherent live photo-free overview',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
 for(const id of ['photoFreeConditionReading','photoFreeConditionTitle','photoFreeConditionHeadline',
  'photoFreeConditionDetail','photoFreeConditionQuality','photoFreeConditionFlags'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.ok(html.indexOf('id="photoFreeConditionReading"')<
   html.indexOf('id="liveWaveTendencyPanel"'));
 assert.equal((html.match(/fetch\('\/api\/rockhounding-wave-pulse'/g)||[]).length,1);
 assert.match(html,/newly exposed rocks or safe access/);
 assert.match(html,/Bayshore Park: protected-harbor wave response unmeasured/);
 assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(html,/adsbygoogle|googlesyndication/);
});
