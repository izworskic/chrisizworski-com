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
