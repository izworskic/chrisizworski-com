'use strict';
// Compare two DISTINCT NWS 2.5 km forecast cells by the SAME valid hour.
// This is a model-grid comparison, never a measured on-sand/inland gradient.
const {forecastGridRelationship}=require('./physics.js');
const {parseHour}=require('./wind-turn.js');
const HOUR=3600000;
const plausible=t=>typeof t==='number'&&Number.isFinite(t)&&t>=-60&&t<=140;
function indexHours(periods,now){
 const indexed=new Map(),conflicts=new Set(),min=now-HOUR,max=now+24*HOUR;
 for(const p of Array.isArray(periods)?periods:[]){
  const at=parseHour(p?.startsAt);
  if(at===null||at<min||at>max)continue;
  const val=plausible(p.tempF)?p.tempF:null;
  if(conflicts.has(at))continue;
  if(indexed.has(at)&&indexed.get(at)!==val){
   indexed.delete(at);conflicts.add(at);continue;
  }
  indexed.set(at,val);
 }
 return {indexed,conflictHours:conflicts.size};
}
function pairedHourlyAir(shore,inland,shoreGrid,inlandGrid,now=new Date()){
 const grid=forecastGridRelationship(shoreGrid,inlandGrid);
 const base={status:'unavailable',gridRelationship:grid,rows:[],
  scope:'Two NWS land-area hourly temperature forecasts, near Bay City State Park and about 16 km west in Bay County. Neither is a thermometer at the beach or a verified quarter-mile microclimate.',
  publicationAuthorizedAsBeachCorrection:false};
 const t=now instanceof Date?now.getTime():NaN;
 if(!Number.isFinite(t)||grid.status!=='distinct-grid')
  return {...base,reason:grid.description||'Forecast grid identity cannot be verified.'};
 const a=indexHours(shore,t),b=indexHours(inland,t);
 const rows=[];
 for(const [at,temp] of a.indexed){
  if(!plausible(temp)||!plausible(b.indexed.get(at)))continue;
  const other=b.indexed.get(at);
  rows.push({startsAt:new Date(at).toISOString(),shoreF:temp,inlandF:other,
   shoreMinusInlandF:Math.round((temp-other)*10)/10});
 }
 rows.sort((x,y)=>Date.parse(x.startsAt)-Date.parse(y.startsAt));
 const conflictCount=a.conflictHours+b.conflictHours;
 return {...base,status:rows.length?(conflictCount?'partial':'available'):'unavailable',
  rows,conflictCount,
  reason:rows.length?'The model grid differences are forecast-to-forecast comparisons at matching valid hours; they do not calibrate an on-sand estimate.':
   'No overlapping, valid hourly temperature forecasts for two verified distinct NWS grid cells.'};
}
module.exports={pairedHourlyAir};
