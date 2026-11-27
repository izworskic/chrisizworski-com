'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { create } = require('../lib/river-passage.js');
const watch = require('../public/assets/river-ship-watch.js');

const model = JSON.parse(fs.readFileSync('data/detroit-river-freighters/passage-model.json', 'utf8'));
const html = fs.readFileSync('public/detroit-river-freighters/index.html', 'utf8');
const corridor = create({ channel: model.geometry.channel, viewpoints: model.geometry.viewpoints, refLat: model.geometry.refLat, maxOffsetKm: model.geometry.maxOffsetKm });

function pointAt(km) {
  const ch = model.geometry.channel; let acc = 0; const k = 111.32 * Math.cos(model.geometry.refLat * Math.PI / 180);
  for (let i = 1; i < ch.length; i++) {
    const a = ch[i - 1], b = ch[i], len = Math.hypot((b[1] - a[1]) * k, (b[0] - a[0]) * 111.32);
    if (acc + len >= km) { const f = (km - acc) / len; return { lat: a[0] + (b[0] - a[0]) * f, lon: a[1] + (b[1] - a[1]) * f, bearing: Math.atan2((b[1] - a[1]) * k, (b[0] - a[0]) * 111.32) * 180 / Math.PI }; }
    acc += len;
  }
}
const NOW = Date.UTC(2026, 6, 15, 16, 0);
function downbound(ageMin, kmBefore = 15) {
  const p = pointAt(corridor.VIEW_KM['belle-isle'] - kmBefore);
  return { mmsi: 366000001, name: 'TEST LAKER', shipType: 70, lengthMeters: 200, lat: p.lat, lon: p.lon,
    course: (p.bearing + 360) % 360, seen: new Date(NOW - ageMin * 60000).toISOString(),
    motion: { approachEligible: true, courseOverGround: (p.bearing + 360) % 360 } };
}

test('Detroit model releases only windows that met the bar', () => {
  assert.deepEqual(Object.keys(model.viewpoints).sort(), ['belle-isle', 'detroit-riverwalk']);
  for (const [vid, buckets] of Object.entries(model.windows)) for (const [b, w] of Object.entries(buckets)) {
    assert.ok(w.testPassages >= 50 && w.hitRate >= 0.75 && w.halfWidthMin * 2 <= 180, vid + ' ' + b);
  }
  assert.ok(model.windows['detroit-riverwalk']['0-2h'] && model.windows['belle-isle']['0-2h']);
  assert.equal(model.windows['belle-isle']['2-6h'], undefined, 'Belle Isle 2-6h failed the width test and must stay unpublished');
});

test('10-minute rule: a fresh moving ship gets windows, a 12-minute-old report gets none', () => {
  const fresh = watch.forecasts(model, [downbound(4)], NOW, corridor, { maxReportAgeMin: 10 });
  assert.ok(fresh.some(f => f.viewpoint === 'belle-isle'));
  assert.ok(fresh.some(f => f.viewpoint === 'detroit-riverwalk'));
  assert.equal(watch.forecasts(model, [downbound(12)], NOW, corridor, { maxReportAgeMin: 10 }).length, 0);
  // Without the option the St. Clair behaviour is unchanged: the same report still forecasts.
  assert.ok(watch.forecasts(model, [downbound(12)], NOW, corridor).length > 0);
});

test('downbound ship reaches Belle Isle before the RiverWalk', () => {
  const rows = watch.forecasts(model, [downbound(2)], NOW, corridor, { maxReportAgeMin: 10 });
  const bi = rows.find(r => r.viewpoint === 'belle-isle'), rw = rows.find(r => r.viewpoint === 'detroit-riverwalk');
  assert.ok(bi.median < rw.median);
});

test('refusals: stopped, recreational and off-channel reports never get a window', () => {
  const stopped = { ...downbound(2), motion: { approachEligible: false } };
  const pleasure = { ...downbound(2), shipType: 37 };
  const off = { ...downbound(2), lat: 42.2, lon: -82.6 };
  assert.equal(watch.forecasts(model, [stopped, pleasure, off], NOW, corridor, { maxReportAgeMin: 10 }).length, 0);
});

test('page: box is additive, below the live answer, and the live answer is untouched', () => {
  const live = html.indexOf('<section class="intent-live"'), box = html.indexOf('id="rswBoard"'), editorial = html.indexOf('id="intent-editorial"');
  assert.ok(live > 0 && live < box && box < editorial);
  assert.match(html, /id="intent-headline">Reading the current Detroit signal…</);
  assert.match(html, /data-max-report-age-min="10"/);
  assert.match(html, /Tested estimate, not a schedule/);
  assert.match(html, /data-api="\/api\/freighter-ais\?region=st-clair-detroit"/);
  assert.match(html, /detroit-intent\.js\?v=20260922b/);
  assert.match(html, /detroit-freighter-relation\.js\?v=20260924a/);
  const inline = html.match(/<script type="application\/json" id="rswModel">([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(inline), model);
  assert.equal((html.match(/rsw-detroit:start/g) || []).length, 1);
});
