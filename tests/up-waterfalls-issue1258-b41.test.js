import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const l=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const v=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('batch41 verifies geographic identity but blocks all five unlicensed visitor routes',()=>{
 for(const [id,slug] of [[121,'west-branch-falls'],[123,'east-branch-falls'],[20,'ajibikoka-falls'],[24,'judson-falls'],[25,'nelson-canyon-falls']]){
  const a=r.candidates.find(x=>x.gisObjectId===id),item=l.entries.find(x=>x.sourceId===id),rev=v.records.find(x=>x.gisObjectId===id);
  assert.ok(a&&item&&rev,'candidate records required: '+id);
  assert.equal(a.curatedId,null);assert.equal(a.publicationEligible,false);assert.equal(item.publication,'research-only');
  assert.equal(rev.routeAudit.outcome,'not-cleared');assert.equal(rev.routeAudit.segments.length,6);
  assert.equal(rev.routeAudit.destinationCoordinatesForDriving,false);assert.equal(rev.routeAudit.routePolylineAuthorized,false);
  assert.equal(q.candidates.find(x=>x.gisObjectId===id)?.reviewStage,'awaiting-new-authoritative-evidence');
  const url='/upper-peninsula-waterfalls/research/'+slug+'/';const html=fs.readFileSync('public'+url+'index.html','utf8');
  assert.match(html,/noindex,follow/);assert.match(html,/Research only/);assert.ok(!sitemap.includes(url));assert.equal(rev.researchPage,url);
  assert.doesNotMatch(html,/\"@type\":\"TouristAttraction\"/);const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]||'{}');assert.equal(schema['@type'],'WebPage');
 }
 assert.equal(r.counts.pending,96);assert.equal(l.unresolvedCandidates,96);assert.equal(q.candidates.length,96);assert.equal(q.counts.curatedDestinations,71);
 assert.match(r.candidates.find(x=>x.gisObjectId===25).sourceNotes,/NFST 7418-D/);
});
