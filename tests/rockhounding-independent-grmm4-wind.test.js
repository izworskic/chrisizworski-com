'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseGRMM4,describeGRMM4,missingWind,URL}=require('../lib/rockhounding/ndbc-grand-marais-wind.cjs');
const HEADER='#YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE';
const UNITS='#yr  mo dy hr mn degT m/s  m/s     m   sec   sec degT   hPa  degC  degC  degC  nmi  hPa    ft';
const row=(h,m,dir=330,speed=7.2,gust=8.8)=>
 [2026,10,16,h,m,dir,speed,gust,'MM','MM','MM','MM','MM','MM','MM','MM','MM','MM','MM'].join(' ');
const csv=rows=>[HEADER,UNITS,...rows].join('\n');
const nowISO='2026-10-16T15:00:00Z';
const series=()=>Array.from({length:20},(_,i)=>row(11+Math.floor(i/6),(i%6)*10,i<6?330:20,i<6?7.2:8.2));
test('real NOAA NDBC GRMM4 data: wind is anemometer m/s/true compass, wave heights missing',()=>{
 const raw=csv([row(14,50,150,7.2,8.8),row(14,40,150,6.7,8.8)]);
 const s=parseGRMM4(raw);
 assert.equal(s.stationId,'GRMM4');
 assert.equal(s.sourceUrl,URL);
 assert.equal(s.observations.length,2);
 assert.equal(s.observations[0].time,'2026-10-16T14:40:00Z');
 assert.equal(s.observations.at(-1).windSpeedMps,7.2);
 assert.equal(s.observations.at(-1).windFromDeg,150);
 assert.equal(s.unitWind,'m/s');
 assert.equal(s.sourceDoesNotMeasureWaves,true);
 const g=describeGRMM4(s,{nowISO});
 assert.equal(g.sourceStatus,'STATION_WIND_COVERAGE_INSUFFICIENT');
 assert.equal(g.latestObservedWindMps,null);
 assert.equal(g.ndbcWaveHeightAvailable,false);
 assert.equal(g.windMeasurementIsNotBeachSurf,true);
 assert.equal(g.canClaimSafeBeach,false);
});
test('six or more measured observations with 1h or smaller gaps make a fresh wind context, not site surf',()=>{
 const s=parseGRMM4(csv(series()));
 const g=describeGRMM4(s,{nowISO,waveObservation:{
  latestMeasuredAtUTC:'2026-10-16T14:30:00Z',
  latestOffshoreWaveFromDeg:338
 }});
 assert.equal(g.sourceStatus,'OBSERVED_STATION_WIND_RECENT');
 assert.ok(g.latestObservedWindMps>0);
 assert.ok(g.peakObservedGustPast3hMps>=g.latestObservedWindMps);
 assert.equal(g.offshoreWaveAndLocalWindFresh,true);
 assert.ok(g.weighted3hWindFromDeg>=0&&g.weighted3hWindFromDeg<360);
 assert.ok(Number.isFinite(g.waveFromVsLocalWindFromSeparationDeg));
 assert.equal(g.waveDataMustRemainFromGLOSSpotter,true);
 assert.equal(g.canClaimNewlyExposedStones,false);
 assert.equal(g.canPublishVisitWindow,false);
});
test('dated NDBC source remains explicitly stale, and all fresh wind numbers are suppressed',()=>{
 const s=parseGRMM4(csv([row(10,0,310,5),row(10,10,320,5)]));
 const g=describeGRMM4(s,{nowISO});
 assert.equal(g.sourceStatus,'WIND_SENSOR_STALE');
 assert.equal(g.latestObservedWindMps,null);
 assert.equal(g.lastKnownObservedAtUTC,'2026-10-16T10:10:00Z');
 assert.equal(g.canInferHarborSurf,false);
});
test('NDBC missing MM/360 and measurement-source changes cannot be coerced into zero wave heights',()=>{
 const s=parseGRMM4(csv([row(14,0,'MM','MM','MM'),row(14,10,360,3.6,'MM')]));
 assert.equal(s.missingWindRows,1);
 assert.equal(s.observations.length,1);
 assert.equal(s.observations[0].windFromDeg,0);
 assert.equal(s.observations[0].gustMps,null);
 assert.equal(s.sourceDoesNotMeasureWaves,true);
 assert.throws(()=>parseGRMM4(csv([row(14,0)]).replace('WDIR WSPD GST','WDIR WVHT GST')),/header/);
 assert.throws(()=>parseGRMM4(csv([row(14,0)]).replace('degT m/s  m/s','degT knots m/s')),/units/);
 const invalid=parseGRMM4(csv(['2026 02 30 12 10 320 2.2 3.1 MM MM MM MM MM MM MM MM MM MM MM']));
 assert.equal(invalid.badTimeRows,1);
 assert.equal(invalid.observations.length,0);
});
test('conflicting same UTC station entries and future observations fail independently',()=>{
 assert.throws(()=>parseGRMM4(csv([row(14,0,20,2),row(14,0,330,2)])),/Conflicting/);
 const future=parseGRMM4(csv([row(16,0,350,8)]));
 assert.throws(()=>describeGRMM4(future,{nowISO}),/future/);
});
test('wind direction and offshore waves can disagree because swell differs; no safety conclusion',()=>{
 const wind=parseGRMM4(csv(series()));
 const g=describeGRMM4(wind,{nowISO,waveObservation:{
  latestMeasuredAtUTC:'2026-10-16T14:30:00Z',
  latestOffshoreWaveFromDeg:180
 }});
 assert.ok(g.waveFromVsLocalWindFromSeparationDeg>90);
 assert.match(g.windWaveDifferenceMeaning,/SWELL_AND_FETCH/);
 assert.equal(g.currentNWSAlertStatusNotReplaced,true);
 assert.equal(g.canClaimSafeBeach,false);
});
test('unknown NDBC wind is separate from GLOS/NWS and does not become a calm-water result',()=>{
 const g=missingWind(nowISO);
 assert.equal(g.sourceStatus,'NO_RECENT_ORIGINAL_WIND_READINGS');
 assert.equal(g.latestObservedWindMps,null);
 assert.equal(g.waveFromVsLocalWindFromSeparationDeg,null);
 assert.equal(g.canClaimSafeBeach,false);
});
