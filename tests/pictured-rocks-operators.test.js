const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const operators=fs.readFileSync('public/assets/pictured-rocks-operators.js','utf8');
const loader=fs.readFileSync('public/assets/pictured-rocks-visual-layer.js','utf8');

test('result-only operator helper loads after the existing visual layers',()=>{
  assert.match(loader,/pictured-rocks-fall-ranger\.js[\s\S]*pictured-rocks-operators\.js/);
  assert.match(loader,/picturedRocksOperators/);
});

test('booking details are inserted into the generated planner answer',()=>{
  assert.match(operators,/resultBooking/);
  assert.match(operators,/result\.insertBefore\(box,actions\|\|null\)/);
  assert.match(operators,/function resultMode\(\)/);
  assert.match(operators,/function renderBooking\(\)/);
});

test('operator helper does not observe or rewrite the wider page',()=>{
  assert.doesNotMatch(operators,/MutationObserver/);
  assert.doesNotMatch(operators,/waterCards/);
  assert.doesNotMatch(operators,/operatorSection/);
  assert.doesNotMatch(operators,/plannerHelp/);
  assert.match(operators,/form\.addEventListener\('submit',scheduleRender\)/);
});

test('cruise answer contains date-aware 2026 late-season schedule and booking source',()=>{
  assert.match(operators,/2026-09-28/);
  assert.match(operators,/5:45 PM/);
  assert.match(operators,/2026-10-18/);
  assert.match(operators,/Pictured Rocks Cruises/);
  assert.match(operators,/picturedrocks\.com\/fares-schedule/);
  assert.match(operators,/Munising City Dock/);
});

test('kayak answer includes all four current NPS-permitted guides and practical schedule data',()=>{
  for(const name of ['Big Water Paddle Co.','Paddling Michigan \/ Uncle Ducky’s','Pictured Rocks Kayaking','Yooper Yachts']){
    assert.ok(operators.includes(name),name);
  }
  assert.match(operators,/Painted Cove: 10:00 AM or 2:00 PM/);
  assert.match(operators,/Taste of the Rocks: 9 AM, noon, 3 PM, 6 PM/);
  assert.match(operators,/arrive at least 40 minutes early/i);
  assert.match(operators,/Lovers Arch generally meets at 9 AM/);
  assert.match(operators,/nps\.gov\/piro\/planyourvisit\/kayak-tours\.htm/);
});
