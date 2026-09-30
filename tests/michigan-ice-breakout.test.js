import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (p) => fs.readFileSync(p, 'utf8');

test('Michigan ice breakout JavaScript parses before deployment', () => {
  for (const file of ['api/ice.js', 'api/ice-now.js', 'public/michigan-ice/ice.js']) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  }
});

test('Michigan ice breakout keeps one canonical search owner', () => {
  const html = read('public/michigan-ice/index.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-ice\/">/);
  assert.match(html, /<h1[^>]*>Michigan ice conditions today<\/h1>/);
  assert.match(html, /Michigan Ice Report: Ice Cover Today \| Chris Izworski/);
});

test('decision layer separates regional observation, lake-wide trend, and forecast forcing', () => {
  const api = read('api/ice-now.js');
  assert.match(api, /usnic_greatlakes_ice_chart/);
  assert.match(api, /idp_filedate/);
  assert.match(api, /forecastHourly/);
  assert.match(api, /change24h/);
  assert.match(api, /change72h/);
  assert.match(api, /change7d/);
  assert.match(api, /stale/);
  assert.match(api, /not measured ice thickness and not a safety rating/);
});

test('thermal API exposes recent AFDD change without pretending it is ice growth', () => {
  const api = read('api/ice.js');
  assert.match(api, /change24h/);
  assert.match(api, /change72h/);
  assert.match(api, /change7d/);
  assert.match(api, /thermal-history[\s\S]*lake-wide context/);
});

test('front end does not use a whole-lake percentage as a local observed condition', () => {
  const js = read('public/michigan-ice/ice.js');
  assert.match(js, /\/api\/ice-now/);
  assert.match(js, /rangeLabel/);
  assert.match(js, /lake\.current\.total/);
  assert.match(js, /Observed regional ice/);
  assert.match(js, /no remote obs/);
  assert.doesNotMatch(js, /server\.cover\[region\.lake\]/);
  assert.doesNotMatch(js, /stefanRange/);
  assert.doesNotMatch(js, /modeled sheet of roughly/);
});

test('first-screen decision copy exposes freshness and safety boundary', () => {
  const js = read('public/michigan-ice/ice.js');
  assert.match(js, /ICE NOW/);
  assert.match(js, /old winter observations are withheld/);
  assert.match(js, /Observed concentration is not thickness/);
  assert.match(js, /Forecast weather describes forcing/);
  assert.match(js, /This is a thermal signal, not observed ice growth/);
});
