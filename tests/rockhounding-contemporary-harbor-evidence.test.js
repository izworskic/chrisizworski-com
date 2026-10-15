'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const register=require('../data/rockhounding/grand-marais-contemporary-source-register-2026-10-15.json');
const {validateSourceRegister,contemporaryHarborGate}=
 require('../lib/rockhounding/contemporary-harbor-evidence.cjs');
function job(){
 return {objectId:34,catalogName:'Grand Marais Harbor Survey',
 surveyType:'CONDITION',surveyStartUTC:'2023-06-01',surveyEndUTC:'2023-06-02',
 uploadedUTC:'2023-07-22',district:'LRE',
 hasSourceDownloadReference:true,
 fullBathymetricSurveyDownloadedAndValidated:false,
 validatesPresentHarborWaveHeight:false};
}
function catalog(jobs=[job()]){
 return {schemaVersion:'rockhounding-ehydro-survey-catalog-audit-v1',
 source:{catalogLayer:register.hydrographicSurvey.eHydroCatalog},
 matchingSurveyJobs:jobs,
 catalogFinding:jobs.length?'MATCHING_SURVEY_JOB_METADATA':'NO_NAMED_MATCH_IN_BOUNDED_CATALOG_QUERY',
 absenceOfSurveyProven:false,currentBathymetryIndependentlyValidated:false,
 measuredHarborWaveObservationsAvailable:false,harborWaveTransmissionCalibrated:false,
 canPublishHarborSurf:false,canClaimNewStones:false,canPublishRockhoundingWindow:false};
}
test('missing eHydro catalog stays unknown rather than becoming a current observation',()=>{
 assert.equal(validateSourceRegister(),true);
 const g=contemporaryHarborGate();
 assert.equal(g.usaceCatalogFinding,'CATALOG_NOT_YET_CHECKED_IN_PRODUCTION');
 assert.equal(g.matchingSurveyJobs,null);
 assert.equal(g.measuredHarborWaveHeightM,null);
 assert.equal(g.predictedHarborWaveHeightM,null);
 assert.equal(g.canPublishVisitWindow,false);
});
test('even matching dated USACE survey metadata does not allow surf, rocks or navigation conclusions',()=>{
 const out=contemporaryHarborGate({catalog:catalog()});
 assert.equal(out.usaceCatalogFinding,'MATCHING_SURVEY_JOB_METADATA');
 assert.equal(out.mostRecentSurveyEndUTC,'2023-06-02');
 assert.equal(out.isSurveyDateProofOfCurrentDepth,false);
 assert.equal(out.harborTransmissionFactor,null);
 assert.equal(out.canClaimFreshAgates,false);
 assert.equal(out.canClaimCollectingPermission,false);
 assert.equal(out.canClaimSafeConditions,false);
});
test('no name match in bounded eHydro results is not proof of missing surveys everywhere',()=>{
 const out=contemporaryHarborGate({catalog:catalog([])});
 assert.equal(out.usaceCatalogFinding,'NO_NAMED_MATCH_IN_BOUNDED_CATALOG_QUERY');
 assert.equal(out.mostRecentSurveyEndUTC,null);
});
test('GRMM4 wind and seasonal 45172 offshore wave observations never become a harbor sensor',()=>{
 const g=contemporaryHarborGate();
 assert.equal(g.ndbcGRMM4Role,'LOCAL_WIND_CONTEXT_ONLY');
 assert.equal(g.ndbc45172Role,'OFFSHORE_SEASONAL_WAVE_CONTEXT');
 assert.equal(register.independentLocalHarborWaveObservationsVerified,false);
});
test('reject injected proof, bad date, non-Grand-Marais record and invented harbor-wave data',()=>{
 const tamper=[
  o=>{o.absenceOfSurveyProven=true;},
  o=>{o.canPublishHarborSurf=true;},
  o=>{o.measuredHarborWaveObservationsAvailable=true;},
  o=>{o.matchingSurveyJobs[0].fullBathymetricSurveyDownloadedAndValidated=true;},
  o=>{o.matchingSurveyJobs[0].surveyEndUTC='2030-01-01';},
  o=>{o.matchingSurveyJobs[0].catalogName='Other Harbor';},
 ];
 for(const mutate of tamper){
  const fake=structuredClone(catalog());mutate(fake);
  assert.throws(()=>contemporaryHarborGate({catalog:fake}));
 }
 const changed=structuredClone(register);
 changed.observationStations[0].confirmedHarborWaveSensor=true;
 assert.throws(()=>validateSourceRegister(changed));
 const unsafe=structuredClone(register);
 unsafe.publicStatements.canClaimSafeConditions=true;
 assert.throws(()=>validateSourceRegister(unsafe));
});
