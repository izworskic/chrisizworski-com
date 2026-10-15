'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const source=require('../data/rockhounding/grand-marais-usace-2026-survey-evidence.json');
const {validateOriginalSurvey,surveyedCoverageGate}=
 require('../lib/rockhounding/usace-original-survey.cjs');
const {harborStudyGate}=require('../lib/rockhounding/harbor-bathymetry.cjs');
test('real 2026 USACE package SHA, survey date, vertical datum and 17,804 XYZ rows are pinned',()=>{
 assert.equal(validateOriginalSurvey(),true);
 assert.equal(source.archiveEvidence.numericXYZRecords,17804);
 assert.equal(source.archiveEvidence.sourceVerticalDatum,'IGLD 85');
 assert.equal(source.archiveEvidence.rawZUnits,'US Survey Foot');
 assert.deepEqual(source.archiveEvidence.rawCoordinateRanges.zElevation,[-29.96,-7.48]);
 assert.equal(source.archiveEvidence.actualWaterLevelMatched,false);
});
test('original 2026 USACE polygon excludes BOTH approximate rockhounding beach points',()=>{
 for(const site of ['grand-marais-harbor','grand-marais-agate']){
  const gate=surveyedCoverageGate(site);
  assert.equal(gate.surveyFootprintContainsLocation,false);
  assert.equal(gate.status,'SITE_OUTSIDE_2026_ENTRANCE_SURVEY_EXTENT');
  assert.equal(gate.canPublishSurf,false);
  assert.equal(gate.canPublishRockhoundingWindow,false);
  assert.equal(gate.canClaimCurrentDepth,false);
 }
 const entry=surveyedCoverageGate('entrance-channel-approx');
 assert.equal(entry.surveyFootprintContainsLocation,true);
 assert.equal(entry.canClaimCurrentDepth,false);
});
test('actual survey at entrance is not a measured harbor wave, a surface water level or a stone result',()=>{
 const harbor=harborStudyGate();
 assert.equal(harbor.latestUSACE2026OriginalSurveyArchivedAndChecked,true);
 assert.equal(harbor.latestUSACE2026StudySiteCovered,false);
 assert.equal(harbor.latestUSACE2026VerticalDatum,'IGLD 85');
 assert.equal(harbor.waveTransmissionFactor,null);
 assert.equal(harbor.predictedHarborWaveHeightM,null);
 assert.equal(harbor.currentUSACE2026DepthVerified,false);
 assert.equal(harbor.canPublishVisitWindow,false);
 assert.equal(harbor.canClaimNewStones,false);
});
test('survey polygon inclusion, vertical units, hash, row count and safety gates cannot be rewritten',()=>{
 for(const edit of [
  o=>{o.archiveEvidence.sourceVerticalDatum='NAVD88';},
  o=>{o.archiveEvidence.rawZUnits='meters';},
  o=>{o.source.originalArchiveSHA256='00000';},
  o=>{o.archiveEvidence.numericXYZRecords=0;},
  o=>{o.surveyCoverage.verifiedPointInSurveyPolygon['grand-marais-harbor']=true;},
  o=>{o.constraints.currentNavigableDepthValidated=true;},
  o=>{o.constraints.canPredictSafeSwimming=true;},
  o=>{o.constraints.canPublishRockhoundingVisitWindow=true;}
 ]){
  const corrupt=structuredClone(source);edit(corrupt);
  assert.throws(()=>validateOriginalSurvey(corrupt),/USACE|survey/i);
 }
});
test('unaudited beach ID cannot inherit 2026 survey or numeric harbor safety clearance',()=>{
 const gate=surveyedCoverageGate('unknown-beach');
 assert.equal(gate.status,'NOT_AN_AUDITED_SURVEY_POINT');
 assert.equal(gate.surveyFootprintContainsLocation,false);
 assert.equal(gate.canPublishSurf,false);
});
