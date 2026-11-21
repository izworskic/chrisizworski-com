'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {parcelTemperatureF,scenario,marineAirFromNDBC,INLAND_BAY_COUNTY,ASSUMPTIONS}
  =require('../lib/shorefeel/physics.js');
const now=new Date('2026-07-01T12:30:00Z');
const beach={lat:43.6714,lon:-83.9068},inner={lat:43.702,lon:-83.858};
const hour='2026-07-01T12:00:00Z';
const coast=(v={})=>({startsAt:hour,tempF:82,windDirection:'NE',windMph:8,...v});
const inland=(v={})=>({startsAt:hour,tempF:86,...v});
const water=(v={})=>({kind:'satellite',observedAt:'2026-07-01T06:00:00Z',tempF:60,...v});
const input=(v={})=>({beachWeather:coast(),inlandWeather:inland(),water:water(),
 beach,waterReference:inner,...v});
test('Wolfram-checked exponential solution and temperature equilibrium',()=>{
 const t=parcelTemperatureF(86,60,5,60,0.0012);
 assert.ok(Math.abs(t-83.52577286893495)<1e-9);
 assert.equal(parcelTemperatureF(72,72,5,60,0.0012),72);
 assert.ok(parcelTemperatureF(86,60,10,60,.0012)<t);
 assert.ok(parcelTemperatureF(86,60,2,60,.0012)>t);
 assert.equal(parcelTemperatureF(86,60,5,0,.0012),null);
 assert.equal(parcelTemperatureF(86,60,5,60,-1),null);
});
test('27 sensitivity scenarios match Wolfram results; range is not a confidence interval',()=>{
 const p=scenario(input(),now);
 assert.equal(p.status,'research-only');
 assert.equal(p.scenarioCount,27);
 assert.equal(p.lowF,69.6);
 assert.equal(p.highF,85.7);
 assert.equal(p.medianF,83.5);
 assert.equal(p.paired.nwsDifferenceF,-4);
 assert.equal(p.calibrated,false);
 assert.equal(p.validatedAgainstBeachStations,false);
 assert.equal(p.usableForPublicBeachTemperature,false);
 assert.match(p.reason,/not a confidence interval/);
 assert.deepEqual(ASSUMPTIONS.crossWaterKm,[2,5,10]);
});
test('offshore, stale water, missing forecast, wrong wind and weak contrast fail closed',()=>{
 const p=scenario(input({beachWeather:coast({windDirection:'SW'})}),now);
 assert.equal(p.status,'insufficient-data');
 assert.match(p.reason,/onshore/);
 assert.equal(scenario(input({water:water({observedAt:'2026-06-26T06:00:00Z'})}),now).status,'insufficient-data');
 assert.equal(scenario(input({water:null}),now).status,'insufficient-data');
 assert.equal(scenario(input({inlandWeather:null}),now).status,'unavailable');
 assert.equal(scenario(input({beachWeather:coast({windDirection:null})}),now).status,'insufficient-data');
 assert.equal(scenario(input({water:water({tempF:83})}),now).status,'insufficient-data');
});
test('cool inland, warm bay is possible without extrapolating beyond water equilibrium',()=>{
 const p=scenario(input({inlandWeather:inland({tempF:38}),
  beachWeather:coast({tempF:40}),water:water({tempF:59})}),now);
 assert.equal(p.status,'research-only');
 assert.ok(p.lowF>=38&&p.highF<=59);
});
test('NDBC air is independent offshore context: units, freshness, missing values and ordering',()=>{
 const raw=['#YY MM DD hh mm WDIR WSPD GST ATMP WTMP',
  '#yr mo dy hr mn degT m/s m/s degC degC',
  '2026 07 01 11 40 060 4.5 5 14.0 15.0',
  '2026 07 01 12 10 090 5.5 6 13.0 15.5'].join('\n');
 const p=marineAirFromNDBC(raw,now);
 assert.equal(p.tempF,55.4);
 assert.equal(p.observedAt,'2026-07-01T12:10:00.000Z');
 assert.match(p.location,/Outer Saginaw Bay/);
 assert.equal(marineAirFromNDBC(raw,new Date('2026-07-03T12:30:00Z')),null);
 assert.equal(marineAirFromNDBC('#YY MM DD hh mm WTMP\n2026 07 01 12 00 20',now),null);
 assert.equal(marineAirFromNDBC('#YY MM DD hh mm ATMP\n2026 07 01 12 00 99.0',now),null);
 assert.equal(marineAirFromNDBC('#YY MM DD hh mm ATMP\n2026 13 01 12 00 12.0',now),null);
});
test('independent Bay County reference is inland west of beach',()=>{
 assert.equal(INLAND_BAY_COUNTY.lat,beach.lat);
 assert.ok(INLAND_BAY_COUNTY.lon<beach.lon-.1);
});
test('API/page integration preserves the forecast as first answer and research-only status',()=>{
 const root=path.join(__dirname,'..');
 const api=fs.readFileSync(path.join(root,'api/shorefeel.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'public/lake-huron-water-temperature/saginaw-bay/index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'public/assets/shorefeel-saginaw.js'),'utf8');
 assert.match(api,/shorelinePhysics:physicalScenarios/);
 assert.match(api,/marineAirFromNDBC\(nearby\.value,now\)/);
 assert.match(api,/weatherFor\(INLAND_BAY_COUNTY\)/);
 assert.match(html,/id="physics-model-range"/);
 assert.match(html,/id="physics-forecast-contrast"/);
 assert.match(html,/physics model is not calibrated against a beach thermometer/);
 assert.match(js,/physics\?\.status==='research-only'/);
 assert.ok(html.indexOf('id="lead-temp"')<html.indexOf('id="physics-model-range"'));
 assert.match(html,/rel="canonical"/);
 assert.match(html,/adsbygoogle\.js\?client=/);
 assert.doesNotThrow(()=>new Function(js));
});
