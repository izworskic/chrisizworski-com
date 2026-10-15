'use strict';
// Historical NOAA ENC coastal depth data: coverage does NOT calibrate
// harbor wave shelter, demonstrate legal collecting, or establish safety.
const depth=require('../../data/rockhounding/grand-marais-noaa-enc-harbor-depth-2026-10-15.json');
const geometry=require('./noaa-enc-geometry.cjs');
const {siteGeometryGate}=require('./shoreline-water-side.cjs');
const {contemporaryHarborGate}=require('./contemporary-harbor-evidence.cjs');
const {surveyedCoverageGate}=require('./usace-original-survey.cjs');
const auditedUSACE=require('../../data/rockhounding/grand-marais-usace-ehydro-survey-catalog-2026-10-15.json');
const expected={
 'inner-southwest':[17,6],
 'harbor-center':[41,12],
 'pier-north':[38,12],
 'lake-approach':[42,2]
};
function validateHarborDepth(source=depth){
 geometry.ensureNOAAChartEvidence();
 if(source?.schemaVersion!=='grand-marais-noaa-enc-harbor-depth-coverage-v1'||
   source.source?.mapServer!=='https://gis.charttools.noaa.gov/arcgis/rest/services/encdirect/enc_harbour/MapServer'||
   source.source?.dataset!=='US5MI77M.000'||
   source.source?.soundingLayer!==76||source.source?.contourLayer!==104||
   source.source?.soundingField!=='Z'||source.source?.contourField!=='VALDCO'||
   source.source?.datumAndUnitReconciliationStatus!=='NOT_INDEPENDENTLY_VERIFIED'||
   source.historicCoverage?.overlappingZones!==true||
   source.historicCoverage?.doNotSumZoneCounts!==true||
   source.historicCoverage?.chartedDepthValuesNotCurrentHarborConditions!==true||
   source.historicCoverage?.chartDatumNotReconciled!==true||
   source.historicCoverage?.modelHydrodynamicTransmissionNotCalibrated!==true||
   source.harborStructureEvidence?.entranceOpeningWidthMeters!==null||
   source.harborStructureEvidence?.breakwaterTransmissionFactor!==null||
   JSON.stringify(source.harborStructureEvidence?.chartPierFeatureIds)!=='[2496904,2496908]'||
   source.safety?.canUseAgateWaveCellForHarbor!==false||
   source.safety?.canPublishHarborWaveHeight!==false||
   source.safety?.canClaimCalmWater!==false||
   source.safety?.canPredictFreshAgates!==false||
   source.safety?.canPublishRockhoundingVisitWindow!==false||
   source.status!=='HISTORIC_ENC_SOUNDING_AND_CONTOUR_PRESENCE_VERIFIED_ATTENUATION_UNRESOLVED')
  throw Error('Harbor bathymetry source or no-safety research gate changed');
 if(JSON.stringify(Object.keys(source.zones||{}).sort())!==JSON.stringify(Object.keys(expected).sort()))
  throw Error('Unexpected NOAA ENC harbor study zone set');
 for(const [key,[s,c]] of Object.entries(expected)){
  const z=source.zones[key];
  if(!z||!Array.isArray(z.bbox)||z.bbox.length!==4||
    z.soundings?.count!==s||z.contours?.count!==c||
    !Array.isArray(z.soundings?.sourceDates)||!z.soundings.sourceDates.length||
    !Array.isArray(z.soundings?.chartedZValueRange)||z.soundings.chartedZValueRange.length!==2||
    !Array.isArray(z.contours?.chartedContourValueRange)||z.contours.chartedContourValueRange.length!==2||
    z.soundings.chartedZIsCurrentNavigationDepth!==false||
    z.contours.individualSurveyDateKnown!==false||
    z.validBathymetricWaveTransformation!==false){
    throw Error('Unverified NOAA ENC depth coverage in '+key);
  }
  for(const x of [...z.soundings.chartedZValueRange,...z.contours.chartedContourValueRange]){
   if(!Number.isFinite(x)||x<0||x>100)throw Error('Invalid chart depth values');
  }
  if(z.soundings.chartedZValueRange[0]>z.soundings.chartedZValueRange[1]||
   z.contours.chartedContourValueRange[0]>z.contours.chartedContourValueRange[1])
   throw Error('Invalid chart depth range order');
  if(z.soundings.sourceDates.some(d=>!/^20\d{2}(?:\d{2}(?:\d{2})?)?$/.test(d)||
   +d.slice(0,4)>2020||+d.slice(0,4)<2004))
   throw Error('Unknown NOAA sounding source provenance');
 }
 return true;
}
function harborStudyGate({siteId='grand-marais-harbor',evidence=depth}={}){
 validateHarborDepth(evidence);
 if(siteId==='grand-marais-agate'){
  return {siteId,setting:'OPEN_LAKE_SHORE',
    harborTransferModelApplicable:false,
    studyBathymetryStatus:'NOT_A_HARBOR_DEPTH_CALIBRATION',
    siteWaveHeightM:null,canPublishVisitWindow:false,canClaimNewStones:false};
 }
 if(siteId!=='grand-marais-harbor')return {
  siteId,status:'UNKNOWN_PLACE',canPublishVisitWindow:false,canClaimSafeConditions:false};
 const gis=siteGeometryGate('grand-marais-harbor');
 const contemporary=contemporaryHarborGate({catalog:auditedUSACE});
 const originalUSACESurvey=surveyedCoverageGate('grand-marais-harbor');
 if(gis.dominantStudyWaterSide!=='EAST_HARBOR_CANDIDATE'||
    gis.canPublishVisitWindow!==false)throw Error('Harbor coastline source gate changed');
 return {siteId,setting:'HISTORIC_CHARTED_HARBOR_GEOMETRY',
  status:'HARBOR_STRUCTURE_AND_DEPTH_CHART_COVERAGE_VERIFIED_TRANSMISSION_UNRESOLVED',
  chartedPierCount:2,chartedSpotSoundingPresence:true,chartedDepthContourPresence:true,
  soundingSourceDateRange:'2004–2020',
  chartedDepthMayBeStale:true,currentDredgingState:'NOT_INDEPENDENTLY_VERIFIED',
  recentUSACECatalogStatus:contemporary.usaceCatalogFinding,
  latestUSACESurveyCatalogEndDate:contemporary.mostRecentSurveyEndUTC,
  independentlyObservedHarborWaves:contemporary.measuredHarborWaveHeightM,
  latestUSACE2026OriginalSurveyArchivedAndChecked:originalUSACESurvey.originalSurveyIsSourceAuthenticated,
  latestUSACE2026StudySiteCovered:originalUSACESurvey.surveyFootprintContainsLocation,
  latestUSACE2026SurveySiteStatus:originalUSACESurvey.status,
  latestUSACE2026VerticalDatum:'IGLD 85',
  currentUSACE2026DepthVerified:false,
  openingWidthMeters:null,waveTransmissionFactor:null,
  predictedHarborWaveHeightM:null, predictedHarborWaveDirectionDeg:null,
  observedHarborWaveHeightM:null,doesNotSubstituteOffshoreModelCell:true,
  canClaimShelteredSafeConditions:false,canPublishSiteWaves:false,
  canClaimNewStones:false,canPublishVisitWindow:false,
  nextGate:'NO_2026_SURVEY_AT_BAYSHORE_AND_NO_MEASURED_HARBOR_SURF_OR_POST_STORM_STONE_EVIDENCE'};
}
function depthCoverageSummary(source=depth){
 validateHarborDepth(source);
 return {zones:Object.entries(source.zones).map(([id,z])=>({
    id,label:z.label,chartedSoundingCount:z.soundings.count,
    chartedContourCount:z.contours.count,
    earliestSoundingYear:+z.soundings.sourceDates[0].slice(0,4),
    latestSoundingYear:Math.max(...z.soundings.sourceDates.map(d=>+d.slice(0,4))),
    currentMeasuredDepthAvailable:false
  })),
  overlaps:true,totalDistinctSoundingsAcrossZones:null,
  minNavigableDepth:null,currentHarborConditionsValidated:false,
  canPublishHarborSurf:false};
}
module.exports={validateHarborDepth,harborStudyGate,depthCoverageSummary};
