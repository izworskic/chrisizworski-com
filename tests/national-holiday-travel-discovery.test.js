import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mirror = fs.readFileSync('public/synced-national-tools/index.html', 'utf8');
const planner = fs.readFileSync('public/holiday-travel/index.html', 'utf8');
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const schemaText = mirror.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
const schema = JSON.parse(schemaText);
const graph = schema['@graph'];
const list = graph.find(node => node['@id'] === 'https://chrisizworski.com/national-tools/#toollist');
const url = 'https://chrisizworski.com/holiday-travel/';

test('the live National Tools rewrite serves this updated mirror', () => {
  for (const route of ['/national-tools', '/national-tools/']) {
    assert.ok(vercel.rewrites.some(r => r.source === route && r.destination === '/synced-national-tools/index.html'));
  }
  assert.match(planner, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/holiday-travel\/"/);
});

test('Holiday Travel has one searchable card beside Flight Tracker, in Everyday Decisions', () => {
  const section = mirror.match(/<section class="catalog-group everyday-decisions"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section);
  assert.equal((mirror.match(/data-tool-id="holiday-travel"/g) || []).length, 1);
  assert.match(section, /data-tool-id="holiday-travel" data-personas="everyday trip"/);
  assert.match(section, /data-tags="[^"]*thanksgiving christmas[^"]*"/);
  assert.match(section, /<a class="primary-action" href="https:\/\/chrisizworski\.com\/holiday-travel\/"/);
  const tracker = section.indexOf('data-tool-id="flight-tracker"');
  const holiday = section.indexOf('data-tool-id="holiday-travel"');
  const agentbase = section.indexOf('data-tool-id="agentbase"');
  assert.ok(tracker >= 0 && tracker < holiday && holiday < agentbase);
});

test('visible cards, finder count, structured list and source year stay in sync', () => {
  const cards = (mirror.match(/data-search-card/g) || []).length;
  assert.equal(cards, list.numberOfItems);
  assert.equal(list.itemListElement.length, cards);
  assert.equal((list.itemListElement.filter(item => item.url === url)).length, 1);
  assert.equal(list.itemListElement.find(item => item.url === url).name, 'Holiday Travel Planner');
  assert.match(mirror, new RegExp('id="finder-count" aria-live="polite">' + cards + ' tools shown'));
  assert.equal(graph.find(node => node['@id'] === 'https://chrisizworski.com/national-tools/#page')?.dateModified, '2026-11-25');
  const sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');
  assert.ok(sitemap.includes('<loc>https://chrisizworski.com/national-tools/</loc>\n    <lastmod>2026-11-25</lastmod>'), 'sitemap lastmod must match the catalog change');

  assert.ok(!mirror.includes('Holiday travel flights are live tracked by BTS'), 'must not invent live BTS data');
});

test('the national card, search corpus and seasonal peak configuration agree',()=>{
 const catalog=JSON.parse(fs.readFileSync('data/hub-search/corpus.json','utf8')).national;
 const peaks=JSON.parse(fs.readFileSync('data/directory-peaks.json','utf8')).national;
 const entries=catalog.filter(item=>item.id==='holiday-travel');
 assert.equal(entries.length,1); assert.equal(entries[0].href,url);
 assert.equal(entries[0].title,'Holiday Travel Planner');
 assert.deepEqual(peaks['holiday-travel'].windows,['11-15/12-02','12-10/01-02']);
 const visible=[...mirror.matchAll(/<article class="directory-card"[\s\S]*?<\/article>/g)].map(m=>new URL(m[0].match(/class="primary-action" href="([^"]+)"/)[1],'https://chrisizworski.com/').href);
 assert.deepEqual(list.itemListElement.map(item=>item.url),visible);
 assert.equal(new Set(visible).size,visible.length);
});
