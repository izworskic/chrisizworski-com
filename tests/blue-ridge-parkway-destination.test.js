"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const P=require("../lib/blue-ridge-parkway/point-to-point.js")._test;
const api=require("../api/blue-ridge-parkway.js")._test;

test("destination input preserves round-trip default and accepts a distinct finish",()=>{
  assert.equal(P.normalizeInput({gateway:"asheville"}).finish,"return");
  assert.equal(P.normalizeInput({gateway:"asheville",finish:"asheville"}).finish,"return");
  const point=P.normalizeInput({gateway:"asheville",finish:"cherokee",hours:12});
  assert.equal(point.finish,"cherokee");
  assert.equal(point.tripMode,"point-to-point");
  assert.equal(point.hours,12);
});

test("point-to-point hours can extend beyond the old eight-hour round-trip ceiling",()=>{
  assert.equal(P.normalizeInput({gateway:"roanoke",finish:"asheville",hours:16}).hours,16);
  assert.equal(P.normalizeInput({gateway:"roanoke",finish:"return",hours:16}).hours,8);
});

test("corridor stops follow the requested direction",()=>{
  const south=P.corridorStops("asheville","cherokee");
  assert.ok(south.length>=5);
  assert.ok(south.some(s=>s.id==="mount-pisgah"));
  assert.ok(south.some(s=>s.id==="waterrock-knob"));
  assert.ok(south.every((s,i)=>i===0||south[i-1].milepost<=s.milepost));
  const north=P.corridorStops("cherokee","asheville");
  assert.equal(north.length,south.length);
  assert.ok(north.every((s,i)=>i===0||north[i-1].milepost>=s.milepost));
});

test("point-to-point mileage is one-way, not doubled",()=>{
  const input=P.normalizeInput({gateway:"asheville",finish:"cherokee",hours:6,interests:"scenery,photography"});
  const route=P.buildCandidates(input)[0];
  assert.equal(P.routeMiles(route),85);
});

test("all generated candidate plans keep start and finish fixed",()=>{
  const input=P.normalizeInput({gateway:"asheville",finish:"cherokee",hours:6,interests:"scenery,photography"});
  const routes=P.buildCandidates(input);
  assert.ok(routes.length>=2);
  for(const route of routes){
    assert.equal(route.gateway,"asheville");
    assert.equal(route.finish,"cherokee");
    assert.equal(route.tripMode,"point-to-point");
    assert.equal(route.startMile,384.1);
    assert.equal(route.turnMile,469.1);
  }
});

test("direct plan protects arrival time and richer variants add only corridor stops",()=>{
  const input=P.normalizeInput({gateway:"asheville",finish:"cherokee",hours:7,interests:"fall-color,photography,short-walk"});
  const routes=P.buildCandidates(input),direct=routes.find(r=>r.variant==="direct");
  assert.ok(direct);
  assert.deepEqual(direct.stopIds,[]);
  const richer=routes.filter(r=>r.variant!=="direct");
  assert.ok(richer.some(r=>r.stopIds.length>0));
  assert.ok(richer.every(r=>P.modeledDuration(r)>=P.modeledDuration(direct)));
});

test("same-destination alternatives explain stop tradeoffs rather than direction changes",()=>{
  const selected={tripMode:"point-to-point",stops:[{id:"a"},{id:"b"}],durationHours:4,blocked:false};
  const more={tripMode:"point-to-point",stops:[{id:"a"},{id:"b"},{id:"c"}],durationHours:4.8,blocked:false};
  const fewer={tripMode:"point-to-point",stops:[{id:"a"}],durationHours:3.6,blocked:false};
  assert.match(api.alternativeReason(selected,more,{hours:6}),/optional stops|arrival-time margin/i);
  assert.match(api.alternativeReason(selected,fewer,{hours:6}),/gives up stops|interests/i);
});

