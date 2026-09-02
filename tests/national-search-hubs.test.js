const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const contract=require("../benchmarks/national-search-hubs.json");

function page(route){
  return fs.readFileSync(path.join(__dirname,"..","public",route.replace(/^\//,""),"index.html"),"utf8");
}

test("national search hubs are a small distinct set, not a location-page factory",()=>{
  assert.equal(contract.hubs.length,4);
  for(const hub of contract.hubs){
    assert.ok(!hub.route.includes("{city}"));
    assert.ok(!hub.route.includes("{zip}"));
    assert.ok(hub.intent.length>20);
  }
});

test("every national search hub has canonical creator linkage, crawlable copy and tool handoffs",()=>{
  for(const hub of contract.hubs){
    const html=page(hub.route);
    assert.ok(html.includes('rel="canonical" href="https://chrisizworski.com'+hub.route+'"'));
    assert.ok(html.includes("https://chrisizworski.com/#person"));
    assert.match(html,/data-national-hub=/);
    assert.match(html,/national-hubs\.js/);
    assert.ok((html.match(/<h2>/g)||[]).length>=2);
    for(const tool of hub.primaryTools)assert.ok(html.includes('data-hub-tool="'+tool+'"'),hub.route+" missing "+tool);
  }
});

test("national hubs preserve core truth boundaries",()=>{
  const garden=page("/national-tools/garden/");
  assert.match(garden,/hardiness zone is a different question/i);
  assert.match(garden,/not a local last-frost date/i);

  const fall=page("/national-tools/fall/");
  assert.match(fall,/not a statewide score/i);
  assert.match(fall,/rather than moving the historical timing model/i);

  const water=page("/national-tools/water/");
  assert.match(water,/not a paddling, swimming, wading or boating safety determination/i);
  assert.doesNotMatch(water,/\b(is|are|looks) safe\b/i);

  const sky=page("/national-tools/night-sky/");
  assert.match(sky,/Kp is context, not a local probability/i);
  assert.match(sky,/clouds can erase a strong signal/i);
});

test("shared hub script carries place state into canonical tools without coordinate URLs",()=>{
  const js=fs.readFileSync(path.join(__dirname,"..","public/assets/national-hubs.js"),"utf8");
  assert.match(js,/N\.withQuery/);
  assert.match(js,/N\.bind/);
  assert.doesNotMatch(js,/latitude=.*longitude|longitude=.*latitude/);
});
