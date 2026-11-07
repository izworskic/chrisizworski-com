'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const read=p=>fs.readFileSync(p,'utf8');
const e=JSON.parse(read('data/up-waterfall-b78-wildcat-publication-evidence.json'));
const cat=JSON.parse(read('data/up-waterfalls.json')),rec=JSON.parse(read('data/up-waterfall-reconciliation.json')),
 ledger=JSON.parse(read('data/up-waterfall-inventory-ledger.json')),queue=JSON.parse(read('data/up-waterfall-review-queue.json')),
 near=JSON.parse(read('public/assets/up-waterfalls-nearby.json'));
const page=read('public/upper-peninsula-waterfalls/wildcat-falls/index.html'),hub=read('public/upper-peninsula-waterfalls/index.html'),sm=read('public/sitemap-up-waterfalls.xml');
test('B78 Wildcat source triangulation separates owner trail & legal road arrival from approximate waterfall geography',()=>{
 assert.equal(e.method,'online-sources-only-no-outreach');
 assert.equal(e.sourceGisOid,null);
 assert.equal(e.officialMappedVisitorTrail.publicTrailMarkedYellow,true);
 assert.equal(e.officialMappedVisitorTrail.oneWayOrRoundTripPublished,false);
 assert.equal(e.approximateNaturalFeature.independentlySurveyed,false);
 assert.equal(e.roadsideParking.surveyedGPS,null);
 assert.equal(e.roadsideParking.vehicleDirectionsToFallsPin,false);
 for(const axis of Object.values(e.fiveAxes))assert.equal(axis,true);
 for(const policy of Object.values(e.publication))assert.equal(policy,true);
 const row=cat.waterfalls.find(x=>x.id==='wildcat-falls');assert.ok(row);
 assert.equal(row.gisObjectId,null);assert.equal(row.publication,'verified-access-guide');
 assert.equal(row.status,'verify');assert.deepEqual([row.lat,row.lng],[46.346173,-89.292236]);
 assert.equal(row.geocodeProvenance.notParking,true);assert.equal(row.geocodeProvenance.notTrailRoute,true);assert.equal(row.geocodeProvenance.parkingGPSPublished,false);
 assert.ok(!row.parkingLocation);
 for(const key of ['landManager','publicAccess','parking','trail','location'])assert.equal(row.verification[key].verified,true,key);
 assert.equal(row.verification.location.source,e.approximateNaturalFeature.source);
 assert.match(row.verification.trail.source,/Slide2\.jpg/);
});
test('B78 all inventory, curator, nearby Python and sitemap counts agree without stealing a GIS feature',()=>{
 assert.deepEqual([cat.waterfalls.length,rec.counts.curatedTotal,ledger.curatedCount,queue.counts.curatedDestinations],[80,80,80,80]);
 assert.deepEqual([rec.counts.exactIdMatched,rec.counts.pending,rec.counts.curatedNoMatchingGIS],[69,92,15]);
 assert.ok(rec.curatedWithoutExactGISMatch.some(x=>x.id==='wildcat-falls'&&x.gisObjectId===null));
 assert.ok(ledger.entries.some(x=>x.curatedId==='wildcat-falls'&&x.coordinateRole.includes('not-road-parking')));
 assert.deepEqual(near.counts,{curated:80,eligible:71,excluded:9});
 assert.deepEqual(near.locations.filter(x=>x.id==='wildcat-falls').map(x=>[x.lat,x.lng]),[[46.346173,-89.292236]]);
 assert.ok(near.nearby['wildcat-falls'].some(x=>x.id==='bond-falls'));
 assert.match(hub,/80 curated visitor destinations/);assert.match(hub,/80 curated waterfall profiles/);
 assert.equal((hub.match(/data-id="wildcat-falls"/g)||[]).length,1);
 assert.equal((sm.match(/<loc>/g)||[]).length,78);
 assert.ok(sm.includes('wildcat-falls/</loc><lastmod>2026-11-07</lastmod>'));
 const graph=JSON.parse(hub.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];const list=graph.find(x=>x['@type']==='ItemList');
 assert.equal(list.numberOfItems,78);assert.ok(list.itemListElement.some(x=>x.name==='Wildcat Falls'),'B78 Wildcat must remain in the ItemList after newer verified destinations');
});
test('B78 public indexable guide is evidence-rich, not navigation to approximate falls pin',()=>{
 assert.match(page,/rel="canonical" href="https:\/\/chrisizworski.com\/upper-peninsula-waterfalls\/wildcat-falls\//);
 assert.match(page,/<meta name="robots" content="index,follow/);assert.match(page,/https:\/\/chrisizworski.com\/#person/);
 assert.match(page,/data-lat="46.346173" data-lng="-89.292236"/);
 assert.doesNotMatch(page,/data-parking-lat=/);assert.doesNotMatch(page,/google.com\/maps\/dir\//);
 assert.match(page,/current opening and road conditions are unverified/i);
 assert.match(page,/not clearly labeled one-way or round trip/i);
 assert.match(page,/TRAIL HEAD/);assert.match(page,/yellow-marked/);assert.match(page,/McGinty Lane/);
 assert.ok(page.includes('https://www.northwoodalliance.org/wildcat-falls'));
 assert.ok(page.includes('WaterfallMapBro_2022_Drft6-opt.pdf'));
 assert.match(page,/Slide2\.jpg/);
 const title=page.match(/<title>(.*?)<\/title>/)[1];assert.ok(title.length<=60);
 const description=page.match(/<meta name="description" content="([^"]+)"/)[1];assert.ok(description.length<=158);
 assert.match(page,/twitter:card/);assert.match(page,/og:title/);
 for(const axis of Object.values(cat.waterfalls.find(x=>x.id==='wildcat-falls').verification))assert.ok(page.includes(axis.source));
});
