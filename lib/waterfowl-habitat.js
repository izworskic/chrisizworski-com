'use strict';
/* Interprets marsh freeze exposure vs potentially more persistent deep/flowing water.
 * No movement probabilities and no direct causality from a falling refuge survey.
 */
function habitatShift({weather={},lakeIce={},snowDepth={},surveys={}}={}){
 const w=weather?.status==='forecast'?weather:null;
 const frozenHours=w?.longestFreezingRunHours??null,deficit=w?.forecastColdDegreeHours??null;
 const sustained=w&&Number.isFinite(frozenHours)&&Number.isFinite(deficit);
 let marshPressure='unknown';
 if(sustained)marshPressure=(frozenHours>=24&&deficit>=200)?'high':
  (frozenHours>=12&&deficit>=72)?'building':'limited';
 const observations=lakeIce?.status==='observed_chart'?lakeIce:null;
 const code=observations?.code;
 // This is a charted Great Lakes reference point, NOT a refuge pond, sheltered boat ramp or entire lake.
 const openWaterChart=code==='00'||code==='01'||code==='10'||code==='12'||code==='13'||code==='20'||code==='23';
 const extensivelyIced=code==='90'||code==='91'||code==='92'||code==='81'||code==='89';
 let status='insufficient_evidence',headline='Marsh-to-lake movement is unverified';
 if(marshPressure==='limited'){status='limited_freezing';headline='Limited forecast marsh-freezing pressure';}
 if(marshPressure==='building'||marshPressure==='high'){
  status='marsh_freeze_watch';headline='Shallow-marsh freezing pressure is building';
  if(openWaterChart){status='lake_refuge_possible';headline='Marsh freeze pressure; mapped big water still has open-water potential';}
  else if(extensivelyIced){status='big_water_icing';headline='Marsh freeze pressure; mapped big water is also heavily iced';}
 }
 const latestSurveys=(surveys.sites||[]).filter(s=>s.status==='reported');
 const falling=latestSurveys.filter(s=>s.ducks?.change!==null&&Number.isFinite(s.ducks?.change)&&s.ducks.change<0);
 return {status,headline,marshPressure,
  lakeChartStatus:observations?'dated_official_chart':'not_verified',
  marshIceStatus:'not_verified_for_region',
  openWaterPotential:openWaterChart?'chart_contains_low_ice_area':extensivelyIced?'charted_heavy_ice':'unknown',
  surveySitesWithCurrentCount:Array.isArray(surveys?.sites)?latestSurveys.length:null,decliningSiteCounts:Array.isArray(surveys?.sites)?falling.length:null,
  evidenceNote:falling.length?'Some dated managed-marsh counts fell. That alone does not show where those birds relocated.':'Dated marsh survey counts do not establish numbers on adjacent lakes.',
  caveat:'Cold-degree hours are a heuristic indicator for shallow wetlands. Water depth, wind mixing, moving water and regulation of wetland pools affect freezing. Ducks may use large lakes, rivers, reservoirs or move farther along the flyway; counts require separate observations.',
  basis:['NWS hourly forecast cold exposure','NOAA dated ice chart at selected large-water point','Michigan DNR weekly managed-area surveys where available']};
}
module.exports={habitatShift};
