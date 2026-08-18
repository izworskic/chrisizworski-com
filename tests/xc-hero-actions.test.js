const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('XC hero actions stay tappable above decorative layers', () => {
  const css = read('public/assets/michigan-xc-skiing.css');
  assert.match(css, /\.hero:after\{[^}]*pointer-events:none/);
  assert.match(css, /\.hero-actions\{[^}]*position:relative;z-index:5/);
  assert.match(css, /\.hero-actions \.button\{[^}]*touch-action:manipulation/);
});

test('XC hero comparison and Ice CTAs have real destinations', () => {
  const html = read('public/michigan-cross-country-skiing/index.html');
  assert.ok(html.includes('href="#trail-picks">Compare Michigan trails</a>'));
  assert.ok(html.includes('id="trail-picks"'));
  assert.ok(html.includes('href="/michigan-ice/" data-track-tool="michigan-ice" data-placement="xc-authority-hero">Check Michigan ice</a>'));
});
