const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => readFileSync(path.join(root, file), 'utf8');
const html = read('public/guides/index.html');

test('guide directory links published standalone guides and major guide collections', () => {
  const routes = [
    '/michigan-destinations/', '/fall-color/', '/lake-superior-circle-tour/',
    '/lake-superior-provincial-park/', '/sleeping-giant-provincial-park/', '/apostle-islands/', '/upper-peninsula-waterfalls/',
    '/mackinac-island/ferry-planner/', '/au-sable-river/', '/manistee-river-map/',
    '/michigan-paddling/manistee-river/', '/michigan-trout-streams/', '/great-lakes-fish/',
    '/great-lakes-shipwrecks/', '/great-lakes-shipwreck-viewing-field-guide/', '/michigan-dark-sky-field-guide/', '/great-lakes-beaches/', '/michigan-boat-launches/',
    '/great-lakes-ferries/', '/niagara-falls-today/', '/duluth-canal-park/',
    '/great-lakes-ship-watching-spots/', '/great-lakes-lighthouses/', '/michigan-paddling/',
    '/seed-starting-guide/', '/michigan-native-plants/', '/michigan-last-spring-freeze/',
    '/heirloom-vs-hybrid-seeds/', '/michigan-seed-libraries/', '/old-sow-live/'
  ];
  for (const route of routes) {
    assert.ok(html.includes(`href="${route}"`), `missing guide entry ${route}`);
    const file = path.join(root, 'public', route, 'index.html');
    assert.ok(existsSync(file), `missing backing page ${route}`);
    assert.doesNotMatch(readFileSync(file, 'utf8').slice(0, 10000), /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i, `noindex preview must not be promoted ${route}`);
  }
  assert.ok(!html.includes('href="/porcupine-mountains/"'), 'noindex Porkies preview is not a published guide');
});

test('live seasonal registry entries and seasonal wine editions remain discoverable', () => {
  const registry = JSON.parse(read('public/assets/field-guides-registry.json'));
  for (const guide of registry.guides.filter(g => g.status === 'live')) {
    assert.ok(html.includes(`data-field-guide="${guide.slug}"`), guide.slug);
    assert.ok(html.includes(`href="${guide.url}"`), guide.url);
  }
  // The dark-sky guides are owned by a separate repository and served through
  // an explicit hub rewrite, so they should not be expected as local files.
  for (const route of ['/national-tools/dark-sky/michigan/', '/national-tools/dark-sky/midwest/']) {
    assert.ok(html.includes(`href="${route}"`), route);
  }
  const rewrites = JSON.parse(read('vercel.json')).rewrites;
  assert.ok(rewrites.some(r => r.source.includes('/national-tools/dark-sky/:slug(') && r.source.includes('michigan') && r.destination.includes('national-outdoor-tools-hub')));
  for (const season of ['spring', 'summer', 'fall', 'winter']) {
    const route = `/michigan-wine-cider-spirits/${season}/`;
    assert.ok(html.includes(`href="${route}"`), route);
    assert.ok(existsSync(path.join(root, 'public', route, 'index.html')), route);
  }
});

test('collection counts match the visible card groups', () => {
  for (const [id, next, count] of [
    ['field-guides', 'ai-operations', 20], ['ai-operations', 'great-lakes-travel', 3],
    ['great-lakes-travel', 'zone-6a-gardening', 27], ['zone-6a-gardening', 'beyond-the-great-lakes', 11]
  ]) {
    const start = html.indexOf(`id="${id}"`), end = html.indexOf(`id="${next}"`, start);
    assert.ok(start >= 0 && end > start, id);
    assert.equal((html.slice(start, end).match(/class="guide-card"/g) || []).length, count, id);
    assert.match(html, new RegExp(`href="#${id}"[^>]*>[^<]*<span>${count} Guides</span>`));
  }
});
