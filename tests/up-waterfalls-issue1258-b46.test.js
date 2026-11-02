import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const R=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const L=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const Q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const V=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const map=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('batch46: Marquette waterfalls cannot become unsupported driving destinations',()=>{
 for(const [id,slug] of [[153,"alder-falls-big-bay"],[162,"reany-falls-forestville"],[163,"upper-carp-river-falls-ishpeming"],[169,"carp-river-falls-marquette-gorge"],[170,"ely-falls-national-mine"],[173,"schweitzer-falls-palmer"],[175,"tiger-falls-schweitzer-creek"],[180,"frohling-falls-chocolay"]]){
 const c=R.candidates.find(x=>x.gisObjectId===id),l=L.entries.find(x=>x.sourceId===id),v=V.records.find(x=>x.gisObjectId===id),q=Q.candidates.find(x=>x.gisObjectId===id);
 if(id===169){assert.ok(c&&l&&v);assert.equal(c.curatedId,'carp-river-falls');assert.equal(c.publicationEligible,true);assert.equal(c.accessRouteAudit.routePolylineAuthorized,false);assert.equal(c.accessRouteAudit.destinationCoordinatesForDriving,false);assert.ok(!q);const url='/upper-peninsula-waterfalls/research/'+slug+'/';assert.match(fs.readFileSync('public'+url+'index.html','utf8'),/noindex,follow/);assert.ok(!map.includes(url));continue;}
 assert.ok(c&&l&&v&&q);
 assert.equal(c.curatedId,null);assert.equal(c.publicationEligible,false);assert.equal(l.publication,'research-only');assert.equal(v.publicationEligible,false);assert.equal(v.routeAudit.outcome,'not-cleared');assert.equal(v.routeAudit.routePolylineAuthorized,false);assert.equal(v.routeAudit.destinationCoordinatesForDriving,false);assert.equal(v.routeAudit.segments.length,6);assert.equal(q.reviewStage,'awaiting-new-authoritative-evidence');assert.equal(l.reviewBatch,'46');
 const url='/upper-peninsula-waterfalls/research/'+slug+'/';const html=fs.readFileSync('public'+url+'index.html','utf8');assert.equal(v.researchPage,url);assert.match(html,/noindex,follow/);assert.ok(!map.includes(url));const marker='<script type="application/ld+json">';const at=html.indexOf(marker),start=at+marker.length,end=html.indexOf('</script>',start);assert.ok(at>=0&&end>start);const schema=JSON.parse(html.slice(start,end));assert.equal(schema['@type'],'WebPage');assert.equal(schema.author['@id'],'https://chrisizworski.com/#person');assert.doesNotMatch(html,/"@type":"TouristAttraction"/);assert.match(html,/Built by Chris Izworski/);
 }
 assert.ok(R.counts.curatedTotal>=71);assert.ok(R.counts.pending<=96);assert.ok(L.unresolvedCandidates<=96);assert.ok(Q.candidates.length<=96);assert.equal(V.records.length,67);
 assert.match(R.candidates.find(x=>x.gisObjectId===163).sourceNotes,/No Trespassing/i);
 assert.match(R.candidates.find(x=>x.gisObjectId===169).sourceNotes,/MORGAN CREEK/);
 assert.match(R.candidates.find(x=>x.gisObjectId===169).sourceNotes,/motor-vehicle-restricted|motor-vehicle-closed|motor traffic/i);
 assert.match(R.candidates.find(x=>x.gisObjectId===175).sourceNotes,/779m/);
 assert.match(R.candidates.find(x=>x.gisObjectId===180).sourceNotes,/No Trespassing/);
});
