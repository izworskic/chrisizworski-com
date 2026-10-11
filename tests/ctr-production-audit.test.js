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
