"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const engine=require("../lib/blue-ridge-parkway/engine.js");
const {ROUTES,routesForGateway,stopsForRoute}=require("../lib/blue-ridge-parkway/catalog.js");
const T=engine._test;

const ROAD_HTML=`
<h3>Road status as of 7:30 A.M, Wednesday, September 23, 2026.</h3>
<p>Status is subject to change throughout the day after the page has been updated.</p>
<table>
<tr><td>61.4 - 66.3</td><td>VA Route 130 to VA Route 501</td><td>Partially closed</td><td>CLOSED from MP 63.5 - MP 63.9 for Bridge rehabilitation. Detour signs in place from MP 61.4 - MP 64.</td></tr>
<tr><td>261.2 - 276.4</td><td>NC-16 to US 421</td><td>Ungated</td><td>Full closure around the Deep Gap Bridge for repairs MP 274.3 - MP 276.5 with signed detour from MP 269.8 to MP 276.5.</td></tr>
<tr><td>324.7 - 330.9</td><td>Jacksontown to NC 226</td><td>Closed</td><td>OPEN from milepost 327.5 - milepost 330.9. Recreation of any kind is PROHIBITED in this section. (MP 324.7-327.5)</td></tr>
<tr><td>355.3 - 364.5</td><td>NC 128 to Craggy Gardens</td><td>Open</td><td></td></tr>
<tr><td>364.5 - 367.6</td><td>Craggy tunnel to picnic area</td><td>Open</td><td>Craggy Gardens Picnic Area CLOSED for a facility closure.</td></tr>
</table>`;

function deterministicFrontRunner({gateway,hours,interests,date="2026-07-15",road={rows:[]},weather={ok:true,precipMax:10,windMax:8,forecast:["Mostly Sunny"]}}){
  const input=T.normalizeInput({gateway,hours,interests:interests.join(","),date,start:"09:00"});
  return routesForGateway(gateway)
    .map(route=>{
      const roadResult=T.roadAssessment(route,road);
      const foliage=T.foliageEstimate(route,date);
      return{route,road:roadResult,duration:T.modeledDuration(route),score:T.routeScore(route,input,roadResult,weather,foliage)};
    })
    .filter(x=>!x.road.blocked&&x.duration<=input.hours+.3)
    .sort((a,b)=>b.score-a.score)[0]||null;
}

test("road parser separates official open, partial and hard-closed milepost ranges",()=>{
  const road=T.parseRoadStatus(ROAD_HTML);
  assert.match(road.updatedLabel,/September 23, 2026/);
  assert.equal(road.rows.length,5);
  assert.deepEqual(road.rows[0].hardClosed,[{start:63.5,end:63.9}]);
  assert.deepEqual(road.rows[1].hardClosed,[{start:274.3,end:276.5}]);
  assert.deepEqual(road.rows[2].hardClosed,[{start:324.7,end:327.5}]);
  assert.deepEqual(road.rows[3].hardClosed,[]);
  assert.deepEqual(road.rows[4].hardClosed,[],"facility closure without a road mile range must not become a road closure");
});

test("a closure that cuts the Boone north route hard-vetoes that route",()=>{
  const road=T.parseRoadStatus(ROAD_HTML);
  const route=ROUTES.find(r=>r.id==="boone-doughton");
  const result=T.roadAssessment(route,road);
  assert.equal(result.blocked,true);
  assert.ok(result.blocks.some(x=>x.start===274.3&&x.end===276.5));
});

test("an open Asheville-Craggy stretch is not vetoed by an unrelated facility note",()=>{
  const road=T.parseRoadStatus(ROAD_HTML);
  const route=ROUTES.find(r=>r.id==="asheville-craggy");
  const result=T.roadAssessment(route,road);
  assert.equal(result.blocked,false);
});

