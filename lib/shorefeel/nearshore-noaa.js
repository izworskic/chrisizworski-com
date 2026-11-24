'use strict';
// Optional NOAA Great Lakes satellite-water context for curated ShoreFeel beaches.
// The nearest valid GLSEA pixel is NOT water temperature in the swimming area.
// Never make the official air forecast depend on this slower optional source.
const {parseGLSEAGridCsv}=require('./engine.js');
const DATASET='GLSEA_ACSPO_GCS';
const SOURCE_URL='https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.graph';
const ROOT='https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.csv?';
const MAX_AGE_HOURS=36;
const MAX_DISTANCE_KM=4;
const min=-2,max=36;
const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
function position(beach){
 const point=beach?.reference||beach;
 if(!finite(point?.lat,40,50)||!finite(point?.lon,-93,-75))return null;
 return {lat:point.lat,lon:point.lon};
}
function gridUrl(beach){
 const p=position(beach);
 if(!p)return null;
 const lo=(p.lat-.05).toFixed(3),hi=(p.lat+.05).toFixed(3);
 const west=(p.lon-.075).toFixed(3),east=(p.lon+.075).toFixed(3);
 // Four daily time slices; index syntax is intentional (not epoch seconds).
 return ROOT+'sst[last-3:1:last][('+lo+'):('+hi+')][('+west+'):('+east+')]';
}
function decode(raw,beach,now=new Date()){
 const p=position(beach);
 if(!p||!Number.isFinite(now?.getTime?.()))return null;
 // NOAA masks land. Do not use whole-lake means or an offshore buoy here.
 const measure=parseGLSEAGridCsv(raw,[{key:'closest',...p,maxKm:MAX_DISTANCE_KM}],now).closest;
 if(!measure||!finite(measure.tempF,min*9/5+32,max*9/5+32)||
    !finite(measure.distanceKm,0,MAX_DISTANCE_KM))return null;
 const t=Date.parse(measure.observedAt||''),age=(now.getTime()-t)/3600000;
 if(!Number.isFinite(t)||age<0||age>MAX_AGE_HOURS)return null;
 return {
   kind:'satellite',tempF:measure.tempF,observedAt:measure.observedAt,
   sampleLat:measure.sampleLat,sampleLon:measure.sampleLon,
   distanceKm:measure.distanceKm,ageHours:Math.round(age*10)/10,
   dataset:DATASET,sourceUrl:SOURCE_URL,
   scope:'NOAA GLSEA analyzed offshore water pixel, not swimming-area water or an on-sand thermometer'
 };
}
async function nearbyWater(beach,now=new Date(),fetcher=fetch){
 const url=gridUrl(beach);
 if(!url)return null;
 try{
  const response=await fetcher(url,{
   headers:{Accept:'text/csv', 'User-Agent':'ChrisIzworski-ShoreFeel/2.1 (https://chrisizworski.com/great-lakes-beaches/)'},
   signal:AbortSignal.timeout(3000)
  });
  if(!response?.ok)return null;
  const txt=await response.text();
  return decode(txt,beach,now);
 }catch{return null;}
}
module.exports={DATASET,SOURCE_URL,MAX_AGE_HOURS,MAX_DISTANCE_KM,position,gridUrl,decode,nearbyWater};
