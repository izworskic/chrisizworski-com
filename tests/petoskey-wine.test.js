const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

const home = read('public', 'petoskey-wine', 'index.html');
const venues = read('public', 'petoskey-wine', 'venues', 'index.html');
const sitemap = read('public', 'sitemap-petoskey-wine.xml');
const robots = read('public', 'robots.txt');

test('the static export is rooted at /petoskey-wine/ and not at the origin root', () => {
  assert.match(home, /\/petoskey-wine\/_next\/static\//);
  assert.doesNotMatch(home, /(?:href|src)="\/_next\//);
});

test('canonicals point at the hub path, not the retired subdomain', () => {
  assert.match(home, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/petoskey-wine\/"/);
  assert.doesNotMatch(home, /petoskeywine\.chrisizworski\.com/);
  assert.doesNotMatch(venues, /petoskeywine\.chrisizworski\.com/);
});

test('the planner calls the hub routing function, which exists', () => {
  const chunks = fs
    .readdirSync(path.join(root, 'public', 'petoskey-wine', '_next', 'static', 'chunks'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => read('public', 'petoskey-wine', '_next', 'static', 'chunks', f));
  assert.ok(chunks.some((c) => c.includes('/api/petoskey-route')), 'planner does not call /api/petoskey-route');
  assert.ok(chunks.every((c) => !c.includes('"/api/route"')), 'planner still calls the retired Next route handler');
  assert.ok(fs.existsSync(path.join(root, 'api', 'petoskey-route.js')));
});

test('every exported page is in the section sitemap and the sitemap is in robots', () => {
  const pages = [];
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '_next') continue;
      const next = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(next, rel ? `${rel}/${entry.name}` : entry.name);
      else if (entry.name === 'index.html' && rel !== '404') pages.push(rel);
    }
  };
  walk(path.join(root, 'public', 'petoskey-wine'), '');
  assert.ok(pages.length >= 30, `expected the full section, found ${pages.length} pages`);
  for (const page of pages) {
    const loc = `https://chrisizworski.com/petoskey-wine/${page ? page + '/' : ''}`;
    assert.ok(sitemap.includes(`<loc>${loc}</loc>`), `sitemap is missing ${loc}`);
  }
  assert.match(robots, /Sitemap: https:\/\/chrisizworski\.com\/sitemap-petoskey-wine\.xml/);
});

test('the section never advertises the retired hosts it replaced', () => {
  // The /tools/ card is deliberately not in this change: /tools/ is inside a live
  // 28-day entity CTR measurement window through 2026-09-21 and is guarded by
  // protect-existing-winners. It lands in a follow-up once the window closes.
  const tools = read('public', 'tools', 'index.html');
  assert.doesNotMatch(tools, /petoskey-wine-region\.vercel\.app/);
  assert.doesNotMatch(tools, /petoskeywine\.chrisizworski\.com/);
  assert.doesNotMatch(home, /petoskey-wine-region\.vercel\.app/);
  assert.doesNotMatch(venues, /petoskey-wine-region\.vercel\.app/);
});

test('hours stay honest: unverified stops say call ahead rather than carry invented hours', () => {
  assert.match(venues, /call ahead/i);
  assert.match(venues, /publish a weekly schedule/);
  // React splits interpolated counts across comment markers in static HTML, so
  // compare the machine-readable count instead of the rendered sentence.
  assert.match(venues, /"numberOfItems":25/);
});

test('no em dashes ship in the section', () => {
  for (const [name, text] of [['home', home], ['venues', venues], ['sitemap', sitemap]]) {
    assert.ok(!text.includes('\u2014'), `em dash in ${name}`);
  }
});
