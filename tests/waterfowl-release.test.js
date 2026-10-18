'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const api=require('../api/waterfowl-freeze-line.js');
const {parseDNR}=require('../lib/waterfowl-snow-surveys.js');
const {habitatShift}=require('../lib/waterfowl-habitat.js');

test('a shared overview deadline aborts stalled sources, preserves completed weather and covers queued regions',async t=>{
 const original=global.fetch;
 t.after(()=>{global.fetch=original;});
 let active=0,calls=0;
 global.fetch=async(url,{signal})=>{
  calls++;
  if(String(url).includes('/points/46.25,-87.05'))return {ok:true,json:async()=>({properties:{forecastHourly:'https://api.weather.gov/gridpoints/TEST/1/1/forecast/hourly'}})};
  if(String(url).includes('/gridpoints/TEST/'))return {ok:true,json:async()=>({properties:{periods:Array.from({length:24},(_,i)=>({startTime:new Date(Date.now()+i*3600000).toISOString(),temperature:40,temperatureUnit:'F'}))}})};
  assert.equal(signal.aborted,false,'do not start queued requests after the deadline');
  active++;
  return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{active--;reject(signal.reason);},{once:true}));
 };
 const started=Date.now();
 const result=await api._test.overview({deadlineMs:50});
 assert.ok(Date.now()-started<1500,'return partial data instead of waiting through serial source timeouts');
 assert.equal(result.regions.length,16);
 assert.equal(result.forecastCoverage,1);
 assert.equal(result.regions[0].weather.status,'forecast');
 assert.equal(result.regions.at(-1).weather.status,'unavailable');
 assert.equal(result.regions.at(-1).snowDepth.status,'unavailable');
 assert.equal(active,0,'all pending upstream requests must be aborted');
 assert.ok(calls<30,'queued regions must not launch a new round of requests after expiry');
});

const table=(group,rows)=>'<table><thead><tr><th>Week Ending:</th><th>Total '+group+':</th></tr></thead><tbody>'+rows.map(([date,count])=>'<tr><td>'+date+'</td><td>'+count+'</td></tr>').join('')+'</tbody></table>';
test('current geese cannot make a historical duck decline current, and each group retains its own age',()=>{
 const now=Date.parse('2026-10-18T17:00:00Z');
 const survey=parseDNR(table('ducks',[['8/25/2026',1000],['9/1/2026',500]])+table('geese',[['10/18/2026',900]]),now);
 assert.equal(survey.status,'reported');
 assert.equal(survey.ducks.status,'stale');
 assert.equal(survey.geese.status,'reported');
 assert.equal(survey.ducks.change,-500,'retain historical evidence without classifying it as current');
 assert.equal(habitatShift({surveys:{sites:[survey]}}).decliningSiteCounts,0);
 const reverse=parseDNR(table('ducks',[['10/18/2026',800]])+table('geese',[['9/1/2026',100]]),now);
 assert.equal(reverse.ducks.status,'reported');
 assert.equal(reverse.geese.status,'stale');
});

test('a late overview preserves the selected region survey-aware habitat evidence',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../public/waterfowl-freeze-line/app.js'),'utf8');
 const declaration=source.slice(source.indexOf('async function loadOverview(){'),source.indexOf("$('survey-site-select').addEventListener"));
 let finish;
 const local={id:'saginaw-bay',weather:{status:'unavailable'}};
 const detailHabitat={surveySitesWithCurrentCount:3,evidenceNote:'Dated managed-area evidence'};
 const context={byId:new Map([[local.id,local]]),LOCATIONS:[local],selected:local.id,ENDPOINT:'/api/waterfowl-freeze-line',
  getJson:()=>new Promise(resolve=>{finish=resolve;}),$:()=>({disabled:false}),setText:()=>{},
  renderOverview:()=>{},renderWeather:()=>{},renderNOAA:()=>{},renderSnowDepth:()=>{},renderHabitat:()=>{}};
 vm.createContext(context);
 vm.runInContext(declaration,context);
 const pending=context.loadOverview();
 local.surveys={sites:[{status:'reported'}]};
 local.habitatShift=detailHabitat;
 finish({regions:[{id:local.id,weather:{status:'forecast'},habitatShift:{surveySitesWithCurrentCount:null}}],generatedAt:new Date().toISOString()});
 await pending;
 assert.equal(local.habitatShift,detailHabitat);
 assert.equal(local.weather.status,'forecast');
});
