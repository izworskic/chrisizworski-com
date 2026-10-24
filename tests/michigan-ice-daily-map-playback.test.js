import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const code = fs.readFileSync('public/michigan-ice/freeze-up.js','utf8');
const mainClient = fs.readFileSync('public/michigan-ice/ice.js','utf8');

test('The ice-map animation is real dated NOAA geographic data, never a simulated CARTO time layer',()=>{
  execFileSync(process.execPath,['--check','public/michigan-ice/freeze-up.js']);
  assert.match(code,/glerl\.noaa\.gov\/data\/ice\/glicd\/jpgs\//);
  assert.match(code,/function glMultiLakeFrameUrl\(day\)/);
  assert.match(code,/var endYear = d\.getUTCFullYear\(\) \+ \(month >= 11 \? 1 : 0\)/);
  assert.match(code,/function syncDailyFrame\(\)/);
  assert.match(code,/svg\.setAttribute\('aria-label'.*NOAA GLERL whole-lake daily ice coverage chart/);
  assert.match(code,/syncDailyFrame\(\);/);
  assert.match(code,/var ticket = \+\+dailyFrameRequest/);
  assert.match(code,/ticket !== dailyFrameRequest/);
  assert.match(code,/img\.hidden = true/);
  assert.match(code,/dailyFrameCache\.size > 20/);
  assert.match(code,/No substitute map is shown/);
  assert.match(code,/genuine archived GLERL daily ice map/);
  assert.match(code,/The CARTO location map above remains a different, current-only product/);
  assert.match(code,/PHOTO_FOCUS/);
  assert.match(code,/dialog\.showModal\(\)/);
  assert.match(code,/data-ice-large-lake=\\"all\\"/);
  for(const lake of ['superior','michigan','huron','erie','ontario']) assert.ok(code.includes('data-ice-large-lake="'+lake+'"'));
  assert.match(code,/Open all five lakes/);
  assert.match(code,/syncLargeMap\(\)/);
  assert.match(code,/picture\.hidden = true; picture\.removeAttribute\('src'\)/);
  assert.match(code,/aria-haspopup/);
  assert.match(code,/Not a safe-ice assessment/);
  assert.equal((mainClient.match(/__michiganIceNowReady = true/g)||[]).length,2);
  assert.match(code,/if \(window\.__michiganIceNowReady\) render\(window\.__michiganIceNow\)/);
  assert.doesNotMatch(code,/MapServer\/export[^\n]*time=|safeIceThickness|forecastIceThickness/);
});

test('The NOAA archived chart URL honors season end year and excludes nonwinter months',()=>{
  // Evaluate the pure date helper from the committed client source only.
  const start=code.indexOf('  function glMultiLakeFrameUrl(day) {');
  const end=code.indexOf('  var PHOTO_FOCUS = {',start);
  assert.ok(start>0 && end>start,'date helper present');
  const fn=new Function(code.slice(start,end)+'\nreturn glMultiLakeFrameUrl;')();
  assert.equal(fn('2025-12-15'),
    'https://www.glerl.noaa.gov/data/ice/glicd/jpgs/2026/20251215.jpg');
  assert.equal(fn('2026-02-15'),
    'https://www.glerl.noaa.gov/data/ice/glicd/jpgs/2026/20260215.jpg');
  assert.equal(fn('2026-11-30'),
    'https://www.glerl.noaa.gov/data/ice/glicd/jpgs/2027/20261130.jpg');
  assert.equal(fn('2027-03-20'),
    'https://www.glerl.noaa.gov/data/ice/glicd/jpgs/2027/20270320.jpg');
  assert.equal(fn('2026-06-01'),null);
  assert.equal(fn('2026-10-15'),null);
  assert.equal(fn('2026-02-30'),null);
  assert.equal(fn('20260215'),null);
});
