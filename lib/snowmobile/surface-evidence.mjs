/*
 * Supporting surface evidence for Michigan Snowmobile Conditions.
 *
 * This module deliberately does NOT create a trail-base estimate. It adds two
 * pieces of evidence that matter to a high-cost riding decision:
 *   1) official NWS Local Storm Reports of snowfall in the region, and
 *   2) recent NWS station observations that can reveal rain/thaw damage.
 *
 * Snowfall reports are the amount the observer reported at the stated time;
 * the reporting duration varies (storm total, since snow began, etc.). They
 * are therefore never relabeled as a 24/48-hour accumulation. Their timestamp
 * only determines whether the report itself falls inside a lookback window.
 */
const IEM_LSR='https://mesonet.agron.iastate.edu/geojson/lsr.php';
const NWS_HEADERS={'user-agent':'chrisizworski.com snowmobile conditions (surface evidence)','accept':'application/geo+json,application/json'};
const HOUR=3600e3;
const SNOW_CACHE_MS=10*60e3;
let snowCache={savedAt:0,promise:null,reports:null};

function iso(ms){return new Date(ms).toISOString().replace(/\.\d{3}Z$/,'Z');}
function normCounty(value){return String(value||'').toLowerCase().replace(/\bsaint\b/g,'st').replace(/[^a-z]/g,'');}
function regionCounties(region){
  return new Set((region?.counties||[]).flatMap(c=>{
    const rows=[normCounty(c)];
    if(normCounty(c)==='charelvoix')rows.push('charlevoix');
    return rows;
  }));
}
async function fetchJson(url,{timeoutMs=9000}={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const r=await fetch(url,{headers:NWS_HEADERS,signal:controller.signal});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}
  finally{clearTimeout(timer);}
}
function normalizeSnow(feature){
  const p=feature?.properties||{};const inches=Number.parseFloat(p.magnitude),reportedAt=Date.parse(p.valid);
  const lat=Number(p.lat??feature?.geometry?.coordinates?.[1]),lon=Number(p.lon??feature?.geometry?.coordinates?.[0]);
  if(String(p.typetext||'').toUpperCase()!=='SNOW'||!Number.isFinite(inches)||inches<0||!Number.isFinite(reportedAt)||!Number.isFinite(lat)||!Number.isFinite(lon))return null;
  return {inches,reportedAt:new Date(reportedAt).toISOString(),place:String(p.city||'').trim(),county:String(p.county||'').trim(),lat,lon,source:String(p.source||'').trim(),remark:String(p.remark||'').replace(/\s+/g,' ').trim().slice(0,220)};
}
async function allMichiganSnowReports(now=Date.now()){
  if(snowCache.reports&&now-snowCache.savedAt<SNOW_CACHE_MS)return snowCache.reports;
  if(snowCache.promise)return snowCache.promise;
  snowCache.promise=(async()=>{
    const url=`${IEM_LSR}?states=MI&sts=${encodeURIComponent(iso(now-168*HOUR))}&ets=${encodeURIComponent(iso(now))}`;
    const data=await fetchJson(url,{timeoutMs:12000});
    const rows=(data.features||[]).map(normalizeSnow).filter(Boolean).sort((a,b)=>b.reportedAt.localeCompare(a.reportedAt));
    snowCache={savedAt:Date.now(),promise:null,reports:rows};return rows;
  })().catch(error=>{snowCache.promise=null;throw error});
  return snowCache.promise;
}
function largest(rows){return rows.length?Math.max(...rows.map(x=>x.inches)):null;}
function summarizeSnowForRegion(region,reports,now=Date.now()){
  const counties=regionCounties(region);const mine=reports.filter(r=>counties.has(normCounty(r.county)));
  const within=h=>mine.filter(r=>Date.parse(r.reportedAt)>=now-h*HOUR);
  const r24=within(24),r48=within(48),r72=within(72),r168=within(168);
  const latest=mine[0]||null;
  return {
    available:true,reportCount168h:r168.length,largest24hInches:largest(r24),largest48hInches:largest(r48),largest72hInches:largest(r72),largest168hInches:largest(r168),latestAt:latest?.reportedAt||null,
    latest:latest?{inches:latest.inches,reportedAt:latest.reportedAt,place:latest.place,county:latest.county,source:latest.source,remark:latest.remark}:null,
    boundary:'Amounts are official NWS Local Storm Reports timestamped inside each lookback window. Report duration varies; these values are not relabeled as 24/48/72-hour snowfall and do not establish trail base or grooming.'
  };
}
function cToF(value){const c=Number(value);return Number.isFinite(c)?c*9/5+32:null;}
function precipInchesMeters(value){const m=Number(value);return Number.isFinite(m)?m*39.3701:null;}
function obsRainSignal(p){
  const text=`${p?.textDescription||''} ${JSON.stringify(p?.presentWeather||[])}`.toLowerCase();
  const precip=precipInchesMeters(p?.precipitationLastHour?.value);
  return /rain|drizzle|shower|freezing rain|ice pellet/.test(text)||(Number.isFinite(precip)&&precip>=0.01);
}
async function recentWeatherForPoint(lat,lon,now=Date.now()){
  const points=await fetchJson(`https://api.weather.gov/points/${lat},${lon}`,{timeoutMs:8000});
  const stationsUrl=points?.properties?.observationStations;if(!stationsUrl)throw new Error('NWS point returned no observation-station collection');
  const stations=await fetchJson(stationsUrl,{timeoutMs:8000});
  const candidates=(stations.features||[]).map(f=>f?.properties?.stationIdentifier||String(f?.id||'').split('/').pop()).filter(Boolean).slice(0,3);
  let observations=null,stationId=null,lastError=null;
  for(const id of candidates){
    try{
      const start=iso(now-48*HOUR),end=iso(now);
      const data=await fetchJson(`https://api.weather.gov/stations/${encodeURIComponent(id)}/observations?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=120`,{timeoutMs:9000});
      if((data.features||[]).length){observations=data.features;stationId=id;break;}
    }catch(error){lastError=error;}
  }
  if(!observations)throw lastError||new Error('No recent NWS station observations available');
  const rows=observations.map(f=>f?.properties||{}).map(p=>({timestamp:p.timestamp||null,tempF:cToF(p?.temperature?.value),rain:obsRainSignal(p),text:p.textDescription||null})).filter(x=>x.timestamp);
  const temps=rows.map(x=>x.tempF).filter(Number.isFinite);const maxTempF=temps.length?Math.max(...temps):null,minTempF=temps.length?Math.min(...temps):null;
  const aboveFreezingObservations=rows.filter(x=>Number.isFinite(x.tempF)&&x.tempF>32).length;
  const rainObserved=rows.some(x=>x.rain);
  let thawRisk='UNKNOWN';
  if(rainObserved||(Number.isFinite(maxTempF)&&maxTempF>=42))thawRisk='HIGH';
  else if((Number.isFinite(maxTempF)&&maxTempF>=35)||aboveFreezingObservations>=6)thawRisk='MODERATE';
  else if(Number.isFinite(maxTempF))thawRisk='LOW';
  return {available:true,stationId,latestAt:rows[0]?.timestamp||null,observationCount:rows.length,maxTempF,minTempF,aboveFreezingObservations,rainObserved,thawRisk,
    boundary:'Recent-weather damage signal uses NWS station observations from the last 48 hours near the region hub. It is regional evidence, not a measurement of every trail segment.'};
}

export async function fetchSurfaceEvidenceFor(region){
  const now=Date.now();
  const [snowR,weatherR]=await Promise.allSettled([allMichiganSnowReports(now),recentWeatherForPoint(region.hubLat,region.hubLon,now)]);
  const observedSnow=snowR.status==='fulfilled'?summarizeSnowForRegion(region,snowR.value,now):{available:false,error:String(snowR.reason?.message||snowR.reason),boundary:'Observed snowfall unavailable; no value was guessed.'};
  const recentWeather=weatherR.status==='fulfilled'?weatherR.value:{available:false,error:String(weatherR.reason?.message||weatherR.reason),thawRisk:'UNKNOWN',boundary:'Recent station observations unavailable; thaw/rain history was not guessed.'};
  return {generatedAt:new Date(now).toISOString(),observedSnow,recentWeather,boundary:'Supporting evidence only. Neither observed snowfall nor regional station weather can by itself establish snowmobile trail base, grooming quality or rideability.'};
}

export const _test={normCounty,regionCounties,normalizeSnow,summarizeSnowForRegion,cToF,obsRainSignal};
