import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ID = 'G-Y5D2V2W7HN';

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('site build keeps GA4 automatic for current and future HTML pages', async () => {
  const [pkgText, injector, standard, aiReferral] = await Promise.all([
    text('package.json'),
    text('scripts/inject-ga4.mjs'),
    text('docs/ANALYTICS_STANDARD.md'),
    text('public/assets/ai-referral-measurement.js'),
  ]);
  const pkg = JSON.parse(pkgText);

  assert.match(pkg.scripts?.['vercel-build'] || '', /inject-ga4\.mjs/);
  assert.match(injector, new RegExp(ID.replace(/-/g, '\\-')));
  assert.match(injector, /\.endsWith\('\.html'\)/);
  assert.match(injector, /ai-referral-measurement\.js/);
  assert.match(standard, new RegExp(ID.replace(/-/g, '\\-')));
  assert.match(standard, /chatgpt_referral_landing/);
  assert.match(standard, /does \*\*not\*\* overwrite GA4 campaign source/i);
  assert.match(aiReferral, /chatgpt\.com/);
  assert.match(aiReferral, /utm_source/);
  assert.match(aiReferral, /chatgpt_referral_landing/);
  assert.match(standard, /Standalone tools extracted into their own repositories/i);
  assert.match(standard, /Freighter View Farms is part of the same measurement network/i);
  assert.doesNotMatch(standard, /Freighter View Farms is an explicit exception/i);
});
