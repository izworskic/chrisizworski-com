/* Local journal core; visitor reports are not independent field validation. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./garden-harvest.js'),require('./garden-microclimate.js'));else root.GardenFieldJournal=factory(root.GardenHarvest,root.GardenMicroclimate);})(typeof globalThis!=='undefined'?globalThis:this,function factory(H,M){
'use strict';
const schema='garden-field-journal-v1',DAY=86400000,sites=['bay-city','detroit','grand-rapids','kalamazoo','traverse-city','marquette','houghton'],kinds=['emergence','flowering','fruit-set','first-green-harvest','first-ripe-harvest','first-harvest','harvest','note','daily-air','paired-night'];
const dateOK=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s&&s>='1900-01-01'&&s<='2100-12-31';
const str=(s,n)=>typeof s==='string'&&s.trim().length>0&&s.length<=n;
const idOK=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s);
const temp=n=>Number.isFinite(n)&&n>=-80&&n<=140;
const elapsed=(a,b)=>(Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/DAY;
function blank(){return {schema,plantings:[],entries:[]};}
function validate(data,today){
 if(!dateOK(today)||!data||data.schema!==schema||!Array.isArray(data.plantings)||!Array.isArray(data.entries)||data.plantings.length>100||data.entries.length>4000)throw Error('Invalid journal or size limit');
 const plantings=[],entries=[],ids=new Set(),byId=new Map(),daily=new Set();
 for(const p of data.plantings){
  if(!p||!idOK(p.id)||ids.has(p.id)||!str(p.crop,120)||!str(p.bed,80)||!sites.includes(p.siteId)||!dateOK(p.date)||p.date>today||(p.packetDays!==null&&(!Number.isInteger(p.packetDays)||p.packetDays<1||p.packetDays>365)))throw Error('Invalid planting');
  const model=p.modelId===null?null:Object.hasOwn(H.models,p.modelId)?H.models[p.modelId]:null;
  if(p.modelId!==null&&(!model||p.biofix!==model.biofix)||p.modelId===null&&p.biofix!==null)throw Error('Model or starting stage mismatch');
  const clean={id:p.id,crop:p.crop.trim(),bed:p.bed.trim(),siteId:p.siteId,date:p.date,packetDays:p.packetDays,modelId:p.modelId,biofix:p.biofix};
  plantings.push(clean);ids.add(p.id);byId.set(p.id,clean);
 }
 for(const e of data.entries){
  const p=byId.get(e?.plantingId);
  if(!e||!p||!idOK(e.id)||ids.has(e.id)||!dateOK(e.date)||e.date<p.date||e.date>today||!kinds.includes(e.kind)||typeof e.note!=='string'||e.note.length>1000)throw Error('Invalid observation');
  const clean={id:e.id,plantingId:e.plantingId,date:e.date,kind:e.kind,note:e.note};
  if(e.kind==='daily-air'){
   if(e.date>=today||!temp(e.minF)||!temp(e.maxF)||e.minF>e.maxF||e.fullShieldedDay!==true)throw Error('Daily air needs a completed shielded-air day');
   Object.assign(clean,{minF:e.minF,maxF:e.maxF,fullShieldedDay:true});
  }
  if(e.kind==='paired-night'){
   if(!temp(e.gardenLowF)||!temp(e.referenceLowF)||!str(e.referenceId,100)||!['clear-calm','cloudy-windy','other'].includes(e.regime)||e.sameNightWindow!==true||e.comparableShieldedAirHeight!==true)throw Error('Comparable paired observations required');
   Object.assign(clean,{gardenLowF:e.gardenLowF,referenceLowF:e.referenceLowF,referenceId:e.referenceId.trim(),regime:e.regime,sameNightWindow:true,comparableShieldedAirHeight:true});
  }
  if(e.kind==='daily-air'||e.kind==='paired-night'){
   const key=[e.plantingId,e.date,e.kind].join('|');if(daily.has(key))throw Error('Only one reading of this kind per planting and date; remove the old reading first');daily.add(key);
  }
  ids.add(e.id);entries.push(clean);
 }
 return {schema,plantings,entries};
}
function summarize(data,id,today,history=null){
 const d=validate(data,today),p=d.plantings.find(x=>x.id===id);if(!p)return null;
 const entries=d.entries.filter(e=>e.plantingId===id).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const m=p.modelId?H.models[p.modelId]:null,endpoint=m?(m.endpoint==='first ripe harvest'?'first-ripe-harvest':m.endpoint==='first green harvest'?'first-green-harvest':'first-harvest'):null;
 const first=endpoint?entries.find(e=>e.kind===endpoint):entries.find(e=>['first-harvest','first-ripe-harvest','first-green-harvest'].includes(e.kind));
 const days=first?elapsed(p.date,first.date):null,packetDelta=days!==null&&p.packetDays!==null?days-p.packetDays:null;
 let comparison=null;
 if(m&&history?.scope==='historical-heat-crossings-not-observed-harvests'&&history.siteId===p.siteId&&history.modelId===p.modelId&&history.allReached===true&&Array.isArray(history.seasons)&&history.seasons.length===5&&history.seasons.every(s=>s.start?.slice(5)===p.date.slice(5)&&Number.isInteger(s.elapsedDays)&&s.elapsedDays>=0)){
  const range=history.seasons.map(s=>s.elapsedDays),min=Math.min(...range),max=Math.max(...range);
  comparison={minDays:min,maxDays:max,actualDays:days,relation:days===null?null:days<min?'earlier':days>max?'later':'within'};
 }
 const weather=entries.filter(e=>e.kind==='daily-air').map(e=>({date:e.date,siteId:id,source:'visitor-reported shielded garden air',kind:'observation',minF:e.minF,maxF:e.maxF}));
 const heat=m?H.evaluate({modelId:p.modelId,biofix:p.biofix,asOf:today,plantingDate:p.date,siteId:id,packetDays:p.packetDays,weather}):null;
 return {planting:p,entries,firstHarvest:first||null,endpoint,actualDays:days,packetDelta,comparison,heat};
}
function paired(data,id,today,{referenceId,regime,referenceLowF,referenceDate}={}){
 const d=validate(data,today);if(!d.plantings.some(p=>p.id===id))throw Error('Unknown planting');
 const pairs=d.entries.filter(e=>e.plantingId===id&&e.kind==='paired-night').map(e=>({...e,siteId:id}));
 return M.assess({asOf:today,siteId:id,referenceId,regime,referenceLowF,referenceDate,pairs});
}
return {schema,blank,validate,summarize,paired,kinds,sites};
});
