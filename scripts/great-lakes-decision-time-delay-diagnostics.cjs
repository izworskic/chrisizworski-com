'use strict';
// Descriptive post-outcome evidence only. Never a production feature or queue label.
const MIN=60000,GAP=5*MIN;
const bins=['15_to_under_30','30_to_under_45','45_to_60'];
const finiteSpeed=v=>typeof v?.speedKnots==='number'&&Number.isFinite(v.speedKnots)&&v.speedKnots>=0&&v.speedKnots<102.2;
function leadBin(minutes){
 if(!Number.isFinite(minutes)||minutes<15||minutes>60)throw Error('Unexpected predicted lead');
 return bins[minutes<30?0:minutes<45?1:2];
}
function motionSpans(track,start,end){
 let covered=0,known=0,low=0,slow=0;
 for(let i=1;i<track.length;i++){
  const [a,p]=track[i-1],[b,q]=track[i],span=Math.max(0,Math.min(b,end)-Math.max(a,start));
  if(!span||b-a>GAP||b<=a||!p||!q)continue;
  covered+=span;
  if(!finiteSpeed(p)||!finiteSpeed(q))continue;
  known+=span;
  if(p.speedKnots<=.5&&q.speedKnots<=.5)low+=span;
  if(p.speedKnots<=1.5&&q.speedKnots<=1.5)slow+=span;
 }
 return {coveredMinutes:covered/MIN,knownSpeedMinutes:known/MIN,lowEndpointMinutes:low/MIN,slowEndpointMinutes:slow/MIN};
}
function describe(issue,outcome,track,pair){
 const lead=(issue.midpoint-issue.issuedAt)/MIN;
 const row={bin:leadBin(lead),direction:issue.direction,lead,status:outcome.status};
 if(outcome.status!=='matched')return row;
 const {lo,hi}=outcome.evidence;
 // Clip at lower bracket endpoint; don't include motion after possible crossing.
 const spans=motionSpans(track,issue.issuedAt,lo);
 return {...row,matched:{actualLead:[(lo-issue.issuedAt)/MIN,(hi-issue.issuedAt)/MIN],residual:[(lo-issue.midpoint)/MIN,(hi-issue.midpoint)/MIN],...spans,oldContained:pair.old.contained,nextContained:pair.next.contained}};
}
function summarize(rows){
 const scored=rows.filter(x=>x.matched),sum=f=>scored.reduce((n,x)=>n+f(x.matched),0),counts={};
 for(const x of rows)counts[x.status]=(counts[x.status]||0)+1;
 const avg=f=>scored.length?sum(f)/scored.length:null;
 return {issued:rows.length,matched:scored.length,unresolved:rows.length-scored.length,counts,
 meanPredictedLeadMinutes:rows.length?rows.reduce((n,x)=>n+x.lead,0)/rows.length:null,
 meanObservedLeadBoundsMinutes:scored.length?[avg(x=>x.actualLead[0]),avg(x=>x.actualLead[1])]:null,
 meanSignedResidualBoundsMinutes:scored.length?[avg(x=>x.residual[0]),avg(x=>x.residual[1])]:null,
 entirelyLater:sum(x=>Number(x.residual[0]>0)),entirelyEarlier:sum(x=>Number(x.residual[1]<0)),straddlesMidpoint:sum(x=>Number(x.residual[0]<=0&&x.residual[1]>=0)),
 meanKnownSpeedSpanMinutes:avg(x=>x.knownSpeedMinutes),meanLowEndpointSpanMinutes:avg(x=>x.lowEndpointMinutes),meanSlowEndpointSpanMinutes:avg(x=>x.slowEndpointMinutes),
 matchedWithAtLeastFiveLowEndpointMinutes:sum(x=>Number(x.lowEndpointMinutes>=5)),oldContained:sum(x=>x.oldContained),nextContained:sum(x=>x.nextContained)};
}
function aggregate(rows){
 return {kind:'POST_OUTCOME_DELAY_DIAGNOSTICS_NOT_PREDICTOR_FEATURES',overall:summarize(rows),byPredictedLead:Object.fromEntries(bins.map(b=>[b,summarize(rows.filter(x=>x.bin===b))])),byDirection:Object.fromEntries(['upbound','downbound'].map(d=>[d,summarize(rows.filter(x=>x.direction===d))])),productionCalibrationAuthorized:false,note:'Reported SOG at both endpoints of a <=5 minute observed span; not continuously verified stopped time, lock queue, cause of delay or issue-time feature. No outcome selection or change to forecasts. Only matched events have observed lead bounds. Unresolved outcomes retained.'};
}
module.exports={leadBin,motionSpans,describe,aggregate};
