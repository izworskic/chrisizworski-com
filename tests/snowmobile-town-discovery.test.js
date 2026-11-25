'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const regionKeys=['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan'];
test('each of the seven existing region pages has source-grounded town demand answers, not invented riding verdicts',async()=>{
  const {townsForRegion,townSectionsFor}=await import('../lib/snowmobile/town-discovery.mjs');
  const {metadataFor}=await import('../lib/snowmobile/discovery.mjs');
  const {regionByKey}=await import('../lib/snowmobile/regions.mjs');
  let count=0;
  for(const key of regionKeys){
    const r=regionByKey(key),towns=townsForRegion(key),meta=metadataFor(r);
    const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/snowmobile-town-proximity',key+'.json'),'utf8'));
    assert.equal(snapshot.towns.length,towns.length,key);
    assert.ok(towns.length>=2,key);
    assert.ok(meta.description.length<=158,key);
    assert.ok(meta.title.endsWith('| Chris Izworski'),key);
    const body=townSectionsFor(r);
    for(const town of towns){
      count++;
      const raw=snapshot.towns.find(item=>item.name===town.name);
      assert.ok(raw?.proxy?.suggestion&&raw.proxy.seed,key+' '+town.name);
      assert.match(raw.proxy.source,/Google autocomplete/);
      assert.equal(raw.dnr.radiusKm,5);
      assert.ok(raw.dnr.hitCount>0&&raw.dnr.query.includes('distance=5000'));
      assert.ok(Number.isFinite(town.proximityKm)&&town.proximityKm<=5.05,key+' '+town.name);
      assert.ok(town.trailNumbers.length>0,key+' '+town.name);
      assert.ok(Number.isFinite(town.nearest.lat)&&Number.isFinite(town.nearest.lon));
      assert.ok(Number.isFinite(town.station.distanceKm)&&town.station.id);
      assert.ok(body.includes('id="'+town.id+'"'),key+' '+town.name);
      assert.ok(body.includes('Trail conditions near '+town.name),key+' '+town.name);
    }
    assert.ok(body.includes('not a verified trailhead or parking location'));
    assert.ok(body.includes('data-town-live'));
    assert.ok(body.includes('data-town-junction-lat'));
    assert.ok(body.includes('snow-town-guide-title'));
  }
  assert.equal(count,27);
});
test('town card updates reuse dated club report API without confusing snow or source-check time for grooming',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../public/assets/snowmobile-town-evidence.js'),'utf8');
 const page=fs.readFileSync(path.join(__dirname,'../public/assets/snowmobile-region.js'),'utf8');
 assert.ok(src.includes('/api/snowmobile-local-reports?region='));
 assert.ok(src.includes('snowmobile:local-reports'));
 assert.ok(src.includes("state==='RECENT'&&source.condition&&source.reportedAt"));
 assert.ok(src.includes("state==='STALE'"));
 assert.ok(src.includes("state==='DATE_CONFLICT'"));
 assert.ok(src.includes('DNR closures'));
 assert.ok(!src.includes('rideable'));
 assert.ok(page.includes('data-town-junction-lat'));
 assert.ok(page.includes('snowmobile_town_map_focus'));
});
