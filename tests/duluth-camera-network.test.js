const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const jsPath = path.join(__dirname, '../public/assets/duluth-camera-network.js');
const htmlPath = path.join(__dirname, '../public/duluth-canal-park/index.html');
const js = fs.readFileSync(jsPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

test('camera network module parses and loads before the core Duluth monitor', () => {
  assert.doesNotThrow(() => new vm.Script(js));
  const networkIndex = html.indexOf('/assets/duluth-camera-network.js');
  const monitorIndex = html.indexOf('/assets/duluth-canal.js');
  assert.ok(networkIndex >= 0 && monitorIndex > networkIndex);
});

test('maps the complete 18-feed Duluth Harbor Cam Our Live Cams set', () => {
  const feedBlock = js.slice(js.indexOf('const FEEDS = ['), js.indexOf('const SITES = ['));
  const feeds = [...feedBlock.matchAll(/\{ id: '([^']+)', name: '([^']+)', siteId: '([^']+)', url:/g)];
  assert.equal(feeds.length, 18);

  const expected = [
    'Canal Cam',
    'Bridge Cam',
    'Lighthouse Cam',
    'South Pier Lighthouse Cam',
    'GLA / Harbor Plaza Cam',
    'Pier B Cam',
    'Bayfront Cam',
    'Hillside Cam',
    'Harbor Cam',
    'Duluth Cargo Connect',
    'Western Harborcam',
    'AMI / Connors Point Cam',
    'Fairlawn Cam',
    'Two Harbors Boat Launch',
    'Wisconsin Point Cam',
    'Split Rock Lighthouse Cam',
    'Two Harbors Depot Cam',
    'Silver Bay Marina Cam'
  ];
  expected.forEach(name => assert.match(feedBlock, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
});

test('groups co-located feeds into truthful camera sites instead of fake precise pins', () => {
  const siteBlock = js.slice(js.indexOf('const SITES = ['), js.indexOf('const feedsBySite'));
  const sites = [...siteBlock.matchAll(/\{ id: '([^']+)', name: '([^']+)', lat:/g)];
  assert.equal(sites.length, 14);
  assert.match(js, /Canal, Bridge and Lighthouse cameras share the Visitor Center rooftop area/);
  assert.match(js, /Bayfront, Hillside and Harbor feeds originate from the Duluth hillside camera hub/);
  assert.equal((siteBlock.match(/approximate: true/g) || []).length, 2);
  assert.match(js, /facility-level rather than a surveyed camera mount/);
});

test('camera network remains off the default extent until the user asks for it', () => {
  assert.match(js, /function focusNetwork\(\)/);
  assert.match(js, /boatMap\.fitBounds\(allBounds\(\)/);
  assert.match(js, /targetId === 'duluthVesselMap'/);
  assert.match(js, /focus\.textContent = 'Camera network'/);
  assert.match(js, /event\.stopImmediatePropagation\(\)/);
  assert.match(js, /Regional North Shore cameras stay off the default Canal Park extent/);
});

test('camera panel exposes all DHC feeds plus the existing independent Ship Cam', () => {
  assert.match(js, /18 Duluth Harbor Cam feeds/);
  assert.match(js, /19 camera feeds in total/);
  assert.match(js, /19 mapped camera feeds/);
  assert.match(js, /18 Duluth Harbor Cam feeds across 14 sites \+ the independent Ship Cam/);
  assert.match(js, /target = '_blank'/);
  assert.match(js, /rel = 'noopener'/);
  assert.doesNotMatch(js + html, /utm_source=chatgpt\.com/i);
});