'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const e=JSON.parse(read('data/up-waterfall-warner-culvert-evidence.json'));
const r=JSON.parse(read('data/up-waterfall-reconciliation.json'));
const l=JSON.parse(read('data/up-waterfall-inventory-ledger.json'));
const a=JSON.parse(read('public/assets/up-waterfall-access-reviews.json'));
const q=JSON.parse(read('data/up-waterfall-review-queue.json'));

test('B69 Warner Falls south of Palmer is not mistaken for MDOT north-of-Palmer culvert project',()=>{
 assert.equal(e.batch,'B69');
 assert.equal(e.feature.stateGisId,172);
 assert.deepEqual([e.feature.latitude,e.feature.longitude],[46.433378,-87.59896]);
 assert.equal(e.constructionReports.length,2);
 assert.equal(e.constructionReports[0].id,'mdot-north-palmer');
 assert.match(e.constructionReports[0].location,/north of Palmer/i);
 assert.match(e.constructionReports[1].location,/Roads MT and MP.*south of Palmer/i);
 assert.equal(e.geometryReview.differentProjectLocationsSupported,true);
 assert.equal(e.geometryReview.exactCulvertCoordinatesFound,false);
 assert.equal(e.geometryReview.augustSouthProjectCrosswalkToFalls,false);
 assert.equal(e.geometryReview.originalPostConstructionGuardrailClaimUnsupported,true);
 assert.ok(e.travelSources.length>=3);
 assert.equal(e.publication.directionsToHistoricalShoulder,false);
 assert.equal(e.publication.directionsToNaturalPoint,false);
 assert.equal(e.publication.trailPolylineAuthorized,false);
 assert.equal(e.publication.createCuratedDestination,false);
 assert.equal(e.publication.addToVisitorSitemap,false);
 assert.equal(e.publication.touristAttractionSchema,false);
 assert.equal(Object.keys(e.sixAxes).length,6);
});

test('B69 Warner source/visitor JSON remain aligned and research-only',()=>{
 const gis=r.candidates.find(x=>x.gisObjectId===172);
 const led=l.entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===172);
 const review=a.records.find(x=>x.gisObjectId===172);
 const queue=q.candidates.find(x=>x.gisObjectId===172);
 assert.ok(gis&&led&&review&&queue);
 assert.equal(gis.researchBatch,'69');
 assert.equal(led.researchBatch,'69');
 assert.equal(led.reviewBatch,'34'); // original historical batch preserved
 assert.equal(gis.curatedId,null);
 assert.equal(gis.publicationEligible,false);
 assert.equal(led.publication,'research-only');
 assert.equal(review.publicationEligible,false);
 assert.equal(review.routeAudit.outcome,'not-cleared');
 assert.equal(review.routeAudit.segments.length,6);
 assert.equal(review.routeAudit.destinationCoordinatesForDriving,false);
 assert.equal(review.routeAudit.routePolylineAuthorized,false);
 assert.match(gis.sourceNotes,/NORTH of Palmer/);
 assert.match(gis.sourceNotes,/County Roads MT and MP/);
 assert.equal(queue.sourceCount,gis.sourceLinks.length);
 assert.equal(queue.reviewStage,'awaiting-new-authoritative-evidence');
 assert.equal(q.counts.curatedDestinations,80);
 assert.equal(q.counts.matchedGisFeatures,69);
 assert.equal(q.counts.pendingGisFeatures,92);
 assert.ok(gis.sourceLinks.includes(e.constructionReports[1].source));
});

test('B69 Warner page is a source-rich noindex research decision, never a directions page',()=>{
 const page=read('public/upper-peninsula-waterfalls/research/warner-falls/index.html');
 assert.match(page,/<meta name="robots" content="noindex,follow">/);
 assert.match(page,/One waterfall and two separate highway project descriptions/);
 assert.match(page,/north of Palmer/i);
 assert.match(page,/County Roads MT and MP/);
 assert.match(page,/NOT CLEARED FOR AUTOMATED VISITOR NAVIGATION/);
 assert.match(page,/michigan\.gov\/mdot\/news-outreach\/pressreleases\/2026\/07\/01/);
 assert.match(page,/michigan\.gov\/mdot\/news-outreach\/pressreleases\/2026\/08\/12/);
 assert.match(page,/travelmarquette\.com\/blog\/post\/waterfalls-you-need-to-see-in-fall/);
 assert.match(page,/wright-street-falls/);
 assert.match(page,/"dateModified":"20\d{2}-\d{2}-\d{2}"/); // later source batches may refresh this page
 assert.match(page,/https:\/\/chrisizworski\.com\/#person/);
 assert.doesNotMatch(page,/"@type":"TouristAttraction"/);
 assert.doesNotMatch(page,/google\.com\/maps\/dir\//i);
 const desc=(page.match(/<meta name="description" content="([^"]+)"/)||[])[1];
 assert.ok(desc && desc.length<=158);
 const sitemap=read('public/sitemap-up-waterfalls.xml');
 assert.doesNotMatch(sitemap,/\/upper-peninsula-waterfalls\/research\/warner-falls\//);
 assert.equal(r.counts.curatedTotal,80);
 assert.equal(r.counts.exactIdMatched,69);
 assert.equal(r.counts.pending,92);
});
