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
