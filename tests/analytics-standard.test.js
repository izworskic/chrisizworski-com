import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ID = 'G-Y5D2V2W7HN';

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('site build keeps GA4 automatic for current and future HTML pages', async () => {
  const [pkgText, injector, standard] = await Promise.all([
    text('package.json'),
    text('scripts/inject-ga4.mjs'),
    text('docs/ANALYTICS_STANDARD.md'),
  ]);
  const pkg = JSON.parse(pkgText);

  assert.match(pkg.scripts?.['vercel-build'] || '', /inject-ga4\.mjs/);
  assert.match(injector, new RegExp(ID.replace(/-/g, '\\-')));
  assert.match(injector, /\.endsWith\('\.html'\)/);
  assert.match(standard, new RegExp(ID.replace(/-/g, '\\-')));
  assert.match(standard, /Standalone tools extracted into their own repositories/i);
  assert.match(standard, /Freighter View Farms is part of the same measurement network/i);
  assert.doesNotMatch(standard, /Freighter View Farms is an explicit exception/i);
});