test("fall color is explicitly a modeled seasonal estimate",()=>{
  const high=ROUTES.find(r=>r.id==="asheville-craggy");
  const fall=T.foliageEstimate(high,"2026-10-12");
  assert.equal(fall.active,true);
  assert.equal(fall.kind,"modeled");
  assert.match(fall.detail,/NPS does not predict an exact peak date|live canopy report/i);
  const summer=T.foliageEstimate(high,"2026-07-12");
  assert.equal(summer.active,false);
});

test("modeled duration includes road time and planned stops",()=>{
  const route=ROUTES.find(r=>r.id==="asheville-graveyard");
  assert.ok(T.modeledDuration(route)>=route.minHours);
  assert.equal(T.routeMiles(route),76.6);
});

test("timeline converts a route into field-usable arrival and return times",()=>{
  const route=ROUTES.find(r=>r.id==="asheville-craggy");
  const timeline=T.routeTimeline(route,stopsForRoute(route),{startMinutes:540},T.modeledDuration(route));
  assert.equal(timeline.start,"9:00 AM");
  assert.match(timeline.returnBy,/AM|PM/);
  assert.equal(timeline.items.length,2);
  assert.equal(timeline.items[0].name,"Folk Art Center");
});

test("view outlook is conservative and explicitly forecast-derived",()=>{
  const poor=T.viewOutlook({ok:true,precipMax:80,windMax:10,forecast:["Rain"]});
  assert.equal(poor.label,"Limited");
  assert.match(poor.detail,/forecast/i);
  const good=T.viewOutlook({ok:true,precipMax:10,windMax:8,forecast:["Mostly Sunny"]});
  assert.equal(good.label,"Promising");
});

test("anti-slop writer gate rejects tourism filler",()=>{
  assert.equal(T.writerPasses("A practical route with two stops and enough time to walk them."),true);
  assert.equal(T.writerPasses("Discover a breathtaking hidden gem for the perfect day."),false);
});

const PERSONA_BENCHMARKS=[
  ["Asheville · 3h · scenery + short walk","asheville",3,["scenery","short-walk"],"asheville-craggy"],
  ["Asheville · 4h · high elevation + photography","asheville",4,["high-elevation","photography"],"asheville-mitchell"],
  ["Asheville · 4h · history + picnic","asheville",4,["history","picnic"],"asheville-pisgah"],
  ["Asheville · 6h · waterfall + short walk","asheville",6,["waterfall","short-walk"],"asheville-graveyard"],
  ["Boone · 3.5h · history + short walk","boone",3.5,["history","short-walk"],"boone-high-country"],
  ["Boone · 5h · waterfall + photography","boone",5,["waterfall","photography"],"boone-linville"],
  ["Boone · 5h · picnic + history","boone",5,["picnic","history"],"boone-doughton"],
  ["Roanoke · 3.5h · short walk + picnic","roanoke",3.5,["short-walk","picnic"],"roanoke-peaks"],
  ["Roanoke · 5.5h · history + photography","roanoke",5.5,["history","photography"],"roanoke-mabry"],
  ["Floyd · 3h · picnic + scenery","floyd",3,["picnic","scenery"],"floyd-north"],
  ["Floyd · 4h · history + photography","floyd",4,["history","photography"],"floyd-mabry"],
  ["Afton · 3h · hike + history","afton",3,["hike","history"],"afton-humpback"],
  ["Cherokee · 2.5h · sunset + short walk","cherokee",2.5,["sunset","short-walk"],"cherokee-waterrock"],
  ["Cherokee · 4h · high elevation + photography","cherokee",4,["high-elevation","photography"],"cherokee-balsam"],
  ["Cherokee · 5h · high elevation + fall color","cherokee",5,["high-elevation","fall-color"],"cherokee-balsam"]
];

test("15 representative visitor scenarios keep the expected deterministic front-runner before JEV",()=>{
  for(const [label,gateway,hours,interests,expected] of PERSONA_BENCHMARKS){
    const winner=deterministicFrontRunner({gateway,hours,interests});
    assert.equal(winner?.route?.id,expected,label);
  }
});

