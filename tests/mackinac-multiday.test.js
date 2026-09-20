const test=require("node:test");
const assert=require("node:assert/strict");
const multiday=require("../lib/mackinac-island/multiday");

const places={
  lodging:{recommended:[{id:"inn-at-stonecliffe",name:"The Inn at Stonecliffe",season_eligible:true,fit_reason:"quiet",source_url:"x"}]},
  dining:{recommended:[
    {id:"douds-picnic",name:"Doud’s Market & Deli",meal:["lunch"],season_eligible:true,fit_reason:"easy lunch",source_url:"x"},
    {id:"carriage-house",name:"Carriage House",meal:["dinner"],season_eligible:true,fit_reason:"special dinner",source_url:"x"}
  ]},
  regional:{recommended:[{id:"colonial-michilimackinac",name:"Colonial Michilimackinac",gateway:"Mackinaw City",season_eligible:true,fit_reason:"history",source_url:"x"}]}
};

test("one night creates arrival and return only — no fake full day",()=>{
  const c=multiday.buildCandidates({arrivalDate:"2027-06-10",profile:{trip:"overnight",nights:1,bikes:"none",mobility:"standard",interests:[]},visitor:{answers:{trip_duration:"one-night"},vector:{pace:.4,crowd_avoidance:.8,food:.7,history:.5,outdoors:.5,photography:.5,kids_priority:.1,walking_tolerance:.8,regional_exploration:.2}},places,outbound:{arrival_time:"10:10 AM",origin_port:"Mackinaw City"},returnPlan:{mode:"flexible"}});
  assert.equal(c[0].days.length,2);
  assert.deepEqual(c[0].days.map(x=>x.role),["arrival","return"]);
});

test("two nights create exactly one true full Island day",()=>{
  const c=multiday.buildCandidates({arrivalDate:"2027-06-10",profile:{trip:"overnight",nights:2,bikes:"rent",mobility:"standard",interests:["biking"]},visitor:{answers:{trip_duration:"two-three",trip_vision:["biking"]},vector:{pace:.8,outdoors:.95,photography:.65,history:.3,food:.5,kids_priority:.1,walking_tolerance:.9,regional_exploration:.2}},places,outbound:{arrival_time:"10:10 AM",origin_port:"Mackinaw City"},returnPlan:{mode:"flexible"}});
  assert.deepEqual(c[0].days.map(x=>x.role),["arrival","full-day","return"]);
  assert.equal(c[0].days[1].title,"Bike + shoreline day");
});

test("longer stays rotate distinct full-day themes without repeating named stops",()=>{
  const c=multiday.buildCandidates({arrivalDate:"2027-06-10",profile:{trip:"overnight",nights:4,bikes:"rent",mobility:"standard",interests:["biking","history","photography","food"]},visitor:{answers:{trip_duration:"four-plus",trip_vision:["biking","history"]},vector:{pace:.55,crowd_avoidance:.8,outdoors:.9,photography:.9,history:.9,food:.85,kids_priority:.1,walking_tolerance:.8,regional_exploration:.6}},places,outbound:{arrival_time:"10:10 AM",origin_port:"Mackinaw City"},returnPlan:{mode:"flexible"}});
  const full=c[0].days.filter(x=>x.role==="full-day");
  assert.equal(full.length,3);
  assert.ok(new Set(full.map(x=>x.title)).size>=2);
  const ids=full.flatMap(x=>x.stops.map(s=>s.id));
  assert.equal(ids.length,new Set(ids).size);
});

test("regional stops belong on the return/gateway day, not a full Island day",()=>{
  const c=multiday.buildCandidates({arrivalDate:"2027-06-10",profile:{trip:"overnight",nights:3,bikes:"none",mobility:"standard",interests:["history"]},visitor:{answers:{trip_duration:"two-three"},vector:{pace:.5,crowd_avoidance:.5,outdoors:.5,photography:.4,history:1,food:.5,kids_priority:.2,walking_tolerance:.8,regional_exploration:.95}},places,outbound:{arrival_time:"10:10 AM",origin_port:"Mackinaw City"},returnPlan:{mode:"flexible"}});
  const selected=c[0];
  assert.ok(selected.days.at(-1).stops.some(x=>x.role==="regional"));
  assert.ok(!selected.days.filter(x=>x.role==="full-day").some(d=>d.stops.some(x=>x.role==="regional")));
});

test("full days explicitly avoid invented hourly precision",()=>{
  const c=multiday.buildCandidates({arrivalDate:"2027-06-10",profile:{trip:"overnight",nights:2,bikes:"none",mobility:"standard",interests:["history"]},visitor:{answers:{trip_duration:"two-three"},vector:{pace:.5,history:.9,outdoors:.5,food:.5,kids_priority:.1,walking_tolerance:.8,regional_exploration:.2}},places,outbound:{arrival_time:"10:10 AM",origin_port:"Mackinaw City"},returnPlan:{mode:"flexible"}});
  assert.equal(c[0].days[1].precision,"day shape only");
  assert.match(c[0].days[1].summary,/No fake hourly precision/);
  assert.match(c[0].truth,/not invented future-hour schedules/);
});
