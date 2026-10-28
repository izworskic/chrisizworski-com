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
