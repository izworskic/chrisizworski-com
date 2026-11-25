#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const soo=require('../lib/soo-locks-next');
const study=require('../lib/soo-predictive-study.cjs');
const prior=require('../data/freighter-history/soo-directional-development-actual-20261125.json');
const {progress}=require('./soo-direction-aware-development.cjs');
const DATES=study.DATES,M=60000;
const POLICY=Object.freeze({initialGridMinutes:15,updateGridMinutes:5,maxAgeMinutes:5,horizonMinutes:480,maxLateralNm:.8});
const BANDS=['10_to_15','5_to_10','3_to_5','1_to_3','0_to_1'];
const finite=(x,lo,hi)=>typeof x==='number'&&Number.isFinite(x)&&x>=lo&&x<=hi;
const round=x=>Math.round(x*100)/100;
const mean=a=>a.length?round(a.reduce((s,x)=>s+x,0)/a.length):null;
const count=(rows,key)=>Object.fromEntries([...new Set(rows.map(key))].sort().map(k=>[k,rows.filter(x=>key(x)===k).length]));
function band(n){
 if(!finite(n,0,15))return null;
 return n>10?BANDS[0]:n>5?BANDS[1]:n>3?BANDS[2]:n>1?BANDS[3]:BANDS[4];
}
function normalize(track){
 return track.points.map(p=>({mmsi:track.mmsi,seen:p[0],lat:p[1],lon:p[2],speedKnots:finite(p[3],0,40)?p[3]:null,course:finite(p[4],0,359.9)?p[4]:null,heading:finite(p[5],0,359)?p[5]:null,shipType:p[6],lengthMeters:finite(p[7],1,500)?p[7]:null}));
}
function geometry(v,direction,engine){
 const upper=v.lon<engine.LOCK_POINT[1]-.004&&v.lat>46.43;
 if(upper!==(direction==='downbound'))return {state:'other_side',band:null};
 const p=engine.project(engine.ROUTES[upper?'upper':'lowerUpbound'],[v.lat,v.lon]);
 if(!p||!finite(p.alongNm,0,1000)||!finite(p.lateralNm,0,POLICY.maxLateralNm))return {state:'off_route',band:null};
 if(!upper){
  const down=engine.project(engine.ROUTES.lowerDownbound,[v.lat,v.lon]);
  if(down&&down.lateralNm+.15<p.lateralNm)return {state:'other_route',band:null};
 }
 const nm=Math.round(p.alongNm*10)/10;
 return {state:band(nm)?'in_band':'outside_distance',band:band(nm),nm};
}
function replay(first,rows,engine=soo){
 const start=Date.parse(first.issuedAt),dayEnd=Date.parse(first.date+'T00:00:00Z')+86400000,end=Math.min(dayEnd,start+POLICY.horizonMinutes*M);
 if(!Number.isFinite(start)||start% (POLICY.initialGridMinutes*M)!==0||start>=end)throw Error('Invalid initial issue');
 const slots=[];let cursor=-1,closed=false,previous=null;
 for(let t=start;t<end;t+=POLICY.updateGridMinutes*M){
  while(cursor+1<rows.length&&Date.parse(rows[cursor+1].seen)<=t){
   cursor++;
   if(Date.parse(rows[cursor].seen)>=start&&study.strictChamber(rows[cursor],engine.LOCKS))closed=true;
  }
  const v=rows[cursor];let state,b=null,f=null,motion=null;
  if(closed)state='after_observed_chamber';
  else if(!v||t-Date.parse(v.seen)>POLICY.maxAgeMinutes*M)state='stale_or_missing';
  else if(!engine.inBox(v,engine.RIVER_BBOX))state='outside_region';
  else {
   const g=geometry(v,first.direction,engine);b=g.band;
   if(!b)state=g.state;
   else if(engine.inChamber(v))state='model_chamber_presence';
   else if(!finite(v.speedKnots,0,40)||!finite(v.course,0,359.9))state='missing_motion';
   else if(v.speedKnots<1.5)state='low_reported_speed';
   else {
    const c=engine.buildCandidate(v,t);
    if(!c||c.confidence<.52)state='model_abstained';
    else if(c.direction!==first.direction)state='direction_changed';
    else {
     const midpoint=Date.parse(c.window.midpoint),lo=Date.parse(c.window.start),hi=Date.parse(c.window.end);
     if(![midpoint,lo,hi].every(Number.isFinite)||!(t<=lo&&lo<=midpoint&&midpoint<=hi))throw Error('Invalid forecast');
     state='forecast_available';f={midpoint,lo,hi,naive:t+c.channelNmToLocks/v.speedKnots*60*M};
     motion=progress(rows.slice(0,cursor+1),c,t,engine).state;
    }
   }
  }
  const transition=previous?.f&&!f?'withdrawn':previous&&!previous.f&&f?'resumed':null;
  const revision=previous?.f&&f?(f.midpoint-previous.f.midpoint)/M:null;
  const slot={t,state,band:b,f,motion,transition,revision};slots.push(slot);previous=slot;
 }
 if(!slots[0]?.f||Math.abs((slots[0].f.midpoint-start)/M-first.existingMinutes)>1e-7)throw Error('Initial replay does not reproduce owning model');
 return slots;
}
function score(first,slots){
 const o=first.outcome,matched=o.state==='OBSERVED_CHAMBER_REFERENCE_BRACKET';
 const lo=matched?Date.parse(o.previousOutsideAt):NaN,hi=matched?Date.parse(o.firstInsideAt):NaN;
 const scored=slots.filter(s=>s.f&&matched&&s.t<=lo).map(s=>({error:Math.abs(s.f.midpoint-(lo+hi)/2)/M,naiveError:Math.abs(s.f.naive-(lo+hi)/2)/M,contained:Number(s.f.lo<=lo&&s.f.hi>=hi),width:(s.f.hi-s.f.lo)/M,warning:(lo-s.t)/M,signed:(s.f.midpoint-(lo+hi)/2)/M}));
 return {slots:slots.length,states:count(slots,s=>s.state),available:slots.filter(s=>s.f).length,matchedUpdates:scored.length,
  episodeMAE:mean(scored.map(s=>s.error)),episodeNaiveMAE:mean(scored.map(s=>s.naiveError)),episodeContainment:mean(scored.map(s=>s.contained)),episodeWidth:mean(scored.map(s=>s.width)),episodeWarning:mean(scored.map(s=>s.warning)),episodeSignedError:mean(scored.map(s=>s.signed)),
  firstAvailableWarning:scored.length?round(scored[0].warning):null,motionStates:count(slots.filter(s=>s.f),s=>s.motion)};
}
function summarize(episodes,filter){
 const rows=episodes.map(e=>score(e.first,e.slots.filter(filter))).filter(x=>x.slots);
 const sum=k=>rows.reduce((s,x)=>s+x[k],0),combine=k=>rows.reduce((out,x)=>{for(const [n,v] of Object.entries(x[k]))out[n]=(out[n]||0)+v;return out;},{});
 const matched=rows.filter(x=>x.matchedUpdates),avg=k=>mean(matched.map(x=>x[k]));
 const slots=sum('slots'),available=sum('available');
 return {episodesWithOpportunity:rows.length,episodesWithForecast:rows.filter(x=>x.available).length,slots,available,availability:slots?round(available/slots):null,states:combine('states'),motionStates:combine('motionStates'),
  matchedEpisodes:matched.length,matchedUpdates:sum('matchedUpdates'),episodeWeightedMAE:avg('episodeMAE'),episodeWeightedNaiveMAE:avg('episodeNaiveMAE'),episodeWeightedContainment:avg('episodeContainment'),episodeWeightedWidth:avg('episodeWidth'),episodeWeightedWarning:avg('episodeWarning'),episodeWeightedSignedError:avg('episodeSignedError'),meanFirstAvailableWarning:avg('firstAvailableWarning')};
}
function evaluate(days,engine=soo){
 if(!Array.isArray(days)||days.length!==3||days.map(d=>d.date).sort().join('|')!==DATES.join('|'))throw Error('Require original spent dates');
 const episodes=[],daily=[];
 for(const day of days){
  const s=study.buildCases(day,engine,{gridMinutes:POLICY.initialGridMinutes}),p=prior.daily.find(d=>d.date===day.date);
  if(!p||s.archiveSha256!==p.archiveSha256||s.fixes!==p.fixes||s.vessels!==p.vessels||s.cases.length!==p.issued)throw Error('Original archive or initial cohort mismatch');
  const tracks=new Map(day.regions.find(r=>r.id==='soo').tracks.map(t=>[t.mmsi,t]));
  const e=s.cases.map(first=>({first,slots:replay(first,normalize(tracks.get(first.mmsi)),engine)}));episodes.push(...e);
  daily.push({date:s.date,archiveSha256:s.archiveSha256,fixes:s.fixes,vessels:s.vessels,noIssue:s.noIssue,episodes:e.length,outcomes:count(e,x=>x.first.outcome.state)});
 }
 const all=episodes.flatMap(e=>e.slots),revisions=all.filter(s=>s.revision!==null).map(s=>s.revision);
 const bands=Object.fromEntries(BANDS.map(b=>[b,summarize(episodes,s=>s.band===b)]));
 const byDirection=Object.fromEntries(['upbound','downbound'].map(d=>[d,Object.fromEntries(BANDS.map(b=>[b,summarize(episodes.filter(e=>e.first.direction===d),s=>s.band===b)]))]));
 const matched=episodes.filter(e=>e.first.outcome.state==='OBSERVED_CHAMBER_REFERENCE_BRACKET').length;
 if(episodes.length!==prior.all.issued||matched!==prior.all.matched)throw Error('Initial outcome cohort mismatch');
 return {schemaVersion:1,kind:'SOO_CONTINUOUS_APPROACH_DEVELOPMENT',dates:DATES,policy:POLICY,sourceRun:45390603940,daily,episodes:episodes.length,matchedInitialEpisodes:matched,outcomes:count(episodes,e=>e.first.outcome.state),allSlots:all.length,allStates:count(all,s=>s.state),unbanded:summarize(episodes,s=>!s.band),bands,byDirection,withdrawals:all.filter(s=>s.transition==='withdrawn').length,resumptions:all.filter(s=>s.transition==='resumed').length,meanAbsoluteRevisionMinutes:mean(revisions.map(Math.abs)),consecutiveRevisions:revisions.length,scope:'First eligible vessel-day, fixed five-minute ticks until eight hours or UTC day end. Closure only when a strict chamber fix has actually been observed by tick. After-closure slots remain visible; conditional metrics use same initial bracket and only ticks at or before previous outside fix. Bands are observed position, not inferred crossings; stale slots have unknown band. Per-episode averaging within bands, not independent update counts. No fitting, no field ground truth, no fresh holdout, no production changes.',freshHoldout:false,officialLockEntryGroundTruth:false,productionCalibrationAuthorized:false,forecastEnabled:false};
}
module.exports={band,geometry,replay,score,summarize,evaluate,POLICY,BANDS};
if(require.main===module){
 const [out,...files]=process.argv.slice(2);
 if(!out||files.length!==3)throw Error('report NEW_OUTPUT THREE_ORIGINAL_DAY_FILES');
 const result=evaluate(files.map(p=>{if(fs.statSync(p).size>48*1024*1024)throw Error('Oversized input');return JSON.parse(fs.readFileSync(p,'utf8'));}));
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify(result,null,2));
}
