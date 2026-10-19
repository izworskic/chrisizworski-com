'use strict';
const {RESORTS,assemble,rank}=require('../lib/michigan-ski/engine');
const {fetchOfficial,SOURCES}=require('../lib/michigan-ski/official-reports');
const CACHE_MS=20*60*1000,FAILED_CACHE_MS=2*60*1000;
let cached=null,expires=0,inFlight=null;
function iso(ms){return new Date(ms).toISOString().replace(/\.\d{3}Z$/,'Z');}
const {fetchJson:json,gridAt}=require('../lib/nws-grid.cjs');
async function forResort(r){return gridAt(r);}
function parseReport(r){
  const p=r.properties||r,lat=Number(p.lat),lon=Number(p.lon),inches=Number.parseFloat(p.magnitude);
  const t=Date.parse(p.valid);
  if(String(p.typetext||'').toUpperCase()!=='SNOW'||!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(inches)||inches<0||!Number.isFinite(t))return null;
  return {lat,lon,inches,reportedAt:new Date(t).toISOString(),place:String(p.city||'Unknown location').slice(0,80),
    source:String(p.source||'Local storm report').slice(0,80),
    remark:String(p.remark||'Reporting interval unspecified').replace(/\s+/g,' ').slice(0,180),
    kind:'NWS_LOCAL_STORM_REPORT',duration:'UNKNOWN_PERIOD'};
}
async function collect(now=Date.now()){
  const start=now-48*3600000;
  const lsrs='https://mesonet.agron.iastate.edu/geojson/lsr.php?states=MI&sts='+encodeURIComponent(iso(start))+'&ets='+encodeURIComponent(iso(now));
  const [alertResponse,lsrResponse]=await Promise.allSettled([
    json('https://api.weather.gov/alerts/active?area=MI',8500),json(lsrs,8500)]);
  const alerts=alertResponse.status==='fulfilled'?(alertResponse.value.features||[]):[];
  const reports=lsrResponse.status==='fulfilled'?(lsrResponse.value.features||[]).map(parseReport).filter(Boolean):[];
  const conditions=new Map(),officials=new Map(),errors=[];
  // Each official report is checked independently; no resort content enters weather forecast fields.
  const officialChecks=Promise.all(RESORTS.filter(r=>SOURCES[r.slug]).map(async r=>{
    const value=await fetchOfficial(r.slug);officials.set(r.slug,value);
  }));
  if(alertResponse.status!=='fulfilled')errors.push('NWS_ALERTS_UNAVAILABLE');
  if(lsrResponse.status!=='fulfilled')errors.push('LOCAL_STORM_REPORTS_UNAVAILABLE');
  let next=0;
  async function worker(){
    while(next<RESORTS.length){
      const i=next++,r=RESORTS[i],w=await forResort(r);
      if(w.error)errors.push(r.slug+':NWS_GRID_UNAVAILABLE');
      conditions.set(r.slug,w);
    }
  }
  await Promise.all([...Array.from({length:6},worker),officialChecks]);
  const resorts=rank(RESORTS.map(r=>assemble(r,conditions.get(r.slug),alerts,reports,'detroit',now,officials.get(r.slug))),'detroit',now);
  return {ok:true,generatedAt:new Date(now).toISOString(),season:'2026-27',
    policy:'PROVISIONAL; NO OPEN-LIFT OR SAFE-ROAD ASSURANCE',
    resorts,health:{nwsAlerts:alertResponse.status==='fulfilled'?'RECEIVED':'UNAVAILABLE',
      localStormReports:lsrResponse.status==='fulfilled'?'RECEIVED':'UNAVAILABLE',
      nwsGridAvailable:resorts.filter(r=>r.weather.weatherCoverage==='NWS_GRID_RECEIVED').length,
      nwsGridTotal:RESORTS.length,officialReportsChecked:officials.size,
      officialReportsParsed:[...officials.values()].filter(x=>x.status==='PUBLISHED_OFFICIAL_REPORT').length,
      errors:errors.slice(0,22)},
    alertsActive:resorts.filter(r=>r.weather.alerts.some(a=>a.isLakeEffect)).length,
    disclosure:'Recent reports are nearby storm reports with varying accumulation intervals, not 24/48-hour resort snowfall totals. NWS grid snowfall is a forecast, not observed snow. Official lift/trail counts are parsed for select resorts; they are page snapshots, not guaranteed opening status for a future weekend. Unknown resorts remain unverified.'};
}
function get(){
  const now=Date.now();
  if(cached&&now<expires)return Promise.resolve(cached);
  if(inFlight)return inFlight;
  inFlight=collect().then(x=>{cached=x;expires=Date.now()+(x.health.nwsGridAvailable>0?CACHE_MS:FAILED_CACHE_MS);return x;})
    .catch(e=>{expires=Date.now()+FAILED_CACHE_MS;cached={ok:false,generatedAt:new Date().toISOString(),reason:'SOURCES_UNAVAILABLE',
      resorts:[],health:{errors:[String(e.message||e).slice(0,60)]}};return cached;})
    .finally(()=>{inFlight=null;});
  return inFlight;
}
module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method!=='GET'){res.setHeader('Allow','GET');res.setHeader('Cache-Control','no-store');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
  if((req.url||'').includes('?')){res.setHeader('Cache-Control','no-store');return res.status(400).json({error:'UNSUPPORTED_PARAMETERS'});}
  const value=await get();
  const ttl=value.health?.nwsGridAvailable>0?900:120;
  res.setHeader('Cache-Control','public, max-age=30');
  res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage='+ttl+', stale-while-revalidate=60');
  res.setHeader('CDN-Cache-Control','public, s-maxage='+ttl+', stale-while-revalidate=60');
  return res.status(value.ok?200:503).json(value);
};
module.exports._test={collect,forResort,parseReport};
