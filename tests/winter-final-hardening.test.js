const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('XC final decision layer keeps live snow separate from trail truth', () => {
  const xc = read('public/michigan-cross-country-skiing/index.html');
  assert.match(xc, /id="xc-decision-desk"/);
  assert.match(xc, /Today’s Michigan XC decision desk/);
  assert.match(xc, /Lower Peninsula snow is marginal/);
  assert.match(xc, /Grayling, Frederic or Roscommon/);
  assert.ok(xc.includes('https://xcski.chrisizworski.com/'));
  assert.match(xc, /operator or groomer/i);
});

test('XC authority page captures regional intent without new landing pages', () => {
  const xc = read('public/michigan-cross-country-skiing/index.html');
  for (const phrase of [
    'Cross-country skiing near Traverse City',
    'Cross-country skiing near Grayling, Frederic and Roscommon',
    'Cross-country skiing near Marquette and in the Upper Peninsula',
    'Cross-country skiing in southeast Michigan',
  ]) assert.ok(xc.includes(phrase), phrase);
  assert.equal(existsSync(path.join(root, 'public/winter-tools/index.html')), false);
});

test('Ice generated hub exposes exact water-specific condition phrases', () => {
  const ice = read('public/michigan-ice/index.html');
  for (const phrase of [
    'Saginaw Bay ice conditions',
    'Houghton Lake ice conditions',
    'Lake St. Clair ice conditions',
    'Little Bay de Noc ice conditions',
    'Grand Traverse Bay ice conditions',
    'Burt and Mullett ice conditions',
  ]) assert.ok(ice.includes(phrase), phrase);
  assert.match(ice, /Never a safety rating/i);
});

test('winter funnel is first-party event measurement without personal storage', () => {
  const js = read('public/assets/winter-funnel.js');
  for (const event of ['Winter Surface View', 'Winter Decision Stage', 'Winter Handoff', 'Winter Verification Open']) {
    assert.ok(js.includes(event), event);
  }
  assert.doesNotMatch(js, /localStorage|sessionStorage|document\.cookie|geolocation|getCurrentPosition|fingerprint/i);
});

test('XC ownership penalty and freeze rule remain explicit', () => {
  const score = JSON.parse(read('benchmarks/winter-engine-scorecard.json'));
  const ownership = read('docs/winter-xc-ownership.md');
  assert.equal(score.candidate.xc.penalties, 15);
  assert.match(score.candidate.xc.penaltyReason, /ownership/i);
  assert.match(ownership, /not recovered/i);
  assert.match(ownership, /Winter freeze rule/);
  assert.match(ownership, /Do not change, replace, redeploy/i);
});
