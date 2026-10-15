'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../lib/michigan-ski/engine');
const {RESORTS}=require('../lib/michigan-ski/resorts');
const at=Date.parse('2027-01-09T12:00:00Z');
const boyne=RESORTS.find(r=>r.slug==='boyne-mountain');
test('18 destinations, 17 downhill and Garland Nordic excluded from ski scoring',()=>{
 assert.equal(RESORTS.length,18);
 assert.equal(new Set(RESORTS.map(r=>r.slug)).size,18);
 assert.equal(RESORTS.filter(r=>r.kind==='downhill').length,17);
 assert.equal(E.scoreResort(RESORTS.find(r=>r.slug==='garland-lodge'),{},'detroit',at).score,null);
 assert.ok(RESORTS.every(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon)));
});
test('active lake-effect warning zones match Boyne but not wrong hills',()=>{
 const zones={forecastZone:'https://api.weather.gov/zones/forecast/MIZ022',county:'https://api.weather.gov/zones/county/MIC029'};
 const alerts=[{properties:{event:'Lake Effect Snow Warning',headline:'Lake effect snow warning',severity:'Severe',
  affectedZones:['https://api.weather.gov/zones/forecast/MIZ022'],ends:'2027-01-10T23:00:00Z'},geometry:null}];
 const hits=E.matchedAlerts(boyne,zones,alerts,at);
 assert.equal(hits.length,1);
 assert.equal(hits[0].isLakeEffect,true);
 assert.equal(E.matchedAlerts(boyne,{forecastZone:'https://api.weather.gov/zones/forecast/MIZ999'},alerts,at).length,0);
 const after=E.matchedAlerts(boyne,zones,alerts,Date.parse('2027-01-11T00:00:00Z'));
 assert.equal(after.length,0);
});
test('Polygon matches ski point, not remote ski hills',()=>{
 const poly={type:'Polygon',coordinates:[[[-85.2,44.8],[-84.7,44.8],[-84.7,45.4],[-85.2,45.4],[-85.2,44.8]]]};
 assert.equal(E.contains(poly,boyne),true);
 assert.equal(E.contains(poly,RESORTS.find(r=>r.slug==='mt-bohemia')),false);
});
test('NWS grid snowfall mm converts and duration overlap is valid',()=>{
 const grid={properties:{snowfallAmount:{values:[{validTime:'2027-01-09T00:00:00Z/PT12H',value:25.4}]} }};
 assert.equal(E.snowInWindow(grid,Date.parse('2027-01-09T06:00:00Z'),Date.parse('2027-01-09T12:00:00Z')),0.5);
 assert.equal(E.snowInWindow(grid,Date.parse('2027-01-10T00:00:00Z'),Date.parse('2027-01-11T00:00:00Z')),null);
});
test('wind sectors are climatological only and do not earn powder points',()=>{
 const w={properties:{windDirection:{values:[{validTime:'2027-01-09T12:00:00Z/PT3H',value:290}]}}};
 assert.equal(E.lakeEffectWind(boyne,w,at).status,'WIND_ALIGNED');
 assert.equal(E.lakeEffectWind(RESORTS.find(r=>r.slug==='nubs-nob'),w,at).status,'NOT_ALIGNED');
 const s=E.scoreResort(boyne,{forecastSnowInches:null,baseDepthInches:null,alerts:[]},'detroit',at);
 assert.equal(s.components.lakeEffectSignal,0);
 assert.ok(s.missing.includes('RESORT_BASE_DEPTH'));
});
test('storm reports remain nearby observations with source interval unknown',()=>{
 const r={lat:boyne.lat,lon:boyne.lon,inches:4,reportedAt:'2027-01-09T10:00:00Z',remark:'storm total reported'};
 const nearest=E.closestSnowReport(boyne,[r],24,at);
 assert.equal(nearest.inches,4);
 assert.equal(nearest.distanceMiles,0);
 assert.equal(E.closestSnowReport(boyne,[r],24,Date.parse('2027-01-11T12:00:00Z')),null);
});
test('Detroit vs Grand Rapids changes travel component without altering NWS evidence',()=>{
 const a=E.scoreResort(boyne,{},'detroit',at),b=E.scoreResort(boyne,{},'grandRapids',at);
 assert.ok(b.components.travelValue>=a.components.travelValue);
 assert.deepEqual(a.components.weekendForecast,b.components.weekendForecast);
});
test('source files and API are Michigan-only, Utah source remains independently present',()=>{
 for(const p of ['lib/utah-ski/road-service.js','api/utah-ski-road.js','public/utah-ski-access/index.html',
 'scripts/generate-michigan-ski-pages.mjs','public/assets/michigan-ski.js']){
  assert.ok(fs.existsSync(path.join(__dirname,'..',p)),p);
 }
 const api=fs.readFileSync(path.join(__dirname,'../api/michigan-ski.js'),'utf8');
 assert.match(api,/X-Robots-Tag/);assert.match(api,/CDN-Cache-Control/);
});

test('Sunday morning keeps the CURRENT ski weekend, Sunday after close advances to next week',()=>{
 const morning=E.weekendWindow(Date.parse('2027-01-10T15:00:00Z')); // 10 AM Eastern
 assert.equal(morning.saturday.date,'2027-01-09');
 assert.equal(morning.sunday.date,'2027-01-10');
 assert.equal(new Date(morning.end).toISOString(),'2027-01-10T21:00:00.000Z');
 const evening=E.weekendWindow(Date.parse('2027-01-10T22:00:00Z'));
 assert.equal(evening.saturday.date,'2027-01-16');
 assert.equal(evening.sunday.date,'2027-01-17');
});
test('Saturday and Sunday NWS snow windows separate snowfall and survive Michigan DST',()=>{
 const now=Date.parse('2027-03-12T12:00:00Z');
 const days=E.weekendWindow(now);
 assert.equal(days.saturday.date,'2027-03-13');
 assert.equal(days.sunday.date,'2027-03-14');
 assert.equal(new Date(days.saturday.end).toISOString(),'2027-03-13T21:00:00.000Z');
 assert.equal(new Date(days.sunday.end).toISOString(),'2027-03-14T20:00:00.000Z');
 const grid={properties:{snowfallAmount:{values:[
  {validTime:'2027-03-13T00:00:00Z/PT12H',value:25.4},
  {validTime:'2027-03-14T00:00:00Z/PT12H',value:50.8}
 ]}}};
 const out=E.skiDays(grid,now);
 assert.equal(out.saturday.snowInches,1);
 assert.equal(out.sunday.snowInches,2);
 assert.equal(out.moreSnowForecast,'SUNDAY');
});
test('winter warnings suspend ranking and never become ski-powder bonus',()=>{
 const open=E.scoreResort(boyne,{},'detroit',at);
 const warned=E.scoreResort(boyne,{alerts:[{event:'Lake Effect Snow Warning',isLakeEffect:true}]},'detroit',at);
 assert.equal(warned.score,null);
 assert.equal(warned.verdict,'WEATHER_WARNING_VERIFY_TRAVEL');
 assert.equal(warned.components.lakeEffectSignal,0);
 assert.ok(Number.isFinite(open.score));
 assert.ok(open.missing.includes('LIVE_LIFTS_AND_TRAIL_STATUS'));
});
