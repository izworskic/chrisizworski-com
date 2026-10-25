'use strict';
/**
 * NOAA NCEI GHCN-Daily SNWD historical *station observations*.
 * NOT NOHRSC gridded model, NOT trail depth, NOT plowed parking.
 * One bounded 7-day window per year, same station across winters.
 * Only the server-curated trail's reference point may select the search bbox.
 */
const Routes=require('./winter-hike-routes.cjs');
const BASE='https://www.ncei.noaa.gov/access/services/data/v1';
const ANCHORS=new Set(['01-15','02-15','03-15']);
const MAX_MILES=40,YEARS=4,WINDOW_DAYS=3;
const stamp=d=>d.toISOString().slice(0,10);
const timeMs=()=>Date.now();
function lastCompletedWinterYear(now=timeMs()){
 const d=new Date(now);
 return d.getUTCMonth()>=5?d.getUTCFullYear():d.getUTCFullYear()-1;
}
function windowDates(year,anchor){
 if(!Number.isInteger(year)||year<2003||year>2100||!ANCHORS.has(anchor))return null;
 const d=new Date(year+'-'+anchor+'T12:00:00.000Z');
 if(!Number.isFinite(d.getTime()))return null;
 return {start:stamp(new Date(d.getTime()-WINDOW_DAYS*86400000)),
  end:stamp(new Date(d.getTime()+WINDOW_DAYS*86400000)),center:stamp(d)};
}
function miles(a,b){
 const k=Math.PI/180,dl=(a.lat-b.lat)*k,dn=(a.lon-b.lon)*k;
 const u=Math.sin(dl/2)**2+Math.cos(a.lat*k)*Math.cos(b.lat*k)*Math.sin(dn/2)**2;
 return 3958.8*2*Math.atan2(Math.sqrt(u),Math.sqrt(Math.max(0,1-u)));
}
function bounds(point){
 if(!point||!Number.isFinite(point.lat)||!Number.isFinite(point.lon)||
  point.lat<41||point.lat>49||point.lon< -91||point.lon> -82)throw new Error('Invalid curated Michigan reference');
 const latDelta=.46,lonDelta=.46/Math.max(.4,Math.cos(point.lat*Math.PI/180));
 return [(point.lat+latDelta).toFixed(4),(point.lon-lonDelta).toFixed(4),
  (point.lat-latDelta).toFixed(4),(point.lon+lonDelta).toFixed(4)].join(',');
}
function requestUrl(point,year,anchor){
 const window=windowDates(year,anchor);
 if(!window)throw new Error('Invalid winter window');
 const q=new URLSearchParams({dataset:'daily-summaries',
   dataTypes:'SNWD',startDate:window.start,endDate:window.end,
   bbox:bounds(point),units:'standard',format:'json',
   includeStationName:'true',includeStationLocation:'true',includeAttributes:'true'});
 return BASE+'?'+q.toString();
}
function pickCoord(record,short,long) {
 const n=Number(record?.[short]??record?.[long]);
 return Number.isFinite(n)?n:null;
}
function normalizeObservation(row,year,anchor,point) {
 if(!row||typeof row!=='object')return null;
 const date=String(row.DATE||'').slice(0,10),period=windowDates(year,anchor);
 if(!period||date<period.start||date>period.end||
   !/^\d{4}-\d\d-\d\d$/.test(date))return null;
 const id=String(row.STATION||'');
 if(!/^[A-Z0-9]{6,15}$/.test(id))return null;
 const lat=pickCoord(row,'LATITUDE','latitude'),
  lon=pickCoord(row,'LONGITUDE','longitude');
 if(lat===null||lon===null||lat<41||lat>49||lon< -91||lon> -82)return null;
 const distance=miles(point,{lat,lon});
 if(distance>MAX_MILES)return null;
 const raw=row.SNWD;
 if(raw===null||raw===undefined||String(raw).trim()==='')return null;
 const value=Number(raw);
 if(!Number.isFinite(value)||value<0||value>250)return null;
 // GHCN quality attribute is the second comma-separated segment.
 const flag=String(row.SNWD_ATTRIBUTES??row.SNWD_ATTRIBUTES??'').split(',')[1]?.trim()||'';
 if(flag)return null;
 return {station:id,name:String(row.NAME||id).slice(0,110),lat,lon,
  miles:Math.round(distance*10)/10,date,year,inches:Math.round(value*10)/10};
}
async function queryYear(point,year,anchor,{fetcher=globalThis.fetch,now=timeMs()}={}){
 const url=requestUrl(point,year,anchor);
 const timeout=AbortSignal.timeout(6500);
 try{
  if(typeof fetcher!=='function')throw new Error('No fetch capability');
  const response=await fetcher(url,{headers:{Accept:'application/json'},signal:timeout});
  if(!response?.ok)throw new Error('HTTP '+response?.status);
  const raw=await response.text();
  if(raw.length>1600000)throw new Error('NOAA response above limit');
  const parsed=JSON.parse(raw);
  if(!Array.isArray(parsed))throw new Error('Unexpected NOAA response');
  return {year,status:parsed.length?'ok':'no-reports',points:parsed.slice(0,5000).
    map(row=>normalizeObservation(row,year,anchor,point)).filter(Boolean),url};
 }catch{
  return {year,status:'unavailable',points:[],url};
 }
}
function summarize(point,yearResponses,anchor,now=timeMs()) {
 const byStation=new Map();
 for(const response of yearResponses)for(const row of response.points){
  if(!byStation.has(row.station))byStation.set(row.station,[]);
  byStation.get(row.station).push(row);
 }
 // Prefer an actual reporting station represented across multiple winters.
 const chosen=[...byStation.entries()].map(([id,rows])=>({
  id,rows,years:new Set(rows.map(r=>r.year)).size,dist:Math.min(...rows.map(r=>r.miles))
 })).sort((a,b)=>b.years-a.years||a.dist-b.dist||b.rows.length-a.rows.length||a.id.localeCompare(b.id))[0];
 const years=yearResponses.map(result=>{
  const points=chosen?chosen.rows.filter(r=>r.year===result.year).sort((a,b)=>a.date.localeCompare(b.date)):[];
  const dates=[...new Set(points.map(x=>x.date))];
  const values=dates.map(d=>points.find(x=>x.date===d).inches);
  const peak=values.length?Math.max(...values):null;
  return {year:result.year,center:windowDates(result.year,anchor).center,
   status:result.status==='unavailable'?'source-unavailable':points.length?'station-observations':'no-station-samples',
   days:dates.map((date,i)=>({date,inches:values[i]})),
   reportedDays:dates.length,peakObservedIn:peak,sourceUrl:result.url};
 });
 return {
  kind:'NOAA_NCEI_GHCN_DAILY_SNOW_DEPTH_STATION_OBSERVATIONS',
  classification:'measured-station-not-trail-or-grid',
  anchor,period:'Seven-day window centered on '+anchor,
  generatedAt:new Date(now).toISOString(),routePoint:{lat:point.lat,lon:point.lon},
  station:chosen?{id:chosen.id,name:chosen.rows[0].name,
   lat:chosen.rows[0].lat,lon:chosen.rows[0].lon,
   miles:chosen.dist,coverageWinters:chosen.years}:null,
  years,historyStatus:chosen?'partially-observed':'no-qualified-station',
  caveat:'These are reported snow-depth measurements at one nearby NOAA GHCN-Daily station, not NOAA NOHRSC gridded history, trail snow, observed parking clearance or a forecast. Missing reports are missing, never zero. The same station is used for every winter; compare only the observed dates. No plowing inference.',
  sourceDocumentation:'https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation',
  modelArchive:'https://www.nohrsc.noaa.gov/archived_data/',
  parkingVerified:false,routeOpenVerified:false
 };
}
async function historyForRoute(routeId,anchor='02-15',options={}){
 const route=Routes.routeById(routeId);
 if(!route||!ANCHORS.has(anchor))throw new Error('Invalid catalog route or comparison date');
 const now=options.now??timeMs(),last=lastCompletedWinterYear(now);
 const years=Array.from({length:YEARS},(_,i)=>last-i);
 const point=route.referencePoint;
 const results=await Promise.all(years.map(year=>queryYear(point,year,anchor,{...options,now})));
 return {...summarize(point,results,anchor,now),routeId,routeName:route.displayName};
}
module.exports={ANCHORS,MAX_MILES,YEARS,lastCompletedWinterYear,windowDates,bounds,requestUrl,
 normalizeObservation,queryYear,summarize,historyForRoute};
