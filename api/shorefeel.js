'use strict';
// Shared free NOAA lakewide analysis + NOAA satellite grid pixels + NDBC buoys + NWS shoreline weather.
// No paid API, cron, Redis, geographic interpolation, or AI-generated weather judgments.
const {LAKES,DESTINATIONS,SOURCE,parseGLSEA,parseGLSEACsv,parseLongTermAverage,parseGLSEAGridCsv,lakeSeries,parseNDBC,waterEvidence,weatherPeriods,nowPeriod,comfort,bestWeatherWindow}=require('../lib/shorefeel/engine.js');
const {observations:NOAA_SNAPSHOT}=require('../data/shorefeel/last-verified-noaa-glsea.json');
const GLSEA_CSV='https://apps.glerl.noaa.gov/erddap/tabledap/glsea_avgtemps_3.csv?Year%2CDay%2CSup%2CMich%2CHuron%2CErie%2COnt&Year%3E%3D2026';
const LT_AVG='https://apps.glerl.noaa.gov/erddap/tabledap/glerlLTAvgTemp.csv?lake%2CdayOfYear%2Ctemperature&dayOfYear=';
const GRID={dataset:'GLSEA_ACSPO_GCS',graph:'https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.graph',
  source:'NOAA GLSEA ACSPO satellite-derived surface analysis (about 1.4 km pixels, daily)'};
// One small box per destination covering all of its cells, last four daily grids.
// ERDDAP's [last-3:1:last] is an INDEX range (four days); [(last-3)] would be seconds.
function gridUrl(place){
  const lats=place.cells.map(c=>c.lat),lons=place.cells.map(c=>c.lon);
  const pad=0.045;
  const lo=n=>(Math.min(...n)-pad).toFixed(3),hi=n=>(Math.max(...n)+pad).toFixed(3);
  return 'https://apps.glerl.noaa.gov/erddap/griddap/GLSEA_ACSPO_GCS.csv?sst[last-3:1:last][('+lo(lats)+'):('+hi(lats)+')][('+lo(lons)+'):('+hi(lons)+')]';
}

