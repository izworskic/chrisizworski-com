'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {currentPulse}=require('../api/rockhounding-wave-pulse.js')._test;
const NOW='2026-10-16T15:00:00Z',H=3600000;
const NDBC_HEAD='#YY  MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE';
const NDBC_UNITS='#yr mo dy hr mn degT m/s m/s m sec sec degT hPa degC degC degC nmi hPa ft';
const localWind=[NDBC_HEAD,NDBC_UNITS,
 ...Array.from({length:21},(_,i)=>{
  const t=new Date(Date.parse(NOW)-(20-i)*10*60000);
  return [t.getUTCFullYear(),t.getUTCMonth()+1,t.getUTCDate(),t.getUTCHours(),
   t.getUTCMinutes(),330,6.2,8.4,'MM','MM','MM','MM','MM','MM','MM','MM','MM','MM','MM'].join(' ');
 })].join('\n');
const waveCsv=['time,longitude,latitude,sea_surface_wave_significant_height,sea_surface_wave_from_direction,sea_surface_wave_mean_period',
 'UTC,degrees_east,degrees_north,m,degree,s',
 ...Array.from({length:90},(_,i)=>[
  new Date(Date.parse(NOW)-(89-i)*30*60000).toISOString().replace('.000Z','Z'),
  -86.003799,46.695671,i<30?1.6:.55,329.5,4.2].join(','))].join('\n');
function dataFetch(urls,{windAvailable=true}={}){
 return async url=>{
  urls.push(url);
  if(url.includes('seagull-erddap.glos.org'))return {ok:true,headers:{get:()=>null},text:async()=>waveCsv};
  if(url.includes('www.ndbc.noaa.gov')){
   if(!windAvailable)throw Error('GRMM4 wind missing');
   return {ok:true,headers:{get:()=>null},text:async()=>localWind};
  }
  if(url.includes('api.weather.gov'))return {ok:true,json:async()=>({features:[]})};
  if(url.includes('api.tidesandcurrents.noaa.gov'))return {ok:false,status:503};
  throw Error('Unexpected source: '+url);
 };
}
test('existing one cached public API response now combines two independently measured sources without photos',async()=>{
 const urls=[],r=await currentPulse({nowISO:NOW,fetchFn:dataFetch(urls)});
 assert.equal(urls.length,6);
 assert.equal(urls.filter(x=>x.includes('www.ndbc.noaa.gov')).length,1);
 assert.equal(urls.filter(x=>x.includes('seagull-erddap.glos.org')).length,1);
 assert.equal(urls.filter(x=>x.includes('api.weather.gov')).length,3);
 assert.equal(urls.filter(x=>x.includes('api.tidesandcurrents.noaa.gov')).length,1);
 assert.equal(r.dataSourceAvailable,true);
 assert.equal(r.status,'OFFSHORE_WAVES_EASING');
 assert.equal(r.independentlyMeasuredGrandMaraisWind.sourceStatus,'OBSERVED_STATION_WIND_RECENT');
 assert.equal(r.independentlyMeasuredGrandMaraisWind.latestObservedWindMps,6.2);
 assert.equal(r.independentlyMeasuredGrandMaraisWind.latestObservedWindFromDeg,330);
 assert.equal(r.independentlyMeasuredGrandMaraisWind.offshoreWaveAndLocalWindFresh,true);
 assert.ok(r.independentlyMeasuredGrandMaraisWind.waveFromVsLocalWindFromSeparationDeg<2);
 assert.equal(r.independentlyMeasuredGrandMaraisWind.ndbcWaveHeightAvailable,false);
 assert.equal(r.canPredictNewAgates,false);
 assert.equal(r.canClaimBeachSafety,false);
 assert.equal(r.independentlyMeasuredGrandMaraisWind.canPublishVisitWindow,false);
});
test('independent wind outage does not prevent the original offshore buoy, NWS or photo-free condition reading',async()=>{
 const urls=[],r=await currentPulse({nowISO:NOW,fetchFn:dataFetch(urls,{windAvailable:false})});
 assert.equal(urls.length,6);
 assert.equal(r.independentlyMeasuredGrandMaraisWind.sourceStatus,'NO_RECENT_ORIGINAL_WIND_READINGS');
 assert.equal(r.independentlyMeasuredGrandMaraisWind.latestObservedWindMps,null);
 assert.equal(r.dataSourceAvailable,true);
 assert.equal(r.photoFreeConditionReading.photosRequired,false);
 assert.equal(r.photoFreeConditionReading.canClaimNewRocksExposed,false);
 assert.equal(r.independentlyMeasuredGrandMaraisWind.canClaimSafeBeach,false);
});
test('first-screen measured wind evidence is independent, no duplicate wind browser request',()=>{
 const page=fs.readFileSync(path.join(__dirname,'../public/rockhounding-lab/index.html'),'utf8');
 for(const id of ['grandMaraisMeasuredWindPanel','grandMaraisMeasuredWindTitle',
  'grandMaraisWindSpeed','grandMaraisWindDirection','grandMaraisWindGust',
  'grandMaraisWindSourceAge','grandMaraisWindWaveContext'])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.ok(page.indexOf('id="grandMaraisMeasuredWindPanel"')<
  page.indexOf('id="sevenDayStormMemoryPanel"'));
 assert.equal((page.match(/fetch\('\/api\/rockhounding-wave-pulse'/g)||[]).length,1);
 assert.equal((page.match(/fetch\('https:\/\/www\.ndbc\.noaa\.gov/g)||[]).length,0);
 assert.match(page,/Wind unavailable/);
 assert.match(page,/not a prediction of newly exposed stones/i);
 assert.match(page,/NOAA GRMM4 original station/);
 assert.match(page,/<meta name="robots" content="noindex,nofollow,noarchive">/);
 assert.doesNotMatch(page,/adsbygoogle|googlesyndication/);
});
