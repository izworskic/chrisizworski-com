'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ui=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
const {currentPulse}=require('../api/rockhounding-wave-pulse.js')._test;
const NOW='2026-10-16T12:00:00Z',H=3600000;
function waveTable(){
 const header='time,longitude,latitude,sea_surface_wave_significant_height,sea_surface_wave_from_direction,sea_surface_wave_mean_period';
 const unit='UTC,degrees_east,degrees_north,m,degree,s';
 const rows=Array.from({length:48},(_,i)=>[
  new Date(Date.parse(NOW)-(47-i)*.5*H).toISOString().replace('.000Z','Z'),
  -86.003799,46.695671,.7,332,4.1
 ].join(','));
 return [header,unit,...rows].join('\n');
}
const level=()=>JSON.stringify({
 metadata:{id:'9099018',name:'Marquette C.G.',lat:'46.5456',lon:'-87.3786'},
 data:Array.from({length:290},(_,i)=>({
  t:new Date(Date.parse(NOW)-29*H+i*6*60000).toISOString().slice(0,16).replace('T',' '),
  v:(183.42+i*.0001).toFixed(3),s:'.003',f:'0,0,0,0',q:'p'
 }))
});
test('lake-level context enriches wave API without overriding source wave signal or NWS warnings',async()=>{
 const urls=[];
 const fetchFn=async url=>{
  urls.push(url);
  if(url.includes('seagull-erddap.glos.org'))
   return {ok:true,headers:{get:()=>null},text:async()=>waveTable()};
  if(url.includes('api.weather.gov/alerts/active'))
   return {ok:true,json:async()=>({features:[]})};
  if(url.includes('api.tidesandcurrents.noaa.gov'))
   return {ok:true,headers:{get:()=>null},text:async()=>level()};
  throw Error('unexpected source');
 };
 const x=await currentPulse({fetchFn,nowISO:NOW});
 assert.equal(urls.length,6);
 assert.equal(x.dataSourceAvailable,true);
 assert.equal(x.status,'LOWER_OFFSHORE_WAVE_ACTIVITY');
 assert.equal(x.hazardStatus,'CLEAR');
 assert.equal(x.lakeSuperiorLevelContext.status,'REMOTE_LAKE_LEVEL_OBSERVED_24H_CHANGE');
 assert.equal(x.lakeSuperiorLevelContext.stationId,'9099018');
 assert.equal(x.lakeSuperiorLevelContext.canPublishVisitWindow,false);
 assert.equal(x.canPredictNewAgates,false);
 assert.equal(x.canClaimBeachSafety,false);
});
test('the NOAA gauge can fail separately without hiding a real storm alert or GLOS readings',async()=>{
 const x=await currentPulse({nowISO:NOW,fetchFn:async url=>{
  if(url.includes('seagull-erddap.glos.org'))
   return {ok:true,headers:{get:()=>null},text:async()=>waveTable()};
  if(url.includes('api.tidesandcurrents.noaa.gov'))throw Error('NOAA offline');
  return {ok:true,json:async()=>({features:[{properties:{
   event:'Gale Warning',severity:'Severe',ends:'2026-10-17T00:00:00Z'
  }}]})};
 }});
 assert.equal(x.dataSourceAvailable,true);
 assert.equal(x.hazardStatus,'ACTIVE');
 assert.equal(x.lakeSuperiorLevelContext.status,'REMOTE_LEVEL_SOURCE_UNAVAILABLE');
 assert.equal(x.lakeSuperiorLevelContext.gaugeWaterLevelM,null);
 assert.equal(x.lakeSuperiorLevelContext.canClaimBeachSafety,false);
});
test('the noindex live view labels Marquette as a remote source and never converts water level to exposed stones',()=>{
 assert.match(ui,/id="liveRemoteLakeLevel"/);
 assert.match(ui,/id="liveRemoteLakeDelta"/);
 assert.match(ui,/id="liveRemoteLakeAge"/);
 assert.match(ui,/id="liveRemoteLakeExplanation"/);
 assert.match(ui,/stationhome\.html\?id=9099018/);
 assert.match(ui,/Marquette is not Grand Marais/);
 assert.match(ui,/not local wave runup, local beach waterline or a rock-exposure forecast/);
 assert.match(ui,/beachWaterlineElevationM===null/);
 assert.match(ui,/canClaimBeachSafety===false/);
 assert.match(ui,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(ui,/adsbygoogle|googlesyndication|<link rel="canonical"/);
});
