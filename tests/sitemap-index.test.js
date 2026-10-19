import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSitemapIndex } from '../scripts/build-sitemap-index.mjs';
test('index preserves specialist/nested maps, deduplicates and excludes self/other hosts', () => {
  const xml = buildSitemapIndex(`Sitemap: https://chrisizworski.com/sitemap.xml
Sitemap: https://chrisizworski.com/sitemap.xml
Sitemap: https://chrisizworski.com/sitemap-index.xml
Sitemap: https://picturedrocks.chrisizworski.com/sitemap-pictured-rocks.xml
Sitemap: https://chrisizworski.com/fall-color/destinations-sitemap.xml`);
  assert.equal((xml.match(/<sitemap>/g) || []).length, 2);
  assert.ok(xml.includes('/fall-color/destinations-sitemap.xml'));
  assert.ok(!xml.includes('picturedrocks'));
  assert.ok(!xml.includes('<lastmod>'));
  assert.equal(xml, buildSitemapIndex(`Sitemap: https://chrisizworski.com/fall-color/destinations-sitemap.xml
Sitemap: https://chrisizworski.com/sitemap.xml`));
});
