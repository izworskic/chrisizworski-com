import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const v=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const l=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const site=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('batch40 Baraga falls document source uncertainty without exposing visitor routes',()=>{
 for(const [id,slug] of [[99,'upper-letherby-falls'],[103,'letherby-falls'],[105,'black-slate-falls'],[107,'quartzite-falls']]){
  const a=r.candidates.find(x=>x.gisObjectId===id),rev=v.records.find(x=>x.gisObjectId===id),item=l.entries.find(x=>x.sourceId===id);
  assert.ok(a&&rev&&item);assert.equal(a.curatedId,null);assert.equal(a.publicationEligible,false);assert.equal(item.publication,'research-only');
  assert.equal(rev.routeAudit.outcome,'not-cleared');assert.equal(rev.routeAudit.segments.length,6);assert.equal(rev.routeAudit.routePolylineAuthorized,false);assert.equal(rev.routeAudit.destinationCoordinatesForDriving,false);
  assert.equal(q.candidates.find(x=>x.gisObjectId===id).reviewStage,'awaiting-new-authoritative-evidence');
  const url='/upper-peninsula-waterfalls/research/'+slug+'/';const html=fs.readFileSync('public'+url+'index.html','utf8');
  assert.match(html,/noindex,follow/);assert.match(html,/Research only/);assert.doesNotMatch(html,/\"@type\":\"TouristAttraction\"/);assert.ok(!site.includes(url));assert.equal(rev.researchPage,url);
 }
 assert.ok(r.counts.pending<=96);assert.ok(q.candidates.length<=96);assert.ok(l.unresolvedCandidates<=96);
 assert.match(r.candidates.find(x=>x.gisObjectId===99).sourceNotes,/568 m/);
 assert.match(r.candidates.find(x=>x.gisObjectId===103).sourceNotes,/1,636 m/);
 assert.match(r.candidates.find(x=>x.gisObjectId===107).sourceNotes,/50 m/);
});
