const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const platform=require("../lib/mackinac-island/platform");
const intel=require("../lib/mackinac-island/intelligence");
const harness=require("../lib/mackinac-island/harness");

function profile(answers){return intel.deterministicProfile(answers);}

test("all eight Mackinac surfaces have bounded focus choices",()=>{
  for(const id of Object.keys(platform.NAV_PATHS)){
    assert.ok(Array.isArray(platform.FOCUS[id])&&platform.FOCUS[id].length>=3,id);
    assert.ok(platform.FOCUS[id].every(x=>x.id&&x.title&&x.summary&&platform.NAV_PATHS[x.next]),id);
  }
});

test("secondary search intents map back to one primary trip brain",()=>{
  assert.equal(platform.safeSurface("with-kids"),"plan");
  assert.equal(platform.safeSurface("bike-day"),"explore");
  assert.equal(platform.safeSurface("from-detroit"),"ferries");
  assert.equal(platform.safeSurface("fall"),"today");
});

test("different traveler psychology changes surface attention deterministically",()=>{
  const family=profile({trip_duration:"day",party:"family-young",trip_vision:["kids"],trip_loss:"walking"});
  const photo=profile({trip_duration:"day",party:"couple",trip_vision:["scenery"],trip_loss:"crowds"});
  assert.equal(platform.rankedFocus("explore",family)[0].id,"easy-flow");
  assert.equal(platform.rankedFocus("explore",photo)[0].id,"scenic-light");
});

test("stay and dining focus react to trip priorities",()=>{
  const quiet=profile({trip_duration:"two-three",party:"couple",trip_vision:["relaxed"],trip_loss:"crowds",lodging_style:"quiet"});
  const special=profile({trip_duration:"two-three",party:"couple",trip_vision:["special","food-shopping"],trip_loss:"flexible"});
  assert.equal(platform.rankedFocus("stay",quiet)[0].id,"quiet");
  assert.equal(platform.rankedFocus("eat",special)[0].id,"destination-dinner");
});

test("navigation preserves the full platform while moving relevant decisions forward",()=>{
  const p=profile({trip_duration:"two-three",party:"couple",trip_vision:["relaxed"],trip_loss:"crowds"});
  const nav=platform.navOrder(p,"stay");
  assert.equal(nav[0].id,"stay");
  assert.equal(new Set(nav.map(x=>x.id)).size,8);
  assert.deepEqual(new Set(nav.map(x=>x.id)),new Set(Object.keys(platform.NAV_PATHS)));
});

test("catalog rankings only return known source-backed place ids",()=>{
  const p=profile({trip_duration:"two-three",party:"couple",trip_vision:["special","food-shopping"],trip_loss:"crowds"});
  const ranked=platform.rankedPlaces(p,"2026-09-25");
  const catalog=require("../lib/mackinac-island/catalog");
  const known=new Set([...catalog.LODGING,...catalog.DINING,...catalog.REGIONAL].map(x=>x.id));
  for(const family of Object.values(ranked))for(const row of family)assert.ok(known.has(row.id),row.id);
});

test("one shared harness client owns Mackinac JEV transport",()=>{
  const route=fs.readFileSync(require.resolve("../lib/mackinac-island/route"),"utf8");
  const intelligence=fs.readFileSync(require.resolve("../lib/mackinac-island/intelligence"),"utf8");
  const client=fs.readFileSync(require.resolve("../lib/mackinac-island/harness"),"utf8");
  assert.match(route,/require\("\.\/harness"\)/);
  assert.match(intelligence,/require\("\.\/harness"\)/);
  assert.doesNotMatch(route,/process\.env\.VERCEL_OIDC_TOKEN/);
  assert.doesNotMatch(intelligence,/process\.env\.VERCEL_OIDC_TOKEN/);
  assert.match(client,/getVercelOidcToken/);
  assert.doesNotMatch(client,/process\.env\.VERCEL_OIDC_TOKEN/);
  assert.match(client,/injectionDependency/);
});

test("cross-page client actively classifies and shapes instead of only tracking navigation",()=>{
  const js=fs.readFileSync("public/assets/mackinac-hub.js","utf8");
  assert.match(js,/\/api\/mackinac-profile/);
  assert.match(js,/surface:rawSurface/);
  assert.match(js,/mackinac_surface_personalized/);
  assert.match(js,/mackinac-trip-plan-v1/);
  assert.match(js,/mackinac_trip_gate_shown/);
  assert.match(js,/Using your saved Mackinac plan/);
  assert.doesNotMatch(js,/data-intake-value/);
  assert.match(js,/profile-fit-badge/);
  assert.doesNotMatch(js,/\/api\/mackinac-island/);
});


test("downstream Mackinac personalization carries the saved trip date",()=>{
  const hub=fs.readFileSync(path.join(__dirname,"..","public","assets","mackinac-hub.js"),"utf8");
  assert.match(hub,/async function classify\(answers,plan=null\)/);
  assert.match(hub,/trip_date:plan\?\.trip_date\|\|null/);
  assert.match(hub,/const plan=readPlan\(\);\s*const data=await classify\(answers,plan\);/);
});
