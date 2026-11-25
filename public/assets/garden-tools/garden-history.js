/* Shared historical crop replay. Regional gridded weather, not observed harvest dates. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./garden-harvest.js'));else root.GardenHistory=factory(root.GardenHarvest);})(typeof globalThis!=='undefined'?globalThis:this,function(H){
'use strict';
const DAY=86400000, dateOK=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const add=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);
function replay(archive,{modelId,biofix,monthDay,packetDays}={}){
 const model=Object.hasOwn(H.models,modelId)?H.models[modelId]:null;
 if(!model||biofix!==model.biofix||typeof monthDay!=='string'||!dateOK('2025-'+monthDay)||!archive?.days||archive.scope!=='historical-gridded-weather-not-observation')throw Error('Invalid replay input');
 const seasons=[];
 for(let year=2021;year<=2025;year++){
  const start=year+'-'+monthDay;let total=0,crossing=null,days=0;
  for(let d=start;d<=year+'-12-31';d=add(d,1)){
   const w=archive.days.get(d);if(!w)break;
   total+=H.dailyGdd(w.minF,w.maxF,model.baseF,model.capF);days++;
   if(total>=model.targetGddF){crossing=d;break;}
  }
  seasons.push({year,start,heatCrossingDate:crossing,elapsedDays:crossing?(Date.parse(crossing)-Date.parse(start))/DAY:null,packetDate:Number.isInteger(packetDays)&&packetDays>=1&&packetDays<=365?add(start,packetDays):null,daysEvaluated:days});
 }
 return {schema:'garden-harvest-history-v1',scope:'historical-heat-crossings-not-observed-harvests',siteId:archive.siteId,source:archive.source,modelId,seasons,allReached:seasons.every(x=>x.heatCrossingDate!==null)};
}

function unpack(data,siteId){
 if(data?.schema!=='garden-daymet-archive-v1'||data.firstYear!==2021||data.lastYear!==2025||data.unit!=='hundredths Celsius'||data.source!=='https://doi.org/10.3334/ORNLDAAC/2129'||!Object.hasOwn(data.cities||{},siteId))throw Error('Archive unavailable');
 const s=data.cities[siteId],v=s.values;if(!Array.isArray(v)||v.length!==3650||!Number.isFinite(s.lat)||!Number.isFinite(s.lon))throw Error('Invalid archive');
 const days=new Map();
 for(let i=0;i<1825;i++){const lo=v[2*i],hi=v[2*i+1];if(!Number.isInteger(lo)||!Number.isInteger(hi)||lo>hi||lo<-6222||hi>6000)throw Error('Invalid temperature');const date=add((2021+Math.floor(i/365))+'-01-01',i%365);days.set(date,{date,minF:lo/100*9/5+32,maxF:hi/100*9/5+32});}
 return {siteId,latitude:s.lat,longitude:s.lon,source:data.source,scope:'historical-gridded-weather-not-observation',days};
}
return {replay,unpack};
});
