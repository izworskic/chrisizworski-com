const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routePath = path.join(__dirname, '..', 'lib', 'mackinac-island', 'route.js');
const htmlPath = path.join(__dirname, '..', 'public', 'mackinac-island', 'index.html');
const cssPath = path.join(__dirname, '..', 'public', 'assets', 'mackinac-island.css');
const jsPath = path.join(__dirname, '..', 'public', 'assets', 'mackinac-island.js');
const route = require(routePath);
const t = route._test;

function sum(obj){ return Object.values(obj).reduce((a,b)=>a+Number(b||0),0); }

test('persona weights normalize to 100 and genuinely differ', () => {
  const day=t.mergeWeights(['day-trip']);
  const bike=t.mergeWeights(['biking']);
  const kids=t.mergeWeights(['kids']);
  assert.ok(Math.abs(sum(day)-100)<0.001);
  assert.ok(Math.abs(sum(bike)-100)<0.001);
  assert.ok(Math.abs(sum(kids)-100)<0.001);
  assert.ok(bike.activity>day.activity);
  assert.ok(kids.weather>day.weather);
  assert.ok(kids.marine>day.marine);
});

test('September 19 published schedules include both ports and late Saturday returns', () => {
  const arnold=t.arnoldSchedule('2026-09-19',true);
  const sheplers=t.sheplersSchedule('2026-09-19',true);
  assert.ok(arnold.some(r=>r.origin_port==='Mackinaw City'&&r.direction==='to-island'&&r.departure_time==='9:30 AM'));
  assert.ok(arnold.some(r=>r.origin_port==='Mackinac Island'&&r.destination_port==='Mackinaw City'&&r.departure_time==='8:30 PM'));
  assert.ok(arnold.some(r=>r.origin_port==='St. Ignace'&&r.direction==='to-island'));
  assert.ok(sheplers.some(r=>r.origin_port==='Mackinaw City'&&r.direction==='to-island'&&r.departure_time==='7:30 PM'));
  assert.ok(sheplers.some(r=>r.origin_port==='Mackinac Island'&&r.destination_port==='Mackinaw City'&&r.departure_time==='8:00 PM'));
});

test('solar timing is locally plausible for the equinox window', () => {
  const rise=t.solarMinutes('2026-09-20',45.8497,-84.6189,true);
  const set=t.solarMinutes('2026-09-20',45.8497,-84.6189,false);
  assert.ok(rise>420 && rise<480, `sunrise ${rise}`);
  assert.ok(set>1140 && set<1230, `sunset ${set}`);
});

test('event weekend raises modeled crowd pressure without inventing visitor counts', () => {
  const crowd=t.crowdRead('2026-09-20',{available:true,pop_peak:10,high_f:65},[{impact:'major',title:'Pride Festival'}]);
  assert.ok(crowd.index>=70);
  assert.match(crowd.label,/HEAVY/);
  assert.equal(crowd.modeled,true);
  assert.match(crowd.caveat,/not a live visitor count/i);
});

test('fall operating hours do not recommend the British Landing Nature Center', () => {
  const attractions=t.attractionState('2026-09-20',10*60);
  assert.equal(attractions.find(x=>x.name==='British Landing Nature Center').status,'closed');
  assert.notEqual(attractions.find(x=>x.name==='Fort Mackinac').status,'closed');
});

test('public surface makes the decision first and keeps return vs last ferry distinct', () => {
  const html=fs.readFileSync(htmlPath,'utf8');
  assert.match(html,/Mackinac Island Today/);
  assert.match(html,/Best island arrival/);
  assert.match(html,/Recommended ferry home/);
  assert.match(html,/Literal last scheduled ferry/);
  assert.match(html,/Why this plan\?/);
  assert.match(html,/Build my day/);
  assert.match(html,/Modeled, not counted/);
  assert.match(html,/CC BY-SA 4\.0/);
  assert.match(html,/\/privacy\//);
});

test('mobile-first and accessible controls are present', () => {
  const css=fs.readFileSync(cssPath,'utf8');
  const html=fs.readFileSync(htmlPath,'utf8');
  assert.match(css,/@media\(max-width:390px\)/);
  assert.match(css,/:focus-visible/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/Skip to live decision/);
});

test('JEV is bounded to a deterministic closed candidate set', () => {
  const route=fs.readFileSync(routePath,'utf8');
  assert.match(route,/Choose exactly one supplied plan id or NONE/);
  assert.match(route,/top\.some\(c=>c\.id===id\)/);
  assert.match(route,/conf < \.52/);
  assert.match(route,/injection_dependency/);
  assert.doesNotMatch(route,/api\.typesafe\.ai/);
  assert.doesNotMatch(route,/TYPESAFE_API_KEY/);
});

test('client degrades explicitly instead of fabricating a ferry plan', () => {
  const js=fs.readFileSync(jsPath,'utf8');
  assert.match(js,/No recommendation is being invented/);
  assert.match(js,/official ferry operator links/i);
  assert.match(js,/Last scheduled: unavailable/);
  assert.match(js,/mackinac_persona_selected/);
  assert.match(js,/mackinac_share_plan/);
});
