#!/usr/bin/env node
'use strict';
// Retrospective observation-time proxy evaluation. NOT independent passage validation.
const fs=require('node:fs'),crypto=require('node:crypto');
const {detect,gate,provisionalGates}=require('./detect-great-lakes-crossings.cjs');
const {bounds}=require('./benchmark-great-lakes-passage.cjs');
const {utcMs,observedFields}=require('../lib/ais-movement');
const engines={soo:require('../lib/soo-locks-next'),duluth:require('../lib/duluth-canal')};
const routeProgress=require('./great-lakes-route-progress-challenger.cjs');
const MIN=60000,MAX_GAP=5*MIN,LEAD=30*MIN,TOLERANCE=2*MIN,MAX_BYTES=48*1024*1024;
function expect(ok,msg){if(!ok)throw Error(msg);}
function proxyGates(){
 // Same reference longitude as current Soo model; separate provisional corridors.
 // Duluth proxy is centered on the existing modeled canal point, NOT bridge.
 return [...provisionalGates().filter(g=>g.site==='soo'),
 gate('duluth-model-reference','duluth',engines.duluth.CANAL,60,60,'departure','arrival','Model-centered transverse proxy; not a surveyed physical passage')];
}
function summary(rows){
 const scored=rows.filter(r=>r.status==='scored'),mean=f=>scored.length?scored.reduce((a,r)=>a+f(r),0)/scored.length:null;
 const counts={};for(const r of rows)counts[r.status]=(counts[r.status]||0)+1;
 return {candidateEvents:rows.length,counts,pairedScored:scored.length,
 modelMaeLowerMinutes:mean(r=>r.model[0]),modelMaeUpperMinutes:mean(r=>r.model[1]),
 baselineMaeLowerMinutes:mean(r=>r.baseline[0]),baselineMaeUpperMinutes:mean(r=>r.baseline[1]),
 fullyContainedFraction:mean(r=>Number(r.coverage==='contained')),possibleOverlapFraction:mean(r=>Number(r.coverage!=='disjoint')),
 meanWindowWidthMinutes:mean(r=>r.width)};
}
function prepare(doc){
 const tracks=new Map();
 for(const r of doc.observations){
  const id=String(r.mmsi),t=utcMs(r.seen);expect(Number.isFinite(t),'Invalid observation time');
  const p={mmsi:id,seen:r.seen,lat:r.lat,lon:r.lon,shipType:r.shipType,
   ...observedFields({sog:r.sog,cog:r.cog,heading:r.heading}),
   lengthMeters:Number.isFinite(r.length)&&r.length>0&&r.length<=500?r.length:null,
   destination:null,eta:null};
  if(!tracks.has(id))tracks.set(id,new Map());
  const m=tracks.get(id);
  if(m.has(t)&&JSON.stringify(m.get(t))!==JSON.stringify(p))m.set(t,null);
  else if(!m.has(t))m.set(t,p);
 }
 return new Map([...tracks].map(([id,m])=>[id,[...m].sort((a,b)=>a[0]-b[0])]));
}
function usable(p){return p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=85&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180&&Number.isInteger(p.shipType)&&p.shipType>=70&&p.shipType<=89;}
function evaluateCandidate(c,tracks,engine,options={}){
 const lo=utcMs(c.start),hi=utcMs(c.end),desired=lo-LEAD;
 const track=tracks.get(c.mmsi)||[],last=track.filter(([t])=>t<=desired).at(-1);
 if(!last||desired-last[0]>TOLERANCE||!usable(last[1]))return {status:'no_issue_snapshot'};
 const [issue,v]=last;
 // Preserve abstentions, conflicts and gaps; never choose a better later snapshot.
 // No motion, static or destination field is borrowed from a subsequent report.
 const segment=track.filter(([t])=>t>=issue&&t<=hi);
 if(segment.at(-1)?.[0]!==hi||segment.some(([t,p],i)=>!usable(p)||(i>0&&t-segment[i-1][0]>MAX_GAP)))
  return {status:'discontinuous_observation'};
 const result=engine.buildCandidate(v,issue);
 if(!result)return {status:'model_abstained'};
 if(result.direction!==c.direction)return {status:'direction_mismatch'};
 const mid=utcMs(result.window.midpoint),start=utcMs(result.window.start),end=utcMs(result.window.end);
 const distance=c.site==='soo'?result.channelNmToLocks:result.distanceNm;
 expect(Number.isFinite(mid)&&Number.isFinite(start)&&Number.isFinite(end)&&start<=mid&&mid<=end&&mid>=issue&&Number.isFinite(distance)&&distance>=0&&v.speedKnots>0,'Invalid forecast contract');
 const baseline=issue+distance/v.speedKnots*60*MIN;
 const row={status:'scored',model:bounds(mid,lo,hi),baseline:bounds(baseline,lo,hi),coverage:start<=lo&&end>=hi?'contained':end<lo||start>hi?'disjoint':'partial',width:(end-start)/MIN};
 if(options.routeProgress===true)row.routeProgress=routeProgress.compare(routeProgress.estimate(c.site,result,track.filter(([t])=>t<=issue),issue),result,issue,lo,hi,bounds);
 return row;
}
function retrospect(doc,options={}){
 // Only prespecified development dates; holdout is never inspected by this pilot.
 expect(doc&&['synthetic','historical-research'].includes(doc.kind),'Unsupported dataset');
 expect(typeof doc.start==='string'&&['2024-09-04','2024-09-10','2024-09-15'].some(d=>doc.start===d+'T00:00:00Z'),'Development date only');
 expect(utcMs(doc.end)-utcMs(doc.start)===24*60*MIN,'One complete UTC day required');
 const candidates=detect(doc,proxyGates()),tracks=prepare(doc),rows=[];
 for(const c of candidates.review)rows.push({site:c.site,...evaluateCandidate(c,tracks,engines[c.site],options)});
 return {schemaVersion:1,kind:'RETROSPECTIVE_AIS_MODEL_REFERENCE_PROXY_NOT_FIELD_VALIDATION',datasetKind:doc.kind,sourceReceiptSha256:doc.source.receiptSha256,scope:{start:doc.start,end:doc.end},detector:candidates.report,
  issueRule:'last observation at or before bracket start minus 30 minutes, within 2 minutes; one issue per retained event',
  featureBasis:'archive SOG/COG and available static length/type at observation; no destination, receive-time evidence or future imputation',
  overall:summary(rows),bySite:Object.fromEntries(Object.keys(engines).map(s=>[s,summary(rows.filter(r=>r.site===s))])),
  ...(options.routeProgress===true?{routeProgressChallenger:{kind:'PRESPECIFIED_DEVELOPMENT_CHALLENGER',overall:routeProgress.summarize(rows),bySite:Object.fromEntries(Object.keys(engines).map(s=>[s,routeProgress.summarize(rows.filter(r=>r.site===s))]))}}:{}),
  independentlyReviewedCrossings:0,receiptTimesAvailable:false,fieldAccuracyVerified:false,productionCalibrationAuthorized:false,
  note:'Outcome-conditioned sample; scores conditional on detected future proxy crossings and available matching-direction estimates. Not recall, precision, false-positive rate, independent ground truth, or operational forecast performance. Soo corridors and Duluth normal/width provisional; arrival target is not physical structure passage.'};
}
module.exports={retrospect,proxyGates,prepare,evaluateCandidate,summary};
if(require.main===module){
 const [input,output,...extra]=process.argv.slice(2);expect(input&&output&&(extra.length===0||extra.length===1&&extra[0]==='--route-progress-challenger'),'Usage: node scripts/retrospect-great-lakes-reference.cjs input.json output.json [--route-progress-challenger]');
 expect(fs.statSync(input).size<=MAX_BYTES,'Input exceeds offline byte cap');
 const raw=fs.readFileSync(input,'utf8'),report=retrospect(JSON.parse(raw),{routeProgress:extra.length===1});
 report.inputSha256=crypto.createHash('sha256').update(raw).digest('hex');
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
}
