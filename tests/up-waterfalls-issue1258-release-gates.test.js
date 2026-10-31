import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const base='public/upper-peninsula-waterfalls/';
const data=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const rec=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const queue=JSON.parse(fs.readFileSync('data/up-waterfall-review-queue.json','utf8'));
const ledger=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const hub=fs.readFileSync(base+'index.html','utf8');
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
const expected=['lepisto-falls','trappers-falls','explorers-falls','shining-cloud-falls','big-erics-falls','tioga-park-falls'];
test('all source-gated visitor guides are published, but seasonal status is never fabricated',()=>{
 for(const id of expected){
  const guide=data.find(f=>f.id===id);
  assert.ok(guide,id+' missing from curated data');
  assert.equal(guide.publication,'verified-access-guide');
  assert.ok(guide.parking && guide.walk && guide.decision);
  const html=fs.readFileSync(base+id+'/index.html','utf8');
  assert.match(html,/meta name="robots" content="index,follow/);
  assert.ok(html.includes('https://chrisizworski.com/'+base+id+'/'),id+' canonical');
  assert.match(html,/unverified|unknown|not confirmed|not verified/i);
  assert.ok(!html.includes('data-parking-lat='),'invented parking GPS '+id);
  const ld=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(ld['@graph'].some(x=>x['@type']==='TouristAttraction'));
  assert.ok(sitemap.includes('/upper-peninsula-waterfalls/'+id+'/'));
  assert.ok(hub.includes('data-id="'+id+'"'));
  for(const key of ['landManager','publicAccess','parking','trail','location']){
    assert.equal(guide.verification?.[key]?.verified,true,id+' '+key);
    assert.ok(guide.verification[key].source.startsWith('https://'));
  }
 }
});
test('source/visitor totals are derived from registry, not hard-coded historical snapshot',()=>{
 const ids=new Set(data.filter(f=>Number.isInteger(f.gisObjectId)).map(f=>f.gisObjectId));
 assert.equal(data.length,ledger.curatedCount);
 assert.equal(ids.size,rec.counts.exactIdMatched);
 assert.equal(rec.counts.exactIdMatched+rec.counts.pending,rec.counts.gisCandidates);
 assert.equal(queue.candidates.length,rec.counts.pending);
 assert.equal(queue.batches.length,Math.ceil(queue.candidates.length/queue.batchSize));
 assert.equal((hub.match(/<article class="waterfall-card"/g)||[]).length,data.length);
 const j=JSON.parse(hub.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 const list=j['@graph'].find(x=>x['@type']==='ItemList');
 assert.equal((sitemap.match(/<loc>/g)||[]).length,list.numberOfItems);
});
test('Scott M-28 and remote unverified waterfall IDs remain access-safe',()=>{
 const scott=data.find(f=>f.id==='scott-falls');
 assert.equal(scott.publication,'verified-access-guide');
 assert.match(scott.walk,/Do not cross busy M-28/i);
 assert.ok(sitemap.includes('/upper-peninsula-waterfalls/scott-falls/'));
 const tioga=data.find(f=>f.id==='tioga-park-falls');
 assert.ok(!Number.isInteger(tioga.gisObjectId));
 for(const oid of [46,86,112,114,149,150,151,154,172,190,191,215]){
  const row=rec.candidates.find(x=>x.gisObjectId===oid);
  assert.ok(row,oid+' source missing');assert.equal(row.curatedId,null);assert.equal(row.publicationEligible,false);
 }
});
