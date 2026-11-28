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

test('page: answer first, live signal kept intact below it', () => {
  const lede = html.indexOf('class="lede"'), season = html.indexOf('data-detroit-season'), box = html.indexOf('id="rswBoard"'),
    map = html.indexOf('data-rsw-map '), live = html.indexOf('<section class="intent-live"'), where = html.indexOf('id="drWhereTitle"'), editorial = html.indexOf('id="intent-editorial"');
  assert.ok(lede < season && season < box && box < map && map < live && live < where && where < editorial, 'order: season, board, map, live signal, where to stand, editorial');
  assert.match(html, /id="intent-headline">Reading the current Detroit signal…</);
  assert.match(html, /data-max-report-age-min="10"/);
  assert.match(html, /Tested estimate, not a schedule/);
  assert.match(html, /data-api="\/api\/freighter-ais\?region=st-clair-detroit"/);
  assert.match(html, /detroit-intent\.js\?v=20261127-null-candidate/);
  assert.match(html, /detroit-freighter-relation\.js\?v=20260924a/);
  const inline = html.match(/<script type="application\/json" id="rswModel">([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(JSON.parse(inline), model);
  for (const m of ['rsw-detroit:start', 'rsw-detroit-where:start', 'rsw-detroit-method:start']) assert.equal((html.match(new RegExp(m, 'g')) || []).length, 1, m);
});

test('page: method panels folded, not removed; self-link marked current', () => {
  assert.match(html, /<details class="dr-method"><summary>How the live signal decides<\/summary><section class="content-grid">/);
  for (const phrase of [/10 minutes/, /active reported movement/, /roughly 12 miles/, /No active passage nearby is a useful answer/]) assert.match(html, phrase);
  assert.match(html, /href="\/detroit-river-freighters\/" aria-current="page"/);
  assert.match(html, /When will the next freighter pass the Detroit RiverWalk or Belle Isle\?/);
});

test('one Leaflet per page: the map reuses the relation map copy and vice versa', () => {
  const js = fs.readFileSync('public/assets/river-ship-map.js', 'utf8');
  assert.match(js, /script\[data-detroit-leaflet\]/);
  assert.match(js, /dataset\.detroitLeaflet = '1'/);
});

test('season band: Soo Locks open Mar 25 to Jan 15, winter says a quiet river is normal', () => {
  const { season } = require('../public/assets/detroit-river-page.js');
  assert.equal(season(new Date('2026-07-01T16:00:00Z')).state, 'open');
  assert.equal(season(new Date('2026-12-30T16:00:00Z')).state, 'final-weeks');
  assert.equal(season(new Date('2027-01-15T16:00:00Z')).state, 'winter');
  assert.match(season(new Date('2027-02-10T16:00:00Z')).text, /quiet board is normal/);
  assert.equal(season(new Date('2027-03-25T16:00:00Z')).state, 'open');
  assert.match(html, /data-detroit-season/);
  assert.match(html, /\/great-lakes-winter-freighter-guide\//);
});

test('Detroit cameras: USGS Fort Wayne still through the allowlist, BoatNerd Belle Isle click-to-play', () => {
  const { CAMERAS } = require('../lib/field-cameras.js');
  const fw = CAMERAS['detroit-river-fort-wayne'];
  assert.equal(fw.source, 'usgs');
  assert.equal(fw.camId, 'MI_Detroit_River_at_Fort_Wayne_at_Detroit');
  assert.equal(fw.maxAgeHours, 3, 'a ship-watching camera is stale after 3 hours, not the default 26');
  assert.match(html, /data-field-camera="detroit-river-fort-wayne"/);
  const cams = JSON.parse(fs.readFileSync('data/river-cameras.json', 'utf8')).pages['detroit-river-freighters'];
  for (const c of cams) assert.ok(html.includes(`data-river-cam data-yt="${c.youtube}"`), c.id);
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /\/assets\/field-camera\.js/);
  assert.match(html, /\/assets\/river-cams\.js\?v=/);
  const box = html.indexOf('id="rswBoard"'), camsAt = html.indexOf('id="rswCamsTitle"'), end = html.indexOf('rsw-detroit:end');
  assert.ok(box < camsAt && camsAt < end);
});

test('field-camera API honours a per-camera age limit', () => {
  const api = fs.readFileSync('api/field-camera.js', 'utf8');
  assert.match(api, /camera\.maxAgeHours/);
});
