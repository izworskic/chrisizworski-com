'use strict';
// The research bearing is derived from a 2014 NOAA chart coastline and historic
// GLAHF land/water probes; it is NOT a reviewed 2026 waterline normal.
const enc=require('../../data/rockhounding/grand-marais-noaa-enc-geometry-2026-10-15.json');
const gis=require('../../data/rockhounding/grand-marais-glahf-water-side-2026-10-15.json');
const pilot=require('../../data/rockhounding/grand-marais-wave-pilot.json');
function angularDiff(a,b){return Math.abs(((a-b+540)%360)-180)}
function ensureNOAAChartEvidence(geometry=enc){
 const e=geometry;
 if(e?.schemaVersion!=='grand-marais-noaa-enc-geometry-v1'||
 e.status!=='HISTORIC_NOAA_ENC_NORMAL_CANDIDATE_AND_CHARTED_HARBOR_PIERS_NO_SURF_VERDICT'||
 e.source?.mapServer!=='https://gis.charttools.noaa.gov/arcgis/rest/services/encdirect/enc_harbour/MapServer'||
 e.source?.coastlineLayer!==84||e.source?.coastlineObjectId!==1938304||
 e.source?.pierLayer!==85||JSON.stringify(e.source?.pierObjectIds)!=='[2496904,2496908]'||
 e.source?.dataset!=='US5MI77M.000'||!e.source?.originalFeatureSourceDateRange?.includes('2014-01')||
 e.source?.sourceGeometryNotSurveyedCurrent!==true||
 e.source?.independentWaterSide!==gis.source.url||
 e.agate?.siteId!=='grand-marais-agate'||
 e.agate?.independentGISWaterSideConfirmed!==true||
 e.agate?.approvedToPopulateReviewedWaterlineBearing!==false||
 e.agate?.currentWaterlineSurveyed!==false||
 e.agate?.lakewardWaveTransformationValidated!==false||
 !Number.isFinite(e.agate?.researchOutwardBearingDeg)||
 e.agate.researchOutwardBearingDeg<0||e.agate.researchOutwardBearingDeg>=360||
 Math.abs(e.agate.researchOutwardBearingDeg-336.74)>.01||
 Math.abs(e.agate.studyAnchorToChartLineMeters-85.5)>1||
 e.bayshore?.siteId!=='grand-marais-harbor'||
 e.bayshore?.hydrodynamicAttenuationModeled!==false||
 e.bayshore?.assessedWaveShelterFactor!==null||
 e.bayshore?.breakwaterTransmissionFactor!==null||
 e.bayshore?.canUseAgateOpenLakeWaveCell!==false||
 e.verification?.canPublishPostStormVisitWindow!==false||
 e.verification?.canClaimSafeWater!==false||
 e.verification?.canClaimNewStoneExposure!==false||
 e.verification?.canClaimRockCollectingPermission!==false){
   throw Error('NOAA ENC shoreline evidence missing, moved or prematurely promoted');
 }
 if(JSON.stringify(e.agate?.independentSideProbeDistancesMeters)!=='[120,200,350]'||
 !Array.isArray(e.agate?.waterSideProbes)||e.agate.waterSideProbes.length!==3||
 !Array.isArray(e.agate?.landSideProbes)||e.agate.landSideProbes.length!==3)
 throw Error('NOAA ENC independent GLAHF normal probes missing');
 for(const [expect,arr] of [['WATER',e.agate.waterSideProbes],['LAND',e.agate.landSideProbes]]){
  arr.forEach((p,i)=>{
    if(p.class!==expect||p.distanceM!==e.agate.independentSideProbeDistancesMeters[i]||
      !Number.isFinite(p.lat)||!Number.isFinite(p.lon))
     throw Error('Historic shoreline normal lacks independent '+expect+' corroboration');
  });
 }
 if(gis?.gates?.shorelineBearingSurveyed!==false||gis?.gates?.harborBreakwaterShelterQuantified!==false||
  gis?.gates?.gisSnapshotPermitsSurfForecast!==false)
  throw Error('GLAHF research land/water classification misrepresented');
 const pts=new Map(gis.sampledLocations.map(p=>[p.id,p]));
 const wet=pts.get('agate_500m_wave_candidate');
 const coarse=pts.get('agate_2p5km_south_nearest');
 if(wet?.gisClass!=='WATER'||coarse?.gisClass!=='LAND')
  throw Error('NOAA/GLAHF wet-cell mask conflict lost');
 const piers=e.bayshore?.piers;
 if(!Array.isArray(piers)||piers.length!==2||piers[0].sourceId!==2496904||
   piers[1].sourceId!==2496908||piers.some(p=>p.chartedCategory!=='pier'||
    !Number.isFinite(p.northSouthSpanMeters)||p.northSouthSpanMeters<200||
    p.isPierCenterlineLength!==false))
  throw Error('NOAA charted pier lines are not surveyed lengths');
 if(!Array.isArray(e.agate?.windowResearchBearingsDeg)||e.agate.windowResearchBearingsDeg.length!==3||
  e.agate.windowResearchBearingsDeg.some(b=>angularDiff(b,e.agate.researchOutwardBearingDeg)>10))
 throw Error('Historic shoreline curvature needs fresh investigation');
 const original=pilot.pilotSites.find(s=>s.id==='grand-marais-agate');
 if(original?.shore?.reviewStatus!=='UNVERIFIED_WATERLINE'||original?.shore?.outwardBearingDeg!==null)
  throw Error('Do not promote historic chart bearing into reviewed NOAA wave-facing orientation');
 return true;
}
function researchWaveDirectionOnly(waveFromDeg,{evidence=enc,siteId='grand-marais-agate'}={}){
 ensureNOAAChartEvidence(evidence);
 if(siteId!=='grand-marais-agate')return {
  siteId,status:'HARBOR_WAVE_ATTENUATION_UNMODELED',
  directionOnly:false,canPublishSiteWaves:false,canPredictStones:false};
 if(!Number.isFinite(waveFromDeg)||waveFromDeg<0||waveFromDeg>=360)
  return {siteId,status:'MISSING_VALID_NOAA_WAVE_DIRECTION',
   directionOnly:false,canPublishSiteWaves:false,canPredictStones:false};
 const relativeAngle=angularDiff(waveFromDeg,evidence.agate.researchOutwardBearingDeg);
 const directionalIncidence=Math.max(0,Math.cos(relativeAngle*Math.PI/180));
 return {siteId,status:'HISTORICAL_COASTLINE_DIRECTION_COMPARISON_ONLY',
  offshoreNOAAWaveFromDeg:waveFromDeg,
  historicNoaaChartFacingDeg:evidence.agate.researchOutwardBearingDeg,
  relativeAngleDeg:+relativeAngle.toFixed(2),
  directionalIncidenceResearchOnly:+directionalIncidence.toFixed(3),
  directionOnly:true,usesSiteWaveHeights:false,
  localWaveRefractionValidated:false,
  historicChartNotReviewedShoreline:true,
  canPublishSiteWaves:false,canPredictStones:false,canClaimSafeWater:false};
}
function harborGeometryEvidence(evidence=enc){
 ensureNOAAChartEvidence(evidence);
 return {siteId:'grand-marais-harbor',
  pierCount:2,chartedCategory:'PIER',sourceYearRange:'2004–2014',
  approxNorthSouthStructuralExtentsM:evidence.bayshore.piers.map(x=>x.northSouthSpanMeters),
  evidenceType:'NOAA_ENC_CHARTED_INFRASTRUCTURE',
  currentPierCondition:'NOT_SURVEYED',
  waveAttenuationFactor:null,
  computedEntranceShelter:false,
  canUseOpenLakeAgateWaveCell:false,
  canClaimCalmWater:false,
  canPublishSurfOrSafety:false};
}
module.exports={ensureNOAAChartEvidence,researchWaveDirectionOnly,harborGeometryEvidence};
