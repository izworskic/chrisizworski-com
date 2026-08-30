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


test('scenario profiles create distinct conservative balanced and ambitious travel structures', () => {
  const api = loadIntel();
  const profiles = api.scenarioProfiles(6,'paddle');
  assert.deepEqual(profiles.map(p=>p.id),['conservative','balanced','ambitious']);
  assert.ok(profiles[0].hours < profiles[1].hours);
  assert.ok(profiles[1].hours < profiles[2].hours);
  assert.ok(profiles[0].max_detour_miles > profiles[1].max_detour_miles);
  assert.ok(profiles[2].max_detour_miles < profiles[1].max_detour_miles);
});

test('scenario set compares different day counts without reintroducing closed camps', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89.15},{lat:48,lng:-88.45}];
  const camps = [
    {id:'a',name:'Camp A',lat:48,lng:-88.95,closed:false},
    {id:'b',name:'Camp B',lat:48,lng:-88.72,closed:false},
    {id:'closed',name:'Closed Camp',lat:48,lng:-88.58,closed:true}
  ];
  const scenarios = api.buildScenarioSet(path,camps,3,6,{mode:'paddle',maxDays:10});
  assert.equal(scenarios.length,3);
  assert.ok(scenarios.every(scenario => !scenario.itinerary.candidates.some(c=>c.name==='Closed Camp')));
  const days = Object.fromEntries(scenarios.map(scenario=>[scenario.id,scenario.itinerary.legs.length]));
  assert.ok(days.conservative >= days.balanced);
  assert.ok(days.balanced >= days.ambitious);
});


test('map-selected pinned Boat-In camps remain explicit stops across all three scenarios', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89.0},{lat:48,lng:-88.5}];
  const camps = [
    {id:'chosen',name:'Chosen Camp',lat:48,lng:-88.80,closed:false,pinned:true,shelters:'2'},
    {id:'other',name:'Other Camp',lat:48,lng:-88.68,closed:false}
  ];
  const scenarios = api.buildScenarioSet(path,camps,3,6,{mode:'paddle',maxDays:8});
  assert.equal(scenarios.length,3);
  for (const scenario of scenarios) {
    const pinnedLeg = scenario.itinerary.legs.find(leg => leg.stop?.id === 'chosen');
    assert.ok(pinnedLeg, scenario.id + ' should preserve the map-selected campsite');
    assert.equal(pinnedLeg.pinned,true);
  }
});


test('manual campsite day ends override automatic day splitting in every scenario', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89.0},{lat:48,lng:-88.4}];
  const camps = [
    {id:'day1',name:'Chosen Day 1 Camp',lat:48,lng:-88.82,closed:false,pinned:true,manual_day_end:true},
    {id:'auto',name:'Auto Camp',lat:48,lng:-88.68,closed:false},
    {id:'day2',name:'Chosen Day 2 Camp',lat:48,lng:-88.52,closed:false,pinned:true,manual_day_end:true}
  ];
  const scenarios = api.buildScenarioSet(path,camps,3,6,{mode:'paddle',maxDays:8});
  for (const scenario of scenarios) {
    const manual = scenario.itinerary.legs.filter(leg=>leg.manual_day_end);
    assert.equal(manual.length,2);
    assert.equal(manual[0].stop.id,'day1');
    assert.equal(manual[1].stop.id,'day2');
  }
});

test('manual day end can intentionally create a longer-than-profile day without being replaced', () => {
  const api = loadIntel();
  const path = [{lat:48,lng:-89.0},{lat:48,lng:-88.5}];
  const camps = [
    {id:'far',name:'Far Chosen Camp',lat:48,lng:-88.62,closed:false,pinned:true,manual_day_end:true}
  ];
  const itinerary = api.buildItinerary(path,camps,3,3,{mode:'paddle',maxDays:5});
  const leg = itinerary.legs.find(item=>item.manual_day_end);
  assert.ok(leg);
  assert.equal(leg.stop.id,'far');
  assert.equal(leg.over_target,true);
});
