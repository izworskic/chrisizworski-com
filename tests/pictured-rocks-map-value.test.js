const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ui=fs.readFileSync('public/assets/pictured-rocks-planner-v3.js','utf8');
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');

test('map points open decision-rich cards',()=>{
  assert.match(ui,/const MAP_DETAILS=/);
  assert.match(ui,/function mapPopupHtml\(id\)/);
  assert.match(ui,/Why pick it/);
  assert.match(ui,/What it takes/);
  assert.match(ui,/Know before you go/);
  assert.match(ui,/Official details/);
});

test('map cards respond to the current trip plan',()=>{
  assert.match(ui,/currentPlannedIds/);
  assert.match(ui,/Fits your current plan/);
  assert.match(ui,/Optional for this plan/);
  assert.match(ui,/Current access issue/);
});

test('high-value stop caveats are encoded',()=>{
  assert.match(ui,/64 steps/);
  assert.match(ui,/168-step staircase/);
  assert.match(ui,/trailhead lot is limited/);
  assert.match(ui,/Fixed departure/);
});

test('map invites point interaction and ships a fresh bundle',()=>{
  assert.match(html,/Tap any point for trip fit, time, effort, access/);
  assert.match(html,/pictured-rocks-planner-v3\.js\?v=20260927-8/);
});
