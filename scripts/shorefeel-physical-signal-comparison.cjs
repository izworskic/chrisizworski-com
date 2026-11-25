'use strict';
function compare(report){
 if(report.status!=="PRE_DECISION_PHYSICS_FEATURE_DIAGNOSTIC_ONLY"||report.canPromoteModel!==false)throw Error("Wrong evidence");
 const output={},key=p=>[p.station,p.cycleAt].join("|"),finite=Number.isFinite;
 function classify(samples,predicate){
  const c={TP:0,FP:0,TN:0,FN:0};
  for(const s of samples){const p=predicate(s),a=Math.abs(s.actualChangeF)>=5;c[p?(a?"TP":"FP"):(a?"FN":"TN")]++;}
  const {TP,FP,TN,FN}=c,div=(a,b)=>b?a/b:null;
  return {...c,n:samples.length,precision:div(TP,TP+FP),recall:div(TP,TP+FN),specificity:div(TN,TN+FP)};
 }
 const rules={model:s=>Math.abs(s.modelChangeF)>=5,physics:s=>s.windSpeedMps>=5&&Math.abs(s.waterTrendF)>=2,either:s=>rules.model(s)||rules.physics(s),both:s=>rules.model(s)&&rules.physics(s)};
 for(const name of ["review","confirmation"]){
  const c=report.cohorts[name],expected=name==="review"?80:100;
  if(c.histories.length!==expected||c.rows.length!==2*expected)throw Error("Unexpected denominators");
  const hist=new Map(c.histories.map(p=>[key(p),p]));
  if(hist.size!==expected||new Set(c.rows.map(p=>key(p)+"|"+p.leadHours)).size!==2*expected)throw Error("Duplicate slot");
  for(const x of hist.values()){
   const cutoff=Date.parse(x.cutoffExclusive),cycle=Date.parse(x.cycleAt),latest=x.latestMeasurementAt===null?null:Date.parse(x.latestMeasurementAt);
   if(cutoff!==cycle+4*3600000||(latest!==null&&(!finite(latest)||latest>=cutoff||latest<cutoff-86400000)))throw Error("Invalid feature timing");
   const f=x.features;
   if(finite(f.windSpeedMps)&&f.windHours<18||finite(f.waterTrendF)&&f.waterHours<18)throw Error("Invalid coverage");
   if((finite(f.windSpeedMps)||finite(f.waterTrendF))&&(!latest||!report.sourceFiles[x.sourceKey]?.sha256||report.sourceFiles[x.sourceKey].error))throw Error("Unverified feature source");
  }
  output[name]={};
  for(const h of [24,48]){
   const rows=c.rows.filter(p=>p.leadHours===h);if(rows.length!==expected)throw Error("Unexpected horizon");
   const joined=rows.map(p=>{const x=hist.get(key(p));if(!x)throw Error("Missing station history");return {...p,...x.features};});
   const model=joined.filter(p=>finite(p.modelChangeF)&&finite(p.actualChangeF));
   const features=joined.filter(p=>finite(p.modelChangeF)&&finite(p.windSpeedMps)&&finite(p.waterTrendF));
   const paired=features.filter(p=>finite(p.actualChangeF));
   const scores=Object.fromEntries(Object.entries(rules).map(([k,p])=>[k,classify(paired,p)]));
   output[name][h]={expected,modelAndOutcome:model.length,featureComplete:features.length,paired:paired.length,missingFeatureAmongObserved:model.length-paired.length,actualLarge:paired.filter(p=>Math.abs(p.actualChangeF)>=5).length,modelAllObserved:classify(model,rules.model),pairedScores:scores};
  }
 }
 return {status:"PHYSICAL_SIGNAL_COMPARISON_DIAGNOSTIC_ONLY",cohorts:output,canPromoteModel:false,limitations:["Fixed descriptive rules, not trained or selected; both cohorts previously inspected.","All four rules compared on the same feature-complete exact outcomes. Unknown features remain unavailable, not a negative signal.","Archived prior measurements do not establish historical receipt time. No stratification, causal attribution, calibrated probability or production promotion."]};
}
module.exports={compare};
if(require.main===module){const fs=require('node:fs');console.log(JSON.stringify(compare(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));}
