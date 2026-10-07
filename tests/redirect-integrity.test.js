const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const exactRedirects = config.redirects.filter(rule => !/[:({]/.test(rule.source));
const registry = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks/tool-network-registry.json'), 'utf8'));

test('retired page aliases resolve identically with and without the directory slash', () => {
  for (const rule of exactRedirects) {
    const base = rule.source.replace(/\/$/, '');
    const variants = [base, base + '/'].map(source => exactRedirects.find(item => item.source === source));
    assert.ok(variants.every(Boolean), `${base} must preserve both public URL forms`);
    for (const variant of variants) {
      assert.equal(variant.destination, rule.destination, base);
      assert.equal(variant.permanent, true, base);
    }
  }
});

test('retired page aliases go directly to canonical content instead of another alias or missing file', () => {
  for (const rule of exactRedirects) {
    const destination = new URL(rule.destination, 'https://chrisizworski.com');
    if (destination.hostname !== 'chrisizworski.com') {
      assert.ok(registry.tools.some(tool => new URL(tool.canonical).href === destination.href),
        `${rule.source} external replacement must be a registered canonical tool`);
      continue;
    }
    assert.ok(!exactRedirects.some(item => item.source === destination.pathname),
      `${rule.source} must not add a redirect chain`);
    const rewrite = config.rewrites.find(item => item.source === destination.pathname);
    const backing = rewrite?.destination || destination.pathname + 'index.html';
    assert.ok(backing.startsWith('/') && backing.endsWith('.html'), `${rule.source} backing HTML`);
    const html = fs.readFileSync(path.join(root, 'public', backing.slice(1)), 'utf8');
    const canonical = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)/i)?.[1];
    assert.equal(canonical, destination.href, `${rule.source} must target the page's declared canonical`);
    assert.ok(!/<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(html),
      `${rule.source} replacement must remain indexable`);
  }
});
