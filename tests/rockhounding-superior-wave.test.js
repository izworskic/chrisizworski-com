'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {STATION,evaluateBuoyText,loadRegionalWaveReference}=require('../lib/rockhounding/superior-wave-reference.cjs');
const FIXTURE=[
 '#YY  MM DD hh mm WDIR WSPD GST  WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE',
 '#yr mo dy hr mn degT m/s m/s m sec sec degT hPa degC degC degC nmi hPa ft',
 '2026 10 15 05 10 360 2.0 3.0 MM MM MM MM 1025.2 9.1 MM 4.6 MM MM MM',
 '2026 10 15 04 50 330 2.0 3.0 0.4 4 3.3 318 1025.2 9.0 MM 4.6 MM MM MM',
 '2026 10 15 02 20 310 7.0 9.0 0.9 5 3.7 319 1023.3 8.9 MM 4.9 MM MM MM'
].join('\n');
test('the official East Superior NDBC station is explicitly an offshore regional context source',()=>{
 assert.equal(STATION.id,'45004');
 assert.ok(STATION.url.endsWith('/45004.txt'));
 const result=evaluateBuoyText(FIXTURE,'2026-10-15T05:30:00Z');
 assert.ok(result.grandMaraisDistanceKm>50);
 assert.equal(result.referenceOnly,true);
 assert.equal(result.beachConditions,'NOT_DERIVABLE_FROM_OFFSHORE_BUOY');
 assert.equal(result.waveExposureVerdict,'NOT_CALIBRATED');
});
test('missing most recent wave report does not discard earlier valid observed wave',()=>{
 const result=evaluateBuoyText(FIXTURE,'2026-10-15T05:30:00Z');
 assert.equal(result.waveDataCoverage,'OBSERVED_AT_BUOY_NOT_SHORE');
 assert.equal(result.lastWaveReading.at,'2026-10-15T04:50:00.000Z');
 assert.equal(result.lastWaveReading.waveHeightM,0.4);
 assert.equal(result.lastWaveReading.waveFromDeg,318);
});
test('stale offshore data cannot become a fresh beach claim',()=>{
 const result=evaluateBuoyText(FIXTURE,'2026-10-15T12:00:00Z');
 assert.equal(result.waveDataCoverage,'STALE');
 assert.equal(result.waveExposureVerdict,'NOT_CALIBRATED');
});
test('live source success still returns context only; never a shoreline decision',async()=>{
 let called='';
 const fetchFn=async(url)=>{called=url;return {ok:true,text:async()=>FIXTURE};};
 const result=await loadRegionalWaveReference({fetchFn,nowISO:'2026-10-15T05:30:00Z'});
 assert.equal(called,STATION.url);
 assert.equal(result.waveDataCoverage,'OBSERVED_AT_BUOY_NOT_SHORE');
 assert.equal(result.beachConditions,'NOT_DERIVABLE_FROM_OFFSHORE_BUOY');
});
test('upstream HTTP failure returns unavailable rather than guessed calm',async()=>{
 const result=await loadRegionalWaveReference({fetchFn:async()=>({ok:false}),nowISO:'2026-10-15T05:30:00Z'});
 assert.equal(result.waveDataCoverage,'UNAVAILABLE');assert.equal(result.reason,'SOURCE_HTTP_ERROR');
});
test('unrecognized source format or request errors fail closed',async()=>{
 const format=await loadRegionalWaveReference({fetchFn:async()=>({ok:true,text:async()=>'<html>bad</html>'})});
 const network=await loadRegionalWaveReference({fetchFn:async()=>{throw Error('offline')}});
 assert.equal(format.reason,'SOURCE_FORMAT_INVALID');
 assert.equal(network.reason,'SOURCE_REQUEST_FAILED');
});
