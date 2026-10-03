const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(
  path.join(ROOT, 'public/niagara-border-crossing/index.html'),
  'utf8'
);

const ASSETS = [
  'public/assets/michigan-border-crossings.20261003d.css',
  'public/assets/niagara-border-experience.20261003d.css',
  'public/assets/niagara-border-crossing.20261003d.js',
];

test('Niagara page uses immutable physical asset fingerprints to prevent mixed releases', () => {
  assert.match(html, /\/assets\/michigan-border-crossings\.20261003d\.css/);
  assert.match(html, /\/assets\/niagara-border-experience\.20261003d\.css/);
  assert.match(html, /\/assets\/niagara-border-crossing\.20261003d\.js/);

  assert.doesNotMatch(html, /michigan-border-crossings\.css\?v=/);
  assert.doesNotMatch(html, /niagara-border-experience\.css\?v=/);
  assert.doesNotMatch(html, /niagara-border-crossing\.js\?v=/);

  for (const asset of ASSETS) {
    assert.ok(fs.existsSync(path.join(ROOT, asset)), `${asset} must exist`);
  }
});

test('Niagara lower traveler sections keep readable inline fallback colors', () => {
  assert.match(html, /\.niagara-page \.reality-card,[\s\S]*color:#152332;background:#fff/);
  assert.match(html, /\.niagara-page \.reality-card h2,[\s\S]*color:#072336/);
  assert.match(html, /\.niagara-page \.eligibility-table,[\s\S]*color:#152332/);
});