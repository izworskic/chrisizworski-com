const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/isle-royale-map/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/assets/isle-royale-map.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api/isle-royale.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/catalog.json'), 'utf8'));
const deepManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/data/deep-layer-manifest.json'), 'utf8'));
const contextManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/isle-royale-map/data/context-layer-manifest.json'), 'utf8'));
const contextBuilder = fs.readFileSync(path.join(root, 'scripts/build-isle-royale-context-layers.py'), 'utf8');
const toolsPage = fs.readFileSync(path.join(root, 'public/tools/index.html'), 'utf8');
const circleTour = fs.readFileSync(path.join(root, 'public/lake-superior-circle-tour/index.html'), 'utf8');
const deepWorkflow = fs.readFileSync(path.join(root, '.github/workflows/isle-royale-deep-data.yml'), 'utf8');
const contextWorkflow = fs.readFileSync(path.join(root, '.github/workflows/isle-royale-context-data.yml'), 'utf8');

function rendered(s) { return s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'); }

test('canonical and Chris Izworski entity are present', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/isle-royale-map\/">/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /"dateModified":"2026-08-30"/);
});

test('SERP strings fit repository limits', () => {
  const title = rendered(html.match(/<title>([^<]+)<\/title>/)[1]);
  const desc = rendered(html.match(/<meta name="description" content="([^"]+)">/)[1]);
  assert.ok(title.length <= 60, `title ${title.length}`);
  assert.ok(desc.length <= 158, `description ${desc.length}`);
});

test('public basemap is keyless and not restricted NPS map tiles', () => {
  assert.match(js, /tile\.openstreetmap\.org/);
  assert.doesNotMatch((html + js).toLowerCase(), /nps\.gov\/maps\/pmtiles/);
});

test('runtime supports source-backed web-map ingestion and fail-soft fallback', () => {
  assert.match(js, /75e3ceba038a45f7b4d5a9d7c6a46ccf/);
  assert.match(js, /57a5a514a8cd40f098b2f99029d118cf/);
  assert.match(js, /services1\.arcgis\.com\/XBhYkoXKJCRHbe7M\/arcgis\/rest\/services\/Isle_Royale_WFL1\/FeatureServer/);
  assert.match(js, /MAPLABEL/);
  assert.match(js, /TRLALTNAME/);
  assert.match(js, /loadFallbackAnchors/);
  assert.match(js, /loadArcGISService/);
});

test('catalog covers the NPMaps source families and deep layers', () => {
  const cats = catalog.items.map(x => x.npmapsCategory.toLowerCase()).join(' ');
  for (const term of ['current park map','regional map','rock harbor','windigo','camping','transportation','shipwreck','relief','lighthouse','geologic','vegetation','historical']) {
    assert.ok(cats.includes(term), `missing ${term}`);
  }
  assert.ok(catalog.items.some(x => x.id === 'geology' && x.state === 'generated-runtime'));
  assert.ok(catalog.items.some(x => x.id === 'vegetation-detailed' && x.state === 'generated-runtime' && /1994\/1996/.test(x.vintage)));
  assert.ok(catalog.items.some(x => x.id === 'vegetation-simple' && x.state === 'generated-runtime' && /6 broad classes/i.test(x.label)));
  assert.ok(catalog.items.some(x => x.id === 'relief' && x.state === 'live-tile' && /U\.S\. Geological Survey/.test(x.publisher)));
  assert.ok(catalog.items.some(x => x.id === 'quiet-no-wake' && x.state === 'generated-runtime' && /22 official polygons/i.test(x.label)));
  assert.ok(catalog.items.some(x => x.id === 'vegetation-change-1996-2017' && x.state === 'generated-runtime'));
  assert.ok(catalog.items.some(x => x.id === 'horne-fire-2021' && x.state === 'generated-runtime'));
  assert.ok(catalog.items.some(x => x.id === 'shipwrecks' && x.state === 'live-api'));
});

