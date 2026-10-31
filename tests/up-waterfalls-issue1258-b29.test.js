import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const l=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const v=JSON.parse(fs.readFileSync('public/assets/up-waterfall-access-reviews.json','utf8'));
const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8'),sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('batch 29: preserve four named research-only records, six source checkpoints and no route',()=>{
 assert.equal(r.candidates.length,161); assert.equal(q.candidates.length,r.counts.pending);
 for(const id of [149,150,151,154]) {const x=r.candidates.find(c=>c.gisObjectId===id),y=l.entries.find(c=>c.sourceId===id&&c.source==='mi-state-gis'),z=v.records.find(c=>c.gisObjectId===id);
 assert.ok(x&&y&&z);assert.equal(x.curatedId,null);assert.equal(x.publicationEligible,false);assert.equal(y.reviewBatch,'29');assert.equal(y.publication,'research-only');assert.equal(z.routeAudit.outcome,'not-cleared');assert.equal(z.routeAudit.segments.length,6);
 assert.equal(z.routeAudit.destinationCoordinatesForDriving,false);assert.equal(z.routeAudit.routePolylineAuthorized,false);assert.ok(!hub.includes('data-gis-oid="'+id+'"'));
 assert.ok(q.candidates.find(c=>c.gisObjectId===id).sourceCount>=4);}
 assert.equal((sitemap.match(/<loc>/g)||[]).length,JSON.parse(hub.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find(x=>x['@type']==='ItemList').numberOfItems);
});
test('batch 29 noindex pages never enter sitemap or visitor card set',()=>{
 for(const path of ['bushy-creek-falls','salmon-trout-falls']) {const p='/upper-peninsula-waterfalls/research/'+path+'/';const h=fs.readFileSync('public'+p+'index.html','utf8');
 assert.ok(h.includes('noindex,follow'));assert.ok(!sitemap.includes(p));assert.ok(!hub.includes('data-url="'+p+'"'));
 const json=JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(json['@type'],'WebPage');assert.ok(!h.includes('data-parking-lat'));}
 const twin=r.candidates.find(c=>c.gisObjectId===150);assert.match(twin.sourceNotes,/HUNTING\/FISHING\/TRAPPING/);
 const bush=r.candidates.find(c=>c.gisObjectId===154);assert.match(bush.sourceNotes,/12-acre.*DOWNSTREAM/);
});
