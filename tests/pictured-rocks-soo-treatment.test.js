const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=require('../public/assets/pictured-rocks-planner-engine.js');

const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');
const css=fs.readFileSync('public/assets/pictured-rocks-planner-v3.css','utf8');
const ui=fs.readFileSync('public/assets/pictured-rocks-planner-v3.js','utf8');
const api=fs.readFileSync('api/pictured-rocks-live.js','utf8');

const base={time:'day',base:'munising',walk:'moderate',party:'adults',priority:'cliffs',water:'any'};
function p(overrides={}){return engine.plan({...base,...overrides});}

test('preview remains noindex and points canonical authority to the existing Pictured Rocks domain',()=>{
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/"/);
});

test('first screen now has a current operating picture before the detailed composer',()=>{
  assert.ok(html.indexOf('id="today"') < html.indexOf('id="planner"'));
  assert.match(html,/What the park is giving you right now/);
  assert.match(html,/id="westWeather"/);
  assert.match(html,/id="eastWeather"/);
  assert.match(html,/Current weather and access notices/);
});

test('live endpoint uses authoritative weather plus dated NPS access notices',()=>{
  assert.match(api,/api\.weather\.gov\/points/);
  assert.match(api,/api\.weather\.gov\/alerts\/active/);
  assert.match(api,/2026-09-03-munising-falls-contract-awarded/);
  assert.match(api,/2026-09-22-sand-point-closure/);
  assert.match(api,/s-maxage=300/);
});

test('water decisions are explicitly not certified from shoreline weather',()=>{
  assert.match(api,/wind alone is not enough to approve a cruise or kayak trip/);
  assert.match(api,/shoreline weather does not certify Lake Superior conditions/);
  assert.match(html,/Water is separate/);
  assert.match(html,/marine forecast/);
});

test('four primary trip modes are visible and causally feed the composer',()=>{
  for(const mode of ['cruise','kayak','hike','drive']){
    assert.match(html,new RegExp(`data-trip-shape="${mode}"`));
    assert.match(ui,new RegExp(`mode==='${mode}'`));
  }
});

test('map is a planning aid with official-navigation caveat rather than fake route geometry',()=>{
  assert.match(html,/id="parkMap"/);
  assert.match(html,/Approximate planning points only/);
  assert.match(html,/official NPS map/);
  assert.match(ui,/L\.circleMarker/);
  assert.doesNotMatch(ui,/L\.polyline/);
});

test('known live access blocks can remove a stop from a generated route',()=>{
  assert.match(ui,/sand-point-active/);
  assert.match(ui,/ids\.add\('sandPoint'\)/);
  assert.match(ui,/routeWithLiveConstraints/);
  assert.match(ui,/Sand Point is removed from this route/);
});

test('all six causal planner inputs still alter plan behavior',()=>{
  assert.notDeepEqual(p({time:'half'}).ids,p({time:'two'}).ids);
  assert.notDeepEqual(p({base:'munising'}).ids,p({base:'grand-marais'}).ids);
  assert.notDeepEqual(p({walk:'easy'}).ids,p({walk:'long',priority:'hike'}).ids);
  assert.notDeepEqual(p({party:'dog'}).ids,p({party:'adults'}).ids);
  assert.notDeepEqual(p({priority:'family'}).ids,p({priority:'quiet'}).ids);
  assert.notDeepEqual(p({water:'land'}).ids,p({water:'kayak'}).ids);
});

test('hard feasibility rules remain intact',()=>{
  const dog=p({party:'dog',time:'two',water:'land'});
  for(const forbidden of ['chapel','sable','sableFalls']) assert.ok(!dog.ids.includes(forbidden),forbidden);
  const limited=p({party:'limited',time:'two',walk:'easy'});
  for(const forbidden of ['chapel','hurricane','minersFalls','sableFalls']) assert.ok(!limited.ids.includes(forbidden),forbidden);
  const kids=p({party:'kids',priority:'family',water:'kayak'});
  assert.ok(!kids.ids.includes('kayak'));
});

test('real NPS image and source transparency are part of the product surface',()=>{
  assert.match(html,/npgallery\.nps\.gov\/GetAsset/);
  assert.match(html,/NPS photo · public domain/);
  assert.match(html,/Use the planner to decide\. Use the official sources to commit/);
});

test('mobile layout collapses current, mode, map, and result surfaces for phone use',()=>{
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/current-grid,.trip-shapes,.notice-list/);
  assert.match(css,/#parkMap\{height:390px\}/);
});