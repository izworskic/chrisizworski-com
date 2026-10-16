'use strict';
// Current measured OFFSHORE wave context near Grand Marais, Michigan.
// Photos are not required to observe waves. Waves do not establish exposed
// agates, shore safety, legal access, or harbor surf heights.
const {checkRow}=require('./glos-spotter-event-ledger.cjs');
const H=3600000,THRESHOLD=1; // DESCRIPTIVE research episode grouping, not a safety threshold
const DENIAL=Object.freeze({
 photosRequired:false,canPredictNewAgates:false,canClaimNewlyExposedStones:false,
 canPublishSafeVisitWindow:false,canClaimBeachSafety:false,
 canEstimateAgateFindProbability:false,canInferBayshoreSurf:false,
 measuredBreakingSurfM:null,rockExposureScore:null
});
const validTime=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&
 /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s);
function maxGapHours(rows){
 let n=0;for(let i=1;i<rows.length;i++)n=Math.max(n,(Date.parse(rows[i].time)-Date.parse(rows[i-1].time))/H);
 return n;
}
function analyzeObserved(rows,{nowISO,hazardStatus='UNKNOWN'}={}){
 if(!validTime(nowISO)||!['ACTIVE','CLEAR','UNKNOWN'].includes(hazardStatus))
  throw Error('Unknown clock or separate NWS alert assessment');
 if(!Array.isArray(rows)||rows.length>650)throw Error('Provider observation rows not bounded');
 const now=Date.parse(nowISO);
 const byTime=new Map();
 for(const original of rows){
  const r=checkRow(original),at=Date.parse(r.time);
  if(at>now+5*60000)throw Error('Future GLOS record rejected');
  if(at<now-96*H)continue;
  if(byTime.has(r.time)&&JSON.stringify(byTime.get(r.time))!==JSON.stringify(r))
   throw Error('Conflicting original GLOS timestamps rejected');
  byTime.set(r.time,r);
 }
 const series=[...byTime.values()].sort((a,b)=>a.time.localeCompare(b.time));
 const latest=series.at(-1),age=latest?(now-Date.parse(latest.time))/H:null;
 let phase='NO_OFFSHORE_SOURCE_OBSERVATIONS',reason='No original buoy wave observations were returned.';
 let gap=null,peak=null,declineFraction=null,rebuilding=false,coverage=false;
 const sample48=series.filter(r=>now-Date.parse(r.time)<=48*H);
 const last12=series.filter(r=>latest&&Date.parse(r.time)>=Date.parse(latest.time)-12*H);
 const last6=series.filter(r=>latest&&Date.parse(r.time)>=Date.parse(latest.time)-6*H);
 if(latest){
  gap=last12.length>1?+maxGapHours(last12).toFixed(2):null;
  peak=sample48.reduce((a,b)=>!a||b.waveHeightM>a.waveHeightM?b:a,null);
  coverage=last12.length>=12&&gap!==null&&gap<=1.5&&last6.length>=6;
  if(age>3){
   phase='OFFSHORE_SENSOR_STALE';
   reason='The Grand Marais buoy has stopped reporting recently enough for a current wave signal.';
  }else if(!coverage){
   phase='OFFSHORE_OBSERVATIONS_GAPPY';
   reason='Recent offshore wave samples are too sparse or interrupted to interpret an event phase.';
  }else if(!peak){
   phase='NO_RECENT_WAVE_CONTEXT';
   reason='No valid 48-hour measured wave context.';
  }else{
   const peakTime=Date.parse(peak.time);
   const after=series.filter(r=>Date.parse(r.time)>=peakTime&&Date.parse(r.time)<=Date.parse(latest.time));
   const trough=after.reduce((a,b)=>!a||b.waveHeightM<a.waveHeightM?b:a,null);
   const hasTrough=trough&&Date.parse(trough.time)>peakTime&&
      trough.waveHeightM<=peak.waveHeightM*.65;
   rebuilding=!!(hasTrough&&latest.waveHeightM>=THRESHOLD&&
     latest.waveHeightM>=trough.waveHeightM*1.3&&
     Date.parse(latest.time)>Date.parse(trough.time)+H);
   const elevated=latest.waveHeightM>=THRESHOLD;
   const peakIsDistinct=peak.waveHeightM>=THRESHOLD;
   const decline=peakIsDistinct&&peakTime<=Date.parse(latest.time)-4*H&&
     latest.waveHeightM<=peak.waveHeightM*.65;
   const last3=last6.filter(r=>Date.parse(r.time)>=Date.parse(latest.time)-3*H);
   const consistentlyLower=last3.length>=4&&last3.every(r=>r.waveHeightM<=peak.waveHeightM*.7);
   if(rebuilding){
    phase='OFFSHORE_WAVES_REBUILDING';
    reason='Measured offshore waves rose again after a documented lower interval.';
   }else if(elevated){
    phase='OFFSHORE_WAVES_ELEVATED';
    reason='Recent open-lake observations meet a descriptive one-meter wave grouping threshold.';
   }else if(decline&&consistentlyLower){
    phase='OFFSHORE_WAVES_EASING';
    reason='Repeated measured offshore readings are lower than a recent elevated peak; shoreline conditions are not known.';
   }else if(peakIsDistinct){
    phase='RECENT_OFFSHORE_WAVE_ACTIVITY';
    reason='A recent elevated offshore wave was measured, but sustained settling is unconfirmed.';
   }else{
    phase='LOWER_OFFSHORE_WAVE_ACTIVITY';
    reason='Recent buoy observations remain below the descriptive one-meter grouping threshold; NOT a calm-beach or safety assessment.';
   }
   declineFraction=peak.waveHeightM>0?+(1-latest.waveHeightM/peak.waveHeightM).toFixed(3):null;
  }
 }
 return {
  schemaVersion:'rockhounding-photo-free-live-offshore-pulse-v1',
  siteId:'grand-marais-agate',stationId:'SPOT-1361',stationLocation:'OPEN_LAKE_NORTH_OF_GRAND_MARAIS',
  calculatedAtUTC:nowISO,
  status:phase,explanation:reason,sourceMode:'ORIGINAL_MEASURED_GLOS_OFFSHORE_ONLY',
  observedSampleCount:series.length,recent48hCount:sample48.length,
  recent12hCount:last12.length,maxRecentGapHours:gap,
  latestMeasuredAtUTC:latest?.time??null,
  latestObservationAgeHours:age===null?null:+age.toFixed(2),
  latestOffshoreSignificantWaveHeightM:latest?.waveHeightM??null,
  latestOffshoreWaveFromDeg:latest?.waveFromDeg??null,
  latestOffshoreMeanPeriodS:latest?.meanPeriodS??null,
  peakLast48hM:peak?.waveHeightM??null,
  peakLast48hUTC:peak?.time??null,
  fractionalDeclineFrom48hPeak:declineFraction,
  waveRebuildDetected:rebuilding,
  recentMeasurementCoverageSufficient:coverage,
  sourceFresh:latest!==undefined&&age<=3,
  latest48hObservedSeries:sample48.slice(-96).map(r=>({t:r.time,h:r.waveHeightM,from:r.waveFromDeg})),
  hazardStatus,hazardCaveat:hazardStatus==='ACTIVE'?
   'Relevant NWS marine or shoreline warning/advisory active. Avoid using wave trends as a reason to enter hazardous water.' :
   hazardStatus==='UNKNOWN'?'Current NWS alert check unavailable or incomplete. Do not infer safe conditions.':
   'No relevant alert returned in checked NWS feeds. This is NOT a shoreline safety clearance.',
  thresholdMeaning:'1.0 m identifies measured open-lake wave activity for descriptive research only; not an NWS hazard limit',
  bayshoreStatus:'NO_PROTECTED_HARBOR_WAVE_MEASUREMENT',
  sourceLinks:{
   observations:'https://seagull-erddap.glos.org/erddap/info/obs_140/index.html',
   nws:'https://www.weather.gov/mqt/'
  },
  ...DENIAL
 };
}
module.exports={analyzeObserved,THRESHOLD,DENIAL};
