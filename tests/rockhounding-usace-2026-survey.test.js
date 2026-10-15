'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const source=require('../data/rockhounding/grand-marais-usace-2026-survey-source.json');
const {validateUSACE2026Survey,usace2026SurveyGate}=
  require('../lib/rockhounding/usace-2026-survey.cjs');
test('USACE July 2026 plot and survey archive are linked with their distinct survey datum and projection',()=>{
 assert.equal(validateUSACE2026Survey(),true);
 const g=usace2026SurveyGate();
 assert.equal(g.surveyEndUTC,'2026-07-30');
 assert.equal(g.sourceSurveyId,'GR_01_MAS_20260730_CS');
 assert.equal(g.depthDatum,'IGLD85');
 assert.equal(g.sourceDepthUnits,'feet');
 assert.equal(g.sonarMethod,'multibeam');
 assert.ok(g.surveyPDF.endsWith('/CELRE_DIS_GR_01_MAS_20260730_CS.PDF'));
 assert.ok(g.surveyZIP.endsWith('/CELRE_DIS_GR_01_MAS_20260730_CS.ZIP'));
});
test('survey plot is real evidence but not a calibrated XYZ, surf, agate or navigation product',()=>{
 const g=usace2026SurveyGate();
 assert.equal(g.xyzParsedAndValidated,false);
 assert.equal(g.currentNavigationDepthCertified,false);
 assert.equal(g.waveModelCalibrated,false);
 assert.equal(g.harborObservedWaveHeightM,null);
 assert.equal(g.siteVisitSignal,null);
 assert.equal(g.freshAgateClaimAllowed,false);
 assert.equal(g.safeConditionsClaimAllowed,false);
 assert.equal(g.collectionPermissionVerified,false);
});
test('wrong datum, missing 2026 sonar, claimed wave safety and invented depth conversion all fail closed',()=>{
 const changes=[
   s=>s.surveyPlotNotes.elevationAndSoundingDatum='MLLW',
   s=>s.surveyPlotNotes.depthUnits='meters',
   s=>s.surveyPlotNotes.sonarInstrument='UNVERIFIED',
   s=>s.source.sourceArchiveURL='http://arbitrary-site/2026.zip',
   s=>s.source.sourcesVerified.sourceArchiveContentsIndependentlyDownloadedAndChecked=true,
   s=>s.interpretation.rawXYZBathymetryParsedAndQCed=true,
   s=>s.interpretation.bathymetryDatumConversionToEarlierNOAAENCPerformed=true,
   s=>s.interpretation.measuredHarborWaveHeightM=0.1,
   s=>s.interpretation.canPublishSafeShoreConditions=true,
   s=>s.interpretation.canPublishRockhoundingVisitWindow=true
 ];
 for(const modify of changes){const s=structuredClone(source);modify(s);assert.throws(()=>validateUSACE2026Survey(s));}
});