test("browser planner exposes Finish and sends it to the API",()=>{
  const source=fs.readFileSync(path.join(__dirname,"..","public","assets","blue-ridge-parkway.js"),"utf8");
  assert.match(source,/id=\"finish\"/);
  assert.match(source,/finish:\$\("finish"\)/);
  assert.match(source,/Back where I started/);
  assert.match(source,/finishGateway/);
});

test("Finish is present in static planner markup and the asset is cache-busted",()=>{
  const html=fs.readFileSync(path.join(__dirname,"..","public","blue-ridge-parkway","index.html"),"utf8");
  assert.match(html,/<label for="finish">Finish<\/label>/);
  assert.match(html,/<select id="finish">/);
  assert.match(html,/Back where I started/);
  assert.match(html,/blue-ridge-parkway\.js\?v=20260925-5/);
});


test("all selected activities survive normalization",()=>{
  const interests="scenery,fall-color,short-walk,waterfall,photography,history,picnic,sunset";
  assert.equal(P.normalizeInput({gateway:"cherokee",finish:"roanoke",hours:12,interests}).interests.length,8);
});

test("Cherokee to Roanoke uses spare time for activity stops when twelve hours are available",()=>{
  const interests="scenery,fall-color,short-walk,waterfall,photography,history,picnic,sunset";
  const input=P.normalizeInput({gateway:"cherokee",finish:"roanoke",hours:12,interests});
  assert.ok(P.nonstopMinutes(input)/60>10.5);
  assert.ok(P.nonstopMinutes(input)/60<11.5);
  const routes=P.buildCandidates(input);
  assert.ok(routes.some(route=>route.stopIds.length>0));
  const stopIds=new Set(routes.flatMap(route=>route.stopIds));
  assert.ok(stopIds.size>0);
});

test("browser keeps every checked activity and auto-fits point-to-point time",()=>{
  const source=fs.readFileSync(path.join(__dirname,"..","public","assets","blue-ridge-parkway.js"),"utf8");
  assert.doesNotMatch(source,/selectedInterests\(\).*slice\(0,4\)/);
  assert.match(source,/corridorDriveHours/);
  assert.match(source,/syncHours\(true\)/);
  const html=fs.readFileSync(path.join(__dirname,"..","public","blue-ridge-parkway","index.html"),"utf8");
  assert.match(html,/id="corridorBudget"/);
});


test("trip results foreground selected-stop detail and collapse normal planner machinery",()=>{
  const html=fs.readFileSync(path.join(__dirname,"..","public","blue-ridge-parkway","index.html"),"utf8");
  const source=fs.readFileSync(path.join(__dirname,"..","public","assets","blue-ridge-parkway.js"),"utf8");
  assert.match(html,/id="selectedStopSummary"/);
  assert.match(html,/id="selectedStopDetails"/);
  assert.match(html,/<details class="trip-technical">/);
  assert.match(html,/Trip details &amp; sources/);
  assert.match(html,/id="roadAlertSection" hidden/);
  assert.ok(html.indexOf('id="selectedStopDetails"') < html.indexOf('<details class="trip-technical">'));
  assert.ok(html.indexOf('id="roadAlertSection"') < html.indexOf('<details class="trip-technical">'));
  assert.match(source,/function renderSelectedStopDetails/);
  assert.match(source,/Why it made your trip/);
  assert.match(source,/What to do here/);
  assert.match(source,/renderSelectedStopDetails\(payload\)/);
  assert.match(source,/alert\.hidden=!urgent\.length/);
});


test("round-trip mode preserves every checked activity",()=>{
  const engine=require("../lib/blue-ridge-parkway/engine.js")._test;
  const interests="scenery,fall-color,short-walk,waterfall,photography,history,picnic,sunset";
  assert.equal(engine.normalizeInput({gateway:"asheville",hours:8,interests}).interests.length,8);
});

test("selected-stop summary uses returned interests with checked-box fallback",()=>{
  const source=fs.readFileSync(path.join(__dirname,"..","public","assets","blue-ridge-parkway.js"),"utf8");
  assert.match(source,/responseInterests/);
  assert.match(source,/checkedInterests=selectedInterests\(\)/);
  assert.match(source,/Your selections:/);
  const html=fs.readFileSync(path.join(__dirname,"..","public","blue-ridge-parkway","index.html"),"utf8");
  assert.match(html,/blue-ridge-parkway\.js\?v=20260925-5/);
});
