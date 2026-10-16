'use strict';
// Compare independently observed open-lake GLOS wave-*from* with a 2014
// NOAA chart-derived research bearing (~336.74°). This is NOT a 2026
// surveyed shoreline normal or modeled wave transmission to either beach.
const {validateSpotterSource}=require('./glos-spotter.cjs');
const {researchWaveDirectionOnly}=require('./noaa-enc-geometry.cjs');

const DENIAL=Object.freeze({
 canPredictStones:false,canPublishVisitWindow:false,
 canClaimSafeConditions:false,canPublishSiteSurf:false,
 canUseForHarborWaveHeight:false
});
function compareSpotterToHistoricShore({siteId='grand-marais-agate',observation,sourceFreshness='UNVERIFIED'}={}){
 validateSpotterSource();
 if(siteId!=='grand-marais-agate')return {
   siteId,status:siteId==='grand-marais-harbor'?'NO_HARBOR_TRANSMISSION_MODEL':'UNKNOWN_SITE',
   currentWaterlineSurveyed:false,comparedHistoricCoastline:false,
   measuredBeachBreakingWavesM:null,...DENIAL
 };
 if(!observation||observation.source!=='GLOS_SPOT_1361_OBSERVED_OPEN_LAKE'||
   observation.phase!=='OBSERVATION'||typeof observation.time!=='string'||
   !Number.isFinite(Date.parse(observation.time))||
   !Number.isFinite(observation.waveFromDeg)||observation.waveFromDeg<0||
   observation.waveFromDeg>=360||
   !Number.isFinite(observation.waveHeightM)||observation.waveHeightM<0||
   observation.waveHeightM>18)
  return {siteId,status:'INVALID_OR_MISSING_GLOS_OPEN_LAKE_OBSERVATION',
    comparedHistoricCoastline:false,measuredBeachBreakingWavesM:null,...DENIAL};
 const research=researchWaveDirectionOnly(observation.waveFromDeg,{siteId});
 if(!research.directionOnly||research.canPublishSiteWaves!==false||
   research.historicChartNotReviewedShoreline!==true)
  throw Error('NOAA historical shoreline geometric validity gate changed');
 return {
   siteId,
   status:'GLOS_OBSERVED_WAVE_DIRECTION_VS_HISTORIC_COASTLINE_ONLY',
   stationId:'SPOT-1361',
   originalObservationUTC:observation.time,
   observedWaveFromDeg:observation.waveFromDeg,
   offshoreMeasuredSignificantWaveHeightM:observation.waveHeightM,
   historicalNoaaChartLakewardBearingDeg:research.historicNoaaChartFacingDeg,
   relativeWaveFromAngleDeg:research.relativeAngleDeg,
   relativeResearchDirectionalAlignment:research.directionalIncidenceResearchOnly,
   sourceFreshness,
   comparedHistoricCoastline:true,
   historicalNotPresentWetline:true,
   observedBuoyOffshoreNotBeach:true,
   waveRefractionOrBreakwaterTransmissionModeled:false,
   measuredBeachBreakingWavesM:null,
   ...DENIAL
 };
}
module.exports={compareSpotterToHistoricShore};
