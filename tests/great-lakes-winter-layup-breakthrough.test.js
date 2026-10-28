'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('Great Lakes Winter Layup breakthrough benchmark achieves 100/100', () => {
  const out = execFileSync(process.execPath, [path.join(root, 'scripts/benchmark-great-lakes-winter-layup.mjs'), '--check'], {
    encoding: 'utf8'
  });
  assert.match(out, /TOTAL SCORE: 100\/100/);
});

test('every vessel in 2024-25 and 2025-26 archives and all 6 biography pages have verified Commons photos', () => {
  const reg = JSON.parse(read('public/assets/freighter-layup-registry.json'));
  for (const seasonId of ['2024-25', '2025-26']) {
    const season = reg.seasons.find(s => s.id === seasonId);
    assert.ok(season && season.records.length > 0, seasonId);
    for (const r of season.records) {
      assert.ok(r.photo && r.photo.file && r.photo.page.includes('commons.wikimedia.org'), `Missing photo for ${r.id} in ${seasonId}`);
      assert.match(r.photo.alt, /not a winter layup|not a winter/i);
    }
  }
  const bios = JSON.parse(read('public/assets/freighter-vessel-biographies.json'));
  for (const p of bios.profiles) {
    const bioHtml = read(`public/great-lakes-freighter-winter-layup/vessels/${p.id}/index.html`);
    assert.ok(bioHtml.includes('class="bio-photo"'), `Missing bio-photo figure on ${p.id}`);
    assert.ok(!bioHtml.includes('class="bio-no-photo"'), `Unexpected bio-no-photo placeholder on ${p.id}`);
  }
});

test('Automatic 4-Season Maritime Calendar Engine classifies all four shipping phases in America/Detroit', () => {
  const js = read('public/assets/freighter-layup.js');
  const start = js.indexOf('function detectLayupSeasonPhase');
  const end = js.indexOf('function initSeasonalMaritimeEngine');
  assert.ok(start > 0 && end > start, 'detectLayupSeasonPhase must exist');
  const detect = new Function(js.slice(start, end) + '; return detectLayupSeasonPhase;')();

  assert.equal(detect(new Date('2026-11-15T16:00:00Z')).id, 'closing');
  assert.equal(detect(new Date('2027-01-15T16:00:00Z')).id, 'closing');
  assert.equal(detect(new Date('2027-01-16T16:00:00Z')).id, 'winter');
  assert.equal(detect(new Date('2027-02-14T16:00:00Z')).id, 'winter');
  assert.equal(detect(new Date('2027-03-01T16:00:00Z')).id, 'breakout');
  assert.equal(detect(new Date('2027-03-25T16:00:00Z')).id, 'breakout');
  assert.equal(detect(new Date('2027-07-04T16:00:00Z')).id, 'navigation');
});

test('Soo Locks, Freighter Central, and Ship Watching Spots cross-link to the Winter Layup Atlas', () => {
  const soo = read('public/soo-locks/index.html');
  assert.ok(soo.includes('id="soo-winter-layup-handoff"'));
  assert.ok(soo.includes('href="/great-lakes-freighter-winter-layup/"'));

  const freighters = read('public/freighters/index.html');
  assert.ok(freighters.includes('href="/great-lakes-freighter-winter-layup/"'));

  const spots = read('public/great-lakes-ship-watching-spots/index.html');
  assert.ok(spots.includes('href="/great-lakes-freighter-winter-layup/"'));
});
