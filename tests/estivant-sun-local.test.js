const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'estivant-pines', 'index.html'), 'utf8');
const sun = fs.readFileSync(path.join(root, 'public', 'assets', 'estivant-sun-local.js'), 'utf8');

test('Estivant sun clock has a network-independent local calculator', () => {
  assert.match(html, /<script src="\/assets\/estivant-sun-local\.js"><\/script>/);
  assert.match(sun, /const LAT = 47\.4456;/);
  assert.match(sun, /const LON = -87\.8776;/);
  assert.match(sun, /-0\.833 \* rad/);
  assert.match(sun, /-6 \* rad/);
  assert.match(sun, /America\/Detroit/);
  assert.doesNotMatch(sun, /fetch\(|XMLHttpRequest|aa\.usno\.navy\.mil/);
});

test('local sun clock preserves hike-finish planning buffers', () => {
  assert.match(sun, /Cathedral Grove/);
  assert.match(sun, /allowance: 75/);
  assert.match(sun, /Bertha Daubendiek/);
  assert.match(sun, /allowance: 90/);
  assert.match(sun, /Both loops/);
  assert.match(sun, /allowance: 150/);
  assert.match(sun, /sunset - r\.allowance - 30/);
  assert.match(html, /planning estimates, not official MNA hike times/);
});
