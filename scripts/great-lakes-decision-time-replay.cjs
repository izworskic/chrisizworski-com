#!/usr/bin/env node
'use strict';
// Development-only decision-time replay: select issues without future crossings.
const fs=require('node:fs');
const {detect}=require('./detect-great-lakes-crossings.cjs');
const {proxyGates,prepare}=require('./retrospect-great-lakes-reference.cjs');
const {verify,scorePair}=require('./great-lakes-bias-corrected-window.cjs');
const soo=require('../lib/soo-locks-next');
const delay=require('./great-lakes-decision-time-delay-diagnostics.cjs');
const MIN=60000,GRID=15*MIN,FRESH=5*MIN,HORIZON=120*MIN,GAP=5*MIN;
const DATES=Object.freeze(['2024-09-04','2024-09-10','2024-09-15']);
const expect=(ok,msg)=>{if(!ok)throw Error(msg);};
const usable=p=>p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=85&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180&&Number.isInteger(p.shipType)&&p.shipType>=70&&p.shipType<=89;
function issueForecasts(tracks,start,end,engine=soo,maxLead=60){
 expect(maxLead===30||maxLead===60,'Unsupported prespecified issue policy');
 const issued=[],counts={usableSnapshots:0,modelAbstentions:0,outsideLeadRange:0,duplicateVesselDaySuppressed:0};
 for(const [id,track] of tracks){
  let i=-1,alreadyIssued=false;
  for(let now=start;now<end;now+=GRID){
   while(i+1<track.length&&track[i+1][0]<=now)i++;
   if(i<0||now-track[i][0]>FRESH||!usable(track[i][1])||!engine.inBox(track[i][1],engine.RIVER_BBOX))continue;
   counts.usableSnapshots++;
   if(alreadyIssued){counts.duplicateVesselDaySuppressed++;continue;}
   const result=engine.buildCandidate(track[i][1],now);
   if(!result){counts.modelAbstentions++;continue;}
   const mid=Date.parse(result.window.midpoint),s=Date.parse(result.window.start),t=Date.parse(result.window.end);
   expect([s,mid,t].every(Number.isFinite)&&now<=s&&s<=mid&&mid<=t&&['upbound','downbound'].includes(result.direction),'Invalid issue forecast');
   if(mid-now<15*MIN||mid-now>maxLead*MIN){counts.outsideLeadRange++;continue;}
   issued.push({id,issuedAt:now,observationTime:track[i][0],midpoint:mid,start:s,end:t,direction:result.direction});
   alreadyIssued=true;
  }
 }
 return {issued,counts};
}
// Never infer a crossing absent from a sparse AIS trajectory. Even a continuous
// trajectory without a detected bracket is not independently confirmed nonarrival.
function continuous(track,from,to){
 const i=track.findIndex(([t])=>t===from);
 if(i<0||!usable(track[i][1]))return false;
 let last=from;
 for(let j=i+1;j<track.length;j++){
  const [t,p]=track[j];
  if(t-last>GAP||!usable(p))return false;
  if(t>=to)return true;
  last=t;
 }
 return last>=to;
}
function resolve(issue,track,crossings,dayEnd){
 const until=issue.issuedAt+HORIZON;
 // Explicit day-end censoring before reading later outcomes.
 if(until>=dayEnd)return {status:'day_end_censored'};
 const possible=crossings.filter(c=>c.hi>=issue.issuedAt&&c.lo<=until);
 if(possible.length>1)return {status:'ambiguous_multiple_crossings'};
 if(possible.length===1){
  const c=possible[0];
  if(c.lo<issue.issuedAt||c.hi>until)return {status:'boundary_bracket'};
  if(c.direction!==issue.direction)return {status:'opposite_direction'};
  if(!continuous(track,issue.observationTime,c.hi))return {status:'discontinuous_observation'};
  return {status:'matched',evidence:{...issue,lo:c.lo,hi:c.hi}};
 }
 return {status:continuous(track,issue.observationTime,until)?'no_detected_crossing_continuous':'no_detected_crossing_incomplete'};
}
function replay(doc,records,prior,frozen,options={}){
 verify(records,prior,frozen);
 const start=Date.parse(doc?.start),end=Date.parse(doc?.end),date=doc?.start?.slice(0,10);
 expect(doc?.kind==='historical-research'&&DATES.includes(date)&&doc.start===date+'T00:00:00Z'&&end-start===86400000,'Prespecified development date only');
 const detection=detect(doc,proxyGates().filter(g=>g.site==='soo')),tracks=prepare(doc);
 // Issue creation is deliberately separate from and has no input of detected outcomes.
 const {issued,counts:selection}=issueForecasts(tracks,start,end);
 const byId=new Map();
 for(const c of detection.review){if(!byId.has(c.mmsi))byId.set(c.mmsi,[]);byId.get(c.mmsi).push({lo:Date.parse(c.start),hi:Date.parse(c.end),direction:c.direction});}
 const counts={},pairs=[],diagnostics=[];
 for(const issue of issued){const track=tracks.get(issue.id),o=resolve(issue,track,byId.get(issue.id)||[],end);counts[o.status]=(counts[o.status]||0)+1;const pair=o.status==='matched'?scorePair(o.evidence,frozen):null;if(pair)pairs.push(pair);if(options.delayDiagnostics===true)diagnostics.push(delay.describe(issue,o,track,pair));}
 const sum=f=>pairs.reduce((n,p)=>n+f(p),0);
 return {schemaVersion:1,kind:'DEVELOPMENT_DECISION_TIME_PROXY_REPLAY',date,sourceReceiptSha256:doc.source.receiptSha256,freezeSha256:frozen.freezeSha256,
 selectionRule:'fixed 15-minute UTC grid; latest observation within five minutes; first existing-model eligible 15–60 minute midpoint per vessel UTC day; two-hour followup',
 selection,issued:issued.length,counts,matched:pairs.length,unresolved:issued.length-pairs.length,detectedCrossings:detection.review.length,
 oldContained:sum(p=>p.old.contained),nextContained:sum(p=>p.next.contained),oldOverlap:sum(p=>p.old.overlap),nextOverlap:sum(p=>p.next.overlap),
 oldWidthSum:sum(p=>p.old.width),nextWidthSum:sum(p=>p.next.width),lossDeltaLowerSum:sum(p=>p.lossDelta[0]),lossDeltaUpperSum:sum(p=>p.lossDelta[1]),maeDeltaLowerSum:sum(p=>p.maeDelta[0]),maeDeltaUpperSum:sum(p=>p.maeDelta[1]),
 ...(options.delayDiagnostics===true?{delayDiagnostics:delay.aggregate(diagnostics)}:{}),
 fieldAccuracyVerified:false,productionCalibrationAuthorized:false,receiptTimesAvailable:false,note:'Observation-time replay on previously studied development dates. Unresolved does not mean false prediction; detector and archive can miss crossings. No operational probability or recall claim.'};
}
function summarize(days){
 expect(Array.isArray(days)&&days.length<=DATES.length,'Unexpected days');
 const seen=new Set();for(const d of days){expect(d?.kind==='DEVELOPMENT_DECISION_TIME_PROXY_REPLAY'&&DATES.includes(d.date)&&!seen.has(d.date)&&d.productionCalibrationAuthorized===false,'Invalid or duplicate development day');seen.add(d.date);expect(Number.isInteger(d.issued)&&Number.isInteger(d.matched)&&d.matched>=0&&d.issued>=d.matched&&d.unresolved===d.issued-d.matched&&Object.values(d.counts).reduce((a,b)=>a+b,0)===d.issued&&(d.counts.matched||0)===d.matched,'Outcome accounting mismatch');}
 const sum=k=>days.reduce((n,d)=>n+d[k],0),issued=sum('issued'),matched=sum('matched'),unknown=issued-matched,avg=k=>matched?sum(k)/matched:null;
 const counts={};for(const d of days)for(const [k,v] of Object.entries(d.counts))counts[k]=(counts[k]||0)+v;
 return {kind:'DEVELOPMENT_DECISION_TIME_PROXY_SUMMARY',pendingDates:DATES.filter(d=>!seen.has(d)),issued,matched,unresolved:unknown,counts,
 matchedOnly:{existingContainment:avg('oldContained'),challengerContainment:avg('nextContained'),existingMeanWidthMinutes:avg('oldWidthSum'),challengerMeanWidthMinutes:avg('nextWidthSum'),pairedMaeDeltaLowerMinutes:avg('maeDeltaLowerSum'),pairedMaeDeltaUpperMinutes:avg('maeDeltaUpperSum'),pairedDecisionLossLowerMinutes:avg('lossDeltaLowerSum'),pairedDecisionLossUpperMinutes:avg('lossDeltaUpperSum')},
 allIssuedContainmentIdentificationBounds:issued?{existing:[sum('oldContained')/issued,(sum('oldContained')+unknown)/issued],challenger:[sum('nextContained')/issued,(sum('nextContained')+unknown)/issued]}:null,
 productionCalibrationAuthorized:false,note:'Worst/best-case unresolved bounds, not probabilities. Previously studied development days, not fresh holdout.'};
}
module.exports={issueForecasts,continuous,resolve,replay,summarize,DATES};
if(require.main===module){
 const [mode,a,b,c,d,e,...extra]=process.argv.slice(2);
 const read=p=>{expect(p&&fs.statSync(p).size<=48*1024*1024,'Missing or oversized input');return JSON.parse(fs.readFileSync(p,'utf8'));};
 expect((!extra.length||mode==='evaluate'&&extra.length===1&&extra[0]==='--delay-diagnostics')&&['evaluate','summarize'].includes(mode),'Usage: evaluate records prior frozen observations output | summarize reports output');
 let report,output;
 if(mode==='evaluate'){expect(a&&b&&c&&d&&e,'Missing evaluation arguments');report=replay(read(d),read(a),read(b),read(c),{delayDiagnostics:extra.length===1});output=e;}else{expect(a&&b&&!c&&!d&&!e,'Invalid summary arguments');report=summarize(read(a));output=b;}
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
}
