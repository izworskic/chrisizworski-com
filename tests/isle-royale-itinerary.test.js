const test = require('node:test');
const assert = require('node:assert/strict');

function loadIntel() {
  const saved = global.window;
  global.window = {};
  const modulePath = require.resolve('../public/assets/isle-royale-water-intelligence.js');
  delete require.cache[modulePath];
  require(modulePath);
  const api = global.window.IsleRoyaleWaterIntel;
  global.window = saved;
  return api;
}

test('multi-day itinerary chooses source-backed camps near daily reach and ignores closed camps', () => {
  const api = loadIntel();
  const path = [
    {lat:48.0,lng:-89.0},
    {lat:48.0,lng:-88.5}
  ];
  const camps = [
    {id:'closed-perfect',name:'Closed Camp',lat:48.0,lng:-88.74,closed:true},
    {id:'open-a',name:'Open Camp A',lat:48.0,lng:-88.73,closed:false,shelters:'2',dock_depth:'6 ft'},
    {id:'open-b',name:'Open Camp B',lat:48.0,lng:-88.56,closed:false,tent_sites:'4'}
  ];
  const itinerary = api.buildItinerary(path,camps,3,4,{mode:'paddle',maxDetourMiles:1.75,maxDays:6});
  assert.ok(itinerary.legs.length >= 2);
  assert.equal(itinerary.legs[0].stop.name,'Open Camp A');
  assert.ok(!itinerary.candidates.some(c=>c.name==='Closed Camp'));
  assert.ok(itinerary.legs.some(leg=>leg.final));
});

test('multi-day itinerary explicitly leaves a gap when no qualified camp is in the day-end window', () => {
  const api = loadIntel();
  const path = [
    {lat:48.0,lng:-89.0},
    {lat:48.0,lng:-88.5}
  ];
  const itinerary = api.buildItinerary(path,[],3,4,{mode:'paddle',maxDays:6});
  assert.ok(itinerary.legs.some(leg=>leg.gap));
  assert.ok(itinerary.legs.some(leg=>leg.final));
});

test('route projection returns both lateral distance and progress along route', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89},{lat:48,lng:-88.5}];
  const projected = api.projectPointToPath({lat:48.01,lng:-88.75},path);
  assert.ok(projected.distance_miles > 0);
  assert.ok(projected.along_miles > 5);
  assert.ok(projected.along_miles < 20);
});

test('distance-based weather sampling can produce more than five samples for long trips', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89.3},{lat:48,lng:-88.2}];
  const samples = api.weatherSamples(path,8);
  assert.equal(samples.length,8);
  assert.equal(samples[0].distance_miles,0);
  assert.ok(samples[7].distance_miles > samples[1].distance_miles);
});
