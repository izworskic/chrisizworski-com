const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const root=fs.readFileSync("public/mackinac-island/index.html","utf8");
const js=fs.readFileSync("public/assets/mackinac-human-planner.js","utf8");
const css=fs.readFileSync("public/assets/mackinac-human-planner.css","utf8");

test("human planner assets parse and mount at the shared trip intake",()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(root,/mackinac-human-planner\.css\?v=20260921-human2/);
  assert.match(root,/mackinac-human-planner\.js\?v=20260921-human2/);
  assert.match(js,/shell\.id="trip-intake"/);
  assert.match(root,/id="legacy-trip-intake"/);
});

test("human planner asks for an earliest-leave constraint instead of requiring a guessed leave time",()=>{
  assert.match(js,/Earliest you can leave/);
  assert.match(js,/Leave this blank if you want the planner to tell you when to leave/);
  assert.match(js,/if\(state\.earliestLeave\)p\.set\("depart_at",state\.earliestLeave\)/);
  assert.doesNotMatch(js,/if\(!state\.earliestLeave\).*return false/);
});

test("missing trip facts fail soft without fabricated ferry precision",()=>{
  assert.match(js,/state\.tripDuration==="unsure"\|\|state\.dateMode==="flexible"\|\|state\.originMode==="later"/);
  assert.match(js,/frameworkResult\(\)/);
  assert.match(js,/We are stopping at the right boundary/);
  assert.match(js,/Exact ferry, weather, attraction and timing claims remain locked/);
});

test("movement is a core planning input",()=>{
  assert.match(js,/People \+ movement/);
  assert.match(js,/How should we treat walking and hills/);
  assert.match(js,/mobility:state\.walking==="low"\?"limited":"standard"/);
  assert.match(js,/walking_tolerance:state\.walking\|\|null/);
});

test("the primary result is a human journey rather than an unexplained score",()=>{
  assert.match(js,/Your first move/);
  assert.match(js,/Be at the dock/);
  assert.match(js,/On the Island/);
  assert.match(js,/Why this plan/);
  assert.match(js,/What to decide next/);
  assert.doesNotMatch(js,/score-ring/);
  assert.doesNotMatch(js,/\/100/);
});

test("overnight return is handled as a separate planning decision",()=>{
  assert.match(js,/Your return is a different decision/);
  assert.match(js,/Return day stays flexible until you give the planner a deadline/);
});

test("tuning preserves the shared trip instead of restarting intake",()=>{
  for(const value of ["relaxed","less-walking","outdoors","better-dinner","less-downtown","history"]){
    assert.match(js,new RegExp(value));
  }
  assert.match(js,/await rerun\(\)/);
  assert.match(js,/mackinac-trip-profile-v1/);
  assert.match(js,/mackinac-trip-plan-v1/);
});

test("legacy detail remains secondary and explicitly revealable",()=>{
  assert.match(css,/body\.mackinac-human-v2 \.hero/);
  assert.match(css,/body\.mackinac-human-v2 \.intake-wrap/);
  assert.match(css,/body\.mackinac-human-v2:not\(\.mackinac-human-details\) \.content-stack/);
  assert.match(js,/Show full live detail/);
});

test("mobile human planner has dedicated breakpoints",()=>{
  assert.match(css,/@media\(max-width:800px\)/);
  assert.match(css,/@media\(max-width:480px\)/);
});
