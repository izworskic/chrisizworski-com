const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../vercel.json');
const repairs = require('../benchmarks/coverage-route-repairs-2026-10-07.json');

// Resolve exact and allowlisted single-segment rules; the generic wildcards
// cannot satisfy this contract because the public directory URLs failed live.
function resolveDocument(pathname) {
  for (let index = 0; index < config.rewrites.length; index++) {
    const rule = config.rewrites[index];
    if (rule.source === pathname) return { index, destination: rule.destination };
    const parameter = rule.source.match(/^(.*):slug\(([^)]+)\)(\/?)$/);
    if (!parameter) continue;
    const [, prefix, options, suffix] = parameter;
    if (!pathname.startsWith(prefix) || (suffix && !pathname.endsWith(suffix))) continue;
    const slug = pathname.slice(prefix.length, suffix ? -suffix.length : undefined);
    if (!options.split('|').includes(slug)) continue;
    return { index, destination: rule.destination.replace(':slug', slug) };
  }
  return null;
}

test('all observed broken canonical pages resolve directly to the verified owner documents', () => {
  assert.equal(repairs.restoredRoutes.length, 41);
  for (const page of repairs.restoredRoutes) {
    const pathname = new URL(page.canonical).pathname;
    const family = pathname.slice(0, pathname.lastIndexOf('/', pathname.length - 2) + 1);
    const fallback = config.rewrites.findIndex(rule => rule.source === family + ':path*');
    assert.ok(fallback >= 0, `${pathname} owner fallback remains present`);
    for (const variant of [pathname, pathname.replace(/\/$/, '')]) {
      const resolved = resolveDocument(variant);
      assert.ok(resolved, `${variant} requires an explicit document route`);
      assert.equal(resolved.destination, page.ownerDocument, variant);
      assert.ok(resolved.index < fallback, `${variant} must precede its wildcard`);
      assert.equal(page.backingStatus, 200);
    }
  }
});

test('location rewrites do not catch sitemap files, unpublished cities, or nested coastal tools', () => {
  for (const family of ['rivers', 'frost', 'fall-color', 'coastal', 'snow']) {
    assert.equal(resolveDocument(`/national-tools/${family}/sitemap-locations.xml`), null);
    assert.equal(resolveDocument(`/national-tools/${family}/not-a-published-city/`), null);
    assert.equal(resolveDocument(`/national-tools/${family}/unknown/index.html`), null);
  }
  assert.equal(resolveDocument('/national-tools/coastal/oregon/hug-point/'), null);
  assert.equal(resolveDocument('/api/national-frost').destination,
    'https://national-frost.vercel.app/api/national-frost');
});
