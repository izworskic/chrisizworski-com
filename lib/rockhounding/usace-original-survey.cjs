'use strict';
// One authenticated original 2026 USACE eHydro ZIP. Spatial COVERAGE and survey
// Z elevations are not safe depths, wave transmission, or beach observations.
const data=require('../../data/rockhounding/grand-marais-usace-2026-survey-evidence.json');
const ZIP='https://ehydroprod.blob.core.usgovcloudapi.net/ehydro-surveys/CELRE/CELRE_DIS_GR_01_MAS_20260730_CS.ZIP';
const HASH='6dce01ac993dd991219be0da4718fd90b83f3e465099c67e1b3186394081ac5c';
function validateOriginalSurvey(source=data){
 const s=source;
 if(s?.schemaVersion!=='grand-marais-usace-2026-original-survey-evidence-v1'||
    s.status!=='ORIGINAL_2026_USACE_ENTRANCE_SURVEY_DELIVERABLE_AUTHENTICATED_DATUM_AND_COVERAGE_RESEARCH_ONLY'||
    s.source?.catalogObjectId!==125722||s.source?.surveyEndUTC!=='2026-07-30'||
    s.source?.originalArchive!==ZIP||s.source?.originalArchiveSHA256!==HASH||
    s.source?.originalArchiveBytes!==4062569||
    s.archiveEvidence?.archiveEntries!==144||
    s.archiveEvidence?.numericXYZRecords!==17804||
    s.archiveEvidence?.parsedWholeXYZ!==true||
    s.archiveEvidence?.sourceVerticalDatum!=='IGLD 85'||
    s.archiveEvidence?.rawZUnits!=='US Survey Foot'||
    s.archiveEvidence?.rawXYZHorizontalUnits!=='US Survey Foot'||
    s.archiveEvidence?.sourceProjectionCodeCandidate!=='ESRI:102688'||
    s.archiveEvidence?.horizontalTransformerIndependentlyVerified!==false||
    s.archiveEvidence?.actualWaterLevelMatched!==false||
    s.archiveEvidence?.zElevationIsNotContemporaneousHarborWaterDepth!==true||
    s.archiveEvidence?.currentDepthRequiresDatedIGLD85WaterLevelReference!==true||
    JSON.stringify(s.archiveEvidence?.rawCoordinateRanges?.zElevation)!=='[-29.96,-7.48]'||
    JSON.stringify(s.surveyCoverage?.boundsWGS84)!=='[-85.971734,46.675899,-85.969027,46.685841]'||
    s.surveyCoverage?.originalArcGISSuppliedPolygonVertices!==161||
    s.surveyCoverage?.spatialVerdict!=='ENTRANCE_CHANNEL_ONLY_UNVERIFIED_AT_BOTH_BEACH_STUDY_POINTS'||
    s.surveyCoverage?.coverageIsSurveyExtentNotAllBottomSoundings!==true||
    s.constraints?.surveyMeasuresHarborWaves!==false||
    s.constraints?.harborWaveAttenuationMeasured!==false||
    s.constraints?.currentNavigableDepthValidated!==false||
    s.constraints?.canPredictSafeSwimming!==false||
    s.constraints?.canPredictNewlyExposedAgates!==false||
    s.constraints?.canPublishRockhoundingVisitWindow!==false||
    s.constraints?.canClaimCollectionPermission!==false)
  throw Error('Original USACE survey authenticity or no-wave/depth publication gate changed');
 const locations=s.surveyCoverage?.verifiedPointInSurveyPolygon||{};
 const expected={'grand-marais-harbor':false,'grand-marais-agate':false,
   'inner-harbor-center':false,'entrance-channel-approx':true};
 for(const [id,value] of Object.entries(expected)){
  if(locations[id]!==value)
   throw Error('USACE actual 2026 surveyed polygon does not verify beach extent: '+id);
 }
 if(Object.keys(locations).length!==Object.keys(expected).length)
  throw Error('Unreviewed USACE spatial inclusion claim');
 return true;
}
function surveyedCoverageGate(siteId,{source=data}={}){
 validateOriginalSurvey(source);
 if(!['grand-marais-harbor','grand-marais-agate','entrance-channel-approx'].includes(siteId))
  return {siteId,status:'NOT_AN_AUDITED_SURVEY_POINT',surveyFootprintContainsLocation:false,
   canClaimCurrentDepth:false,canPublishSurf:false};
 const included=source.surveyCoverage.verifiedPointInSurveyPolygon[siteId]===true;
 return {siteId,source:'USACE_EHYDRO_ORIGINAL_JULY_2026_SURVEY',
  surveyDateUTC:'2026-07-30',sourceZipSHA256:HASH,
  originalSurveyIsSourceAuthenticated:true,
  surveyFootprintContainsLocation:included,
  status:included?'ENTRANCE_CHANNEL_INSIDE_2026_SURVEY_EXTENT':
    'SITE_OUTSIDE_2026_ENTRANCE_SURVEY_EXTENT',
  sourceVerticalDatum:'IGLD 85',elevationUnits:'US Survey Foot',
  rawZValuesAreNotCurrentWaterDepth:true,
  currentDatedWaterLevelMatched:false,
  predictedWaveTransmission:null,predictedLocalSurfHeightM:null,
  currentMinimumSafeNavigableDepthM:null,
  canClaimFreshlyExposedStones:false,canClaimSafeConditions:false,
  canClaimCurrentDepth:false,canPublishSurf:false,
  canPublishRockhoundingWindow:false};
}
module.exports={validateOriginalSurvey,surveyedCoverageGate};
