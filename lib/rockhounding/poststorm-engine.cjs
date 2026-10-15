'use strict';
// Research-only NOAA GLWU directional wave assessment. Not a safety/stone forecast.
const HOUR=3600000;
const TARGET_PARAMETERS=['HTSGW','WVHGT','WVPER','WVDIR'];
const RESEARCH_CONFIG=Object.freeze({lookbackHours:72,maxAnalysisAgeHours:6,minHistorySamples:10,maxHistoryGapHours:7,maxForecastGapHours:4,baselineDays:14,minBaselineSamples:36,eventMultiplier:1.6,settlingFraction:0.55,minEventLeadHours:4,forecastHours:12});
function validDate(s){return typeof s==='string'&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;}
function angularDiff(a,b){return Math.abs((a-b+540)%360-180);}
function percentile(vals,p){const s=[...vals].sort((a,b)=>a-b);if(!s.length)return null;const i=(s.length-1)*p,j=Math.floor(i),t=i-j;return s[j]+t*(s[Math.ceil(i)]-s[j]);}
function validateWave(row){
 if(!row||row.source!=='NOAA_GLWU'||!['MODEL_ANALYSIS','MODEL_FORECAST'].includes(row.phase)||
    !validDate(row.validAt)||!validDate(row.modelCycleAt)||!row.cellId||
    !Array.isArray(row.variables)||TARGET_PARAMETERS.some(x=>!row.variables.includes(x)))return false;
 if(!Number.isFinite(row.htsgwM)||row.htsgwM<0||row.htsgwM>18||
    !Number.isFinite(row.windWaveHeightM)||row.windWaveHeightM<0||row.windWaveHeightM>18||
    !Number.isFinite(row.windWavePeriodS)||row.windWavePeriodS<=0||row.windWavePeriodS>30||
    !Number.isFinite(row.windWaveFromDeg)||row.windWaveFromDeg<0||row.windWaveFromDeg>=360)return false;
 if(row.phase==='MODEL_ANALYSIS'&&Math.abs(Date.parse(row.validAt)-Date.parse(row.modelCycleAt))>HOUR)return false;
 if(row.phase==='MODEL_FORECAST'&&Date.parse(row.validAt)<=Date.parse(row.modelCycleAt))return false;
 return row.windWaveHeightM<=row.htsgwM+0.75;
}
function uniqueByValid(rows){
 const map=new Map();
 for(const r of rows){const prev=map.get(r.validAt);if(!prev||r.modelCycleAt>prev.modelCycleAt)map.set(r.validAt,r);}
 return [...map.values()].sort((a,b)=>a.validAt.localeCompare(b.validAt));
}
function regularEnough(rows,maxGapHours){
 for(let i=1;i<rows.length;i++)if(Date.parse(rows[i].validAt)-Date.parse(rows[i-1].validAt)>maxGapHours*HOUR)return false;
 return true;
}
function coastProxy(row,bearing){
 if(!Number.isFinite(bearing))return null;
 const diff=angularDiff(row.windWaveFromDeg,bearing);
 const shoreward=Math.max(0,Math.cos(diff*Math.PI/180));
 return {relativeExposure:row.windWaveHeightM**2*row.windWavePeriodS*shoreward,alignment:shoreward,
 heightM:row.htsgwM,windWaveFromDeg:row.windWaveFromDeg,method:'UNCALIBRATED_DIRECTIONAL_H2T'};
}
function chooseCell(site,rows){
 const cell=site?.modelCell;
 if(!cell||cell.reviewStatus!=='WET_CELL_VERIFIED'||!cell.id||!Number.isFinite(cell.distanceFromBeachKm)||
 cell.distanceFromBeachKm>7||cell.distanceFromBeachKm<0)return {status:'CELL_NOT_VERIFIED'};
 return {status:'CELL_RECORDED',rows:rows.filter(x=>x.cellId===cell.id&&validateWave(x))};
}
function assessPostStorm({site,history=[],forecast=[],baseline=[],nowISO,hazards={status:'UNKNOWN'},peerCellId=null,config=RESEARCH_CONFIG}={}){
 const result={siteId:site?.id||null,kind:'POST_STORM_RESEARCH',status:'SOURCE_UNAVAILABLE',visitWindow:'NOT_ASSESSED',
 canPublishSearchWindow:false,canClaimNewStones:false,canClaimSafeConditions:false,confidence:'NOT_CALIBRATED',
 notes:[],evidence:null,source:'NOAA_GLWU_GRIDDED_MODEL_NOT_SHORE_OBSERVATION'};
 const now=Date.parse(nowISO);if(!Number.isFinite(now))return {...result,status:'INVALID_TIME'};
 if(!site||!Array.isArray(history)||!Array.isArray(forecast)||!Array.isArray(baseline))return result;
 const selected=chooseCell(site,[...history,...forecast,...baseline]);
 if(selected.status!=='CELL_RECORDED')return {...result,status:selected.status};
 const bearing=site?.shore?.outwardBearingDeg;
 if(site?.shore?.reviewStatus!=='REVIEWED_WATERLINE'||!Number.isFinite(bearing)||bearing<0||bearing>=360)
 return {...result,status:'SHORE_ORIENTATION_UNVERIFIED'};
 if(site.sheltering==='UNRESOLVED'||site.sheltering==='SHELTERED_BAY_UNRESOLVED')
 return {...result,status:'BAY_NOT_RESOLVED_BY_GRID',notes:['A sheltered harbor cannot be inferred from an offshore 2.5 km wet cell']};
 if(peerCellId&&peerCellId===site.modelCell.id)
 result.notes.push('Exposed beach and harbor share model wet cell; independent comparison not possible');
 if(hazards.status==='ACTIVE')return {...result,status:'HAZARD_VETO',notes:[...result.notes,'Active hazard or closure blocks a visit window']};
 const hist=uniqueByValid(selected.rows.filter(r=>r.phase==='MODEL_ANALYSIS'&&Date.parse(r.validAt)<=now&&Date.parse(r.validAt)>=now-config.lookbackHours*HOUR));
 if(!hist.length)return {...result,status:'INSUFFICIENT_HISTORY'};
 if(now-Date.parse(hist.at(-1).validAt)>config.maxAnalysisAgeHours*HOUR)return {...result,status:'STALE_MODEL_ANALYSIS'};
 if(hist.length<config.minHistorySamples||!regularEnough(hist,config.maxHistoryGapHours))
 return {...result,status:'INSUFFICIENT_HISTORY',notes:[...result.notes,'Need archived model analyses, not historic model forecasts']};
 const base=uniqueByValid(selected.rows.filter(r=>r.phase==='MODEL_ANALYSIS'&&Date.parse(r.validAt)<now-config.lookbackHours*HOUR&&Date.parse(r.validAt)>=now-(config.baselineDays*24+config.lookbackHours)*HOUR));
 if(base.length<config.minBaselineSamples)
 return {...result,status:'INSUFFICIENT_BASELINE',notes:[...result.notes,'Need a retained historical model-analysis baseline']};
 const past=hist.map(r=>({...r,proxy:coastProxy(r,bearing)}));
 const referenceP75=percentile(base.map(r=>coastProxy(r,bearing).relativeExposure),0.75);
 const peak=past.reduce((a,b)=>a.proxy.relativeExposure>=b.proxy.relativeExposure?a:b);
 const peakValue=peak.proxy.relativeExposure,current=past.at(-1),currentValue=current.proxy.relativeExposure;
 const peakAgeHours=(now-Date.parse(peak.validAt))/HOUR;
 const ratio=referenceP75>0?peakValue/referenceP75:null;
 const elevated=ratio!==null&&ratio>=config.eventMultiplier;
 const dropFraction=peakValue>0?currentValue/peakValue:null;
 const declining=dropFraction!==null&&dropFraction<=config.settlingFraction&&peakAgeHours>=config.minEventLeadHours;
 const upcoming=uniqueByValid(selected.rows.filter(r=>r.phase==='MODEL_FORECAST'&&Date.parse(r.validAt)>now&&Date.parse(r.validAt)<=now+config.forecastHours*HOUR));
 const projected=upcoming.map(r=>coastProxy(r,bearing).relativeExposure);
 const forecastsAvailable=upcoming.length>=3&&regularEnough(upcoming,config.maxForecastGapHours)&&
 Date.parse(upcoming[0].validAt)<=now+config.maxForecastGapHours*HOUR&&
 Date.parse(upcoming.at(-1).validAt)>=now+(config.forecastHours-3)*HOUR;
 const holdsDown=forecastsAvailable&&projected.every(v=>v<peakValue*config.settlingFraction);
 result.evidence={modelCell:site.modelCell.id,latestAnalysis:hist.at(-1).validAt,modelAnalysisCount:hist.length,
 baselineAnalysisCount:base.length,peakAt:peak.validAt,peakHeightM:peak.htsgwM,
 peakWindWaveFromDeg:peak.windWaveFromDeg,peakRelativeProxy:+peakValue.toFixed(3),
 baselineProxyP75:+referenceP75.toFixed(3),relativeToBaselineP75:ratio===null?null:+ratio.toFixed(2),
 currentRelativeToPeak:dropFraction===null?null:+dropFraction.toFixed(2),forecastPoints:upcoming.length,
 forecastCoverage:forecastsAvailable?'SUFFICIENT':'UNAVAILABLE_OR_GAPPY',projection:'PRELIMINARY_UNCALIBRATED'};
 if(!elevated)return {...result,status:ratio===null?'BASELINE_ZERO_OR_UNRESOLVED':'NO_RELATIVE_DISTURBANCE_SIGNAL'};
 if(!declining)return {...result,status:'MODEL_DISTURBANCE_ONGOING'};
 if(!forecastsAvailable)return {...result,status:'SETTLING_CANDIDATE_FORECAST_INCOMPLETE'};
 if(!holdsDown)return {...result,status:'WAVES_MAY_REBUILD'};
 if(hazards.status!=='CLEAR')return {...result,status:'SETTLING_CANDIDATE_HAZARDS_UNKNOWN'};
 return {...result,status:'RESEARCH_SETTLING_CANDIDATE',visitWindow:'NOT_ASSESSED',
 notes:[...result.notes,'Directional wave proxy suggests moderation; field calibration and safety checks required']};
}
module.exports={RESEARCH_CONFIG,TARGET_PARAMETERS,validateWave,coastProxy,assessPostStorm,chooseCell,percentile};
