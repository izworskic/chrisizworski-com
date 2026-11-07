import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const R=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const L=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const Q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const V=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const map=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
const records=[[22,"rock-bluff-falls-bluff-creek"],[28,"wolverine-falls-cisco-branch"]];
test('batch49: Ontonagon location conflicts stay geographic research only',()=>{
 for(const [id,slug] of records){
 const c=R.candidates.find(x=>x.gisObjectId===id),l=L.entries.find(x=>x.sourceId===id),q=Q.candidates.find(x=>x.gisObjectId===id),v=V.records.find(x=>x.gisObjectId===id);
 assert.ok(c&&l&&q&&v,'missing research candidate '+id);assert.equal(c.curatedId,null);assert.equal(c.publicationEligible,false);assert.equal(l.publication,'research-only');assert.equal(l.reviewBatch,'49');assert.equal(q.reviewStage,'awaiting-new-authoritative-evidence');
 assert.equal(v.publicationEligible,false);assert.equal(v.routeAudit.outcome,'not-cleared');assert.equal(v.routeAudit.destinationCoordinatesForDriving,false);assert.equal(v.routeAudit.routePolylineAuthorized,false);assert.equal(v.routeAudit.segments.length,6);
 const path='/upper-peninsula-waterfalls/research/'+slug+'/';assert.equal(v.researchPage,path);assert.ok(!map.includes(path));const html=fs.readFileSync('public'+path+'index.html','utf8');assert.match(html,/noindex,follow/);assert.match(html,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);assert.match(html,/Built by Chris Izworski/);
 const desc=(html.match(/<meta name="description" content="([^"]*)">/)||[])[1];assert.ok(desc&&desc.length<=158,'SERP description too long '+slug);
 const tag='<script type="application/ld+json">',at=html.indexOf(tag);assert.ok(at>=0);const ld=JSON.parse(html.slice(at+tag.length,html.indexOf('</script>',at)));assert.equal(ld['@type'],'WebPage');assert.equal(ld.author['@id'],'https://chrisizworski.com/#person');assert.doesNotMatch(html,/"@type":"TouristAttraction"/);
 }
 assert.ok(V.records.length>=75);assert.equal(R.counts.curatedTotal,79);assert.equal(R.counts.exactIdMatched,69);assert.equal(R.counts.pending,92);assert.equal(L.unresolvedCandidates,92);assert.equal(Q.candidates.length,92);
 const rock=R.candidates.find(x=>x.gisObjectId===22),wol=R.candidates.find(x=>x.gisObjectId===28);
 assert.match(rock.sourceNotes,/377 metres/);assert.match(rock.sourceNotes,/Mateson Creek/);
 assert.match(wol.sourceNotes,/Cisco Branch/);assert.match(wol.sourceNotes,/2026/);
});
