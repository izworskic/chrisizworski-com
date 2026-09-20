"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  seasonState, buildDecision, isTrail7Segment
} = require("../lib/snowmobile-engine.js");

function trail(status="Open") {
  return {
    type:"Feature",
    properties:{
      GlobalID:"trail7-a",
      TrailNamePrimary:"Trail 7",
      SnowmobileName:"7",
      OpenClosedStatusSnowmobile:status,
      TrailGroomType:"Groomed",
      TrailGrooming:"Test sponsor",
      SegmentLengthMiles:10,
      County:"Crawford"
    },
    geometry:{type:"LineString",coordinates:[[-84.72,44.66],[-84.70,44.80]]}
  };
}

function weather(now) {
  return [{
    id:"grayling",name:"Grayling",retrievedAt:now.toISOString(),
    hourly:Array.from({length:24},(_,i)=>({
      startTime:new Date(now.getTime()+i*3600000).toISOString(),
      temperature:27,shortForecast:"Mostly Clear"
    }))
  }];
}

function bundle(now, report) {
  return {
    dnr:{retrievedAt:now.toISOString(),trails:{features:[trail()]},closures:{features:[]},reroutes:{features:[]}},
    weather:weather(now),
    reports:report ? [report] : []
  };
}

test("September is preseason and cannot produce a ride score", () => {
  const now = new Date("2026-09-19T16:00:00-04:00");
  assert.equal(seasonState(now).state,"PRESEASON");
  const d=buildDecision(bundle(now,null),now);
  assert.equal(d.condition.label,"PRESEASON");
  assert.equal(d.condition.score,null);
});

test("weather alone cannot create an in-season trail score", () => {
  const now = new Date("2027-01-15T10:00:00-05:00");
  const d=buildDecision(bundle(now,null),now);
  assert.equal(d.routeStatus.state,"OPEN_NO_CLOSURE_FOUND");
  assert.equal(d.condition.label,"EVIDENCE GAP");
  assert.equal(d.condition.score,null);
});

test("fresh operator evidence can support a scored condition", () => {
  const now = new Date("2027-01-15T10:00:00-05:00");
  const report={available:true,reportedAt:now.toISOString(),retrievedAt:now.toISOString(),condition:"GOOD",authorityWeight:1};
  const d=buildDecision(bundle(now,report),now);
  assert.equal(d.condition.label,"GOOD");
  assert.ok(d.condition.score >= 80);
});

test("stale report is not promoted by a fresh retrieval timestamp", () => {
  const now = new Date("2027-01-15T10:00:00-05:00");
  const report={available:true,reportedAt:"2026-03-06T10:00:00Z",retrievedAt:now.toISOString(),condition:"EXCELLENT",authorityWeight:1};
  const d=buildDecision(bundle(now,report),now);
  assert.equal(d.reports[0].freshnessState,"STALE");
  assert.equal(d.condition.score,null);
});

test("officially closed Trail 7 breaks the route", () => {
  const now = new Date("2027-01-15T10:00:00-05:00");
  const b=bundle(now,{available:true,reportedAt:now.toISOString(),retrievedAt:now.toISOString(),condition:"GOOD"});
  b.dnr.trails.features=[trail("Closed")];
  const d=buildDecision(b,now);
  assert.equal(d.routeStatus.state,"ROUTE_BROKEN");
  assert.equal(d.condition.score,null);
});

test("route isolation excludes a different trail number", () => {
  assert.equal(isTrail7Segment({trailNamePrimary:"Trail 7",snowmobileName:"7",name:"Trail 7"}),true);
  assert.equal(isTrail7Segment({trailNamePrimary:"Trail 4",snowmobileName:"4",name:"Trail 4"}),false);
});
