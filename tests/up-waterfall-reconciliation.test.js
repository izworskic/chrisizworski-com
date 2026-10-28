import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ledger = JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json', 'utf8'));
const curated = JSON.parse(fs.readFileSync('data/up-waterfalls.json', 'utf8'));
const sitemap = fs.readFileSync('public/sitemap-up-waterfalls.xml', 'utf8');

test('each source GIS identity appears exactly once in research ledger', () => {
  assert.equal(ledger.candidates.length, 161);
  const ids = ledger.candidates.map(x => x.gisObjectId);
  assert.equal(new Set(ids).size, ids.length);
  for (const row of ledger.candidates) {
    assert.ok(Number.isInteger(row.gisObjectId));
    assert.ok(row.name && row.source && row.county);
    assert.ok(Number.isFinite(row.lat) && Number.isFinite(row.lng));
    assert.ok(row.lat > 41 && row.lat < 49 && row.lng < -82 && row.lng > -92);
  }
});

test('exact GIS reconciliation cannot silently create or alter public guides', () => {
  const curatedById = new Map(curated.waterfalls
    .filter(x => Number.isInteger(x.gisObjectId))
    .map(x => [x.gisObjectId, x]));
  for (const row of ledger.candidates) {
    const guide = curatedById.get(row.gisObjectId);
    if (guide) {
      assert.equal(row.curatedId, guide.id);
      assert.equal(row.reconciliation, 'curated-exact-gis-id');
    } else {
      assert.equal(row.curatedId, null);
      assert.equal(row.reconciliation, 'pending-identity-and-access-research');
      const proposedSlug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/' + proposedSlug + '/'),
        'unreviewed GIS feature may not auto-enter public waterfall sitemap: ' + row.name);
    }
  }
});

test('Menominee drafts remain unpublished until location-to-arrival gate is cleared', () => {
  for (const id of [3, 188, 189]) {
    const row = ledger.candidates.find(x => x.gisObjectId === id);
    assert.ok(row.guideDraft);
    assert.equal(row.publicationEligible, false);
    assert.ok(row.outstandingGate);
    assert.ok(row.parkingVerified);
    assert.ok(row.publicAccessVerified);
  }
});

