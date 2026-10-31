import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const rec=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8')),ledger=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8')),rev=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8')),queue=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8')),hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8'),sm=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('Jumbo federal trail is real but conflicting waterfall points stay research only',()=>{
 const g=rec.candidates.find(x=>x.gisObjectId===29),l=ledger.entries.find(x=>x.sourceId===29&&x.source==='mi-state-gis'),a=rev.records.find(x=>x.gisObjectId===29);
 assert.ok(g&&l&&a);assert.equal(g.curatedId,null);assert.equal(g.publicationEligible,false);assert.equal(l.reviewBatch,'37');assert.equal(l.publication,'research-only');
 assert.equal(a.routeAudit.outcome,'not-cleared');assert.equal(a.routeAudit.segments.length,6);assert.equal(a.routeAudit.destinationCoordinatesForDriving,false);
 assert.equal(a.routeAudit.routePolylineAuthorized,false);assert.match(g.sourceNotes,/metres/);assert.match(g.sourceNotes,/Forest Service/);
 const h=fs.readFileSync('public/upper-peninsula-waterfalls/research/jumbo-falls/index.html','utf8');
 assert.match(h,/noindex,follow/);assert.ok(!sm.includes('/upper-peninsula-waterfalls/jumbo-falls/'));assert.ok(!hub.includes('data-id="jumbo-falls"'));assert.equal(queue.candidates.length,rec.counts.pending);
});
