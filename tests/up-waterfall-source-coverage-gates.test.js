const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = JSON.parse(fs.readFileSync('data/up-waterfall-uptravel-indexed-listings-2026.json', 'utf8'));
const entries = source.records;

test('UP Travel directory cards are not conflated with indexed URL observations', () => {
  assert.equal(source.siteReportedDirectoryTotal, 104);
  assert.deepEqual(source.siteReportedDirectoryRegionCounts, {Eastern:1, Central:39, Western:64});
  assert.equal(entries.length, 149);
  assert.equal(new Set(entries.map(r => r.listingId)).size, entries.length);
  const firstPage = entries.filter(r => r.sourceCategoryMembership === 'observed-on-directory-first-page');
  assert.equal(firstPage.length, 12);
  assert.equal(source.counts.firstPageCardsWithConfirmedDirectoryMembership, 12);
  assert.equal(entries.filter(r => r.inAtlas).length, 108);
  assert.equal(entries.filter(r => r.inAtlas && r.role === 'waterfall-named-listing').length, 91);
  assert.equal(entries.filter(r => r.inAtlas && r.role === 'related-place-or-activity').length, 17);
  assert.equal(entries.filter(r => !r.inAtlas).length, 41);
  assert.notEqual(source.siteReportedDirectoryTotal, source.counts.researchAtlasListingRecords);
});

test('unobserved UP Travel listing URLs cannot silently become verified directory cards or visitor waypoints', () => {
  for (const row of entries) {
    assert.match(row.sourceUrl, /^https:\/\/www\.uptravel\.com\/listing\//);
    assert.notEqual(row.listingId, null);
    assert.equal(Object.hasOwn(row, 'lat') ? row.lat : null, null);
    assert.equal(Object.hasOwn(row, 'lng') ? row.lng : null, null);
    if (row.sourceCategoryMembership !== 'observed-on-directory-first-page') {
      assert.notEqual(row.nameMethod, 'directory-first-page-card');
      assert.equal(row.roadLabel ?? null, null);
      assert.equal(row.areaLabel ?? null, null);
    }
  }
});

test('the three held priority waterfall routes are not advertised as cleared visitor guides', () => {
  const dead = fs.readFileSync('public/upper-peninsula-waterfalls/research/dead-river-falls/index.html','utf8');
  const auTrain = fs.readFileSync('public/upper-peninsula-waterfalls/research/au-train-falls/index.html','utf8');
  const alger = fs.readFileSync('public/upper-peninsula-waterfalls/research/alger-falls-highway-parking-review/index.html','utf8');
  for(const html of [dead,auTrain,alger]) {
    assert.match(html, /noindex,follow/);
    assert.match(html, /https:\/\/chrisizworski\.com\/#person/);
  }
  assert.match(dead,/stopped promoting Dead River Falls/);
  assert.match(dead,/PRIVATE PROPERTY/);
  assert.match(auTrain,/emergency dam-safety order/i);
  assert.match(auTrain,/not cleared/i);
  assert.match(alger,/private guest access is not a public roadside stop/i);
  assert.match(alger,/NOT CLEARED FOR PUBLIC WATERFALL NAVIGATION/);
});
