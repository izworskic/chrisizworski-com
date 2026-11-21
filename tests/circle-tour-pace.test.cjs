'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/lake-superior-circle-tour/index.html'), 'utf8');
const pace = require('../public/assets/circle-tour-pace.js');

function published(preset) {
  const start = html.indexOf('id="itin-' + preset + '"');
  const next = preset === '7' ? html.indexOf('id="itin-10"', start)
    : preset === '10' ? html.indexOf('id="itin-15"', start) : html.length;
  assert.ok(start > 0 && next > start);
  return [...html.slice(start, next).matchAll(/class="itin-day" data-day="(\d+)" data-stops="[^"]+" data-miles="(\d+)"/g)]
    .map((match) => ({day: Number(match[1]), miles: Number(match[2])}));
}

test('route rhythm is sourced from the three canonical published itineraries', () => {
  for (const preset of ['7', '10', '15']) {
    const days = published(preset);
    assert.equal(days.length, Number(preset));
    assert.deepEqual(days.map((day) => day.day), Array.from({length: days.length}, (_, i) => i + 1));
  }
  assert.match(html, /id="ctpace-hours"/);
  assert.match(html, /id="ctpace-verdict"/);
  assert.match(html, /id="ctpace-routes"/);
  assert.match(html, /circle-tour-pace\.css/);
  assert.match(html, /circle-tour-pace\.js/);
  assert.match(html, /id="circleTourMap"/);
  assert.match(html, /id="circle-tour-itineraries"/);
  assert.match(html, /href="https:\/\/chrisizworski\.com\/lake-superior-circle-tour\/"/);
});

test('changing the road-time target changes which published plan meets it', () => {
  const compare = (budget) => Object.fromEntries(['7', '10', '15']
    .map((preset) => [preset, pace.compareDays(published(preset), budget)]));
  const five = compare(5);
  assert.deepEqual(five['7'].over.map((day) => day.day), [3, 4, 6]);
  assert.deepEqual(five['10'].over.map((day) => day.day), [7, 9]);
  assert.deepEqual(five['15'].over.map((day) => day.day), []);
  assert.equal(pace.shortestWithinLimit(five), '15');
  assert.equal(pace.shortestWithinLimit(compare(8)), '7');
  assert.equal(pace.shortestWithinLimit(compare(4)), null);
  assert.equal(pace.roadHours(303), 7.7);
  assert.equal(pace.roadHours(0), 0);
});

test('incomplete mileage never receives a passing driving verdict', () => {
  assert.equal(pace.roadHours(null), null);
  assert.equal(pace.roadHours(-1), null);
  assert.equal(pace.roadHours(999), null);
  const bad = pace.compareDays([{day: 1, miles: null}], 8);
  assert.equal(bad.complete, false);
  assert.equal(pace.shortestWithinLimit({'7': bad, '10': bad, '15': bad}), null);
});

test('rhythm preview reuses native preset controls and does not change ads, SEO or storage', () => {
  const source = fs.readFileSync(path.join(root, 'public/assets/circle-tour-pace.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'public/assets/circle-tour-pace.css'), 'utf8');
  assert.match(source, /existing\.click\(\)/);
  assert.match(source, /circle-tour:preset-change/);
  assert.match(source, /document\.getElementById\("itin-"/);
  assert.match(source, /aria-pressed/);
  assert.match(source + css, /ctpace-day-ribbon/);
  assert.doesNotMatch(source + css, /localStorage|sessionStorage|adsbygoogle|googlesyndication|fetch\(/);
  assert.doesNotMatch(source + css, /\u2014/);
});
