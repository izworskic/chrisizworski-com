#!/usr/bin/env node
'use strict';
// Development-only: track the lifecycle of a forecast, not merely its first issue.
const fs=require('node:fs');
const soo=require('../lib/soo-locks-next');
const {issueForecasts,resolve,DATES}=require('./great-lakes-decision-time-replay.cjs');
const {detect}=require('./detect-great-lakes-crossings.cjs');
const {proxyGates,prepare}=require('./retrospect-great-lakes-reference.cjs');
const {verify,scorePair}=require('./great-lakes-bias-corrected-window.cjs');
const M=60000,STEP=15*M,FRESH=5*M,HORIZON=120*M;
const expect=(ok,msg)=>{if(!ok)throw Error(msg);};
function valid(p){return p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=85&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180&&Number.isInteger(p.shipType)&&p.shipType>=70&&p.shipType<=89;}
function lifecycle(first,track,end,engine=soo){
 const slots=[];let cursor=-1,previous=null;
 // The initial issue defines the fixed episode. Neither later crossing labels
 // nor future observation content may determine the issue grid or status.
 for(let now=first.issuedAt;now<end&&now<first.issuedAt+HORIZON;now+=STEP){
  while(cursor+1<track.length&&track[cursor+1][0]<=now)cursor++;
  const latest=track[cursor];let state,forecast=null;
  if(!latest||now-latest[0]>FRESH)state='stale_or_missing';
  else if(!valid(latest[1]))state='invalid_or_conflicting';
  else if(!engine.inBox(latest[1],engine.RIVER_BBOX))state='outside_region';
  else if(engine.inChamber&&engine.inChamber(latest[1]))state='observed_in_chamber';
  else if(Number.isFinite(latest[1].speedKnots)&&latest[1].speedKnots<=.5)state='low_reported_speed';
  else {
   const c=engine.buildCandidate(latest[1],now);
   if(!c)state='model_abstained';
   else if(c.direction!==first.direction)state='direction_changed';
   else {
    const midpoint=Date.parse(c.window.midpoint),start=Date.parse(c.window.start),end=Date.parse(c.window.end);
    expect([midpoint,start,end].every(Number.isFinite)&&now<=start&&start<=midpoint&&midpoint<=end,'Invalid rolling forecast');
    if(midpoint-now<1*M||midpoint-now>60*M)state='outside_update_lead_range';
    else {state='forecast_available';forecast={id:first.id,issuedAt:now,observationTime:latest[0],midpoint,start,end,direction:c.direction};}
   }
  }
  const transition=previous?.state==='forecast_available'&&state!=='forecast_available'?'withdrawn':previous&&previous.state!=='forecast_available'&&state==='forecast_available'?'resumed':null;
  const revision=previous?.forecast&&forecast?(forecast.midpoint-previous.forecast.midpoint)/M:null;
  const row={now,state,transition,revision,forecast};slots.push(row);previous=row;
 }
 expect(slots.length>0&&slots[0].forecast&&slots[0].forecast.midpoint===first.midpoint&&slots[0].forecast.start===first.start&&slots[0].forecast.end===first.end,'Initial issue replay differs');
 return slots;
}
function analyze(first,slots,track,crossings,dayEnd,frozen){
 const base=resolve(first,track,crossings,dayEnd),counts={},revisions=[],matched=[];
 let withdrawn=0,resumed=0,updates=0;
 // Fixed episode states include post-crossing slots; do not use future crossing
 // to terminate actual forecast selection. Separately score pre-crossing updates.
 for(const s of slots){
  counts[s.state]=(counts[s.state]||0)+1;
  withdrawn+=Number(s.transition==='withdrawn');resumed+=Number(s.transition==='resumed');
  if(s.revision!==null)revisions.push(s.revision);
  if(s.forecast)updates++;
  if(!s.forecast||base.status!=='matched'||s.now>base.evidence.lo)continue;
  const o=resolve(s.forecast,track,crossings,dayEnd);
  if(o.status!=='matched'||o.evidence.lo!==base.evidence.lo||o.evidence.hi!==base.evidence.hi)continue;
  const p=scorePair(o.evidence,frozen);
  matched.push({old:p.old.contained,next:p.next.contained,warning:(base.evidence.lo-s.now)/M,width:p.old.width});
 }
 const avg=k=>matched.length?matched.reduce((n,x)=>n+x[k],0)/matched.length:null;
 return {slots:slots.length,counts,withdrawn,resumed,updates,revisions,baseStatus:base.status,
 matchedUpdateCount:matched.length,episodeMeanExistingContainment:avg('old'),episodeMeanCorrectedContainment:avg('next'),episodeMeanWarningMinutes:avg('warning'),episodeMeanWidthMinutes:avg('width')};
}
function aggregate(rows){
 const counts={},outcomeCounts={},sum=k=>rows.reduce((n,x)=>n+x[k],0);
 for(const x of rows){for(const [k,v] of Object.entries(x.counts))counts[k]=(counts[k]||0)+v;outcomeCounts[x.baseStatus]=(outcomeCounts[x.baseStatus]||0)+1;}
 const revisions=rows.flatMap(x=>x.revisions),matched=rows.filter(x=>x.matchedUpdateCount>0),mean=k=>matched.length?matched.reduce((n,x)=>n+x[k],0)/matched.length:null;
 return {episodes:rows.length,slots:sum('slots'),states:counts,initialOutcomeCounts:outcomeCounts,forecastAvailableSlots:sum('updates'),withdrawals:sum('withdrawn'),resumptions:sum('resumed'),episodesWithWithdrawal:rows.filter(x=>x.withdrawn>0).length,
 consecutiveRevisions:revisions.length,lateRevisions:revisions.filter(x=>x>=10).length,earlyRevisions:revisions.filter(x=>x<=-10).length,meanAbsoluteRevisionMinutes:revisions.length?revisions.reduce((s,x)=>s+Math.abs(x),0)/revisions.length:null,
 matchedEpisodes:matched.length,matchedUpdates:sum('matchedUpdateCount'),episodeWeightedMatchedExistingContainment:mean('episodeMeanExistingContainment'),episodeWeightedMatchedCorrectedContainment:mean('episodeMeanCorrectedContainment'),episodeWeightedMatchedWarningMinutes:mean('episodeMeanWarningMinutes'),episodeWeightedMatchedWidthMinutes:mean('episodeMeanWidthMinutes'),
 note:'Lifecycle slots include all fixed followup opportunities, even after crossings. Outcome-conditioned scores are separately limited to matched pre-crossing updates, weighted once per vessel-day episode. No confirmed nonarrival, no probability or production authorization.'};
}
function evaluate(doc,records,prior,frozen){
 verify(records,prior,frozen);
 const date=doc?.start?.slice(0,10),start=Date.parse(doc?.start),end=Date.parse(doc?.end);
 expect(doc?.kind==='historical-research'&&DATES.includes(date)&&doc.start===date+'T00:00:00Z'&&end-start===86400000,'Prior development date only');
 const tracks=prepare(doc),initial=issueForecasts(tracks,start,end),episodes=initial.issued.map(x=>({first:x,slots:lifecycle(x,tracks.get(x.id),end)}));
 const crossings=new Map();
 for(const c of detect(doc,proxyGates().filter(g=>g.site==='soo')).review){if(!crossings.has(c.mmsi))crossings.set(c.mmsi,[]);crossings.get(c.mmsi).push({lo:Date.parse(c.start),hi:Date.parse(c.end),direction:c.direction});}
 return {schemaVersion:1,kind:'ROLLING_FORECAST_DEVELOPMENT_AUDIT',date,sourceReceiptSha256:doc.source.receiptSha256,freezeSha256:frozen.freezeSha256,initialSelection:initial.counts,...aggregate(episodes.map(({first,slots})=>analyze(first,slots,tracks.get(first.id),crossings.get(first.id)||[],end,frozen))),productionCalibrationAuthorized:false,fieldAccuracyVerified:false,receiptTimesAvailable:false};
}
module.exports={lifecycle,analyze,aggregate,evaluate};
if(require.main===module){
 const [records,prior,frozen,obs,out,...extra]=process.argv.slice(2);
 expect(records&&prior&&frozen&&obs&&out&&!extra.length,'Usage: records prior frozen observations output');
 const read=p=>{expect(fs.statSync(p).size<=48*1024*1024,'Oversized input');return JSON.parse(fs.readFileSync(p,'utf8'));};
 fs.writeFileSync(out,JSON.stringify(evaluate(read(obs),read(records),read(prior),read(frozen)),null,2)+'\n',{flag:'wx',mode:0o600});
}
