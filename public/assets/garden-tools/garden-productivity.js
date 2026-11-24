/* Measured production arithmetic; no modeled yields or estimates of missing harvests. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GardenProductivity=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const LB_G=453.59237,DAY=86400000;
const units={lb:LB_G,oz:LB_G/16,kg:1000,g:1};
const days=(a,b)=>(Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/DAY;
function toGrams(n,unit){
 if(typeof n!=='number'||!Number.isFinite(n)||n<0||!Object.hasOwn(units,unit))throw Error('Enter a measured nonnegative weight and valid unit');
 const g=Math.round(n*units[unit]);if(g>1000000||n>0&&g===0)throw Error('Weight must round to at least one gram and not exceed 1000 kg');return g;
}
const pounds=g=>g/LB_G;
function cropFor(model){return {'Tomato':'tomatoes','Sweet pepper':'peppers','Cucumber':'cucumbers','Snap bean':'beans','Broccoli':'brassicas'}[model?.crop]||null;}
function summarize(planting,entries){
 const p=planting,q=p.productivity||null,records=entries.filter(e=>e.plantingId===p.id),weighed=records.filter(e=>e.kind==='harvest-weight').sort((a,b)=>a.date.localeCompare(b.date));
 const total=weighed.reduce((s,e)=>({usableG:s.usableG+e.usableG,discardedG:s.discardedG+e.discardedG}),{usableG:0,discardedG:0});
 const losses=records.filter(e=>e.kind==='plant-loss').reduce((n,e)=>n+e.lostCount,0);
 const hasWeight=weighed.length>0||q?.complete===true;
 const area=q?.lengthFt!=null&&q?.widthFt!=null?q.lengthFt*q.widthFt:null;
 const complete=q?.complete===true;
 const milestoneDates=records.filter(e=>['first-green-harvest','first-ripe-harvest','first-harvest','harvest'].includes(e.kind)).map(e=>e.date);
 const unweighedDates=[...new Set(milestoneDates.filter(date=>!weighed.some(e=>e.date===date)))].sort();
 const eligible=complete&&unweighedDates.length===0&&area!==null&&q.group!=='other';
 const observedFirst=[...weighed.map(e=>e.date),...milestoneDates].sort()[0]||null;
 const harvested=total.usableG+total.discardedG;
 return {id:p.id,crop:p.crop,bed:p.bed,siteId:p.siteId,plantingDate:p.date,group:q?.group||null,complete,eligible,closedOn:q?.closedOn||null,areaSqFt:area,plantedCount:q?.plantedCount??null,recordedHarvestDays:weighed.length,usableG:hasWeight?total.usableG:null,discardedG:hasWeight?total.discardedG:null,usableLb:hasWeight?pounds(total.usableG):null,discardedLb:hasWeight?pounds(total.discardedG):null,lbPerSqFt:hasWeight&&area!==null?pounds(total.usableG)/area:null,lbPerPlant:hasWeight&&q?.plantedCount!=null?pounds(total.usableG)/q.plantedCount:null,lossCount:losses,lossFraction:q?.plantedCount!=null?losses/q.plantedCount:null,discardFraction:harvested>0?total.discardedG/harvested:null,firstHarvestDays:observedFirst?days(p.date,observedFirst):null,unweighedDates,weighed};
}
function season(data,year){
 if(!Number.isInteger(year)||year<1900||year>2100)throw Error('Choose a valid harvest year');
 const records=data.entries.filter(e=>e.kind==='harvest-weight'&&e.date.slice(0,4)===String(year)),ids=new Set(records.map(e=>e.plantingId));
 const known=data.plantings.filter(p=>p.date.slice(0,4)===String(year)||ids.has(p.id)||data.entries.some(e=>e.plantingId===p.id&&e.date.slice(0,4)===String(year)&&['first-harvest','first-ripe-harvest','first-green-harvest','harvest','plant-loss'].includes(e.kind)));
 const rows=known.map(p=>summarize(p,data.entries));
 const groups=new Map();for(const e of records){const p=data.plantings.find(x=>x.id===e.plantingId);if(!p)continue;const key=p.productivity?.group||'unclassified';const g=groups.get(key)||{group:key,usableG:0,discardedG:0};g.usableG+=e.usableG;g.discardedG+=e.discardedG;groups.set(key,g);}
 const usableG=records.reduce((n,e)=>n+e.usableG,0),discardedG=records.reduce((n,e)=>n+e.discardedG,0);
 return {year,recordedHarvestDays:records.length,plantingsWithWeights:ids.size,plantingCount:known.length,completedComparableCount:rows.filter(r=>r.eligible).length,openPlantings:rows.filter(r=>!r.complete).length,usableG:records.length?usableG:null,discardedG:records.length?discardedG:null,groups:[...groups.values()].sort((a,b)=>b.usableG-a.usableG)};
}
function compare(data,id){
 const p=data.plantings.find(p=>p.id===id);if(!p)return null;
 const selected=summarize(p,data.entries);
 const rows=data.plantings.filter(x=>x.id!==id&&x.siteId===p.siteId&&x.productivity?.group===selected.group).map(x=>summarize(x,data.entries)).filter(x=>x.eligible).sort((a,b)=>b.lbPerSqFt-a.lbPerSqFt||a.plantingDate.localeCompare(b.plantingDate));
 return {selected,rows:selected.eligible?rows:[],scope:'Completed crop cohorts in the same reference town; observational comparison, not a variety trial'};
}
return {toGrams,pounds,cropFor,summarize,season,compare};
});
