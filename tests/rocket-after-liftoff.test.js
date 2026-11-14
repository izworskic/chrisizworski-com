'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../public/synced-national-tools/rocket-launch-live/app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../public/synced-national-tools/rocket-launch-live/index.html'),'utf8');

test('after a precise target passes, no surface keeps saying Go / current target',()=>{
  assert.match(app,/const targetPassed = launch => targetIsPrecise\(launch\) && Date\.parse\(launch\.net\) <= Date\.now\(\);/);
  assert.match(app,/targetPassed\(launch\) \? PASSED_LABEL/);
  // roster, every-coast board and glance all use the timing label
  assert.ok((app.match(/timingLabel\(l\)/g)||[]).length>=2,'roster and board use timingLabel');
  assert.match(app,/put\('rl-glance-status',launch&&targetPassed\(launch\)\?PASSED_LABEL/);
  assert.doesNotMatch(app,/Target time has passed · check launch status/);
});
test('the countdown counts up and links to the outcome, never claiming one',()=>{
  const block=app.slice(app.indexOf('function renderFrontCountdown'),app.indexOf('function renderFrontSchedule'));
  assert.match(block,/Liftoff time passed /);
  assert.match(block,/outcomeLink\(launch\)/);
  assert.doesNotMatch(block,/launched successfully|has launched|scrubbed today/i);
  assert.match(html,/<a id="rl-front-outcome" class="rl-front-outcome" href="#mission-watch" hidden>/);
});
test('"if it slips" retires once the target has passed',()=>{
  assert.match(app,/!\(data\.selectedLaunch&&targetPassed\(data\.selectedLaunch\)\)\?skyTrendRust\.trend\(safe\)/);
});