test('Cascade Falls guide is public only with signed FR 468 parking and separate waterfall point', () => {
  const f = curated.waterfalls.find(x => x.id === 'cascade-falls');
  const row = ledger.candidates.find(x => x.gisObjectId === 67);
  assert.ok(f);
  assert.equal(f.publication, 'verified-access-guide');
  assert.equal(f.gisObjectId, 67);
  assert.equal(row.curatedId, f.id);
  assert.equal(row.reconciliation, 'curated-exact-gis-id');
  assert.equal(row.publicationEligible, true);
  assert.deepEqual([f.lat, f.lng], [row.lat, row.lng]);
  for (const axis of ['landManager', 'publicAccess', 'parking', 'trail', 'location']) {
    assert.equal(f.verification[axis].verified, true, axis);
    assert.ok(f.verification[axis].source.startsWith('https://'));
  }
  const detail = fs.readFileSync('public/upper-peninsula-waterfalls/cascade-falls/index.html', 'utf8');
  const hub = fs.readFileSync('public/upper-peninsula-waterfalls/index.html', 'utf8');
  const card = hub.match(/<article class="waterfall-card"[^>]*data-id="cascade-falls"[\s\S]*?<\/article>/);
  assert.ok(card);
  assert.match(card[0], /data-gis-oid="67"/);
  assert.match(card[0], /class="arrival-details"/);
  assert.match(card[0], /data-arrival-verified="verified"/);
  assert.match(card[0], /Check parking source/);
  assert.match(detail, /<meta name="robots" content="index,follow/);
  assert.ok(detail.includes('https://chrisizworski.com/#person'));
  assert.ok(detail.includes('Forest Road 468') && detail.includes('Forest Road 400'));
  assert.match(detail, /connector.*not yet|connector.*not.*official|connector.*not.*complete|proposed connector/i);
  assert.match(detail, /not winter-plowed|not plowed|unplowed/i);
  assert.match(detail, /current opening and road conditions are unverified/i);
  for (const axis of ['landManager', 'publicAccess', 'parking', 'trail', 'location']) {
    assert.ok(detail.includes(f.verification[axis].source), axis + ' must be cited in guide');
  }
  assert.ok(sitemap.includes('<loc>https://chrisizworski.com/upper-peninsula-waterfalls/cascade-falls/</loc>'));
  assert.ok(!card[0].includes('data-parking-lat='), 'no invented parking coordinate');
  assert.ok(!detail.includes('maps/dir/?api=1&destination=46.651708'), 'do not route vehicles to falls');
});

test('canonical source ledger and geographic reconciliation agree as waterfall coverage grows', () => {
  const canonical = JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json', 'utf8'));
  assert.equal(canonical.sourceCandidateCount, 161);
  assert.equal(canonical.curatedCount, curated.waterfalls.length);
  assert.equal(canonical.curatedCount, ledger.counts.curatedTotal);
  assert.equal(canonical.linkedByExactOid, ledger.counts.exactIdMatched);
  assert.equal(canonical.unresolvedCandidates, ledger.counts.pending);
  const canonicalGIS = new Map(canonical.entries.filter(x => x.source === 'mi-state-gis').map(x => [x.sourceId, x]));
  assert.equal(canonicalGIS.size, 161);
  for (const row of ledger.candidates) {
    const prior = canonicalGIS.get(row.gisObjectId);
    assert.ok(prior, 'canonical ledger missing GIS ID ' + row.gisObjectId);
    assert.equal(prior.curatedId, row.curatedId, 'mismatched curated link for GIS ID ' + row.gisObjectId);
    assert.equal(prior.identity === 'linked', row.reconciliation === 'curated-exact-gis-id');
  }
});

test('Bonanza/Greenwood parcel conflict remains opt-in research-only, not visitor routing', () => {
  const record = ledger.candidates.find(x => x.gisObjectId === 124);
  const original = JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'))
    .entries.find(x => x.source === 'mi-state-gis' && x.sourceId === 124);
  const reviewData = JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
  const review = reviewData.records.find(x => x.gisObjectId === 124);
  const gisOverlay = fs.readFileSync('public/assets/up-waterfalls-research.js','utf8');
  const hub = fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');

  assert.equal(record.reconciliation, 'pending-identity-and-access-research');
  assert.equal(record.publicationEligible, false);
  assert.equal(record.publicAccessVerified, false);
  assert.equal(record.parkingVerified, false);
  assert.equal(original.publication, 'research-only');
  assert.equal(original.curatedId, null);
  assert.ok(original.classification.includes('parcel-boundary-conflict'));
  assert.ok(review);
  assert.equal(review.publicationEligible, false);
  assert.equal(review.publicAccess, 'township-visitor-site-documented-full-route-unverified');
  assert.match(review.summary, /municipal|township/i);
  assert.match(review.summary, /private/i);
  assert.ok(review.guidance.includes('Do not navigate to the GIS falls point'));
  assert.ok(review.sourceLinks.some(x => x.url.includes('ontonagoncounty.org')));
  assert.ok(review.sourceLinks.some(x => x.url.includes('sabu.mtu.edu')));
  assert.ok(gisOverlay.includes('up-waterfall-access-reviews.json'));
  assert.ok(gisOverlay.includes('review.publicationEligible===false'));
  assert.ok(gisOverlay.includes('document.createElement'));
  assert.ok(!curated.waterfalls.some(x => x.gisObjectId === 124));
  assert.ok(!hub.includes('data-gis-oid="124"'));
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/bonanza-falls/'));
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/greenwood-falls/'));
});

test('Bonanza township signage and seasonal closure evidence cannot imply current open status', () => {
  const r = ledger.candidates.find(x => x.gisObjectId === 124);
  const review = JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'))
    .records.find(x => x.gisObjectId === 124);
  assert.equal(r.parcelReview.townshipVisitorEvidence.visitorSiteConfirmed, true);
  assert.equal(r.parcelReview.townshipVisitorEvidence.currentOpenStatus, 'not-verified');
  assert.equal(r.parcelReview.publicAccessEstablished, false);
  assert.equal(review.publicationEligible, false);
  assert.match(review.guidance, /signed.*township entrance|signed.*entrance/i);
  assert.match(review.guidance, /late October|winter/i);
  assert.ok(review.sourceLinks.some(x => /2f5de80733814402a12c7433d4b19023/.test(x.url)));
  assert.ok(review.sourceLinks.some(x => /0bf497560d2a44b68cee8fd20bab0828/.test(x.url)));
  assert.match(review.reviewLimitations, /2026 closing date/i);
  assert.ok(!curated.waterfalls.some(x => x.id === 'bonanza-falls'));
  assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/bonanza-falls/'));
});
