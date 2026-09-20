const test=require("node:test");
const assert=require("node:assert/strict");
const tuning=require("../lib/mackinac-island/tuning");

test("tuning ids are closed and deduplicated",()=>{
  assert.deepEqual(tuning.clean(["relaxed","relaxed","DROP","history"]),["relaxed","history"]);
});

test("less walking changes real planner mobility and visitor tolerance",()=>{
  const p=tuning.applyProfile({pace:"balanced",mobility:"standard",interests:[],must_do:[]},["less-walking"]);
  const v=tuning.applyVisitor({vector:{walking_tolerance:.7,pace:.6}},["less-walking"]);
  assert.equal(p.mobility,"limited");
  assert.equal(v.vector.walking_tolerance,.08);
  assert.ok(v.vector.pace<.6);
});

test("better dinner and history alter both planner and preference evidence",()=>{
  const p=tuning.applyProfile({dinner:"none",interests:[],must_do:[]},["better-dinner","history"]);
  const v=tuning.applyVisitor({vector:{food:.4,special_occasion:.3,budget_sensitivity:.5,history:.3,iconic_priority:.5}},["better-dinner","history"]);
  assert.equal(p.dinner,"sit-down");
  assert.ok(p.interests.includes("food")&&p.interests.includes("history"));
  assert.ok(p.must_do.includes("fort"));
  assert.ok(v.vector.food>.4&&v.vector.history>.3);
});

test("less downtown never removes arrival logistics but reduces shopping preference",()=>{
  const p=tuning.applyProfile({interests:["shopping","food"],must_do:[]},["less-downtown"]);
  const v=tuning.applyVisitor({vector:{crowd_avoidance:.5,shopping:.7,outdoors:.4}},["less-downtown"]);
  assert.ok(!p.interests.includes("shopping"));
  assert.ok(v.vector.shopping<.7);
  assert.ok(v.vector.crowd_avoidance>.5);
});
