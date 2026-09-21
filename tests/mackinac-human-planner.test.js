const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const root=fs.readFileSync("public/mackinac-island/index.html","utf8");
const js=fs.readFileSync("public/assets/mackinac-human-planner.js","utf8");
const css=fs.readFileSync("public/assets/mackinac-human-planner.css","utf8");
const route=require("../lib/mackinac-island/route.js")._test;

test("human planner assets parse and mount at the shared trip intake",()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(root,/mackinac-human-planner\.css\?v=20260921-human2/);
  assert.match(root,/mackinac-human-planner\.js\?v=20260921-human2/);
  assert.match(js,/shell\.id="trip-intake"/);
  assert.match(root,/id="legacy-trip-intake"/);
});

test("human planner asks for an earliest-leave constraint instead of requiring a guessed leave time",()=>{
  assert.match(js,/I already know when I’m leaving/);
  assert.match(js,/Leave this blank if you want the planner to tell you when to leave/);
  assert.match(js,/if\(state\.earliestLeave\)p\.set\("depart_not_before",state\.earliestLeave\)/);
  assert.doesNotMatch(js,/if\(!state\.earliestLeave\).*return false/);
});

test("future trip without a supplied leave time calculates departure from the chosen ferry",()=>{
  const date="2026-09-20";
  const profile=route.profileFromQuery({
    origin_name:"Bay City, Michigan, US",
    origin_drive_minutes:"125",
    origin_preferred_port:"Mackinaw City",
    origin_mackinaw_minutes:"125",
    origin_st_ignace_minutes:"162"
  },["day-trip"],"lower");
  assert.equal(profile.departure_minutes,null);
  const ctx={
    date,personas:profile.personas,origin:"lower",profile,hourly:[],
    marine:{score:90},attractions:route.attractionState(date,7*60),events:[],
    sunrise:route.solarMinutes(date,45.8497,-84.6189,true),
    sunset:route.solarMinutes(date,45.8497,-84.6189,false),
    sameDay:false,nowMinutes:0
  };
  const records=[...route.arnoldSchedule(date,true),...route.sheplersSchedule(date,true)];
  const plans=route.planCandidates(records,ctx);
  assert.ok(plans.length>0);
  const chosen=plans[0];
  const drive=route.driveMinutesForPort(profile,chosen.outbound.origin_port);
  const calculatedLeave=chosen.outbound.departure_minutes-chosen.outbound.checkin_buffer_minutes-drive-15;
  assert.equal(chosen.trip_start_minutes,calculatedLeave);
  assert.equal(chosen.pre_ferry_idle_minutes,0);
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


test("not-before time remains a constraint instead of becoming a fake exact departure",()=>{
  const route=require("../lib/mackinac-island/route")._test;
  const profile=route.profileFromQuery({depart_not_before:"07:00"},["day-trip"],"lower");
  assert.equal(profile.not_before_minutes,7*60);
  assert.equal(profile.departure_minutes,null);
  const date="2026-09-20";
  const ctx={
    date,personas:profile.personas,origin:"lower",profile,hourly:[],
    marine:{score:90},attractions:route.attractionState(date,7*60),events:[],
    sunrise:route.solarMinutes(date,45.8497,-84.6189,true),
    sunset:route.solarMinutes(date,45.8497,-84.6189,false),sameDay:false,nowMinutes:0
  };
  const records=[...route.arnoldSchedule(date,true),...route.sheplersSchedule(date,true)];
  const plans=route.planCandidates(records,ctx);
  assert.ok(plans.length>0);
  assert.ok(plans.every(p=>p.trip_start_minutes>=7*60));
  assert.ok(plans.some(p=>p.trip_start_minutes>7*60));
});
