"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {execFileSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("Detroit broad board emits bounded product observation telemetry",()=>{
  const js=read("public/assets/detroit-outdoors.js");
  assert.doesNotThrow(()=>new Function(js));
  for(const event of [
    "detroit_board_observation",
    "detroit_editorial_observation",
    "detroit_hero_observation",
    "detroit_live_failure",
    "detroit_outdoors_handoff"
  ]) assert.match(js,new RegExp(event));
  assert.match(js,/data-candidate-id=/);
  assert.match(js,/data-source-engine=/);
  assert.match(js,/data-place-id=/);
  assert.match(js,/accepted_count/);
  assert.match(js,/rejected_count/);
  assert.match(js,/retry_count/);
  assert.match(js,/reassigned_count/);
  assert.match(js,/repeated_previous/);
  assert.match(js,/degraded_source_count/);
  assert.match(js,/sessionStorage/);
  assert.match(js,/localStorage\.getItem\(key\)/);
});

test("Detroit focused pages emit candidate-bound state and editorial observations",()=>{
  const js=read("public/assets/detroit-intent.js");
  assert.doesNotThrow(()=>new Function(js));
  assert.match(js,/detroit_intent_observation/);
  assert.match(js,/detroit_intent_editorial/);
  assert.match(js,/detroit_live_failure/);
  assert.match(js,/candidate_id/);
  assert.match(js,/source_engine/);
  assert.match(js,/cache_hit/);
  assert.match(js,/note_present/);
  assert.match(js,/reassigned/);
  assert.match(js,/currentCandidate/);
  assert.doesNotMatch(js,/geolocation|latitude|longitude/);
});

test("Detroit observation ledger and growth benchmark agree on telemetry contract",()=>{
  const ledger=JSON.parse(read("benchmarks/detroit-discovery-observation.json"));
  const growth=JSON.parse(read("benchmarks/detroit-outdoors-growth.json"));
  const contract=ledger.telemetryContract||{};
  const required=[
    "detroit_board_observation",
    "detroit_editorial_observation",
    "detroit_hero_observation",
    "detroit_intent_observation",
    "detroit_intent_editorial",
    "detroit_live_failure",
    "detroit_outdoors_handoff",
    "detroit_growth_handoff"
  ];
  for(const event of required){
    assert.ok(growth.events.includes(event),`benchmark missing ${event}`);
    assert.ok(contract[event],`ledger missing telemetry contract for ${event}`);
    assert.ok(Array.isArray(contract[event].keyParameters)&&contract[event].keyParameters.length>0,`missing parameters for ${event}`);
  }
  assert.ok(ledger.snapshots.every(snapshot=>snapshot.adsense&&Object.hasOwn(snapshot.adsense,"adImpressions")));
  assert.ok(ledger.snapshots.every(snapshot=>snapshot.ga4&&Object.hasOwn(snapshot.ga4,"liveFailures")));
});

test("Detroit discovery report accepts the expanded observation schema",()=>{
  const out=execFileSync(process.execPath,[path.join(root,"scripts/report-detroit-discovery.mjs"),"--check"],{encoding:"utf8"});
  assert.match(out,/Product observations:/);
  assert.match(out,/AdSense observation:/);
  assert.match(out,/missingTelemetry/);
  assert.match(out,/report:detroit-discovery PASS/);
});
