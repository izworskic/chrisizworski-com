import {LIGHTS,mph,degreesFrom,scoreHour,bestWindow,persistence,isFresh} from '../lib/frozen-lighthouse.mjs';

export const config={runtime:'edge'};
const UA={'User-Agent':'FrozenLighthouseWatch/1.0 (chrisizworski.com/frozen-lighthouses-michigan/; public weather research)','Accept':'application/geo+json, application/json'};
const SOURCE={
 lights:'https://www.navcen.uscg.gov/sites/default/files/pdf/lightLists/LightList_V7_2024.pdf',
 formula:'https://www.pmel.noaa.gov/public/pmel/publications-search/search_abstract.php?fmContributionNum=1104',
 water:'https://tidesandcurrents.noaa.gov/stationhome.html?id=9087031',
 lakeTemperature:'https://coastwatch.glerl.noaa.gov/statistics/average-surface-water-temperature-glsea/',
 ice:'https://chrisizworski.com/michigan-ice/',
 weather:'https://api.weather.gov/',
 waves:null
};
const GRACE_MS=3600000;
async function requestJson(url,ms=8500){
 const r=await fetch(url,{headers:UA,signal:AbortSignal.timeout(ms)});
 if(!r.ok)throw Error('HTTP '+r.status);
 return r.json();
}
function observedTime(row){
 if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(row||''))return null;
 return row.replace(' ','T')+':00Z';
}
function stationDistanceMiles(pier){
 const dlat=(pier.lat-42.77333)*Math.PI/180,dlon=(pier.lon+86.21278)*Math.PI/180;
 const q=Math.sin(dlat/2)**2+Math.cos(pier.lat*Math.PI/180)*Math.cos(42.77333*Math.PI/180)*Math.sin(dlon/2)**2;
 return 3958.8*2*Math.asin(Math.min(1,Math.sqrt(q)));
}
export function parseGLSEA(csv,year,now){
 const lines=String(csv||'').trim().split(/\r?\n/),expected=String(year);
 if(!lines[0]?.includes(expected))return null;
 let found=null;
 for(const line of lines.slice(1)){
  const cells=line.split(','),day=Number(cells[0]),value=Number(cells[cells.length-1]);
  if(!Number.isInteger(day)||day<1||day>366||!cells[cells.length-1]?.trim()||!Number.isFinite(value)||value<30||value>95)continue;
  const time=new Date(Date.UTC(year,0,day,12)).toISOString();
  if(isFresh(time,now,72)&&(!found||time>found.observedAt))found={tempF:Math.round(value*10)/10,observedAt:time,kind:'lakewide-proxy',station:'GLSEA Lake Michigan daily lakewide mean'};
 }
 return found;
}
export function normalizeStation(json,now){
 const v=Number(json?.data?.[0]?.v),observedAt=observedTime(json?.data?.[0]?.t);
 if(!Number.isFinite(v)||v<30||v>95||!isFresh(observedAt,now,36))return null;
 return {tempF:Math.round(v*10)/10,observedAt,kind:'Holland-shore',station:'NOAA Holland 9087031'};
}
async function waterSources(now){
 const year=new Date(now).getUTCFullYear();
 const url='https://apps.glerl.noaa.gov/coastwatch/webdata/statistic/csv/avgtemps-m_1995-'+year+'_F.csv';
 const [coops,glsea]=await Promise.allSettled([
  requestJson('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=9087031&product=water_temperature&units=english&time_zone=gmt&format=json'),
  fetch(url,{signal:AbortSignal.timeout(8500)}).then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.text();})
 ]);
 return {coops:coops.status==='fulfilled'?normalizeStation(coops.value,now):null,
  glsea:glsea.status==='fulfilled'?parseGLSEA(glsea.value,year,now):null,
  endpoint:{coops:'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=9087031&product=water_temperature&units=english&time_zone=gmt&format=json',glsea:url}};
}
export function pickWater(pier,sources){
 const miles=stationDistanceMiles(pier);
 if(sources.coops&&miles<=35)return {...sources.coops,distanceMiles:Math.round(miles)};
 if(sources.glsea)return {...sources.glsea,distanceMiles:null};
 return null;
}
export function forecastHours(json,now){
 const p=json?.properties,updated=p?.updateTime||p?.generatedAt;
 if(!isFresh(updated,now,6)||!Array.isArray(p?.periods))return null;
 const data=p.periods.filter(x=>{
  const ms=Date.parse(x.startTime||'');return Number.isFinite(ms)&&ms>=now-GRACE_MS&&ms<now+72*3600000;
 }).slice(0,72).map(x=>{
  const airF=x.temperature===null||x.temperature===undefined?null:x.temperatureUnit==='F'?Number(x.temperature):x.temperatureUnit==='C'?Number(x.temperature)*9/5+32:null;
  const windMph=mph(x.windSpeed),windFrom=degreesFrom(x.windDirection);
  return {startTime:x.startTime,airF:airF!==null&&Number.isFinite(airF)?Math.round(airF):null,
   windMph,windFrom,windDirection:x.windDirection||null,
   gustMph:mph(x.windGust??x.windGusts),shortForecast:x.shortForecast||'',
   isDaytime:x.isDaytime===true};
 });
 return {updatedAt:updated,hours:data};
}
async function nwsForecast(pier,now){
 const url='https://api.weather.gov/points/'+pier.lat.toFixed(4)+','+pier.lon.toFixed(4);
 const points=await requestJson(url);
 const hourly=points?.properties?.forecastHourly;
 if(typeof hourly!=='string'||!hourly.startsWith('https://api.weather.gov/'))throw Error('Missing NWS hourly URL');
 const data=await requestJson(hourly);
 const forecast=forecastHours(data,now);
 if(!forecast)throw Error('NWS forecast unavailable or stale');
 return {...forecast,endpoint:hourly};
}
async function nwsAlerts(pier,now){
 const url='https://api.weather.gov/alerts/active?point='+pier.lat.toFixed(4)+'%2C'+pier.lon.toFixed(4);
 const j=await requestJson(url,6500);
 const asOf=j?.updated||null;
 if(!isFresh(asOf,now,3)||!Array.isArray(j.features))throw Error('Alerts unavailable or stale');
 return {updatedAt:asOf,events:j.features.map(f=>({
  name:f.properties?.event||'',headline:f.properties?.headline||'',
  endsAt:f.properties?.ends||null,uri:f.id||null
 })).filter(e=>/freezing spray/i.test(e.name))};
}
export function iceContext(json,now){
 const observedAt=json?.cover?.observedAt;
 const time=/^\d{4}-\d{2}-\d{2}$/.test(observedAt||'')?observedAt+'T00:00:00Z':null;
 const pct=json?.cover?.michigan;
 if(!isFresh(time,now,48)||typeof pct!=='number'||pct<0||pct>100)return {pct:null,observedAt:null,coverage:'missing'};
 return {pct,observedAt:time,coverage:'lakewide-only'};
}
async function getIce(req,now){
 try{
  const u=new URL('/api/ice',req.url);
  const response=await fetch(u.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(7500)});
  if(!response.ok)return iceContext(null,now);
  return iceContext(await response.json(),now);
 }catch{return iceContext(null,now);}
}
export function evaluatePier(pier,forecast,water,ice,alerts,now){
 if(!forecast)return {
  id:pier.id,name:pier.name,town:pier.town,lightList:pier.listNumber,
  lat:pier.lat,lon:pier.lon,onshoreBearing:Math.round(pier.onshoreBearing),
  available:false,reason:'NWS hourly forecast is missing or stale',hours:[],best:null,
  water:water||null,ice,alerts,forecastIssuedAt:null,asOf:new Date(now).toISOString()
 };
 const hours=forecast.hours.map(h=>{
  const result=scoreHour({...h,waterF:water?.tempF??null,icePct:ice.pct},pier);
  return {...h,waterF:water?.tempF??null,score:result.score,category:result.category,pr:result.pr,reason:result.reason};
 });
 const best=bestWindow(hours);
 const missingWater=!water;
 const latest=hours[0]||null;
 return {id:pier.id,name:pier.name,town:pier.town,lightList:pier.listNumber,lat:pier.lat,lon:pier.lon,
  onshoreBearing:Math.round(pier.onshoreBearing),available:!missingWater&&hours.length>0,
  reason:missingWater?'No fresh water temperature; cannot compute icing intensity':hours.length?'':'No forecast hours available',
  hours,best,persistence:persistence(hours,best),current:latest,
  water:water||null,ice,alerts,forecastIssuedAt:forecast.updatedAt,forecastEndpoint:forecast.endpoint,
  asOf:new Date(now).toISOString(),provisional:water?.kind==='lakewide-proxy'||ice.pct===null};
}
export default async function handler(req){
 const now=Date.now();
 const blank={status:'unavailable',updatedAt:null,events:[]};
 const [water,ice]=await Promise.all([waterSources(now),getIce(req,now)]);
 const forecastCache=new Map();
 const lookup=async pier=>{
  const key=pier.town==='St. Joseph'?'st-joseph':pier.id;
  if(!forecastCache.has(key))forecastCache.set(key,nwsForecast(pier,now).catch(()=>null));
  const [forecast,alerts]=await Promise.all([forecastCache.get(key),nwsAlerts(pier,now).catch(()=>blank)]);
  return evaluatePier(pier,forecast,pickWater(pier,water),ice,alerts,now);
 };
 const piers=await Promise.all(LIGHTS.map(lookup));
 const out={ok:true,generatedAt:new Date(now).toISOString(),horizonHours:72,
  models:{gate:'wind at least 15 mph, air below 32 F, water below 40 F, onshore fetch',formula:'PR = Va * (0 - Ta) / (1 + 0.3 * Tw), freshwater, temperatures in Celsius, wind in m/s',categories:{none:'PR <= 0',light:'0 < PR < 22.4',moderate:'22.4 <= PR < 53.3',heavy:'53.3 <= PR < 83',extreme:'PR >= 83'},scope:'Relative icing indicator adapted from marine vessel research, not lighthouse ice thickness or visitor safety'},
  limitations:{waves:'No verified winter-long year-round machine-readable wave feed; waves not modeled.',
   ice:'Lakewide GLERL concentration only, not pier-level nearshore pack ice. Unknown is not zero.',
   water:'Holland coastal gauge when within 35 miles; otherwise GLSEA lakewide satellite-derived mean as a regional proxy, never presented as local temperature.',
   webcam:'External Visit Southwest Michigan information page only; no camera hotlink or proxy.'},
  sources:{...SOURCE,waterEndpoints:water.endpoint,iceEndpoint:new URL('/api/ice',req.url).toString()},
  piers};
 return new Response(JSON.stringify(out),{status:200,headers:{
  'content-type':'application/json; charset=utf-8','cache-control':'public, s-maxage=3600, stale-while-revalidate=1800',
  'x-robots-tag':'noindex, nofollow',
  'access-control-allow-origin':'https://chrisizworski.com'
 }});
}
