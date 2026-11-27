'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const engine = require('../lib/seaway-passage.js');
const tis = require('../public/assets/thousand-islands-ships.js');
const model = JSON.parse(fs.readFileSync('data/thousand-islands/passage-model.json', 'utf8'));
const places = JSON.parse(fs.readFileSync('data/thousand-islands/places.json', 'utf8'));

// A position on the channel centreline at chainage km.
function at(km) {
  const c = engine.CHANNEL; let acc = 0;
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1], b = c[i];
    const len = Math.hypot((b[1] - a[1]) * 111.32 * Math.cos(45 * Math.PI / 180), (b[0] - a[0]) * 111.32);
    if (acc + len >= km) { const f = (km - acc) / len; return { lat: a[0] + (b[0] - a[0]) * f, lon: a[1] + (b[1] - a[1]) * f }; }
    acc += len;
  }
}
const NOW = Date.UTC(2026, 10, 27, 15, 0);
function vessel(km, dir, over = {}) {
  const bearing = engine.channelBearing(km), course = dir > 0 ? bearing : (bearing + 180) % 360;
  const seen = new Date(NOW - 2 * 60000).toISOString();
  return { mmsi: '316000123', name: 'TEST LAKER', ...at(km), seen, speedKnots: 10, course, shipType: 70, lengthMeters: 200,
    motion: { approachEligible: true, courseOverGround: course }, ...over };
}
const ALEX = model.viewpoints['alexandria-bay'].km;

test('the browser copy of the passage engine is byte-identical to lib/seaway-passage.js', () => {
  const copy = fs.readFileSync('public/assets/seaway-passage.js', 'utf8').split('\n').slice(1).join('\n');
  assert.equal(copy, fs.readFileSync('lib/seaway-passage.js', 'utf8'));
});

test('published model contains only windows that met the release bar', () => {
  for (const buckets of Object.values(model.windows)) for (const s of Object.values(buckets)) {
    assert.ok(s.testPassages >= model.bar.minTestPassages && s.hitRate >= model.bar.minHitRate && s.halfWidthMin * 2 <= model.bar.maxWindowMin);
  }
  assert.ok(model.windows['alexandria-bay']['0-2h']);
  assert.equal(model.windows.clayton['2-6h'], undefined, 'Clayton 2-6h failed the sample bar');
  assert.equal(model.viewpoints.brockville, undefined);
});

test('a moving downbound ship above Alexandria Bay gets a short window in Eastern time', () => {
  const [f] = tis.forecasts(model, [vessel(ALEX + 4, -1)], NOW, engine).filter(x => x.viewpoint === 'alexandria-bay');
  assert.ok(f, 'forecast present');
  assert.equal(f.dir, -1);
  assert.equal(f.bucket, '0-2h');
  assert.ok(f.median > NOW - 2 * 60000 && f.median < NOW + 60 * 60000);
  assert.equal(Math.round((f.latest - f.earliest) / 60000), Math.round(model.windows['alexandria-bay']['0-2h'].halfWidthMin * 2));
  assert.match(tis.windowText(f), /^\d{1,2}:\d{2}(–| – )\d{1,2}:\d{2}.*(AM|PM)$/);
});

test('ships that should not get a window are refused', () => {
  const none = list => assert.equal(tis.forecasts(model, list, NOW, engine).filter(x => x.viewpoint === 'alexandria-bay').length, 0);
  none([vessel(ALEX + 4, -1, { motion: { approachEligible: false } })]);              // anchored or stale
  none([vessel(ALEX + 4, -1, { shipType: 37 })]);                                     // pleasure craft
  none([vessel(ALEX + 4, -1, { lengthMeters: 25 })]);                                  // small boat
  none([vessel(ALEX - 4, -1)]);                                                       // already past, downbound
  none([{ ...vessel(ALEX + 4, -1), lat: 44.33, lon: -76.16 }]);                        // Gananoque harbour, off channel
  const across = vessel(ALEX + 4, -1); across.motion = { ...across.motion, courseOverGround: (engine.channelBearing(ALEX + 4) + 90) % 360 };
  none([across]);                                                                     // crossing the channel
  none([vessel(ALEX + 4, -1, { seen: 'not a date' })]);
});

