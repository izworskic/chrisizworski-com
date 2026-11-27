'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { create } = require('../lib/river-passage.js');
const seaway = require('../lib/seaway-passage.js');
const watch = require('../public/assets/river-ship-watch.js');
const corridorCfg = JSON.parse(fs.readFileSync('data/passage-corridors/st-clair-detroit.json', 'utf8'));
const model = JSON.parse(fs.readFileSync('data/st-clair-river-ships/passage-model.json', 'utf8'));
const page = JSON.parse(fs.readFileSync('data/st-clair-river-ships/page.json', 'utf8'));
const corridor = create({ channel: model.geometry.channel, viewpoints: model.geometry.viewpoints, refLat: model.geometry.refLat, maxOffsetKm: model.geometry.maxOffsetKm });

function pointOn(c, km) {
  const ch = c.CHANNEL; let acc = 0; const k = 111.32 * Math.cos((c === seaway ? 45 : corridorCfg.refLat) * Math.PI / 180);
  for (let i = 1; i < ch.length; i++) {
    const a = ch[i - 1], b = ch[i], len = Math.hypot((b[1] - a[1]) * k, (b[0] - a[0]) * 111.32);
    if (acc + len >= km) { const f = (km - acc) / len; return { lat: a[0] + (b[0] - a[0]) * f, lon: a[1] + (b[1] - a[1]) * f }; }
    acc += len;
  }
}

test('generalized engine reproduces the Seaway engine exactly on the Seaway corridor', () => {
  const c = create({ channel: seaway.CHANNEL, viewpoints: seaway.VIEWPOINTS, refLat: 45 });
  const pts = [];
  for (let n = 0; n < 30; n++) for (let t = 0; t < 600; t += 5) {
    const km = 40 + (10 + (n % 7)) * t / 60; if (km > 270) break;
    pts.push({ mmsi: String(316400000 + n), t: Date.UTC(2025, 5, 1 + n) + t * 60000, ...pointOn(seaway, km), sog: 8, type: 70, len: 200 });
  }
  assert.equal(JSON.stringify(c.buildModel(c.passages(pts))), JSON.stringify(seaway.buildModel(seaway.passages(pts))));
  assert.deepEqual(c.VIEW_KM, seaway.VIEW_KM);
});

test('browser copy of the generalized engine is byte-identical to lib/river-passage.js', () => {
  const copy = fs.readFileSync('public/assets/river-passage.js', 'utf8').split('\n').slice(1).join('\n');
  assert.equal(copy, fs.readFileSync('lib/river-passage.js', 'utf8'));
});

test('corridor config: towns sit downriver in order and inside the bbox', () => {
  const c = create(corridorCfg);
  const order = ['port-huron', 'marysville', 'st-clair', 'marine-city', 'algonac', 'belle-isle', 'detroit-riverwalk'].map(v => c.VIEW_KM[v]);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  for (const v of Object.values(corridorCfg.viewpoints)) {
    assert.ok(v.lat >= corridorCfg.bbox[0] && v.lat <= corridorCfg.bbox[2] && v.lon >= corridorCfg.bbox[1] && v.lon <= corridorCfg.bbox[3]);
    assert.ok(c.project(v.lat, v.lon).offsetKm < 1.5, v.name);
  }
});

test('the NOAA extractor prefilter is unchanged for the Seaway and covers the St. Clair bbox', async () => {
  const m = await import('../scripts/seaway-noaa-corridor.mjs');
  const s = m.prefilterFor(m.CORRIDOR);
  assert.ok(s.test('1,x,-75.9,44.3,1') && s.test('1,x,44.3,-75.9,1') && !s.test('1,x,-82.4,42.9,1'));
  const d = m.prefilterFor(corridorCfg.bbox);
  assert.ok(d.test('1,x,-82.42,42.99,1') && d.test('1,x,-83.1,42.3,1') && !d.test('1,x,-87.6,41.8,1'));
});

test('published model holds only windows that met the bar, for the five river towns', () => {
  assert.deepEqual(Object.keys(model.viewpoints).sort(), Object.keys(page.viewpoints).sort());
  for (const buckets of Object.values(model.windows)) for (const s of Object.values(buckets)) {
    assert.ok(s.testPassages >= model.bar.minTestPassages && s.hitRate >= model.bar.minHitRate && s.halfWidthMin * 2 <= model.bar.maxWindowMin);
  }
  assert.equal(model.windows['port-huron']['2-6h'], undefined, 'Port Huron 2-6h failed the width bar');
  assert.equal(watch.horizonHours(model, 'port-huron'), 2);
  assert.equal(watch.horizonHours(model, 'algonac'), 6);
});

const NOW = Date.UTC(2026, 10, 27, 18, 0);
function vessel(km, dir, over = {}) {
  const bearing = corridor.channelBearing(km), course = dir > 0 ? bearing : (bearing + 180) % 360;
  const p = pointOn({ CHANNEL: model.geometry.channel }, km);
  return { mmsi: '316000777', name: 'TEST LAKER', ...p, seen: new Date(NOW - 2 * 60000).toISOString(), speedKnots: 10, course, shipType: 70, lengthMeters: 220,
    motion: { approachEligible: true, courseOverGround: course }, ...over };
}

test('a downbound ship below the Blue Water Bridge gets ordered windows down the river', () => {
  const rows = watch.forecasts(model, [vessel(model.viewpoints['port-huron'].km + 1, 1)], NOW, corridor);
  const byTown = Object.fromEntries(rows.map(r => [r.viewpoint, r]));
  assert.ok(byTown.marysville && byTown['st-clair']);
  assert.equal(byTown['port-huron'], undefined, 'already past Port Huron');
  assert.ok(byTown.marysville.median < byTown['st-clair'].median);
  assert.match(watch.windowText(byTown.marysville), /^\d{1,2}:\d{2}(–| – )\d{1,2}:\d{2}.*(AM|PM)$/);
});

