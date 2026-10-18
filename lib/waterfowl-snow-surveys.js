'use strict';
/* NOAA NOHRSC 1-km snow depth and Michigan DNR Wetland Wonders official weekly counts.
   All reports are dated observations; source missing ≠ 0.
   NOAA raster values are grouped by the official inch-labeled Snow Depth legend.
*/
const NOAA='https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer';
const DNR_ROOT='https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders/';
const HEADERS={Accept:'application/json,text/html','User-Agent':'WaterfowlFreezeLine/3.0 (+https://chrisizworski.com/waterfowl-freeze-line/)'};
const SITES=Object.freeze([
 {id:'fish-point',name:'Fish Point State Wildlife Area',region:'saginaw-bay',slug:'fish-point-swa'},
 {id:'nayanquing',name:'Nayanquing Point State Wildlife Area',region:'saginaw-bay',slug:'nayanquing-point-swa'},
 {id:'shiawassee',name:'Shiawassee River State Game Area',region:'saginaw-bay',slug:'shiawassee-river-sga'},
 {id:'harsens',name:'Harsens Island / St. Clair Flats',region:'detroit-river',slug:'harsens-island'},
 {id:'pointe-mouillee',name:'Pointe Mouillee State Game Area',region:'western-lake-erie',slug:'pointe-mouillee-sga'},
 {id:'muskegon',name:'Muskegon County Resource Recovery',region:'northern-lower',slug:'muskegon-county-rr'},
 {id:'fennville',name:'Fennville Farm Unit',region:'illinois-river',slug:'fennville-farm-unit-at-allegan-state-game-area',otherRegion:'southwest-michigan'}
]);
const SURVEY_REGIONS=Object.freeze({
 'saginaw-bay':['fish-point','nayanquing','shiawassee'],
 'detroit-river':['harsens'],
 'western-lake-erie':['pointe-mouillee']
});
async function get(url,ms=6500,type='json'){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
 try{const r=await fetch(url,{headers:HEADERS,signal:c.signal});if(!r.ok)throw Error('HTTP '+r.status);
  return type==='html'?await r.text():await r.json();}finally{clearTimeout(t);}
}
function snowURL(lat,lon){
 const geometry=JSON.stringify({x:lon,y:lat,spatialReference:{wkid:4326}});
 return NOAA+'/identify?'+new URLSearchParams({f:'pjson',geometry,geometryType:'esriGeometryPoint',
  sr:'4326',layers:'all:0',tolerance:'1',mapExtent:[lon-.1,lat-.1,lon+.1,lat+.1].join(','),
  imageDisplay:'400,400,96',returnGeometry:'false'}).toString();
}
const SNOW_INCH_BOUNDS=[0,0.39,2.0,3.9,9.8,20,39,59,98,197,295,394,787];
function parseSnow(body,now=Date.now()){
 const results=Array.isArray(body?.results)?body.results:[];
 const image=results.find(r=>r.layerId===3&&r.layerName==='Image');
 const footprint=results.find(r=>r.layerId===2&&r.layerName==='Footprint');
 const raw=image?.attributes?.['Classify.Pixel Value']??image?.attributes?.['Service Pixel Value'];
 const val=raw===undefined||raw===null||String(raw).trim()===''?NaN:Number(raw);
 const validRaw=footprint?.attributes?.idp_validtime??image?.attributes?.idp_validtime;
 // ArcGIS NOAA service exposes a date STRING, not guaranteed UTC. Do not claim minute-scale precision.
 const parsed=typeof validRaw==='string'&&/^\d\d\/\d\d\/\d{4} /.test(validRaw)?Date.parse(validRaw):NaN;
 const age=Number.isFinite(parsed)?now-parsed:Infinity;
 const validAt=Number.isFinite(parsed)?new Date(parsed).toISOString():null;
 const base={source:'NOAA NOHRSC National Snow Analyses',referenceType:'1-km modelled snow-depth map point',
   validAt,sourceUrl:'https://www.nohrsc.noaa.gov/nsa/',status:'unavailable',inchesRange:null,
   approximateDepthInches:null,reason:'No recent verified model snow-depth value'};
 if(!(age>=-6*3600000&&age<=72*3600000))return {...base,status:validAt?'stale':'unavailable'};
 if(!Number.isFinite(val)||val<0||val>787)return base;
 // The image classification itself is defined by the official NOAA legend in INCHES.
 // Show conservative legend bins, not a false station-observed or exact-depth reading.
 const i=SNOW_INCH_BOUNDS.findIndex((v,j)=>j<SNOW_INCH_BOUNDS.length-1&&val>=v&&val<SNOW_INCH_BOUNDS[j+1]);
 if(i<0)return base;
 const low=SNOW_INCH_BOUNDS[i],high=SNOW_INCH_BOUNDS[i+1];
 return {...base,status:'modeled',inchesRange:{min:low,max:high},approximateDepthInches:Number(val.toFixed(2)),
   description:val===0?'0 in at map pixel':low+'–'+high+' in map band',
   caution:'Single NOAA modelled map cell, not observed on-site snow depth; zero is valid only for a current mapped cell'};
}
async function snowFor(region,now=Date.now()){
 try{return {...parseSnow(await get(snowURL(region.lat,region.lon),7000),now),reference:{lat:region.lat,lon:region.lon}};}
 catch{return {status:'unavailable',source:'NOAA NOHRSC National Snow Analyses',inchesRange:null,approximateDepthInches:null,
 reference:{lat:region.lat,lon:region.lon},reason:'Official snow-depth map request unavailable'};}
}
function unhtml(s){return String(s||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
 .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'')
 .replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function dateCell(s){
 const m=String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(!m)return null;
 const y=+m[3],mo=+m[1],d=+m[2],ms=Date.UTC(y,mo-1,d,12);
 const v=new Date(ms);
 if(v.getUTCFullYear()!==y||v.getUTCMonth()!==mo-1||v.getUTCDate()!==d)return null;
 return {day:v.toISOString().slice(0,10),ms};
}
function parseTable(table,name,now){
 const header=(table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)||[])[1];
 if(!header)return [];
 const headings=[...header.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>unhtml(m[1]).toLowerCase());
 const index=headings.findIndex(h=>h.startsWith('total '+name));
 const dateIndex=headings.findIndex(h=>h.startsWith('week ending'));
 if(index<0||dateIndex<0)return [];
 const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 const items=[];
 for(const row of rows){
  const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>unhtml(m[1]));
  if(cells.length<=index||cells.length<=dateIndex)continue;
  const date=dateCell(cells[dateIndex]),num=cells[index].replace(/,/g,'');
  if(!date||date.ms>now+18*3600000||!/^\d+$/.test(num))continue;
  const count=Number(num);
  if(!Number.isSafeInteger(count)||count>10000000)continue;
  items.push({date:date.day,count});
 }
 return items.sort((a,b)=>b.date.localeCompare(a.date));
}
function parseDNR(html,now=Date.now()){
 const tables=[...String(html).matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]);
 const ducks=tables.flatMap(t=>parseTable(t,'ducks',now));
 const geese=tables.flatMap(t=>parseTable(t,'geese',now));
 function latest(arr){
  const rows=[...new Map(arr.map(o=>[o.date,o])).values()].sort((a,b)=>b.date.localeCompare(a.date));
  const first=rows[0],prev=rows[1];
  if(!first)return null;
  return {date:first.date,count:first.count,previous:prev?{date:prev.date,count:prev.count}:null,
   change:prev?first.count-prev.count:null};
 }
 const d=latest(ducks),g=latest(geese);
 if(!d&&!g)return {status:'unavailable',ducks:null,geese:null,reason:'No dated numeric rows in source'};
 const newest=Math.max(...[d,g].filter(Boolean).map(x=>Date.parse(x.date+'T12:00:00Z')));
 const daysOld=Math.floor((now-newest)/86400000);
 return {status:daysOld>28?'stale':'reported',daysOld,ducks:d,geese:g,
   coverage:'Official weekly site counts; survey protocols, effort and water management differ by location'};
}
async function siteFor(site,now=Date.now()){
 const url=DNR_ROOT+site.slug+'/waterfowl-counts';
 try{const value=parseDNR(await get(url,8000,'html'),now);
 return {id:site.id,name:site.name,region:site.region,url,source:'Michigan DNR Wetland Wonders',...value};}
 catch{return {id:site.id,name:site.name,region:site.region,url,source:'Michigan DNR Wetland Wonders',
  status:'unavailable',ducks:null,geese:null,reason:'Official survey could not be retrieved'};}
}
async function surveysFor(region,now=Date.now()){
 const ids=SURVEY_REGIONS[region.id]||[];
 const sites=SITES.filter(s=>ids.includes(s.id));
 const reports=await Promise.all(sites.map(s=>siteFor(s,now)));
 return {status:reports.length?'sources_checked':'no_mapped_site',regionId:region.id,
  sites:reports,method:'Site-level weekly totals are NOT lake counts; declining marsh counts do not establish lake displacement.',
  source:'https://www.michigan.gov/dnr/things-to-do/hunting/where/wetland-wonders'};
}
module.exports={snowURL,parseSnow,snowFor,parseDNR,surveysFor,SITES,SURVEY_REGIONS,SNOW_INCH_BOUNDS};
