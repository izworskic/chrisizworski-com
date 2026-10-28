import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const waterfalls=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const ledger=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const geo=JSON.parse(fs.readFileSync('data/up-waterfall-geo-candidates.json','utf8')).features;
const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');

test('issue 1258 recovery preserves existing guides and publishes exactly three Porcupine Mountains guides',()=>{
 const ids=['greenstone-falls','nonesuch-falls','little-union-gorge-falls'];
 assert.equal(waterfalls.length,40);
 assert.equal(new Set(waterfalls.map(x=>x.id)).size,40);
 for(const id of ids){
   const f=waterfalls.find(x=>x.id===id);
   assert.ok(f,'missing '+id);
   assert.equal(f.publication,'verified-access-guide');
   assert.equal(f.manager,'Michigan DNR · Porcupine Mountains Wilderness State Park');
   for(const k of ['landManager','publicAccess','parking','trail','location']){
     assert.equal(f.verification[k].verified,true,id+' '+k);
     assert.match(f.verification[k].source,/^https:\/\//);
   }
   assert.match(f.winterRoad,/December 1 through late spring/);
   assert.ok(hub.includes('data-id="'+id+'"'));
   assert.ok(hub.includes('data-arrival-source="'+f.verification.parking.source.replace(/&/g,'&amp;')+'"'));
   const page=fs.readFileSync('public/upper-peninsula-waterfalls/'+id+'/index.html','utf8');
   assert.match(page,/<meta name="robots" content="index,follow/);
   assert.match(page,/href="\/assets\/vendor\/leaflet-1\.9\.4\.css"/);
   assert.ok(page.replace(/<[^>]*>/g,' ').trim().split(/\s+/).length>400,id+' page lacks useful field detail');
   assert.ok(sitemap.includes('/upper-peninsula-waterfalls/'+id+'/'));
 }
 assert.ok(waterfalls.some(f=>f.id==='superior-falls'&&f.gisObjectId===50));
 assert.ok(waterfalls.some(f=>f.id==='horseshoe-falls'&&f.gisObjectId===197));
 assert.ok(!sitemap.includes('/upper-peninsula-waterfalls/scott-falls/'));
 assert.equal((hub.match(/data-fall data-id=/g)||[]).length,40);
 assert.equal((sitemap.match(/<loc>/g)||[]).length,38);
});

test('Nonesuch official parking coordinate remains separate from geographic waterfall location',()=>{
 const f=waterfalls.find(x=>x.id==='nonesuch-falls');
 assert.equal(f.gisObjectId,108);
 assert.ok(Math.abs(f.parkingLat-f.lat)>0.002&&Math.abs(f.parkingLng-f.lng)>0.002);
 const page=fs.readFileSync('public/upper-peninsula-waterfalls/nonesuch-falls/index.html','utf8');
 assert.ok(page.includes('data-parking-lat'));
 assert.match(page,/mine|ruins/i);
});

test('waterfall crosswalk scientific uncertainty is retained rather than overstated',()=>{
 const cases=[['greenstone-falls',40,false],['nonesuch-falls',262,true],['little-union-gorge-falls',529,true]];
 for(const [id,distance,review] of cases){
  const hydro=waterfalls.find(x=>x.id===id).hydro;
  assert.equal(hydro.matchDistanceMeters,distance);
  assert.equal(hydro.coordinateReviewRequired,review);
 }
});

test('GIS source ledger reconciles every source identity without claiming public access',()=>{
 assert.equal(ledger.summary.stateGISRaw,197);
 assert.equal(ledger.summary.stateGISFiltered,161);
 assert.equal(ledger.summary.curatedDestinations,40);
 assert.equal(ledger.summary.matchedByExactStateGisId,32);
 assert.equal(ledger.summary.unmatchedStateGisCandidates,129);
 assert.equal(ledger.summary.curatedWithoutMatchedGIS,8);
 assert.equal(ledger.records.length,169);
 const mapped=ledger.records.filter(x=>x.sourceClass==='michigan-gis');
 assert.equal(mapped.length,161);
 assert.equal(new Set(mapped.map(x=>x.identity.stateGisObjectId)).size,161);
 assert.deepEqual(new Set(mapped.map(x=>x.identity.stateGisObjectId)),new Set(geo.map(x=>x.gisObjectId)));
 for(const r of mapped){
   const f=waterfalls.find(x=>x.gisObjectId===r.identity.stateGisObjectId);
   assert.equal(r.review.linkedGuide||null,f?'/upper-peninsula-waterfalls/'+f.id+'/':null);
   if(!f){assert.equal(r.review.classification,'research-only-geography');assert.equal(r.review.eligibleForIndex,false);assert.equal(r.review.parking,null);}
 }
 assert.equal(ledger.batchLog.find(x=>x.id==='B01').guideIds.length,3);
 assert.equal(ledger.batchLog.find(x=>x.id==='B02').state,'implemented-ledger');
});
