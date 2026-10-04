const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const main = read('public/niagara-border-crossing/index.html');

const routes = [
  ['peace-bridge-wait-times', 'Peace Bridge Wait Times Live'],
  ['rainbow-bridge-wait-times', 'Rainbow Bridge Wait Times Live'],
  ['lewiston-queenston-bridge-wait-times', 'Lewiston–Queenston Bridge Wait Times Live'],
  ['whirlpool-rapids-bridge-crossing', 'Whirlpool Rapids Bridge Crossing'],
];

test('Niagara flagship owns broad live wait intent', () => {
  assert.match(main, /<title>Niagara Border Wait Times Live \| Peace, Rainbow &amp; Lewiston<\/title>/);
  assert.match(main, /<h1>Niagara Border Wait Times Live<\/h1>/);
  assert.match(main, /Which Niagara bridge should you take right now\?/);
  assert.match(main, /Peace Bridge wait times/);
  assert.match(main, /Rainbow Bridge wait times/);
  assert.match(main, /Lewiston–Queenston wait times/);
});

test('Niagara mobile hero does not delay the live decision with a scenic photo', () => {
  assert.match(main, /@media\(max-width:620px\)[\s\S]*\.niagara-hero \.hero-photo\{display:none\}/);
});

test('Niagara has four substantial search-intent bridge pages', () => {
  for (const [route, heading] of routes) {
    const html = read(`public/${route}/index.html`);
    assert.match(html, new RegExp(`<h1>${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/h1>`));
    assert.match(html, /id="detailWait"/);
    assert.match(html, /\/api\/niagara-border-crossings/);
    assert.match(html, /\/niagara-border-crossing\//);
    assert.match(html, /rel="canonical"/);
    assert.ok(html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length > 450, `${route} is too thin`);
  }
});

test('Niagara bridge pages preserve direction authority and do not invent total trip time', () => {
  const js = read('public/assets/niagara-bridge-detail.20261003.js');
  assert.match(js, /direction === "to_canada"/);
  assert.match(js, /Canada Border Services Agency/);
  assert.match(js, /U\.S\. Customs and Border Protection/);
  assert.match(js, /waits\[direction\]/);
  assert.doesNotMatch(js, /fastestTotalTrip|predictWait|bestWindow/);
});

test('Niagara search cluster is in sitemap and llms inventory', () => {
  const sitemap = read('public/sitemap.xml');
  const llms = read('public/llms.txt');
  for (const [route] of routes) {
    const url = `https://chrisizworski.com/${route}/`;
    assert.match(sitemap, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(llms, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
