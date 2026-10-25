'use strict';
/**
 * Full Nov-Apr historical SNWD reporting at ONE nearby GHCN-Daily station.
 * This is NOT a trail-surface snowshoe forecast, NASA raster snow measurement,
 * NOAA NOHRSC model history, or observed parking/road maintenance.
 */
const H=require('./winter-hike-history.cjs');
const Routes=require('./winter-hike-routes.cjs');
const SOURCE='https://www.ncei.noaa.gov/access/services/data/v1';
const THRESHOLD_INCHES=6;
const SEASON_MONTHS=Object.freeze(['11','12','01','02','03','04']);
const TARGET_DAYS=181; // Common calendar; Feb 29 excluded for comparable week positions.
const FULL_REQUEST_LIMIT=700000;
function iso(ms){return new Date(ms).toISOString().slice(0,10)}
function seasonRange(year){
 if(!Number.isInteger(year)||year<2004||year>2100)throw Error('Unsupported completed winter');
 return {start:(year-1)+'-11-01',end:year+'-04-30'};
}
function fullUrl(station,year){
 if(!/^[A-Z0-9]{6,15}$/.test(station||''))throw Error('Invalid official station');
 const p=seasonRange(year);
 const q=new URLSearchParams({
  dataset:'daily-summaries',dataTypes:'SNWD',stations:station,
  startDate:p.start,endDate:p.end,units:'standard',format:'json',
  includeStationName:'true',includeStationLocation:'true',
  includeAttributes:'true'});
 return SOURCE+'?'+q.toString();
}
function dayIndex(day,year){
 if(typeof day!=='string'||! /^\d{4}-\d\d-\d\d$/.test(day))return null;
 const d=new Date(day+'T12:00:00Z');
 if(!Number.isFinite(d.getTime())||iso(d.getTime())!==day)return null;
 const p=seasonRange(year);
 if(day<p.start||day>p.end||day.endsWith('-02-29'))return null;
 const monthDay=day.slice(5);
 const isPrior=monthDay.slice(0,2)==='11'||monthDay.slice(0,2)==='12';
 const normalized=(isPrior?'2001-':'2002-')+monthDay;
 const baseline=Date.parse('2001-11-01T12:00:00Z');
 const at=Date.parse(normalized+'T12:00:00Z');
 const idx=(at-baseline)/86400000;
 return Number.isInteger(idx)&&idx>=0&&idx<TARGET_DAYS?idx:null;
}
function dayForIndex(index,year) {
 if(!Number.isInteger(index)||index<0||index>=TARGET_DAYS)return null;
 const anchor=Date.parse('2001-11-01T12:00:00Z')+index*86400000;
 const mmdd=iso(anchor).slice(5);
 return (mmdd.slice(0,2)==='11'||mmdd.slice(0,2)==='12'?year-1:year)+'-'+mmdd;
}
function weekWindow(week,year){
 if(!Number.isInteger(week)||week<0||week>=26)return null;
 const first=week*7,last=Math.min(TARGET_DAYS-1,first+6);
 return {week:week+1,start:dayForIndex(first,year),end:dayForIndex(last,year),
  label:dayForIndex(first,2002).slice(5)+' to '+dayForIndex(last,2002).slice(5),
  days:last-first+1};
}
function validRow(row,station,year,point){
 if(!row||String(row.STATION)!==station)return null;
 const idx=dayIndex(row.DATE,year);
 if(idx===null)return null;
 const raw=row.SNWD;
 if(raw===undefined||raw===null||String(raw).trim()==='')return null;
 const depth=Number(raw);
 if(!Number.isFinite(depth)||depth<0||depth>250)return null;
 const flags=String(row.SNWD_ATTRIBUTES??'').split(',');
 if(flags[1]?.trim())return null;
 const lat=Number(row.LATITUDE),lon=Number(row.LONGITUDE);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<41||lat>49||lon< -91||lon> -82)return null;
 // Station identity is not enough: a returned station with a mismatched
 // location may be a merged identifier or a broken upstream response.
 const k=Math.PI/180,dy=(lat-point.lat)*k,dx=(lon-point.lon)*k;
 const h=Math.sin(dy/2)**2+Math.cos(lat*k)*Math.cos(point.lat*k)*Math.sin(dx/2)**2;
 if(3958.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)))>H.MAX_MILES)return null;
 return {idx,date:row.DATE,inches:Math.round(depth*10)/10};
}
async function fetchWinter(point,station,year,{fetcher=globalThis.fetch}={}){
 const url=fullUrl(station,year);
 try{
  if(typeof fetcher!=='function')throw Error('No HTTP fetch');
  const response=await fetcher(url,{headers:{Accept:'application/json'},
   signal:AbortSignal.timeout(6500)});
  if(!response?.ok)throw Error('NCEI unavailable');
  const raw=await response.text();
  if(raw.length>FULL_REQUEST_LIMIT)throw Error('NCEI response exceeded cap');
  const parsed=JSON.parse(raw);
  if(!Array.isArray(parsed))throw Error('NCEI non-array response');
  const days=Array(TARGET_DAYS).fill(null),conflicts=new Set();
  for(const row of parsed){
   const good=validRow(row,station,year,point);
   if(!good)continue;
   if(days[good.idx]!==null && days[good.idx]!==good.inches){
    conflicts.add(good.idx);continue;
   }
   days[good.idx]=good.inches;
  }
  for(const i of conflicts)days[i]=null;
  return {year,status:parsed.length?'partial-or-complete':'no-reports',
   days,sourceUrl:url,conflictingDays:conflicts.size};
 }catch{
  return {year,status:'source-unavailable',days:Array(TARGET_DAYS).fill(null),
   sourceUrl:url,conflictingDays:0};
 }
}
function analyze(years,station,now=Date.now()){
 const weeks=Array.from({length:26},(_,week)=>{
  const rows=years.map(y=>{
   const w=weekWindow(week,y.year),obs=y.days.slice(week*7,week*7+w.days);
   const available=obs.filter(v=>typeof v==='number'&&Number.isFinite(v));
   const over=available.filter(v=>v>=THRESHOLD_INCHES).length;
   const eligible=available.length>=Math.min(5,w.days);
   return {year:y.year,reported:available.length,total:w.days,depthSixInDays:over,
    qualifies:eligible&&over>=4,eligible,status:y.status,
    sampleDate:dayForIndex(week*7+Math.floor(w.days/2),y.year)};
  });
  const eligible=rows.filter(r=>r.eligible);
  const qualifying=eligible.filter(r=>r.qualifies);
  const completeEnough=eligible.length>=3;
  const consistentlyCovered=completeEnough&&qualifying.length>=3;
  return {week:week+1,label:weekWindow(week,2002).label,
   firstDay:weekWindow(week,2002).start.slice(5),
   lastDay:weekWindow(week,2002).end.slice(5),
   reportWinters:eligible.length,qualifyingWinters:qualifying.length,
   evaluatedWinters:years.length,totalReportedDays:rows.reduce((v,r)=>v+r.reported,0),
   totalPossibleDays:rows.reduce((v,r)=>v+r.total,0),
   status:!completeEnough?'insufficient-history':
    consistentlyCovered?'historically-frequent-6in-station-snow':'variable-or-lower-station-snow',
   rows};
 });
 const ranked=weeks.filter(w=>w.status==='historically-frequent-6in-station-snow')
  .sort((a,b)=>b.qualifyingWinters-a.qualifyingWinters||b.totalReportedDays-a.totalReportedDays||a.week-b.week);
 const totalObserved=years.reduce((v,y)=>v+y.days.filter(n=>typeof n==='number').length,0);
 const totalPossible=years.length*TARGET_DAYS;
 const coveredSeasons=years.filter(y=>y.days.filter(n=>typeof n==='number').length>=120).length;
 return {
  kind:'NOAA_NCEI_GHCN_DAILY_FULL_WINTER_STATION_SNOW_DEPTH',
  confidenceInterpretation:'Historical station snow-cover persistence proxy, not probability or trail prediction',
  season:'November 1 – April 30 (Feb 29 excluded for common-date alignment)',
  thresholdInches:THRESHOLD_INCHES,yearsAnalyzed:years.length,
  station,generatedAt:new Date(now).toISOString(),winterYears:years.map(y=>({
   year:y.year,status:y.status,reportedDays:y.days.filter(n=>typeof n==='number').length,
   possibleDays:TARGET_DAYS,conflictingDays:y.conflictingDays,
   snowCoverDays6in:y.days.filter(n=>typeof n==='number'&&n>=THRESHOLD_INCHES).length,
   sourceUrl:y.sourceUrl
  })),weeks,topHistoricallyCoveredWeeks:ranked.slice(0,5).map(w=>({
   week:w.week,label:w.label,qualifyingWinters:w.qualifyingWinters,
   reportWinters:w.reportWinters
  })),totalObservedDays:totalObserved,totalPossibleDays:totalPossible,
  coverageWinters120Days:coveredSeasons,
  status:totalObserved?'station-measurements-with-gaps':'no-observed-depth',
  caveat:'One off-trail reporting station, not the route. A 6-inch reading at this station is an illustrative snow-on-ground threshold, NOT an operational snowshoe recommendation. Three measured winters per week with >=5 of 7 reported days are needed before labeling it frequently covered. Date gaps or NOAA outages remain unknown, never zero. No station elevation/bias adjustment, no live snow or plowing claim.',
  parkingVerified:false,routeOpenVerified:false,
  noGuaranteedSnowshoeWeeks:true,
  sourceDocumentation:'https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation'
 };
}
async function fullSeasonForRoute(routeId,{fetcher=globalThis.fetch,now=Date.now()}={}){
 const route=Routes.routeById(routeId);
 if(!route)throw Error('Unknown named route');
 const known=await H.historyForRoute(routeId,'02-15',{fetcher,now});
 const station=known.station;
 const years=Array.from({length:H.YEARS},(_,i)=>H.lastCompletedWinterYear(now)-i);
 if(!station)return {
  status:'no-nearby-qualified-station',kind:'NOAA_NCEI_GHCN_DAILY_FULL_WINTER_STATION_SNOW_DEPTH',
  routeId,routeName:route.displayName,station:null,winterYears:[],weeks:[],
  topHistoricallyCoveredWeeks:[],parkingVerified:false,routeOpenVerified:false,
  caveat:'No consistent nearby February NOAA daily snow-depth station was identified in the four completed winters. Missing source measurements are not zero and no snowshoe-season pattern is asserted.'
 };
 const results=await Promise.all(years.map(year=>fetchWinter(route.referencePoint,station.id,year,{fetcher})));
 return {...analyze(results,station,now),routeId,routeName:route.displayName};
}
module.exports={TARGET_DAYS,THRESHOLD_INCHES,SEASON_MONTHS,seasonRange,fullUrl,dayIndex,
 dayForIndex,weekWindow,validRow,fetchWinter,analyze,fullSeasonForRoute};