test('planning, provenance, accessibility and safety hooks exist', () => {
  for (const id of ['feature-search','layer-filters','feature-list','map-status','park-live-status','deep-layer-status','context-layer-status','source-catalog']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /not a navigation chart/i);
  assert.match(html, /National Park Service/i);
  assert.match(html, /class="map-shelf"/);
  assert.match(html, /Rock Harbor area guide/);
  assert.match(html, /Anchorage zones/);
  assert.match(html, /Historic \/ archived map references/);
  assert.match(js, /sourceStatus/);
  assert.match(js, /\/api\/isle-royale/);
  assert.match(js, /boater_campgrounds/);
  assert.match(js, /current_alerts/);
  assert.match(api, /National Park Service — Boat-In Campgrounds/);
  assert.match(api, /detectCurrentClosures/);
  assert.match(html, /aria-live/);
});


test('live operations feed is fail-soft and never claims no alerts from a parser no-match', () => {
  assert.match(api, /Promise\.allSettled/);
  assert.match(api, /degraded:/);
  assert.match(js, /not a declaration that the park has no alerts/i);
  assert.match(js, /Verify current NPS conditions/i);
});


test('quiet/no-wake ETL is IRMA-first and fails closed on a stale regulatory set', () => {
  assert.match(contextBuilder, /irmaservices\.nps\.gov\/datastore\/v8\/rest/);
  assert.match(contextBuilder, /SavedCollection\/Profile/);
  assert.match(contextBuilder, /DigitalFiles/);
  assert.match(contextBuilder, /count != 22/);
  assert.match(contextBuilder, /quiet_count != 19/);
  assert.match(contextBuilder, /no_wake_count != 3/);
  assert.match(contextBuilder, /refusing to promote older\/mismatched geometry/);
});

test('current NPS off-trail camping zone closures are parsed without fabricating polygons', () => {
  const detector = require('../api/isle-royale.js')._test.detectCurrentClosures;
  const sample = `
    <h2>Current Conditions</h2>
    <p>Off-trail Camping Zone 9: Closed</p>
    <p>Off-trail camping zones 10, 11, 12, 13, 30, 31, 32, 33, 34, 35, 36, 37, 38 are closed due to wolf activity.</p>
  `;
  const alerts = detector(sample);
  const zones = [...new Set(alerts.flatMap(alert => alert.zones || (alert.id === 'off-trail-zone-9' ? [9] : [])))].sort((a,b) => a-b);
  assert.deepEqual(zones, [9,10,11,12,13,30,31,32,33,34,35,36,37,38]);
  assert.match(js, /not mapped polygon geometry/i);
  assert.match(js, /off-trail-camping\.htm/);
});

test('generated deep science layers are real, opt-in, hashed and visibly dated', () => {
  assert.match(html, /data-layer="geology"/);
  assert.match(html, /data-layer="vegetation-overview"/);
  assert.match(html, /data-layer="vegetation-baseline"/);
  assert.match(html, /Vegetation overview \(2000\)/);
  assert.match(html, /Vegetation detailed \(2000\)/);
  assert.match(js, /geology-units\.geojson/);
  assert.match(js, /vegetation-overview-2000\.geojson/);
  assert.match(js, /vegetation-baseline-2000\.geojson/);
  assert.match(js, /async function loadDeepLayer/);
  assert.match(js, /historical 2000-inventory derivatives/i);
  for (const key of ['geology','vegetation','vegetation_overview']) {
    const meta = deepManifest.sources[key];
    assert.ok(meta && /^[a-f0-9]{64}$/.test(meta.sha256), `${key} sha256`);
    const file = path.join(root, 'public/isle-royale-map/data', meta.file);
    assert.ok(fs.existsSync(file), `${key} generated file`);
    assert.equal(fs.statSync(file).size, meta.bytes, `${key} byte count`);
  }
  assert.ok(deepManifest.sources.geology.features >= 1900);
  assert.equal(deepManifest.sources.vegetation.features, 38);
  assert.equal(deepManifest.sources.vegetation_overview.features, 6);
  assert.ok(deepManifest.sources.vegetation_overview.bytes < deepManifest.sources.vegetation.bytes / 2);
  assert.ok(deepManifest.sources.vegetation_overview.bytes < 8_000_000);
  assert.match(deepManifest.sources.vegetation.accuracy_note, /Historical baseline/i);
  assert.match(deepManifest.sources.vegetation_overview.accuracy_note, /Broad thematic derivative/i);
});