const HEADERS={'User-Agent':'ChrisIzworski-ShoreFeel/1.1 (https://chrisizworski.com/great-lakes-water-temperature/)',Accept:'text/plain, text/csv, application/json'};
async function textResponse(url,ms=4000){
  const r=await fetch(url,{headers:HEADERS,signal:AbortSignal.timeout(ms)});
  if(!r.ok){const e=new Error('upstream status '+r.status);e.status=r.status;throw e;}
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
function dayOfYear(dateStr){
  const d=new Date(dateStr+'T00:00:00Z');
  return Math.floor((d-Date.UTC(d.getUTCFullYear(),0,0))/86400000);
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
  const now=new Date();
  const [analysis,alternative,nearby,forecast,grid]=await Promise.allSettled([
    textResponse(SOURCE,4500),
    textResponse(GLSEA_CSV,4500),
    place?textResponse('https://www.ndbc.noaa.gov/data/realtime2/'+place.station+'.txt',3700):Promise.resolve(null),
    place?weatherFor(place):Promise.resolve([]),
    place?textResponse(gridUrl(place),4500):Promise.resolve(null)
  ]);

  const primary=analysis.status==='fulfilled'?parseGLSEA(analysis.value,now):[];
  const secondary=alternative.status==='fulfilled'?parseGLSEACsv(alternative.value,now):[];
  const last=a=>a.at(-1)?.date||'';
  let rows=last(primary)>=last(secondary)?primary:secondary;
  let analysisMode=rows.length?'official-live':'unavailable';
  let analysisUrl=rows===secondary&&secondary.length?GLSEA_CSV:SOURCE;
  // NOAA publishes a dated value even when its endpoints temporarily block
  // our server. The bundled verified observation expires after 3 calendar days.
  const published=parseGLSEA(NOAA_SNAPSHOT.join('\n'),now);
  if(last(published)>last(rows)){
    rows=published;
    analysisMode='dated-official-fallback';
    analysisUrl=SOURCE;
  }
  const fresh=lakeSeries(rows,'michigan',now);
  if(analysisMode==='dated-official-fallback'&&fresh.status!=='recent'){
    rows=[];
    analysisMode='unavailable';
  }
  const lakes=Object.fromEntries(Object.keys(LAKES).map(l=>[l,lakeSeries(rows,l,now)]));

  // Long-term normal for the latest analysis date, so "62°F" has a reference point.
  let normal=null;
  const latestDate=lakes[requested]?.latest?.date;
  if(latestDate){
    try{
      const lt=parseLongTermAverage(await textResponse(LT_AVG+dayOfYear(latestDate),3000));
      if(Number.isFinite(lt[requested])){
        normal={date:latestDate,tempF:lt[requested],deltaF:Math.round((lakes[requested].latest.tempF-lt[requested])*10)/10,
          source:'NOAA GLERL long-term daily average surface temperature',url:'https://apps.glerl.noaa.gov/erddap/tabledap/glerlLTAvgTemp.html'};
      }
    }catch{normal=null;}
  }

  // Destination water: buoy (6 h) > nearest valid satellite pixel (3 days) > nothing.
  const buoyStatus=!place?null:nearby.status==='fulfilled'?'reporting':nearby.reason?.status===404?'offline':'unavailable';
  const nearest=place&&nearby.status==='fulfilled'?parseNDBC(nearby.value,now):null;
  const cells=place&&grid.status==='fulfilled'?parseGLSEAGridCsv(grid.value,place.cells,now):null;
  const water=place?waterEvidence(place,nearest,cells):null;
  const periods=forecast.status==='fulfilled'?forecast.value:[];
  const current=nowPeriod(periods,now);

  const satellite=place?{
    status:cells&&Object.values(cells).some(Boolean)?'recent':'unavailable',
    source:GRID.source,dataset:GRID.dataset,sourceUrl:GRID.graph,
    cells:place.cells.map(c=>({key:c.key,short:c.short,label:c.label,requestedLat:c.lat,requestedLon:c.lon,measurement:cells?.[c.key]||null})),
    caveat:'Daily satellite surface analysis for offshore pixels; not a thermometer at the beach. Shallow water on a sunny afternoon can run warmer.'
  }:null;
  const local=place?{
    name:place.name,waterBody:place.water,beach:place.beach.name,stationId:place.station,stationName:place.stationName,stationOwner:place.stationOwner,lat:place.stationLat,lon:place.stationLon,
    caveat:place.stationCaveat,measurement:nearest,
    measurementStatus:nearest?'recent':buoyStatus==='offline'?'offline':'unavailable',
    forecastStatus:periods.length?'available':'unavailable',periods
  }:null;
  const assessments=place?Object.fromEntries(['swim','family','paddle','relax'].map(a=>[a,comfort(a,water,current)])):null;
  const windows=place?Object.fromEntries(['swim','family','paddle','relax'].map(a=>[a,bestWeatherWindow(periods,a)])):null;
  return res.status(200).json({
    product:'ShoreFeel',generatedAt:now.toISOString(),
    source:{name:'NOAA GLERL GLSEA 3',url:analysisUrl,mode:analysisMode,method:'Daily satellite-derived whole-lake surface mean; some pixels may use historical nearby passes or smoothing.'},
    lake:requested,lakes,normal,
    water:water?{...water,beach:place.beach.name}:null,
    local,regionalSatellite:satellite,weatherNow:current,assessments,
    weatherWindow:windows?.relax||null,weatherWindows:windows,
    limitations:['Lakewide surface average is not a beach temperature and is never used as one.','A buoy reading represents its stated location and depth, not nearby sand or harbor water.','A satellite pixel is a daily offshore surface estimate, not a beach thermometer.','Comfort descriptions are qualitative and are not swim-safety determinations.'],
    links:{buoys:'/great-lakes-buoys/',beaches:'/great-lakes-beaches/'}
  });
};
