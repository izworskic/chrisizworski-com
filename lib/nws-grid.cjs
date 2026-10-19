'use strict';
// Shared NWS point/grid discovery, extracted from the Michigan ski request pattern.
const points=new Map();
const UA='ChrisIzworski outdoor tools (https://chrisizworski.com/)';
async function fetchJson(url,timeout=7000){
 const u=new URL(url);
 if(!['api.weather.gov','mesonet.agron.iastate.edu'].includes(u.hostname))throw Error('UNTRUSTED_SOURCE');
 const r=await fetch(u.href,{signal:AbortSignal.timeout(timeout),headers:{Accept:'application/geo+json, application/json','User-Agent':UA}});
 if(!r.ok)throw Error('UPSTREAM_'+r.status);
 return r.json();
}
async function gridAt({lat,lon},now=Date.now()){
 const key=lat+','+lon;let info=points.get(key);
 try{
  if(!info||now-info.at>86400000){
   const p=(await fetchJson('https://api.weather.gov/points/'+key,5500)).properties||{};
   if(!p.forecastGridData)throw Error('NO_GRID_ENDPOINT');
   info={at:now,forecastGridData:p.forecastGridData,forecastZone:p.forecastZone,county:p.county,fireWeatherZone:p.fireWeatherZone};points.set(key,info);
  }
  const grid=await fetchJson(info.forecastGridData);
  return {zones:{forecastZone:info.forecastZone,county:info.county,fireWeatherZone:info.fireWeatherZone},grid,updatedAt:grid.properties?.updateTime||null};
 }catch(e){return {error:String(e.message||e).slice(0,80),zones:info||{},grid:null,updatedAt:null};}
}
module.exports={fetchJson,gridAt};
