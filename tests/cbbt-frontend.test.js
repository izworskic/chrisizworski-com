const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const view = require('../public/assets/cbbt-view.js');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'public/chesapeake-bay-bridge-tunnel/index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'public/assets/cbbt-live.js'), 'utf8');
const media = fs.readFileSync(path.join(ROOT, 'api/cbbt-media.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'public/assets/cbbt-live.css'), 'utf8');
const sitemap = fs.readFileSync(path.join(ROOT, 'public/sitemap-cbbt.xml'), 'utf8');
const robots = fs.readFileSync(path.join(ROOT, 'public/robots.txt'), 'utf8');

function meta(name) {
  const m = html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)`, 'i'));
  return m ? m[1] : null;
}

test('CBBT page has one canonical decision surface and crawlable answer', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/chesapeake-bay-bridge-tunnel\/">/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /Official CBBT status first/i);
  assert.match(html, /CBBT determines operational status/i);
  assert.match(html, /weather does not set CBBT status/i);
  assert.ok(meta('description').length <= 158);
  const title = html.match(/<title>(.*?)<\/title>/i)[1].replace(/&amp;/g, '&');
  assert.ok(title.length <= 60);
});

test('frontend consumes the backend and does not embed restriction or toll thresholds', () => {
  assert.match(js, /var API='\/api\/cbbt'/);
  assert.doesNotMatch(js, /windMph\s*[><=]/);
  assert.doesNotMatch(js, /gustMph\s*[><=]/);
  assert.doesNotMatch(js, /restrictionLevel\s*===/);
  assert.doesNotMatch(js, /\$\s*(?:1|6|16|21|22|26|31)\b/);
  assert.match(html, /The backend CBBT engine makes the eligibility decision/);
});

test('official status states remain explicit and conservative', () => {
  assert.equal(view.statusView({ state: 'OPEN', restrictionLevel: 'NONE' }).word, 'OPEN');
  assert.match(view.statusView({ state: 'OPEN_WITH_RESTRICTIONS', restrictionLevel: 'ADVISORY' }).headline, /open with restrictions/i);
  assert.match(view.statusView({ state: 'OPEN_WITH_RESTRICTIONS', restrictionLevel: 'LEVEL_1' }).headline, /open with restrictions/i);
  assert.equal(view.statusView({ state: 'OPEN_WITH_RESTRICTIONS', restrictionLevel: 'LEVEL_2' }).restriction, 'Level 2');
  assert.equal(view.statusView({ state: 'CLOSED', restrictionLevel: 'LEVEL_3' }).word, 'CLOSED');
  assert.match(view.statusView({ state: 'UNKNOWN', restrictionLevel: 'UNKNOWN' }).headline, /status unavailable/i);
  assert.match(view.statusView({ state: 'OFFICIAL_STATUS_CONFLICT', restrictionLevel: 'UNKNOWN' }).copy, /sources currently disagree/i);
});

test('vehicle results only translate backend decisions', () => {
  assert.match(view.vehicleView({ decision: 'ALLOWED', reason: 'NO_OFFICIAL_WIND_RESTRICTION_IDENTIFIED' }, 'Car / SUV').title, /allowed under the current CBBT restriction/i);
  assert.match(view.vehicleView({ decision: 'RESTRICTED', reason: 'LEVEL_1_TOWED_CONFIGURATION_RESTRICTED' }, 'Trailer combination').title, /cannot cross/i);
  assert.match(view.vehicleView({ decision: 'UNKNOWN', reason: 'OFFICIAL_STATUS_UNRESOLVED' }, 'RV').title, /cannot determine/i);
  assert.match(view.vehicleView({ state: 'NOT_EVALUATED' }, 'Car').title, /not evaluated/i);
});

test('freshness styling exposes stale data instead of presenting it as live', () => {
  assert.match(view.freshnessText({ state: 'fresh', ageMinutes: 1 }), /1 min ago/);
  assert.match(view.freshnessText({ state: 'aging', ageMinutes: 8 }), /Last updated 8 min ago/);
  assert.match(view.freshnessText({ state: 'stale', ageMinutes: 34 }), /Delayed.*34 min ago/);
  assert.match(view.freshnessText({ state: 'unavailable', ageMinutes: null }), /unavailable/);
});

test('toll view renders backend outcomes without a rate table', () => {
  assert.equal(view.tollView({ state: 'ESTIMATED', amount: 21 }).amount, 21);
  assert.match(view.tollView({ state: 'ESTIMATE_REQUIRES_APPROVAL', amount: 266 }).label, /requires CBBT approval/i);
  assert.match(view.tollView({ state: 'UNKNOWN', reason: 'TOLL_CLASS_UNRESOLVED' }).copy, /could not be resolved/i);
  assert.doesNotMatch(html, /<table[^>]*>[^]*toll/i);
});

test('progressive vehicle form exposes the backend-supported traveler attributes without policy logic', () => {
  for (const marker of ['exteriorCargo','heightFt','propaneCarried','propaneValveClosed','trailerSubtype','commercialType','payloadLb','highProfile','sixWheel']) {
    assert.ok(html.includes(`id="${marker}"`), marker);
  }
  for (const type of ['motorcycle','rv','towing_trailer','commercial','bus','other']) assert.ok(html.includes(`value="${type}"`), type);
});

test('CBBT canonical is exposed through a dedicated sitemap declared in robots', () => {
  assert.match(sitemap, /https:\/\/chrisizworski\.com\/chesapeake-bay-bridge-tunnel\//);
  assert.match(robots, /Sitemap: https:\/\/chrisizworski\.com\/sitemap-cbbt\.xml/);
});

test('radar is proxied server-side from the backend-declared station', () => {
  assert.match(html, /src="\/api\/cbbt-media\?asset=radar"/);
  assert.match(media, /RADAR_METADATA\.stationId/);
  assert.match(media, /radar\.weather\.gov\/ridge\/standard/);
  assert.match(media, /X-Robots-Tag/);
  assert.match(html, /Radar shows precipitation.*does not show or determine CBBT operating status/i);
});

test('required traveler workflows are present and mobile-first markup avoids giant hero media', () => {
  for (const marker of ['vehicleQuickSelect', 'vehicleDetails', 'weatherNow', 'forecastStrip', 'radarImage', 'tollForm', 'advisoryList', 'sourceDetails']) assert.ok(html.includes(`id="${marker}"`), marker);
  assert.match(css, /@media\(max-width:390px\)/i);
  assert.match(css, /@media\(max-width:390px\)\{\.lede\{display:none\}/i);
  assert.doesNotMatch(html, /<img[^>]+fetchpriority="high"/i);
  assert.match(html, /loading="lazy"/i);
});
