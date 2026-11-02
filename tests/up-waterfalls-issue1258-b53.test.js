import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const R=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const L=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const Q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const V=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
const selected=[[152,"lower-falls-snake-creek-salmon-trout-source-conflict"],[176,"first-falls-east-branch-escanaba-gwinn"],[177,"second-falls-east-branch-escanaba-gwinn"],[23,"little-falls-interior-creek-bond-flowage"]];
test('batch53: legal municipal park is not an invented falls waypoint or private river route',()=>{
 for(const [id,slug] of selected){const c=R.candidates.find(x=>x.gisObjectId===id),l=L.entries.find(x=>x.sourceId===id),q=Q.candidates.find(x=>x.gisObjectId===id),v=V.records.find(x=>x.gisObjectId===id);assert.ok(c&&l&&q&&v,'missing GIS '+id);assert.equal(c.curatedId,null);assert.equal(c.publicationEligible,false);assert.equal(l.reviewBatch,'53');assert.equal(q.reviewStage,'awaiting-new-authoritative-evidence');assert.equal(v.publicationEligible,false);assert.equal(v.routeAudit.outcome,'not-cleared');assert.equal(v.routeAudit.destinationCoordinatesForDriving,false);assert.equal(v.routeAudit.routePolylineAuthorized,false);assert.equal(v.routeAudit.segments.length,6);
 const park=id===176||id===177;assert.equal(v.publicAccess.startsWith('township-public-day-use'),park);assert.equal(c.publicAccessVerified,false);if(park){assert.equal(c.parkAccessEvidence?.waterfallSpecificRouteVerified,false);assert.equal(c.parkAccessEvidence?.parkingWaypointVerified,false);assert.equal(c.parkAccessEvidence?.scope,'municipal-day-use-park-only');}
 const path='/upper-peninsula-waterfalls/research/'+slug+'/';assert.equal(v.researchPage,path);assert.ok(!sitemap.includes(path));const page=fs.readFileSync('public'+path+'index.html','utf8');assert.match(page,/noindex,follow/);assert.match(page,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);assert.match(page,/Built by Chris Izworski/);const meta=(page.match(/<meta name="description" content="([^"]*)">/)||[])[1];assert.ok(meta&&meta.length<=158,'meta too long '+slug);const title=(page.match(/<title>([^<]*)<\/title>/)||[])[1];assert.ok(title&&title.length<=60,'title too long '+slug);const tag='<script type="application/ld+json">',at=page.indexOf(tag);assert.ok(at>=0);const ld=JSON.parse(page.slice(at+tag.length,page.indexOf('</script>',at)));assert.equal(ld['@type'],'WebPage');assert.equal(ld.author['@id'],'https://chrisizworski.com/#person');assert.doesNotMatch(page,/"@type":"TouristAttraction"/);}
 assert.ok(V.records.length>=94);assert.equal(R.counts.curatedTotal,73);assert.equal(R.counts.exactIdMatched,66);assert.equal(R.counts.pending,95);assert.equal(L.unresolvedCandidates,95);assert.equal(Q.candidates.length,95);
 const notes=id=>R.candidates.find(x=>x.gisObjectId===id).sourceNotes;
 assert.match(notes(152),/49 metres/);assert.match(notes(152),/SNAKE CREEK/);assert.match(notes(152),/Huron Mountain Club/);
 assert.match(notes(176),/10 metres/);assert.match(notes(176),/THREE-INCH/);assert.match(notes(176),/adopted September 2024/);
 assert.match(notes(177),/357 metres/);assert.match(notes(177),/78 metres/);
 assert.match(notes(23),/157 metres/);assert.match(notes(23),/36.1 km/);assert.match(notes(23),/submerged/);
});
