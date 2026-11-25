'use strict';
// Audit only: official dimensions constrain provisional geometry, not a surveyed axis.
const {provisionalGates,coordinates}=require('./detect-great-lakes-crossings.cjs');
const soo=require('../lib/soo-locks-next'),duluth=require('../lib/duluth-canal');
const LOCK_SOURCE='https://nauticalcharts.noaa.gov/publications/coast-pilot/files/cp6/CPB6_C12_WEB.pdf';
const BRIDGE_SOURCE='https://nauticalcharts.noaa.gov/publications/coast-pilot/files/cp6/CPB6_C13_WEB.pdf';
const physical=Object.freeze({
 'soo-poe':Object.freeze({widthFeet:110,meaning:'published chamber width',source:LOCK_SOURCE,edition:'2026-03-15',page:432}),
 'soo-macarthur':Object.freeze({widthFeet:80,meaning:'published chamber width',source:LOCK_SOURCE,edition:'2026-03-15',page:432}),
 'duluth-bridge':Object.freeze({widthFeet:300,meaning:'published horizontal bridge clearance, not surveyed navigable channel width',source:BRIDGE_SOURCE,edition:'2026-11-01',page:465})
});
function audit(){
 const rows=provisionalGates().map(g=>{
  const d=physical[g.id];if(!d)throw Error('No official dimension reference for '+g.id);
  const target=g.site==='soo'?{lat:soo.LOCK_POINT[0],lon:soo.LOCK_POINT[1]}:duluth.CANAL;
  const p=coordinates(g,target),width=2*g.halfWidth,official=d.widthFeet*0.3048;
  return {gate:g.id,source:d,provisionalWidthMeters:width,publishedWidthMeters:official,widthExcessMeters:width-official,
   exceedsPublishedWidth:width>official,modelPointOffsetMeters:Math.hypot(p.x,p.y),modelNormalOffsetMeters:p.normal,
   historicalAxisVerified:false,targetEquivalent:false,independentPassageVerified:false,eligibleForReplay:false,
   blockers:['PROVISIONAL_WIDTH_NOT_PHYSICAL_BOUNDARY','HISTORICAL_SURVEY_AXIS_UNVERIFIED','MODEL_EVENT_EQUIVALENCE_UNVERIFIED','INDEPENDENT_PASSAGE_RECORD_UNAVAILABLE']};
 });
 return {schemaVersion:1,kind:'OFFICIAL_DIMENSION_RECONCILIATION_NOT_SURVEY',rows,independentlyReviewedCrossings:0,productionCalibrationAuthorized:false};
}
module.exports={audit};
if(require.main===module)process.stdout.write(JSON.stringify(audit(),null,2)+'\n');
