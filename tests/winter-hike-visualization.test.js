'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Trend=require('../lib/winter-hike-forecast-trend.cjs');
const Live=require('../lib/winter-hike-live.cjs');
const Visuals=require('../public/winter-hike-snowshoe-lab/visuals.js');
const now=Date.parse('2026-12-12T15:00:00Z');
const day=n=>new Date(Date.parse('2026-12-12T12:00:00Z')+n*86400000).toISOString().slice(0,10);
function feed(options={}){
 const periods=[];
 for(let d=0;d<7;d++)for(let hour=10;hour<=16;hour++){
  if(options.omit?.includes(d+':'+hour))continue;
  periods.push({
   startTime:day(d)+'T'+String(hour).padStart(2,'0')+':00:00-05:00',
   temperature:options.temperature?.(d,hour)??20+d*5+hour-10,
   temperatureUnit:'F',windSpeed:options.wind?.(d,hour)??(5+d)+' mph',
   shortForecast:options.forecast?.(d,hour)??(d===5?'Chance of Rain':'Partly Sunny')
  });
 }
 return {properties:{updateTime:options.updatedAt||'2026-12-12T14:00:00Z',periods}};
}
function forecast(){
 const body=feed();return {...Live.parseHourly(body,day(0),now),weekTrend:Trend.summarize(body,now)};
}
test('NWS actual dated hourly rows produce seven daytime range forecasts, not measured history',()=>{
 const d=Trend.summarize(feed(),now);
 assert.equal(d.status,'forecast');assert.equal(d.days.length,7);
 assert.ok(d.days.every(x=>x.status==='complete'&&x.hours===7));
 assert.equal(d.days[0].lowF,20);assert.equal(d.days[0].highF,26);
 assert.equal(d.days[6].lowF,50);
 assert.match(d.meaning,/not past weather/);
});
test('a shorter selected-day window is explicitly partial; fewer than five hours stays unavailable',()=>{
 const p=Trend.summarize(feed({omit:['1:15','1:16','2:13','2:14','2:15','2:16']}),now);
 assert.equal(p.days[1].status,'partial');assert.equal(p.days[1].hours,5);
 assert.equal(p.days[2].status,'unavailable');assert.equal(p.days[2].hours,3);
 assert.equal(p.days[2].lowF,null);assert.equal(p.days[2].highF,null);
});
test('stale or invalid NWS updates cannot power future outlook charts',()=>{
 for(const body of [null,{},feed({updatedAt:'2026-12-10T00:00:00Z'}),
 feed({updatedAt:'unparsable'})]){
  assert.equal(Trend.summarize(body,now).status,'unavailable');
  assert.deepEqual(Trend.summarize(body,now).days,[]);
 }
});
test('hourly period duplicates, invalid wind units and missing temperature are not interpreted as new data',()=>{
 const d=feed();
 d.properties.periods.push({...d.properties.periods[0]});
 d.properties.periods[1].windSpeed='unknown';
 d.properties.periods[2].temperature=null;
 const p=Trend.summarize(d,now);
 assert.equal(p.days[0].hours,5);
 assert.equal(p.days[0].status,'partial');
 const selected=Live.parseHourly(d,day(0),now);
 assert.equal(selected.targetCovered,true);
 assert.ok(selected.timeline.every(x=>Number.isFinite(x.windMph)&&Number.isFinite(x.temperatureF)));
 assert.equal(selected.hours,5);
});
test('zero wind is a valid NWS value and never becomes missing data',()=>{
 const d=feed({wind:()=> '0 mph'});
 assert.equal(Trend.summarize(d,now).days[0].maxWindMph,0);
 const p=Live.parseHourly(d,day(0),now);
 assert.equal(p.windMph,0);
});
test('visual week graph contains seven keyboard-selectable real forecast dates',()=>{
 const f=forecast();
 const html=Visuals.render({forecast:f,snow:{kind:'modeled',depthInches:8.4,validDate:day(0)},
  alerts:{status:'verified',events:[]},selectedDate:day(0)});
 assert.equal((html.match(/data-wx-day=/g)||[]).length,7);
 assert.equal((html.match(/data-wx-hour=/g)||[]).length,7);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/FORECAST · NOT HISTORY/);
 assert.match(html,/32°F freezing threshold/);
 assert.match(html,/8\.4 in/);
 assert.match(html,/NOAA MODEL SNAPSHOT/);
 assert.match(html,/ALL UNVERIFIED/);
 assert.equal((html.match(/class="wx-access-item"/g)||[]).length,3);
});
test('trend narrative only compares complete NWS daytime windows and rejects fake snowmelt trends',()=>{
 const t=Trend.summarize(feed(),now);
 const msg=Visuals.trendAnalysis(t);
 assert.match(msg,/Warming signal/);
 assert.match(msg,/snow depth is NOT projected/);
 const sparse={status:'forecast',days:t.days.map((d,i)=>({...d,status:i===0?'complete':'partial'}))};
 assert.match(Visuals.trendAnalysis(sparse),/Not enough complete/);
});
test('missing NOAA snow never draws a zero snow marker or fabricated timeline',()=>{
 const html=Visuals.snowGauge({kind:'unavailable',depthInches:null});
 assert.match(html,/unavailable/);assert.doesNotMatch(html,/wx-snow-marker/);
 const render=Visuals.render({forecast:{weekTrend:{status:'unavailable',days:[]}},snow:{kind:'unavailable'},
  alerts:{status:'unavailable'},selectedDate:day(0)});
 assert.match(render,/Seven-day outlook unavailable/);
 assert.match(render,/Alert feed unavailable/);
 assert.doesNotMatch(render,/data-wx-day=/);
});
test('NWS malicious descriptions are escaped inside rendered SVG and accessible hour descriptions',()=>{
 const body=feed({forecast:()=>'<img src=x onerror=alert(1)>'});
 const p=Live.parseHourly(body,day(0),now);
 const html=Visuals.hourlyChart(p.timeline);
 assert.ok(!html.includes('<img'));
 assert.match(html,/&lt;img/);
});
test('visuals use CSS for truthful depth scale and do not infer snow depth trend',()=>{
 const html=Visuals.snowGauge({kind:'modeled',depthInches:16,validDate:day(0)});
 assert.match(html,/left:100\.00%/);
 assert.match(html,/16 in/);
 assert.match(html,/not a trail measurement, historical snow trend/);
 assert.ok(!html.includes('No snow tomorrow'));
});
test('client chart interaction chooses dates and updates active hourly explanation',()=>{
 let captured=null;
 const nodes={};
 const root={
  addEventListener:(event,handler)=>{nodes[event]=handler},
  contains:()=>true,querySelector:()=>({textContent:''}),querySelectorAll:()=>[]
 };
 Visuals.bind(root,{onDayChange:d=>captured=d});
 nodes.click({target:{closest:()=>({getAttribute:k=>k==='data-wx-day'?day(2):null})}});
 assert.equal(captured,day(2));
});
test('forecast trend integration adds no fifth upstream network call',async()=>{
 const body=feed(),calls=[];
 const noaa={results:[
  {layerId:2,attributes:{idp_validtime:'12/12/2026 8:00:00 AM'}},
  {layerId:3,attributes:{'Service Pixel Value':'.15'}}
 ]};
 const read=async url=>{
  calls.push(url);
  if(url.includes('NOHRSC_Snow_Analysis'))return noaa;
  if(url.includes('/points/'))return {properties:{forecastHourly:'https://api.weather.gov/gridpoints/APX/35,42/forecast/hourly'}};
  if(url.includes('/gridpoints/'))return body;
  if(url.includes('/alerts/active'))return {features:[]};
  throw Error('Unexpected request');
 };
 const p=await Live.getTripEvidence({lat:44.65728,lon:-85.44774},day(1),{fetchJson:read,cache:new Map(),now});
 assert.equal(calls.length,4);
 assert.equal(p.forecast.weekTrend.days.length,7);
 assert.equal(p.forecast.targetCovered,true);
 assert.equal(p.forecast.timeline.length,7);
 assert.equal(p.snow.kind,'modeled');
 assert.equal(p.alerts.status,'verified');
});
