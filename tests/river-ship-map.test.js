'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('public/st-clair-river-ships/index.html', 'utf8');
const cams = JSON.parse(fs.readFileSync('data/river-cameras.json', 'utf8'));
const mapJs = fs.readFileSync('public/assets/river-ship-map.js', 'utf8');
const camJs = fs.readFileSync('public/assets/river-cams.js', 'utf8');
const watchJs = fs.readFileSync('public/assets/river-ship-watch.js', 'utf8');

test('St. Clair page has the map after the board and before the viewing spots', () => {
  const board = html.indexOf('id="rswBoard"'), map = html.indexOf('data-rsw-map '), camsAt = html.indexOf('id="rswCamsTitle"'), where = html.indexOf('id="rswWhere"');
  assert.ok(board > 0 && board < map && map < camsAt && camsAt < where);
  assert.match(html, /data-rsw-map-summary role="status"/);
  assert.match(html, /river-ship-map\.js\?v=/);
});

test('map draws from the board data: no second ship request, Leaflet self-hosted and lazy', () => {
  assert.doesNotMatch(mapJs, /fetch\(/);
  assert.match(mapJs, /\/assets\/leaflet-1\.9\.4\.js/);
  assert.match(mapJs, /IntersectionObserver/);
  assert.match(mapJs, /rsw:data/);
  assert.match(watchJs, /emit\('rsw:data'/);
  assert.doesNotMatch(html, /<script[^>]*leaflet-1\.9\.4\.js/, 'Leaflet must not load with the page');
});

test('cameras: every configured camera is on the page, click-to-play, nothing from YouTube until then', () => {
  const list = cams.pages['st-clair-river-ships'];
  assert.ok(list.length >= 1);
  for (const c of list) {
    assert.match(c.youtube, /^[A-Za-z0-9_-]{11}$/);
    assert.ok(html.includes(`id="cam-${c.id}" data-river-cam data-yt="${c.youtube}"`), c.id);
    assert.ok(html.includes('https://www.youtube.com/watch?v=' + c.youtube), 'no-JS fallback link for ' + c.id);
  }
  assert.doesNotMatch(html, /<iframe/);
  assert.match(camJs, /youtube-nocookie\.com\/embed\//);
  assert.match(camJs, /\^\[A-Za-z0-9_-\]\{11\}\$/);
  const inline = JSON.parse(html.match(/<script type="application\/json" id="rswCams">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(inline.map(c => c.id), list.map(c => c.id));
});

test('the dead Blue Water Area CVB link is gone', () => {
  assert.doesNotMatch(html, /bluewater\.org/);
  assert.doesNotMatch(fs.readFileSync('data/st-clair-river-ships/page.json', 'utf8'), /bluewater\.org/);
});

test('camera checker reads live, ended and throttled pages correctly', async () => {
  const { liveState } = await import('../scripts/check-river-cams.mjs');
  assert.equal(liveState('..."isLiveNow":true...'), 'live');
  assert.equal(liveState('..."isLive":true,"x":1'), 'live');
  assert.equal(liveState('..."isLiveNow":false,"endTimestamp":"2026-08-28T11:55:33+00:00"'), 'not-live');
  assert.equal(liveState('<html>302 Moved</html>'), 'unknown');
  assert.equal(liveState(null), 'unknown');
});
