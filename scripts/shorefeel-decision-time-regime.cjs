'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
function analyze(d){
 const validStatuses=["FROZEN_HORIZON_RELIABILITY_CONFIRMATION_ONLY","FROZEN_WARM_SEASON_RELIABILITY_REVIEW_ONLY"];
 if(!validStatuses.includes(d.status)||d.canPromoteModel!==false)throw Error("Invalid source");
 const n=d.status===validStatuses[0]?100:80;
 const key=p=>[p.station,p.cycleAt,p.leadHours].join("|");
 const rows=d.cycles.flatMap(c=>c.pairs.map(p=>({p,models:c.models})));
 if(rows.length!==2*n||d.cohort.length!==2*n||new Set(rows.map(x=>key(x.p))).size!==2*n||new Set(d.cohort.map(key)).size!==2*n||d.cohort.some(p=>!rows.some(x=>key(x.p)===key(p))))throw Error("Invalid cohort");
 const band=x=>Math.abs(x)<2?"under2":Math.abs(x)<5?"2to5":"5plus";
 const bands=["under2","2to5","5plus"];
 const score=(ps,w)=>{
  const errors=ps.map(p=>Math.abs(w*p.delta-p.change)).sort((a,b)=>a-b);
  return {n:errors.length,maeF:errors.length?errors.reduce((a,b)=>a+b,0)/errors.length:null,p90F:errors.length?errors[Math.ceil(.9*errors.length)-1]:null,maxF:errors.length?errors[errors.length-1]:null};
 };
 const leads={};
 for(const h of [24,48]){
  const group=rows.filter(x=>x.p.leadHours===h),available=[],matched=[];
  if(group.length!==n)throw Error("Invalid horizon");
  for(const {p,models} of group){
   const issue=Date.parse(p.decisionAt),baseline=Date.parse(p.baselineAt),target=issue+h*3600000;
   const original=Date.parse(p.cycleAt);
   if(issue!==original+6*3600000||baseline!==original+4*3600000)throw Error("Unexpected issue timing");
   const m0=models[4],m1=models[h+6];
   const ok=[m0,m1].every(m=>m&&!m.error&&/^[a-f0-9]{64}$/.test(m.sha256)&&Number.isFinite(Date.parse(m.lastModified))&&Date.parse(m.lastModified)<=issue);
   if(!ok||Date.parse(m0.validAt)!==baseline||Date.parse(m1.validAt)!==target||m0.geometrySha256!==m1.geometrySha256||!Number.isFinite(p.distanceKm)||p.distanceKm>2.5||!Number.isFinite(p.modelBaseC)||!Number.isFinite(p.modelValidC))continue;
   const delta=(p.modelValidC-p.modelBaseC)*1.8;
   const f={station:p.station,cycleAt:p.cycleAt,delta,band:band(delta)};
   available.push(f);
   if(p.reason)continue;
   if(!Number.isFinite(p.actualC)||!Number.isFinite(p.baselineC)||!Number.isFinite(p.modelChangeErrorF)||!Number.isFinite(p.persistenceErrorF))throw Error("Invalid outcome");
   const change=(p.actualC-p.baselineC)*1.8;
   if(Math.abs(delta-change-p.modelChangeErrorF)>1e-7||Math.abs(-change-p.persistenceErrorF)>1e-7)throw Error("Pair arithmetic");
   matched.push({...f,change});
  }
  const w=h===24?.25:1;
  const groups=bands.map(b=>{
   const all=available.filter(p=>p.band===b),ps=matched.filter(p=>p.band===b);
   return {band:b,featureAvailable:all.length,scored:ps.length,observedBands:Object.fromEntries(bands.map(k=>[k,ps.filter(p=>band(p.change)===k).length])),persistence:score(ps,0),frozenCandidate:score(ps,w)};
  });
  const confusion={TP:0,FP:0,TN:0,FN:0};
  for(const p of matched){const forecast=Math.abs(p.delta)>=5,actual=Math.abs(p.change)>=5;confusion[forecast?(actual?"TP":"FP"):(actual?"FN":"TN")]++;}
  const {TP,FP,TN,FN}=confusion;
  leads[h]={expected:n,featureAvailable:available.length,scored:matched.length,missingOutcomeOrFeature:n-matched.length,weight:w,bands:groups,largeChange:{...confusion,precision:TP+FP?TP/(TP+FP):null,recall:TP+FN?TP/(TP+FN):null},exactCoveragePassed:matched.length/n>=.8};
 }
 return JSON.parse(JSON.stringify({status:"DECISION_TIME_FEATURE_DIAGNOSTIC_ONLY",cohortSha256:d.cohortSha256,leads,canPromoteModel:false,limitations:["Archived model change available by assumed decision according to object metadata only; actual operational receipt time unverified.","Bands fixed at 2 and 5 F from preceding descriptive diagnostic; these cohorts have been inspected and are not an independent holdout.","No observed future change used to define forecast bands. Observed change used solely to score classification and errors.","No adaptive weight, threshold optimization, wind inference or calibrated probability. Missing slots retained."]}));
}
if(require.main===module){const raw=fs.readFileSync(process.argv[2]);console.log(JSON.stringify({...analyze(JSON.parse(raw)),sourceSha256:crypto.createHash('sha256').update(raw).digest('hex')},null,2));}
module.exports={analyze};
