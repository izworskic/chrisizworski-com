'use strict';
// Shared free NOAA lakewide analysis + NDBC offshore observations + NWS shoreline weather.
// No paid API, cron, Redis, geographic interpolation, or AI-generated weather judgments.
const {LAKES,DESTINATIONS,SOURCE,parseGLSEA,parseGLSEACsv,parseGLSEABayGridCsv,lakeSeries,parseNDBC,weatherPeriods,comfort,bestWeatherWindow}=require('../lib/shorefeel/engine.js');
const {observations:NOAA_SNAPSHOT}=require('../data/shorefeel/last-verified-noaa-glsea.json');
const GLSEA_CSV='https://apps.glerl.noaa.gov/erddap/tabledap/glsea_avgtemps_3.csv?Year%2CDay%2CSup%2CMich%2CHuron%2CErie%2COnt&Year%3E%3D2026';
const BAY_GRID={lat:44.795837,lon:-85.610003,name:'West Grand Traverse Bay offshore grid cell',
 dataset:'GLSEA_ACSPO_GCS',
 graph:'https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.graph',
 pointProvenance:'https://www.waterqualitydata.us/provider/STORET/21MICH_WQX/21MICH_WQX-450132/'};
const BAY_GRID_CSV='https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.csv?sst[last-6:1:last][(44.795837)][(-85.610003)]';

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
  const [analysis,alternative,nearby,forecast,bayGrid]=await Promise.allSettled([
    textResponse(SOURCE,4500),
    textResponse(GLSEA_CSV,4500),
    place?textResponse('https://www.ndbc.noaa.gov/data/realtime2/'+place.station+'.txt',3700):Promise.resolve(null),
    place?weatherFor(place):Promise.resolve([]),
    placeKey==='traverse-city'?textResponse(BAY_GRID_CSV,3300):Promise.resolve(null)
  ]);
  
  const primary=analysis.status==='fulfilled'?parseGLSEA(analysis.value):[];
  const secondary=alternative.status==='fulfilled'?parseGLSEACsv(alternative.value):[];
  const last=a=>a.at(-1)?.date||'';
  let rows=last(primary)>=last(secondary)?primary:secondary;
  let analysisMode=rows.length?'official-live':'unavailable';
  let analysisUrl=rows===secondary&&secondary.length?GLSEA_CSV:SOURCE;
  // NOAA publishes a dated value even when its endpoints temporarily block
  // our server. The bundled verified observation expires after 3 calendar days.
  const published=parseGLSEA(NOAA_SNAPSHOT.join('\n'));
  if(last(published)>last(rows)){
    rows=published;
    analysisMode='dated-official-fallback';
    analysisUrl=SOURCE;
  }
  const fresh=lakeSeries(rows,'michigan');
  if(analysisMode==='dated-official-fallback'&&fresh.status!=='recent'){
    rows=[];
    analysisMode='unavailable';
  }

  const lakes=Object.fromEntries(Object.keys(LAKES).map(l=>[l,lakeSeries(rows,l)]));
  const nearest=place&&nearby.status==='fulfilled'?parseNDBC(nearby.value):null;
  const periods=forecast.status==='fulfilled'?forecast.value:[];
  const bayMeasurement=placeKey==='traverse-city'&&bayGrid.status==='fulfilled'
    ?parseGLSEABayGridCsv(bayGrid.value,BAY_GRID):null;
  const regionalSatellite=placeKey==='traverse-city'?{
    status:bayMeasurement?'recent':'unavailable',
    source:'NOAA GLSEA ACSPO satellite-derived surface grid',
    dataset:BAY_GRID.dataset,sourceUrl:BAY_GRID.graph,
    sampleLabel:BAY_GRID.name,pointProvenance:BAY_GRID.pointProvenance,
    requestedLat:BAY_GRID.lat,requestedLon:BAY_GRID.lon,
    measurement:bayMeasurement,
    caveat:'Daily offshore satellite surface grid estimate near West Grand Traverse Bay; not an actual water thermometer at a Traverse City beach.'
  }:null;
  const local=place?{
    name:place.name,stationId:place.station,stationName:place.stationName,lat:place.stationLat,lon:place.stationLon,
    caveat:place.stationCaveat,measurement:nearest,measurementStatus:nearest?'recent':'unavailable',
    forecastStatus:periods.length?'available':'unavailable',periods
  }:null;
  const weather=periods.find(p=>p.daylight)||periods[0]||null;
  const assessments=place?Object.fromEntries(['swim','family','paddle','relax'].map(a=>[a,comfort(a,nearest?.tempF??null,weather)])):null;
  return res.status(200).json({
    product:'ShoreFeel',observedAt:null,generatedAt:new Date().toISOString(),source:{name:'NOAA GLERL GLSEA 3',url:analysisUrl,mode:analysisMode,method:'Daily satellite-derived whole-lake surface mean; some pixels may use historical nearby passes or smoothing.'},
    lake:requested,lakes,local,regionalSatellite,assessments,
    weatherWindow:place?bestWeatherWindow(periods,'relax'):null,
    limitations:['Lakewide surface average is not a beach temperature.','A buoy reading represents its stated location and depth, not nearby sand or harbor water.','Comfort descriptions are qualitative and are not swim-safety determinations.'],
    links:{buoys:'/great-lakes-buoys/',beaches:'/great-lakes-beaches/'}
  });
};