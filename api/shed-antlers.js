'use strict';
const E=require('../lib/shed-window.cjs');
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
  const forecast=await nwsHourly(site);
  const daily=E.dailyFromHourly(forecast.periods);
  if(daily.length<3)throw new Error('Too few complete forecast days');
  return res.status(200).json({
   location:site,season,daily,generatedAt:new Date().toISOString(),
   forecastUpdatedAt:forecast.updatedAt,
   sources:{...SOURCES,nwsForecast:forecast.url},
   snowDepth:{status:'not-sampled',valueInches:null,description:'NOAA snow analyses are provided as a separate map reference. No precise ground snow depth was sampled for this location.'},
   caveat:'NWS forecast is weather only. Snow on the ground must be checked locally. This does not predict antler shedding, deer location, or odds of finding a shed.'
  });
 }catch(err){
  return res.status(503).json({error:'NWS forecast unavailable',location:site,season,detail:'Do not infer field conditions from unavailable data.',sources:SOURCES});
 }
};
