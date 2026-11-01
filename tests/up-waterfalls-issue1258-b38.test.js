import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const v=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('batch 38: source-backed private, gated and ambiguous waterfalls retain research-only status',()=>{
 for(const [id,slug] of [[160,'dead-river-falls'],[195,'silver-bell-falls'],[205,'chipmunk-falls-grand-marais']]){
  const a=r.candidates.find(x=>x.gisObjectId===id),review=v.records.find(x=>x.gisObjectId===id),p='/upper-peninsula-waterfalls/research/'+slug+'/';
  assert.ok(a&&review);assert.equal(a.curatedId,null);assert.equal(a.publicationEligible,false);
  assert.equal(review.routeAudit.segments.length,6);assert.equal(review.routeAudit.destinationCoordinatesForDriving,false);
  assert.equal(review.routeAudit.routePolylineAuthorized,false);
  const h=fs.readFileSync('public'+p+'index.html','utf8');
  assert.ok(h.includes('noindex,follow'));assert.ok(!sitemap.includes(p));
 }
 assert.match(r.candidates.find(x=>x.gisObjectId===160).sourceNotes,/PRIVATE PROPERTY/);
 assert.match(r.candidates.find(x=>x.gisObjectId===160).sourceNotes,/UPPCO/);
 assert.match(r.candidates.find(x=>x.gisObjectId===205).sourceNotes,/Amasa/);
});
test('queue v2 rotates fresh source discovery ahead of fully blocked routes without publishing unsafe sites',()=>{
 assert.equal(q.candidates.length,r.counts.pending);
 assert.equal(q.batches.length,Math.ceil(q.candidates.length/q.batchSize));
 assert.equal(q.candidates[0].reviewStage,'first-source-discovery');
 for(const id of [160,195,205]){
  const row=q.candidates.find(x=>x.gisObjectId===id);
  assert.equal(row.reviewStage,'awaiting-new-authoritative-evidence');
  assert.ok(row.priorityScore<q.candidates[0].priorityScore);
  assert.equal(row.publicationEligible,false);
 }
 assert.ok(q.candidates.every(x=>x.publicationEligible===false));
});
