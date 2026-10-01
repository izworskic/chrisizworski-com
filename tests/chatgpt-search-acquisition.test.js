'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const robots = read('public/robots.txt');
const llms = read('public/llms.txt');
const middleware = read('middleware.ts');
const benchmark = JSON.parse(read('benchmarks/chatgpt-search-acquisition.json'));

const pilots = [
  {
    id: 'northern-lights-michigan',
    file: 'public/northern-lights-michigan/index.html',
    url: 'https://chrisizworski.com/northern-lights-michigan/',
    answerMarker: 'aurora-static-answer',
    sourcePattern: /NOAA/i,
  },
  {
    id: 'soo-locks',
    file: 'public/soo-locks/index.html',
    url: 'https://chrisizworski.com/soo-locks/',
    answerMarker: 'soo-schedule-answer',
    sourcePattern: /(?:U\.S\. Army Corps|USACE|Army Corps)/i,
  },
  {
    id: 'mackinac-bridge-live',
    file: 'public/mackinac-bridge-live/index.html',
    url: 'https://chrisizworski.com/mackinac-bridge-live/',
    answerMarker: 'mackinac-conditions-answer',
    sourcePattern: /Mackinac Bridge Authority/i,
  },
];

test('OAI-SearchBot search discovery is explicitly allowed', () => {
  assert.match(robots, /User-agent:\s*OAI-SearchBot\s*\nAllow:\s*\//i);
});

test('pilot pages preserve canonical, indexable, crawlable answer surfaces', () => {
  for (const pilot of pilots) {
    const html = read(pilot.file);
    const escapedUrl = pilot.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(html, new RegExp(`<link[^>]+rel=["']canonical["'][^>]+href=["']${escapedUrl}["']`, 'i'), `${pilot.id}: canonical`);
    assert.doesNotMatch(html, /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i, `${pilot.id}: indexability`);
    assert.ok(html.includes(pilot.answerMarker), `${pilot.id}: crawlable direct-answer marker`);
    assert.match(html, pilot.sourcePattern, `${pilot.id}: visible source/provenance context`);
    assert.ok(llms.includes(pilot.url), `${pilot.id}: llms canonical alignment`);
  }
});

test('Pictured Rocks host redirects tracked main-site decision routes to primary canonical host', () => {
  assert.match(middleware, /const PRIMARY_SITE_URL = 'https:\/\/chrisizworski\.com';/);
  assert.match(middleware, /function isPicturedRocksMainSiteLeak/);
  assert.match(middleware, /host === PICTURED_ROCKS_HOST && isPicturedRocksMainSiteLeak\(url\.pathname\)/);
  assert.match(middleware, /Response\.redirect\(canonical, 308\)/);

  const prefixes = [
    'northern-lights-michigan',
    'soo-locks',
    'fall-color',
    'mackinac-bridge-live',
    'great-lakes-beaches',
    'great-lakes-freighter-tracking',
    'michigan-ice',
    'great-lakes-buoys',
    'saginaw-bay-ecology',
  ];
  for (const prefix of prefixes) {
    assert.ok(middleware.includes(`'/${prefix}'`), `redirect prefix missing: ${prefix}`);
    assert.ok(middleware.includes(`'/${prefix}/:path*'`), `middleware matcher missing: ${prefix}`);
  }
});

test('AI-search acquisition benchmark is a complete 100-point release contract', () => {
  const sum = Object.values(benchmark.readinessScore.weights).reduce((a, b) => a + b, 0);
  assert.equal(sum, 100);
  assert.equal(benchmark.readinessScore.minimumReleaseScore, 95);
  assert.ok(Array.isArray(benchmark.hardVetoes) && benchmark.hardVetoes.length >= 6);
  assert.ok(Array.isArray(benchmark.pilotPromptCorpus) && benchmark.pilotPromptCorpus.length >= 18);
  assert.equal(benchmark.outcomeMetrics.canonicalCitationRate.includes('100%'), true);
});
