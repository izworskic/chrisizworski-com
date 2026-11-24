'use strict';
// Research-only challenger. Reuse owning channel routes, never a parallel live engine.
const soo=require('../lib/soo-locks-next');
const MIN=60000,LOOKBACK=12*MIN,APPROACH_NM=1,APPROACH_KNOTS=2.5;
const median=values=>{const a=[...values].sort((x,y)=>x-y),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
const no=reason=>({status:reason});
function estimate(site,existing,track,issue){
 if(site!=='soo')return no('site_not_ready');
 if(!['upbound','downbound'].includes(existing?.direction))return no('unsupported_direction');
 // Never provide future observations to a predictor; also enforce cutoff here.
 const history=track.filter(([t])=>t<=issue&&t>=issue-LOOKBACK);
 if(history.length<4||history.at(-1)[0]!==issue||issue-history[0][0]<6*MIN)return no('insufficient_history');
 const route=existing.direction==='downbound'?soo.ROUTES.upper:soo.ROUTES.lowerUpbound;
 const rate=[],near=[];let prior;
 for(const [t,v] of history){
  if(!v||!Number.isFinite(v.lat)||!Number.isFinite(v.lon)||!Number.isInteger(v.shipType)||v.shipType<70||v.shipType>89)return no('invalid_history');
  const p=soo.project(route,[v.lat,v.lon]);
  if(!p||p.lateralNm>0.8)return no('off_route_history');
  if(prior){
   const dt=t-prior.t;
   if(dt<=0||dt>5*MIN)return no('history_gap');
   const progress=prior.p.alongNm-p.alongNm;
   if(progress<-.03)return no('reverse_progress');
   const speed=progress*60*MIN/dt;
   if(speed>25)return no('implausible_progress');
   // A jump in projected along-channel distance must be supported by actual displacement.
   const actual=soo.distNm([prior.v.lat,prior.v.lon],[v.lat,v.lon]);
   if(Math.abs(progress)>actual*1.35+.05)return no('projection_jump');
   rate.push(Math.max(0,speed));
   if(prior.p.alongNm<=APPROACH_NM&&p.alongNm<=APPROACH_NM)near.push(Math.max(0,speed));
  }
  prior={p,t,v};
 }
 if(rate.length<3)return no('insufficient_history');
 const speed=prior.v.speedKnots,progress=median(rate);
 if(!Number.isFinite(speed)||speed<1.5||speed>25)return no('unsupported_reported_speed');
 if(progress<.8||rate.slice(-2).every(x=>x<.5))return no('stopped_or_low_progress');
 if(progress<speed*.5||progress>speed*1.25)return no('motion_disagreement');
 // Prespecified blend; not fit to development or holdout outcomes.
 const cruise=(speed+progress)/2;
 let approach=Math.min(cruise,APPROACH_KNOTS);
 if(near.length>=2)approach=Math.min(approach,median(near));
 if(approach<.8)return no('low_approach_progress');
 const distance=prior.p.alongNm;
 const minutes=60*(Math.max(0,distance-APPROACH_NM)/cruise+Math.min(distance,APPROACH_NM)/approach);
 if(!Number.isFinite(minutes)||minutes<1||minutes>480)return no('outside_horizon');
 return {status:'estimated',minutes};
}
// Exact paired absolute-error difference bounds on the same uncertain outcome.
// A negative value favors the challenger. Extremes occur at endpoints or either prediction.
function deltaBounds(challenger,existing,lo,hi){
 const points=[lo,hi,...[challenger,existing].filter(x=>x>=lo&&x<=hi)];
 const diffs=points.map(t=>(Math.abs(challenger-t)-Math.abs(existing-t))/MIN);
 return [Math.min(...diffs),Math.max(...diffs)];
}
function compare(estimate,existing,issue,lo,hi,bounds){
 if(estimate.status!=='estimated')return estimate;
 const current=Date.parse(existing.window.midpoint),mid=issue+estimate.minutes*MIN;
 const oldStart=Date.parse(existing.window.start),oldEnd=Date.parse(existing.window.end);
 // Recenter existing window; uncertainty policy is deliberately not tuned yet.
 const start=Math.max(issue,mid-(current-oldStart)),end=mid+(oldEnd-current);
 return {status:'scored',model:bounds(current,lo,hi),challenger:bounds(mid,lo,hi),
  delta:deltaBounds(mid,current,lo,hi),signedResidual:[(lo-mid)/MIN,(hi-mid)/MIN],
  contained:start<=lo&&end>=hi,overlap:start<=hi&&end>=lo,width:(end-start)/MIN};
}
function summarize(rows){
 const attempts=rows.filter(r=>r.routeProgress),scored=attempts.filter(r=>r.routeProgress.status==='scored');
 const counts={};for(const r of attempts)counts[r.routeProgress.status]=(counts[r.routeProgress.status]||0)+1;
 const mean=f=>scored.length?scored.reduce((a,r)=>a+f(r.routeProgress,r),0)/scored.length:null;
 return {eligibleExistingEstimates:attempts.length,pairedScored:scored.length,counts,
  existingMaeLowerMinutes:mean(q=>q.model[0]),existingMaeUpperMinutes:mean(q=>q.model[1]),
  baselineMaeLowerMinutes:mean((q,r)=>r.baseline[0]),baselineMaeUpperMinutes:mean((q,r)=>r.baseline[1]),
  challengerMaeLowerMinutes:mean(q=>q.challenger[0]),challengerMaeUpperMinutes:mean(q=>q.challenger[1]),
  pairedDeltaLowerMinutes:mean(q=>q.delta[0]),pairedDeltaUpperMinutes:mean(q=>q.delta[1]),
  challengerContainedFraction:mean(q=>Number(q.contained)),challengerOverlapFraction:mean(q=>Number(q.overlap)),
  challengerWindowWidthMinutes:mean(q=>q.width),
  residualBoundsMinutes:scored.map(r=>r.routeProgress.signedResidual).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),
  note:'Matched subset only; excluded estimates remain counted. Residual intervals are anonymous, retrospective development evidence, not a calibrated window.'};
}
module.exports={estimate,deltaBounds,compare,summarize};
