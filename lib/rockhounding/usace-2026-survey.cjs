'use strict';
// July 2026 USACE published survey metadata and chart-plot provenance.
// A harbor survey is NOT a measured harbor wave, public navigation guarantee,
// or field observation of newly exposed agates.
const evidence=require('../../data/rockhounding/grand-marais-usace-2026-survey-source.json');
const sourceHost='https://ehydroprod.blob.core.usgovcloudapi.net/';
function validateUSACE2026Survey(v=evidence){
 const s=v?.source, n=v?.surveyPlotNotes, i=v?.interpretation;
 if(v?.schemaVersion!=='grand-marais-usace-2026-survey-source-v1'||
    s?.catalogLayer!=='https://spatial.usace.army.mil/opjarcgis/rest/services/eHydroPub/eHydro_Survey_Data/FeatureServer/0'||
    s?.objectId!==125722||s?.surveyJobId!=='GR_01_MAS_20260730_CS'||
    s?.surveyEndUTC!=='2026-07-30'||s?.district!=='CELRE'||
    s?.surveyType!=='CS'||s?.catalogUploadUTC!=='2026-09-11'||
    s?.catalogProjection!=='NAD_1983_StatePlane_Michigan_North_FIPS_2111_Feet'||
    s?.publicPlotPDFURL!==sourceHost+'ehydro-surveys-pdf/CELRE/CELRE_DIS_GR_01_MAS_20260730_CS.PDF'||
    s?.sourceArchiveURL!==sourceHost+'ehydro-surveys/CELRE/CELRE_DIS_GR_01_MAS_20260730_CS.ZIP'||
    s?.sourcesVerified?.surveyMetadataFromOfficialFeatureService!==true||
    s?.sourcesVerified?.plotPDFPubliclyOpenedAndTextInspected!==true||
    s?.sourcesVerified?.sourceArchiveContentsIndependentlyDownloadedAndChecked!==false||
    !s?.sourceDataContent?.includes('GR_01_MAS_20260730_CS.XYZ')||
    !s?.sourceDataContent?.includes('GR_01_MAS_20260730_CS.PDF')||
    n?.surveyDateUTC!=='2026-07-30'||
    n?.elevationAndSoundingDatum!=='INTERNATIONAL_GREAT_LAKES_DATUM_1985_IGLD85'||
    n?.lowWaterDatumFeet!==601.1||n?.depthUnits!=='feet'||
    n?.sonarInstrument!=='R2SONIC 2024 MULTIBEAM SONAR'||
    n?.horizontalGrid!=='NAD83 Michigan State Plane North Zone 2111'||
    n?.horizontalGridUnits!=='US survey feet'||
    n?.navigationAidsAreNotForNavigation!==true)
  throw Error('USACE July 2026 metadata, survey datum or official plot provenance changed');
 const prohibited=[
   'surveyFootprintIndependentlyCheckedAgainstBeaches',
   'rawXYZBathymetryParsedAndQCed',
   'bathymetryDatumConversionToEarlierNOAAENCPerformed',
   'canPredictHarborWaves','canPublishSafeShoreConditions','canPredictFreshAgates',
   'canPublishRockhoundingVisitWindow','canClaimCollectingPermission'
 ];
 if(prohibited.some(k=>i?.[k]!==false)||i?.currentNavigableDepthNotCertified!==true||
   i?.measuredHarborWaveHeightM!==null||i?.numericalWaveAttenuationFactor!==null||
   i?.freshStonesProbability!==null||
   i?.actualSurveyPlotExists!==true||i?.aDatedHarborSurveyIsVerified!==true)
  throw Error('Unverified USACE survey bathymetry or harbor wave claim');
 return true;
}
function usace2026SurveyGate(source=evidence){
 validateUSACE2026Survey(source);
 return Object.freeze({
  status:'JULY_2026_USACE_PLOT_DATUM_VERIFIED_DEPTH_GRID_UNREVIEWED',
  surveyEndUTC:source.source.surveyEndUTC,
  sourceSurveyId:source.source.surveyJobId,
  depthDatum:'IGLD85',
  sourceDepthUnits:'feet',
  sonarMethod:'multibeam',
  surveyPDF:source.source.publicPlotPDFURL,
  surveyZIP:source.source.sourceArchiveURL,
  referencedXYZPresentInSourceManifest:true,
  xyzParsedAndValidated:false,
  currentNavigationDepthCertified:false,
  waveModelCalibrated:false,
  harborObservedWaveHeightM:null,
  siteVisitSignal:null,
  freshAgateClaimAllowed:false,
  safeConditionsClaimAllowed:false,
  collectionPermissionVerified:false
 });
}
module.exports={validateUSACE2026Survey,usace2026SurveyGate};
