// Munising visitor-ready day recipes: deterministic gates and source/arrival preservation.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PRESETS, seasonalAccess, assessPreset } = require('../public/assets/up-waterfalls-munising-day.js');
const html = fs.readFileSync(path.join(__dirname, '../public/upper-peninsula-waterfalls/index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/assets/up-waterfalls.css'), 'utf8');
const atlas = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/up-waterfalls.json'), 'utf8')).waterfalls;
const sourceMap = new Map(atlas.map(v => [v.id, v]));
const cards = new Map(Object.values(PRESETS).flat().map(id => [id, {
  dataset: { status: sourceMap.get(id)?.status, arrivalVerified: 'verified' },
  querySelector: selector => selector === '.save' ? { click() {} } : null
}]));
test('both plans use only published visitor-guide IDs and unique, intentionally ordered stops', () => {
  assert.deepEqual(PRESETS.shoreline, ['wagner-falls', 'miners-falls', 'elliot-falls']);
  assert.deepEqual(PRESETS.forest, ['wagner-falls', 'miners-falls', 'chapel-falls']);
  for (const ids of Object.values(PRESETS)) {
    assert.equal(ids.length, 3);
    assert.equal(new Set(ids).size, 3);
    for (const id of ids) {
      const r = sourceMap.get(id);
      assert.ok(r && r.publication === 'verified-access-guide', id);
      assert.ok(r.source.startsWith('https://'), id);
      assert.ok(r.parking && r.walk && r.minutes, id);
      assert.ok(!['closed', 'research'].includes(r.status), id);
    }
  }
});
test('seasonal safety gate refuses NPS winter driving itineraries and malformed dates', () => {
  for (const date of ['2026-12-01', '2027-01-05', '2027-02-28', '2027-03-31']) {
    assert.equal(seasonalAccess(date).blocked, true, date);
    assert.equal(assessPreset('shoreline', cards, [], date).ok, false, date);
  }
  for (const date of ['2026-02-31', 'yesterday', '2026-13-12']) assert.equal(seasonalAccess(date).blocked, true, date);
  assert.equal(seasonalAccess('2026-11-10').blocked, false);
  assert.equal(seasonalAccess('2027-04-01').blocked, false);
});
test('a preset never partially adds stops or overwrites an existing shortlist', () => {
  assert.deepEqual(assessPreset('shoreline', cards, ['wagner-falls'], '2027-06-01').missing, ['miners-falls', 'elliot-falls']);
  assert.equal(assessPreset('forest', cards, ['a','b','c','d','e'], '2027-06-01').ok, false);
  assert.equal(assessPreset('bogus', cards, [], '2027-06-01').ok, false);
  const bad = new Map(cards);
  bad.set('elliot-falls', { dataset: { status: 'research', arrivalVerified: 'pending' }, querySelector: () => ({}) });
  assert.equal(assessPreset('shoreline', bad, [], '2027-06-01').ok, false);
  assert.equal(assessPreset('shoreline', cards, [], '2027-06-01').ok, true);
});
test('source-led section is discoverable and JavaScript enhances existing shortlist after its handlers', () => {
  assert.match(html, /id="munising-day"/);
  assert.match(html, /data-munising-preset="shoreline"/);
  assert.match(html, /data-munising-preset="forest"/);
  assert.match(html, /id="munising-day-status"/);
  assert.ok(html.indexOf('/assets/up-waterfalls-munising-day.js') > html.indexOf('/assets/up-waterfalls-day-sheet.js'));
  assert.match(html, /https:\/\/www\.nps\.gov\/piro\/planyourvisit\/winter-road-closures\.htm/);
  assert.match(html, /https:\/\/www\.nps\.gov\/piro\/planyourvisit\/conditions\.htm/);
  assert.match(css, /\.munising-day-cluster/);
  const section = html.split('<section class="munising-day-cluster"')[1]?.split('<section class="nearby-lab"')[0] || '';
  for (const id of Object.values(PRESETS).flat()) assert.match(section, new RegExp('/upper-peninsula-waterfalls/' + id + '/'));
  assert.doesNotMatch(section, /maps\/dir\//, 'No unsupported waterfall-coordinate driving route');
  assert.match(section, /Munising Falls trail remains closed/);
});
