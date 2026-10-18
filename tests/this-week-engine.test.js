'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../public/assets/this-week-engine.js');
const date=Date.parse('2027-02-12T15:00:00Z'),recent='2027-02-12T14:00:00Z';
const forecastDays=[{date:'2027-02-12',highF:45,lowF:21,snowHours:0,thawHours:7},{date:'2027-02-13',highF:42,lowF:20,snowHours:0,thawHours:6},{date:'2027-02-14',highF:40,lowF:18,snowHours:0,thawHours:5}];
test('all weekly cards use one shared interpretive schema with no forecast probability',()=>{
 for(const item of [
   E.shed({season:'SEARCH_SEASON',forecastUpdatedAt:recent,daily:forecastDays,snowDepth:{status:'modeled-bare'}},date,'Bay City'),
   E.maple({phase:'WEATHER_WINDOW',fetchedAt:recent,daily:forecastDays,summary:{bestDay:'2027-02-12',bestScore:91,bestLevel:'FAVORABLE',evaluatedDays:3}},date),
   E.rock({generatedAt:recent,sources:{wind:{status:'live'},alerts:{status:'live'}},sites:[{id:'petoskey-state-park',verdict:{code:'PRIME',label:'Freshly worked: go'}}]},date),
   E.eagle()
 ]){
  for(const prop of ['id','state','headline','reason','trigger','source','scope'])assert.equal(typeof item[prop],'string',prop);
  assert.ok(!('probability' in item));
 }
});
test('shed is not an antler casting date model and never issues a go status on NOAA snow alone',()=>{
 const input={season:'SEARCH_SEASON',forecastUpdatedAt:recent,daily:forecastDays,snowDepth:{status:'modeled-bare'}};
 assert.equal(E.shed(input,date).state,'check');
 assert.match(E.shed(input,date).reason,/unverified/i);
 assert.equal(E.shed({...input,snowDepth:{status:'modeled-cover'}},date).state,'check');
 assert.equal(E.shed({...input,season:'OFF_SEASON'},date).state,'seasonal');
 assert.equal(E.shed({...input,forecastUpdatedAt:'2026-01-01T00:00:00Z'},date).state,'unavailable');
});
test('maple only recommends checking trees based on hourly weather',()=>{
 const input={phase:'WEATHER_WINDOW',fetchedAt:recent,daily:forecastDays,summary:{bestDay:'2027-02-13',bestScore:86,bestLevel:'FAVORABLE',evaluatedDays:4}};
 const x=E.maple(input,date);assert.equal(x.state,'opportunity');assert.match(x.reason,/not measured sap flow/i);assert.match(x.reason,/Feb 13/);
 assert.equal(E.maple({...input,phase:'OFF_SEASON',fetchedAt:null},date).state,'seasonal');
 assert.equal(E.maple({...input,fetchedAt:'2027-02-08T00:00:00Z'},date).state,'unavailable');
 assert.equal(E.maple({...input,summary:{bestDay:null,bestScore:null,bestLevel:'INSUFFICIENT',evaluatedDays:0}},date).state,'check');
});
test('rock excludes National Park collecting sites and demands observed source coverage',()=>{
 const sample={generatedAt:recent,sources:{wind:{status:'live'},alerts:{status:'live'}},sites:[
   {id:'miners-beach',verdict:{code:'PRIME',label:'Freshly worked: go'}},
   {id:'petoskey-state-park',verdict:{code:'GOOD',label:'Recently stirred'}}
 ]};
 assert.equal(E.rock(sample,date).state,'check');
 assert.match(E.rock(sample,date).reason,/Petoskey State Park/);
 assert.ok(!E.ROCK_NAMES['miners-beach']);
 assert.ok(!E.ROCK_NAMES['glen-haven']);
 assert.equal(E.rock({...sample,sources:{wind:{status:'live'},alerts:{status:'unavailable'}}},date).state,'unavailable');
 assert.equal(E.rock({...sample,generatedAt:'2027-02-11T01:00:00Z'},date).state,'unavailable');
});
test('rock uses current per-shore hazards rather than announcing a statewide all-clear',()=>{
 const data={generatedAt:recent,sources:{wind:{status:'live'},alerts:{status:'live'}},sites:[
  {id:'frankfort-beach',verdict:{code:'STORM'}},{id:'crisp-point',verdict:{code:'BUILDING'}}
 ]};
 assert.equal(E.rock(data,date).state,'wait');
 const safe={...data,sites:[...data.sites,{id:'agate-beach-grand-marais',verdict:{code:'PRIME',label:'Freshly worked: go'}}]};
 const result=E.rock(safe,date);
 assert.equal(result.state,'opportunity');assert.match(result.trigger,/exact warnings/i);
});
test('eagle never claims a current observation or a dance probability',()=>{
 const item=E.eagle();
 assert.equal(item.state,'context');
 assert.match(item.reason,/does not confirm/i);
});
test('tool hub loads the actual engine, shows three source-backed lanes and one explicitly interpretive lane',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/tools/index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../public/assets/this-week.js'),'utf8');
 assert.match(html,/id="this-week"/);assert.match(html,/id="week-region"/);
 for(const id of ['shed','maple','rock','eagle'])assert.match(html,new RegExp('id="week-'+id+'"'));
 assert.match(html,/\/assets\/this-week-engine\.js/);assert.match(html,/\/assets\/this-week\.js/);
 assert.match(js,/Promise\.allSettled\(requests\)/);
 assert.match(js,/\/api\/shed-antlers/);assert.match(js,/\/api\/maple-sap/);assert.match(js,/\/api\/michigan-rockhounding/);
 assert.doesNotMatch(js,/\bMath\.random\b/);
});
