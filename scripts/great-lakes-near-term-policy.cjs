#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {issueForecasts,resolve,DATES}=require('./great-lakes-decision-time-replay.cjs');
const {detect}=require('./detect-great-lakes-crossings.cjs');
const {proxyGates,prepare}=require('./retrospect-great-lakes-reference.cjs');
const {verify,scorePair}=require('./great-lakes-bias-corrected-window.cjs');
const soo=require('../lib/soo-locks-next');
const MIN=60000,expect=(ok,msg)=>{if(!ok)throw Error(msg);};
// Same decision grid, freshness and owning engine. Only lead eligibility changes.
// No outcome or later motion is supplied to either issuing policy.
function policies(tracks,start,end,engine=soo){
 const early=issueForecasts(tracks,start,end,engine,60),near=issueForecasts(tracks,start,end,engine,30);
 const byId=new Map(early.issued.map(x=>[x.id,x]));
 for(const n of near.issued){const e=byId.get(n.id);expect(e&&n.issuedAt>=e.issuedAt,'Nested issue policy invariant');}
 return {early,near};
}
function compare(early,near,tracks,crossings,end,frozen){
 const nearById=new Map(near.map(x=>[x.id,x])),counts={},paired=[];
 const totals={early:{issued:early.length,matched:0,contained:0,correctedContained:0},near:{issued:near.length,matched:0,contained:0,correctedContained:0}};
 function resolved(issue,key){
  const o=resolve(issue,tracks.get(issue.id),crossings.get(issue.id)||[],end);
  if(o.status==='matched'){const s=scorePair(o.evidence,frozen);totals[key].matched++;totals[key].contained+=s.old.contained;totals[key].correctedContained+=s.next.contained;return {o,s};}
  return {o};
 }
 for(const e of early){
  const er=resolved(e,'early'),n=nearById.get(e.id),nr=n?resolved(n,'near'):null;
  let status;
  if(!n)status='near_not_issued';
  else if(er.o.status!=='matched'||nr.o.status!=='matched')status='one_or_both_unresolved';
  else if(er.o.evidence.lo!==nr.o.evidence.lo||er.o.evidence.hi!==nr.o.evidence.hi||e.direction!==n.direction)status='different_crossing';
  else {status='same_crossing';paired.push({delay:(n.issuedAt-e.issuedAt)/MIN,earlyLead:(er.o.evidence.lo-e.issuedAt)/MIN,nearLead:(nr.o.evidence.lo-n.issuedAt)/MIN,early:er.s.old,near:nr.s.old});}
  counts[status]=(counts[status]||0)+1;
 }
 const mean=f=>paired.length?paired.reduce((s,p)=>s+f(p),0)/paired.length:null;
 return {totals,counts,baselineVesselDays:early.length,matchedSameCrossing:paired.length,paired:{meanIssueDelayMinutes:mean(p=>p.delay),meanEarlyWarningLowerMinutes:mean(p=>p.earlyLead),meanNearWarningLowerMinutes:mean(p=>p.nearLead),earlyContainment:mean(p=>p.early.contained),nearContainment:mean(p=>p.near.contained),earlyWidth:mean(p=>p.early.width),nearWidth:mean(p=>p.near.width)},note:'Near policy may withhold an opportunity. Matched-only metrics are conditional; absent or unresolved crossings are not confirmed false forecasts.'};
}
function evaluate(doc,records,prior,frozen){
 verify(records,prior,frozen);
 const date=doc?.start?.slice(0,10),start=Date.parse(doc?.start),end=Date.parse(doc?.end);
 expect(doc?.kind==='historical-research'&&DATES.includes(date)&&doc.start===date+'T00:00:00Z'&&end-start===86400000,'Prior development date only');
 const tracks=prepare(doc),{early,near}=policies(tracks,start,end);
 const crossings=new Map();
 for(const c of detect(doc,proxyGates().filter(g=>g.site==='soo')).review){if(!crossings.has(c.mmsi))crossings.set(c.mmsi,[]);crossings.get(c.mmsi).push({lo:Date.parse(c.start),hi:Date.parse(c.end),direction:c.direction});}
 return {schemaVersion:1,kind:'NEAR_TERM_POLICY_DEVELOPMENT_COMPARISON',date,sourceReceiptSha256:doc.source.receiptSha256,freezeSha256:frozen.freezeSha256,earlySelection:early.counts,nearSelection:near.counts,...compare(early.issued,near.issued,tracks,crossings,end,frozen),productionCalibrationAuthorized:false,fieldAccuracyVerified:false,receiptTimesAvailable:false};
}
module.exports={policies,compare,evaluate};
if(require.main===module){
 const [records,prior,frozen,obs,out,...extra]=process.argv.slice(2);
 expect(records&&prior&&frozen&&obs&&out&&!extra.length,'Usage: records prior frozen observations output');
 const read=p=>{expect(fs.statSync(p).size<=48*1024*1024,'Oversized input');return JSON.parse(fs.readFileSync(p,'utf8'));};
 fs.writeFileSync(out,JSON.stringify(evaluate(read(obs),read(records),read(prior),read(frozen)),null,2)+'\n',{flag:'wx',mode:0o600});
}
