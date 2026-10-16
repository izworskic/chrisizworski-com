'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const source=require('../data/rockhounding/grand-marais-glos-spotter-source.json');
const {validateSpotterSource,requestUrl,parseSpotterCSV,observedSpotterStudy}=
 require('../lib/rockhounding/glos-spotter.cjs');
const head='time,longitude,latitude,sea_surface_wave_significant_height,sea_surface_wave_from_direction,sea_surface_wave_mean_period';
const units='UTC,degrees_east,degrees_north,m,degree,s';
function csv(lines){return [head,units,...lines].join('\n');}
function sampleRow(time,h=1.05,dir=327,period=3.5,lon=-86.00379943847656,lat=46.69567108154297){
 return [time,lon,lat,h,dir,period].join(',');
}
test('real source October 14 sample is observed wave-from, not buoy wind',()=>{
 assert.equal(validateSpotterSource(),true);
 const u=requestUrl({startISO:'2026-10-14T00:00:00Z',endISO:'2026-10-15T00:00:00Z'});
 assert.ok(u.startsWith('https://seagull-erddap.glos.org/erddap/tabledap/obs_140.csv?'));
 assert.match(u,/sea_surface_wave_from_direction/);
 assert.doesNotMatch(u,/wind_from_direction/);
 const x=parseSpotterCSV(csv([
  sampleRow('2026-10-14T00:16:01Z',1.05,326.904,3.52),
  sampleRow('2026-10-14T00:46:01Z',1.06,320.528,3.64)
 ]));
 assert.equal(x.stationId,'SPOT-1361');
 assert.equal(x.rows.length,2);
 assert.equal(x.rows[0].waveFromDeg,326.9);
 assert.equal(x.rows[0].waveHeightM,1.05);
 assert.equal(x.observedNotForecast,true);
 assert.equal(x.windDirectionNotSubstitutedForWaves,true);
});
test('72h measured offshore wave decline is not a publishing or agate verdict',()=>{
 const start=Date.parse('2026-10-14T00:00:00Z');
 const records=Array.from({length:25},(_,i)=>{
  const t=new Date(start+i*3600000).toISOString().replace('.000Z','Z');
  return sampleRow(t,i===7?2:(i>7?(.6+(24-i)*.015):.7),328,4.5);
 });
 const x=parseSpotterCSV(csv(records));
 const out=observedSpotterStudy(x,{nowISO:'2026-10-15T00:00:00.000Z'});
 assert.equal(out.status,'OBSERVED_OFFSHORE_WAVES_RESEARCH_ONLY');
 assert.equal(out.recordCount,25);
 assert.equal(out.peakObservedWaveM,2);
 assert.ok(out.declineFromObservedPeakFraction>.5);
 assert.equal(out.historicalShoreNormalUsed,false);
 assert.equal(out.isSiteBreakingSurfMeasurement,false);
 assert.equal(out.canPredictRockExposure,false);
 assert.equal(out.canPublishVisitWindow,false);
 assert.equal(out.canClaimSafeConditions,false);
 assert.equal(out.canClaimHarborWaves,false);
});
test('short/old spotter data cannot manufacture a live wave window',()=>{
 const x=parseSpotterCSV(csv([sampleRow('2026-10-10T00:16:01Z')]));
 const missing=observedSpotterStudy(x,{nowISO:'2026-10-15T00:00:00.000Z'});
 assert.equal(missing.status,'NO_OBSERVATIONS');
 const stale=parseSpotterCSV(csv([
  sampleRow('2026-10-14T00:16:01Z'),
  sampleRow('2026-10-14T01:16:01Z')
 ]));
 const out=observedSpotterStudy(stale,{nowISO:'2026-10-14T08:00:00.000Z'});
 assert.equal(out.status,'STALE_OBSERVATIONS');
 assert.equal(out.canPublishVisitWindow,false);
});
test('NOAA/NDBC GRMM4 wind column and fabricated GLOS station cannot enter observed waves',()=>{
 assert.throws(()=>parseSpotterCSV(csv([sampleRow('2026-10-14T00:16:01Z',1,324,3,-84,46.695)])),/Wrong GLOS buoy location/);
 assert.throws(()=>parseSpotterCSV(csv([sampleRow('2026-10-14T00:16:01Z')]).replace('sea_surface_wave_from_direction','wind_from_direction')),/column/);
});
test('missing measurements, duplicate timestamp conflicts and changed physical units fail closed',()=>{
 const x=parseSpotterCSV(csv([
  sampleRow('2026-10-14T00:16:01Z','NaN',326,3.4),
  sampleRow('2026-10-14T01:16:01Z',1,321,3.6)
 ]));
 assert.equal(x.rows.length,1);
 assert.equal(x.rejectedRows,1);
 const blank=parseSpotterCSV(csv([sampleRow('2026-10-14T01:16:01Z','',321,3.6)]));
 assert.equal(blank.rows.length,0);
 assert.equal(blank.rejectedRows,1);
 assert.throws(()=>parseSpotterCSV(csv([
  sampleRow('2026-10-14T00:16:01Z',1,326,3.4),
  sampleRow('2026-10-14T00:16:01Z',2,326,3.4)
 ])),/duplicate/);
 assert.throws(()=>parseSpotterCSV(csv([
   sampleRow('2026-10-14T00:16:01Z')
 ]).replace(',m,degree,s',',ft,degree,s')),/units/);
});
test('never silently unlock public safety if source registry drifts',()=>{
 const fake=structuredClone(source);
 fake.publicClaims.canPublishVisitWindow=true;
 assert.throws(()=>validateSpotterSource(fake));
 fake.publicClaims.canPublishVisitWindow=false;
 fake.isLocalBreakingSurfSensor=true;
 assert.throws(()=>validateSpotterSource(fake));
});
