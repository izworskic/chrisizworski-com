import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ID = 'G-Y5D2V2W7HN';
const ADSENSE_PUBLISHER_ID = 'ca-pub-8222782620788075';
const ADSENSE_AUTO_ADS_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('site build keeps GA4 and AdSense Auto Ads automatic for current and future HTML pages', async () => {
  const [pkgText, injector, standard] = await Promise.all([
    text('package.json'),
    text('scripts/inject-ga4.mjs'),
    text('docs/ANALYTICS_STANDARD.md'),
  ]);
  const pkg = JSON.parse(pkgText);

  assert.match(pkg.scripts?.['vercel-build'] || '', /inject-ga4\.mjs/);
  assert.match(injector, new RegExp(ID.replace(/-/g, '\\-')));
  assert.match(injector, /\.endsWith\('\.html'\)/);
  assert.match(injector, new RegExp(ADSENSE_PUBLISHER_ID.replace(/-/g, '\\-')));
  assert.ok(injector.includes(ADSENSE_AUTO_ADS_SRC));
  assert.match(injector, /crossorigin="anonymous"/);
  assert.match(injector, /hasAdsenseAccount/);
  assert.match(injector, /hasAutoAds/);
  assert.match(standard, new RegExp(ID.replace(/-/g, '\\-')));
  assert.match(standard, /Standalone tools extracted into their own repositories/i);
  assert.match(standard, /Freighter View Farms is part of the same measurement network/i);
  assert.doesNotMatch(standard, /Freighter View Farms is an explicit exception/i);
});