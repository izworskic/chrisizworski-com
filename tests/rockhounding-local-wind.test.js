'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {STATION,parseLocalWind,assessLocalWind,loadLocalWind}=require('../lib/rockhounding/grand-marais-local-wind.cjs');
const header='#YY  MM DD hh mm WDIR WSPD GST  WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE';
const rows=Array.from({length:10},(_,i)=>'2026 10 15 19 '+String(i*5).padStart(2,'0')+' 140  5.1  7.2 MM MM MM MM MM MM MM MM MM MM MM').join('\n');
const raw=header+'\n'+rows;
const now='2026-10-15T19:50:00.000Z';
test('GRMM4 is the local Grand Marais NOAA wind station, not a wave buoy',()=>{
 assert.equal(STATION.id,'GRMM4');assert.ok(STATION.url.endsWith('/GRMM4.txt'));
 const a=parseLocalWind(raw);assert.equal(a.length,10);assert.ok(a.every(x=>x.isWaveMeasurement===false));
});
test('wind from direction is never substituted for directional waves',()=>{
 const a=assessLocalWind(parseLocalWind(raw),now);
 assert.equal(a.status,'OBSERVED_LOCAL_WIND_NOT_WAVES');
 assert.equal(a.latest.windFromDeg,140);assert.equal(a.claimsBeachWaveHeight,false);
 assert.equal(a.windFromDegreesAreNotWaveFromDegrees,true);
});
test('stale or sparse GRMM4 history does not yield a reassuring wind state',()=>{
 const a=parseLocalWind(raw);
 assert.equal(assessLocalWind(a,'2026-10-16T04:00:00.000Z').status,'UNAVAILABLE');
 assert.equal(assessLocalWind(a,'2026-10-15T21:55:00.000Z').status,'STALE');
 assert.equal(assessLocalWind(a.slice(0,3),now).status,'SPARSE');
});
test('missing NDBC wind data is ignored, not treated as calm',()=>{
 const s=header+'\n2026 10 15 19 40 MM MM MM MM MM MM MM MM MM MM MM MM MM MM\n';
 assert.equal(parseLocalWind(s).length,0);
});
test('NOAA live adapter honors network failure and valid input',async()=>{
 const response=await loadLocalWind({fetchFn:async()=>({ok:true,text:async()=>raw}),nowISO:now});
 assert.equal(response.status,'OBSERVED_LOCAL_WIND_NOT_WAVES');
 const fail=await loadLocalWind({fetchFn:async()=>({ok:false}),nowISO:now});
 assert.equal(fail.reason,'SOURCE_HTTP_ERROR');
});
