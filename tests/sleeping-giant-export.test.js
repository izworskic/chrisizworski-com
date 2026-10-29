'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

test('Geometry QA export is generated as OFFLINE review-only HTML and source-preserving GeoJSON',()=>{
 const dest=fs.mkdtempSync(path.join(os.tmpdir(),'giant-qa-'));
 try{
  const result=execFileSync(process.execPath,['scripts/export-sleeping-giant-geometry.mjs',dest],
    {cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:30000});
  assert.match(result,/Navigation not approved/);
  const geo=JSON.parse(fs.readFileSync(path.join(dest,'research-trail-sections.geojson'),'utf8'));
  const audit=JSON.parse(fs.readFileSync(path.join(dest,'geometry-reconciliation.json'),'utf8'));
  const html=fs.readFileSync(path.join(dest,'geometry-review.html'),'utf8');
  assert.equal(geo.type,'FeatureCollection');
  assert.equal(geo.features.length,11);
  assert.equal(geo.metadata.publicDirectionsEligible,false);
  assert.equal(geo.metadata.onlinePublishingApproved,false);
  assert.equal(audit.navigatorEligible,false);
  assert.equal(audit.verifiedRoadToTrailLinks,0);
  assert.ok(geo.features.every(f=>f.properties.researchOnly===true
   && f.properties.turnByTurnEligible===false&&f.properties.parkingConnectorMapped===false));
  assert.ok(geo.features.every(f=>f.geometry.type==='LineString' && f.geometry.coordinates.length>=2));
  assert.match(html,/Internal Geometry Review/);
  assert.match(html,/Not for directions/);
  assert.match(html,/Source geometry to review/i);
  assert.match(html,/OpenStreetMap contributors/);
  assert.match(html,/source-data/);
  assert.match(html,/id="map"/);
  assert.match(html,/id="route"/);
  assert.match(html,/noindex,nofollow,noarchive/);
  assert.doesNotMatch(html,/href="https:\/\/www.google.com\/maps\/dir/);
 } finally {fs.rmSync(dest,{recursive:true,force:true});}
});
