#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const soo=require('../lib/soo-locks-next');
const study=require('../lib/soo-predictive-study.cjs');
const prior=require('../data/freighter-history/soo-predictive-proxy-2025.json');
const DATES=study.DATES;
const DIRECTIONS=['upbound','downbound'];
const POLICY=Object.freeze({gridMinutes:15,minTrainPerGroup:3,shrinkage:4,capMinutes:45,extraEachSide:6,minMatched:20,minDirection:8,minCorrectedFraction:.7,maxMaeRatio:.9,minContainment:.8,maxWidth:90});
const matched=c=>c.outcome.state==='OBSERVED_CHAMBER_REFERENCE_BRACKET';
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length?(b[(b.length-1)>>1]+b[b.length>>1])/2:null;};
const round=x=>Math.round(x*100)/100;
function progress(rows,c,t,engine=soo){
 const route=engine.ROUTES[c.direction==='upbound'?'lowerUpbound':'upper'];
 if(!DIRECTIONS.includes(c.direction)||!route)return {state:'unsupported'};
 const recent=rows.filter(v=>{const age=t-Date.parse(v.seen);return age>=0&&age<=12*60000;});
 if(recent.length<4||Date.parse(recent.at(-1).seen)-Date.parse(recent[0].seen)<6*60000)return {state:'insufficient_history'};
 const projected=recent.map(v=>({t:Date.parse(v.seen),...engine.project(route,[v.lat,v.lon])}));
 if(projected.some(p=>!Number.isFinite(p.alongNm)||!Number.isFinite(p.lateralNm)||p.lateralNm>.8))return {state:'off_route'};
 const speeds=[];
 for(let i=1;i<projected.length;i++){
  const a=projected[i-1],b=projected[i],dt=(b.t-a.t)/3600000,delta=a.alongNm-b.alongNm;
  if(dt<=0||dt>5/60||delta<-.03||Math.abs(delta/dt)>25)return {state:'discontinuous'};
  speeds.push(Math.max(0,delta/dt));
 }
 const knots=median(speeds),sog=recent.at(-1).speedKnots;
 if(!Number.isFinite(sog)||sog<=0)return {state:'missing_speed'};
 return {state:knots<.8||knots/sog<.5?'slow_progress':knots/sog>1.25?'disagreement':'supported',medianProgressKnots:round(knots),progressToReportedSpeed:round(knots/sog)};
}
function fit(train,query,directional){
 const eligible=train.filter(c=>matched(c)&&c.date!==query.date&&c.mmsi!==query.mmsi&&(!directional||c.direction===query.direction));
 const n=eligible.length,unique=new Set(eligible.map(c=>c.mmsi)).size;
 if(n<POLICY.minTrainPerGroup||unique<POLICY.minTrainPerGroup)return {shift:0,supported:false,n};
 const residual=median(eligible.map(c=>c.outcome.midpointMinutes-c.existingMinutes));
 return {shift:Math.max(-POLICY.capMinutes,Math.min(POLICY.capMinutes,residual*n/(n+POLICY.shrinkage))),supported:true,n};
}
function prediction(c,fit){
 const midpoint=Math.max(0,c.existingMinutes+fit.shift);
 if(!fit.supported)return {midpoint,window:[c.existingLower,c.existingUpper]};
 return {midpoint,window:[Math.max(0,midpoint-(c.existingMinutes-c.existingLower)-POLICY.extraEachSide),midpoint+(c.existingUpper-c.existingMinutes)+POLICY.extraEachSide]};
}
function score(rows){
 const compare=(key)=>study.metrics(rows,c=>c[key].midpoint,c=>c[key].window);
 const n=rows.filter(matched).length;
 const supported=rows.filter(c=>c.directionFit.supported).length;
 return {issued:rows.length,matched:n,unresolved:rows.length-n,correctedEligible:supported,
 existing:study.metrics(rows,c=>c.existingMinutes,c=>[c.existingLower,c.existingUpper]),global:compare('global'),directional:compare('directional'),
 outcomeCounts:Object.fromEntries([...new Set(rows.map(c=>c.outcome.state))].sort().map(k=>[k,rows.filter(c=>c.outcome.state===k).length])),
 meanShiftMinutes:rows.length?round(rows.reduce((s,c)=>s+c.directionFit.shift,0)/rows.length):null};
}
function evaluate(days,engine=soo){
 if(!Array.isArray(days)||days.length!==DATES.length||[...days].map(d=>d.date).sort().join('|')!==DATES.join('|'))throw Error('Require exactly original three spent dates');
 const evaluated=days.map(d=>study.buildCases(d,engine,{allowedDates:DATES,gridMinutes:POLICY.gridMinutes,issueFeatures:(rows,c,t)=>progress(rows,c,t,engine)}));
 const expected=prior.groups;
 for(const d of evaluated){const p=expected.find(x=>x.date===d.date);if(!p||p.fixes!==d.fixes||p.vessels!==d.vessels)throw Error('Prior archive coverage mismatch');}
 const cases=evaluated.flatMap(d=>d.cases);
 const rows=cases.map(c=>{
  const directionFit=fit(cases,c,true),globalFit=fit(cases,c,false);
  return {...c,directionFit,global:prediction(c,globalFit),directional:prediction(c,directionFit)};
 });
 const all=score(rows),byDirection=Object.fromEntries(DIRECTIONS.map(d=>[d,score(rows.filter(c=>c.direction===d))]));
 const byDistance=Object.fromEntries([['5_to_10_nm',5,10],['10_to_15_nm',10,15.01]].map(([key,lo,hi])=>[key,score(rows.filter(c=>c.channelNm>=lo&&c.channelNm<hi))]));
 const byLead=Object.fromEntries([['under_60_min',0,60],['60_to_120_min',60,120],['120_plus_min',120,481]].map(([key,lo,hi])=>[key,score(rows.filter(c=>c.existingMinutes>=lo&&c.existingMinutes<hi))]));
 const byMotion=Object.fromEntries(['supported','slow_progress','disagreement','insufficient_history','off_route','discontinuous','missing_speed','unsupported'].map(k=>[k,score(rows.filter(c=>c.features?.state===k))]));
 const daily=evaluated.map(d=>({date:d.date,archiveSha256:d.archiveSha256,fixes:d.fixes,vessels:d.vessels,noIssue:d.noIssue,...score(rows.filter(c=>c.date===d.date))}));
 const g={matched:all.matched>=POLICY.minMatched,directions:Object.values(byDirection).every(d=>d.matched>=POLICY.minDirection),correctedCoverage:all.issued>0&&all.correctedEligible/all.issued>=POLICY.minCorrectedFraction,mae:all.matched>0&&all.directional.meanAbsoluteErrorMinutes<=POLICY.maxMaeRatio*all.existing.meanAbsoluteErrorMinutes,directionNonWorse:Object.values(byDirection).every(d=>d.matched>0&&d.directional.meanAbsoluteErrorMinutes<=d.existing.meanAbsoluteErrorMinutes),containment:all.matched>0&&all.directional.fullBracketContained/all.matched>=POLICY.minContainment,width:all.matched>0&&all.directional.meanIntervalWidthMinutes<=POLICY.maxWidth&&all.directional.meanIntervalWidthMinutes<=all.existing.meanIntervalWidthMinutes+12};
 return {schemaVersion:1,kind:'SOO_DIRECTIONAL_DEVELOPMENT_CROSS_FIT',dates:DATES,policy:POLICY,sourceRun:45390603940,all,byDirection,byDistance,byLead,byMotion,daily,gates:g,screenPassed:Object.values(g).every(Boolean),freshHoldout:false,productionCalibrationAuthorized:false,officialLockEntryGroundTruth:false,forecastEnabled:false,note:'All three dates previously inspected; leave-date-out and exclude same MMSI from training for each prediction. Not chronological independent validation. Conditional matched errors; no fit on later four-date holdout. Progress strata are descriptive, not fitted or inferred queue causes. Unknown outcomes remain unresolved.'};
}
module.exports={progress,fit,prediction,score,evaluate,POLICY};
if(require.main===module){
 const [out,...files]=process.argv.slice(2);
 if(!out||files.length!==3)throw Error('report NEW_OUTPUT THREE_ORIGINAL_DAY_FILES');
 const result=evaluate(files.map(p=>{if(fs.statSync(p).size>48*1024*1024)throw Error('Oversized input');return JSON.parse(fs.readFileSync(p,'utf8'));}));
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify(result,null,2));
}
