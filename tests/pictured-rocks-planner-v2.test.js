const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=require('../public/assets/pictured-rocks-planner-engine.js');
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');
const css=fs.readFileSync('public/assets/pictured-rocks-planner-v2.css','utf8');

const base={time:'day',base:'munising',walk:'moderate',party:'adults',priority:'cliffs',water:'any'};
function p(overrides={}){return engine.plan({...base,...overrides});}

test('preview remains out of index until canonical deployment ownership is resolved',()=>{
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/"/);
  assert.match(html,/pictured-rocks-planner-engine\.js/);
});

test('all six trip inputs causally change plan behavior',()=>{
  assert.notDeepEqual(p({time:'half'}).ids,p({time:'two'}).ids);
  assert.notDeepEqual(p({base:'munising'}).ids,p({base:'grand-marais'}).ids);
  assert.notDeepEqual(p({walk:'easy'}).ids,p({walk:'long',priority:'hike'}).ids);
  assert.notDeepEqual(p({party:'dog'}).ids,p({party:'adults'}).ids);
  assert.notDeepEqual(p({priority:'family'}).ids,p({priority:'quiet'}).ids);
  assert.notDeepEqual(p({water:'land'}).ids,p({water:'kayak'}).ids);
});

test('dog plan excludes prohibited Chapel and Sable trail choices',()=>{
  const dog=p({party:'dog',time:'two',water:'land'});
  for(const forbidden of ['chapel','sable','sableFalls'])assert.ok(!dog.ids.includes(forbidden),forbidden);
  assert.match(dog.hard,/Pet rules change the route/);
});

test('limited walking strips long and stair-heavy stops',()=>{
  const limited=p({party:'limited',time:'two',walk:'easy'});
  for(const forbidden of ['chapel','hurricane','minersFalls','sableFalls'])assert.ok(!limited.ids.includes(forbidden),forbidden);
  assert.match(limited.hard,/Limited walking changes the stop list/);
});

test('Chapel becomes the anchor for a full-day long-hike profile',()=>{
  const hike=p({walk:'long',priority:'hike',water:'land'});
  assert.deepEqual(hike.ids,['chapel']);
  assert.match(hike.skip,/Do not stack a scheduled cruise/);
});

test('young-kid kayak request does not blindly route to kayak',()=>{
  const family=p({party:'kids',priority:'family',water:'kayak'});
  assert.ok(!family.ids.includes('kayak'));
  assert.match(family.hard,/Young kids/);
});

test('result surface exposes sequence, tradeoff, fallback, and offline actions',()=>{
  assert.match(html,/Your best-fit plan/);
  assert.match(html,/Do not try to add this/);
  assert.match(html,/If Lake Superior or access changes the day/);
  assert.match(html,/Save the official map/);
  assert.match(html,/Print \/ save plan/);
});

test('mobile layout is intentionally supported',()=>{
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/grid-template-columns:1fr/);
});