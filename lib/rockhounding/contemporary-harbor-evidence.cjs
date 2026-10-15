'use strict';
/* Distinguish recent USACE catalog discovery from a measured harbor wave feed.
 * All outcomes remain research-only: neither surveys nor offshore buoys
 * determine beach safety, permission to collect, or newly exposed stones.
 */
const register=require('../../data/rockhounding/grand-marais-contemporary-source-register-2026-10-15.json');
const CATALOG='https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/eHydro_Survey_Data/FeatureServer/0';
function validateSourceRegister(source=register){
 if(source?.schemaVersion!=='grand-marais-contemporary-source-register-v1'||
    source.hydrographicSurvey?.eHydroCatalog!==CATALOG||
    source.hydrographicSurvey?.recentMatchingSurveyJobVerified!==null||
    source.hydrographicSurvey?.latestSurveyEndUTC!==null||
    source.hydrographicSurvey?.currentNavigableDepthVerified!==false||
    source.hydrographicSurvey?.mostRecentBathymetricDeliverableDownloadedAndReviewed!==false||
    JSON.stringify(source.hydrographicSurvey?.listedPreviousPCSYears)!=='[2021,2022,2023]'||
    JSON.stringify(source.observationStations?.map(s=>[s.id,s.role,s.confirmedHarborWaveSensor]))!==
    JSON.stringify([
      ['GRMM4','LOCAL_WIND_CONTEXT_ONLY',false],
      ['45172','OFFSHORE_SEASONAL_WAVE_CONTEXT',false],
      ['45004','DISTANT_OFFSHORE_EVENT_CONTEXT',false]
    ])||
    source.independentLocalHarborWaveObservationsVerified!==false||
    source.harborTransmissionCalibrationAvailable!==false||
    source.collectingPermissionIndependentlyCleared!==false||
    source.status!=='RECENT_USACE_CATALOG_DISCOVERY_PENDING_LOCAL_WAVE_SENSOR_UNVERIFIED')
  throw Error('Contemporary harbor-source register or wave-sensor evidence gate changed');
 for(const value of Object.values(source.publicStatements||{})){
  if(value!==false)throw Error('Uncalibrated harbor observation was promoted to a public claim');
 }
 if(Object.keys(source.publicStatements||{}).length!==6)
  throw Error('Missing contemporary shoreline safety/permission guards');
 return true;
}
function contemporaryHarborGate({catalog=null,source=register}={}){
 validateSourceRegister(source);
 let catalogFinding='CATALOG_NOT_YET_CHECKED_IN_PRODUCTION';
 let mostRecentSurveyEndUTC=null;
 let matchingSurveyJobs=null;
 if(catalog!==null){
  if(catalog?.schemaVersion!=='rockhounding-ehydro-survey-catalog-audit-v1'||
     catalog.source?.catalogLayer!==CATALOG||
     !Array.isArray(catalog.matchingSurveyJobs)||
     catalog.absenceOfSurveyProven!==false||
     catalog.currentBathymetryIndependentlyValidated!==false||
     catalog.measuredHarborWaveObservationsAvailable!==false||
     catalog.harborWaveTransmissionCalibrated!==false||
     catalog.canPublishHarborSurf!==false||
     catalog.canClaimNewStones!==false||
     catalog.canPublishRockhoundingWindow!==false){
    throw Error('Unsupported USACE catalog evidence or unsafe publication claim');
  }
  matchingSurveyJobs=catalog.matchingSurveyJobs.length;
  for(const job of catalog.matchingSurveyJobs){
   if(typeof job.catalogName!=='string'||!/grand\s+mar(?:ais|ias)/i.test(job.catalogName)||
      !Number.isInteger(job.objectId)||job.objectId<=0||
      job.fullBathymetricSurveyDownloadedAndValidated!==false||
      job.validatesPresentHarborWaveHeight!==false||
      (job.surveyEndUTC!==null&& !/^20\d\d-\d\d-\d\d$/.test(job.surveyEndUTC))) {
    throw Error('Invalid or overclaimed USACE catalog job');
   }
  }
  const expected=matchingSurveyJobs>0?'MATCHING_SURVEY_JOB_METADATA':'NO_NAMED_MATCH_IN_BOUNDED_CATALOG_QUERY';
  if(catalog.catalogFinding!==expected)throw Error('Inconsistent USACE survey-catalog result');
  catalogFinding=expected;
  mostRecentSurveyEndUTC=catalog.matchingSurveyJobs.map(j=>j.surveyEndUTC).filter(Boolean).sort().at(-1)||null;
 }
 return Object.freeze({
   setting:'CHARTED_HARBOR_AND_INDEPENDENT_USACE_CATALOG_RESEARCH',
   status:'HARBOR_WAVE_TRANSMISSION_UNVERIFIED',
   usaceCatalogFinding:catalogFinding,
   matchingSurveyJobs,
   mostRecentSurveyEndUTC,
   isSurveyDateProofOfCurrentDepth:false,
   ndbcGRMM4Role:'LOCAL_WIND_CONTEXT_ONLY',
   ndbc45172Role:'OFFSHORE_SEASONAL_WAVE_CONTEXT',
   measuredHarborWaveHeightM:null,
   predictedHarborWaveHeightM:null,
   harborTransmissionFactor:null,
   canPublishVisitWindow:false,
   canClaimFreshAgates:false,
   canClaimSafeConditions:false,
   canClaimCollectingPermission:false
 });
}
module.exports={validateSourceRegister,contemporaryHarborGate};
