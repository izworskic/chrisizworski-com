const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const companion = require('../public/assets/sunshine-skyway-companion.js');
const page = fs.readFileSync(path.join(__dirname, '../public/sunshine-skyway-bridge/index.html'), 'utf8');
const view = fs.readFileSync(path.join(__dirname, '../public/assets/sunshine-skyway.20261005.js'), 'utf8');
test('operational closure always wins over wind and traffic', () => {
  assert.equal(companion.decision({officialStatus:{state:'CLOSED'},windContext:{level:'ROUTINE_CONTEXT'},traffic:{flow:{selected:{state:'MOVING_WELL'}}}}).tone, 'closed');
});
test('missing or stale operational status never infers an open bridge', () => {
  for (const state of ['UNKNOWN',undefined]) {
    const result=companion.decision({officialStatus:{state}});
    assert.equal(result.tone,'unknown');
    assert.match(result.detail,/Do not assume|Verify/i);
  }
});
test('forecast wind never changes an official no-closure finding to CLOSED', () => {
  const r=companion.decision({officialStatus:{state:'NO_CLOSURE_SIGNAL_FOUND'},windContext:{level:'HIGH_WIND_CLOSURE_RISK_CONTEXT'},vehicle:{state:'CAUTION'}});
  assert.equal(r.tone,'caution');
  assert.match(r.detail,/not itself a closure/i);
});
test('operational impact is not a closure and slow traffic is not an invented ETA', () => {
  assert.equal(companion.decision({officialStatus:{state:'IMPACTED'}}).tone,'impacted');
  const result=companion.decision({officialStatus:{state:'NO_CLOSURE_SIGNAL_FOUND'},traffic:{flow:{selected:{state:'STOP_AND_GO'}}}});
  assert.match(result.detail,/does not provide a verified travel-time estimate/i);
});
test('corridor directions and example navigation links reverse with selection', () => {
  const north=companion.routeFor('northbound'),south=companion.routeFor('southbound');
  assert.notDeepEqual(north.steps,south.steps);
  assert.equal(new URL(north.url).searchParams.get('origin'),'Bradenton, Florida');
  assert.equal(new URL(south.url).searchParams.get('origin'),'St. Petersburg, Florida');
  assert.ok(north.steps.some(step=>/Howard Frankland/.test(step)));
  assert.ok(south.steps.some(step=>/I-75 south/.test(step)));
});
test('dated NWS outlook uses Florida local time and rejects expired and remote windows', () => {
  const now=Date.parse('2026-11-05T18:00:00Z');
  const periods=[{startTime:'2026-11-05T17:00:00Z',windSpeed:'3 mph'}, {startTime:'2026-11-05T19:00:00Z',windSpeed:'20 mph'}, {startTime:'2026-11-06T19:00:00Z',windSpeed:'30 mph'}];
  const result=companion.outlook({windContext:{periods}},now);
  assert.equal(result.length,1);
  assert.match(result[0].label,/EST/);
  assert.equal(result[0].wind,'20 mph');
});
test('shareable trip input uses only valid allowlisted selections', () => {
  assert.match(companion.shareHref('northbound','rv'),/vehicle=rv/);
  assert.doesNotMatch(companion.shareHref('bad','bad'),/bad/);
});
test('page supplies companion, live integration and non-JavaScript official fallback', () => {
  assert.match(page,/sunshine-skyway-companion\.js/);
  assert.match(page,/id="crossingCompanion"/);
  assert.match(page,/id="routePlanner"/);
  assert.match(page,/<noscript>/);
  assert.match(page,/not an official detour/i);
  assert.match(view,/renderCompanion\(data\)/);
});
