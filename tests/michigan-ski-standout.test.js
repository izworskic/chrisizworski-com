'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parse,fetchOfficial,SOURCES}=require('../lib/michigan-ski/official-reports');
const E=require('../lib/michigan-ski/engine');
test('official Caberfae report parser accepts only plausible complete lift/trail counts',()=>{
 const html='<main><h1>SNOW REPORT</h1><p>October 2026, preseason</p><h2>LIFTS OPEN – 0/5</h2><h2>SLOPES OPEN – 0/27</h2><p>SNOW BASE – 0″</p><p>24 HOUR SNOWFALL: 0″</p><p>Site conditions current.</p></main>';
 const r=parse('caberfae-peaks',html);
 assert.deepEqual(r.lifts,{open:0,total:5});
 assert.deepEqual(r.trails,{open:0,total:27});
 assert.equal(r.baseDepthInches,0);
 assert.equal(r.recentSnowInches,0);
 assert.equal(parse('caberfae-peaks',html.replace('0/5','8/5')),null);
 assert.equal(parse('caberfae-peaks','Trail status is unavailable'),null);
});
test('official Crystal and Shanty reports use independent field formats',()=>{
 const crystal='<div>Fall 2026 Mountain Report and Conditions <h2>24h Snowfall</h2> 0" <h2>Base Depth</h2>0-0" <h2>Trail & Lift Status</h2><b>Trails Open</b>0 /59 <b>Lifts Open</b>0 /8</div>';
 const shanty='<header>Current 69 degrees</header><section>Tomorrow today and conditions Trails 0 of 42 Terrain Parks 0 of 2 Lifts 0 of 7 Snowfall Past 24 Hours 0 inches</section>';
 assert.equal(parse('crystal-mountain',crystal)?.trails.total,59);
 assert.equal(parse('shanty-creek',shanty)?.lifts.total,7);
 assert.equal(parse('shanty-creek','<h2>Lifts 5 of 7</h2>'),null);
 assert.equal(parse('unknown-resort',crystal),null);
});
test('adapter remains fail closed when page is unavailable or markup changes',async()=>{
 const missing=await fetchOfficial('nubs-nob');
 assert.equal(missing.status,'NOT_CONNECTED');
 const source=SOURCES['caberfae-peaks'];
 const broken=await fetchOfficial('caberfae-peaks',async url=>{
  assert.equal(url,source.url);
  return {ok:true,text:async()=>'<html><body>Hours and lift tickets soon.</body></html>'};
 });
 assert.equal(broken.status,'UNVERIFIED');
});
test('selected ski day distinguishes snow forecast and freeze/thaw exposure',()=>{
 const now=Date.parse('2027-01-08T12:00:00Z');
 const w=E.weekendWindow(now);
 const grid={properties:{
  snowfallAmount:{values:[
   {validTime:new Date(w.saturday.start).toISOString()+'/PT24H',value:25.4},
   {validTime:new Date(w.sunday.start).toISOString()+'/PT24H',value:50.8}]},
  temperature:{values:[
   {validTime:new Date(w.saturday.start).toISOString()+'/PT24H',value:-3},
   {validTime:new Date(w.sunday.start).toISOString()+'/PT12H',value:-5},
   {validTime:new Date(w.sunday.start+12*3600000).toISOString()+'/PT12H',value:4}]},
  windSpeed:{values:[{validTime:new Date(w.saturday.start).toISOString()+'/PT24H',value:40}]}
 }};
 const d=E.skiDays(grid,now);
 assert.equal(d.saturday.snowInches,1);
 assert.equal(d.sunday.snowInches,2);
 assert.equal(d.sunday.surfaceSignal,'THAW_FREEZE_RISK');
 assert.equal(d.saturday.maxWindMph,25);
 assert.equal(d.moreSnowForecast,'SUNDAY');
});
test('real operating lift data never converts into guaranteed future opening',()=>{
 const r=E.RESORTS.find(x=>x.slug==='caberfae-peaks');
 const now=Date.parse('2027-01-08T12:00:00Z');
 const a=E.assemble(r,{grid:{properties:{snowfallAmount:{values:[]}}},updatedAt:new Date(now).toISOString()},
 [],[],'grandRapids',now,{status:'PUBLISHED_OFFICIAL_REPORT',lifts:{open:0,total:5},trails:{open:0,total:27},baseDepthInches:0});
 assert.equal(a.official.lifts.open,0);
 assert.equal(a.weather.baseDepthInches,0);
 assert.notEqual(a.ranking.verdict,'CONFIRMED_OPEN');
});