test('lead times outside the published range get no window', () => {
  const far = tis.forecasts(model, [vessel(ALEX - 150, 1)], NOW, engine);              // upbound near Massena, hours away
  assert.equal(far.filter(x => x.viewpoint === 'alexandria-bay' && x.bucket === '6-12h').length, 0);
  const clayton = tis.forecasts(model, [vessel(model.viewpoints.clayton.km - 60, 1)], NOW, engine).filter(x => x.viewpoint === 'clayton');
  assert.ok(clayton.every(x => x.bucket === '0-2h'));
});

test('relative wording never says zero minutes', () => {
  const f = { earliest: NOW + 20000 };
  assert.equal(tis.relative(f, NOW), 'Any minute now');
  assert.equal(tis.relative({ earliest: NOW - 1 }, NOW), 'Could be passing now');
  assert.equal(tis.relative({ earliest: NOW + 95 * 60000 }, NOW), 'In about 1 h 35 min');
});

test('page: crawlable answer surface, identity, sources and inline model', () => {
  const html = fs.readFileSync('public/thousand-islands-ships/index.html', 'utf8');
  const head = html.split('</head>')[0];
  const title = (head.match(/<title>([^<]+)<\/title>/) || [])[1].replace(/&amp;/g, '&');
  assert.equal(title, places.title);
  assert.ok(title.length <= 60 && title.length >= 35);
  const desc = (head.match(/<meta name="description" content="([^"]+)"/) || [])[1].replace(/&#39;/g, "'");
  assert.equal(desc, places.description);
  assert.ok(desc.length >= 120 && desc.length <= 158);
  assert.match(head, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/thousand-islands-ships\/">/);
  const graph = JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.equal(graph.find(n => n['@type'] === 'Person')['@id'], 'https://chrisizworski.com/#person');
  assert.equal(graph.find(n => n['@type'] === 'WebPage').dateModified, places.dateModified);
  assert.ok(graph.find(n => n['@type'] === 'FAQPage').mainEntity.length >= 4);
  const inline = JSON.parse(html.match(/<script type="application\/json" id="tisModel">(.*?)<\/script>/)[1]);
  assert.deepEqual(inline, model);
  assert.match(html, /Ship windows load with JavaScript\. Without it, use the official order of turn/);
  assert.match(html, /seaway-greatlakes\.com\/vessel-transit\/order-of-turn/);
  for (const p of Object.values(places.viewpoints)) assert.ok(html.includes(p.source.replace(/&/g, '&amp;')) || html.includes(p.source));
  assert.ok(html.indexOf('id="tisModel"') < html.indexOf('/assets/thousand-islands-ships.js'));
  assert.ok(html.indexOf('/assets/seaway-passage.js') < html.indexOf('/assets/thousand-islands-ships.js'));
});

test('network: registry node, relationships, Tools card, ItemList, sitemap and hub handoff', () => {
  const reg = JSON.parse(fs.readFileSync('benchmarks/tool-network-registry.json', 'utf8'));
  assert.ok(reg.tools.find(t => t.id === 'thousand-islands-ships' && t.canonical === 'https://chrisizworski.com/thousand-islands-ships/'));
  assert.ok(reg.relationships.some(r => r.from === 'st-lawrence-seaway' && r.to === 'thousand-islands-ships'));
  assert.ok(reg.relationships.some(r => r.from === 'thousand-islands-ships'));
  const tools = fs.readFileSync('public/tools/index.html', 'utf8');
  assert.match(tools, /data-tool-id="thousand-islands-ships"[\s\S]*?href="\/thousand-islands-ships\/"/);
  const list = JSON.parse(tools.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(n => n['@id'] === 'https://chrisizworski.com/tools/#toollist');
  assert.ok(list.itemListElement.some(e => e.item.url === 'https://chrisizworski.com/thousand-islands-ships/'));
  assert.match(fs.readFileSync('public/sitemap.xml', 'utf8'), /<loc>https:\/\/chrisizworski\.com\/thousand-islands-ships\/<\/loc><lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  assert.match(fs.readFileSync('public/st-lawrence-seaway/index.html', 'utf8'), /data-tis-discovery[\s\S]*?href="\/thousand-islands-ships\/"/);
});
