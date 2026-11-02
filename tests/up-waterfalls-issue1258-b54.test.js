import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const R=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const L=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const Q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const V=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
const ids=[[8,'mill-pond-falls-sundholm-creek-identity-review'],[4,'little-quinnesec-falls-hydro-recreation-review'],[9,'peavy-falls-dam-spillway-access-review']];
test('batch54: source identity and hydropower telemetry never masquerade as an open waterfall trip',()=>{
 for(const [id,slug] of ids){
  const c=R.candidates.find(x=>x.gisObjectId===id),l=L.entries.find(x=>x.sourceId===id),q=Q.candidates.find(x=>x.gisObjectId===id),v=V.records.find(x=>x.gisObjectId===id);
  assert.ok(c&&l&&q&&v,'missing record '+id);
  assert.equal(c.curatedId,null);assert.equal(c.publicationEligible,false);assert.equal(c.publicAccessVerified,false);assert.equal(c.parkingVerified,false);
  assert.equal(l.reviewBatch,'54');assert.equal(l.publication,'research-only');assert.equal(q.reviewStage,'awaiting-new-authoritative-evidence');
  assert.equal(v.publicationEligible,false);assert.equal(v.routeAudit.outcome,'not-cleared');assert.equal(v.routeAudit.destinationCoordinatesForDriving,false);assert.equal(v.routeAudit.routePolylineAuthorized,false);
  assert.equal(v.routeAudit.segments.length,6);assert.ok(v.sourceLinks.length>=5);
  const path='/upper-peninsula-waterfalls/research/'+slug+'/';assert.equal(v.researchPage,path);assert.ok(!sitemap.includes(path));
  const page=fs.readFileSync('public'+path+'index.html','utf8');assert.match(page,/noindex,follow/);assert.match(page,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);assert.match(page,/Built by Chris Izworski/);
  const desc=(page.match(/<meta name="description" content="([^"]*)">/)||[])[1];assert.ok(desc&&desc.length<=158,'meta length '+id);
  const title=page.split('<title>')[1]?.split('</title>')[0];assert.ok(title&&title.length<=60,'title length '+id);
  const tag='<script type="application/ld+json">',at=page.indexOf(tag);assert.ok(at>=0);
  const schema=JSON.parse(page.slice(at+tag.length,page.indexOf('</script>',at)));assert.equal(schema['@type'],'WebPage');
  assert.equal(schema.author['@id'],'https://chrisizworski.com/#person');assert.equal(schema.publisher['@id'],'https://chrisizworski.com/#person');
  assert.doesNotMatch(page,/"@type":"TouristAttraction"/);assert.ok(!page.includes('https://www.google.com/maps/dir/'));
 }
 assert.equal(V.records.length,97);assert.equal(R.counts.curatedTotal,72);assert.equal(R.counts.exactIdMatched,66);assert.equal(R.counts.pending,95);assert.equal(L.unresolvedCandidates,95);assert.equal(Q.candidates.length,95);
 assert.match(R.candidates.find(x=>x.gisObjectId===8).sourceNotes,/496 metres/);assert.match(R.candidates.find(x=>x.gisObjectId===8).sourceNotes,/884 metres/);
 assert.match(R.candidates.find(x=>x.gisObjectId===4).sourceNotes,/FERC Project P-2536/);
 assert.equal(R.candidates.find(x=>x.gisObjectId===4).projectRecreationEvidence.hikingTrailListed,false);
 assert.equal(R.candidates.find(x=>x.gisObjectId===4).projectRecreationEvidence.waterfallSpecificViewpointVerified,false);
 assert.equal(R.candidates.find(x=>x.gisObjectId===9).flowTelemetryEvidence.directNaturalFallsDischarge,false);
 assert.equal(R.candidates.find(x=>x.gisObjectId===9).flowTelemetryEvidence.flowAsAccessVerdictAllowed,false);
 assert.match(R.candidates.find(x=>x.gisObjectId===9).sourceNotes,/Total Flow/);
});
