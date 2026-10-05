const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const chain = fs.readFileSync(path.join(ROOT, 'scripts', 'add-thunder-hole-to-sitemap.mjs'), 'utf8');
const discovery = fs.readFileSync(path.join(ROOT, 'scripts', 'add-sunshine-skyway-discovery.mjs'), 'utf8');

test('Sunshine Skyway discovery runs in the existing production build chain', () => {
  assert.match(chain, /add-maryland-bay-bridge-discovery\.mjs/);
  assert.match(chain, /add-sunshine-skyway-discovery\.mjs/);
});

test('Sunshine discovery owns canonical search surfaces without inventing aliases', () => {
  assert.match(discovery, /https:\/\/chrisizworski\.com\/sunshine-skyway-bridge\//);
  assert.match(discovery, /public\/sitemap\.xml/);
  assert.match(discovery, /public\/llms\.txt/);
  assert.match(discovery, /public\/synced-national-tools\/index\.html/);
  assert.match(discovery, /networkRole:'bridge'/);
});