test("13 hard benchmark invariants preserve truth and the JEV closed-set boundary",()=>{
  const road=T.parseRoadStatus(ROAD_HTML);
  const source=fs.readFileSync(path.join(__dirname,"../lib/blue-ridge-parkway/engine.js"),"utf8");
  const asheville2=T.normalizeInput({gateway:"asheville",hours:2,interests:"scenery",date:"2026-10-12"});
  const craggy=ROUTES.find(r=>r.id==="asheville-craggy");
  const graveyard=ROUTES.find(r=>r.id==="asheville-graveyard");
  const doughton=ROUTES.find(r=>r.id==="boone-doughton");

  assert.equal(T.roadAssessment(doughton,road).blocked,true,"1 closure veto precedes preference selection");
  assert.equal(T.roadAssessment(craggy,road).blocked,false,"2 unrelated facility closure cannot block road geometry");
  assert.ok(T.modeledDuration(graveyard)>asheville2.hours+.3,"3 a long route remains infeasible for a 2-hour request");
  assert.equal(T.viewOutlook({ok:false}).label,"Unavailable","4 missing weather never becomes a good-view claim");
  assert.equal(T.foliageEstimate(craggy,"2026-10-12").kind,"modeled","5 foliage truth label remains modeled");
  assert.equal(T.foliageEstimate(craggy,"2026-07-12").active,false,"6 summer cannot fabricate fall color");
  assert.equal(T.writerPasses("Embark on an unforgettable journey awaits."),false,"7 writer gate rejects tourism filler");
  assert.equal(T.normalizeInput({gateway:"bogus",hours:99,start:"99:99",interests:"bogus"}).gateway,"asheville","8 invalid gateway normalizes safely");
  assert.equal(T.normalizeInput({hours:99}).hours,8,"9 requested time is bounded");
  assert.ok(T.routeMiles(craggy)>0&&T.modeledDuration(craggy)>=craggy.minHours,"10 geometry and dwell produce a positive conservative duration");
  assert.match(source,/feasible=all\.filter\(x=>!x\.road\.blocked&&x\.durationHours<=input\.hours\+\.3\)/,"11 feasible pool excludes blocked and materially overlong routes");
  assert.match(source,/Object\.fromEntries\(feasible\.slice\(0,4\)/,"12 JEV receives only the already-feasible finite option set");
  assert.match(source,/chosen=feasible\.find\(x=>x\.route\.id===jev\.choiceId\)\|\|fallback/,"13 an out-of-set JEV choice falls back instead of inventing a route");
});

test("crawlable page preserves canonical entity, correct Leaflet SRI and first-decision language",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../public/blue-ridge-parkway/index.html"),"utf8");
  const title=(html.match(/<title>(.*?)<\/title>/i)||[])[1]||"";
  const description=(html.match(/<meta name="description" content="([^"]+)"/i)||[])[1]||"";
  assert.ok(title.replace(/&amp;/g,"&").length<=60);
  assert.ok(description.length<=158);
  assert.match(html,/https:\/\/chrisizworski\.com\/blue-ridge-parkway\//);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/Drive the part of the Parkway worth your time\./);
  assert.match(html,/Which open section should I actually drive\?/);
  assert.match(html,/sha256-p4NxAoJBhIIN\+hmNHrzRCf9tD\/miZyoHS5obTRR9BMY=/);
  assert.doesNotMatch(html,/sha256-p4NxAoJBhIINfQ3yn5MZJoer0n8ZCkG\/kvUp6v\+S0w=/);
  assert.doesNotMatch(html,/breathtaking|hidden gem|perfect day/i);
  assert.doesNotMatch(html,/\bJEV\b|Anthropic|AI-powered/i);
});

test("benchmark document exists and sets a measurable target",()=>{
  const benchmark=fs.readFileSync(path.join(__dirname,"../docs/blue-ridge-parkway-benchmark.md"),"utf8");
  assert.match(benchmark,/Value function/);
  assert.match(benchmark,/Revised Blue Ridge Parkway tool/);
  assert.match(benchmark,/\*\*98\*\*/);
});
