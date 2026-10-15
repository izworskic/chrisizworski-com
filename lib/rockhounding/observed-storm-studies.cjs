'use strict';
// Independently checks NOAA buoy *observed* events. This is NOT a rock exposure or safety validation.
const source=require('../../data/rockhounding/ndbc-45004-offshore-events-2026.json');
const H=3600000;
function analyzeEvent(event,data=source){
 if(!data||!Array.isArray(data.samples)||!event)throw Error('NOAA event and actual buoy samples required');
 const pk=Date.parse(event.peakAt);
 if(!Number.isFinite(pk))throw Error('Invalid event peak');
 const sample=data.samples.find(x=>x.t===event.peakAt);
 if(!sample||Math.abs(sample.hM-event.peakSignificantWaveHeightM)>0.00001)throw Error('Peak is not backed by NOAA sample');
 const inWindow=data.samples.filter(x=>Math.abs(Date.parse(x.t)-pk)<=72*H);
 const earlier=inWindow.filter(x=>Date.parse(x.t)<pk);
 const later=inWindow.filter(x=>Date.parse(x.t)>pk);
 const afterDay=later.filter(x=>Date.parse(x.t)>=pk+18*H&&Date.parse(x.t)<=pk+36*H);
 const afterTwoDays=later.filter(x=>Date.parse(x.t)>=pk+36*H&&Date.parse(x.t)<=pk+60*H);
 const latest=later.at(-1);
 const pct=latest===undefined||event.peakSignificantWaveHeightM<=0?null:
 Math.round(100*(1-latest.hM/event.peakSignificantWaveHeightM));
 function maxGap(rows){
  let max=0;
  for(let i=1;i<rows.length;i++)max=Math.max(max,(Date.parse(rows[i].t)-Date.parse(rows[i-1].t))/H);
  return max;
 }
 const coverage={pre72h:earlier.length,post72h:later.length,post24h:afterDay.length,post48h:afterTwoDays.length,
 maxHistoricalGapHours:maxGap(inWindow)};
 const cannotUseAsModelBacktest=true;
 const directionalContextAvailable=false; // Only significant wave height was extracted.
 const postDropAvailable=!!latest&&later.length>=3;
 return {
   id:event.id,peakAt:event.peakAt,
   peakObservedM:sample.hM,
   observedLateAfterM:latest?.hM??null,
   observedLateAfterAt:latest?.t??null,
   relativeHeightDropPct:postDropAvailable?pct:null,
   observedDisturbance:true,
   recordedPostPeakDecline:postDropAvailable&&pct>=50,
   coverage,
   validForWaveHeightEventComparison:earlier.length>=4&&later.length>=4&&maxGap(inWindow)<=18,
   validForDirectionalExposureBacktest:false,
   validForStoneExposureValidation:false,
   validForBeachSafetyAssessment:false,
   outputClass:'OFFSHORE_BUOY_CASE_STUDY_ONLY',
   issues:[
     'BUOY_DISTANT_FROM_GRAND_MARAIS',
     'NO_WAVE_DIRECTION_IN_ARCHIVED_SUBSET',
     'NO_MEASURED_BEACH_STONE_OUTCOME',
     ...(earlier.length<4||later.length<4?['SPARSE_BEFORE_AFTER_COVERAGE']:[]),
     ...(maxGap(inWindow)>18?['LONG_OBSERVATION_GAP']:[])
   ]
 };
}
function analyzeAll(data=source){
 const cases=data?.events;if(!Array.isArray(cases)||cases.length!==3)throw Error('Exactly three source-defined NOAA case studies required');
 return {source:'NOAA_NDBC_45004_OBSERVED',studyVersion:'offshore-case-studies-v1',
 observations:data.sourceRowsWithValidHeight,attempted:data.sourceRowsVisited,
 station:data.station,analysisNotRockExposureValidation:true,studies:cases.map(e=>analyzeEvent(e,data))};
}
module.exports={analyzeEvent,analyzeAll};
