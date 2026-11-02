import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const l=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const v=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('batch43 blocks uncertain land title, minor rapids and unpublished trails',()=>{
 for(const [id,slug] of [[63,'algonquin-falls'],[65,'ogima-falls'],[69,'ogimakwe-falls'],[70,'abinodji-falls'],[74,'nokomis-falls']]){
 const c=r.candidates.find(x=>x.gisObjectId===id),e=l.entries.find(x=>x.sourceId===id),a=v.records.find(x=>x.gisObjectId===id);
 assert.ok(c&&e&&a);assert.equal(c.curatedId,null);assert.equal(c.publicationEligible,false);assert.equal(e.publication,'research-only');assert.equal(a.routeAudit.outcome,'not-cleared');assert.equal(a.routeAudit.routePolylineAuthorized,false);assert.equal(a.routeAudit.destinationCoordinatesForDriving,false);assert.equal(a.routeAudit.segments.length,6);assert.equal(q.candidates.find(x=>x.gisObjectId===id).reviewStage,'awaiting-new-authoritative-evidence');
 const url='/upper-peninsula-waterfalls/research/'+slug+'/';const html=fs.readFileSync('public'+url+'index.html','utf8');assert.match(html,/noindex,follow/);assert.ok(!sitemap.includes(url));assert.equal(a.researchPage,url);assert.equal(JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]||'{}')['@type'],'WebPage');
 }
 assert.ok(r.counts.pending<=96);assert.ok(q.candidates.length<=96);assert.ok(q.counts.curatedDestinations>=71);assert.ok(l.unresolvedCandidates<=96);
 assert.match(r.candidates.find(x=>x.gisObjectId===63).landManager,/Ottawa National Forest/);
 for(const id of [65,69,70,74]){const c=r.candidates.find(x=>x.gisObjectId===id);assert.equal(c.landManager,null);assert.match(c.accessRouteAudit.segments[1].finding,/No USFS/);}
 assert.match(r.candidates.find(x=>x.gisObjectId===74).sourceNotes,/commercial forest/);
});
