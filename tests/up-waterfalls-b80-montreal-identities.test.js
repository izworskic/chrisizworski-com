'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const read=p=>fs.readFileSync(p,'utf8');
const cat=JSON.parse(read('data/up-waterfalls.json')),gis=JSON.parse(read('data/up-waterfall-reconciliation.json')),
 ledger=JSON.parse(read('data/up-waterfall-inventory-ledger.json')),queue=JSON.parse(read('data/up-waterfall-review-queue.json')),
 discovery=JSON.parse(read('data/up-waterfall-discovery-index.json')),e=JSON.parse(read('data/up-waterfall-b80-identity-evidence.json')),
 near=JSON.parse(read('public/assets/up-waterfalls-nearby.json'));
const hub=read('public/upper-peninsula-waterfalls/index.html'),sm=read('public/sitemap-up-waterfalls.xml'),js=read('public/assets/up-waterfalls.js');
const pages={montreal:read('public/upper-peninsula-waterfalls/montreal-falls-keweenaw/index.html'),elliot:read('public/upper-peninsula-waterfalls/elliot-falls/index.html'),misicot:read('public/upper-peninsula-waterfalls/misicot-falls/index.html'),interstate:read('public/upper-peninsula-waterfalls/interstate-falls/index.html')};
test('B80 preserves conservation of inventory and GIS after one, not four, new publicly accessible destinations',()=>{
 assert.deepEqual([cat.waterfalls.length,gis.counts.curatedTotal,ledger.curatedCount,queue.counts.curatedDestinations,discovery.counts.curatedDestinations],[80,80,80,80,80]);
 assert.deepEqual([gis.counts.gisCandidates,gis.counts.exactIdMatched,gis.counts.pending,gis.counts.curatedNoMatchingGIS],[161,69,92,15]);
 assert.deepEqual(near.counts,{curated:80,eligible:71,excluded:9});
 assert.equal((sm.match(/<loc>/g)||[]).length,78);
 assert.equal((hub.match(/<article class="waterfall-card"/g)||[]).length,80);
 assert.equal((hub.match(/data-id="montreal-falls-keweenaw"/g)||[]).length,1);
 const graph=JSON.parse(hub.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'],list=graph.find(x=>x['@type']==='ItemList');
 assert.equal(list.numberOfItems,78);assert.equal(list.itemListElement.at(-1).name,'Montreal Falls (Keweenaw)');
 assert.equal(near.locations.filter(x=>x.id==='montreal-falls-keweenaw').length,1);
 assert.ok(gis.curatedWithoutExactGISMatch.some(x=>x.id==='montreal-falls-keweenaw'&&x.gisObjectId===null));
});
test('B80 Montreal public approach is Fish Cove, map point is never vehicle parking or a published foot route',()=>{
 const f=cat.waterfalls.find(x=>x.id==='montreal-falls-keweenaw');assert.ok(f);
 assert.equal(f.publication,'verified-access-guide');
 assert.equal(f.gisObjectId,null);
 assert.equal(f.region,'Keweenaw Peninsula');
 assert.deepEqual([f.lat,f.lng],[47.39257,-87.84114]);
 assert.equal(f.geocodeProvenance.notParking,true);assert.equal(f.geocodeProvenance.notTrailRoute,true);assert.equal(f.geocodeProvenance.parkingGPSPublished,false);
 for(const key of ['landManager','publicAccess','parking','trail','location'])assert.equal(f.verification[key].verified,true);
 assert.match(f.parking,/Fish Cove/);assert.match(f.parking,/Mandan/);assert.match(f.parking,/Never use.*Smith Fisheries/i);
 assert.ok(!f.parkingLocation);
 assert.match(pages.montreal,/not a parking/);
 assert.match(pages.montreal,/data-lat="47.39257" data-lng="-87.84114"/);
 assert.match(pages.montreal,/Smith Fisheries Road is private/);
 assert.match(pages.montreal,/no signs|not maintained|unmaintained/);
 assert.doesNotMatch(pages.montreal,/data-parking-lat=/);
 assert.doesNotMatch(pages.montreal,/google.com\/maps\/dir\//);
 assert.match(pages.montreal,/2026\/11\/06\/dnr-tnc-protect-public-access/);
 const ld=JSON.parse(pages.montreal.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 assert.equal(ld.find(x=>x['@type']==='WebPage').dateModified,'2026-11-07');
 assert.ok(pages.montreal.includes('rel="canonical" href="https://chrisizworski.com/upper-peninsula-waterfalls/montreal-falls-keweenaw/"'));
 assert.match(pages.montreal,/name="twitter:card"/);assert.match(pages.montreal,/property="og:title"/);
});
test('B80 Peterson closed, Miners Beach and Piers Gorge group are not duplicate publicly navigable waterfalls',()=>{
 assert.equal(e.cases.length,4);
 const pet=e.cases.find(x=>x.case==='peterson-closed');
 assert.equal(pet.accessStatus,'closed-to-public');assert.equal(pet.published,false);
 assert.match(pages.interstate,/Peterson Falls.*closed to the public/i);
 assert.ok(!cat.waterfalls.some(x=>/peterson/i.test(x.id)));
 assert.ok(!sm.includes('/peterson-falls/'));
 const ealias=e.cases.find(x=>x.case==='miners-beach-elliot');
 assert.equal(ealias.destinationId,'elliot-falls');
 assert.match(pages.elliot,/Searching for Miners Beach Falls/);
 assert.match(pages.elliot,/Do not confuse.*Miners Falls/i);
 const piers=e.cases.find(x=>x.case==='piers-gorge-group');
 assert.deepEqual(piers.destinationIds,['misicot-falls','sand-portage-falls']);
 assert.match(pages.misicot,/Piers Gorge is a group of river drops/);
 assert.match(hub,/data-aliases="Miners Beach Falls/);
 assert.match(hub,/data-aliases="Piers Gorge Falls/);
 assert.match(js,/dataset.aliases/);
 assert.equal(discovery.counts.distinctGeographicFallsVerifiedByThisEngine,0);
 assert.ok(!sm.includes('/piers-gorge-falls/'));
});
test('B80 generated Python nearby and discovery research snapshots remain deterministic',()=>{
 for(const [script,args] of [['scripts/build-up-waterfalls-nearby.py',['--check']],['scripts/build-up-waterfall-discovery.py',['--check']]]){
  const r=cp.spawnSync('python3',[script,...args],{encoding:'utf8',timeout:30000});
  assert.equal(r.status,0,r.stderr||r.stdout);
 }
});
