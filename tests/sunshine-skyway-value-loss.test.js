const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'public', 'sunshine-skyway-bridge', 'index.html'), 'utf8');
const view = fs.readFileSync(path.join(ROOT, 'public', 'assets', 'sunshine-skyway.20261005.js'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'lib', 'sunshine-skyway.js'), 'utf8');
const live = fs.readFileSync(path.join(ROOT, 'lib', 'sunshine-skyway-live.js'), 'utf8');

function score() {
  const checks = [
    [20, /id="statusPanel"/.test(page) && page.indexOf('id="statusPanel"') < page.indexOf('id="windHeading"')],
    [20, /NO_CLOSURE_SIGNAL_FOUND/.test(engine) && /never closes the bridge/.test(engine)],
    [12, /List\/GetData\/traffic/.test(live) && /Sunshine\\s\+Skyway|skyway\\s\+bridge/i.test(live)],
    [10, /40 mph is not an automatic browser-side closure threshold/i.test(page)],
    [10, /calculateToll/.test(engine) && !/1\.16|1\.62|3\.24|4\.86|6\.48/.test(view)],
    [8, /skywayCameraVideo/.test(view) && /Hls\.isSupported/.test(view) && /Open in FL511/.test(view)],
    [8, /@media\(max-width:520px\)/.test(fs.readFileSync(path.join(ROOT, 'public', 'assets', 'sunshine-skyway.css'), 'utf8'))],
    [5, /sourceHealth/.test(live) && /degraded_cached/.test(engine)],
    [4, /<details class="section-card"/.test(page)],
    [3, /Skip to Sunshine Skyway conditions/.test(page) && /aria-live|aria-label/.test(page + view)],
  ];
  return checks.reduce((sum, [weight, pass]) => sum + (pass ? weight : 0), 0);
}

test('Sunshine Skyway weighted release score is at least 97/100', () => {
  assert.ok(score() >= 97, `release score ${score()}/100 is below 97`);
});

test('hard loss vetoes are absent', () => {
  assert.doesNotMatch(view, /scrollIntoView\s*\(/);
  assert.doesNotMatch(view, /1\.16|1\.62|3\.24|4\.86|6\.48/);
  assert.doesNotMatch(page, /<option[^>]*>Cash<\/option>/i);
  assert.doesNotMatch(engine, /maxWindMph[^\n]{0,120}state:\s*['"]CLOSED['"]/i);
  assert.match(engine, /automaticClosure:\s*false/);
  assert.match(live, /List\/GetData\/traffic/);
  assert.match(view, /<video id="skywayCameraVideo"/);
  assert.match(view, /HLS_JS_URL/);
});
