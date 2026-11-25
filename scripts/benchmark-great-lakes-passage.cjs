#!/usr/bin/env node
'use strict';
// Offline paired replay; NEVER called by an API or page. Input labels must
// be independently reviewed crossing brackets, not model or proximity labels.
const fs=require('node:fs'),crypto=require('node:crypto');
const evidence=require('../lib/ais-movement');
const engines={soo:require('../lib/soo-locks-next'),duluth:require('../lib/duluth-canal')};
const HOUR=3600000,MIN=60000,MAX_ROWS=10000;
function time(s){const t=evidence.utcMs(s);if(!Number.isFinite(t))throw Error('Invalid explicit UTC timestamp');return t;}
function expect(ok,msg){if(!ok)throw Error(msg);}
function digest(s){return crypto.createHash('sha256').update(s).digest('hex');}
function score(rows){
 const scored=rows.filter(r=>r.errorBounds),n=scored.length;
 const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
 return {issues:rows.length,estimates:rows.filter(r=>r.estimate).length,
   confirmedOutcomes:rows.filter(r=>r.outcome==='confirmed-crossing-bracket').length,
   pairedScored:n,unresolvedEstimates:rows.filter(r=>r.estimate&&r.outcome==='unresolved').length,
   confirmedButAbstained:rows.filter(r=>!r.estimate&&r.outcome==='confirmed-crossing-bracket').length,
   modelMaeLowerMinutes:mean(scored.map(r=>r.errorBounds.model[0])),
   modelMaeUpperMinutes:mean(scored.map(r=>r.errorBounds.model[1])),
   baselineMaeLowerMinutes:mean(scored.map(r=>r.errorBounds.baseline[0])),
   baselineMaeUpperMinutes:mean(scored.map(r=>r.errorBounds.baseline[1])),
   fullyContainedBrackets:n?scored.filter(r=>r.coverage==='contained').length/n:null,
   possibleIntervalCoverage:n?scored.filter(r=>r.coverage!=='disjoint').length/n:null,
   meanWindowWidthMinutes:mean(scored.map(r=>r.widthMinutes)),
   // Count independently labeled events, not repeated snapshots.
   distinctLabeledEvents:new Set(scored.map(r=>r.eventId)).size};
}
function bounds(pred,lo,hi){
 return [pred>=lo&&pred<=hi?0:Math.min(Math.abs(pred-lo),Math.abs(pred-hi))/MIN,
   Math.max(Math.abs(pred-lo),Math.abs(pred-hi))/MIN];
}
function replay(doc){
 expect(doc?.schemaVersion===1&&['synthetic','historical-review'].includes(doc.kind),'Unknown dataset schema');
 expect(doc.source&&typeof doc.source.url==='string'&&doc.source.url.startsWith('https://')&&typeof doc.source.review==='string'&&doc.source.review.length>0,'Missing provenance');
 expect(Array.isArray(doc.issues)&&doc.issues.length>0&&doc.issues.length<=MAX_ROWS,'Issue count outside offline limit');
 const holdout=time(doc.holdoutStartsAt),ids=new Set(),events=new Set(),rows=[];
 for(const row of doc.issues){
  expect(typeof row.id==='string'&&row.id.length>0&&!ids.has(row.id),'Duplicate/missing issue ID');ids.add(row.id);
  expect(Object.hasOwn(engines,row.site),'Unsupported site');
  const issue=time(row.issuedAt),v=row.vessel;
  expect(v&&/^\d{9}$/.test(String(v.mmsi))&&Number.isFinite(v.lat)&&Math.abs(v.lat)<=90&&Number.isFinite(v.lon)&&Math.abs(v.lon)<=180,'Invalid vessel snapshot');
  expect(time(v.seen)<=issue,'Future observation leaked into issue');
  expect(time(row.availableAt)<=issue&&time(row.availableAt)>=time(v.seen),'Snapshot availability not established at issue');
  expect(row.outcome&&['confirmed-crossing-bracket','unresolved'].includes(row.outcome.kind),'Missing outcome status');
  const key=row.site+':'+v.mmsi+':'+row.issuedAt;
  expect(!events.has(key),'Repeated vessel/site/issue');events.add(key);
  const result={id:row.id,site:row.site,split:issue<holdout?'development':'holdout',outcome:row.outcome.kind,estimate:false};
  let lo,hi;
  if(row.outcome.kind==='confirmed-crossing-bracket'){
   const o=row.outcome;
   expect(typeof o.eventId==='string'&&o.eventId.length>0&&!events.has('event:'+row.site+':'+o.eventId),'Duplicate/missing independent event ID');
   events.add('event:'+row.site+':'+o.eventId);
   expect(typeof o.evidenceRef==='string'&&o.evidenceRef.length>0&&o.method==='independently-reviewed-crossing','Crossing label not independently reviewed');
   lo=time(o.start);hi=time(o.end);
   expect(issue<lo&&lo<=hi&&hi-lo<=5*MIN&&hi-issue<=24*HOUR,'Invalid/ambiguous outcome bracket or horizon');
   expect(issue>=holdout||hi<holdout,'Event straddles split boundary');
   result.eventId=o.eventId;
  }
  const c=engines[row.site].buildCandidate(v,issue);
  if(c){
   const mid=time(c.window.midpoint),start=time(c.window.start),end=time(c.window.end);
   expect(start<=mid&&mid<=end&&mid>=issue,'Invalid existing forecast window');
   const distance=row.site==='soo'?c.channelNmToLocks:c.distanceNm;
   expect(Number.isFinite(distance)&&distance>=0&&v.speedKnots>0,'No valid same-distance speed baseline');
   const naive=issue+distance/v.speedKnots*HOUR;
   result.estimate=true;
   result.horizon=mid-issue<=HOUR?'0-60m':mid-issue<=3*HOUR?'60-180m':'180m+';
   result.widthMinutes=(end-start)/MIN;
   if(lo!==undefined){
    result.errorBounds={model:bounds(mid,lo,hi),baseline:bounds(naive,lo,hi)};
    result.coverage=start<=lo&&end>=hi?'contained':end<lo||start>hi?'disjoint':'partial';
   }
  }
  rows.push(result);
 }
 const partitions={};
 for(const split of ['development','holdout']){
  const selected=rows.filter(r=>r.split===split);
  partitions[split]={overall:score(selected),bySite:{}};
  for(const site of Object.keys(engines)){
   const subset=selected.filter(r=>r.site===site);
   partitions[split].bySite[site]={overall:score(subset),byHorizon:Object.fromEntries(['0-60m','60-180m','180m+'].map(h=>[h,score(subset.filter(r=>r.horizon===h))]))};
  }
 }
 return {schemaVersion:1,kind:'OFFLINE_PAIRED_REPLAY_NOT_LIVE_FORECAST',datasetKind:doc.kind,source:doc.source,
   holdoutStartsAt:doc.holdoutStartsAt,partitions,
   productionCalibrationAuthorized:false,fieldAccuracyVerified:false,
   note:'Only paired forecasts with independently reviewed outcome brackets are scored. Unresolved issues and abstentions are counted, not treated as misses or correct negatives. Bounds do not establish recall or calibrated probability; synthetic labels never measure field accuracy.'};
}
module.exports={replay,bounds};
if(require.main===module){
 const input=process.argv[2],output=process.argv[3];
 if(!input||!output||process.argv.length!==4)throw Error('Usage: node scripts/benchmark-great-lakes-passage.cjs input.json output.json');
 expect(fs.statSync(input).size<=20*1024*1024,'Input exceeds 20 MiB offline limit');
 const raw=fs.readFileSync(input,'utf8'),report=replay(JSON.parse(raw));
 report.inputSha256=digest(raw);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
