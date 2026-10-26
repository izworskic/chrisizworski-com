const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const read = p => readFileSync(join(__dirname, '..', p), 'utf8');

const html = read('public/mackinac-bridge-tolls/index.html');
const benchmark = JSON.parse(read('benchmarks/transport-365-growth.json'));
const toll = benchmark.experiments.find(x => x.id === 'mackinac-toll-price-led-ctr');
const meta = (name) => html.match(new RegExp('<meta name="' + name + '" content="([^"]+)"'))?.[1];
const property = (name) => html.match(new RegExp('<meta property="' + name + '" content="([^"]+)"'))?.[1];
const title = html.match(/<title>([^<]+)<\/title>/)?.[1];

test('Price-led toll search result preserves the tool and publisher, without keyword stuffing', () => {
  assert.equal(title, 'Mackinac Bridge Toll: $4 Car | Calculator | Chris Izworski');
  assert.ok(title.length <= 60);
  assert.equal(title, toll.treatment.title);
  assert.equal(meta('description'), toll.treatment.metaDescription);
  assert.ok(meta('description').length <= 155);
  assert.match(meta('description'), /^Mackinac Bridge toll 2026: \$4 car one-way, \$8 round trip/);
  assert.match(meta('description'), /Calculate RV and trailer tolls by axle/);
  assert.match(meta('description'), /2\.3% card fee and MacPass 36-hour discount/);
  assert.equal(property('og:title'), title);
  assert.equal(meta('twitter:title'), title);
  assert.equal(property('og:description'), meta('description'));
  assert.equal(meta('twitter:description'), meta('description'));
});

test('Official rate proof and callable calculator remain in server-rendered page', () => {
  assert.match(html, /<h1>Mackinac Bridge Toll 2026: \$4 for a Passenger Car<\/h1>/);
  assert.match(html, /a normal round trip is \$8 in 2026/);
  assert.match(html, /Passenger vehicles are \$2 per axle/);
  assert.match(html, /Motorhomes and other vehicles outside the passenger classification are \$5 per axle/);
  assert.match(html, /id="guideTollClass"/);
  assert.match(html, /id="guideLeadAxles"/);
  assert.match(html, /id="guideTowedAxles"/);
  assert.match(html, /id="guideTollTotal"/);
  assert.match(html, /src="\/assets\/mackinac-toll-calculator.js"/);
  assert.match(html, /https:\/\/www\.mackinacbridge\.org\/fares-traffic\/fare-schedule\//);
  assert.match(html, /MacPass passenger vehicles not towing a trailer can qualify for a \$0 return crossing/);
});

test('Canonical, creator identity, structured data and sitemap stay aligned', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/mackinac-bridge-tolls\/">/);
  assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(html, /<a href="https:\/\/chrisizworski\.com\/chris-izworski\/">Chris Izworski<\/a>/);
  assert.match(html, /"dateModified":"2026-10-26"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"name":"Mackinac Bridge Toll: \$4 Car \| Calculator \| Chris Izworski"/);
  const sitemap = read('public/sitemap.xml');
  assert.match(sitemap, /<loc>https:\/\/chrisizworski\.com\/mackinac-bridge-tolls\/<\/loc>\s*<lastmod>2026-10-26<\/lastmod>/);
});

test('Toll-specific production smoke is scoped and confirms clean plus cache-busted traffic', () => {
  const action = read('.github/workflows/mackinac-toll-production-smoke.yml');
  assert.match(action, /workflow_dispatch:/);
  assert.match(action, /public\/mackinac-bridge-tolls\/\*\*/);
  assert.match(action, /for attempt in \$\(seq 1 32\)/);
  assert.match(action, /"\$clean" == \*"\$expected"\*/);
  assert.match(action, /"\$bust" == \*"\$expected"\*/);
  assert.doesNotMatch(action, /\n\s*schedule:/);
});
