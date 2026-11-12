'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const reports = read('public/michigan-snow-totals/index.html');
const logic = read('public/assets/michigan-snow-totals.js');
const depth = read('public/michigan-snow-depth/index.html');
const forecast = read('public/lake-effect-snow/index.html');
const sitemap = read('public/sitemap-winter.xml');
test('storm snapshot is dated official report evidence and empty states stay hidden', () => {
  assert.ok(reports.includes('id="stormPulse"') && reports.includes('not a single storm-total measurement'));
  assert.ok(reports.indexOf('id="alertList"') < reports.indexOf('id="stormPulse"'), 'official alerts appear before the optional snapshot');
  assert.ok(logic.includes("if (rows.length < 2) { list.textContent = ''; panel.hidden = true; return; }"));
  assert.ok(logic.includes('rows.slice(0, 3)') && logic.includes('esc(stamp(r))'));
  assert.ok(logic.includes('renderSummary(rows); renderStormPulse(rows); renderAlerts();'));
  assert.ok(logic.includes("data-pulse-town") && logic.includes("loadPlaces().then(function () {"));
});
test('recognized town carries into editable origin, never automatically declares snow', () => {
  assert.ok(logic.includes("result.kind === 'town' || result.kind === 'nearby'"));
  assert.ok(logic.includes('/michigan-snow-depth/?origin=') && logic.includes('encodeURIComponent(origin)'));
  assert.ok(depth.includes("new URLSearchParams(location.search).get('origin')"));
  assert.ok(depth.includes('input && !input.value.trim()') && depth.includes('input.value = raw.trim()'));
  assert.ok(!depth.includes('input.form.submit('));
});
test('canonical, schema identity and sitemap stamps stay aligned', () => {
  for (const [html, name] of [[reports,'michigan-snow-totals'],[depth,'michigan-snow-depth'],[forecast,'lake-effect-snow']]) {
    assert.ok(html.includes('rel="canonical" href="https://chrisizworski.com/'+name+'/'));
    assert.ok(html.includes('name="robots" content="index,follow'));
    assert.ok(html.includes('https://chrisizworski.com/#person'));
    const stamp = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
    assert.ok(stamp && stamp >= '2026-11-10', name+' retains a truthful review date');
    assert.ok(sitemap.includes('<loc>https://chrisizworski.com/'+name+'/</loc><lastmod>'+stamp+'</lastmod>'));
  }
  assert.ok(forecast.includes('Forecast snowfall, observed snowfall and remaining snow depth are different evidence.'));
  assert.ok(reports.includes('Michigan Snow Totals Today') && depth.includes('Where Is the Good Snow?'));
});
