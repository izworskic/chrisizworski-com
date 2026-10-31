import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildQueue} from '../scripts/build-up-waterfall-review-queue.mjs';
const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const r=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const v=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('batch40 source research queue is deterministic and blocked access sites cannot monopolize priority',()=>{
 assert.deepEqual(buildQueue(),q);assert.equal(q.schemaVersion,2);
 assert.equal(q.candidates.length,r.counts.pending);assert.equal(q.batches.flatMap(x=>x.candidates).length,r.counts.pending);
 assert.equal(new Set(q.candidates.map(x=>x.gisObjectId)).size,r.counts.pending);
 assert.notEqual(q.candidates[0].priorityTier,'awaiting-new-official-evidence');
 for(const id of [59,195,160,213]){const row=q.candidates.find(x=>x.gisObjectId===id);assert.ok(row);assert.equal(row.priorityTier,'awaiting-new-official-evidence');assert.equal(row.publicationEligible,false);}
});
test('Ogemaw and Silver Bell are research-only with source and route safeguards',()=>{
 for(const [id,slug] of [[59,'ogemaw-falls'],[195,'silver-bell-falls']]){
  const row=r.candidates.find(x=>x.gisObjectId===id),review=v.records.find(x=>x.gisObjectId===id);
  assert.ok(row&&review);assert.equal(row.curatedId,null);assert.equal(row.publicationEligible,false);
  assert.equal(review.routeAudit.segments.length,6);assert.equal(review.routeAudit.destinationCoordinatesForDriving,false);
  const p='/upper-peninsula-waterfalls/research/'+slug+'/';
  const h=fs.readFileSync('public'+p+'index.html','utf8');
  assert.ok(h.includes('noindex,follow'));assert.ok(!sitemap.includes(p));
  assert.equal(JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@type'],'WebPage');
 }
 const alger=r.candidates.find(x=>x.gisObjectId===213),dead=r.candidates.find(x=>x.gisObjectId===160);
 assert.match(alger.sourceNotes,/NO SAFE PARKING OPTIONS/);assert.equal(alger.publicationEligible,false);
 assert.match(dead.sourceNotes,/65-acre MBLP-owned Dead River recreation property/);assert.equal(dead.publicationEligible,false);
 assert.equal(v.records.find(x=>x.gisObjectId===213).safeAlternative,'/upper-peninsula-waterfalls/wagner-falls/');
});
