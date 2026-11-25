'use strict';
// Offline candidate comparison only. These weights are fixed before acquiring
// new dates. They are not calibrated probabilities or production settings.
const fs=require('node:fs'),crypto=require('node:crypto');
const DATES=Object.freeze(['2026-07-03','2026-07-09','2026-07-21','2026-07-27','2026-08-03','2026-08-09','2026-08-21','2026-08-27']);
const CONFIRM_DATES=Object.freeze(['2026-07-06','2026-07-12','2026-07-18','2026-07-24','2026-07-30','2026-08-06','2026-08-12','2026-08-18','2026-08-24','2026-08-30']);
const STATIONS=Object.freeze(['45029','45161','45183','45002','45013','45024','45026','45168','45210','45214']);
const WEIGHTS=Object.freeze({persistence:0,conservative:0.25,equalBlend:0.5,original:1});
const mean=x=>x.length?x.reduce((s,v)=>s+v,0)/x.length:null;
const key=p=>[p.station,p.cycleAt,p.leadHours].join('|');
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function evaluate(d){
 const confirm=d.status==='FROZEN_HORIZON_RELIABILITY_CONFIRMATION_ONLY',dates=confirm?CONFIRM_DATES:DATES;
 if((!confirm&&d.status!=='FROZEN_WARM_SEASON_RELIABILITY_REVIEW_ONLY')||d.canPromoteModel!==false||!Array.isArray(d.cycles))throw Error('Wrong diagnostic dataset');
 const expected=new Set(dates.flatMap(day=>STATIONS.flatMap(s=>[24,48].map(h=>[s,day+'T00:00:00+00:00',h].join('|')))));
 const rows=d.cycles.flatMap(c=>c.pairs),seen=new Set();
 for(const p of rows){const k=key(p);if(!expected.has(k)||seen.has(k))throw Error('Unexpected or duplicate frozen slot');seen.add(k);}
 if(seen.size!==expected.size||!Array.isArray(d.cohort)||d.cohort.length!==expected.size||new Set(d.cohort.map(key)).size!==expected.size||d.cohort.some(p=>!expected.has(key(p))))throw Error('Incomplete frozen cohort');
 const output={};
 for(const h of [24,48]){
  const slots=rows.filter(p=>p.leadHours===h);
  const matched=slots.filter(p=>!p.reason&&['baselineC','actualC','modelBaseC','modelValidC','modelChangeErrorF','persistenceErrorF'].every(k=>finite(p[k])));
  const samples=matched.map(p=>{
   const delta=(p.modelValidC-p.modelBaseC)*1.8,actual=(p.actualC-p.baselineC)*1.8;
   if(Math.abs(delta-actual-p.modelChangeErrorF)>1e-7||Math.abs(-actual-p.persistenceErrorF)>1e-7)throw Error('Inconsistent original pair');
   return {...p,delta,actual};
  });
  const score=(group,w)=>{
   const errors=group.map(p=>w*p.delta-p.actual);
   return {n:errors.length,maeF:mean(errors.map(Math.abs)),biasF:mean(errors),maxAbsErrorF:errors.length?Math.max(...errors.map(Math.abs)):null,
    heuristicCoverage:mean(errors.map(x=>Number(Math.abs(x)<=(h===24?2:3))))};
  };
  const methods=Object.fromEntries(Object.entries(WEIGHTS).map(([n,w])=>[n,{weight:w,...score(samples,w),blocks:dates.map(day=>({day,...score(samples.filter(p=>p.cycleAt.startsWith(day)),w)}))}]));
  output[h]={expected:slots.length,matched:samples.length,matchedFraction:samples.length/slots.length,methods,missing:slots.length-samples.length};
  if(confirm){
   // Candidate fixed AFTER eight-date review, BEFORE new confirmation data.
   const selected=h===24?'conservative':'original',w=WEIGHTS[selected];
   const p90=weight=>{const a=samples.map(p=>Math.abs(weight*p.delta-p.actual)).sort((a,b)=>a-b);return a.length?a[Math.ceil(.9*a.length)-1]:null;};
   const blocks=methods[selected].blocks.filter(b=>b.n>0);
   const candidateP90=p90(w),persistenceP90=p90(0),originalP90=p90(1);
   const gates={exactCoverage:samples.length/slots.length>=.8,allTenBlocks:blocks.length===10,maeBeatsPersistence:!!samples.length&&methods[selected].maeF<methods.persistence.maeF,maeNoWorseThanOriginal:!!samples.length&&methods[selected].maeF<=methods.original.maeF,p90NoWorseThanBoth:!!samples.length&&candidateP90<=persistenceP90&&candidateP90<=originalP90};
   output[h].confirmation={selected,weight:w,p90F:candidateP90,persistenceP90F:persistenceP90,originalP90F:originalP90,gates,passesResearchGates:Object.values(gates).every(Boolean)};
  }
 }
 return {status:confirm?'HORIZON_RELIABILITY_CONFIRMATION_REVIEW_ONLY':'RELIABILITY_CANDIDATES_REVIEW_ONLY',cohortSha256:d.cohortSha256,weights:WEIGHTS,leads:output,canPromoteModel:false,limitations:[confirm?'Ten predeclared, previously unscored date blocks. Same year and potentially correlated weather regimes; retrospective, not prospective. 24h weight .25 and 48h weight 1 frozen after review. All gates are research screens only.':'Eight fixed previously unscored 2026 warm-season dates, separated by six or seven days. Not a prospective holdout; receipt times and historical deployment not authenticated.','Equal paired rows for all methods. Fixed weights not trained or optimized. No automatic winner, no production change, no calibrated coverage claim.','The anchored change uses 04Z baseline and 06Z assumed decision. No cooling-watch scores because baseline and decision times differ.','No conclusion about cool-season or beach-level skill.']};
}
if(require.main===module){const bytes=fs.readFileSync(process.argv[2]);console.log(JSON.stringify({...evaluate(JSON.parse(bytes)),sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex')},null,2));}
module.exports={evaluate,DATES,CONFIRM_DATES,STATIONS,WEIGHTS};
