'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {catalog,validateCatalog,plan} = require('../lib/sleeping-giant/route-engine.cjs');
const {gradeForecast,parseZonedTime} = require('../lib/sleeping-giant/summit-window.cjs');

const request = (options={}) => ({hours:12,mode:'hike',interest:'summit',...options});
const route = (result,id) => result.results.find(r => r.id === id);
const checkTime = '2026-06-21T06:00:00-04:00';
const slots = (count=10) => Array.from({length:count},(_,i)=>({
  startAt:new Date(Date.parse('2026-06-21T07:00:00-04:00')+i*3600000).toISOString(),
  endAt:new Date(Date.parse('2026-06-21T08:00:00-04:00')+i*3600000).toISOString(),
  precipProbability:10,cloudPercent:20,windGustKmh:14,thunderRisk:false
}));
const outlook = (options={})=>({
 routeId:'top-of-the-giant',mode:'hike',departAt:'2026-06-21T07:00:00-04:00',
 sunsetAt:'2026-06-21T22:00:00-04:00',now:checkTime,
 forecast:{provider:'ECCC',issuedAt:'2026-06-21T05:30:00-04:00',
 sourceUrl:'https://api.weather.gc.ca/',hours:slots()},...options
});

test('all six routes have named sources, unique IDs and parking pins are not invented',()=>{
 assert.equal(validateCatalog(),true);
 assert.equal(catalog.routes.length,6);
 assert.ok(catalog.accessPoints.every(p=>p.parkingCoordinates===null && p.currentAccess==='unverified'));
 assert.ok(catalog.routes.every(r=>r.currentTrailStatus==='unverified'));
});

test('official hiking roundtrips and bike-foot splits remain exact',()=>{
 const r=route(plan(request()),'top-of-the-giant');
 assert.equal(r.roundTripKm,21.8);
 assert.equal(r.cycling.roundTripBikeKm,13.4);
 assert.equal(r.cycling.roundTripFootKm,8.4);
 assert.deepEqual([r.officialDurationMinutes.min,r.officialDurationMinutes.max],[360,600]);
 for (const [id,km,bike,foot] of [
   ['head-of-the-giant',16.2,12.2,4],['nanabosho-lookout',17,11.8,5.2]
 ]) {
   const x=route(plan(request()),id);
   assert.equal(x.roundTripKm,km);
   assert.equal(x.cycling.roundTripBikeKm,bike);
   assert.equal(x.cycling.roundTripFootKm,foot);
 }
});

test('short walk recommends source-duration Sea Lion without an open-status claim',()=>{
 const result=plan(request({hours:2,interest:'short-walk'}));
 assert.equal(result.bestCandidate.id,'sea-lion');
 assert.equal(result.bestCandidate.classification,'planning_candidate');
 assert.equal(result.bestCandidate.readiness,'planning_only');
 assert.equal(result.liveTrailStatus,false);
 assert.equal(result.bestCandidate.parkingPinVerified,false);
});

test('four hours is below official Top of Giant hiking minimum',()=>{
 const top=route(plan(request({hours:4})),'top-of-the-giant');
 assert.equal(top.classification,'not_suitable');
 assert.equal(top.duration.status,'below_documented_minimum');
});

test('between six and ten hours is not marked as assured',()=>{
 const top=route(plan(request({hours:7})),'top-of-the-giant');
 assert.equal(top.duration.status,'within_documented_range_not_assured');
 assert.equal(top.classification,'needs_verification');
});

test('bike-hike acknowledges legal split but does not invent a cycling trip duration',()=>{
 const top=route(plan(request({mode:'bike-hike',hours:12})),'top-of-the-giant');
 assert.equal(top.cycling.officiallyVerified,true);
 assert.equal(top.duration.status,'unknown_bike_duration');
 assert.equal(top.classification,'needs_verification');
 const seaLion=route(plan(request({mode:'bike-hike',hours:12})),'sea-lion');
 assert.equal(seaLion.classification,'not_suitable');
 assert.equal(seaLion.cycling.officiallyVerified,false);
});

