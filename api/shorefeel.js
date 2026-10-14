'use strict';
// Shared free NOAA lakewide analysis + NOAA satellite grid pixels + NDBC buoys + NWS shoreline weather.
// No paid API, cron, Redis, geographic interpolation, or AI-generated weather judgments.
const {LAKES,DESTINATIONS,SOURCE,parseGLSEA,parseGLSEACsv,parseLongTermAverage,parseGLSEAGridCsv,lakeSeries,parseNDBC,waterEvidence,weatherPeriods,nowPeriod,comfort,bestWeatherWindow}=require('../lib/shorefeel/engine.js');
const BF=require('../lib/shorefeel/beach-forecast.js');
const BACKTEST=require('../data/shorefeel/backtest-2026-10.json');
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

/* Beach-water forecast: measured level (satellite pixel / buoy) + NOAA lake-model change.
   Every model read is isolated: any failure leaves that part null and the page says so. */
async function modelBox(cycle,hour,box,ms=3200){
  return BF.parseBox(await textResponse(cycle.url(hour)+BF.boxQuery(box),ms),box);
}
async function buildBeachForecast(placeKey,cells,now){
  const beaches=BF.BEACHES[placeKey]||[];
  if(!beaches.length)return null;
  const box=BF.boxFor(beaches.flatMap(b=>[b.cell,b.ref]));
  const hoursSince=(cycle,t)=>Math.round((t.getTime()-cycle.time.getTime())/3600000);
  // Newest model cycle that has actually been published.
  let cycle=null,nowGrid=null;
  for(const c of BF.cycleCandidates(now,3)){
    try{const g=await modelBox(c,hoursSince(c,now),box,2500);if(Object.keys(g).length){cycle=c;nowGrid=g;break;}}catch{}
  }
  if(!cycle)return {status:'unavailable',reason:'NOAA lake model cycle not available'};
  const targets=BF.LEADS.map(lead=>({leadH:lead,when:new Date(now.getTime()+lead*3600000)}));
  const leadGrids=await Promise.allSettled(targets.map(t=>t.leadH===0?Promise.resolve(nowGrid):modelBox(cycle,hoursSince(cycle,t.when),box)));
  const leads=targets.map((t,k)=>({leadH:t.leadH,startsAt:new Date(cycle.time.getTime()+hoursSince(cycle,t.when)*3600000).toISOString(),
    grid:leadGrids[k].status==='fulfilled'?leadGrids[k].value:null})).filter(l=>l.grid&&Object.keys(l.grid).length);
  // The model's state when the level was observed, so change is measured from the right moment.
  const refCache=new Map();
  const refFor=async iso=>{
    if(!refCache.has(iso)){
      refCache.set(iso,(async()=>{try{const c=BF.cycleFor(new Date(iso));return await modelBox(c,c.hour,box,3000);}catch{return null;}})());
    }
    return refCache.get(iso);
  };
  const out=[];
  for(const b of beaches){
    const m=cells?.[b.satKey];
    if(!m||!Number.isFinite(m.tempF))continue;
    const level={kind:'satellite',tempF:m.tempF,observedAt:m.observedAt};
    const f=BF.beachForecast(b,level,await refFor(m.observedAt),leads);
    if(f)out.push(f);
  }
  if(!out.length)return {status:'unavailable',reason:'No beach had both a recent measured level and a model reference',cycle:cycle.time.toISOString()};
  return {status:'available',cycle:cycle.time.toISOString(),beaches:out,
    source:{name:'NOAA Lake Michigan-Huron Operational Forecast System (LMHOFS)',url:'https://tidesandcurrents.noaa.gov/ofs/lmhofs/lmhofs.html'},
    method:'Measured level (NOAA satellite pixel) plus the lake model\'s own forecast change. The model\'s absolute temperature is not used: it ran about 3.8°F off buoys.',
    validation:{period:BACKTEST.period,n24h:BACKTEST.leadResults['24h'].n,
      errorNowF:BACKTEST.satelliteVsBuoyMAE_F,error24hF:BACKTEST.leadResults['24h'].persistencePlusModelChangeMAE_F,error48hF:BACKTEST.leadResults['48h'].persistencePlusModelChangeMAE_F,
      coolingWatch:{caughtRealDrops:BACKTEST.coolingWatch.caught,of:BACKTEST.coolingWatch.realDrops3F,precisionPct:BACKTEST.coolingWatch.precisionPct},
      caveats:BACKTEST.caveats},
    caveat:'A forecast of the water surface near the beach with an honest range, not a measurement and not swim safety. Shore-side thermometers have not yet been used to check it.'};
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

  // Destination water first: the beach forecast needs the satellite cells.
  const cells=place&&grid.status==='fulfilled'?parseGLSEAGridCsv(grid.value,place.cells,now):null;
  // Long-term normal and the beach forecast are independent; run them together.
  const latestDate=lakes[requested]?.latest?.date;
  const [ltRes,bfRes]=await Promise.allSettled([
    latestDate?textResponse(LT_AVG+dayOfYear(latestDate),3000):Promise.resolve(null),
    place?buildBeachForecast(placeKey,cells,now):Promise.resolve(null)
  ]);
  let normal=null;
  if(latestDate&&ltRes.status==='fulfilled'&&ltRes.value){
    const lt=parseLongTermAverage(ltRes.value);
    if(Number.isFinite(lt[requested])){
      normal={date:latestDate,tempF:lt[requested],deltaF:Math.round((lakes[requested].latest.tempF-lt[requested])*10)/10,
        source:'NOAA GLERL long-term daily average surface temperature',url:'https://apps.glerl.noaa.gov/erddap/tabledap/glerlLTAvgTemp.html'};
    }
  }
  const beachForecast=bfRes.status==='fulfilled'?bfRes.value:place?{status:'unavailable',reason:'forecast error'}:null;

  // Destination water: buoy (6 h) > nearest valid satellite pixel (3 days) > nothing.
  const buoyStatus=!place?null:nearby.status==='fulfilled'?'reporting':nearby.reason?.status===404?'offline':'unavailable';
  const nearest=place&&nearby.status==='fulfilled'?parseNDBC(nearby.value,now):null;
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
    lake:requested,lakes,normal,beachForecast,
    water:water?{...water,beach:place.beach.name}:null,
    local,regionalSatellite:satellite,weatherNow:current,assessments,
    weatherWindow:windows?.relax||null,weatherWindows:windows,
    limitations:['Lakewide surface average is not a beach temperature and is never used as one.','A buoy reading represents its stated location and depth, not nearby sand or harbor water.','A satellite pixel is a daily offshore surface estimate, not a beach thermometer.','Comfort descriptions are qualitative and are not swim-safety determinations.'],
    links:{buoys:'/great-lakes-buoys/',beaches:'/great-lakes-beaches/'}
  });
};
