'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
function diagnose(d){
 if(d.status!=="FROZEN_HORIZON_RELIABILITY_CONFIRMATION_ONLY"||d.canPromoteModel!==false)throw Error("Unexpected source");
 const rows=d.cycles.flatMap(c=>c.pairs),key=p=>[p.station,p.cycleAt,p.leadHours].join("|");
 if(rows.length!==200||new Set(rows.map(key)).size!==200||d.cohort.length!==200||d.cohort.some(p=>!rows.some(q=>key(q)===key(p))))throw Error("Invalid fixed cohort");
 const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
 const lead={};
 for(const h of [24,48]){
  const w=h===24?.25:1,slots=rows.filter(p=>p.leadHours===h),matched=slots.filter(p=>!p.reason).map(p=>{
   for(const f of ["baselineC","actualC","modelBaseC","modelValidC","modelChangeErrorF","persistenceErrorF"])if(!Number.isFinite(p[f]))throw Error("Invalid pair");
   const change=(p.actualC-p.baselineC)*1.8,delta=(p.modelValidC-p.modelBaseC)*1.8;
   if(Math.abs(delta-change-p.modelChangeErrorF)>1e-7||Math.abs(-change-p.persistenceErrorF)>1e-7)throw Error("Pair arithmetic");
   return {...p,change,delta,candidateError:w*delta-change,persistenceError:-change,originalError:delta-change};
  });
  const score=ps=>{
   const metrics=field=>{const e=ps.map(p=>p[field]),a=e.map(Math.abs).sort((a,b)=>a-b);return {maeF:mean(a),p90F:a.length?a[Math.ceil(.9*a.length)-1]:null,maxF:a.length?a[a.length-1]:null};};
   const persistence=metrics("persistenceError"),candidate=metrics("candidateError"),original=metrics("originalError");
   return {n:ps.length,persistence,candidate,original,deltaMaeF:ps.length?candidate.maeF-persistence.maeF:null};
  };
  const strata=(field,values)=>values.map(value=>({value,expected:slots.filter(p=>p[field]===value).length,...score(matched.filter(p=>p[field]===value))}));
  const stations=[...new Set(slots.map(p=>p.station))].sort(),dates=[...new Set(slots.map(p=>p.cycleAt))].sort();
  const leaveOut=(field,values)=>values.map(omitted=>({omitted,...score(matched.filter(p=>p[field]!==omitted))}));
  const extremes=[...matched].sort((a,b)=>Math.abs(b.candidateError)-Math.abs(a.candidateError)||key(a).localeCompare(key(b))).slice(0,5).map(p=>({station:p.station,cycleAt:p.cycleAt,actualChangeF:p.change,modelChangeF:p.delta,candidateErrorF:p.candidateError,persistenceErrorF:p.persistenceError,originalErrorF:p.originalError}));
  lead[h]={expected:slots.length,matched:matched.length,weight:w,overall:score(matched),stations:strata("station",stations),dates:strata("cycleAt",dates),leaveOneStationOut:leaveOut("station",stations),leaveOneDateOut:leaveOut("cycleAt",dates),observedChangeMagnitude:[{label:"under 2F",...score(matched.filter(p=>Math.abs(p.change)<2))},{label:"2 to under 5F",...score(matched.filter(p=>Math.abs(p.change)>=2&&Math.abs(p.change)<5))},{label:"5F or more",...score(matched.filter(p=>Math.abs(p.change)>=5))}],extremes,exactCoveragePassed:matched.length>=80};
 }
 return {status:"RETROSPECTIVE_FAILURE_MODE_DIAGNOSTIC_ONLY",cohortSha256:d.cohortSha256,leads:lead,canPromoteModel:false,limitations:["Uses only the already inspected 141 exact confirmation pairs; not a new holdout or calibrated uncertainty.","Leave-one-group-out values are sensitivity checks, not confidence intervals or independent validation.","Observed change groups use outcomes and cannot be operational forecast triggers.","Missing station/date rows retained in denominators. No weight changes or production promotion."]};
}
if(require.main===module){const raw=fs.readFileSync(process.argv[2]);console.log(JSON.stringify({...diagnose(JSON.parse(raw)),sourceSha256:crypto.createHash('sha256').update(raw).digest('hex')},null,2));}
module.exports={diagnose};
