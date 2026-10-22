'use strict';
/**
 * Research-only NOAA/NWS adapters for a Michigan winter hiking/snowshoe trip.
 * No browser calls, location tracking, paid services, Redis or public endpoint.
 * Inputs MUST be server-curated DNR destinations, never arbitrary client URLs.
 */
const NOAA = 'https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer';
const NWS = 'https://api.weather.gov';
const TREND=require('./winter-hike-forecast-trend.cjs');
const UA = 'WinterHikeResearch/0.1 (+https://chrisizworski.com/; contact: https://chrisizworski.com/)';
const HOURS = 3600000, DAY = 86400000;
const cache = new Map();
function validPoint(site) {
  return Number.isFinite(site?.lat) && Number.isFinite(site?.lon) &&
    site.lat >= 41 && site.lat <= 49 && site.lon >= -91 && site.lon <= -82;
}
function query(url, pairs) { return url + '?' + new URLSearchParams(pairs).toString(); }
function snowUrl(site) {
  if (!validPoint(site)) throw new Error('Invalid Michigan destination');
  const {lat,lon} = site;
  return query(NOAA+'/identify',{
    f:'pjson',geometry:JSON.stringify({x:lon,y:lat,spatialReference:{wkid:4326}}),
    geometryType:'esriGeometryPoint',sr:'4326',layers:'all:0',tolerance:'1',
    mapExtent:[lon-.1,lat-.1,lon+.1,lat+.1].join(','),
    imageDisplay:'400,400,96',returnGeometry:'false'
  });
}
function parseNoaa(body, now=Date.now()) {
  const base={kind:'unavailable',depthInches:null,validAt:null,validDate:null,
    source:'NOAA NOHRSC modeled 1-km snow analysis',sourceUrl:NOAA,
    scope:'Modeled grid point, not measured trail snow or trail conditions'};
  if(!Array.isArray(body?.results))return {...base,reason:'NOAA response missing raster features'};
  const image=body.results.find(r=>r.layerId===3);
  const footprint=body.results.find(r=>r.layerId===2);
  const raw=image?.attributes?.['Service Pixel Value'];
  const metres=raw===null||raw===undefined||String(raw).trim()===''?NaN:Number(raw);
  // Service time has no explicit zone: use the calendar date for conservative
  // freshness, anchored at UTC noon. Do not display it as an exact timestamp.
  const serviceTime=footprint?.attributes?.idp_validtime || image?.attributes?.idp_validtime;
  const m=typeof serviceTime==='string' && serviceTime.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) \d{1,2}:\d{2}:\d{2} (AM|PM)$/);
  if(!m)return {...base,reason:'NOAA raster valid date missing or ambiguous'};
  const [month,day,year]=[Number(m[1]),Number(m[2]),Number(m[3])];
  const proxy=Date.UTC(year,month-1,day,12);
  const dt=new Date(proxy);
  if(dt.getUTCFullYear()!==year||dt.getUTCMonth()!==month-1||dt.getUTCDate()!==day)
    return {...base,reason:'Invalid NOAA raster valid date'};
  if(proxy>now+HOURS || now-proxy>72*HOURS)
    return {...base,reason:'NOAA snow raster date stale or in future',validDate:dt.toISOString().slice(0,10)};
  if(!Number.isFinite(metres)||metres<0||metres>20)
    return {...base,reason:'NOAA snow-depth raster pixel missing or invalid',validDate:dt.toISOString().slice(0,10)};
  return {...base,kind:'modeled',depthInches:Math.round(metres*39.37007874015748*100)/100,
    validAt:dt.toISOString(),validDate:dt.toISOString().slice(0,10),
    timeAccuracy:'date-only (no timezone in ArcGIS service string; noon UTC is a validation proxy)',
    rawMeters:metres,reason:null};
}
function windMph(raw) {
  const s=String(raw??'');const numbers=[...s.matchAll(/\d+(?:\.\d+)?/g)].map(x=>Number(x[0]));
  if(!numbers.length)return null;
  const speed=Math.max(...numbers);
  if(/\bkm\/h\b/i.test(s))return speed*0.621371;
  if(/\bmph\b/i.test(s))return speed;
  return null;
}
function asF(temp, unit) {
  if(!Number.isFinite(temp))return null;
  return unit==='F'?temp:unit==='C'?temp*9/5+32:null;
}
function chillF(t,wind) {
  if(t===null)return null;
  return Number.isFinite(wind)&&wind>3&&t<=50?35.74+0.6215*t-35.75*Math.pow(wind,.16)+.4275*t*Math.pow(wind,.16):t;
}
function validDate(date) {
  if(typeof date!=='string'||!(/^\d{4}-\d{2}-\d{2}$/.test(date)))return false;
  return !Number.isNaN(Date.parse(date+'T12:00:00Z')) && new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
}
function parseHourly(body, tripDate, now=Date.now()) {
  const base={targetCovered:false,updatedAt:null,windMph:null,windChillF:null,
    freezeThaw:false,freezingRain:false,rainOrFreezingRain:false,
    source:'NWS hourly forecast',sourceUrl:null,
    scope:'10 AM–4 PM destination-local weather forecast; not a trail report'};
  if(!validDate(tripDate))return {...base,reason:'Invalid trip date'};
  const p=body?.properties;
  const updated=p?.updateTime||p?.updated||p?.generatedAt||null;
  const timestamp=Date.parse(updated);
  if(!Number.isFinite(timestamp)||timestamp>now+HOURS||now-timestamp>12*HOURS)
    return {...base,updatedAt:updated,reason:'NWS hourly forecast missing or stale'};
  const rows=Array.isArray(p?.periods)?p.periods.filter(x=>{
    const hour=Number(String(x.startTime||'').slice(11,13));
    return String(x.startTime||'').slice(0,10)===tripDate && hour>=10 && hour<17 &&
      Number.isFinite(Date.parse(x.startTime));
  }):[];
  // A few hours may be absent in partial feed failures; never silently extrapolate.
  if(new Set(rows.map(x=>String(x.startTime).slice(0,13))).size<5) return {...base,updatedAt:updated,reason:'Insufficient distinct forecast hours for selected outing window'};
  // Require temperature AND wind for each plotted hour. Never produce a
  // misleading zero from Math.round(null) or mix different partial-hour sets.
  const usable=new Map();
  for(const x of rows){
    const temp=asF(x.temperature,x.temperatureUnit),wind=windMph(x.windSpeed);
    const hour=String(x.startTime).slice(11,13);
    if(Number.isFinite(temp)&&Number.isFinite(wind)&&temp>=-100&&temp<=140&&!usable.has(hour))
      usable.set(hour,x);
  }
  const validRows=[...usable.values()].sort((a,b)=>a.startTime.localeCompare(b.startTime));
  if(validRows.length<5)return {...base,updatedAt:updated,reason:'Fewer than five valid daytime forecast hours'};
  const temps=validRows.map(x=>asF(x.temperature,x.temperatureUnit));
  const winds=validRows.map(x=>windMph(x.windSpeed));
  const chills=validRows.map(x=>chillF(asF(x.temperature,x.temperatureUnit),windMph(x.windSpeed)));
  const rain=validRows.some(x=>/rain|drizzle/i.test(String(x.shortForecast||'')+' '+String(x.detailedForecast||'')));
  const freezeRain=validRows.some(x=>/freezing rain|freezing drizzle/i.test(String(x.shortForecast||'')+' '+String(x.detailedForecast||'')));
  return {...base,targetCovered:true,updatedAt:updated,
    windMph:Math.round(Math.max(...winds)*10)/10,
    windChillF:Math.round(Math.min(...chills)*10)/10,
    tempMinF:Math.round(Math.min(...temps)),tempMaxF:Math.round(Math.max(...temps)),
    freezeThaw:Math.min(...temps)<=32 && Math.max(...temps)>=34,
    freezingRain:freezeRain,rainOrFreezingRain:rain,
    hours:validRows.length,
    timeline:validRows.slice(0,7).map(x=>({
      startTime:x.startTime,
      hourLocal:String(x.startTime).slice(11,16),
      temperatureF:Math.round(asF(x.temperature,x.temperatureUnit)),
      windMph:Math.round(windMph(x.windSpeed)*10)/10,
      windChillF:Math.round(chillF(asF(x.temperature,x.temperatureUnit),windMph(x.windSpeed))*10)/10,
      shortForecast:String(x.shortForecast||'').slice(0,120)
    })),
    reason:null};
}
function parseAlerts(body, tripDate, now=Date.now()) {
  if(!Array.isArray(body?.features))return {status:'unavailable',events:[],reason:'NWS active alerts response unavailable'};
  // A malformed active warning must not quietly turn into 'no alerts'.
  const malformed=body.features.some(x=>{
    const p=x?.properties;
    return !p||typeof p.event!=='string'||
      !Number.isFinite(Date.parse(p.onset||p.effective||p.sent))||
      !Number.isFinite(Date.parse(p.ends||p.expires));
  });
  if(malformed)return {status:'unavailable',events:body.features
    .map(x=>x?.properties?.event).filter(x=>typeof x==='string'),
    reason:'Active alert timing unavailable or malformed; treat as unresolved'};
  // Detroit DST shifts: conservatively widen the trip-day envelope to avoid
  // missing active midnight alerts. A one-hour overinclusion is safer than a miss.
  const next=new Date(Date.parse(tripDate+'T12:00:00Z')+DAY).toISOString().slice(0,10);
  const start=Date.parse(tripDate+'T00:00:00-04:00');
  const end=Date.parse(next+'T00:00:00-05:00');
  const events=body.features.map(x=>x?.properties).filter(x=>{
    if(!x||typeof x.event!=='string')return false;
    const from=Date.parse(x.onset||x.effective||x.sent),to=Date.parse(x.ends||x.expires);
    return Number.isFinite(from)&&Number.isFinite(to) && from<end && to>=start && to>now;
  }).map(x=>x.event);
  return {status:'verified',events,scope:'Active alerts retrieved at request time, not a guarantee about future alerts',
    checkedAt:new Date(now).toISOString(),sourceUrl:NWS+'/alerts/active'};
}
function pointsUrl(site) {
  if(!validPoint(site))throw new Error('Invalid Michigan destination');
  return NWS+'/points/'+site.lat+','+site.lon;
}
function alertsUrl(site) {
  if(!validPoint(site))throw new Error('Invalid Michigan destination');
  return query(NWS+'/alerts/active',{point:site.lat+','+site.lon});
}
function validForecastUrl(s) {
  return typeof s==='string' && /^https:\/\/api\.weather\.gov\/gridpoints\/[a-z]{3}\/\d+,\d+\/forecast\/hourly$/i.test(s);
}
async function httpJson(url) {
  if(!url.startsWith(NWS+'/')&&!url.startsWith(NOAA+'/'))throw new Error('Upstream host not allowed');
  const r=await fetch(url,{headers:{Accept:'application/geo+json, application/json', 'User-Agent':UA},
    signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw new Error('Upstream HTTP '+r.status);
  return await r.json();
}
async function nwsFor(site,tripDate,read,now) {
  const points=await read(pointsUrl(site));
  const u=points?.properties?.forecastHourly;
  if(!validForecastUrl(u))throw new Error('Untrusted NWS forecast URL');
  const body=await read(u);
  const p=parseHourly(body,tripDate,now);
  const weekTrend=TREND.summarize(body,now);
  return {...p,weekTrend,sourceUrl:u};
}
async function getTripEvidence(site, tripDate, opts={}) {
  const now=opts.now??Date.now();
  if(!validPoint(site))throw new Error('Invalid Michigan destination');
  if(!validDate(tripDate))throw new Error('Invalid YYYY-MM-DD outing date');
  const dateMs=Date.parse(tripDate+'T12:00:00Z');
  if(dateMs<now-36*HOURS||dateMs>now+7*DAY)throw new Error('Trip date outside NWS hourly horizon');
  const read=opts.fetchJson||httpJson;
  const c=opts.cache===undefined?cache:opts.cache;
  const key=site.lat.toFixed(5)+','+site.lon.toFixed(5)+':'+tripDate;
  const hit=c?.get(key);
  if(hit&&hit.expires>now)return hit.data;
  const [snow,weather,alerts]=await Promise.allSettled([
    read(snowUrl(site)).then(x=>parseNoaa(x,now)),
    nwsFor(site,tripDate,read,now),
    read(alertsUrl(site)).then(x=>parseAlerts(x,tripDate,now))
  ]);
  const data={
    destinationRef:{lat:site.lat,lon:site.lon,meaning:'DNR recreation reference point; not a validated trailhead'},
    tripDate,
    snow:snow.status==='fulfilled'?snow.value:parseNoaa(null,now),
    forecast:weather.status==='fulfilled'?weather.value:{...parseHourly(null,tripDate,now),weekTrend:TREND.summarize(null,now)},
    alerts:alerts.status==='fulfilled'?alerts.value:{status:'unavailable',events:[],reason:'Alert feed request failed'},
    generatedAt:new Date(now).toISOString(),
    newSnowfall:{status:'unavailable',reason:'Snow-depth snapshot is not a new-snow accumulation forecast'},
    provenance:'Model snow, hourly forecast and active alerts; none verifies winter trail access'
  };
  if(c){if(c.size>128)c.clear();c.set(key,{data,expires:now+15*60*1000})}
  return data;
}
module.exports={snowUrl,parseNoaa,parseHourly,parseAlerts,windMph,chillF,
  validPoint,validForecastUrl,validDate,pointsUrl,alertsUrl,getTripEvidence};