test('an upbound ship from Lake St. Clair reaches Algonac before Marine City', () => {
  const rows = watch.forecasts(model, [vessel(model.viewpoints.algonac.km + 15, -1)], NOW, corridor);
  const a = rows.find(r => r.viewpoint === 'algonac'), m = rows.find(r => r.viewpoint === 'marine-city');
  assert.ok(a && m && a.median < m.median);
  assert.equal(a.dir, -1);
});

test('ships that should not get a window are refused', () => {
  const none = list => assert.equal(watch.forecasts(model, list, NOW, corridor).length, 0);
  const km = model.viewpoints['st-clair'].km - 5;
  none([vessel(km, 1, { motion: { approachEligible: false } })]);
  none([vessel(km, 1, { shipType: 37 })]);
  none([vessel(km, 1, { lengthMeters: 20 })]);
  none([{ ...vessel(km, 1), lat: 42.95, lon: -82.20 }]);                 // inland Ontario, off channel
  const across = vessel(km, 1); across.motion = { ...across.motion, courseOverGround: (corridor.channelBearing(km) + 90) % 360 };
  none([across]);
  none([vessel(model.viewpoints.algonac.km + 3, 1)]);                    // past every river town, downbound
});

test('freighter API: st-clair-detroit is a bounded regional query; unknown regions are rejected', async () => {
  const handler = require('../api/freighter-ais.js');
  const realFetch = global.fetch;
  let asked = null;
  global.fetch = async url => { asked = url; return { ok: true, json: async () => ({ type: 'FeatureCollection', features: [] }) }; };
  const call = async q => { const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; await handler({ method: 'GET', query: q, headers: {} }, r); return r; };
  try {
    const ok = await call({ region: 'st-clair-detroit' });
    assert.equal(ok.code, 200);
    assert.equal(ok.body.scope, 'st-clair-detroit-regional-openwaters');
    assert.match(asked, new RegExp('bbox=' + corridorCfg.bbox.join(',').replace(/\./g, '\\.') + '&max_age=30m'));
    assert.match(ok.headers['Cache-Control'], /s-maxage=45/);
    const bad = await call({ region: 'constructor' });
    assert.equal(bad.code, 400);
  } finally { global.fetch = realFetch; }
});

test('page: answer surface, identity, sources and inline model', () => {
  const html = fs.readFileSync('public/st-clair-river-ships/index.html', 'utf8');
  const head = html.split('</head>')[0];
  const title = head.match(/<title>([^<]+)<\/title>/)[1].replace(/&amp;/g, '&');
  assert.equal(title, page.title);
  assert.ok(title.length >= 35 && title.length <= 60);
  const desc = head.match(/<meta name="description" content="([^"]+)"/)[1];
  assert.equal(desc, page.description);
  assert.ok(desc.length >= 120 && desc.length <= 158);
  assert.match(head, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/st-clair-river-ships\/">/);
  const graph = JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.equal(graph.find(n => n['@type'] === 'Person')['@id'], 'https://chrisizworski.com/#person');
  assert.equal(graph.find(n => n['@type'] === 'WebPage').dateModified, page.dateModified);
  assert.ok(graph.find(n => n['@type'] === 'FAQPage').mainEntity.length >= 4);
  assert.deepEqual(JSON.parse(html.match(/<script type="application\/json" id="rswModel">(.*?)<\/script>/)[1]), model);
  assert.match(html, /data-api="\/api\/freighter-ais\?region=st-clair-detroit"/);
  assert.match(html, /Ship windows load with JavaScript\./);
  for (const v of Object.values(page.viewpoints)) assert.ok(html.includes(v.source), v.source);
  assert.ok(html.indexOf('/assets/river-passage.js') < html.indexOf('/assets/river-ship-watch.js'));
});

test('network: registry, Tools card + ItemList, sitemap, Freighter Central and ship-watching spots handoffs', () => {
  const reg = JSON.parse(fs.readFileSync('benchmarks/tool-network-registry.json', 'utf8'));
  assert.ok(reg.tools.find(t => t.id === 'st-clair-river-ships' && t.canonical === 'https://chrisizworski.com/st-clair-river-ships/'));
  assert.ok(reg.relationships.some(r => r.from === 'detroit-freighters' && r.to === 'st-clair-river-ships'));
  const tools = fs.readFileSync('public/tools/index.html', 'utf8');
  assert.match(tools, /data-tool-id="st-clair-river-ships"[\s\S]*?href="\/st-clair-river-ships\/"/);
  const list = JSON.parse(tools.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(n => n['@id'] === 'https://chrisizworski.com/tools/#toollist');
  assert.ok(list.itemListElement.some(e => e.item.url === 'https://chrisizworski.com/st-clair-river-ships/'));
  assert.match(fs.readFileSync('public/sitemap.xml', 'utf8'), /<loc>https:\/\/chrisizworski\.com\/st-clair-river-ships\/<\/loc>/);
  assert.match(fs.readFileSync('public/freighters/index.html', 'utf8'), /data-st-clair-discovery="freighters"[\s\S]*?href="\/st-clair-river-ships\/"/);
  assert.match(fs.readFileSync('public/great-lakes-ship-watching-spots/index.html', 'utf8'), /href="\/st-clair-river-ships\/" data-st-clair-discovery="spots"/);
});
