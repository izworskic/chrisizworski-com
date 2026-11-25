'use strict';
// Offline research only. No network, mutable production state or model promotion.
const fs=require('node:fs');
const H=3600000,LEADS=[24,48],STATIONS=['45029','45161','45183','45002'];
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const water=v=>finite(v)&&v>=28&&v<=97;
const stamp=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))?Date.parse(s):NaN;
const hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const round=n=>n===null?null:Math.round(n*1000)/1000;
const ident=(site,t)=>site+'|'+t;
function url(s,host){
 try{const u=new URL(s);return u.protocol==='https:'&&u.hostname===host&&!u.username&&!u.password;}catch{return false;}
}
function summaryAudit(report){
 const leads=Object.fromEntries(LEADS.map(h=>{
  const p=report.leadResults[h+'h'];
  return [h,{reportedN:p.n,reportedPersistenceMAE_F:p.persistenceMAE_F,reportedModelChangeMAE_F:p.persistencePlusModelChangeMAE_F,
   reportedRelativeMAEReductionPct:round(100*(1-p.persistencePlusModelChangeMAE_F/p.persistenceMAE_F)),empiricalCoverage:null,bias:null,independentHoldout:null}];
 }));
 const w=report.coolingWatch;
 return {status:'AGGREGATE_ONLY_NOT_REPRODUCED',period:report.period,leads,cooling:{reportedTP:w.caught,reportedFP:w.flagged-w.caught,reportedFN:w.realDrops3F-w.caught,reportedTN:w.of-w.flagged-w.realDrops3F+w.caught,reportedPrecision:round(w.caught/w.flagged),reportedRecall:round(w.caught/w.realDrops3F)},rowLevelEvidence:false,canPromoteModel:false};
}
function evaluate(input){
 if(!input||input.schemaVersion!==1||!['synthetic','historical-review'].includes(input.kind))throw Error('Invalid schema or evidence kind');
 const cutoff=stamp(input.holdoutStartsAt),end=stamp(input.holdoutEndsAt),asOf=stamp(input.asOf);
 if(!Number.isFinite(cutoff)||!Number.isFinite(end)||!Number.isFinite(asOf)||cutoff<=Date.parse('2026-10-13T23:59:59Z')||end<=cutoff||asOf<end+48*H)throw Error('Holdout must follow original backtest and fully mature before audit');
 if(!Array.isArray(input.cohort)||!input.cohort.length||!Array.isArray(input.forecasts)||!Array.isArray(input.observations))throw Error('Explicit cohort and separate forecast/observation arrays required');
 const expected=new Map();
 for(const c of input.cohort){
  const t=stamp(c.issuedAt);
  if(!STATIONS.includes(c.station)||!Number.isFinite(t)||t<cutoff||t>=end||t%H!==0)throw Error('Invalid cohort slot');
  const key=ident(c.station,t);if(expected.has(key))throw Error('Duplicate cohort slot');expected.set(key,{station:c.station,t});
 }
 const forecasts=new Map(),observations=new Map(),conflicts=new Set(),obsConflicts=new Set();
 let invalidForecasts=0,invalidObservations=0,offCohort=0;
 for(const f of input.forecasts){
  const issue=stamp(f.issuedAt),key=ident(f.station,issue)+'|'+f.leadHours;
  if(!expected.has(ident(f.station,issue))||!LEADS.includes(f.leadHours)){offCohort++;continue;}
  const available=stamp(f.availableAt),cycle=stamp(f.modelCycleAt),valid=stamp(f.validAt),baseAt=stamp(f.baselineObservedAt),baseAvailable=stamp(f.baselineAvailableAt);
  const okay=Number.isFinite(available)&&Number.isFinite(cycle)&&cycle<=available&&available<=issue&&valid===issue+f.leadHours*H&&
   Number.isFinite(baseAt)&&Number.isFinite(baseAvailable)&&baseAt<=baseAvailable&&baseAvailable<=issue&&issue-baseAt<=6*H&&
   water(f.baselineF)&&water(f.modelChangeEstimateF)&&water(f.lowF)&&water(f.highF)&&f.lowF<=f.modelChangeEstimateF&&f.modelChangeEstimateF<=f.highF&&
   finite(f.modelChangeF)&&Math.abs(f.baselineF+f.modelChangeF-f.modelChangeEstimateF)<=0.11&&
   hash(f.forecastSha256)&&hash(f.baselineSha256)&&url(f.forecastUrl,'opendap.co-ops.nos.noaa.gov')&&url(f.baselineUrl,'www.ndbc.noaa.gov');
  if(!okay){invalidForecasts++;forecasts.delete(key);conflicts.add(key);continue;}
  const normalized={station:f.station,issue,valid,baseAt,baseAvailable,available,cycle,baselineF:f.baselineF,predictionF:f.modelChangeEstimateF,changeF:f.modelChangeF,lowF:f.lowF,highF:f.highF,forecastSha256:f.forecastSha256,baselineSha256:f.baselineSha256,forecastUrl:f.forecastUrl,baselineUrl:f.baselineUrl};
  if(conflicts.has(key))continue;
  if(forecasts.has(key)&&JSON.stringify(forecasts.get(key))!==JSON.stringify(normalized)){forecasts.delete(key);conflicts.add(key);continue;}
  forecasts.set(key,normalized);
 }
 for(const o of input.observations){
  const t=stamp(o.observedAt),available=stamp(o.availableAt),key=ident(o.station,t);
  if(!STATIONS.includes(o.station)||!Number.isFinite(t)||t<cutoff||t>asOf||!Number.isFinite(available)||available<t||available>asOf||!water(o.tempF)||o.quality!=='accepted'||o.kind!=='ndbc-buoy-observation'||!hash(o.sha256)||!url(o.sourceUrl,'www.ndbc.noaa.gov')){
   invalidObservations++;if(Number.isFinite(t)&&STATIONS.includes(o.station)){obsConflicts.add(key);observations.delete(key);}continue;
  }
  if(obsConflicts.has(key))continue;
  const normalized={tempF:o.tempF,sha256:o.sha256,available,sourceUrl:o.sourceUrl};
  if(observations.has(key)&&JSON.stringify(observations.get(key))!==JSON.stringify(normalized)){observations.delete(key);obsConflicts.add(key);continue;}
  observations.set(key,normalized);
 }
 const paired={24:[],48:[]},missing={24:{forecast:0,outcome:0},48:{forecast:0,outcome:0}};
 for(const c of expected.values())for(const h of LEADS){
  const f=forecasts.get(ident(c.station,c.t)+'|'+h);
  if(!f){missing[h].forecast++;continue;}
  const o=observations.get(ident(c.station,c.t+h*H));
  if(!o){missing[h].outcome++;continue;}
  paired[h].push({...f,actualF:o.tempF});
 }
 function metrics(rows,h){
  const n=rows.length,errors=rows.map(f=>f.predictionF-f.actualF),baseline=rows.map(f=>Math.abs(f.baselineF-f.actualF));
  const persistence=mean(baseline),mae=mean(errors.map(Math.abs));
  return {n,expected:expected.size,matchedFraction:round(n/expected.size),missing:missing[h],
   persistenceMAE_F:round(persistence),modelChangeMAE_F:round(mae),biasF:round(mean(errors)),
   relativeMAEReductionPct:persistence>0?round(100*(1-mae/persistence)):null,
   empiricalRangeCoverage:round(mean(rows.map(f=>Number(f.lowF<=f.actualF&&f.actualF<=f.highF)))),
   meanRangeWidthF:round(mean(rows.map(f=>f.highF-f.lowF))),
   byStation:Object.fromEntries(STATIONS.map(site=>{const subset=rows.filter(f=>f.station===site);return [site,{n:subset.length,maeF:round(mean(subset.map(f=>Math.abs(f.predictionF-f.actualF))))}];}))};
 }
 const cooling={tp:0,fp:0,fn:0,tn:0};
 // Same model-change watch threshold as the archived offshore study.
 for(const f of paired[24]){const flag=f.changeF<=-1.5,actual=f.actualF-f.baselineF<=-3;cooling[flag?(actual?'tp':'fp'):(actual?'fn':'tn')]++;}
 return {status:input.kind==='synthetic'?'SYNTHETIC_NOT_SKILL':'HOLDOUT_METRICS_SOURCE_REVIEW_REQUIRED',kind:input.kind,expectedSlots:expected.size,
  holdoutStartsAt:input.holdoutStartsAt,holdoutEndsAt:input.holdoutEndsAt,asOf:input.asOf,
  invalidForecasts,invalidObservations,offCohort,conflictingForecastKeys:conflicts.size,conflictingObservationKeys:obsConflicts.size,
  leads:Object.fromEntries(LEADS.map(h=>[h,metrics(paired[h],h)])),
  cooling:{...cooling,precision:cooling.tp+cooling.fp?round(cooling.tp/(cooling.tp+cooling.fp)):null,recall:cooling.tp+cooling.fn?round(cooling.tp/(cooling.tp+cooling.fn)):null},
  canPromoteModel:false,limits:['Archive hashes and publication timestamps require independent source verification; this evaluator does not fetch or authenticate source bytes.','Buoy-level model change only; no nearshore/shallow correction, water safety, calibrated probability or automatic model promotion.','Overlapping forecasts and stations may be dependent; no iid confidence intervals or significance claim.']};
}
if(require.main===module){
 try{
  const [mode,file]=process.argv.slice(2);
  if(!file||!['--summary','--holdout'].includes(mode))throw Error('Usage: node scripts/shorefeel-predictive-validation.cjs --summary data/shorefeel/backtest-2026-10.json | --holdout <reviewed-cohort.json>');
  console.log(JSON.stringify((mode==='--summary'?summaryAudit:evaluate)(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={evaluate,summaryAudit};
