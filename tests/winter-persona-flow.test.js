const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => readFileSync(path.join(root, rel), 'utf8');

test('winter task router covers four real visitor intents', () => {
  const tools = read('public/tools/index.html');
  assert.match(tools, /id="winter-task-router"/);
  for (const persona of ['skier', 'ice-checker', 'winter-day', 'undecided']) {
    assert.ok(tools.includes(`data-winter-persona="${persona}"`), persona);
  }
  assert.match(tools, /Choose the winter question you are trying to answer/);
});

test('XC planning owns the main Tools entry and live conditions remain one step away', () => {
  const tools = read('public/tools/index.html');
  assert.ok(tools.includes('<a href="/michigan-cross-country-skiing/">Michigan Cross-Country Skiing, Trails and Live Conditions</a>'));
  assert.ok(tools.includes('"url":"https://chrisizworski.com/michigan-cross-country-skiing/"'));
  assert.match(tools, /Live trail conditions/);
  assert.ok(tools.includes('https://xcski.chrisizworski.com/'));
});

test('homepage exposes the winter decision path without replacing the all-tools entry', () => {
  const home = read('public/index.html');
  assert.match(home, /class="winter-path"/);
  assert.ok(home.includes('href="/michigan-cross-country-skiing/"'));
  assert.ok(home.includes('href="/michigan-ice/"'));
  assert.ok(home.includes('href="/tools/#winter-task-router"'));
  assert.match(home, /Browse all free tools/);
});

test('winter routing creates no competing landing route and preserves search ownership', () => {
  const tools = read('public/tools/index.html');
  const home = read('public/index.html');
  const xc = read('public/michigan-cross-country-skiing/index.html');
  assert.equal(existsSync(path.join(root, 'public/winter-tools/index.html')), false);
  assert.ok(tools.includes('<link rel="canonical" href="https://chrisizworski.com/tools/">'));
  assert.ok(home.includes('<link rel="canonical" href="https://chrisizworski.com/">'));
  assert.ok(xc.includes('<title>Michigan Cross-Country Skiing: Trails &amp; Live Conditions</title>'));
  assert.ok(xc.includes('<h1>Michigan Cross-Country Skiing</h1>'));
  assert.ok(xc.includes('<link rel="canonical" href="https://chrisizworski.com/michigan-cross-country-skiing/">'));
});
