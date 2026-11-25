#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),readline=require('node:readline');
const soo=require('../lib/soo-locks-next');
const study=require('../lib/soo-predictive-study.cjs');
const library=require('../lib/great-lakes-historical-library.cjs');
const prior=require('../data/freighter-history/soo-predictive-proxy-2025.json');
const DATES=Object.freeze(['2025-10-22','2025-11-05','2025-11-19','2025-12-03']);
const FROZEN=Object.freeze({offsetMinutes:49.77,radiusMinutes:74.47,sourceRun:45392249652});
const GATES=Object.freeze({minMatched:30,minPerDay:5,minDirection:10,minResolvedFraction:.7,maxMaeRatio:.8,minContainment:.8,maxWidthMinutes:150,maxWidthRatio:2,minNonWorseDays:3});
const matched=c=>c.outcome.state==='OBSERVED_CHAMBER_REFERENCE_BRACKET';
const corrected=c=>Math.max(0,c.existingMinutes+FROZEN.offsetMinutes);
const window=c=>[Math.max(0,corrected(c)-FROZEN.radiusMinutes),corrected(c)+FROZEN.radiusMinutes];
const count=(rows,key)=>Object.fromEntries([...new Set(rows.map(key))].sort().map(k=>[k,rows.filter(x=>key(x)===k).length]));
function verifyFreeze(){
 if(prior.verifiedWorkflowRun!==FROZEN.sourceRun||prior.fit.medianResidualMinutes!==FROZEN.offsetMinutes||prior.fit.diagnosticRadiusMinutes!==FROZEN.radiusMinutes)throw Error('Frozen prior changed');
}
function compare(rows){
 const existing=study.metrics(rows,c=>c.existingMinutes,c=>[c.existingLower,c.existingUpper]);
 const adjusted=study.metrics(rows,corrected,window);
 const naive=study.metrics(rows,c=>c.naiveMinutes);
 const issued=rows.length,n=existing.matched;
 return {issued,matched:n,outcomes:count(rows,c=>c.outcome.state),resolvedFraction:issued?n/issued:null,
  naive,existing,adjusted,containmentBoundsAmongIssued:issued?{existing:[existing.fullBracketContained/issued,(existing.fullBracketContained+issued-n)/issued],adjusted:[adjusted.fullBracketContained/issued,(adjusted.fullBracketContained+issued-n)/issued]}:null};
}
function summarize(days){
 verifyFreeze();
 if(!Array.isArray(days)||new Set(days.map(d=>d.date)).size!==days.length||days.some(d=>!DATES.includes(d.date)))throw Error('Unexpected or duplicate holdout date');
 const missingDates=DATES.filter(d=>!days.some(x=>x.date===d));
 const modes={};
 for(const [mode,gridMinutes] of [['originalIssue',0],['quarterHourIssue',15]]){
  const evaluated=days.map(d=>({source:d,study:study.buildCases(d,soo,{allowedDates:DATES,gridMinutes})}));
  const rows=evaluated.flatMap(x=>x.study.cases),all=compare(rows);
  const daily=evaluated.map(({source,study:s})=>({date:s.date,archiveSha256:s.archiveSha256,sourceUrl:s.sourceUrl,sourceRows:source.inputRows,fixes:s.fixes,vessels:s.vessels,noIssue:s.noIssue,conflictingTimestamps:source.regions[0].conflictingTimestamps??null,...compare(s.cases)}));
  const byDirection=Object.fromEntries(['upbound','downbound'].map(d=>[d,compare(rows.filter(c=>c.direction===d))]));
  const byReportedType=Object.fromEntries([['cargo',70,79],['tanker',80,89]].map(([label,lo,hi])=>[label,compare(rows.filter(c=>c.shipType>=lo&&c.shipType<=hi))]));
  const gates={allDates:!missingDates.length,matched:all.matched>=GATES.minMatched,perDay:!missingDates.length&&daily.every(d=>d.matched>=GATES.minPerDay),directions:Object.values(byDirection).every(d=>d.matched>=GATES.minDirection),resolution:all.resolvedFraction!==null&&all.resolvedFraction>=GATES.minResolvedFraction,mae:all.matched>0&&all.adjusted.meanAbsoluteErrorMinutes<=GATES.maxMaeRatio*all.existing.meanAbsoluteErrorMinutes,containment:all.matched>0&&all.adjusted.fullBracketContained/all.matched>=GATES.minContainment,width:all.matched>0&&all.adjusted.meanIntervalWidthMinutes<=GATES.maxWidthMinutes&&all.adjusted.meanIntervalWidthMinutes<=GATES.maxWidthRatio*all.existing.meanIntervalWidthMinutes,nonWorseDays:daily.filter(d=>d.matched&&d.adjusted.meanAbsoluteErrorMinutes<=d.existing.meanAbsoluteErrorMinutes).length>=GATES.minNonWorseDays};
  modes[mode]={all,daily,byDirection,byReportedType,distinctMatchedVessels:new Set(rows.filter(matched).map(c=>c.mmsi)).size,gates,screenPassed:Object.values(gates).every(Boolean)};
 }
 return {schemaVersion:1,kind:'SOO_OUT_OF_TIME_AIS_PROXY_VALIDATION',plannedDates:DATES,missingDates,frozen:FROZEN,thresholds:GATES,modes,officialLockEntryGroundTruth:false,productionCalibrationAuthorized:false,forecastEnabled:false,note:'One first eligible issue per reported vessel-day, not independent vessels or official lock-entry truth. Primary uses the original observed-fix issue policy; secondary uses fixed 15-minute UTC ticks and latest fix no older than five minutes. Conditional errors exclude unresolved labels; bounds reflect unknown outcomes rather than false positives. Conflicting timestamps are dropped by the original collector, a reference limitation. No tuning on these dates or production promotion.'};
}
async function main(){
 const [mode,...args]=process.argv.slice(2);
 verifyFreeze();
 if(mode==='collect'){
  const [date,sha,out]=args;
  if(args.length!==3||!DATES.includes(date))throw Error('Unexpected holdout date');
  const {parseCsvLine,noaaUtc}=await import('./cuyahoga-noaa-points.mjs');
  const day=library.createLibraryDay({date,archiveSha256:sha,regions:[{id:'soo',bbox:soo.RIVER_BBOX,reference:'lib/soo-locks-next.js:RIVER_BBOX'}],parseCsvLine,noaaUtc});
  for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity}))day.accept(line);
  fs.writeFileSync(out,JSON.stringify(day.finish())+'\n',{flag:'wx',mode:0o600});
 }else if(mode==='report'){
  const [out,...files]=args;
  if(!out||files.length>DATES.length)throw Error('report NEW_OUTPUT DAY_FILES...');
  const report=summarize(files.map(p=>{if(fs.statSync(p).size>48*1024*1024)throw Error('Oversized input');return JSON.parse(fs.readFileSync(p,'utf8'));}));
  fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(report,null,2));
  if(report.missingDates.length)process.exitCode=1;
 }else throw Error('Use collect or report');
}
module.exports={DATES,FROZEN,GATES,compare,summarize,verifyFreeze};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
