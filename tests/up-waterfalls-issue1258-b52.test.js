import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const R=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const L=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const Q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const V=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const map=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
const ids=[[51,"upper-falls-sturgeon-river-baraga"],[120,"big-falls-east-branch-huron"],[137,"lower-gratiot-river-falls"],[139,"lower-montreal-falls-keweenaw"],[140,"upper-montreal-falls-keweenaw"]];
test('batch52: generic Upper/Lower waterfall names never imply public access',()=>{
 for(const [id,slug] of ids){const c=R.candidates.find(x=>x.gisObjectId===id),l=L.entries.find(x=>x.sourceId===id),q=Q.candidates.find(x=>x.gisObjectId===id),v=V.records.find(x=>x.gisObjectId===id);assert.ok(c&&l&&q&&v,'missing '+id);assert.equal(c.curatedId,null);assert.equal(c.publicationEligible,false);assert.equal(l.publication,'research-only');assert.equal(l.reviewBatch,'52');assert.equal(q.reviewStage,'awaiting-new-authoritative-evidence');assert.equal(v.publicationEligible,false);assert.equal(v.routeAudit.outcome,'not-cleared');assert.equal(v.routeAudit.destinationCoordinatesForDriving,false);assert.equal(v.routeAudit.routePolylineAuthorized,false);assert.equal(v.routeAudit.segments.length,6);assert.ok(v.sourceLinks.length>=5);
 const path='/upper-peninsula-waterfalls/research/'+slug+'/';assert.equal(v.researchPage,path);assert.ok(!map.includes(path));const html=fs.readFileSync('public'+path+'index.html','utf8');assert.match(html,/noindex,follow/);assert.match(html,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);assert.match(html,/Built by Chris Izworski/);const desc=(html.match(/<meta name="description" content="([^"]*)">/)||[])[1];assert.ok(desc&&desc.length<=158,'meta too long '+id);const tag='<script type="application/ld+json">',start=html.indexOf(tag);assert.ok(start>=0);const j=JSON.parse(html.slice(start+tag.length,html.indexOf('</script>',start)));assert.equal(j['@type'],'WebPage');assert.equal(j.author['@id'],'https://chrisizworski.com/#person');assert.doesNotMatch(html,/"@type":"TouristAttraction"/);
 }
 const promoted=R.candidates.find(x=>x.gisObjectId===136),published=L.entries.find(x=>x.sourceId===136),review=V.records.find(x=>x.gisObjectId===136);
 assert.equal(promoted.curatedId,'conglomerate-falls-gratiot');assert.equal(promoted.publicationEligible,true);assert.equal(published.publication,'verified-access-guide');
 assert.equal(review.publicationEligible,true);assert.equal(review.routeAudit.destinationCoordinatesForDriving,false);
 assert.ok(!Q.candidates.some(x=>x.gisObjectId===136));assert.ok(map.includes('/upper-peninsula-waterfalls/conglomerate-falls-gratiot/'));
 assert.match(fs.readFileSync('public/upper-peninsula-waterfalls/research/upper-gratiot-river-falls/index.html','utf8'),/noindex,follow/);
 assert.equal(R.candidates.find(x=>x.gisObjectId===137).publicationEligible,false);
 assert.ok(V.records.length>=90);assert.equal(R.counts.curatedTotal,78);assert.equal(R.counts.exactIdMatched,69);assert.equal(R.counts.pending,92);assert.equal(L.unresolvedCandidates,92);assert.equal(Q.candidates.length,92);
 const notes=id=>R.candidates.find(x=>x.gisObjectId===id).sourceNotes;
 assert.match(notes(51),/557 metres/);assert.match(notes(51),/Sturgeon Falls/);
 assert.match(notes(120),/253 metres/);assert.match(notes(120),/ford/);
 assert.match(notes(136),/2019/);assert.match(notes(136),/beaver pond/);
 assert.match(notes(137),/35 metres/);assert.match(notes(137),/INTERIM/);
 assert.match(notes(139),/7 metres/);assert.match(notes(139),/2026/);
 assert.match(notes(140),/267 metres/);assert.match(notes(140),/unapproved/);
});