test('conservative daylight rule with one-hour reserve blocks short daylight',()=>{
 const top=route(plan(request({remainingDaylightMinutes:300})),'top-of-the-giant');
 assert.equal(top.daylight.status,'less_than_official_minimum');
 assert.equal(top.classification,'not_suitable');
 const enough=route(plan(request({remainingDaylightMinutes:720})),'top-of-the-giant');
 assert.equal(enough.daylight.status,'covers_official_upper_with_reserve');
});

test('only dated Ontario Parks closure notices block a route; no positive open inference',()=>{
 const closed=plan(request({interest:'short-walk',hours:2,closures:[{
   routeId:'sea-lion',status:'closed',checkedAt:'2026-10-28T10:00:00-04:00',
   sourceUrl:'https://www.ontarioparks.ca/park/sleepinggiant/alerts'
 }]}));
 assert.equal(route(closed,'sea-lion').classification,'not_suitable');
 const untrusted=plan(request({interest:'short-walk',hours:2,closures:[{
   routeId:'sea-lion',status:'closed',checkedAt:'2026-10-28T10:00:00-04:00',
   sourceUrl:'https://example.com/alert'
 }]}));
 assert.equal(route(untrusted,'sea-lion').classification,'planning_candidate');
});

test('invalid inputs and source inconsistencies fail rather than passing silently',()=>{
 assert.throws(()=>plan(request({hours:Infinity})),/hours/);
 assert.throws(()=>plan(request({mode:'car'})),/mode/);
 const copy=structuredClone(catalog);
 copy.routes[1].bikeHikeRemainingRoundTripKm=100;
 assert.throws(()=>validateCatalog(copy),/do not total/);
});

test('zoned timestamp is mandatory: do not mix Ontario local time with server time',()=>{
 assert.throws(()=>parseZonedTime('2026-06-21T07:00:00','departAt'),/explicit offset/);
});

test('summit forecast evaluates whole 10h outing from cached slots, not a single hour',()=>{
 const result=gradeForecast(outlook());
 assert.equal(result.status,'forecast_assessed');
 assert.equal(result.signal,'more_favorable_weather');
 assert.equal(result.examinedPeriods,10);
 assert.equal(result.forecastHorizonMinutes,600);
 assert.equal(result.planningOnly,true);
});

test('thunder forecast creates concern, not a safe/no-safe verdict',()=>{
 const bad=slots(); bad[5].thunderRisk=true;
 const result=gradeForecast(outlook({forecast:{provider:'ECCC',issuedAt:'2026-06-21T05:30:00-04:00',hours:bad}}));
 assert.equal(result.signal,'higher_weather_concern');
 assert.equal(result.anyThunderRisk,true);
 assert.match(result.disclosure,/not a safety/);
});

test('missing middle forecast hour rejects the whole window',()=>{
 const broken=slots().filter((_,i)=>i!==2);
 assert.equal(gradeForecast(outlook({forecast:{provider:'ECCC',issuedAt:'2026-06-21T05:30:00-04:00',hours:broken}})).status,'forecast_gap');
});

test('stale source and unverified route duration cannot produce a positive window',()=>{
 assert.equal(gradeForecast(outlook({forecast:{provider:'ECCC',issuedAt:'2026-06-20T05:30:00-04:00',hours:slots()}})).signal,'unknown');
 assert.equal(gradeForecast(outlook({routeId:'head-of-the-giant'})).status,'unrated_trip_duration');
 assert.equal(gradeForecast(outlook({mode:'bike-hike'})).status,'unrated_trip_duration');
});

test('missing weather and inadequate daylight are explicitly unknown',()=>{
 assert.equal(gradeForecast(outlook({forecast:null})).status,'forecast_unavailable');
 assert.equal(gradeForecast(outlook({sunsetAt:'2026-06-21T13:00:00-04:00'})).status,'daylight_not_assured');
});
