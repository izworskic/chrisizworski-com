'use strict';
// On-demand photo-free Grand Marais offshore pulse; CDN caching makes this a
// modest number of free GLOS+NWS reads, not per-page multiple service calls.
const {requestUrl,parseSpotterCSV}=require('../lib/rockhounding/glos-spotter.cjs');
const {assessAlerts,URLS}=require('../lib/rockhounding/nws-shore-hazards.cjs');
const {analyzeObserved}=require('../lib/rockhounding/live-photo-free-pulse.cjs');
const {rollingWaveTendency}=require('../lib/rockhounding/rolling-offshore-wave-tendency.cjs');
const {compareToBaseline}=require('../lib/rockhounding/offshore-activity-percentiles.cjs');
const baseline=require('../data/rockhounding/spotter-2026-24h-offshore-reference.json');
const {sourceURL,toRows,waterLevelContext}=require('../lib/rockhounding/noaa-marquette-water-level.cjs');
const UA='ChrisIzworskiRockhoundingWave/1.0 (https://chrisizworski.com/rockhounding-lab/)';
const H=3600000;
const iso=ms=>new Date(ms).toISOString().replace(/\.\d{3}Z$/,'Z');
async function getGLOS(fetchFn,now){
 const url=requestUrl({startISO:iso(now-72*H),endISO:iso(now)});
 const res=await fetchFn(url,{headers:{Accept:'text/csv','User-Agent':UA},
  signal:AbortSignal.timeout(8000)});
 if(!res?.ok)throw Error('Wave provider unavailable');
 const length=Number(res.headers?.get?.('content-length'));
 if(Number.isFinite(length)&&length>1800000)throw Error('Oversized wave source');
 const body=await res.text();
 if(typeof body!=='string'||body.length>1800000)throw Error('Oversized wave data');
 return parseSpotterCSV(body);
}
async function getNWS(fetchFn,nowISO){
 const responses=await Promise.all(URLS.map(async url=>{
  try{
   const res=await fetchFn(url,{headers:{Accept:'application/geo+json','User-Agent':UA},
    signal:AbortSignal.timeout(6500)});
   if(!res?.ok)return {ok:false};
   const data=await res.json();
   return {ok:true,data};
  }catch{return {ok:false};}
 }));
 return assessAlerts(responses,nowISO);
}
async function getMarquetteLevel(fetchFn,nowISO){
 const url=sourceURL(nowISO);
 const res=await fetchFn(url,{
  headers:{Accept:'application/json','User-Agent':UA},
  signal:AbortSignal.timeout(7000)});
 if(!res?.ok)throw Error('NOAA remote water level unavailable');
 const length=Number(res.headers?.get?.('content-length'));
 if(Number.isFinite(length)&&length>260000)throw Error('Oversized NOAA level response');
 const body=await res.text();
 if(typeof body!=='string'||body.length>260000)
  throw Error('NOAA water-level source too large');
 return waterLevelContext(toRows(JSON.parse(body)),{nowISO});
}
async function currentPulse({nowISO=new Date().toISOString(),fetchFn=fetch}={}){
 const now=Date.parse(nowISO);
 if(!Number.isFinite(now))throw Error('Invalid clock');
 const [g,nws,remoteLevel]=await Promise.allSettled([
  getGLOS(fetchFn,now),
  getNWS(fetchFn,nowISO),
  getMarquetteLevel(fetchFn,nowISO)
 ]);
 const parsed=g.status==='fulfilled'?g.value:null;
 const alerts=nws.status==='fulfilled'?nws.value:{status:'UNKNOWN'};
 const hazardStatus=['ACTIVE','CLEAR','UNKNOWN'].includes(alerts.status)?alerts.status:'UNKNOWN';
 const signal=analyzeObserved(parsed?.rows||[],{nowISO,hazardStatus});
 const waveTendency48h=rollingWaveTendency(parsed?.rows||[],{nowISO,hazardStatus});
 const offshoreSeasonalContext=compareToBaseline(waveTendency48h,{baseline,hazardStatus});
 return {
  ...signal,
  offshoreSeasonalContext,
  dataSourceAvailable:!!parsed,
  waveTendency48h,
  lakeSuperiorLevelContext:remoteLevel.status==='fulfilled'?remoteLevel.value:{
   status:'REMOTE_LEVEL_SOURCE_UNAVAILABLE',
   stationId:'9099018',stationName:'Marquette C.G., MI',
   gaugeMeaning:'REMOTE_LAKE_SUPERIOR_LEVEL_CONTEXT_ONLY',
   levelDatum:'IGLD 1985',dateUTC:null,
   gaugeWaterLevelM:null,delta24hCm:null,
   measuredAtAgateBeach:false,beachWaterlineElevationM:null,
   canPredictNewAgates:false,canClaimBeachSafety:false,
   canPublishVisitWindow:false,
   caveat:'Marquette NOAA lake-level source unavailable. No local Grand Marais beach elevation inferred.'
  },
  // If original provider failed, distinguish an outage from a genuine
  // successful empty source response. Neither is evidence of calm water.
  status:parsed?signal.status:'OFFSHORE_SOURCE_UNAVAILABLE',
  explanation:parsed?signal.explanation:'GLOS original observations could not be retrieved. No weather or rockhounding verdict is available.',
  matchedNWSAlerts:hazardStatus==='ACTIVE'&&Array.isArray(alerts.alerts)?
   alerts.alerts.slice(0,10).map(a=>({event:String(a.event||'').slice(0,100),
    severity:String(a.severity||'Unknown').slice(0,30),expiresAtUTC:a.ends||null})):[],
  nwsAlertCheckedAtUTC:nowISO,
  nwsCoverageComplete:alerts.partialSourceFailure===true?false:hazardStatus!=='UNKNOWN',
  upstreamCostClass:'PUBLIC_NO_KEY_OBSERVATIONS_AND_NWS',
  provenance:'NO_PHOTOS_USED'
 };
}
async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET'&&req.method!=='HEAD'){
  res.setHeader('Allow','GET, HEAD');res.setHeader('Cache-Control','no-store');
  return res.status(405).json({error:'GET or HEAD only'});
 }
 try{
  const report=await currentPulse();
  // Cache edge responses; client separately evaluates exact source timestamps.
  res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=900');
  if(req.method==='HEAD')return res.status(200).end();
  return res.status(200).json(report);
 }catch(e){
  res.setHeader('Cache-Control','no-store');
  return res.status(503).json({
   status:'OFFSHORE_SOURCE_UNAVAILABLE',hazardStatus:'UNKNOWN',
   explanation:'Original offshore measurements or marine alerts temporarily unavailable.',
   canPredictNewAgates:false,canClaimBeachSafety:false,canPublishSafeVisitWindow:false
  });
 }
}
module.exports=handler;
module.exports._test={getGLOS,getNWS,getMarquetteLevel,currentPulse};
