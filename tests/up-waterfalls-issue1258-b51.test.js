import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const R=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const L=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const Q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const V=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const map=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
const records=[[84,"little-trap-falls-anderson-creek"],[106,"little-iron-falls-little-iron-river"],[122,"pewabeck-falls-little-iron-river"]];
test('batch51: three source-verified identities cannot create unsafe arrival directions',()=>{
 for(const [id,slug] of records){const c=R.candidates.find(x=>x.gisObjectId===id),l=L.entries.find(x=>x.sourceId===id),v=V.records.find(x=>x.gisObjectId===id),q=Q.candidates.find(x=>x.gisObjectId===id);
 assert.ok(c&&l&&v&&q,'missing '+id);assert.equal(c.curatedId,null);assert.equal(c.publicationEligible,false);assert.equal(l.publication,'research-only');assert.equal(l.reviewBatch,'51');assert.equal(q.reviewStage,'awaiting-new-authoritative-evidence');assert.equal(v.publicationEligible,false);
 assert.equal(v.routeAudit.outcome,'not-cleared');assert.equal(v.routeAudit.destinationCoordinatesForDriving,false);assert.equal(v.routeAudit.routePolylineAuthorized,false);assert.equal(v.routeAudit.segments.length,6);assert.ok(v.sourceLinks.length>=5);
 const path='/upper-peninsula-waterfalls/research/'+slug+'/';assert.equal(v.researchPage,path);assert.ok(!map.includes(path));const page=fs.readFileSync('public'+path+'index.html','utf8');assert.match(page,/noindex,follow/);assert.match(page,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);assert.match(page,/Built by Chris Izworski/);const desc=(page.match(/<meta name="description" content="([^"]*)">/)||[])[1];assert.ok(desc&&desc.length<=158,'description too long '+id);
 const tag='<script type="application/ld+json">',start=page.indexOf(tag);assert.ok(start>=0);const j=JSON.parse(page.slice(start+tag.length,page.indexOf('</script>',start)));assert.equal(j['@type'],'WebPage');assert.equal(j.author['@id'],'https://chrisizworski.com/#person');assert.doesNotMatch(page,/"@type":"TouristAttraction"/);
 }
 assert.ok(V.records.length>=84);assert.equal(R.counts.curatedTotal,80);assert.equal(R.counts.exactIdMatched,69);assert.equal(R.counts.pending,92);assert.equal(L.unresolvedCandidates,92);assert.equal(Q.candidates.length,92);
 const trap=R.candidates.find(x=>x.gisObjectId===84),iron=R.candidates.find(x=>x.gisObjectId===106),pew=R.candidates.find(x=>x.gisObjectId===122);
 assert.match(trap.sourceNotes,/93 metres/);assert.match(trap.sourceNotes,/13.16 km/);
 assert.match(iron.sourceNotes,/13.00 km/);assert.match(iron.sourceNotes,/1956/);assert.match(iron.sourceNotes,/Pewabeck/);
 assert.match(pew.sourceNotes,/77 metres/);assert.match(pew.sourceNotes,/30.48 km/);
});
