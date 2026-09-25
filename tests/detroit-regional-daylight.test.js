const test=require("node:test");
const assert=require("node:assert/strict");
const daylight=require("../lib/detroit-outdoors/regional-daylight.js");

function candidate(driveMinutes=30){
  return {
    id:"regional-test",
    sourceEngine:"regional-discovery",
    activity:"hiking",
    place:{id:"test",name:"Test Trail",lat:42.3314,lon:-83.0458},
    discovery:{driveMinutes},
    timeWindow:{label:"Today"},
    whyNow:"Current weather is favorable."
  };
}

test("Detroit regional daylight gate removes daylight outings after sunset",()=>{
  const now=new Date("2026-09-25T00:30:00Z"); // 8:30 PM EDT on Sep 24
  const decision=daylight._test.daylightDecision(candidate(20),now);
  assert.equal(decision.keep,false);
  assert.equal(decision.reason,"after-sunset");
});

test("Detroit regional daylight gate accounts for drive time before sunset",()=>{
  const now=new Date("2026-09-24T22:15:00Z"); // 6:15 PM EDT
  const near=daylight._test.daylightDecision(candidate(5),now);
  const far=daylight._test.daylightDecision(candidate(70),now);
  assert.equal(near.keep,true);
  assert.match(near.candidate.timeWindow.label,/Now–/);
  assert.equal(far.keep,false);
  assert.equal(far.reason,"insufficient-light-after-drive");
});

test("Detroit regional daylight gate exposes sunrise and sunset in the sealed candidate window",()=>{
  const now=new Date("2026-09-24T10:00:00Z"); // before sunrise EDT
  const decision=daylight._test.daylightDecision(candidate(20),now);
  assert.equal(decision.keep,true);
  assert.match(decision.candidate.timeWindow.label,/After sunrise/);
  assert.ok(decision.candidate.timeWindow.start);
  assert.ok(decision.candidate.timeWindow.end);
  assert.ok(decision.candidate.daylight.sunrise);
  assert.ok(decision.candidate.daylight.sunset);
});

test("regional daylight gating records suppressed-count diagnostics",()=>{
  const now=new Date("2026-09-25T00:30:00Z");
  const state={ok:true,data:{candidateCount:2,candidates:[candidate(10),{...candidate(20),id:"regional-test-2"}]}};
  const gated=daylight.applyRegionalDaylightGate(state,now);
  assert.equal(gated.data.candidateCount,0);
  assert.equal(gated.data.daylightSuppressedCount,2);
  assert.equal(gated.data.daylightSuppressed.length,2);
});
