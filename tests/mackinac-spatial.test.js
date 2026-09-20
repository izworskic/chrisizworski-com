const test=require("node:test");
const assert=require("node:assert/strict");
const spatial=require("../lib/mackinac-island/spatial");

function places(){
  return {
    lodging:{recommended:[
      {id:"inn-at-stonecliffe",name:"The Inn at Stonecliffe",season_eligible:true,fit_reason:"quieter fit",source_url:"x"},
      {id:"mission-point",name:"Mission Point Resort",season_eligible:true,fit_reason:"family fit",source_url:"x"}
    ]},
    dining:{recommended:[
      {id:"carriage-house",name:"Carriage House",meal:["lunch","dinner"],season_eligible:true,fit_reason:"special-occasion fit",source_url:"x"},
      {id:"douds-picnic",name:"Doud’s Market & Deli",meal:["lunch"],season_eligible:true,fit_reason:"value-oriented",source_url:"x"}
    ]},
    regional:{recommended:[{id:"colonial-michilimackinac",name:"Colonial Michilimackinac",gateway:"Mackinaw City",season_eligible:true,fit_reason:"history fit",source_url:"x"}]}
  };
}

test("slow overnight profiles create a real stay-dinner sequence",()=>{
  const c=spatial.buildCandidates({visitor:{answers:{trip_duration:"two-three"},vector:{crowd_avoidance:.95,special_occasion:.95,photography:.9,food:.9,relaxation:.9,outdoors:.5,history:.4,kids_priority:.05,biking:.05,regional_exploration:.2,walking_tolerance:.8}},places:places(),profile:{trip:"overnight",mobility:"standard"}});
  assert.equal(c[0].id,"scenic-slow");
  const names=c[0].days.flatMap(d=>d.stops.map(s=>s.name));
  assert.ok(names.includes("The Inn at Stonecliffe"));
  assert.ok(names.includes("Carriage House"));
});

test("family low-walking profiles favor easy-flow over active loop",()=>{
  const c=spatial.buildCandidates({visitor:{answers:{trip_duration:"day"},vector:{kids_priority:1,walking_tolerance:.1,budget_sensitivity:.7,relaxation:.7,outdoors:.45,biking:.05,history:.5,regional_exploration:.1}},places:places(),profile:{trip:"day-trip",mobility:"limited"}});
  assert.equal(c[0].id,"family-easy");
  assert.ok(!c.some(x=>x.id==="active-island"));
});

test("regional extensions only appear when trip length and preference justify them",()=>{
  const day=spatial.buildCandidates({visitor:{answers:{trip_duration:"day"},vector:{regional_exploration:1,history:1}},places:places(),profile:{trip:"day-trip",mobility:"standard"}});
  assert.ok(!day.some(x=>x.id==="regional-strata"));
  const long=spatial.buildCandidates({visitor:{answers:{trip_duration:"four-plus"},vector:{regional_exploration:1,history:1,outdoors:.5}},places:places(),profile:{trip:"overnight",mobility:"standard"}});
  const regional=long.find(x=>x.id==="regional-strata");
  assert.ok(regional);
  assert.match(regional.days[1].stops[0].name,/Colonial Michilimackinac/);
});

test("spatial map uses area anchors and states the navigation boundary",()=>{
  const c=spatial.buildCandidates({visitor:{answers:{trip_duration:"two-three"},vector:{crowd_avoidance:.9,special_occasion:.9,photography:.9,food:.8,relaxation:.9}},places:places(),profile:{trip:"overnight",mobility:"standard"}});
  const plan=spatial.selectedPlan(c[0],{mode:"deterministic",confidence:0});
  assert.ok(plan.map_points.length>=2);
  assert.ok(plan.map_points.every(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)));
  assert.match(plan.truth,/not claim live walking times/);
  assert.ok(plan.map_points.some(p=>/Planning orientation only/.test(p.detail)));
});
