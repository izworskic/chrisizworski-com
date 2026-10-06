const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const root = path.join(__dirname, '../tool-sources/ausable-river-map');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const provenance = JSON.parse(readFileSync(path.join(root, 'provenance.json'), 'utf8'));

test('Au Sable recovery preserves every original byte except the declared authority additions', () => {
  const credit = '<footer class="creator-credit">Built by <a href="https://chrisizworski.com/chris-izworski/" rel="author">Chris Izworski</a></footer>';
  const publisher = ',"publisher":{"@id":"https://chrisizworski.com/#person"}';
  assert.equal(html.split(publisher).length - 1, 3);
  assert.equal(html.split(credit).length - 1, 1);
  const original = html.replaceAll(publisher, '')
    .replace('\n ' + credit, '')
    .replace(/<style>\n\.creator-credit\{[\s\S]*?<\/style>\n<\/head>/, '</head>');
  assert.equal(createHash('sha1').update(original).digest('hex'), provenance.originalIndexSha1);
  assert.equal(createHash('sha256').update(original).digest('hex'), provenance.originalIndexSha256);
});

test('Au Sable source defines canonical publishing identity and keeps all supporting files', async () => {
  const { auditStructuredAuthority } = await import('../lib/tool-authority-identity.mjs');
  const { hasVisibleCreatorAttribution } = await import('../lib/creator-attribution.mjs');
  const graph = JSON.parse(html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1])['@graph'];
  const result = auditStructuredAuthority({ nodes: graph, documentNodes: graph, personId: 'https://chrisizworski.com/#person', homepage: 'https://chrisizworski.com/' });
  assert.deepEqual(result.errors, []);
  assert.equal(hasVisibleCreatorAttribution(html), true);
  assert.equal(provenance.originalFiles.length, 50);
  assert.equal(new Set(provenance.originalFiles.map(file => file.path)).size, 50);
  for (const name of ['api/share.js', 'api/snapshot.js', 'vercel.json', 'robots.txt', 'sitemap.xml', 'og.png']) {
    assert.match(provenance.originalFiles.find(file => file.path === name)?.sha || '', /^[a-f0-9]{40}$/);
  }
});
