const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'public', 'sunshine-skyway-bridge', 'index.html'), 'utf8');
const view = fs.readFileSync(path.join(ROOT, 'public', 'assets', 'sunshine-skyway.20261005.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'public', 'assets', 'sunshine-skyway.css'), 'utf8');
const discovery = fs.readFileSync(path.join(ROOT, 'scripts', 'add-sunshine-skyway-discovery.mjs'), 'utf8');

test('first-screen hierarchy puts controls and one operational answer before weather and camera detail', () => {
  const controls = page.indexOf('class="control-bar"');
  const status = page.indexOf('id="statusPanel"');
  const decisions = page.indexOf('class="decision-row"');
  const wind = page.indexOf('id="windHeading"');
  const camera = page.indexOf('id="cameraHeading"');
  assert.ok(controls > 0 && status > controls && decisions > status);
  assert.ok(wind > decisions && camera > decisions);
});

test('operational copy explicitly prevents weather from becoming bridge status', () => {
  assert.match(page, /Wind alone will never be used to declare the bridge open or closed/i);
  assert.match(page, /40 mph is not an automatic browser-side closure threshold/i);
  assert.match(view, /not a weather-derived “OPEN” declaration/i);
});

test('camera experience is embedded in place and cannot regress to link-only cards or scroll jumps', () => {
  assert.match(view, /<iframe id="skywayCameraFrame"/);
  assert.match(view, /OFFICIAL FL511 · EMBEDDED VIEW/);
  assert.doesNotMatch(view, /scrollIntoView\s*\(/);
  assert.match(page, /Official camera embedded/i);
});

test('current toll UI exposes only electronic payment modes and browser code does not own rate constants', () => {
  assert.match(page, /SunPass/);
  assert.match(page, /Toll-By-Plate/);
  assert.doesNotMatch(page, /<option[^>]*>Cash<\/option>/i);
  assert.doesNotMatch(view, /1\.16|1\.62|3\.24|4\.86|6\.48/);
});

test('search, social and creator metadata are complete', () => {
  assert.match(page, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/sunshine-skyway-bridge\/">/);
  assert.match(page, /<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.match(page, /<meta property="og:image"/);
  assert.match(page, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(page, /"@type":"Person"/);
  assert.match(page, /"creator":\{"@id":"https:\/\/chrisizworski\.com\/#person"\}/);
  assert.match(page, /Built by <a href="\/">Chris Izworski<\/a>/);
});

test('discovery build registers sitemap, tools, national tools and inbound bridge links', () => {
  assert.match(discovery, /benchmarks\/tool-network-registry\.json/);
  assert.match(discovery, /public\/sitemap\.xml/);
  assert.match(discovery, /public\/tools\/index\.html/);
  assert.match(discovery, /public\/synced-national-tools\/index\.html/);
  assert.match(discovery, /public\/chesapeake-bay-bridge-maryland\/index\.html/);
  assert.match(discovery, /public\/chesapeake-bay-bridge-tunnel\/index\.html/);
  assert.match(discovery, /public\/niagara-border-crossing\/index\.html/);
  assert.match(discovery, /public\/mackinac-bridge-live\/index\.html/);
});

test('mobile CSS includes a dedicated narrow-screen treatment', () => {
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /\.decision-row/);
  assert.match(css, /\.status-grid/);
});
