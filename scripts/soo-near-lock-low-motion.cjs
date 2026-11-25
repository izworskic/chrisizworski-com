#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),soo=require('../lib/soo-locks-next'),study=require('../lib/soo-predictive-study.cjs');
const approach=require('./soo-continuous-approach.cjs');
const prior=require('../data/freighter-history/soo-continuous-approach-actual-20261125.json');
const M=60000,STEP=5*M;
const mean=a=>a.length?Math.round(a.reduce((s,x)=>s+x,0)/a.length*100)/100:null;
const count=(rows,key)=>Object.fromEntries([...new Set(rows.map(key))].sort().map(k=>[k,rows.filter(x=>key(x)===k).length]));
const low=s=>s.band==='0_to_1'&&s.state==='low_reported_speed';
// A run is an observed grid state, never actual continuous waiting or a queue.
function runs(slots){
 const out=[];let current=null;
 function close(next,reason){
  if(!current)return;
  out.push({...current,spanMinutes:(current.last-current.first)/M,exit:next?.state??reason,
   exitObserved:!!next&&next.t-current.last===STEP,exitAt:next?.t??null});
  current=null;
 }
 for(const s of slots){
  if(current&&s.t-current.last!==STEP)close(null,'grid_gap');
  if(low(s)){
   if(!current)current={first:s.t,last:s.t,ticks:1};
   else {current.last=s.t;current.ticks++;}
  }else close(s,'unknown');
 }
 close(null,'episode_end');
 return out;
}
function analyze(first,slots){
 const r=runs(slots),o=first.outcome,matched=o.state==='OBSERVED_CHAMBER_REFERENCE_BRACKET';
 const lo=matched?Date.parse(o.previousOutsideAt):NaN,hi=matched?Date.parse(o.firstInsideAt):NaN;
 // At first observed low-speed tick, subsequently bracketed arrival is diagnostic only.
 const firstRun=r[0],eligible=firstRun&&matched&&firstRun.first<=lo;
 return {direction:first.direction,runs:r,lowTicks:r.reduce((n,x)=>n+x.ticks,0),
  initialOutcome:o.state,firstLowToBracketLower:eligible?(lo-firstRun.first)/M:null,firstLowToBracketUpper:eligible?(hi-firstRun.first)/M:null,
  anyForecastAfterLow:!!firstRun&&slots.some(s=>s.t>firstRun.first&&s.state==='forecast_available'),
  firstRunExit:firstRun?.exit??null};
}
function aggregate(rows){
 const selected=rows.filter(r=>r.runs.length),all=selected.flatMap(r=>r.runs);
 const labeled=selected.filter(r=>r.firstLowToBracketLower!==null);
 return {episodes:rows.length,episodesWithLow:selected.length,runs:all.length,lowTicks:all.reduce((n,r)=>n+r.ticks,0),
  oneTickRuns:all.filter(r=>r.ticks===1).length,runExitStates:count(all,r=>r.exit),runDurationBands:count(all,r=>r.spanMinutes===0?'single_tick':r.spanMinutes<=10?'5_to_10':r.spanMinutes<=30?'15_to_30':'35_plus'),
  meanObservedSpanMinutes:mean(all.map(r=>r.spanMinutes)),maxObservedSpanMinutes:all.length?Math.max(...all.map(r=>r.spanMinutes)):null,
  episodesWithLaterForecast:selected.filter(r=>r.anyForecastAfterLow).length,firstRunExitStates:count(selected,r=>r.firstRunExit),
  initialOutcomes:count(selected,r=>r.initialOutcome),matchedFirstLowEpisodes:labeled.length,
  meanFirstLowToReferenceLowerMinutes:mean(labeled.map(r=>r.firstLowToBracketLower)),meanFirstLowToReferenceUpperMinutes:mean(labeled.map(r=>r.firstLowToBracketUpper))};
}
function evaluate(days){
 const baseline=approach.evaluate(days);
 if(baseline.allSlots!==prior.allSlots||JSON.stringify(baseline.bands)!==JSON.stringify(prior.bands))throw Error('Prior continuous approach evidence mismatch');
 const rows=[];
 for(const day of days){
  const s=study.buildCases(day,soo,{gridMinutes:15});
  const tracks=new Map(day.regions.find(r=>r.id==='soo').tracks.map(t=>[t.mmsi,t]));
  for(const first of s.cases){
   const track=tracks.get(first.mmsi),v=track.points.map(p=>({mmsi:track.mmsi,seen:p[0],lat:p[1],lon:p[2],speedKnots:typeof p[3]==='number'&&p[3]>=0&&p[3]<=40?p[3]:null,course:typeof p[4]==='number'&&p[4]>=0&&p[4]<=359.9?p[4]:null,heading:typeof p[5]==='number'&&p[5]>=0&&p[5]<=359?p[5]:null,shipType:p[6],lengthMeters:typeof p[7]==='number'&&p[7]>=1&&p[7]<=500?p[7]:null}));
   rows.push(analyze(first,approach.replay(first,v,soo)));
  }
 }
 const all=aggregate(rows);
 if(all.lowTicks!==prior.bands['0_to_1'].states.low_reported_speed)throw Error('Low motion count mismatch');
 return {schemaVersion:1,kind:'SOO_NEAR_LOCK_LOW_MOTION_DEVELOPMENT',sourceRun:45390603940,priorRun:45612405911,dates:study.DATES,all,byDirection:Object.fromEntries(['upbound','downbound'].map(d=>[d,aggregate(rows.filter(x=>x.direction===d))])),freshHoldout:false,officialLockEntryGroundTruth:false,productionCalibrationAuthorized:false,forecastEnabled:false,note:'Consecutive fresh five-minute grid low reported speed states within 1 NM, observed span only, not continuous stop duration or confirmed waiting. Missing/other states break runs. Later forecast and first-low-to-bracket are retrospective diagnostics only. No countdown, queue inference, model fit, probability or production change.'};
}
module.exports={runs,analyze,aggregate,evaluate};
if(require.main===module){
 const [out,...files]=process.argv.slice(2);
 if(!out||files.length!==3)throw Error('report NEW_OUTPUT THREE_ORIGINAL_DAY_FILES');
 const j=evaluate(files.map(p=>{if(fs.statSync(p).size>48*1024*1024)throw Error('Oversized input');return JSON.parse(fs.readFileSync(p,'utf8'));}));
 fs.writeFileSync(out,JSON.stringify(j,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify(j,null,2));
}
