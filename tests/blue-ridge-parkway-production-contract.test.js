"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const api=require("../api/blue-ridge-parkway.js");
const T=api._test;

test("Blue Ridge response makes NWS source truth match unavailable selected-route weather",()=>{
  const payload={
    ok:true,
    input:{hours:3},
    selected:{id:"selected",durationHours:2.5,direction:"northbound",cautions:[],weather:{ok:false},viewOutlook:{tone:"unknown"}},
    alternatives:[],
    sources:[{name:"National Weather Service",url:"https://www.weather.gov/",status:"live",updated:null,note:"old"}]
  };
  const result=T.enrichPayload(payload);
  const nws=result.sources.find(s=>s.name==="National Weather Service");
  assert.equal(nws.status,"unavailable");
  assert.match(nws.note,/could not be loaded/i);
  assert.match(nws.note,/No gateway-city forecast was substituted/i);
});

test("Blue Ridge response exposes the actual NWS selected-route source when available",()=>{
  const source="https://api.weather.gov/gridpoints/GSP/55,61/forecast/hourly";
  const updatedAt="2026-09-24T20:00:00Z";
  const payload={
    ok:true,
    input:{hours:4},
    selected:{id:"selected",durationHours:3.2,direction:"southbound",cautions:[],weather:{ok:true,source,updatedAt},viewOutlook:{tone:"good"}},
    alternatives:[],
    sources:[{name:"National Weather Service",url:"https://www.weather.gov/",status:"live",updated:null,note:"old"}]
  };
  const nws=T.enrichPayload(payload).sources.find(s=>s.name==="National Weather Service");
  assert.equal(nws.status,"live");
  assert.equal(nws.url,source);
  assert.equal(nws.updated,updatedAt);
});

test("Blue Ridge response explains why every alternative lost",()=>{
  const payload={
    ok:true,
    input:{hours:3},
    selected:{id:"selected",durationHours:2.5,direction:"northbound",cautions:[],weather:{ok:true},viewOutlook:{tone:"good"}},
    alternatives:[
      {id:"closed",blocked:true,durationHours:2,direction:"northbound",cautions:[],weather:{ok:true},viewOutlook:{tone:"good"}},
      {id:"long",blocked:false,durationHours:4,direction:"southbound",cautions:[],weather:{ok:true},viewOutlook:{tone:"good"}}
    ],
    sources:[]
  };
  const result=T.enrichPayload(payload);
  assert.match(result.alternatives[0].whyNotSelected,/closure/i);
  assert.match(result.alternatives[1].whyNotSelected,/does not fit/i);
});

test("Blue Ridge client renders route tradeoffs and product measurement events",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../public/assets/blue-ridge-parkway.js"),"utf8");
  assert.match(source,/whyNotSelected/);
  for(const event of[
    "blue_ridge_planner_complete",
    "blue_ridge_gateway_change",
    "blue_ridge_maps_handoff",
    "blue_ridge_map_interaction",
    "blue_ridge_source_click",
    "blue_ridge_share",
    "blue_ridge_print"
  ])assert.match(source,new RegExp(event));
});
