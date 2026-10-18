'use strict';
/**
 * U.S. National Ice Center / NOAA first-party GIS adapters.
 * IMS is a single analysis cell (roughly 1 km), NEVER a regional percentage or marsh survey.
 * Great Lakes SIGRID polygons describe the charted water surface only, NOT adjacent wetlands.
 */
const IMS='https://mapservices.weather.noaa.gov/raster/rest/services/obs/usnic_ims_snow_ice_1km/ImageServer';
const USNIC='https://mapservices.weather.noaa.gov/vector/rest/services/obs/usnic_greatlakes_ice_chart/MapServer/0';
const AGE_LIMIT_MS=72*3600000;
const HEADERS={Accept:'application/json','User-Agent':'WaterfowlFreezeLine/2.0 (+https://chrisizworski.com/waterfowl-freeze-line/)'};
async function read(url,timeoutMs=6200){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{signal:controller.signal,headers:HEADERS});
  if(!response.ok)throw Error('HTTP '+response.status);
  const body=await response.json();
  if(!body||body.error)throw Error('GIS service returned error');
  return body;
 }finally{clearTimeout(timer);}
}
function timestamp(value){
 if(typeof value==='number'&&Number.isFinite(value)&&value>1e12)return value;
 if(typeof value==='string'&&/^\d{13}$/.test(value))return Number(value);
 return null;
}
function provenance(attrs,now=Date.now()){
 const ts=timestamp(attrs?.idp_filedate);
 if(!ts)return {validAt:null,ageHours:null,fresh:false};
 const age=now-ts;
 return {validAt:new Date(ts).toISOString(),ageHours:Math.round(age/3600000),fresh:age>=-3*3600000&&age<=AGE_LIMIT_MS};
}
const IMS_CLASSES=Object.freeze({
 0:'Outside mapped coverage',1:'Water class (ice not indicated)',2:'Snow-free land',3:'Ice-covered surface',4:'Snow-covered land'
});
function parseIMS(body,now=Date.now()){
 const raw=body?.value,n=raw===null||raw===undefined||String(raw).trim()===''?NaN:Number(raw),attrs=body?.catalogItems?.features?.[0]?.attributes;
 const where=provenance(attrs,now);
 if(!Number.isInteger(n)||!Object.hasOwn(IMS_CLASSES,n))return {status:'unavailable',classCode:null,description:'No valid 1-km surface classification',source:'NOAA USNIC IMS',...where};
 if(!where.fresh)return {status:'stale',classCode:null,description:'NOAA surface analysis is missing a recent file timestamp',source:'NOAA USNIC IMS',...where};
 return {status:'observed_analysis',classCode:n,description:IMS_CLASSES[n],
  snowCoveredLand:n===4,iceCoveredSurface:n===3,source:'NOAA USNIC IMS',
  pixelResolutionKm:1,spatialScope:'One reference-grid cell; not the entire region or a measured wetland',...where};
}
function imsURL(lat,lon){
 const geometry=JSON.stringify({x:lon,y:lat,spatialReference:{wkid:4326}});
 return IMS+'/identify?'+new URLSearchParams({f:'pjson',geometry,geometryType:'esriGeometryPoint',returnGeometry:'false'}).toString();
}
async function surfaceFor(region,now=Date.now()){
 try{return {...parseIMS(await read(imsURL(region.lat,region.lon)),now),referenceLat:region.lat,referenceLon:region.lon};}
 catch{return {status:'unavailable',classCode:null,source:'NOAA USNIC IMS',description:'No current mapped 1-km classification received',
  referenceLat:region.lat,referenceLon:region.lon,validAt:null,ageHours:null};}
}
const CT_CODES=Object.freeze({
 '00':'Ice free','01':'Less than 10% ice','02':'Ice-containing water (concentration not provided)',
 '10':'10% ice','20':'20% ice','30':'30% ice','40':'40% ice','50':'50% ice',
 '60':'60% ice','70':'70% ice','80':'80% ice','90':'90% ice','91':'90–100% ice',
 '92':'100% ice','99':'Unknown',
 '12':'10–20% ice','13':'10–30% ice','23':'20–30% ice','24':'20–40% ice',
 '34':'30–40% ice','35':'30–50% ice','45':'40–50% ice','46':'40–60% ice',
 '56':'50–60% ice','57':'50–70% ice','67':'60–70% ice','68':'60–80% ice',
 '78':'70–80% ice','79':'70–90% ice','81':'80–100% ice','89':'80–90% ice'
});
function parseIceChart(body,now=Date.now()){
 const items=body?.features;
 if(!Array.isArray(items)||!items.length)return {status:'unavailable',source:'NOAA USNIC Great Lakes Ice Chart',description:'No ice-chart polygon covers this reference point',concentration:null,validAt:null};
 const attrs=items[0]?.attributes||{},where=provenance(attrs,now);
 const raw=String(attrs.ct??'').trim();
 const code=/^\d{2}$/.test(raw)?raw:'';
 const description=CT_CODES[code];
 if(!description||code==='99')return {status:'unavailable',source:'NOAA USNIC Great Lakes Ice Chart',description:'Undetermined ice concentration code',concentration:null,...where};
 if(!where.fresh)return {status:'stale',source:'NOAA USNIC Great Lakes Ice Chart',description:'Ice chart has no recent dated analysis',concentration:null,...where};
 return {status:'observed_chart',source:'NOAA USNIC Great Lakes Ice Chart',description,
  concentration:description,code,spatialScope:'Official chart polygon at a reference point; not marsh ice',...where};
}
const LAKE_POINTS=Object.freeze({
 'saginaw-bay':{lat:43.75,lon:-83.78,label:'Central Saginaw Bay waters'},
 'detroit-river':{lat:42.30,lon:-83.08,label:'Detroit River open channel'},
 'western-lake-erie':{lat:41.69,lon:-83.00,label:'Western Lake Erie water'},
 'green-bay':{lat:44.73,lon:-87.80,label:'Green Bay water'}
});
function iceURL(lat,lon){
 return USNIC+'/query?'+new URLSearchParams({f:'pjson',geometry:JSON.stringify({x:lon,y:lat,spatialReference:{wkid:4326}}),
 geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects',
 where:'1=1',outFields:'ct,idp_filedate',returnGeometry:'false',resultRecordCount:'5'}).toString();
}
async function lakeIceFor(region,now=Date.now()){
 const p=LAKE_POINTS[region.id];
 if(!p)return {status:'not_applicable',description:'No Great Lakes ice-chart reference point configured',source:'NOAA USNIC Great Lakes Ice Chart'};
 try{return {...parseIceChart(await read(iceURL(p.lat,p.lon)),now),reference:p.label,referenceLat:p.lat,referenceLon:p.lon};}
 catch{return {status:'unavailable',source:'NOAA USNIC Great Lakes Ice Chart',description:'No recent official chart polygon retrieved',reference:p.label};}
}
module.exports={surfaceFor,lakeIceFor,parseIMS,parseIceChart,provenance,imsURL,iceURL,IMS_CLASSES,CT_CODES,LAKE_POINTS};
