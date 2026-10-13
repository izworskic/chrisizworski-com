'use strict';
// Shared free NOAA lakewide analysis + NDBC offshore observations + NWS shoreline weather.
// No paid API, cron, Redis, geographic interpolation, or AI-generated weather judgments.
const {LAKES,DESTINATIONS,SOURCE,parseGLSEA,lakeSeries,parseNDBC,weatherPeriods,comfort,bestWeatherWindow}=require('../lib/shorefeel/engine.js');
const HEADERS={'User-Agent':'ChrisIzworski-ShoreFeel/1.0 (https://chrisizworski.com/great-lakes-water-temperature/)',Accept:'text/plain, application/json'};
async function textResponse(url,ms=4000){
  const r=await fetch(url,{headers:HEADERS,signal:AbortSignal.timeout(ms)});
  if(!r.ok)throw new Error('upstream status '+r.status);
  return r.text();
}
async function jsonResponse(url,ms=3600){
  const r=await fetch(url,{headers:{...HEADERS,Accept:'application/geo+json, application/json'},signal:AbortSignal.timeout(ms)});
  if(!r.ok)throw new Error('weather source status '+r.status);
  return r.json();
}
async function weatherFor(place){
  const point=await jsonResponse('https://api.weather.gov/points/'+place.lat.toFixed(4)+','+place.lon.toFixed(4));
  const href=point?.properties?.forecastHourly;
  if(typeof href!=='string'||!href.startsWith('https://api.weather.gov/'))throw new Error('missing official hourly forecast');
  const response=await jsonResponse(href);
  return weatherPeriods(response?.properties?.periods||[]);
}
module.exports=async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Access-Control-Allow-Origin','https://chrisizworski.com');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return res.status(405).json({error:'GET only'});}
  const placeKey=typeof req.query?.place==='string'?req.query.place:'';
  const requested=typeof req.query?.lake==='string'?req.query.lake:'michigan';
  if((placeKey&&!Object.hasOwn(DESTINATIONS,placeKey))||!Object.hasOwn(LAKES,requested)||placeKey&&DESTINATIONS[placeKey].lake!==requested){
    res.setHeader('Cache-Control','no-store');return res.status(400).json({error:'Unsupported lake or destination'});
  }
  res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=1800');
  if(req.method==='HEAD')return res.status(200).end();
  const place=DESTINATIONS[placeKey]||null;
  const [analysis,nearby,forecast]=await Promise.allSettled([
    textResponse(SOURCE,4500),
    place?textResponse('https://www.ndbc.noaa.gov/data/realtime2/'+place.station+'.txt',3700):Promise.resolve(null),
    place?weatherFor(place):Promise.resolve([])
  ]);
  const rows=analysis.status==='fulfilled'?parseGLSEA(analysis.value):[];
  const lakes=Object.fromEntries(Object.keys(LAKES).map(l=>[l,lakeSeries(rows,l)]));
  const nearest=place&&nearby.status==='fulfilled'?parseNDBC(nearby.value):null;
  const periods=forecast.status==='fulfilled'?forecast.value:[];
  const local=place?{
    name:place.name,stationId:place.station,stationName:place.stationName,lat:place.stationLat,lon:place.stationLon,
    caveat:place.stationCaveat,measurement:nearest,measurementStatus:nearest?'recent':'unavailable',
    forecastStatus:periods.length?'available':'unavailable',periods
  }:null;
  const weather=periods.find(p=>p.daylight)||periods[0]||null;
  const assessments=place?Object.fromEntries(['swim','family','paddle','relax'].map(a=>[a,comfort(a,nearest?.tempF??null,weather)])):null;
  return res.status(200).json({
    product:'ShoreFeel',observedAt:null,generatedAt:new Date().toISOString(),source:{name:'NOAA GLERL GLSEA 3',url:SOURCE,method:'Daily satellite-derived whole-lake surface mean; some pixels may use historical nearby passes or smoothing.'},
    lake:requested,lakes,local,assessments,
    weatherWindow:place?bestWeatherWindow(periods,'relax'):null,
    limitations:['Lakewide surface average is not a beach temperature.','A buoy reading represents its stated location and depth, not nearby sand or harbor water.','Comfort descriptions are qualitative and are not swim-safety determinations.'],
    links:{buoys:'/great-lakes-buoys/',beaches:'/great-lakes-beaches/'}
  });
};