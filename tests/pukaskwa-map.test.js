const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const src='public/pukaskwa-national-park/';
const points=JSON.parse(fs.readFileSync(src+'access-points.json','utf8'));
const mapCode=fs.readFileSync('public/assets/pukaskwa-map.js','utf8');
const mapCss=fs.readFileSync('public/assets/pukaskwa-map.css','utf8');
const explorerCode=fs.readFileSync('public/assets/pukaskwa-explorer.js','utf8');
const html=fs.readFileSync(src+'index.html','utf8');

async function contract(){return import('../public/assets/pukaskwa-map-contract.mjs');}

test('public GIS catalog contains exactly seven explicitly approved Parks Canada locations',async()=>{
  const {verifyMapCatalog,APPROVED_POINTS}=await contract();
  assert.equal(verifyMapCatalog(points),points);
  assert.equal(points.points.length,7);
  assert.equal(Object.keys(APPROVED_POINTS).length,7);
  assert.equal(new Set(points.points.map(x=>x.officialObjectId)).size,7);
  assert.equal(points.points.find(x=>x.id==='day-use-parking').officialObjectId,1005);
  assert.equal(points.points.find(x=>x.id==='horseshoe-beach').officialObjectId,973);
  assert.equal(points.points.find(x=>x.id==='southern-headland-chair').officialObjectId,985);
  assert.ok(points.provenance.layer.includes('Interest_Point_Interet_APCA_OpenOuvert/FeatureServer/0'));
  assert.ok(points.provenance.licence.includes('open-government-licence'));
});
test('unknown or hidden GIS points cannot enter via a future source refresh',async()=>{
  const {verifyMapCatalog}=await contract();
  const corrupted=structuredClone(points);
  corrupted.points[0].officialObjectId=999999;
  assert.throws(()=>verifyMapCatalog(corrupted),/Unapproved/);
  const outOfBounds=structuredClone(points);
  outOfBounds.points[0].lat=47.5;
  assert.throws(()=>verifyMapCatalog(outOfBounds),/Unapproved/);
  const appended=structuredClone(points);
  appended.points.push({...appended.points[0],id:'hidden-cultural-site',officialObjectId:4000});
  assert.throws(()=>verifyMapCatalog(appended),/Invalid or incomplete/);
  const line=structuredClone(points);
  line.safety.noRoutes=false;
  assert.throws(()=>verifyMapCatalog(line),/Invalid or incomplete/);
});
test('the closed White River bridge has no public map waypoint',async()=>{
  const {verifyMapCatalog,relatedPlace}=await contract();
  const catalog=verifyMapCatalog(points);
  assert.equal(catalog.trailFocus['white-river-bridge'],null);
  assert.equal(relatedPlace(catalog,'white-river-bridge'),null);
  assert.equal(relatedPlace(catalog,'boardwalk-beach').id,'horseshoe-beach');
  assert.equal(relatedPlace(catalog,'beach').id,'middle-beach');
  assert.equal(relatedPlace(catalog,'southern-headland').id,'southern-headland-chair');
  assert.equal(relatedPlace(catalog,'bimose-kinoomagewnan').id,'day-use-parking');
});
test('location links are view-only and never generate false drive or trail directions',async()=>{
  const {mapLink}=await contract();
  const link=mapLink(points.points[0]);
  assert.match(link,/\/maps\/search\/\?api=1&query=/);
  assert.doesNotMatch(link,/travelmode|\/maps\/dir\/|origin=/);
  assert.equal(points.safety.noDrivingDirectionsFromMappedPins,true);
  assert.equal(points.safety.noTrailheadWaypoints,true);
  assert.equal(points.safety.noRoutes,true);
});
test('official map image, seven static GIS links and visit instructions are visible without scripts',()=>{
  assert.match(html,/id="pk-access-map"/);
  assert.match(html,/id="pk-map-official-panel"/);
  assert.match(html,/Carte-map-HCCAT\.jpg/);
  assert.equal((html.match(/class="pk-map-place" data-map-place=/g)||[]).length,7);
  assert.equal((html.match(/data-map-focus="/g)||[]).length,7);
  assert.equal((html.match(/www\.google\.com\/maps\/search\/\?api=1&amp;query=/g)||[]).length,7);
  assert.ok(html.includes('Parks Canada public GIS'));
  assert.ok(html.includes('Missing links from the Visitor Centre'));
  assert.ok(html.includes('/assets/pukaskwa-map.js?v=4'));
  assert.ok(html.includes('/assets/pukaskwa-map.css?v=4'));
  assert.equal((html.match(/<link rel="canonical"/g)||[]).length,1);
  assert.equal((html.match(/google-adsense-account/g)||[]).length,1);
});
test('map enhancement is linked to preference changes and waits for actual tiles',()=>{
  assert.match(explorerCode,/new CustomEvent\('pukaskwa:choice'/);
  assert.match(mapCode,/addEventListener\('pukaskwa:choice'/);
  assert.match(mapCode,/tileload/);
  assert.match(mapCode,/tileerror/);
  assert.match(mapCode,/dataset\.pkMapReady='true'/);
  assert.match(mapCode,/dataset\.pkMapReady='fallback'/);
  assert.match(mapCode,/\/api\/carto-basemap-config/);
  assert.match(mapCode,/tile\.openstreetmap\.org/);
  assert.match(mapCode,/verifyMapCatalog\(await response\.json\(\)\)/);
  assert.ok(!mapCode.includes('localStorage')&&!mapCode.includes('geolocation'));
  assert.ok(!mapCode.includes('L.polyline('));
  assert.match(mapCode,/L\.geoJSON\(communityLines/);
  assert.match(mapCode,/verifyCommunityCenterlines/);
  assert.match(mapCode,/switchDisplay\('official'\)/);
  assert.match(mapCss,/@media\(max-width:650px\)/);
});
