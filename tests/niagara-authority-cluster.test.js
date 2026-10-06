const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const robots = read('public/robots.txt');
const sitemap = read('public/sitemap-niagara-border.xml');
const middleware = read('middleware.ts');
const border = read('public/niagara-border-crossing/index.html');
const rainbow = read('public/national-tools/niagara-rainbow/index.html');
const viewpoint = read('public/national-tools/niagara-rainbow/best-viewpoint/index.html');
const timing = read('public/national-tools/niagara-rainbow/best-time-today/index.html');
const region = read('public/synced-national-tools/northeast-great-lakes/index.html');

const bridgePages = [
  'public/peace-bridge-wait-times/index.html',
  'public/rainbow-bridge-wait-times/index.html',
  'public/lewiston-queenston-bridge-wait-times/index.html',
  'public/whirlpool-rapids-bridge-crossing/index.html',
].map(read);

const borderUrls = [
  'https://chrisizworski.com/niagara-border-crossing/',
  'https://chrisizworski.com/peace-bridge-wait-times/',
  'https://chrisizworski.com/rainbow-bridge-wait-times/',
  'https://chrisizworski.com/lewiston-queenston-bridge-wait-times/',
  'https://chrisizworski.com/whirlpool-rapids-bridge-crossing/',
];

test('Niagara border canonical cluster has its own discoverable sitemap', () => {
  assert.match(robots, /Sitemap: https:\/\/chrisizworski\.com\/sitemap-niagara-border\.xml/);
  for (const url of borderUrls) assert.match(sitemap, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal((sitemap.match(/<url>/g) || []).length, 5);
  assert.doesNotMatch(sitemap, /picturedrocks\.chrisizworski\.com/);
});

test('Pictured Rocks host cannot own Niagara, national-tools, or primary author routes', () => {
  for (const prefix of [
    '/national-tools',
    '/niagara-border-crossing',
    '/peace-bridge-wait-times',
    '/rainbow-bridge-wait-times',
    '/lewiston-queenston-bridge-wait-times',
    '/whirlpool-rapids-bridge-crossing',
    '/about',
    '/chris-izworski',
    '/chris-izworski-source-guide',
  ]) assert.match(middleware, new RegExp(`['\"]${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(middleware, /host === PICTURED_ROCKS_HOST && isPicturedRocksMainSiteLeak/);
  assert.match(middleware, /Response\.redirect\(canonical, 308\)/);
  assert.match(middleware, /'\/national-tools\/:path\*'/);
  assert.match(middleware, /'\/niagara-border-crossing\/:path\*'/);
});

test('Niagara flagship pages expose indexable canonical and social-card contracts', () => {
  for (const html of [border, rainbow]) {
    assert.match(html, /name="robots" content="index,follow[^\"]*max-image-preview:large/);
    assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\//);
    assert.match(html, /property="og:title"/);
    assert.match(html, /property="og:description"/);
    assert.match(html, /property="og:image"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    assert.match(html, /name="twitter:title"/);
    assert.match(html, /name="twitter:description"/);
    assert.match(html, /name="twitter:image"/);
  }
});

test('bridge detail pages are indexable self-canonicals with large social cards', () => {
  for (const html of bridgePages) {
    assert.match(html, /name="robots" content="index,follow,max-image-preview:large"/);
    assert.match(html, /rel="canonical" href="https:\/\/chrisizworski\.com\//);
    assert.match(html, /property="og:title"/);
    assert.match(html, /property="og:description"/);
    assert.match(html, /property="og:image"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
  }
});

test('rainbow viewpoint is a fully attributed social surface and links to border sibling', () => {
  assert.match(viewpoint, /meta name="author" content="Chris Izworski"/);
  assert.match(viewpoint, /rel="author" href="https:\/\/chrisizworski\.com\/chris-izworski\/"/);
  assert.match(viewpoint, /name="twitter:image"/);
  assert.match(viewpoint, /property="og:image:alt"/);
  assert.match(viewpoint, /href="\/niagara-border-crossing\/"/);
  assert.match(viewpoint, /href="\/rainbow-bridge-wait-times\/"/);
  assert.match(viewpoint, /chris-izworski-source-guide/);
});

test('rainbow detailed timing page stays intentionally consolidated into the flagship', () => {
  assert.match(timing, /name="robots" content="noindex,follow"/);
  assert.match(timing, /rel="canonical" href="https:\/\/chrisizworski\.com\/national-tools\/niagara-rainbow\/"/);
});

test('Northeast Great Lakes hub links both distinct Niagara intents and the author source guide', () => {
  assert.match(region, /href="\/niagara-border-crossing\/"/);
  assert.match(region, /href="\/national-tools\/niagara-rainbow\/"/);
  assert.match(region, /numberOfItems":4/);
  assert.match(region, /href="\/chris-izworski\/"/);
  assert.match(region, /href="\/chris-izworski-source-guide\/"/);
});


test('Niagara flagship author graph resolves to the shared Person and related Michigan crossings', () => {
  const schemaText = border.split('<script type="application/ld+json">')[1]?.split("</script>")[0];
  assert.ok(schemaText, 'Niagara page JSON-LD graph is required');
  const graph = JSON.parse(schemaText)['@graph'];
  const person = graph.find(node => node['@type'] === 'Person');
  assert.deepEqual({id: person?.['@id'], name: person?.name, url: person?.url}, {
    id: 'https://chrisizworski.com/#person',
    name: 'Chris Izworski',
    url: 'https://chrisizworski.com/',
  });
  for (const type of ['WebPage', 'WebApplication']) {
    const node = graph.find(item => item['@type'] === type);
    assert.equal(node.author?.['@id'], person['@id'], type);
    assert.equal(node.publisher?.['@id'], person['@id'], type);
  }
  assert.ok(border.includes('https://chrisizworski.com/michigan-border-wait-times/'));
  assert.ok(sitemap.includes("<loc>https://chrisizworski.com/niagara-border-crossing/</loc><lastmod>2026-10-06</lastmod>"));
});
