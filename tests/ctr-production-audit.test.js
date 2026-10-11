const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('production audit rejects a stale normal-URL title even with valid canonical and schema', async () => {
  const {inspectPage} = await import('../scripts/audit-ctr-production.mjs');
  // The shared build injects the loader; the committed source intentionally has none.
  const html = fs.readFileSync('public/mackinac-bridge-tolls/index.html','utf8') + '<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>';
  const expected = html.match(/<title>(.*?)<\/title>/)[1];
  assert.deepEqual(inspectPage(html, 'mackinac-bridge-tolls', expected).failures, []);
  assert.ok(inspectPage(html.replace(expected, 'Old title'), 'mackinac-bridge-tolls', expected).failures.some(s => /expected title/.test(s)));
});

test('production audit fails on absent canonical, absent creator, invalid schema and noindex header', async () => {
  const {inspectPage} = await import('../scripts/audit-ctr-production.mjs');
  const result = inspectPage('<title>Example</title><script type="application/ld+json">{</script>', 'mackinac-bridge-tolls', 'Example', {'x-robots-tag':'noindex'});
  for (const fragment of ['canonical', 'creator Person', 'Invalid JSON-LD', 'noindex']) assert.ok(result.failures.some(s => s.includes(fragment)));
});

test('production audit accepts the existing FAQPage subtype on the freighter page', async () => {
  const {inspectPage} = await import('../scripts/audit-ctr-production.mjs');
  const html = fs.readFileSync('public/great-lakes-freighter-tracking/index.html','utf8') + '<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>';
  const expected = html.match(/<title>(.*?)<\/title>/)[1];
  assert.deepEqual(inspectPage(html,'great-lakes-freighter-tracking',expected).failures,[]);
});

const loader = '<script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>';
const fixture = () => fs.readFileSync('public/mackinac-bridge-tolls/index.html', 'utf8');
const inspect = async html => (await import('../scripts/audit-ctr-production.mjs')).inspectPage(html, 'mackinac-bridge-tolls', fixture().match(/<title>(.*?)<\/title>/)[1]);

test('production audit detects reversed-order and unquoted robots directives', async () => {
  for (const meta of ['<meta content="noindex,follow" name="robots">', '<META CONTENT=noindex NAME=googlebot>']) {
    assert.ok((await inspect(fixture() + loader + meta)).failures.includes('Page is noindex'));
  }
  const html = fixture().replace(/<link rel="canonical" href="([^"]+)"\s*\/?>/, '<link href="$1" rel="canonical">') + loader;
  assert.deepEqual((await inspect(html)).failures, []);
});

test('production audit rejects inert ad URLs and counts real loaders only', async () => {
  for (const inert of [`<!--${loader}-->`, `<script>const diagnostic = ${JSON.stringify(loader)};</script>`, `<template>${loader}</template>`, loader.replace('<script ', '<script type="application/json" ')]) {
    assert.equal((await inspect(fixture() + inert)).adLoaders, 0);
    assert.ok((await inspect(fixture() + inert)).failures.some(s => /shared ad loader/.test(s)));
  }
  assert.equal((await inspect(fixture() + loader + `<!--${loader}-->`)).adLoaders, 1);
  assert.equal((await inspect(fixture() + loader + loader)).adLoaders, 2);
});

test('production audit rejects absent or competing content publishers despite valid authors', async () => {
  for (const type of ['WebPage', 'WebApplication', 'SoftwareApplication', 'Article']) {
    for (const publisher of [undefined, {'@id':'https://example.com/#person'}]) {
      const schema = {'@type':type, author:{'@id':'https://chrisizworski.com/#person'}, publisher};
      const html = fixture() + loader + `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
      const failures = (await inspect(html)).failures;
      assert.ok(failures.includes('Content publisher does not use shared Person'));
      assert.ok(!failures.includes('Content author does not use shared Person'));
    }
  }
});