test('verified NPS and USGS context layers are lazy, hashed and integrity-gated', () => {
  for (const id of ['quiet-no-wake','vegetation-change','horne-fire']) {
    assert.match(html, new RegExp(`data-layer="${id}"`));
  }
  assert.match(js, /context-layer-manifest\.json/);
  assert.match(js, /quiet-no-wake-zones\.geojson/);
  assert.match(js, /vegetation-change-1996-2017\.geojson/);
  assert.match(js, /horne-fire-burn-severity\.geojson/);
  assert.match(js, /async function loadContextLayer/);
  assert.match(js, /official NPS regulatory geometry/i);
  assert.match(js, /historical USGS context/i);

  const expected = {
    quiet_no_wake: 22,
    vegetation_change: 2738,
    horne_fire: 93,
  };

  for (const [key, count] of Object.entries(expected)) {
    const meta = contextManifest.layers[key];
    assert.equal(meta.status, 'generated', key);
    assert.equal(meta.features, count, `${key} feature count`);
    assert.match(meta.sha256, /^[a-f0-9]{64}$/);
    const file = path.join(root, 'public/isle-royale-map/data', meta.file);
    assert.ok(fs.existsSync(file), `${key} generated file`);
    const data = fs.readFileSync(file);
    assert.equal(data.length, meta.bytes, `${key} byte count`);
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), meta.sha256, `${key} sha256`);
  }

  assert.equal(contextManifest.layers.quiet_no_wake.quiet_no_wake_features, 19);
  assert.equal(contextManifest.layers.quiet_no_wake.no_wake_features, 3);
  assert.match(contextManifest.layers.quiet_no_wake.geometry_source, /irmaservices\.nps\.gov/);
  assert.match(contextManifest.layers.vegetation_change.license, /CC0/);
  assert.match(contextManifest.layers.horne_fire.license, /CC0/);
});


test('current NPS shipwreck buoy points are coordinated with visitor geometry without duplicate race', () => {
  assert.match(api, /fetchShipwreckDataset/);
  assert.match(api, /shipwrecks,/);
  assert.match(api, /National Park Service — Shipwreck Buoys/);
  assert.match(js, /visitorGeometrySettled/);
  assert.match(js, /addPendingShipwrecks/);
  assert.match(js, /hasMappedNamedFeature/);
  assert.match(js, /National Park Service — Shipwreck Buoys/);
  assert.match(js, /current NPS dive-site \/ mooring reference point/);
});


test('USGS relief is a keyless opt-in layer below vectors', () => {
  assert.match(html, /data-layer="relief"/);
  assert.match(js, /USGSShadedReliefOnly\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/);
  assert.match(js, /reliefPane/);
  assert.match(js, /USGS The National Map · 3DEP \/ GMTED2010/);
  assert.doesNotMatch(js, /nps\.gov\/maps\/pmtiles/i);
  const relief = catalog.items.find(x => x.id === 'relief');
  assert.equal(relief.state, 'live-tile');
  assert.match(relief.source, /basemap\.nationalmap\.gov/);
});

test('GIS workflows validate on PRs and only rebuild or write on explicit dispatch', () => {
  for (const workflow of [deepWorkflow, contextWorkflow]) {
    assert.match(workflow, /workflow_dispatch:/);
    assert.match(workflow, /if: github\.event_name == 'workflow_dispatch'/);
    assert.match(workflow, /Validate committed/);
    assert.match(workflow, /git pull --rebase origin/);
  }
  assert.match(deepWorkflow, /vegetation-overview-2000\.geojson/);
  assert.match(contextWorkflow, /quiet-no-wake-zones\.geojson/);
});


test('Isle Royale is discoverable from the main tools library and Lake Superior authority path', () => {
  assert.match(toolsPage, /search all 37 tools/i);
  assert.match(toolsPage, /href="\/isle-royale-map\/"/);
  assert.match(toolsPage, /Isle Royale Interactive Map, Trails, Camps, Boating Zones, Shipwrecks, and Deep GIS/);
  assert.match(toolsPage, /"position":37[^]*?"url":"https:\/\/chrisizworski\.com\/isle-royale-map\/"/);
  assert.match(circleTour, /href="\/isle-royale-map\/"[^>]*>Isle Royale interactive map/);
  assert.match(circleTour, /href="\/isle-royale-map\/" class="ext-link">Isle Royale map/);
});
