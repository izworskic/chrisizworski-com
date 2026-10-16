'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {memoryOfLastStorm}=require('../lib/rockhounding/seven-day-offshore-storm-memory.cjs');
const {currentPulse}=require('../api/rockhounding-wave-pulse.js')._test;
const NOW='2026-10-16T12:00:00Z',HOUR=3600000,now=Date.parse(NOW);
function row(hoursAgo,h=.35){
 return {time:new Date(now-hoursAgo*HOUR).toISOString().replace('.000Z','Z'),
  waveHeightM:h,waveFromDeg:330,meanPeriodS:4.2,
  source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',phase:'OBSERVATION',
  lat:46.695671,lon:-86.003799};
}
const data=fn=>Array.from({length:337},(_,i)=>row((336-i)*.5,fn((336-i)*.5)));
test('last offshore elevated spell 4 days ago remains visible despite 48-hour trend having forgotten it',()=>{
 const s=data(h=>h>=86&&h<=105?1.9:.4);
 const v=memoryOfLastStorm(s,{nowISO:NOW,hazardStatus:'CLEAR'});
 assert.equal(v.status,'OBSERVED_OFFSHORE_EASING_18H');
 assert.ok(v.lastMeasuredEpisode.hoursSinceLastElevated>72);
 assert.equal(v.lastMeasuredEpisode.sampleQualified,true);
 assert.equal(v.lastMeasuredEpisode.peakSignificantWaveHeightM,1.9);
 assert.ok(v.lastMeasuredEpisode.eighteenHourBelowResearchThresholdConfirmed);
 assert.equal(v.lastMeasuredEpisode.canPredictNewAgates,false);
 assert.equal(v.canPublishVisitWindow,false);
 assert.equal(v.canClaimBeachSafe,false);
 assert.equal(v.shorelineRockChangeMeasured,false);
});
test('latest buoy waves rebuilt after earlier low readings; never mark a settled period',()=>{
 const s=data(h=>h<=5?1.5:h>=84&&h<=104?2.1:.35);
 const v=memoryOfLastStorm(s,{nowISO:NOW,hazardStatus:'ACTIVE'});
 assert.equal(v.status,'OFFSHORE_ELEVATED_RECENTLY');
 assert.equal(v.hazardStatus,'ACTIVE');
 assert.equal(v.canClaimBeachSafe,false);
 assert.equal(v.lastMeasuredEpisode.eighteenHourBelowResearchThresholdConfirmed,false);
});
test('a non-elevated seven-day source history is not a rock exposure or safe beach verdict',()=>{
 const v=memoryOfLastStorm(data(()=>.3),{nowISO:NOW,hazardStatus:'CLEAR'});
 assert.equal(v.status,'NO_ELEVATED_OFFSHORE_SAMPLES_IN_7D');
 assert.equal(v.lastMeasuredEpisode,null);
 assert.equal(v.measuredNoElevatedReadingsNotNoStoneChange,true);
 assert.equal(v.canClaimBeachSafe,false);
});
test('missing recent source or stale season/offline buoy suppresses derived conclusion',()=>{
 const s=data(h=>h>48?1.7:.4).filter(r=>Date.parse(r.time)<now-8*HOUR);
 const v=memoryOfLastStorm(s,{nowISO:NOW});
 assert.equal(v.status,'SOURCE_STALE_OR_CLOCK_INVALID');
 assert.equal(v.lastMeasuredEpisode,null);
 assert.equal(v.canPublishVisitWindow,false);
 const empty=memoryOfLastStorm([],{nowISO:NOW});
 assert.equal(empty.status,'SOURCE_UNAVAILABLE');
 assert.equal(empty.lastMeasuredEpisode,null);
});
test('continuous post-storm low readings are required; a 6-hour missing interval cannot prove easing',()=>{
 const s=data(h=>h>=30&&h<=55?1.7:.25).filter(r=>!(hFrom(r)>17&&hFrom(r)<24));
 function hFrom(r){return (now-Date.parse(r.time))/HOUR}
 const v=memoryOfLastStorm(s,{nowISO:NOW});
 assert.equal(v.status,'POST_EPISODE_OBSERVATION_GAP');
 assert.equal(v.lastMeasuredEpisode.eighteenHourBelowResearchThresholdConfirmed,false);
 assert.ok(v.lastMeasuredEpisode.largestFollowupGapHours>1.5);
});
test('recent source gap suppresses storm result despite older valid elevated episode',()=>{
 const s=data(h=>h>=84&&h<=100?1.8:.5).filter(r=>!(hFrom(r)>1&&hFrom(r)<8));
 function hFrom(r){return (now-Date.parse(r.time))/HOUR}
 const v=memoryOfLastStorm(s,{nowISO:NOW});
 assert.equal(v.status,'RECENT_SOURCE_COVERAGE_INCOMPLETE');
 assert.equal(v.lastMeasuredEpisode,null);
});
test('a single isolated measurement over one meter does not become a sustained storm',()=>{
 const v=memoryOfLastStorm(data(h=>h===36?1.1:.5),{nowISO:NOW});
 assert.equal(v.status,'ELEVATED_READING_BUT_INSUFFICIENT_EVENT_SAMPLES');
 assert.equal(v.lastMeasuredEpisode.sampleQualified,false);
 assert.equal(v.lastMeasuredEpisode.eighteenHourBelowResearchThresholdConfirmed,false);
});
test('few low readings cannot claim an entire storm-free week when earlier source days are missing',()=>{
 const s=data(()=>.3).filter(r=>Date.parse(r.time)>=now-18*HOUR);
 const v=memoryOfLastStorm(s,{nowISO:NOW});
 assert.equal(v.status,'PARTIAL_SEVEN_DAY_SOURCE_HISTORY');
 assert.equal(v.sevenDayAbsenceSourceCovered,false);
 assert.equal(v.measuredNoElevatedReadingsNotNoStoneChange,true);
 assert.equal(v.canPublishVisitWindow,false);
});
test('source splices, duplicate value conflicts, station swap and future sample fail closed',()=>{
 const a=data(()=>.5);
 for(const changed of [[{...a[0],source:'other'}],[row(-4,2)],
  [a[0],{...a[0],waveHeightM:5}]]){
  assert.throws(()=>memoryOfLastStorm(changed,{nowISO:NOW}));
 }
 assert.throws(()=>memoryOfLastStorm(a,{nowISO:NOW,hazardStatus:'SAFE'}));
});
test('real Oct 2026 GLOS 142-reading audit ends in observed waves / unfinished, not safe shore',()=>{
 const real=require('../public/rockhounding-lab/glos-spotter-oct2026.json');
 const original=real.samples.map(p=>({time:p.t,waveHeightM:p.hM,
  waveFromDeg:p.waveFromDeg,meanPeriodS:p.periodS,
  source:'GLOS_SPOT_1361_OBSERVED_OPEN_LAKE',phase:'OBSERVATION',
  lat:46.695671,lon:-86.003799}));
 const checkpoint='2026-10-14T23:46:01Z';
 const v=memoryOfLastStorm(original,{nowISO:checkpoint,hazardStatus:'ACTIVE'});
 assert.equal(v.lastMeasuredEpisode.peakSignificantWaveHeightM,1.57); // 142-row short-window sample; full 2026 source has earlier 2.57 m peak
 assert.equal(v.lastMeasuredEpisode.eighteenHourBelowResearchThresholdConfirmed,false);
 assert.equal(v.canPredictNewAgates,false);
 assert.equal(v.hazardStatus,'ACTIVE');
});
test('same API fetch count: one 7-day GLOS request, 3 NWS alert checks and remote NOAA gauge',async()=>{
 const urls=[];
 const response=await currentPulse({nowISO:NOW,fetchFn:async url=>{
  urls.push(url);
  if(url.includes('seagull-erddap.glos.org')){
   const csv=[
    'time,longitude,latitude,sea_surface_wave_significant_height,sea_surface_wave_from_direction,sea_surface_wave_mean_period',
    'UTC,degrees_east,degrees_north,m,degree,s',
    ...data(h=>h>=84&&h<=104?1.75:.4).map(r=>[r.time,r.lon,r.lat,r.waveHeightM,r.waveFromDeg,r.meanPeriodS].join(','))
   ].join('\n');
   return {ok:true,headers:{get:()=>null},text:async()=>csv};
  }
  if(url.includes('api.weather.gov'))return {ok:true,json:async()=>({features:[]})};
  if(url.includes('api.tidesandcurrents.noaa.gov'))return {ok:false};
  throw Error('unexpected upstream');
 }});
 assert.equal(urls.length,6);
 const g=urls.filter(u=>u.includes('seagull-erddap.glos.org'));
 assert.equal(g.length,1);
 assert.match(g[0],/time>=2026-10-09T12:00:00Z/);
 assert.equal(response.sevenDayStormMemory.status,'OBSERVED_OFFSHORE_EASING_18H');
 assert.equal(response.sevenDayStormMemory.canPredictNewAgates,false);
 assert.equal(response.sevenDayStormMemory.canClaimBeachSafe,false);
 assert.equal(response.dataSourceAvailable,true);
});
