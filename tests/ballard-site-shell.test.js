const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const shell = JSON.parse(fs.readFileSync(path.join(root, 'config/ballard-site-shell.json'), 'utf8'));

test('Ballard delivery retains inherited schema, canonical identity and a quiet credit on every page', async () => {
  const { applyBallardSiteShell } = await import('../scripts/ballard-site-shell.mjs');
  const { auditStructuredAuthority } = await import('../lib/tool-authority-identity.mjs');
  const { hasVisibleCreatorAttribution } = await import('../lib/creator-attribution.mjs');
  for (const [route, contract] of Object.entries(shell.pages)) {
    const html = fs.readFileSync(path.join(root, 'public', route, 'index.html'), 'utf8');
    const graph = JSON.parse(html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1])['@graph'];
    assert.match(html, new RegExp(`href="https://chrisizworski.com${route}"`));
    const result = auditStructuredAuthority({ nodes: graph, documentNodes: graph, personId: 'https://chrisizworski.com/#person', homepage: 'https://chrisizworski.com/' });
    assert.deepEqual(result.errors, [], route);
    assert.equal(hasVisibleCreatorAttribution(html), true, route);
    for (const inherited of contract.graph) {
      assert.ok(graph.some(node => node['@type'] === inherited['@type'] && (!inherited['@id'] || node['@id'] === inherited['@id'])), `${route}: ${inherited['@type']}`);
    }
    assert.equal(applyBallardSiteShell(html, route), html, `${route}: composition must be idempotent`);
  }
});
