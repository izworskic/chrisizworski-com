import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const rec=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const queue=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const page=fs.readFileSync('public/upper-peninsula-waterfalls/yondota-falls/index.html','utf8');
const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
test('Yondota official USFS river trail and north-of-bridge arrival stay source-gated',()=>{
 const g=data.find(x=>x.id==='yondota-falls'),r=rec.candidates.find(x=>x.gisObjectId===30),l=ledger.entries.find(x=>x.source==='mi-state-gis'&&x.sourceId===30);
 assert.ok(g&&r&&l);assert.equal(g.gisObjectId,30);assert.equal(g.publication,'verified-access-guide');
 assert.equal(r.curatedId,g.id);assert.equal(r.publicationEligible,true);assert.equal(l.reviewBatch,'36');
 for(const k of ['landManager','publicAccess','parking','trail','location']){assert.equal(g.verification[k].verified,true);assert.match(g.verification[k].source,/^https:\/\//);}
 assert.match(g.parking,/north side of the bridge/i);assert.match(g.walk,/quarter mile/);assert.match(g.walk,/uphill return/i);
 assert.ok(!('parkingLat' in g));assert.ok(!page.includes('data-parking-lat='));
 assert.match(page,/name="robots" content="index,follow/);assert.match(page,/data-lat="46\.430643"/);
 assert.match(page,/current road and parking conditions unverified/i);
 const ld=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.ok(ld['@graph'].some(x=>x['@type']==='TouristAttraction'));
 assert.ok(hub.includes('data-id="yondota-falls"'));assert.ok(sitemap.includes('/upper-peninsula-waterfalls/yondota-falls/'));
});
test('Yondota inventory and multi-feature accounting stay valid',()=>{
 const set=new Set(data.flatMap(x=>[...(Number.isInteger(x.gisObjectId)?[x.gisObjectId]:[]),...(x.multiFeatureGisObjectIds||[])]));
 assert.equal(data.length,ledger.curatedCount);assert.equal(set.size,rec.counts.exactIdMatched);
 assert.equal(rec.counts.pending+rec.counts.exactIdMatched,rec.counts.gisCandidates);
 assert.equal(queue.candidates.length,rec.counts.pending);
 assert.equal(queue.batches.length,Math.ceil(queue.candidates.length/queue.batchSize));
 assert.equal((hub.match(/<article class="waterfall-card"/g)||[]).length,data.length);
});
