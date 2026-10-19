'use strict';
const E=require('../lib/shed-window.cjs');
const RETREAT=require('../lib/shed-snow-retreat.cjs');
const NWS='https://api.weather.gov';
const UA='ShedAntlerSearchWindow/1.0 (+https://chrisizworski.com/michigan-shed-antlers/; contact: https://chrisizworski.com/)';
const SOURCES={
 nws:'https://www.weather.gov/documentation/services-web-api',
 noaaSnow:'https://www.nohrsc.noaa.gov/nsa/',
 noaaRaster:'https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer',
 deer:'https://www.michigan.gov/dnr/managing-resources/wildlife/deer/deer-wintering-complexes'
};
async function json(url){
 const r=await fetch(url,{headers:{'Accept':'application/geo+json, application/json','User-Agent':UA},signal:AbortSignal.timeout(8500)});
 if(!r.ok)throw new Error('Upstream source returned '+r.status);
 return r.json();
}
async function nwsHourly(site){
 const points=await json(NWS+'/points/'+site.lat+','+site.lon);
 const hourly=points?.properties?.forecastHourly;
 if(typeof hourly!=='string'||!hourly.startsWith(NWS+'/gridpoints/'))throw new Error('NWS hourly forecast link missing');
 const result=await json(hourly);
 const periods=result?.properties?.periods;
 if(!Array.isArray(periods)||periods.length<24)throw new Error('NWS hourly forecast is incomplete');
 return {periods,url:hourly,updatedAt:result?.properties?.updated||result?.properties?.generatedAt||null};
}
// ArcGIS identify returns raster values for Snow Depth (layer 0, image layer 3).
// Only a qualitative modeled-cover signal is used; raster units are not verified.
// Missing, stale, invalid, or negative values are NOT reported as bare ground.
async function noaaSnow(site){
 const base=SOURCES.noaaRaster+'/identify';
 const x=site.lon,y=site.lat;
 const args=new URLSearchParams({f:'pjson',geometry:x+','+y,geometryType:'esriGeometryPoint',
  sr:'4326',layers:'all:0',tolerance:'1',
  mapExtent:(x-.2)+','+(y-.2)+','+(x+.2)+','+(y+.2),
  imageDisplay:'800,600,96',returnGeometry:'false'});
 const url=base+'?'+args.toString();
 try{
  const r=await fetch(url,{headers:{'Accept':'application/json','User-Agent':UA},signal:AbortSignal.timeout(6500)});
  if(!r.ok)throw Error('NOAA status '+r.status);
  const json=await r.json();
  if(!Array.isArray(json.results))throw Error('NOAA image unavailable');
  const image=json.results.find(q=>q.layerId===3);
  const footprint=json.results.find(q=>q.layerId===2);
  const raw=image?.attributes?.['Service Pixel Value'];
  const value=Number(raw);
  const stamp=footprint?.attributes?.idp_validtime||footprint?.attributes?.idp_filedate||null;
  const ts=stamp?Date.parse(stamp+' UTC'):NaN;
  if(raw===null||raw===undefined||raw===''||!Number.isFinite(value)||value<0||!Number.isFinite(ts)||Date.now()-ts>72*3600000||ts>Date.now()+3600000)throw Error('NOAA snow raster invalid or stale');
  return {status:value>0?'modeled-cover':'modeled-bare',description:value>0?
   'NOAA gridded analysis detects snow at the regional sampling point. Confirm your actual field conditions.':
   'NOAA gridded analysis shows no snow at the sampling point. Shaded woods and nearby fields may differ.',
   validTime:stamp,source:SOURCES.noaaRaster,interpretation:'Qualitative point result from NOAA modeled 1-km snow analysis, not a measured parcel snow depth.'};
 }catch{
  return {status:'unavailable',description:'Current NOAA analyzed snow cover could not be verified. Select local ground conditions yourself.',validTime:null,source:SOURCES.noaaRaster};
 }
}

async function modeledSnowHistory(site){
 try{
  const r=await fetch(RETREAT.sourceUrl(site),{headers:{Accept:'application/json','User-Agent':UA},signal:AbortSignal.timeout(6500)});
  if(!r.ok)throw Error('History source unavailable');
  return RETREAT.analyze(await r.json());
 }catch{return RETREAT.missing('Recent model-depth history cannot be verified right now.');}
}

module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=1800');
 if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return res.status(405).json({error:'Method not allowed'});}
 const mode=String(req.query?.mode||'forecast');
 if(mode==='locations')return res.status(200).json({locations:E.LOCATIONS,season:E.phase(),sources:SOURCES});
 if(mode!=='forecast')return res.status(400).json({error:'Unknown mode'});
 const site=E.lookup(String(req.query?.site||'bay-city'));
 if(!site)return res.status(400).json({error:'Unknown forecast location'});
 const season=E.phase();
 try{
  const [forecast,snowAnalysis,snowTrend]=await Promise.all([nwsHourly(site),noaaSnow(site),modeledSnowHistory(site)]);
  const daily=E.dailyFromHourly(forecast.periods);
  if(daily.length<3)throw new Error('Too few complete forecast days');
  return res.status(200).json({
   location:site,season,daily,generatedAt:new Date().toISOString(),
   forecastUpdatedAt:forecast.updatedAt,
   sources:{...SOURCES,nwsForecast:forecast.url},
   snowDepth:{...snowAnalysis,valueInches:null},
   snowTrend,
   caveat:'NWS forecast is weather only. Open-Meteo model-history and NOAA current snow analysis are independent grids, never a measured field history. Snow on the ground must be checked locally. This does not predict antler shedding, deer location, or odds of finding a shed.'
  });
 }catch(err){
  return res.status(503).json({error:'NWS forecast unavailable',location:site,season,detail:'Do not infer field conditions from unavailable data.',sources:SOURCES});
 }
};
