import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('public/guides/index.html', 'utf8');
const sitemap = readFileSync('public/sitemap.xml', 'utf8');
const bird = 'https://michiganbirdingreport.com/migration';
const bloom = 'https://phenology.chrisizworski.com/bloom-tracker';

test('the two external spring field tools are real static links near the top of Field Guides', () => {
  const field = page.indexOf('id="field-guides"');
  const tools = page.indexOf('<section id="birds-and-blooms"');
  const list = page.indexOf('<div id="field-guides-list">');
  assert.ok(field > -1 && tools > field && list > tools, 'tool discovery precedes the existing guide registry cards');
  const block = page.slice(tools, list);
  for (const [slug, url] of [['michigan-migration-field-tool', bird], ['michigan-blooms-field-tool', bloom]]) {
    assert.match(block, new RegExp('data-field-guide="' + slug + '"'));
    assert.ok(block.includes('href="' + url + '"'), slug + ': direct, server-rendered tool link required');
    assert.ok(block.includes('aria-label='), 'links must be understandable out of context');
  }
  assert.equal((block.match(/class="field-tool-card"/g) || []).length, 2, 'tools must use distinct cards so guide inventory stays unchanged');
  assert.equal((block.match(/class="guide-card"/g) || []).length, 0, 'tools must not be counted as standalone guides');
  assert.match(block, /data-months="3,4,5,6,8,9,10"/);
  assert.match(block, /data-months="3,4,5,6,7,8,9,10"/);
  assert.ok(block.includes('data-fg-season hidden'), 'seasonal badges default to hidden when JS fails');
  assert.match(block, /not a sighting or bloom confirmation/);
  assert.ok(!block.includes('id="field-guides-list"'), 'tool cards must remain separate from the existing field-guide registry');
});

test('spring awakening guide and browse index offer accessible cross-links', () => {
  assert.match(page, /href="#birds-and-blooms">Birds &amp; Blooms Field Tools/);
  const guide = page.split('data-field-guide="michigan-spring-awakening-field-guide"')[1].split('</div>\n</div>')[0];
  assert.ok(guide.includes('href="' + bird + '"'), 'spring guide should link to migration');
  assert.ok(guide.includes('href="' + bloom + '"'), 'spring guide should link to bloom calendar');
  assert.match(page, /Michigan &amp; Seasonal Field Guides <span>22 Guides<\/span>/, 'two tools do not change the guide count');
});

test('no new canonical route, and existing advertising and document freshness remain intact', () => {
  assert.match(page, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/guides\/">/);
  assert.match(page, /"dateModified": "2026-11-18"/);
  assert.match(page, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
  assert.match(sitemap, /<loc>https:\/\/chrisizworski\.com\/guides\/<\/loc>\s*<lastmod>2026-11-18<\/lastmod>/);
});
