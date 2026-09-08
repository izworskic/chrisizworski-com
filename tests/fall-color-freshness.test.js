const test = require('node:test');
const assert = require('node:assert/strict');
const { assess } = require('../public/assets/fall-color-freshness.js');
const now = Date.parse('2026-09-08T16:00:00Z');
const weather = {id:'west',weather:{lowestRecent:42,coolNights:3}};
const payload = {updated:'2026-09-08T12:00:00Z',regions:[weather]};
test('cached feed retains its generation time instead of the visit time', () => {
  assert.deepEqual(assess(payload,['west'],now),{updated:'2026-09-08T12:00:00.000Z',regionIds:['west']});
});
test('missing, erroneous, stale and future-dated feeds retain the baseline', () => {
  for(const change of [{updated:null},{updated:'invalid'},{updated:'2026-09-07T00:00:00Z'},{updated:'2026-09-09T00:00:00Z'},{error:'upstream failed'},{regions:[]},{regions:null}]) assert.equal(assess({...payload,...change},['west'],now),null);
  assert.equal(assess(null,['west'],now),null);
});
test('empty weather and stale or invalid canopy do not make a live statewide answer', () => {
  for(const region of [{id:'west',weather:{}},{id:'west',weather:{lowestRecent:null,coolNights:0}},{id:'west',ndvi:{date:'2026-07-01',senescence:0.5}},{id:'west',ndvi:{date:'2026-09-09',senescence:0.5}},{id:'unknown',weather:weather.weather}]) assert.equal(assess({...payload,regions:[region]},['west'],now),null);
});
test('partial coverage identifies only regions with usable model inputs', () => {
  const regions=[weather,{id:'east',ndvi:{date:'2026-08-28',senescence:0.4}},{id:'south',weather:null,ndvi:null},weather];
  assert.deepEqual(assess({...payload,regions},['west','east','south'],now).regionIds,['west','east']);
});
