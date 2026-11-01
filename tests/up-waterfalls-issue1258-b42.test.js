import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const l=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const v=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('batch42: named minor rapids and waterfall features are not unsafely promoted',()=>{
 for(const [id,slug] of [[37,'neepikon-falls'],[39,'powder-horn-falls'],[40,'rocky-forty-falls'],[48,'narrow-falls'],[58,'chippewa-falls']]){
  const c=r.candidates.find(x=>x.gisObjectId===id),le=l.entries.find(x=>x.sourceId===id),rev=v.records.find(x=>x.gisObjectId===id);
  assert.ok(c&&le&&rev);assert.equal(c.curatedId,null);assert.equal(c.publicationEligible,false);assert.equal(le.publication,'research-only');
  assert.equal(rev.routeAudit.outcome,'not-cleared');assert.equal(rev.routeAudit.segments.length,6);assert.equal(rev.routeAudit.routePolylineAuthorized,false);assert.equal(rev.routeAudit.destinationCoordinatesForDriving,false);
  assert.equal(q.candidates.find(x=>x.gisObjectId===id).reviewStage,'awaiting-new-authoritative-evidence');
  const url='/upper-peninsula-waterfalls/research/'+slug+'/';const html=fs.readFileSync('public'+url+'index.html','utf8');
  assert.match(html,/noindex,follow/);assert.ok(!sitemap.includes(url));assert.equal(rev.researchPage,url);
  assert.equal(JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]||'{}')['@type'],'WebPage');
 }
 assert.equal(r.counts.pending,96);assert.equal(l.unresolvedCandidates,96);assert.equal(q.candidates.length,96);assert.equal(q.counts.curatedDestinations,71);
 assert.match(r.candidates.find(x=>x.gisObjectId===37).sourceNotes,/477m/);
 assert.match(r.candidates.find(x=>x.gisObjectId===40).sourceNotes,/69.2km/);
 assert.match(r.candidates.find(x=>x.gisObjectId===58).sourceNotes,/NFST-128-B/);
});
