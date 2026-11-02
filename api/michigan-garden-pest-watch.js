'use strict';
// GET /api/michigan-garden-pest-watch?zip=48706&crop=squash&stage=growing
// Official NWS outlook is *weather context only*; no pest emergence is calculated here.
const core=require('../lib/garden-pest-watch.cjs');
const ZIP=require('../lib/leafcutter-zip.cjs');
const RELEASE=require('../lib/leafcutter-release.cjs');
const NWS='https://api.weather.gov';
const UA='GardenPestWatch/1.0 (https://chrisizworski.com/michigan-garden-pest-watch/; contact via site)';
const UNKNOWN=Object.freeze({status:'UNAVAILABLE',source:'National Weather Service',sourceUrl:'https://www.weather.gov/documentation/services-web-api',
  tags:[],summary:'NWS forecast unavailable. Seasonal crop scouting remains useful; no weather-based pest inference.'});
const dateOk=s=>typeof s==='string'&&Number.isFinite(Date.parse(s));
function parseForecast(data,nowMs=Date.now()){
 const p=data?.properties, periods=p?.periods,issuedAt=p?.updated;
 if(!dateOk(issuedAt)||nowMs-Date.parse(issuedAt)>24*3600000||Date.parse(issuedAt)>nowMs+3600000)throw Error('NWS_FORECAST_STALE');
 if(!Array.isArray(periods)||periods.length<24)throw Error('NWS_FORECAST_INCOMPLETE');
 const hrs=periods.filter(h=>dateOk(h.startTime)&&Date.parse(h.startTime)>=nowMs-3600000&&Date.parse(h.startTime)<nowMs+72*3600000
   &&Number.isFinite(h.temperature)&&h.temperatureUnit==='F');
 if(hrs.length<24)throw Error('NWS_FORECAST_INCOMPLETE');
 const high=Math.max(...hrs.map(h=>h.temperature)),low=Math.min(...hrs.map(h=>h.temperature));
 const moistHours=hrs.filter(h=>Number(h.probabilityOfPrecipitation?.value)>=60||Number(h.relativeHumidity?.value)>=90).length;
 const hotDryHours=hrs.filter(h=>h.temperature>=85&&
   h.probabilityOfPrecipitation?.value!==null&&h.probabilityOfPrecipitation?.value!==undefined&&
   Number(h.probabilityOfPrecipitation.value)<=30&&Number(h.relativeHumidity?.value)<=65).length;
 const tags=[];
 if(hotDryHours>=6)tags.push('hot_dry');
 if(moistHours>=8)tags.push('wet');
 const explanation=tags.length===0?'No selected broad weather scouting cue was triggered. This does not mean pests are absent.':
   tags.includes('hot_dry')&&tags.includes('wet')?'Mixed humid and hot/dry periods appear in this outlook; scout according to the crop and observed symptoms.':
   tags.includes('hot_dry')?'Several hot, relatively dry forecast hours suggest checking drought-stressed plants for mites.':
   'Extended humid or rain-favorable forecast hours suggest inspecting leaves and low-growing plants.';
 return {status:'AVAILABLE',source:'National Weather Service',sourceUrl:'https://www.weather.gov/documentation/services-web-api',
  issuedAt,checkedAt:new Date(nowMs).toISOString(),periodHours:hrs.length,horizonHours:72,
  forecastLowF:Math.round(low),forecastHighF:Math.round(high),tags,
  summary:explanation,method:'Uncalibrated, qualitative 72-hour scouting cue from NWS hourly gridded forecast, not observed local pest activity or a validated infection model'};
}
async function nws(site,fetcher=fetch,nowMs=Date.now()){
 const base=NWS+'/points/'+site.lat.toFixed(4)+','+site.lon.toFixed(4);
 const opts={headers:{accept:'application/geo+json','user-agent':UA},redirect:'error',signal:AbortSignal.timeout(6500)};
 const a=await fetcher(base,opts);
 if(!a.ok)throw Error('NWS_POINT_ERROR');
 const d=await a.json();
 const link=d?.properties?.forecastHourly;
 if(!link)throw Error('NWS_POINT_NO_HOURLY');
 const url=new URL(link);
 if(url.protocol!=='https:'||url.hostname!=='api.weather.gov'||!url.pathname.startsWith('/gridpoints/'))throw Error('NWS_UNTRUSTED_URL');
 const b=await fetcher(url.href,opts);
 if(!b.ok)throw Error('NWS_HOURLY_ERROR');
 return parseForecast(await b.json(),nowMs);
}
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'GET only'});}
 const rawZip=req.query?.zip;
 const hasZip=rawZip!==undefined&&rawZip!==null&&rawZip!=='';
 const zip=typeof rawZip==='string'?rawZip:'';
 if(hasZip&&!ZIP.validMichiganZip(zip))return res.status(400).json({status:'UNAVAILABLE',code:'INVALID_ZIP',error:'Enter a Michigan ZIP area beginning with 48 or 49.'});
 const crop=typeof req.query?.crop==='string'?req.query.crop:'squash';
 const stage=typeof req.query?.stage==='string'?req.query.stage:'growing';
 const observed=typeof req.query?.observed==='string'?req.query.observed:null;
 const siteId=typeof req.query?.site==='string'?req.query.site:'bay-city';
 let site=hasZip?null:RELEASE.location(siteId);
 if(!hasZip&&!site)return res.status(400).json({status:'UNAVAILABLE',code:'UNKNOWN_CITY',error:'Choose a supported reference location.'});
 try{if(hasZip)site=await ZIP.resolveZip(zip);}
 catch(error){
  res.setHeader('Cache-Control','no-store');
  const missing=error.statusCode===404;
  return res.status(missing?404:503).json({status:'UNAVAILABLE',code:missing?'ZIP_NOT_MAPPED':'ZIP_LOOKUP_UNAVAILABLE',error:missing?'ZIP area not mapped. Choose a named city.':'ZIP mapping temporarily unavailable. Try a reference city.'});
 }
 let weather=UNKNOWN;
 try{weather=await nws(site);}catch(_error){weather={...UNKNOWN};}
 const result=core.decision({crop,stage,observed,weather});
 // Observations are voluntarily entered in the URL, not saved to a database.
 res.setHeader('Cache-Control',observed?'private, no-store':'public, s-maxage=1800, stale-while-revalidate=300');
 return res.status(200).json({...result,asOfDate:new Date().toISOString().slice(0,10),
   location:{name:site.name||'Michigan ZIP area',kind:site.kind||'named-city',zip:site.zip||null,
    coordinateMeaning:site.coordinateMeaning||'Reference city coordinate, not your property',
    source:hasZip?'US Census 2020 ZCTA interior point':'named Michigan reference city'},
   weather,regionalObservation:{status:'UNAVAILABLE',note:'Verified current Michigan scouting reports not yet ingested; absence of a report is not evidence that pests are absent.'},
   biologicalForecast:{status:'UNAVAILABLE',note:'No validated species-specific current heat input is connected. Season calendar is not a local emergence forecast.'},
   licenseWarning:'Model page access or scientific publication does not authorize undocumented API reuse or photo copying.'});
};
module.exports._test={parseForecast,nws,UNKNOWN};
