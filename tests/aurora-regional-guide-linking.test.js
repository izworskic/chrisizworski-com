// Regression checks for the existing Michigan aurora destination network.
// These protect the statewide canonical and the direct region-to-local-decision handoffs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'public/northern-lights-michigan/index.html'), 'utf8');
const locations = new Map([
  ['keweenaw', ['keweenaw', 'Keweenaw']],
  ['marquette', ['marquette', 'Marquette']],
  ['munising', ['munising', 'Munising']],
  ['sault-ste-marie', ['paradise-whitefish-point', 'Whitefish Point']],
  ['mackinaw-city', ['mackinaw-city', 'Mackinaw City']],
  ['traverse-city', ['sleeping-bear-dunes', 'Sleeping Bear Dunes']]
]);

test('existing winning statewide intent, title, author and canonical remain protected', () => {
  assert.match(page, /<title>Northern Lights Michigan Tonight: Can You See Them\?<\/title>/);
  assert.match(page, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/northern-lights-michigan\/">/);
  assert.match(page, /https:\/\/chrisizworski\.com\/#person/);
  assert.match(page, /<h1 class="page-title">Northern Lights Michigan Tonight<\/h1>/);
});

test('every linked region has a true local destination with self-canonical, title and usable text', () => {
  for (const [regionId, [slug, label]] of locations) {
    const match = page.match(new RegExp('<article class="region-card" data-region-id="' + regionId + '"[\\s\\S]*?<\\/article>'));
    assert.ok(match, 'Region exists: ' + regionId);
    const href = '/northern-lights-michigan/' + slug + '/';
    assert.ok(match[0].includes('<a class="region-card-guide" href="' + href + '">'), 'Native HTML link from ' + regionId);
    const file = path.join(ROOT, 'public/northern-lights-michigan', slug, 'index.html');
    assert.ok(fs.existsSync(file), 'Destination source exists: ' + slug);
    const destination = fs.readFileSync(file, 'utf8');
    assert.ok(destination.includes('<link rel="canonical" href="https://chrisizworski.com' + href + '">'), 'Destination canonical: ' + slug);
    assert.match(destination, /<title>[^<]+<\/title>/, 'Destination title: ' + slug);
    assert.ok(destination.includes(label), 'Distinct location heading/content: ' + slug);
    assert.ok(!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(destination), 'Destination remains eligible to index: ' + slug);
  }
});

test('top-of-page action tracks saved or selected region and has honest map fallback', () => {
  assert.ok(page.includes('id="regionDeepLink" class="region-deep-guide"'));
  assert.ok(page.includes('const guide = REGION_GUIDE_LINKS[id];'));
  assert.ok(page.includes("guideLink.href = guide ? guide.href : '#viewing-locations';"));
  assert.ok(page.includes("guideLink.textContent = guide ? guide.label : 'Explore Michigan viewing locations';"));
  assert.ok(page.includes("setSelectedRegion(selectedRegionId,'saved',false)"));
  assert.ok(page.includes("setSelectedRegion(event.target.value,'selector',true)"));
  assert.ok(page.includes("card.insertBefore(weather, card.querySelector('.region-card-guide'))"));
  assert.ok(page.includes('href="#viewing-locations"'));
  for (const [, [slug]] of locations) {
    const needle = "'/northern-lights-michigan/" + slug + "/'";
    assert.ok(page.includes(needle), 'Hero link mapping exists for ' + slug);
  }
});
