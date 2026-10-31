import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const ledger=JSON.parse(fs.readFileSync('data/up-waterfall-inventory-ledger.json','utf8'));
const hydro=JSON.parse(fs.readFileSync('data/up-waterfall-usgs-v2-crosswalk.json','utf8'));
const hub=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const sitemap=fs.readFileSync('public/sitemap-up-waterfalls.xml','utf8');
const ids=['overlooked-falls','trap-falls'];
test('issue 1258 batch 03a: individual public access, parking, trail, land and geography checks gate both guides',()=>{
 assert.ok(data.length>=43,'previous 43 visitor destinations must be retained');
 for(const id of ids){
  const f=data.find(x=>x.id===id);assert.ok(f,id);
  assert.equal(f.publication,'verified-access-guide');
  assert.equal(f.manager,'Michigan DNR · Porcupine Mountains Wilderness State Park');
  for(const k of ['landManager','publicAccess','parking','trail','location']){assert.equal(f.verification[k].verified,true,id+' '+k);assert.match(f.verification[k].source,/^https:\/\//);}
  assert.match(f.winterRoad,/December 1 through late spring/);
  const page=fs.readFileSync('public/upper-peninsula-waterfalls/'+id+'/index.html','utf8');
  assert.match(page,/<meta name="robots" content="index,follow/);
  assert.match(page,/data-lat="46\./);
  assert.ok(page.includes('https://chrisizworski.com/#person'));
  assert.ok(page.includes('href="/assets/vendor/leaflet-1.9.4.css"'));
  assert.ok(page.includes('Current opening and road conditions are unverified'));
  assert.ok(!page.includes('data-parking-lat='));
  assert.ok(page.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length>450);
  for(const v of Object.values(f.verification)) assert.ok(page.replaceAll('&amp;','&').includes(v.source),'uncited '+id+' '+v.source);
  assert.ok(sitemap.includes('/upper-peninsula-waterfalls/'+id+'/'));
  const card=hub.match(new RegExp('<article class="waterfall-card"[^>]*data-id="'+id+'"[\\s\\S]*?<\\/article>'));
  assert.ok(card,'map card '+id);
  for(const term of ['data-gis-oid="'+f.gisObjectId+'"','data-arrival-parking=','data-arrival-trail=','data-arrival-verified="verified"','Check parking source','Check trail source']) assert.ok(card[0].includes(term),id+' missing '+term);
 }
 assert.ok(data.some(x=>x.id==='saxon-falls'));
 assert.ok(data.some(x=>x.id==='superior-falls'));
 assert.ok(data.some(x=>x.id==='greenstone-falls'));
 const scott=data.find(x=>x.id==='scott-falls');
 assert.ok(scott && scott.publication==='verified-access-guide','later park-side-only Scott guide must remain published');
 assert.ok(sitemap.includes('/upper-peninsula-waterfalls/scott-falls/'));
 assert.match(scott.walk,/without crossing M-28|Do not cross busy M-28|There is no established public pedestrian crossing/i);
 assert.equal(scott.verification.publicAccess.verified,true);
});
test('trap hydro comparison is geographical only, not a parking or safe-travel guarantee',()=>{
 const trap=data.find(x=>x.id==='trap-falls'),overlooked=data.find(x=>x.id==='overlooked-falls');
 assert.equal(trap.gisObjectId,118);assert.equal(overlooked.gisObjectId,97);
 assert.equal(trap.hydro.nhdPlusComid,'6789487');
 assert.equal(trap.hydro.matchDistanceMeters,14);
 const cross=hydro.matches.find(x=>x.stateGisObjectId===118);
 assert.equal(cross.usgsFeatureId,trap.hydro.usgsFeatureId);
 assert.ok(!overlooked.hydro);
 assert.match(trap.walk,/3.2-mile round-trip/);
 assert.match(trap.walk,/different|longer/i);
 assert.ok(!('parkingLat' in trap));
 assert.ok(!('parkingLat' in overlooked));
});
test('B03a ledger moves two stable GIS identities without inflating research candidates',()=>{
 assert.equal(ledger.sourceCount,197);
 assert.equal(ledger.sourceCandidateCount,161);
 assert.equal(ledger.curatedCount,data.length,'ledger reflects current curated inventory');
 const linked=new Set(data.flatMap(x=>[...(Number.isInteger(x.gisObjectId)?[x.gisObjectId]:[]),...(x.multiFeatureGisObjectIds||[])]));assert.equal(ledger.linkedByExactOid,linked.size,'include multi-feature GIS IDs');
 assert.equal(ledger.unresolvedCandidates,ledger.sourceCandidateCount-ledger.linkedByExactOid);
 assert.ok(ledger.entries.length>=169,'source history can grow without invalidating earlier batch 03a');
 assert.ok(ledger.lastBatch,'batch lineage must remain recorded');
 for(const oid of [97,118]){const x=ledger.entries.find(y=>y.sourceId===oid&&y.source==='mi-state-gis');assert.ok(x);assert.equal(x.identity,'linked');assert.equal(x.reviewBatch,'03a');assert.equal(x.publication,'verified-access-guide');assert.ok(x.parkingEvidence.startsWith('https://'));assert.ok(x.trailEvidence.startsWith('https://'));}
 const schemas=JSON.parse(hub.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 const list=schemas['@graph'].find(x=>x['@type']==='ItemList');
 assert.equal(list.numberOfItems,data.filter(x=>x.link||['verified-access-guide','verified-closure-guide'].includes(x.publication)).length);
 assert.equal((sitemap.match(/<loc>/g)||[]).length,list.numberOfItems);
});
