import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const c=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const r=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const s=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const q=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const page=fs.readFileSync('public/upper-peninsula-waterfalls/little-garlic-falls/index.html','utf8');
const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('batch 28 NCTA Little Garlic public visitor source gate and separation from Big Garlic',()=>{
 const f=c.find(x=>x.id==='little-garlic-falls'),g=r.candidates.find(x=>x.gisObjectId===157),l=s.entries.find(x=>x.sourceId===157&&x.source==='mi-state-gis');
 assert.ok(c.length>=64);assert.equal(f.gisObjectId,157);assert.equal(f.publication,'verified-access-guide');assert.equal(g.curatedId,f.id);assert.equal(g.publicationEligible,true);assert.equal(l.reviewBatch,'28');
 for(const k of ['landManager','publicAccess','parking','trail','location']){assert.equal(f.verification[k].verified,true);assert.match(f.verification[k].source,/^https:\/\//);}
 assert.match(f.walk,/wooden footbridges/);assert.match(f.parking,/Harrison Road/);assert.ok(!('parkingLat' in f));
 assert.match(page,/robots" content="index,follow/);assert.match(page,/Current opening and road conditions are unverified/);assert.match(page,/data-lat="46\.667721"/);assert.ok(!page.includes('data-parking-lat='));
 const j=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.ok(j['@graph'].some(x=>x['@type']==='TouristAttraction'));
 const x=JSON.parse(hub.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);const l2=x['@graph'].find(x=>x['@type']==='ItemList');assert.ok(l2.numberOfItems>=63);assert.ok(l2.itemListElement.some(x=>x.name==='Little Garlic Falls'));
 assert.equal((hub.match(/<article class="waterfall-card"/g)||[]).length,c.length);assert.match(hub,/data-id="little-garlic-falls"[^>]*data-gis-oid="157"/);assert.match(hub,/data-arrival-guide="https:\/\/northcountrytrail.org\/trail\/michigan\/mac\//);
 assert.equal((sitemap.match(/<loc>/g)||[]).length,l2.numberOfItems);assert.match(sitemap,/upper-peninsula-waterfalls\/little-garlic-falls\//);
 assert.ok(r.counts.exactIdMatched>=59);assert.equal(r.counts.exactIdMatched+r.counts.pending,161);assert.equal(q.candidates.length,r.counts.pending);assert.ok(!q.candidates.some(x=>x.gisObjectId===157));
 for(const id of [190,191,215])assert.equal(r.candidates.find(x=>x.gisObjectId===id).publicationEligible,false);
});