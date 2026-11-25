'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const shore=require('../lib/shorefeel/engine.js');
const aurora=require('../lib/aurora.js');
const bridge=require('../lib/cbbt/core.js');
const {FRESHNESS}=require('../lib/cbbt/constants.js');
const river=require('../api/manistee-river-conditions.js')._test;
const H=3600000,NOW=Date.parse('2026-11-24T19:00:00Z'),now=new Date(NOW);
const at=offset=>new Date(NOW+offset).toISOString();

// Shared adversarial fixtures; each adapter uses the real owning normalizer.
// These are deterministic contracts, not production source availability checks.
for(const value of [null,undefined,'',' ',false,true,[],{},NaN,Infinity]){
 test('Missing/non-numeric evidence abstains: '+String(value)+' ('+typeof value+')',()=>{
  const row=shore.weatherPeriods([{startTime:at(0),temperature:value,temperatureUnit:'F',relativeHumidity:{value},probabilityOfPrecipitation:{value}}])[0];
  assert.equal(row.tempF,null);
  assert.equal(row.humidity,null);
  assert.equal(row.rainChance,null);
  assert.equal(aurora.toFiniteNumber(value),null);
 });
}
test('Explicit numeric zero and documented temperature units survive normalization',()=>{
 for(const value of [0,'0']){
  const row=shore.weatherPeriods([{startTime:at(0),temperature:value,temperatureUnit:'F',relativeHumidity:{value},probabilityOfPrecipitation:{value},windSpeed:'0 mph'}])[0];
  assert.equal(row.tempF,0);assert.equal(row.humidity,0);assert.equal(row.rainChance,0);assert.equal(row.windMph,0);
  assert.equal(aurora.toFiniteNumber(value),0);
 }
 const rows=shore.weatherPeriods([
  {startTime:at(H),temperature:0,temperatureUnit:'C',relativeHumidity:{value:101},probabilityOfPrecipitation:{value:-1}},
  {startTime:at(0),temperature:20,temperatureUnit:'K'},null,{startTime:'bad',temperature:20,temperatureUnit:'F'}]);
 assert.equal(rows.length,2);assert.equal(rows[0].tempF,null);assert.equal(rows[1].tempF,32);
 assert.equal(rows[1].humidity,null);assert.equal(rows[1].rainChance,null);
});
test('A blank NOAA CSV column never shifts the remaining lake identities',()=>{
 const csv='Year,Day,Sup,Mich,Huron,Erie,Ont\n2026,327,0,,10,12,14\n2026,328,,15,10,12,';
 const rows=shore.parseGLSEACsv(csv,now);
 assert.equal(rows.length,2);
 assert.deepEqual(rows[0].values,{superior:32,michigan:null,huron:50,erie:53.6,ontario:57.2});
 assert.deepEqual(rows[1].values,{superior:null,michigan:59,huron:50,erie:53.6,ontario:null});
 assert.deepEqual(shore.parseLongTermAverage('s,328,\nm,328,0'),{michigan:32});
});
test('A weather recommendation cannot select an expired ideal hour over a valid later hour',()=>{
 const old={startsAt:at(-H),daylight:true,tempF:76,windMph:0,rainChance:0};
 const future={startsAt:at(H),daylight:true,tempF:65,windMph:10,rainChance:null};
 assert.equal(shore.bestWeatherWindow([old],'relax',now),null);
 assert.equal(shore.bestWeatherWindow([old,future],'relax',now).startsAt,future.startsAt);
 assert.equal(shore.nowPeriod([old,future],now),null);
});
test('NOAA solar wind preserves latest usable records under reordered, future and invalid rows',()=>{
 const newest={time_tag:at(-60000),bz_gsm:0,bt:6};
 const old={time_tag:at(-2*H),bz_gsm:-8,bt:10};
 const stale={time_tag:at(-7*H),bz_gsm:-12,bt:13};
 const future={time_tag:at(1),bz_gsm:-30,bt:30};
 const missing={time_tag:at(-30000),bz_gsm:' ',bt:false};
 const speed=[{time_tag:at(-120000),proton_speed:450}];
 for(const rows of [[newest,old,stale,future,missing],[missing,future,stale,old,newest],[old,newest,future,stale,missing]]){
  const result=aurora.parseSolarWind(rows,speed,NOW);
  assert.equal(result.bz_gsm_nt,0);
  assert.equal(result.bt_nt,6);
  assert.equal(result.speed_km_s,450);
  assert.equal(result.observed_at,newest.time_tag);
 }
 assert.equal(aurora.parseSolarWind([future,stale,missing],[],NOW),null);
});
test('Cross-domain observation timestamps fail closed without collapsing real forecast-valid times',async()=>{
 const {freshness}=await import('../lib/snowmobile/engine.mjs');
 for(const time of [null,'','bad',at(1)]){
  assert.equal(bridge.freshnessState(time,FRESHNESS.noaaObservation,NOW).state,'unknown');
  assert.equal(freshness(time,'report',NOW).state,'UNKNOWN');
 }
 assert.equal(bridge.freshnessState(at(0),FRESHNESS.noaaObservation,NOW).state,'fresh');
 assert.equal(aurora.parseKpForecast([{time_tag:at(H),kp:0}],NOW).peak_24h,0);
 assert.equal(river.flowContext(null,{p50:400}).percent_of_median,null);
 assert.equal(river.flowContext(0,{p50:400}).percent_of_median,0);
});