test('Central-time ski areas get Saturday/Sunday windows in resort time, not Detroit time',()=>{
 const now=Date.parse('2027-01-08T12:00:00Z');
 const west=E.RESORTS.find(x=>x.slug==='snowriver');
 const output=E.assemble(west,{},[],[],'detroit',now);
 assert.equal(output.weather.weekend.timeZone,'America/Chicago');
 assert.equal(new Date(output.weather.weekend.saturday.end).toISOString(),'2027-01-09T22:00:00.000Z');
 const boyne=E.assemble(E.RESORTS.find(x=>x.slug==='boyne-mountain'),{},[],[],'detroit',now);
 assert.equal(boyne.weather.weekend.timeZone,'America/Detroit');
 assert.equal(new Date(boyne.weather.weekend.saturday.end).toISOString(),'2027-01-09T21:00:00.000Z');
});
test('snowmaking cold-air monitor uses NWS only and never asserts operations',()=>{
 const now=Date.parse('2026-10-14T12:00:00Z');
 const grid={properties:{temperature:{values:[
  {validTime:'2026-10-14T12:00:00Z/PT10H',value:-4},
  {validTime:'2026-10-14T22:00:00Z/PT12H',value:6}
 ]}}};
 const cold=E.snowmakingColdAir(grid,now);
 assert.equal(cold.status,'COLD_AIR_WINDOW');
 assert.equal(cold.hours,10);
 assert.equal(cold.firstAt,'2026-10-14T12:00:00.000Z');
 assert.match(cold.disclaimer,/NOT wet-bulb/);
 assert.equal(E.snowmakingColdAir({},now).status,'UNAVAILABLE');
});
test('October has no ski-day score even with a positive NWS snow forecast',()=>{
 const boyne=E.RESORTS.find(x=>x.slug==='boyne-mountain');
 const score=E.scoreResort(boyne,{forecastSnowInches:10},'grandRapids',Date.parse('2026-10-14T16:00:00Z'));
 assert.equal(score.score,null);
 assert.equal(score.verdict,'OFF_SEASON_PLANNING');
});

test('generated Michigan decision experience includes keyless map, selection controls, and safe source labels',()=>{
 const fs=require('node:fs'),path=require('node:path'),base=path.join(__dirname,'..');
 const script=fs.readFileSync(path.join(base,'scripts/generate-michigan-ski-pages.mjs'),'utf8');
 const decision=fs.readFileSync(path.join(base,'public/assets/michigan-ski-decision.js'),'utf8');
 const map=fs.readFileSync(path.join(base,'public/assets/michigan-ski-map.js'),'utf8');
 const source=JSON.parse(fs.readFileSync(path.join(base,'public/assets/michigan-ski-outline.json'),'utf8'));
 for(const required of ['id="ski-goal"','id="ski-day"','id="ski-point-map"','id="ski-trip-cost"',
 '/assets/michigan-ski-map.js','/assets/michigan-ski-decision.js'])assert.ok(script.includes(required),required);
 assert.equal(source.type,'MultiPolygon');
 assert.equal(source.coordinates.length,4);
 assert.ok(map.includes('ski-map-selected'));
 assert.ok(map.includes('michigan-ski:select'));
 assert.ok(decision.includes('r.official'));
 assert.ok(decision.includes('adultDayPrice2026'));
 assert.ok(!map.includes('mapboxgl')&&!map.includes('google.maps'));
 assert.ok(!script.includes('MAPBOX_TOKEN'));
});
