const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { applyAdSettings } = require('../lib/adsense-eligibility');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const canonical = 'https://chrisizworski.com/great-lakes-freighter-winter-layup/';

function sitemapFiles(folder = path.join(root, 'public')) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(folder, item.name);
    if (item.isDirectory()) return sitemapFiles(full);
    return /sitemap.*\.xml$|.*-sitemap\.xml$/i.test(item.name) ? [full] : [];
  });
}

test('winter layup has exactly one sitemap entry, on the indexed winter sitemap, with its true page date', () => {
  const html = read('public/great-lakes-freighter-winter-layup/index.html');
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  const modified = graph.find((x) => x['@type'] === 'WebPage').dateModified;
  assert.match(modified, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(html.includes('<link rel="canonical" href="' + canonical + '">'));

  const hits = sitemapFiles().flatMap((file) => {
    const xml = fs.readFileSync(file, 'utf8');
    const entries = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g)];
    return entries.filter((entry) => entry[1] === canonical)
      .map((entry) => ({ file: path.relative(path.join(root, 'public'), file).replaceAll(path.sep, '/'), date: entry[2] }));
  });
  assert.deepEqual(hits, [{ file: 'sitemap-winter.xml', date: modified }]);
  assert.ok(read('public/sitemap-index.xml').includes('<loc>https://chrisizworski.com/sitemap-winter.xml</loc>'));
});

test('winter layup hero does not repeat the map and arrival ledger counts', () => {
  const js = read('public/assets/freighter-winter-experience.js');
  assert.ok(js.includes("document.addEventListener('layup:fleet'"));
  assert.ok(js.includes('scene.setFleet(d.ships)'));
  assert.doesNotMatch(js, /fleetLine\.textContent|reported in winter berths|no arrivals reported yet/);
  const map = read('public/assets/freighter-layup.js');
  assert.ok(map.includes('state.map.fitBounds(bounds'));
  assert.ok(map.includes('dataset.initialBounds'));
  assert.ok(map.includes("['2025-26']") || map.includes("s.id==='2025-26'"));
});

test('historical roster ships have photographic media, with a shared missing-image fallback', () => {
  const data = JSON.parse(read('public/assets/freighter-layup-registry.json'));
  const historical = data.seasons.filter((s) => s.state === 'historical_snapshot');
  assert.ok(historical.length >= 2);
  historical.forEach((s) => s.records.forEach((v) => {
    assert.ok(v.photo?.alt && (v.photo.thumbUrl || v.photo.file), s.id + ': photo missing for ' + v.name);
  }));
  const js = read('public/assets/freighter-layup.js');
  assert.ok(js.includes('fallback-ship'));
});

test('winter layup disables persistent Auto ads on this route only', () => {
  const html = read('public/great-lakes-freighter-winter-layup/index.html');
  const layup = applyAdSettings(html, canonical);
  assert.doesNotMatch(layup, /pagead\/js\/adsbygoogle\.js|in-article-ads\.js/);
  const config = JSON.parse(read('config/in-article-ads.json'));
  assert.equal(config.pageExceptions.filter((x) => x.host === 'chrisizworski.com' && x.path === '/great-lakes-freighter-winter-layup' && x.match === 'exact').length, 1);
  const elsewhere = applyAdSettings('<html><head></head><body><main>Page</main></body></html>', 'https://chrisizworski.com/soo-locks/');
  assert.match(elsewhere, /pagead\/js\/adsbygoogle\.js/);
});

test('layup navigation spans the page and scrolls away; harbor panel is not sticky', () => {
  const css = read('public/assets/freighter-winter-home.css');
  assert.match(css, /\.layup-home \.topbar\{position:static;/);
  assert.match(css, /\.layup-home \.top-inner\{[^}]*flex-direction:column/);
  assert.match(css, /\.layup-home \.topbar nav\{[^}]*flex-wrap:wrap/);
  assert.match(css, /\.layup-home \.topbar nav\{[^}]*overflow:visible/);
  assert.match(css, /\.layup-home \.atlas-harbor-column\{[^}]*position:static/);
  assert.doesNotMatch(css, /--layup-anchor-reserve:calc\(158px/);
  const html = read('public/great-lakes-freighter-winter-layup/index.html');
  const nav = html.match(/<nav aria-label="Maritime tools">([\s\S]*?)<\/nav>/)?.[1] || '';
  assert.equal((nav.match(/<a href=/g) || []).length, 7);
});

test('layup title, H1 and linked creator credit remain unchanged', () => {
  const html = read('public/great-lakes-freighter-winter-layup/index.html');
  assert.match(html, /<title>Great Lakes Freighter Winter Layup Tracker \| Chris Izworski<\/title>/);
  assert.match(html, /<h1 id="page-title">When the giants<br><em>come in from the cold\.<\/em><\/h1>/);
  assert.ok(html.includes('Built by <a href="/chris-izworski/">Chris Izworski</a>.'));
});
