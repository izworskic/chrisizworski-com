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
