import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const R=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const L=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const Q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const V=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('Batch 45: sensitive visitor routes remain gated with complete research pages',()=>{
for(const [id,slug] of [[17,"chipmunk-falls-net-river"],[144,"copper-falls-owl-creek"],[18,"cataract-escanaba-falls"],[116,"cliff-falls-cliff-river"],[127,"mountain-stream-falls"],[148,"eighty-foot-falls-styx-river"]]){
 const c=R.candidates.find(x=>x.gisObjectId===id),l=L.entries.find(x=>x.sourceId===id),v=V.records.find(x=>x.gisObjectId===id),q=Q.candidates.find(x=>x.gisObjectId===id);
 assert.ok(c&&l&&v&&q);assert.equal(c.curatedId,null);assert.equal(c.publicationEligible,false);assert.equal(l.publication,'research-only');assert.equal(v.publicationEligible,false);
 assert.equal(q.reviewStage,'awaiting-new-authoritative-evidence');assert.equal(v.routeAudit.outcome,'not-cleared');assert.equal(v.routeAudit.routePolylineAuthorized,false);assert.equal(v.routeAudit.destinationCoordinatesForDriving,false);assert.equal(v.routeAudit.segments.length,6);
 assert.ok(v.visitorDecision?.decision);assert.ok(v.sourceLinks.length>=3);assert.equal(l.reviewBatch,'45');const url='/upper-peninsula-waterfalls/research/'+slug+'/';
 const html=fs.readFileSync('public'+url+'index.html','utf8');assert.equal(v.researchPage,url);assert.match(html,/noindex,follow/);assert.ok(!sitemap.includes(url));
 const marker='<script type="application/ld+json">';const at=html.indexOf(marker);assert.ok(at>=0);const start=at+marker.length;const end=html.indexOf('</script>',start);assert.ok(end>start);const schema=JSON.parse(html.slice(start,end));assert.equal(schema['@type'],'WebPage');assert.equal(schema.author['@id'],'https://chrisizworski.com/#person');assert.doesNotMatch(html,/"@type":"TouristAttraction"/);assert.match(html,/Built by Chris Izworski/);
}
assert.ok(R.counts.curatedTotal>=71);assert.ok(R.counts.pending<=96);assert.ok(L.unresolvedCandidates<=96);assert.ok(Q.candidates.length<=96);assert.ok(V.records.length>=59);
assert.match(R.candidates.find(x=>x.gisObjectId===17).sourceNotes,/three.foot|three feet/i);
assert.match(R.candidates.find(x=>x.gisObjectId===144).sourceNotes,/private/i);
assert.match(R.candidates.find(x=>x.gisObjectId===18).sourceNotes,/2024/);
assert.match(R.candidates.find(x=>x.gisObjectId===116).sourceNotes,/Keweenaw/i);
assert.match(V.records.find(x=>x.gisObjectId===127).visitorDecision.decision,/No general public/i);
assert.match(V.records.find(x=>x.gisObjectId===148).visitorDecision.decision,/No verified public/i);
});
