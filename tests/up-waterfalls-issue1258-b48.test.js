import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const R=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const L=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const Q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const V=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const map=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
const records=[[181,"upper-chocolay-falls"],[183,"white-city-falls-middle-branch-escanaba"],[184,"black-river-falls-ely-township"],[185,"dee-lundeen-falls-peshekee"],[186,"trout-falls-trout-falls-creek"],[187,"caps-creek-falls"]];
test('batch48: six Marquette research falls never invent a public approach',()=>{
 for(const [id,slug] of records){
 const c=R.candidates.find(x=>x.gisObjectId===id),l=L.entries.find(x=>x.sourceId===id),v=V.records.find(x=>x.gisObjectId===id),q=Q.candidates.find(x=>x.gisObjectId===id);
 assert.ok(c&&l&&v&&q,'missing '+id);assert.equal(c.curatedId,null);assert.equal(c.publicationEligible,false);assert.equal(l.publication,'research-only');assert.equal(l.reviewBatch,'48');assert.equal(v.publicationEligible,false);assert.equal(q.reviewStage,'awaiting-new-authoritative-evidence');
 assert.equal(v.routeAudit.outcome,'not-cleared');assert.equal(v.routeAudit.destinationCoordinatesForDriving,false);assert.equal(v.routeAudit.routePolylineAuthorized,false);assert.equal(v.routeAudit.segments.length,6);
 const path='/upper-peninsula-waterfalls/research/'+slug+'/';assert.equal(v.researchPage,path);const page=fs.readFileSync('public'+path+'index.html','utf8');assert.match(page,/noindex,follow/);const desc=(page.match(/<meta name="description" content="([^"]*)">/)||[])[1];assert.ok(desc&&desc.length<=158,'SERP description too long '+slug);assert.match(page,/Built by Chris Izworski/);assert.match(page,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);assert.ok(!map.includes(path));
 const tag='<script type="application/ld+json">';const start=page.indexOf(tag);assert.ok(start>=0);const end=page.indexOf('</script>',start);const j=JSON.parse(page.slice(start+tag.length,end));assert.equal(j['@type'],'WebPage');assert.equal(j.author['@id'],'https://chrisizworski.com/#person');assert.doesNotMatch(page,/"@type":"TouristAttraction"/);
 }
 assert.ok(V.records.length>=73);assert.equal(R.counts.curatedTotal,76);assert.equal(R.counts.pending,92);assert.equal(L.unresolvedCandidates,92);assert.equal(Q.candidates.length,92);
 assert.match(R.candidates.find(x=>x.gisObjectId===184).sourceNotes,/2017/);assert.match(R.candidates.find(x=>x.gisObjectId===185).sourceNotes,/1.7 kilometres/);assert.match(R.candidates.find(x=>x.gisObjectId===183).sourceNotes,/posted private/);
});
