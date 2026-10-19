'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const R=require('../lib/shed-snow-retreat.cjs');
const E=require('../public/assets/this-week-engine.js');
const now=new Date('2027-03-15T19:00:00Z'),nowMs=+now;
function snow(values,unit='m'){
 const time=values.map((_,i)=>'2027-03-'+String(i+1).padStart(2,'0')+'T12:00');
 return {hourly_units:{snow_depth:unit},hourly:{time,snow_depth:values}};
}
test('history request only uses supported model snow variable, Detroit clock, 14 past days',()=>{
 const x=R.sourceUrl({lat:43.5945,lon:-83.8889}),url=new URL(x);
 assert.equal(url.hostname,'api.open-meteo.com');
 assert.equal(url.searchParams.get('hourly'),'snow_depth');
 assert.equal(url.searchParams.get('past_days'),'14');
 assert.equal(url.searchParams.get('timezone'),'America/Detroit');
});
test('seven consecutive past noon model-zero depths are a persistent model signal only',()=>{
 const x=R.analyze(snow([.2,.17,.09,.06,.03,.02,.01,0,0,0,0,0,0,0]),now);
 assert.equal(x.status,'persistently_bare');assert.equal(x.days.length,14);
 assert.match(x.interpretation,/not measured/i);
 assert.equal(x.throughDate,'2027-03-14');
});
test('two days bare following snow is recent retreat, one day is not confirmed persistence',()=>{
 const good=R.analyze(snow([.2,.2,.2,.18,.18,.15,.15,.12,.1,.09,.07,.05,0,0]),now);
 assert.equal(good.status,'recent_retreat');assert.notEqual(good.status,'persistently_bare');
 const brief=R.analyze(snow([.2,.2,.15,.14,.13,.12,.11,.10,.10,.09,.07,.03,.03,0]),now);
 assert.equal(brief.status,'possible_brief_thaw');
});
test('a thinner still covered model cell is never declared bare',()=>{
 const x=R.analyze(snow([.2,.2,.18,.18,.15,.15,.14,.14,.12,.1,.09,.08,.07,.06]),now);
 assert.equal(x.status,'thinning');assert.ok(x.latestDepthM>0);
});
test('history sources with missing values, incorrect units, or missing valid dates cannot imply zero snow',()=>{
 assert.equal(R.analyze(snow(Array(14).fill(null)),now).status,'unavailable');
 assert.equal(R.analyze(snow(Array(14).fill(0),'cm'),now).status,'unavailable');
 assert.equal(R.analyze(snow(Array(8).fill(0)),now).status,'unavailable');
 assert.equal(R.analyze({},now).status,'unavailable');
});
test('weekly shed adapter never promotes persistent model-bare to safe go or predicted antlers',()=>{
 const data={season:'SEARCH_SEASON',forecastUpdatedAt:'2027-03-15T18:00:00Z',
  daily:[{date:'2027-03-15',thawHours:6},{date:'2027-03-16',thawHours:7},{date:'2027-03-17',thawHours:8}],
  snowDepth:{status:'modeled-bare'},snowTrend:R.analyze(snow(Array(14).fill(0)),now)};
 const reading=E.shed(data,nowMs);
 assert.equal(reading.state,'check');assert.doesNotMatch(reading.reason,/confirmed shed|guaranteed/i);
});
test('weekly waterfowl watch separates forecast cold from actual birds and verifies feed dates',()=>{
 const weather={status:'forecast',longestFreezingRunHours:27,forecastColdDegreeHours:240};
 const base={generatedAt:'2027-03-15T18:00:00Z',region:{name:'Saginaw Bay'},
  weather,habitatShift:{status:'lake_refuge_possible',marshPressure:'high',lakeChartStatus:'dated_official_chart'}};
 const promising=E.waterfowl(base,nowMs);
 assert.equal(promising.state,'check');
 assert.match(promising.reason,/forecast/i);
 assert.match(promising.trigger,/dated local counts/i);
 assert.equal(E.waterfowl({...base,generatedAt:'2027-03-11T00:00:00Z'},nowMs).state,'unavailable');
 assert.equal(E.waterfowl({...base,weather:{status:'unavailable'}},nowMs).state,'unavailable');
 const limited=E.waterfowl({...base,habitatShift:{status:'limited_freezing',marshPressure:'limited'}},nowMs);
 assert.equal(limited.state,'context');
 assert.match(limited.reason,/does not indicate birds are absent/i);
});
test('public experience presents the historical chart and fifth independent specialist card',()=>{
 const shed=fs.readFileSync(path.join(__dirname,'../public/michigan-shed-antlers/index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../public/michigan-shed-antlers/app.js'),'utf8');
 const api=fs.readFileSync(path.join(__dirname,'../api/shed-antlers.js'),'utf8');
 const hub=fs.readFileSync(path.join(__dirname,'../public/tools/index.html'),'utf8');
 const weekly=fs.readFileSync(path.join(__dirname,'../public/assets/this-week.js'),'utf8');
 assert.match(shed,/id="retreat-chart"/);assert.match(shed,/id="retreat-summary"/);
 assert.match(app,/function renderRetreat/);assert.match(api,/snowTrend,/);
 assert.match(hub,/id="week-waterfowl"/);assert.match(hub,/Five different outdoor questions/);
 assert.match(weekly,/Promise\.allSettled\(requests\)/);
 assert.match(weekly,/mode=region&region=/);assert.match(weekly,/E\.waterfowl\(/);
 assert.match(weekly,/saginaw-bay/);
});
