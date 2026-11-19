const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/great-lakes-buoys/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/great-lakes-buoys/observation-bridge.css'), 'utf8');
const { observationState, waveComparison } = require('../public/great-lakes-buoys/observation-bridge.js');
const NOW = Date.parse('2026-11-19T14:00:00Z');
const station = (id, wave, obs = '2026-11-19T13:20:00Z') => ({ id, name:'Fixture '+id, lake:'Michigan', wave_ht_ft:wave, obs_time:obs });

test('Observation Bridge is positioned before the legacy dashboard and preserves protected public search and author markup', () => {
  assert.ok(html.indexOf('id="observationBridge"') > html.indexOf('id="great-lakes-buoy-answer"'));
  assert.ok(html.indexOf('id="observationBridge"') < html.indexOf('id="lakeRow"'));
  assert.ok(html.includes('href="/great-lakes-buoys/observation-bridge.css?v=1"'));
  assert.ok(html.includes('src="/great-lakes-buoys/observation-bridge.js?v=1"'));
  assert.ok(html.includes('<link rel="canonical" href="https://chrisizworski.com/great-lakes-buoys/">'));
  assert.ok(html.includes('https://chrisizworski.com/#person'));
  assert.ok(html.includes('id="snapshotData"'));
  assert.ok(html.includes('id="buoyMap"'));
  assert.ok(html.includes('id="modalOverlay"'));
});

test('Two independent keyboard-usable station controls, source links, history and list handoff exist', () => {
  for (const side of ['A', 'B']) {
    for (const id of ['obStation','obWave','obWind','obWater','obAge','obWhen','obSource','obHistory','obBar']) {
      assert.ok(html.includes('id="' + id + side + '"'), 'missing '+id+side);
    }
    assert.ok(html.includes('for="obStation'+side+'"'));
  }
  assert.match(html, /data-bridge-station="\$\{s\.id\}"/);
  assert.match(html, /window\.dispatchEvent\(new CustomEvent\('buoy-stations-ready'/);
  assert.ok(html.includes("fromSnapshot?'snapshot':'api'"));
  assert.ok(css.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes('max-width: 670px'));
  assert.ok(html.includes('Official NDBC station'));
  assert.ok(html.includes('NWS marine forecast and warnings'));
});

test('Observation age checks do not treat missing, future or old readings as recent', () => {
  assert.equal(observationState(station('1', 2), NOW), 'recent');
  assert.equal(observationState(station('1', 2, '2026-11-19T11:59:00Z'), NOW), 'older');
  assert.equal(observationState(station('1', 2, '2026-05-12T09:00:00Z'), NOW), 'older');
  assert.equal(observationState(station('1', 2, 'garbage'), NOW), 'unknown');
  assert.equal(observationState(station('1', 2, '2026-11-20T09:00:00Z'), NOW), 'unknown');
  assert.equal(observationState(null, NOW), 'unknown');
});

test('A to B to A comparison changes a real, stated measurement and never invents a route forecast', () => {
  const a=station('45029', 3.4), b=station('45005', 1.1), c=station('45187', 6.4);
  const first=waveComparison(a,b,NOW), next=waveComparison(c,b,NOW), last=waveComparison(a,b,NOW);
  assert.equal(first.state, 'compared');
  assert.match(first.text, /45029 reports waves 2\.3 ft higher/);
  assert.match(next.text, /45187 reports waves 5\.3 ft higher/);
  assert.equal(last.text, first.text);
  assert.match(first.text, /point observations/);
  assert.match(first.text, /not a route/);
});

test('Never emit a confident comparison from a stale time, absent wave sensor or duplicate station', () => {
  const a=station('45029', 1.2), b=station('45005', 2.5);
  assert.equal(waveComparison(a, station('45005', 2.5,'2026-05-12T09:00:00Z'), NOW).state,'older');
  assert.equal(waveComparison(a, station('45005', null), NOW).state,'missing');
  assert.equal(waveComparison(a, a, NOW).state,'same');
  assert.equal(waveComparison(a, null, NOW).state,'unknown');
  assert.equal(waveComparison(a, b, NOW).state,'compared');
});
