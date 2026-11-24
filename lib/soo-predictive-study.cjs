'use strict';
// Offline forecast research. Observed AIS presence in an approximate chamber
// rectangle is a proxy, never an official lock entry or a visitor forecast.
const DATES=Object.freeze(['2025-06-15','2025-08-15','2025-10-15']);
const POLICY=Object.freeze({minDistanceNm:5,maxDistanceNm:15,horizonMinutes:480,maxBracketSeconds:180,maxChordKnots:40,minTrain:5,minCalibration:5,minVessels:3});
const finite=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const stamp=s=>{
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s))return NaN;
 const t=Date.parse(s);
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,19)===s.slice(0,19)?t:NaN;
};
const round=x=>Math.round(x*100)/100;
const median=values=>{
 const a=[...values].sort((x,y)=>x-y),n=a.length;
 return n?(a[(n-1)>>1]+a[n>>1])/2:null;
};
const mean=a=>a.length?round(a.reduce((s,x)=>s+x,0)/a.length):null;
function strictChamber(v,locks){
 const hits=Object.entries(locks).filter(([,l])=>v.lat>=l.lat[0]&&v.lat<=l.lat[1]&&v.lon>=l.lon[0]&&v.lon<=l.lon[1]);
 return hits.length===1?hits[0][0]:null;
}
function buildCases(day,soo){
 if(day?.schemaVersion!==1||day.kind!=='NOAA_HISTORICAL_VESSEL_LIBRARY_DAY'||day.forecastEnabled!==false||
    day.timezone!=='UTC'||!DATES.includes(day.date)||!/^[a-f0-9]{64}$/.test(day.archiveSha256)||
    day.sourceUrl!=='https://noaaocm.blob.core.windows.net/ais/csv2/csv2025/ais-'+day.date+'.csv.zst'||
    JSON.stringify(day.pointFields)!==JSON.stringify(['seen','lat','lon','speedKnots','course','heading','shipType','lengthMeters']))throw Error('Unexpected NOAA historical library contract');
 const region=day.regions?.find(r=>r.id==='soo');
 if(!region||JSON.stringify(region.bbox)!==JSON.stringify(soo.RIVER_BBOX)||!Array.isArray(region.tracks))throw Error('Missing reviewed Soo box');
 const ids=new Set(),cases=[];
 let fixes=0,noIssue=0;
 for(const track of region.tracks){
  if(!/^\d{9}$/.test(track.mmsi)||ids.has(track.mmsi)||!Array.isArray(track.points)||!track.points.length)throw Error('Invalid or repeated vessel track');
  ids.add(track.mmsi);
  const rows=track.points.map((p,i)=>{
   if(!Array.isArray(p)||p.length!==8||!Number.isFinite(stamp(p[0]))||!p[0].startsWith(day.date+'T')||
      (i&&stamp(p[0])<=stamp(track.points[i-1][0]))||
      !finite(p[1],-90,90)||!finite(p[2],-180,180)||!Number.isInteger(p[6])||p[6]<70||p[6]>89)throw Error('Invalid or unordered archive row');
   const v={mmsi:track.mmsi,seen:p[0],lat:p[1],lon:p[2],
    speedKnots:finite(p[3],0,40)?p[3]:null,course:finite(p[4],0,359.9)?p[4]:null,
    heading:finite(p[5],0,359)?p[5]:null,shipType:p[6],lengthMeters:finite(p[7],1,500)?p[7]:null};
   if(!soo.inBox(v,soo.RIVER_BBOX))throw Error('Outside reviewed box');
   fixes++;return v;
  });
  // Choose the first eligible issue using only the current/past observation.
  // No requirement that a future chamber observation actually exists.
  let issue=null;
  for(let i=0;i<rows.length;i++){
   const v=rows[i],t=stamp(v.seen),c=soo.buildCandidate(v,t);
   if(!c||c.confidence<0.52||c.channelNmToLocks<POLICY.minDistanceNm||c.channelNmToLocks>POLICY.maxDistanceNm)continue;
   const naive=c.channelNmToLocks/v.speedKnots*60;
   issue={i,mmsi:track.mmsi,date:day.date,issuedAt:v.seen,direction:c.direction,channelNm:c.channelNmToLocks,
    speedKnots:v.speedKnots,naiveMinutes:naive,existingMinutes:(stamp(c.window.midpoint)-t)/60000,
    existingLower:(stamp(c.window.start)-t)/60000,existingUpper:(stamp(c.window.end)-t)/60000};
   break;
  }
  if(!issue){noIssue++;continue;}
  const {i,...prediction}=issue,t=stamp(issue.issuedAt),deadline=t+POLICY.horizonMinutes*60000;
  const dayEnd=Date.parse(day.date+'T00:00:00Z')+86400000;
  let outcome={state:deadline>=dayEnd?'RIGHT_CENSORED_BY_DAY_END':'NO_QUALIFYING_CHAMBER_OBSERVATION'};
  for(let j=i+1;j<rows.length;j++){
   const v=rows[j],vt=stamp(v.seen);
   if(vt>deadline)break;
   const chamber=strictChamber(v,soo.LOCKS);
   if(!chamber)continue;
   const prev=rows[j-1],pt=stamp(prev.seen),seconds=(vt-pt)/1000;
   const chord=soo.distNm([prev.lat,prev.lon],[v.lat,v.lon])*3600/seconds;
   if(pt<t||seconds<=0||seconds>POLICY.maxBracketSeconds||strictChamber(prev,soo.LOCKS)||!finite(chord,0,POLICY.maxChordKnots)){
    outcome={state:'FIRST_CHAMBER_OBSERVATION_UNBRACKETED',observedAt:v.seen};break;
   }
   outcome={state:'OBSERVED_CHAMBER_REFERENCE_BRACKET',chamber,previousOutsideAt:prev.seen,firstInsideAt:v.seen,
    lowerMinutes:(pt-t)/60000,upperMinutes:(vt-t)/60000,midpointMinutes:((vt+pt)/2-t)/60000};break;
  }
  cases.push({...prediction,outcome});
 }
 if(fixes!==region.points||ids.size!==region.vessels)throw Error('Archive counts do not match');
 return {date:day.date,sourceUrl:day.sourceUrl,archiveSha256:day.archiveSha256,fixes,vessels:ids.size,noIssue,cases};
}
const observed=c=>c.outcome.state==='OBSERVED_CHAMBER_REFERENCE_BRACKET';
function metrics(rows,predict,interval){
 const y=rows.filter(observed),errors=y.map(c=>predict(c)-c.outcome.midpointMinutes);
 const result={matched:y.length,meanAbsoluteErrorMinutes:mean(errors.map(Math.abs)),medianAbsoluteErrorMinutes:errors.length?round(median(errors.map(Math.abs))):null,
  meanSignedErrorMinutes:mean(errors)};
 if(interval){
  const windows=y.map(c=>({c,w:interval(c)}));
  result.meanIntervalWidthMinutes=mean(windows.map(({w})=>w[1]-w[0]));
  result.fullBracketContained=windows.filter(({c,w})=>w[0]<=c.outcome.lowerMinutes&&w[1]>=c.outcome.upperMinutes).length;
  result.bracketOverlaps=windows.filter(({c,w})=>w[0]<=c.outcome.upperMinutes&&w[1]>=c.outcome.lowerMinutes).length;
 }
 return result;
}
function evaluate(days){
 if(!Array.isArray(days)||days.length!==3)throw Error('Require pinned chronological train/calibration/holdout days');
 const ordered=[...days].sort((a,b)=>a.date.localeCompare(b.date));
 if(ordered.map(d=>d.date).join('|')!==DATES.join('|'))throw Error('Unexpected or repeated split date');
 for(const d of ordered){
  if(!Array.isArray(d.cases)||new Set(d.cases.map(c=>c.mmsi)).size!==d.cases.length||d.cases.some(c=>c.date!==d.date||
    !finite(c.existingMinutes,0,480)||!finite(c.naiveMinutes,0,1000)||!finite(c.existingLower,0,1000)||!finite(c.existingUpper,c.existingLower,1000)||
    !c.outcome||observed(c)&&(!finite(c.outcome.lowerMinutes,0,480)||!finite(c.outcome.upperMinutes,c.outcome.lowerMinutes,480)||
    !finite(c.outcome.midpointMinutes,c.outcome.lowerMinutes,c.outcome.upperMinutes))))throw Error('Invalid split or cases');
 }
 const [train,calibration,holdout]=ordered.map(d=>d.cases);
 const tr=train.filter(observed),ca=calibration.filter(observed),ho=holdout.filter(observed);
 const distinct=a=>new Set(a.map(c=>c.mmsi)).size;
 const fit=tr.length>=POLICY.minTrain&&distinct(tr)>=POLICY.minVessels?
  median(tr.map(c=>c.outcome.midpointMinutes-c.existingMinutes)):null;
 const adjusted=c=>Math.max(0,c.existingMinutes+fit);
 // Diagnostic maximum bracket residual, not a calibrated probability interval.
 // Never select a different model or radius based on October outcomes.
 const radius=fit!==null&&ca.length>=POLICY.minCalibration&&distinct(ca)>=POLICY.minVessels?
  Math.max(...ca.map(c=>Math.max(Math.abs(adjusted(c)-c.outcome.lowerMinutes),Math.abs(adjusted(c)-c.outcome.upperMinutes)))):null;
 const groups=ordered.map(d=>({date:d.date,fixes:d.fixes,vessels:d.vessels,noIssue:d.noIssue,issued:d.cases.length,matched:d.cases.filter(observed).length,
  outcomes:Object.fromEntries([...new Set(d.cases.map(c=>c.outcome.state))].sort().map(s=>[s,d.cases.filter(c=>c.outcome.state===s).length]))}));
 const compare=rows=>({naive:metrics(rows,c=>c.naiveMinutes),existing:metrics(rows,c=>c.existingMinutes,c=>[c.existingLower,c.existingUpper]),
  adjusted:fit===null?null:metrics(rows,adjusted,radius===null?null:c=>[Math.max(0,adjusted(c)-radius),adjusted(c)+radius])});
 return {schemaVersion:1,kind:'SOO_HISTORICAL_CHAMBER_REFERENCE_PROXY_BACKTEST',policy:POLICY,
  splits:{training:ordered[0].date,calibration:ordered[1].date,holdout:ordered[2].date},groups,
  fit:{trainMatched:tr.length,trainVessels:distinct(tr),medianResidualMinutes:fit===null?null:round(fit),
   calibrationMatched:ca.length,calibrationVessels:distinct(ca),diagnosticRadiusMinutes:radius===null?null:round(radius)},
  holdout:{matched:ho.length,distinctVessels:distinct(ho),all:compare(holdout),
   byDirection:Object.fromEntries(['upbound','downbound'].map(d=>[d,compare(holdout.filter(c=>c.direction===d))]))},
  officialLockEntryGroundTruth:false,forecastEnabled:false,releaseStatus:'RESEARCH_ONLY_INDEPENDENT_OUTCOMES_AND_MORE_DATES_REQUIRED',
  note:'Proxy labels are later AIS fixes near modeled chamber rectangles; not independently confirmed lock entries. Conditional timing error excludes unresolved outcomes, not a measured false-positive rate. Three sampled dates and repeated vessel identities do not establish calibrated probabilities.'};
}
module.exports={DATES,POLICY,strictChamber,buildCases,evaluate,metrics};
