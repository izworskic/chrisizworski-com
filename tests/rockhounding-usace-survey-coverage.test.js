'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const survey=require('../data/rockhounding/grand-marais-usace-survey-coverage-guard-2026-10-15.json');
const beaches=require('../data/rockhounding/grand-marais-research-footprints.geojson');
const {validateSource,boxesDisjoint,polygonBox,siteSurveyCoverage}=
  require('../lib/rockhounding/usace-survey-coverage.cjs');
test('one official 2026 entrance survey cannot cover either beach study polygon',()=>{
 assert.equal(validateSource(),true);
 for(const id of ['grand-marais-agate','grand-marais-harbor']){
  const r=siteSurveyCoverage(id);
  assert.equal(r.status,'OUTSIDE_2026_USACE_SURVEY_FOOTPRINT_ENVELOPE');
  assert.equal(r.isInside2026SurveyCoverage,false);
  assert.equal(r.canUseSurveyForSiteDepth,false);
  assert.equal(r.canInferLocalHarborWaves,false);
  assert.equal(r.canPredictFreshStones,false);
  assert.equal(r.canClaimSafeAccess,false);
 }
});
test('original source research envelope is distant from both OSM beach envelopes',()=>{
 const bounds=survey.survey.originalGeometry.boundsWgs84;
 assert.deepEqual(bounds,[-85.971734,46.675899,-85.969027,46.685841]);
 for(const feature of beaches.features){
   const b=polygonBox(feature);
   assert.equal(boxesDisjoint(bounds,b),true);
   assert.ok(b[2]<bounds[0],'This particular study survey is east of these beach polygons');
 }
});
test('bbox intersection can never be promoted to depth coverage or a visit window',()=>{
 assert.equal(boxesDisjoint([0,0,2,2],[1,1,3,3]),false);
 const bogus=structuredClone(beaches);
 for(const point of bogus.features[0].geometry.coordinates[0]){
  point[0]=point[0]+.02;
 }
 const g=siteSurveyCoverage('grand-marais-agate',{sitePolygons:bogus});
 assert.equal(g.status,'ENVELOPES_INTERSECT_COVERAGE_NOT_VERIFIED');
 assert.equal(g.isInside2026SurveyCoverage,null);
 assert.equal(g.canUseSurveyForSiteDepth,false);
 assert.equal(g.canPublishVisitWindow,false);
});
test('unknown site is not declared surveyed by this harbor-specific survey',()=>{
 const r=siteSurveyCoverage('another-michigan-beach');
 assert.equal(r.status,'UNKNOWN_SITE');
 assert.equal(r.canUseSurveyForSiteDepth,false);
});
test('official footprint evidence, data-readiness, and no safety claims cannot drift',()=>{
 const edits=[
   s=>{s.survey.objectId=5},
   s=>{s.survey.originalGeometry.boundsWgs84[0]=-85.99},
   s=>{s.survey.originalGeometry.vertexCount=4},
   s=>{s.survey.sampledOriginalXYZ.xyzFullSurveyRowsValidated=true},
   s=>{s.survey.sampledOriginalXYZ.xyzGeoreferencingIndependentlyChecked=true},
   s=>{s.meaning.canClaimSiteDepthFromSurvey=true},
   s=>{s.meaning.canPublishVisitWindow=true},
   s=>{s.siteInputs.normalOrAccessSurveyed=true}
 ];
 for(const edit of edits){
  const fake=structuredClone(survey);
  edit(fake);
  assert.throws(()=>validateSource(fake));
 }
});
test('unverified OSM beach shoreline cannot become surveyed permission/access line',()=>{
 const fake=structuredClone(beaches);
 fake.features[1].properties.shorelineWaterwardNormalDeg=90;
 assert.throws(()=>siteSurveyCoverage('grand-marais-harbor',{sitePolygons:fake}));
});
