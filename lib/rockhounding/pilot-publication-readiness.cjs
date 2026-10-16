'use strict';
// Research launch-readiness gate for two DIFFERENT Grand Marais waterfronts.
// Verified public beach existence does not imply that rock collection, a
// parking gate, measured breaking waves, safe access or new agates are proven.
const truth=require('../../data/rockhounding/grand-marais-two-site-public-source-truth-2026.json');
const access=require('../../data/rockhounding/pilot-access-reviews.json');
const siteConfig=require('../../data/rockhounding/grand-marais-wave-pilot.json');
const storms=require('../../public/rockhounding-lab/storm-photo-review-2026.json');
const season=require('../../public/rockhounding-lab/glos-season-2026-research.json');
const expectedIds=['grand-marais-agate','grand-marais-harbor'];
const ROOT='https://burttownshipacmi.gov/';
const EGLE='https://www.michigan.gov/egle/public/learn/geology/rockhounding';
const CHAMBER='https://grandmaraismichigan.com/visit-us/attractions/beaches/';
const STATUSES=Object.freeze({
 documented:'PUBLISHED_OFFICIAL_BEACH_EXISTENCE',
 notRoutable:'EXACT_ENTRY_OR_PARKING_NOT_SURVEYED',
 unknownLaw:'MUNICIPAL_SITE_COLLECTION_RULE_UNVERIFIED',
 observedOnly:'REGIONAL_OFFSHORE_SPOTTER_OBSERVATIONS_NOT_BREAKING_SURF',
 noHarborTransfer:'NO_VALIDATED_LOCAL_HARBOR_WAVE_TRANSFORMATION',
 noPair:'NO_INDEPENDENT_SAME_CAMERA_STORM_PAIR',
 unknownSafety:'CURRENT_SHORE_HAZARD_AND_ACCESS_NOT_CHECKED'
});
const DENIED=Object.freeze({
 canRecommendRockhoundingNow:false,
 canPredictNewAgates:false,
 canClaimSafeConditions:false,
 canApproveMunicipalRockRemoval:false,
 canProvideExactParkingNavigation:false
});
function validateTruth(reg=truth,{sourceAccess=access,pilot=siteConfig,waves=season,photo=storms}={}){
 if(reg?.schemaVersion!=='rockhounding-grand-marais-two-site-source-truth-v1'||
   reg.reviewedUTC!=='2026-10-16'||reg.sites?.length!==2||
   JSON.stringify(reg.sites.map(s=>s.id))!==JSON.stringify(expectedIds)||
   reg.sourcePolicy?.egleUrl!==EGLE||
   reg.sourcePolicy?.stateOwnedAnnualPersonalCollectionLimitPounds!==25||
   reg.sourcePolicy?.limitScope!=='STATE_OWNED_AND_APPLICABLE_PUBLIC_TRUST_LANDS_PER_EGLE_NOT_A_TOWNSHIP_PERMIT'||
   reg.sourcePolicy?.sourceAuthorityCannotAuthorizeTownshipCollecting!==true||
   reg.sourcePolicy?.localRestrictionsStillUnverified!==true||
   Object.values(reg.publicationPolicy||{}).filter(v=>v===true).length!==1||
   reg.publicationPolicy?.publicDestinationDirectoryCanStateVerifiedBeachExistence!==true||
   Object.entries(reg.publicationPolicy).some(([k,v])=>k!=='publicDestinationDirectoryCanStateVerifiedBeachExistence'&&v!==false))
  throw Error('Official collecting law cannot become township rock removal permission');
 if(sourceAccess?.schemaVersion!=='M1-access-review-2026-10-14'||
   sourceAccess.policy?.generalRulesUrl!==EGLE||
   sourceAccess.policy?.annualMichiganPublicLandPounds!==25||
   pilot?.pilotSites?.length!==2||
   JSON.stringify(pilot.pilotSites.map(s=>s.id))!==JSON.stringify(expectedIds)||
   pilot.pilotSites.some(s=>s.shore.outwardBearingDeg!==null||
     s.shore.reviewStatus!=='UNVERIFIED_WATERLINE'||s.modelCell!==null)||
   waves?.schemaVersion!=='rockhounding-glos-season-2026-archived-storms-v1'||
   waves.actualObservedWaveRecords!==5243||
   waves.qualifyingMeasuredOffshoreEpisodes!==8||
   waves.canPublishRockhoundingWindow!==false||
   photo?.schemaVersion!=='rockhounding-grand-marais-storm-photo-triage-v1'||
   photo.eligibleIndependentMeasuredOffshoreEpisodes!==8||
   photo.originalWaveRows!==waves.actualObservedWaveRecords||
   photo.stormCandidateWindows?.length!==8||
   photo.matchedSameVantageBeforeAfterStormPairs!==0||
   photo.verifiedNewAgates!==0||
   photo.eventsWithDatedNamedSiteMedia!==1||
   photo.canPublishVisitWindow!==false)
  throw Error('Existing source-locked pilot, access or original 2026 wave/photo facts changed');
 for(let i=0;i<2;i++){
  const s=reg.sites[i],review=sourceAccess.pilotReviews.find(x=>x.id===s.id);
  const p=pilot.pilotSites[i];
  if(!review||!p||review.authority!=='Burt Township'||
     s.operator!=='Burt Township'||s.chamberSource!==CHAMBER||
     s.townshipSource!==review.facilityUrl||
     !s.townshipSource.startsWith(ROOT)||
     s.townshipPublicBeach!==true||
     s.exactParkingEntranceSurveyed!==false||
     s.parkFacilityCoordinatesAreNotEntrancePin!==true||
     s.municipalRockCollectingRuleVerified!==false||
     s.collectingPermittedAtExactShoreSegment!==null||
     s.adjacentPrivateOrNationalLakeshoreBoundaryVerified!==false||
     s.measuredActualBreakingSurfAtThisBeach!==false||
     s.sameCameraBeforeAfterStormPairs!==0||
     s.measuredNewlyExposedAgates!==0||
     !Array.isArray(s.actionableFutureProof)||s.actionableFutureProof.length<3||
     !Array.isArray(s.sourceHighlights)||s.sourceHighlights.length!==3||
     review.rockCollecting!=='TOWNSHIP_SITE_SPECIFIC_RULE_UNKNOWN')
   throw Error('Public township beach cannot be upgraded to exact parking, shore permission, or local waves');
 }
 const [agate,harbor]=reg.sites;
 if(agate.setting!=='OPEN_LAKE_SUPERIOR_BEACH'||
    agate.townshipMentionsBoardwalk!==true||
    agate.boardwalkPresentHistorically!==true||
    agate.current2026BoardwalkOrRampConditionVerified!==false||
    agate.original2026RegionalGLOSMeasurements!==true||
    agate.independent2026OriginalWaveRecords!==waves.actualObservedWaveRecords||
    agate.qualified2026OffshoreWaveEpisodeGroups!==waves.qualifyingMeasuredOffshoreEpisodes||
    agate.candidatePostStormMediaDateLinks!==photo.eventsWithDatedNamedSiteMedia||
    harbor.setting!=='SHELTERED_HARBOR_SWIMMING_BEACH'||
    harbor.townshipMentionsBathhouse!==true||
    harbor.townshipMentionsParking!==true||
    harbor.townshipMentionsPlayground!==true||
    harbor.offshoreGLOSDataCannotBeTransmittedIntoHarborWithoutValidation!==true||
    harbor.original2026RegionalGLOSMeasurements!==false||
    harbor.independent2026OriginalWaveRecords!==0||
    harbor.qualified2026OffshoreWaveEpisodeGroups!==0||
    harbor.confirmedAgateBearingDeposit!==false)
  throw Error('Agate offshore record or Bayshore harbor negative control was promoted to local rock forecast');
 return true;
}
function siteReadiness({siteId,reg=truth,inputs}={}){
 validateTruth(reg,inputs);
 const s=reg.sites.find(x=>x.id===siteId);
 if(!s)throw Error('Unknown Grand Marais pilot destination');
 const open=s.id==='grand-marais-agate';
 const evidence=[
  {id:'PUBLIC_DESTINATION',status:STATUSES.documented,proven:true,
   label:'Public beach / public park documented by the township',
   sourceUrl:s.townshipSource,
   detail:open?'Burt Township documents an Agate Beach boardwalk.':'Burt Township documents a downtown harbor swimming beach with parking, bathhouse and playground.'},
  {id:'GENERAL_APPROACH',status:'PUBLISHED_GENERAL_CHAMBER_DIRECTIONS',proven:true,
   label:'General orientation, not turn-by-turn navigation',
   sourceUrl:s.chamberSource,detail:s.publicApproachFromChamber},
  {id:'EXACT_ENTRY',status:STATUSES.notRoutable,proven:false,
   label:'Exact legal parking entrance and verified route',
   sourceUrl:s.townshipSource,
   detail:'Official pages document the destination, not a surveyed current entrance, route or all posted closures.'},
  {id:'COLLECTION_PERMISSION',status:STATUSES.unknownLaw,proven:false,
   label:'Collecting permission for this township beach segment',
   sourceUrl:reg.sourcePolicy.egleUrl,
   detail:'EGLE describes a 25 lb/person/year rule for applicable state land; this is NOT a permit for the township beach. Local and posted rules still apply.'},
  {id:'LOCAL_SHORE_WAVES',status:open?STATUSES.observedOnly:STATUSES.noHarborTransfer,
   proven:false,label:open?'Offshore wave history measured; breaking surf not measured':'Harbor wave conditions independently modeled or measured',
   sourceUrl:open?'https://seagull-erddap.glos.org/erddap/info/obs_140/index.html':s.townshipSource,
   detail:open?'5,243 recorded GLOS offshore wave readings across 2026, not an Agate Beach wave-height sensor.':
    'The exposed-coast Spotter cannot supply actual protected-harbor wave height or certify calm water.'},
  {id:'ACTUAL_STONE_OUTCOME',status:STATUSES.noPair,proven:false,
   label:'Verified before/after shoreline exposure outcome',
   sourceUrl:open?'https://github.com/izworskic/chrisizworski-com/blob/main/public/rockhounding-lab/storm-photo-review-2026.json':null,
   detail:open?'Eight sampled offshore episodes; one tentative dated post-scene, zero registered matching photographic pairs or new agates.':
     'No independently validated Agate-bearing substrate or measured harbor storm-to-rock exposure outcome.'},
  {id:'CURRENT_HAZARDS',status:STATUSES.unknownSafety,proven:false,
   label:'Contemporaneous NWS alerts and local shore hazard verification',
   sourceUrl:'https://api.weather.gov/alerts/active?zone=LSZ250',
   detail:'This is an historical research snapshot. Current alerts, breaking-wave hazards and access restrictions require a fresh check; no alert does not certify safe beach conditions.'}
 ];
 const blockers=evidence.filter(e=>!e.proven).map(e=>e.id);
 const nextEvidence=open?[
   {id:'SAME_VIEW_BEACH_PHOTO_PAIR',label:'Find matching dated Agate Beach scenes on both sides of a measured offshore episode',
    reason:'July 21 currently has a possible later source date but lacks a contemporaneous pre-event camera view.'},
   {id:'MUNICIPAL_COLLECTION_RULE',label:'Establish township collecting rules and posted shoreline exclusions from official published sources',
    reason:'General state-land pound limits do not grant township-site permission.'},
   {id:'ENTRY_PATH',label:'Verify a current entry/parking route without treating the research beach coordinate as a gate',
    reason:'Public destination is documented, but no exact entrance has been verified.'}
  ]:[
   {id:'HARBOR_WAVE_OBSERVATION',label:'Find independently observed harbor waves or validate open-lake-to-harbor transmission',
    reason:'GLOS Spotter is offshore and a sheltered swimming beach must not inherit its wave heights.'},
   {id:'HARBOR_STONE_SUBSTRATE',label:'Verify rock-bearing shoreline substrate before recommending the harbor for agates',
    reason:'Bayshore is independently described as a sandy swimming beach, not an agate deposit.'},
   {id:'MUNICIPAL_COLLECTION_RULE',label:'Establish township collecting rules and posted shoreline exclusions',
    reason:'The state-owned land collection limit does not authorize this township beach.'}
  ];
 return {
  siteId:s.id,name:s.name,setting:s.setting,operator:s.operator,
  officialBeachSource:s.townshipSource,generalApproachSource:s.chamberSource,
  generalOrientation:s.publicApproachFromChamber,
  publicationStage:'PUBLIC_BEACH_DOCUMENTED_POST_STORM_ROCKHOUNDING_VERDICT_BLOCKED',
  documentation: evidence,
  documentedContextItems:evidence.filter(e=>e.proven).length,
  unresolvedEvidenceGates:blockers,
  priorityResearchWork:nextEvidence,
  historicOffshoreMeasurements:open?wavesafeCount():0,
  siteMeasuredSurfRecords:0,
  independentStoneOutcomeCount:0,
  currentNwsQueryRun:false,
  exactParkingRoutePublished:false,
  publisherWarning:'This register cannot authorize collecting, certify safety or predict newly exposed stones.',
  ...DENIED
 };
}
function wavesafeCount(){return season.actualObservedWaveRecords}
function overallReadiness(){
 validateTruth();
 const sites=expectedIds.map(id=>siteReadiness({siteId:id}));
 const candidate=storms.stormCandidateWindows.find(x=>x.observedOffshorePeakAtUTC==='2026-07-21T23:46:01Z');
 if(!candidate||candidate.namedSitePostCandidates!==1||candidate.namedSitePreCandidates!==0||
   candidate.independentlyVerifiedBeforeAfterPairs!==0||
   candidate.blocker!=='LACKS_CLOSE_PRE_STORM_BEACH_SCENE')
  throw Error('Research photo priority source date or missing pre photo changed');
 return {
  schemaVersion:'rockhounding-grand-marais-publication-readiness-v1',
  reviewedUTC:truth.reviewedUTC,
  evidencePeriod:'ORIGINAL_SUMMER_FALL_2026_OFFSHORE_RESEARCH_NOT_LIVE_BEACH_STATUS',
  townshipsPublicBeachSitesDocumented:2,
  sitesWithPublishedSpecificRockCollectingPermission:0,
  sitesWithSurveyedExactParkingEntrance:0,
  sitesWithVerifiedStormToNewStoneOutcome:0,
  sitesWithValidatedLocalBreakingWaveMeasurements:0,
  sourceBackedRegionalObservedWaveRecords:season.actualObservedWaveRecords,
  samplingQualifiedOriginalOffshoreEpisodeGroups:season.qualifyingMeasuredOffshoreEpisodes,
  independentSourceNamedBeachMediaSources:storms.sourceNamedGrandMaraisMedia,
  tentativeSameSitePostStormSceneCandidates:storms.eventsWithDatedNamedSiteMedia,
  firstHighValueEvidenceGap:{
   siteId:'grand-marais-agate',
   eventPeakAtUTC:candidate.observedOffshorePeakAtUTC,
   observedOffshoreSignificantHeightM:candidate.observedOffshorePeakM,
   missing:'ORIGINAL_NEAR_EVENT_PRE_STORM_PHOTO_WITH_MATCHED_CAMERA',
   rationale:'The July 21 offshore event has one loosely dated follow-up source and no nearby same-camera pre-event scene. Best archival research lead, NOT highest stone probability.'
  },
  originalEGLEStateLandRule:{url:truth.sourcePolicy.egleUrl,
   annualPounds:truth.sourcePolicy.stateOwnedAnnualPersonalCollectionLimitPounds,
   thisNumberDoesNotAuthorizeTownshipCollection:true},
  sites,
  claimStatus:'BEACH_DESTINATION_TRUTH_DOCUMENTED_FORECAST_AND_COLLECTION_BLOCKED',
  canPublishCurrentBeachOpportunity:false,
  canPublishStoneFindProbability:false,
  canPublishSiteSafeVerdict:false,
  ...DENIED
 };
}
module.exports={STATUSES,DENIED,validateTruth,siteReadiness,overallReadiness};
