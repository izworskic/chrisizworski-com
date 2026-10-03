const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public', 'assets', 'niagara-eligibility-labels.20261003.js'), 'utf8');
const build = fs.readFileSync(path.join(root, 'scripts', 'add-niagara-border-discovery.mjs'), 'utf8');

test('Niagara does not present ineligible crossings as unavailable', () => {
  assert.match(js, /Not for this trip/);
  assert.match(js, /NEXUS only/);
  assert.match(js, /Not eligible/);
  assert.match(js, /Whirlpool Rapids/);
  assert.match(js, /wait\.textContent\.trim\(\) !== "Unavailable"/);
});

test('Niagara ineligible-label adapter is injected into the built page', () => {
  assert.match(build, /niagara-eligibility-labels\.20261003\.js/);
  assert.match(build, /patchEligibilityLabels\(\)/);
});
