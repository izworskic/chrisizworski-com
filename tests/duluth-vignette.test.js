const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { eligible, placerTag, PLACER_VERSION } = require('../lib/adsense-eligibility');
const config = require('../config/in-article-ads.json');

const js = fs.readFileSync(path.join(__dirname, '../public/assets/in-article-ads.js'), 'utf8');

test('Canal Park stays ad eligible with the placed-ad script', () => {
  assert.equal(eligible('<html><body>Canal Park</body></html>', '/duluth-canal-park/'), true);
  assert.equal(config.excludeRoutes.includes('/duluth-canal-park/'), false);
  assert.equal(PLACER_VERSION, 5);
  assert.match(placerTag('/duluth-canal-park/', config), /in-article-ads\.js\?v=5/);
});

test('Canal Park links opt out of Google vignette navigation', () => {
  assert.match(js, /route === '\/duluth-canal-park'/);
  assert.match(js, /data-google-vignette/);
  assert.match(js, /setAttribute\('data-google-vignette', 'false'\)/);
  assert.match(js, /MutationObserver/);
});

test('vignette opt-out does not remove placed in-article ads', () => {
  assert.match(js, /className = 'in-article-ad'/);
  assert.match(js, /data-ad-layout=\"in-article\"/);
  assert.match(js, /window\.adsbygoogle/);
});
