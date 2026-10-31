const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const source=JSON.parse(fs.readFileSync('public/pukaskwa-national-park/trail-centerlines.geojson','utf8'));
const html=fs.readFileSync('public/pukaskwa-national-park/index.html','utf8');
const js=fs.readFileSync('public/assets/pukaskwa-map.js','utf8');
const css=fs.readFileSync('public/assets/pukaskwa-map.css','utf8');
const mod=()=>import('../public/assets/pukaskwa-trail-geometry.mjs');

test('14 named, georeferenced OpenStreetMap way segments across five approved Pukaskwa day trails',async()=>{
 const {verifyCommunityCenterlines,APPROVED_WAYS,groupForTrail,OFFICIAL_OUTING_KM}=await mod();
 assert.equal(verifyCommunityCenterlines(source),source);
 assert.equal(source.features.length,14);
 assert.equal(source.features.reduce((s,f)=>s+f.geometry.coordinates.length,0),290);
 assert.deepEqual(Object.keys(APPROVED_WAYS).sort(),[
  'beach','bimose-kinoomagewnan','boardwalk-beach','manito-miikana','southern-headland'
 ]);
 for(const [id,ids] of Object.entries(APPROVED_WAYS)){
  const features=groupForTrail(source,id);
  assert.equal(features.length,ids.length,id);
  assert.equal(source.trailSummary.find(x=>x.id===id).officialEntireOutingKm,OFFICIAL_OUTING_KM[id]);
 }
 assert.equal(source.features.some(f=>/coastal|suspension|bridge/i.test(f.properties.name)),false);
});
test('source attribution, license, dates, raw OSM way IDs and official trail distance remain independent',async()=>{
 const {verifyCommunityCenterlines}=await mod();
 verifyCommunityCenterlines(source);
 assert.equal(source.license,'Open Database License (ODbL) 1.0');
 assert.equal(source.licenseUrl,'https://opendatacommons.org/licenses/odbl/1-0/');
 assert.equal(source.attribution,'© OpenStreetMap contributors');
 assert.ok(source.features.every(f=>/^https:\/\/www.openstreetmap.org\/way\/\d+$/.test(f.properties.sourceUrl)));
 assert.ok(source.features.every(f=>Date.parse(f.properties.osmTimestamp)<Date.parse('2026-11-01T00:00:00Z')));
 const southern=source.trailSummary.find(x=>x.id==='southern-headland');
 assert.equal(southern.mappedCenterlineKm,1.032);
 assert.equal(southern.officialEntireOutingKm,2.2);
 assert.match(southern.coverage,/missing/);
});
test('the site never infers completed routes from community segments and keeps all source links',()=>{
 assert.match(html,/community-mapped walking corridors/);
 assert.match(html,/not certified GPS tracks or complete walking directions/);
 assert.match(html,/OpenStreetMap contributors/);
 assert.match(html,/opendatacommons\.org\/licenses\/odbl\/1-0/);
 assert.match(html,/pk-show-trail-lines/);
 assert.match(html,/id="pk-map-focus-trail"/);
 assert.match(html,/Missing links from the Visitor Centre/);
 assert.match(html,/Carte-map-HCCAT\.jpg/);
 assert.match(html,/White River/);
 assert.match(js,/verifyCommunityCenterlines\(JSON\.parse\(raw\)\)/);
 assert.match(js,/L\.geoJSON\(communityLines/);
 assert.match(js,/communityLayer\.addTo\(map\)/);
 assert.match(js,/addEventListener\('pukaskwa:choice'/);
 assert.ok(!js.includes('geolocation')&&!js.includes('localStorage'));
 assert.doesNotMatch(js,/GPXDownload|routeTo\(/);
 assert.match(css, /pk-community-trail/);
});
test('rejected trail changes include invented shortcuts, unnamed routes, protected paths and corrupted data',async()=>{
 const {verifyCommunityCenterlines}=await mod();
 const copy=()=>structuredClone(source);
 let x=copy(); x.features.push(structuredClone(x.features[0]));
 assert.throws(()=>verifyCommunityCenterlines(x),/invalid/i);
 x=copy();x.features[0].properties.osmWayId=999999999;
 assert.throws(()=>verifyCommunityCenterlines(x),/Unapproved/);
 x=copy();x.features[0].properties.trailId='white-river-bridge';
 assert.throws(()=>verifyCommunityCenterlines(x),/Unapproved/);
 x=copy();x.features[0].geometry.coordinates[0]=[-86.34,48.60];
 assert.throws(()=>verifyCommunityCenterlines(x),/Out-of-envelope/);
 x=copy();x.features[0].geometry.coordinates[1]=[-86.288,48.596];
 assert.throws(()=>verifyCommunityCenterlines(x),/Potential synthetic routing gap|Out-of-envelope/);
 x=copy();x.licenseUrl='https://example.org/relicensed';
 assert.throws(()=>verifyCommunityCenterlines(x),/invalid/);
});
test('correlated official public landmarks fall close to the named walking line, without implying surveyed route accuracy',async()=>{
 const {verifyCommunityCenterlines,closestPointMetres,groupForTrail}=await mod();
 verifyCommunityCenterlines(source);
 const middleBeach=closestPointMetres([-86.300158,48.591302],groupForTrail(source,'beach'));
 const horseshoe=closestPointMetres([-86.296686,48.589730],groupForTrail(source,'boardwalk-beach'));
 const redChairs=closestPointMetres([-86.293675,48.589424],groupForTrail(source,'southern-headland'));
 assert.ok(middleBeach<10,middleBeach+'m from official GIS Middle Beach');
 assert.ok(horseshoe<35,horseshoe+'m from official GIS Horseshoe Beach');
 assert.ok(redChairs<40,redChairs+'m from official GIS red chairs');
});
