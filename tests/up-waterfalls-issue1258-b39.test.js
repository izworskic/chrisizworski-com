import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const v=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('batch39 Baraga candidates remain nonindexed and unrouteable after research',()=>{
 for(const [id,slug] of [[52,'plumbago-falls'],[59,'ogemaw-falls'],[83,'daults-falls']]){
 const a=r.candidates.find(x=>x.gisObjectId===id),rev=v.records.find(x=>x.gisObjectId===id);
 assert.ok(a&&rev);assert.equal(a.curatedId,null);assert.equal(a.publicationEligible,false);
 assert.equal(rev.routeAudit.segments.length,6);assert.equal(rev.routeAudit.routePolylineAuthorized,false);
 const url='/upper-peninsula-waterfalls/research/'+slug+'/';
 assert.ok(fs.readFileSync('public'+url+'index.html','utf8').includes('noindex,follow'));assert.ok(!sitemap.includes(url));
 assert.equal(q.candidates.find(x=>x.gisObjectId===id).reviewStage,'awaiting-new-authoritative-evidence');
 }assert.equal(q.candidates.length,96);
});
