'use strict';
// Offline observational skill evaluation. Never used by the public ShoreFeel API.
// Site-quality air temperature at the beach is the ONLY ground truth; offshore
// buoys, NWS forecasts and RTMA/URMA grids are not substitute beach thermometers.
const isValue=n=>typeof n==='number'&&Number.isFinite(n);
const tempOk=n=>isValue(n)&&n>=-60&&n<=140;
const time=iso=>{
 if(typeof iso!=='string'||!iso.includes('T'))return null;
 const t=Date.parse(iso);return Number.isFinite(t)?t:null;
};
const round=n=>Math.round(n*100)/100;
function siteApproved(meta){
 return meta&&meta.type==='measured-beach-air'&&typeof meta.id==='string'&&
  meta.id.trim().length>=3&&meta.radiationShielded===true&&
  isValue(meta.sensorHeightM)&&meta.sensorHeightM>=1&&meta.sensorHeightM<=4&&
  isValue(meta.distanceFromShoreM)&&meta.distanceFromShoreM>=0&&meta.distanceFromShoreM<=400&&
  isValue(meta.lat)&&meta.lat>=-90&&meta.lat<=90&&
  isValue(meta.lon)&&meta.lon>=-180&&meta.lon<=180;
}
function preIssued(at,issuedAt){
 const a=time(at),i=time(issuedAt);
 return a!==null&&i!==null&&i<=a&&a-i<=48*3600000;
}
function metrics(rows,field){
 const valid=rows.filter(r=>tempOk(r[field])&&tempOk(r.beachAirF));
 if(!valid.length)return null;
 const errors=valid.map(r=>r[field]-r.beachAirF);
 return {n:errors.length,maeF:round(errors.reduce((s,x)=>s+Math.abs(x),0)/errors.length),
  rmseF:round(Math.sqrt(errors.reduce((s,x)=>s+x*x,0)/errors.length)),
  biasF:round(errors.reduce((s,x)=>s+x,0)/errors.length)};
}
function fieldAudit(dataset,now=new Date()){
 const approved=siteApproved(dataset?.station),holdout=time(dataset?.holdoutStartsAt);
 if(!approved||dataset?.units!=='F'||!Array.isArray(dataset?.observations)){
  return {status:'invalid-ground-truth',reason:
    'Require a documented radiation-shielded shoreline air station within 400 m of water, temperature units F, and records. NOAA offshore buoys and model grids are not valid beach-air ground truth.'};
 }
 const seen=new Map(),conflicts=new Set(),records=[],rejected={missing:0,duplicate:0,conflict:0,
  future:0,notPreissued:0};
 const sorted=[...dataset.observations].sort((a,b)=>(time(a?.observedAt)||0)-(time(b?.observedAt)||0));
 for(const row of sorted){
  if(!row||!tempOk(row.beachAirF)||!tempOk(row.nwsShoreF)||!tempOk(row.modelBeachF)||
     !['onshore','offshore','alongshore'].includes(row.windSector)||!row.eventId){
    rejected.missing++;continue;
  }
  const obs=time(row.observedAt);
  if(obs===null||obs>now.getTime()+5*60000){rejected.future++;continue;}
  if(!preIssued(row.observedAt,row.nwsIssuedAt)||
     !preIssued(row.observedAt,row.modelIssuedAt)){
    rejected.notPreissued++;continue;
  }
  const duplicateKey=dataset.station.id+'|'+new Date(obs).toISOString();
  if(conflicts.has(duplicateKey)){rejected.conflict++;continue;}
  if(seen.has(duplicateKey)){
   const prior=seen.get(duplicateKey);
   if(['beachAirF','nwsShoreF','modelBeachF','windSector'].some(k=>prior[k]!==row[k])){
    rejected.conflict++;conflicts.add(duplicateKey);
    const index=records.findIndex(x=>x.duplicateKey===duplicateKey);
    if(index>=0)records.splice(index,1);
   }else rejected.duplicate++;
   continue;
  }
  seen.set(duplicateKey,row);
  records.push({...row,duplicateKey,day:new Date(obs).toISOString().slice(0,10),epoch:obs});
 }
 const observedDays=new Set(records.map(r=>r.day)).size;
 const allEvents=new Set(records.map(r=>r.eventId)).size;
 const holdoutRows=holdout===null?[]:records.filter(r=>r.epoch>=holdout);
 const holdoutDays=new Set(holdoutRows.map(r=>r.day)).size;
 const holdoutEvents=new Set(holdoutRows.map(r=>r.eventId)).size;
 const modelLockedAt=time(dataset.modelLockedAt);
 const lockedBeforeHoldout=typeof dataset.modelVersion==='string'&&dataset.modelVersion.length>0&&
   modelLockedAt!==null&&holdout!==null&&modelLockedAt<holdout;
 const windSectors=Object.fromEntries(['onshore','offshore','alongshore']
   .map(sector=>[sector,holdoutRows.filter(r=>r.windSector===sector).length]));
 const pairedBaseline=metrics(holdoutRows,'nwsShoreF');
 const candidate=metrics(holdoutRows,'modelBeachF');
 // Threshold is an engineering review gate only, NOT a claim of accuracy.
 const reviewable=lockedBeforeHoldout&&records.length>=100&&observedDays>=14&&allEvents>=10&&
   holdoutRows.length>=40&&holdoutDays>=7&&holdoutEvents>=5&&
   windSectors.onshore>=10&&windSectors.offshore>=10;
 return {status:reviewable?'holdout-reviewable':'insufficient-field-evidence',
  sampleType:'independent shore thermometer, site metadata user-supplied and not independently verified',
  sampleCount:records.length,observedDays,events:allEvents,
  holdoutStart:holdout===null?null:new Date(holdout).toISOString(),
  modelLock:lockedBeforeHoldout?{version:dataset.modelVersion,lockedAt:dataset.modelLockedAt}:null,
  holdout:{n:holdoutRows.length,days:holdoutDays,events:holdoutEvents,windSectors,
    nwsBeachBaseline:pairedBaseline,physicsCandidate:candidate,
    maeImprovementF:pairedBaseline&&candidate?round(pairedBaseline.maeF-candidate.maeF):null},
  rejected,publicationAuthorized:false,automaticCalibration:false,
  reason:reviewable
    ?'Out-of-time error comparison can be independently reviewed. Field site, withheld event independence and representativeness still require external verification. No automatic publication.'
    :'Insufficient independent field data, holdout events and opposing wind regimes. Do not calculate calibrated shoreline corrections or publicly claim model skill.'};
}
module.exports={siteApproved,preIssued,metrics,fieldAudit};
