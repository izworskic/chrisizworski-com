const test=require("node:test");
const assert=require("node:assert/strict");
const state=require("../public/assets/mackinac-trip-state.js");

test("share state round-trips only visitor inputs",()=>{
  const input={trip_date:"2027-06-15",origin_text:"Bay City, MI",depart_at:"06:30",trip:"overnight",nights:2,adults:2,children:1,bikes:"rent",pace:"easy",mobility:"standard",dinner:"sit-down",return_by:"7:30 PM",event_start:"",personas:["overnight","biking"],interests:["food","scenery"],must_do:["m185"],intake:{trip_duration:"two-three",party:"family-young",trip_vision:["biking","food-shopping"],trip_loss:"crowds",walking_tolerance:"medium",regional_interest:"maybe"},ferry_time:"9:30 AM",weather_score:99,lat:45.8,lon:-84.6};
  const hash=state.encode(input);
  assert.match(hash,/^#plan=v1/);
  assert.doesNotMatch(hash,/ferry|weather|lat|lon/i);
  const out=state.decode(hash);
  assert.equal(out.origin_text,"Bay City, MI");
  assert.equal(out.trip,"overnight");
  assert.equal(out.nights,"2");
  assert.deepEqual(out.intake.trip_vision,["biking","food-shopping"]);
});

test("share state rejects unknown versions and bounds unsafe values",()=>{
  assert.equal(state.decode("#plan=v2&from=Bay+City"),null);
  const out=state.decode("#plan=v1&from="+encodeURIComponent("x".repeat(300))+"&a=999&c=-4&trip=spaceship&date=bad&leave=25:90");
  assert.equal(out.origin_text.length,100);
  assert.equal(out.adults,"2");
  assert.equal(out.children,"0");
  assert.equal(out.trip,"day-trip");
  assert.equal(out.trip_date,"");
  assert.equal(out.depart_at,"");
});

test("share hash stays compact and arrays are deduplicated",()=>{
  const hash=state.encode({personas:["day-trip","day-trip","kids"],interests:["food","food","scenery"],must_do:["fort","fort"]});
  assert.ok(hash.length<state.MAX_HASH);
  const out=state.decode(hash);
  assert.deepEqual(out.personas,["day-trip","kids"]);
  assert.deepEqual(out.interests,["food","scenery"]);
  assert.deepEqual(out.must_do,["fort"]);
});


test("share codec preserves every current adaptive answer family",()=>{
  const adaptive={trip_duration:"unsure",party:"multigenerational",trip_vision:["icons","special"],trip_loss:"waiting",lodging_style:"iconic",walking_tolerance:"moderate",bike_style:"mixed",budget_tradeoff:"convenience",kids_ages:"6-12",regional_interest:"regional",weather_flexibility:"shift-hours"};
  const out=state.decode(state.encode({intake:adaptive}));
  assert.deepEqual(out.intake,adaptive);
});


test("share codec preserves bounded trip tuning",()=>{
  const out=state.decode(state.encode({tuning:["less-walking","better-dinner","less-downtown","bogus"]}));
  assert.deepEqual(out.tuning,["less-walking","better-dinner","less-downtown"]);
});
