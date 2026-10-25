'use strict';
/**
 * NOAA NCEI GHCN-Daily SNWD historical *station observations*.
 * NOT NOHRSC gridded model, NOT trail depth, NOT plowed parking.
 * One bounded 7-day window per year, same station across winters.
 * Only the server-curated trail's reference point may select the search bbox.
 */
const Routes=require('./winter-hike-routes.cjs');
const BASE='https://www.ncei.noaa.gov/access/services/data/v1';
const SEARCH='https://www.ncei.noaa.gov/access/services/search/v1/data';
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
 // NCEI Data Service cannot discover stations from bbox alone: it returns
 // HTTP 400 "A station is required". The documented Search Service accepts
 // bbox and returns NOAA station IDs plus actual SNWD coverage metadata.
 const q=new URLSearchParams({dataset:'daily-summaries',
   dataTypes:'SNWD',startDate:window.start,endDate:window.end,
   bbox:bounds(point),limit:'60',offset:'0'});
 return SEARCH+'?'+q.toString();
}
function stationRequestUrl(stationId,year,anchor){
 if(!/^[A-Z0-9]{6,15}$/.test(stationId||''))throw new Error('Invalid NOAA station ID');
 const window=windowDates(year,anchor);
 if(!window)throw new Error('Invalid winter window');
 const q=new URLSearchParams({dataset:'daily-summaries',
   dataTypes:'SNWD',stations:stationId,startDate:window.start,endDate:window.end,
   units:'standard',format:'json',
   includeStationName:'true',includeStationLocation:'true',includeAttributes:'true'});
 return BASE+'?'+q.toString();
}
function candidateStations(body,point){
 if(!body||!Array.isArray(body.results))return [];
 const selected=new Map();
 for(const entry of body.results.slice(0,60)){
  const xy=entry?.boundingPoints?.find(p=>Array.isArray(p?.coordinates))?.coordinates;
  if(!Array.isArray(xy)||xy.length!==2)continue;
  const lat=Number(xy[1]),lon=Number(xy[0]);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
  const dist=miles(point,{lat,lon});
  if(dist>MAX_MILES)continue;
  for(const station of entry.stations||[]){
   const id=station?.id;
   if(!/^[A-Z0-9]{6,15}$/.test(id||''))continue;
   const snwd=station.dataTypes?.find(x=>x.id==='SNWD');
   if(!snwd)continue;
   const coverage=Number(snwd.coverage);
   if(!Number.isFinite(coverage)||coverage<10)continue;
   const item={id,name:String(station.name||id).slice(0,110),lat,lon,
    miles:Math.round(dist*10)/10,coverage};
   const previous=selected.get(id);
   if(!previous||item.coverage>previous.coverage)selected.set(id,item);
  }
 }
 // Station depth reporting is a better selection criterion than nearest
 // distance alone. Do not use low-coverage backyard sources over a reporting
 // site with reliable SNWD records. Always disclose distance to the visitor.
 return [...selected.values()].sort((a,b)=>
  Number(b.miles<=25)-Number(a.miles<=25)||
  (b.coverage-b.miles*.5)-(a.coverage-a.miles*.5)||
  a.miles-b.miles||a.id.localeCompare(b.id)).slice(0,5);
}
async function discoverStations(point,year,anchor,{fetcher=globalThis.fetch}={}){
 const url=requestUrl(point,year,anchor);
 try{
  if(typeof fetcher!=='function')throw Error('No fetch capability');
  const r=await fetcher(url,{headers:{Accept:'application/json'},
   signal:AbortSignal.timeout(6500)});
  if(!r?.ok)throw Error('NOAA search HTTP '+r?.status);
  const raw=await r.text();
  if(raw.length>2000000)throw Error('NOAA search response too large');
  const data=JSON.parse(raw);
  if(!Array.isArray(data?.results))throw Error('Malformed NOAA station search response');
  return {status:'verified-search',url,candidates:candidateStations(data,point)};
 }catch{return {status:'source-unavailable',url,candidates:[]}}
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
async function queryYear(point,year,anchor,{stationId,fetcher=globalThis.fetch}={}){
 const url=stationRequestUrl(stationId,year,anchor);
 const timeout=AbortSignal.timeout(6500);
 try{
  if(typeof fetcher!=='function')throw Error('No fetch capability');
  const response=await fetcher(url,{headers:{Accept:'application/json'},signal:timeout});
  if(!response?.ok)throw Error('HTTP '+response?.status);
  const raw=await response.text();
  if(raw.length>100000)throw Error('Unexpected NOAA station 7-day response size');
  const parsed=JSON.parse(raw);
  if(!Array.isArray(parsed))throw Error('Unexpected NOAA station response');
  return {year,status:parsed.length?'ok':'no-reports',points:parsed.slice(0,400).
    map(row=>normalizeObservation(row,year,anchor,point))
    .filter(r=>r&&r.station===stationId),url};
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
 const years=Array.from({length:YEARS},(_,i)=>last-i),point=route.referencePoint;
 const discovery=await discoverStations(point,last,anchor,options);
 let chosen=null,results=null,summary=null;
 for(const candidate of discovery.candidates){
  const sample=await Promise.all(years.map(year=>
   queryYear(point,year,anchor,{...options,stationId:candidate.id})));
  const current=summarize(point,sample,anchor,now);
  const reporting=current.years.reduce((n,y)=>n+y.reportedDays,0);
  // Prefer a nearby station with multiple actually reported winters over
  // a distant station that would describe a different lake-effect snowbelt.
  // Test at most five validated NOAA Search metadata candidates.
  const currentYears=current.station?.coverageWinters||0;
  const bestYears=summary?.station?.coverageWinters||0;
  const bestReporting=summary?.years?.reduce((n,y)=>n+y.reportedDays,0)||0;
  const currentScore=current.station?
   currentYears*10+reporting+(currentYears>=3&&candidate.miles<=25?100:0)
    -candidate.miles*.5:-Infinity;
  const bestScore=summary?.station?
   bestYears*10+bestReporting+(bestYears>=3&&chosen?.miles<=25?100:0)
    -(chosen?.miles||40)*.5:-Infinity;
  if(!summary||currentScore>bestScore){
   chosen=candidate;results=sample;summary=current;
  }
  if(current.station?.coverageWinters>=3&&reporting>=12&&candidate.miles<=25)break;
 }
 if(!summary){
  results=years.map(year=>({year,status:discovery.status==='source-unavailable'?
   'unavailable':'no-reports',points:[],url:null}));
  summary=summarize(point,results,anchor,now);
 }
 return {...summary,routeId,routeName:route.displayName,
  discoveryStatus:discovery.status,
  sourceSearchUrl:discovery.url,
  stationSearchCandidates:discovery.candidates.length};
}
module.exports={ANCHORS,MAX_MILES,YEARS,lastCompletedWinterYear,windowDates,bounds,requestUrl,
 stationRequestUrl,candidateStations,discoverStations,
 normalizeObservation,queryYear,summarize,historyForRoute};
