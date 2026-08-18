const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('XC final decision UX keeps live snow separate from trail truth', () => {
  const js = read('public/assets/winter-final.js');
  const camera = read('public/assets/field-camera.js');
  assert.match(js, /id="xc-decision-desk"/);
  assert.match(js, /Today’s Michigan XC decision desk/);
  assert.match(js, /Lower Peninsula snow is marginal/);
  assert.match(js, /Grayling, Frederic or Roscommon/);
  assert.match(js, /Upper Peninsula trip/);
  assert.ok(js.includes('https://xcski.chrisizworski.com/'));
  assert.match(js, /operator or groomer/i);
  assert.ok(camera.includes('/assets/winter-final.js'));
});

test('XC static authority page preserves statewide and regional search ownership', () => {
  const xc = read('public/michigan-cross-country-skiing/index.html');
  assert.match(xc, /<title>Michigan Cross-Country Skiing: Trails &amp; Live Conditions<\/title>/);
  assert.match(xc, /<h1>Michigan Cross-Country Skiing<\/h1>/);
  assert.ok(xc.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-cross-country-skiing/">'));
  for (const place of [
    'Brighton · Southeast Michigan',
    'Frederic · Northern Lower Peninsula',
    'Traverse City',
    'Roscommon',
    'Marquette · Upper Peninsula',
    'Sault Ste. Marie · Upper Peninsula',
  ]) assert.ok(xc.includes(place), place);
  assert.equal(existsSync(path.join(root, 'public/winter-tools/index.html')), false);
});

test('all six generated Ice regional pages own exact local condition intent', () => {
  const regions = [
    ['saginaw-bay', 'Saginaw Bay Ice Conditions Today'],
    ['houghton-lake', 'Houghton Lake Ice Conditions Today'],
    ['lake-st-clair', 'Lake St. Clair Ice Conditions Today'],
    ['little-bay-de-noc', 'Little Bay de Noc Ice Conditions Today'],
    ['grand-traverse-bay', 'Grand Traverse Bay Ice Conditions Today'],
    ['burt-mullett', 'Burt and Mullett Lakes Ice Conditions Today'],
  ];
  for (const [slug, title] of regions) {
    const html = read(`public/michigan-ice/regions/${slug}.html`);
    assert.ok(html.includes(`<title>${title} | Chris Izworski</title>`), slug);
    assert.ok(html.includes(`rel="canonical" href="https://chrisizworski.com/michigan-ice/regions/${slug}.html"`), slug);
  }
});

test('unified winter funnel loads on XC and Ice without personal storage', () => {
  const funnel = read('public/assets/winter-funnel.js');
  const finalUx = read('public/assets/winter-final.js');
  const seasonal = read('public/assets/seasonal-field-desk.js');
  for (const event of ['Winter Surface View', 'Winter Decision Stage', 'Winter Handoff', 'Winter Verification Open']) {
    assert.ok(funnel.includes(event), event);
  }
  assert.ok(finalUx.includes('/assets/winter-funnel.js'));
  assert.ok(seasonal.includes('/assets/winter-funnel.js'));
  assert.doesNotMatch(funnel + finalUx + seasonal, /localStorage|sessionStorage|document\.cookie|geolocation|getCurrentPosition|fingerprint/i);
});

test('XC ownership penalty and winter freeze rule remain explicit', () => {
  const score = JSON.parse(read('benchmarks/winter-engine-scorecard.json'));
  const ownership = read('docs/winter-xc-ownership.md');
  const readiness = JSON.parse(read('benchmarks/winter-final-readiness.json'));
  assert.equal(score.candidate.xc.penalties, 15);
  assert.match(score.candidate.xc.penaltyReason, /ownership/i);
  assert.match(ownership, /not recovered/i);
  assert.match(ownership, /Winter freeze rule/);
  assert.match(ownership, /Do not change, replace, redeploy/i);
  assert.equal(readiness.reopenTriggers.length, 5);
});
