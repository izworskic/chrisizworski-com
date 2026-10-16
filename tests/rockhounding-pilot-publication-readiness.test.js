'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const truth=require('../data/rockhounding/grand-marais-two-site-public-source-truth-2026.json');
const access=require('../data/rockhounding/pilot-access-reviews.json');
const pilot=require('../data/rockhounding/grand-marais-wave-pilot.json');
const {validateTruth,siteReadiness,overallReadiness,STATUSES}=
 require('../lib/rockhounding/pilot-publication-readiness.cjs');
test('the actual township Agate and harbor pages are public destinations but not collection permits',()=>{
 assert.equal(validateTruth(),true);
 const agate=siteReadiness({siteId:'grand-marais-agate'});
 const bay=siteReadiness({siteId:'grand-marais-harbor'});
 for(const s of [agate,bay]){
  assert.equal(s.publicationStage,'PUBLIC_BEACH_DOCUMENTED_POST_STORM_ROCKHOUNDING_VERDICT_BLOCKED');
  assert.equal(s.documentedContextItems,2);
  assert.ok(s.unresolvedEvidenceGates.includes('COLLECTION_PERMISSION'));
  assert.ok(s.unresolvedEvidenceGates.includes('EXACT_ENTRY'));
  assert.ok(s.unresolvedEvidenceGates.includes('CURRENT_HAZARDS'));
  assert.equal(s.documentation.find(x=>x.id==='PUBLIC_DESTINATION').proven,true);
  assert.equal(s.documentation.find(x=>x.id==='COLLECTION_PERMISSION').status,
   STATUSES.unknownLaw);
  assert.equal(s.documentation.find(x=>x.id==='EXACT_ENTRY').status,
   STATUSES.notRoutable);
  assert.equal(s.canApproveMunicipalRockRemoval,false);
  assert.equal(s.canRecommendRockhoundingNow,false);
  assert.equal(s.canProvideExactParkingNavigation,false);
  assert.equal(s.canClaimSafeConditions,false);
  assert.equal(s.currentNwsQueryRun,false);
  assert.ok(s.generalApproachSource.startsWith('https://grandmaraismichigan.com/'));
 }
 assert.match(agate.generalOrientation,/north/);
 assert.match(bay.generalOrientation,/Bayshore Market/);
});
test('2026 real offshore Grand Marais Spotter numbers cannot become Agate beach surf or sheltered Bayshore waves',()=>{
 const agate=siteReadiness({siteId:'grand-marais-agate'});
 const bay=siteReadiness({siteId:'grand-marais-harbor'});
 assert.equal(agate.historicOffshoreMeasurements,5243);
 assert.equal(agate.siteMeasuredSurfRecords,0);
 assert.equal(agate.documentation.find(x=>x.id==='LOCAL_SHORE_WAVES').status,
  STATUSES.observedOnly);
 assert.equal(bay.historicOffshoreMeasurements,0);
 assert.equal(bay.siteMeasuredSurfRecords,0);
 assert.equal(bay.documentation.find(x=>x.id==='LOCAL_SHORE_WAVES').status,
  STATUSES.noHarborTransfer);
 assert.match(bay.documentation.find(x=>x.id==='ACTUAL_STONE_OUTCOME').detail,
   /No independently validated Agate-bearing/);
 assert.equal(bay.independentStoneOutcomeCount,0);
});
test('verified general 25-pound state-owned rule cannot authorize either municipal site',()=>{
 const summary=overallReadiness();
 assert.equal(summary.townshipsPublicBeachSitesDocumented,2);
 assert.equal(summary.originalEGLEStateLandRule.annualPounds,25);
 assert.equal(summary.originalEGLEStateLandRule.thisNumberDoesNotAuthorizeTownshipCollection,true);
 assert.equal(summary.sitesWithPublishedSpecificRockCollectingPermission,0);
 assert.equal(summary.sitesWithSurveyedExactParkingEntrance,0);
 assert.equal(summary.sitesWithValidatedLocalBreakingWaveMeasurements,0);
 assert.equal(summary.sitesWithVerifiedStormToNewStoneOutcome,0);
 assert.equal(summary.canPublishCurrentBeachOpportunity,false);
 assert.equal(summary.canPublishStoneFindProbability,false);
 assert.equal(summary.canPublishSiteSafeVerdict,false);
});
test('research priority targets July 21 photo gap, not simply the largest October wave event',()=>{
 const all=overallReadiness();
 assert.equal(all.sourceBackedRegionalObservedWaveRecords,5243);
 assert.equal(all.samplingQualifiedOriginalOffshoreEpisodeGroups,8);
 assert.equal(all.tentativeSameSitePostStormSceneCandidates,1);
 assert.equal(all.firstHighValueEvidenceGap.siteId,'grand-marais-agate');
 assert.equal(all.firstHighValueEvidenceGap.eventPeakAtUTC,'2026-07-21T23:46:01Z');
 assert.equal(all.firstHighValueEvidenceGap.observedOffshoreSignificantHeightM,1.62);
 assert.equal(all.firstHighValueEvidenceGap.missing,
   'ORIGINAL_NEAR_EVENT_PRE_STORM_PHOTO_WITH_MATCHED_CAMERA');
 assert.match(all.firstHighValueEvidenceGap.rationale,/NOT highest stone probability/);
 assert.equal(all.sites[0].priorityResearchWork[0].id,'SAME_VIEW_BEACH_PHOTO_PAIR');
 assert.equal(all.sites[1].priorityResearchWork[0].id,'HARBOR_WAVE_OBSERVATION');
});
test('mutation of township permission, parking or harbor conditions fails before publishing any site assessment',()=>{
 const edits=[
  t=>{t.sites[0].municipalRockCollectingRuleVerified=true},
  t=>{t.sites[0].collectingPermittedAtExactShoreSegment=true},
  t=>{t.sites[0].exactParkingEntranceSurveyed=true},
  t=>{t.sites[0].current2026BoardwalkOrRampConditionVerified=true},
  t=>{t.sites[1].independent2026OriginalWaveRecords=5243},
  t=>{t.sites[1].offshoreGLOSDataCannotBeTransmittedIntoHarborWithoutValidation=false},
  t=>{t.sites[1].confirmedAgateBearingDeposit=true},
  t=>{t.sourcePolicy.sourceAuthorityCannotAuthorizeTownshipCollecting=false},
  t=>{t.sourcePolicy.stateOwnedAnnualPersonalCollectionLimitPounds=50},
  t=>{t.publicationPolicy.allowPersonalCollectionAdviceForEitherSite=true},
  t=>{t.sites[0].sameCameraBeforeAfterStormPairs=2}
 ];
 for(const f of edits){
  const copy=structuredClone(truth);f(copy);
  assert.throws(()=>validateTruth(copy));
 }
});
test('incompatible prior township and pilot records block publication rather than getting loosely merged',()=>{
 const incorrect=structuredClone(access);
 incorrect.pilotReviews.find(x=>x.id==='grand-marais-agate').rockCollecting='COLLECTING_ALLOWED';
 assert.throws(()=>validateTruth(truth,{sourceAccess:incorrect,pilot}),/Public township beach/);
 const guessed=structuredClone(pilot);
 guessed.pilotSites[0].shore.outwardBearingDeg=336.74;
 assert.throws(()=>validateTruth(truth,{sourceAccess:access,pilot:guessed}),/pilot/);
 assert.throws(()=>siteReadiness({siteId:'stan-township-toivola'}),/Unknown Grand Marais/);
});
