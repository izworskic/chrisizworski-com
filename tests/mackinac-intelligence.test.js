const test=require("node:test");
const assert=require("node:assert/strict");
const intel=require("../lib/mackinac-island/intelligence");
const api=require("../api/mackinac-profile");

test("intake has four low-friction base questions and bounded adaptive library",()=>{
  const schema=intel.intakeSchema();
  assert.equal(schema.base_questions.length,4);
  assert.deepEqual(schema.base_questions.map(x=>x.id),["trip_duration","party","trip_vision","trip_loss"]);
  assert.ok(schema.adaptive_questions.length>=5);
  assert.ok(schema.adaptive_questions.every(q=>q.stage==="adaptive"));
});

test("young-family answers produce a kid-heavy profile without JEV",()=>{
  const p=intel.deterministicProfile({trip_duration:"day",party:"family-young",trip_vision:["kids","icons"],trip_loss:"walking"});
  assert.equal(p.complete,true);
  assert.ok(p.vector.kids_priority>=.9);
  assert.ok(p.vector.walking_tolerance<=.2);
  assert.ok(["family-young","low-walking"].includes(p.primary.id));
  assert.ok(p.tabs.slice(0,5).some(t=>t.id==="map"));
});

test("relaxed couple overnight elevates stay and eat",()=>{
  const p=intel.deterministicProfile({trip_duration:"two-three",party:"couple",trip_vision:["relaxed","special"],trip_loss:"crowds",lodging_style:"quiet"});
  const top=p.tabs.slice(0,5).map(x=>x.id);
  assert.equal(p.primary.id==="relaxed-couple"||p.primary.id==="special-occasion"||p.primary.id==="overnight-explorer",true);
  assert.ok(top.includes("stay"));
  assert.ok(top.includes("eat")||p.vector.food>.65);
  assert.ok(p.vector.crowd_avoidance>.75);
});

test("bike-first visitor gets a targeted adaptive bike question",()=>{
  const p=intel.deterministicProfile({trip_duration:"day",party:"adults-friends",trip_vision:["biking"],trip_loss:"waiting"});
  assert.equal(p.next_question_id,"bike_style");
  assert.equal(p.next_question.id,"bike_style");
  assert.ok(p.vector.outdoors>.8);
});

test("day trip suppresses stay while multi-night regional trip elevates Around the Straits",()=>{
  const day=intel.deterministicProfile({trip_duration:"day",party:"couple",trip_vision:["icons"],trip_loss:"missing"});
  const regional=intel.deterministicProfile({trip_duration:"four-plus",party:"couple",trip_vision:["relaxed"],trip_loss:"flexible",regional_interest:"regional"});
  assert.ok(day.tabs.find(x=>x.id==="stay").score<day.tabs.find(x=>x.id==="getting-there").score);
  assert.ok(regional.tabs.slice(0,4).some(x=>x.id==="around-straits"));
  assert.ok(regional.vector.regional_exploration>.9);
});

test("answer normalization rejects arbitrary classifier ids and limits vision choices",()=>{
  const a=intel.normalizeAnswers({trip_duration:"DROP TABLE",party:"robot",trip_vision:["history","biking","special","<script>"]});
  assert.equal(a.trip_duration,null);
  assert.equal(a.party,null);
  assert.deepEqual(a.trip_vision,["history","biking"]);
});

test("archetype and question surfaces are closed sets",()=>{
  const p=intel.deterministicProfile({trip_duration:"day",party:"couple",trip_vision:["scenery"],trip_loss:"weather"});
  assert.ok(intel.ARCHETYPES[p.primary.id]);
  assert.ok(!p.next_question_id||intel.QUESTION_LIBRARY[p.next_question_id]);
  assert.ok(p.ranked_archetypes.every(x=>intel.ARCHETYPES[x.id]));
});

test("legacy planner inputs can seed the new intelligence layer without changing logistics",()=>{
  const answers=intel.answersFromLegacyQuery({},{
    trip:"overnight",nights:2,adults:2,children:0,mobility:"standard",pace:"easy",
    interests:["photography"],must_do:["sunset"],trip_date:"2026-10-10"
  },["overnight","photography"]);
  assert.equal(answers.trip_duration,"two-three");
  assert.equal(answers.party,"couple");
  assert.ok(answers.trip_vision.includes("scenery"));
  const p=intel.deterministicProfile(answers);
  assert.ok(["relaxed-couple","scenery-photo","overnight-explorer","special-occasion"].includes(p.primary.id));
});

test("profile API body parser accepts wrapped answers and does not require persistence",()=>{
  assert.deepEqual(api._test.bodyObject({body:{answers:{party:"couple"}}}),{party:"couple"});
  assert.deepEqual(api._test.bodyObject({body:'{"answers":{"trip_duration":"day"}}'}),{trip_duration:"day"});
});

test("phase-one registries cover truth, search, tabs and analytics",()=>{
  assert.equal(intel.TABS.length,9);
  assert.ok(intel.SEO_SURFACES.length>=15);
  assert.ok(intel.DATA_SOURCE_REGISTRY.some(x=>x.id==="nws"&&x.truth_role==="fact"));
  assert.ok(intel.DATA_SOURCE_REGISTRY.some(x=>x.id==="webcams"&&x.truth_role==="human-confirmation"));
  assert.ok(intel.ANALYTICS_EVENTS.includes("mackinac_profile_classified"));
});
