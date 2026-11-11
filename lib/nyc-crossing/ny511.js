'use strict';
const { stateReady, stateCommand } = require('../tool-state');
// TMDD 3.0 field mappings from the 511NY_Events_API_Migration_Guide_v4 (Sept 2026).
// Browser code never contacts 511NY. Credentials only in Authorization headers.
const EVENTS_URL='https://nysdot.carsprogram.org/carsapi_v1/api/events';
// Query CARS by actual road number, not an unbounded statewide collection.
// CARS documents routeDesignator, limit and offset as supported filters.
const EVENT_ROUTES=Object.freeze(['I-95','I-495','I-78','I-478','I-278','NY-25','US-1','US-9']);
// CARS may truncate results at its server-side page cap. Any partial route
// fetch is rejected rather than cached as a false no-incidents result.
const EVENTS_PAGE_SIZE=200, MAX_EVENT_PAGES_PER_ROUTE=12, EVENT_REFRESH_BUDGET_MS=42000;
const SIGNS_URL='https://nyapi.carsprogram.org/signs.json';
const KEY_EVENTS='nyc:511ny:events:v1',KEY_SIGNS='nyc:511ny:signs:v1',KEY_LOCK='nyc:511ny:refresh-lock:v1',KEY_HEALTH='nyc:511ny:poll-health:v1';
// Upstash REST can take longer than 750ms on a cold function. Keep reader budgets
// bounded while giving the 5-minute background writer the same 4.5s as flight-watch.
const INTERVAL_MS=300000,RETENTION_SECONDS=172800,CACHE_TIMEOUT_MS=1400,REFRESH_TIMEOUT_MS=4500;
const CROSSINGS=Object.freeze({
  gwb:{routes:['I-95','US-1','US-9','HENRY HUDSON','WEST SIDE'],points:[[40.852,-73.955],[40.861,-73.962]]},
  lincoln:{routes:['I-495','NJ-495','NY-495','WEST SIDE'],points:[[40.761,-74.005],[40.767,-74.031]]},
  holland:{routes:['I-78','NJ-139','WEST SIDE','WEST ST'],points:[[40.726,-74.010],[40.734,-74.049]]},
  'queens-midtown':{routes:['I-495','LONG ISLAND EXPY','FDR'],points:[[40.744,-73.963],[40.742,-73.953]]},
  queensboro:{routes:['NY-25','QUEENS BLVD','FDR'],points:[[40.758,-73.954],[40.751,-73.943]]},
  'hugh-carey':{routes:['I-478','BROOKLYN QUEENS EXPWY','WEST ST'],points:[[40.690,-74.006],[40.690,-73.999]]},
  brooklyn:{routes:['I-278','FDR','BROOKLYN QUEENS EXPWY'],points:[[40.706,-73.997],[40.694,-73.996]]},
  manhattan:{routes:['I-278','FDR','BROOKLYN QUEENS EXPWY'],points:[[40.707,-73.990],[40.697,-73.986]]},
  williamsburg:{routes:['I-278','FDR','BROOKLYN QUEENS EXPWY'],points:[[40.714,-73.972],[40.708,-73.967]]},
  rfk:{routes:['I-278','FDR','HARLEM RIVER'],points:[[40.792,-73.929],[40.805,-73.923]]},
  verrazzano:{routes:['I-278','STATEN ISLAND EXPWY','GOWANUS EXPWY'],points:[[40.607,-74.044],[40.615,-74.060]]}
});
const arr=v=>Array.isArray(v)?v:v==null?[]:Array.isArray(v.location)?v.location:[v];
const text=v=>String(v??'').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,240);
const num=v=>v==null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
// CARS ZonedDateTime JSON is an object: {time: epochMilliseconds,
// nanos, timeZoneId, utcOffset}. Date.parse(object) is always NaN, and
// String(object) would publish the meaningless text "[object Object]".
function carsTime(value){
  const v=value&&typeof value==='object'&&!Array.isArray(value)?value.time:value;
  const parsed=typeof v==='number'?v:
    typeof v==='string'&&/^\d{13}$/.test(v)?Number(v):
    typeof v==='string'?Date.parse(v):NaN;
  return Number.isFinite(parsed)&&parsed>=946684800000&&parsed<4102444800000?parsed:null;
}
function activeDetail(detail,now){
  const start=carsTime(detail['start-time']??detail.startTime);
  const end=carsTime(detail['end-time']??detail.endTime);
  if((start!=null&&start>now)||(end!=null&&end<now))return false;
  // A statewide CARS "active or future" work project can span weeks while
  // its actual lane restriction exists only during named overnight windows.
  const occurrences=arr(detail.scheduleOccurrences||detail['schedule-occurrences']);
  if(occurrences.length){
    return occurrences.some(o=>{
      const from=carsTime(o.startTime??o['start-time']);
      const until=carsTime(o.endTime??o['end-time']);
      return from!=null&&until!=null&&from<=now&&until>=now;
    });
  }
  if(arr(detail['recurrent-times']||detail.recurrentTimes).length||
     arr(detail['effective-periods']||detail.effectivePeriods).length){
    // Unexpanded recurring schedules cannot prove current restrictions.
    return false;
  }
  return true;
}
const unreportedEvent=(category,code,description)=>/\bno active reporting\b/i.test(
  [category,code,description].join(' '));
function point(v){
  if(!v||typeof v!=='object')return null;
  const p=v['primary-location']||v.primaryLocation||v['link-location']||v.linkLocation||v.location||v;
  const g=p['geo-location']||p.geoLocation||p;
  const a=num(g.latitude??g.lat),b=num(g.longitude??g.lon??g.lng);
  if(a!=null&&b!=null&&Math.abs(a)<=90&&Math.abs(b)<=180)return [a,b];
  const geometry=v.geometry||p.geometry;
  const coords=geometry?.type==='Point'?geometry.coordinates:null;
  const lon=num(coords?.[0]),lat=num(coords?.[1]);
  return lat!=null&&lon!=null&&Math.abs(lat)<=90&&Math.abs(lon)<=180?[lat,lon]:null;
}
function routeString(v){
  if(Array.isArray(v))return v.map(routeString).join(' ');
  if(v&&typeof v==='object')return Object.values(v).map(routeString).join(' ');
  return String(v??'').toUpperCase().replace(/[_\u2013\u2014]/g,'-').replace(/\s+/g,' ');
}
const km=(a,b)=>Math.hypot((a[0]-b[0])*111.2,(a[1]-b[1])*Math.cos(a[0]*Math.PI/180)*111.2);
function matchCrossing(route,geo){
  if(!geo)return null; // A route identifier without a location cannot locate an incident.
  const matches=Object.entries(CROSSINGS).map(([id,c])=>({
    id,dist:Math.min(...c.points.map(p=>km(geo,p))),routeMatch:c.routes.some(r=>route.includes(r))
  }));
  // These alerts are shown under a specific crossing, not as a citywide list.
  // Nearby approach work is relevant, but a Cross Bronx project several miles
  // away is not evidence of a restriction on the George Washington Bridge.
  const onRoute=matches.filter(m=>m.routeMatch&&m.dist<=3).sort((a,b)=>a.dist-b.dist);
  if(onRoute.length)return onRoute[0].id;
  const near=matches.sort((a,b)=>a.dist-b.dist)[0];
  return near&&near.dist<=1.5?near.id:null;
}
function normalizeEvent(e,now=Date.now()){
  if(!e||typeof e!=='object')return null;
  // The CARS Events endpoint includes future events as well as current ones.
  const status=text(e.status||'').toUpperCase();
  const classification=text(e.category||'').toUpperCase();
  if(status&&!['CURRENT','ACTIVE'].includes(status))return null;
  if(classification==='PLANNED'||classification==='FORECAST')return null;
  const category=text(e.headline?.category||e.eventType||'Incident');
  const code=text(e.headline?.code||e.eventSubType||'');
  const narratives=arr(e['full-report-texts']||e.fullReportTexts);
  const narrative=narratives.find(v=>v&&typeof v.description==='string')?.description;
  const description=text(e.description||narrative||code||category);
  if(unreportedEvent(category,code,description)||
     /\b(?:high occupancy|hov) lane open\b/i.test(description))return null;
  const details=arr(e.details).filter(x=>x&&typeof x==='object');
  const activeDetails=details.filter(d=>activeDetail(d,now));
  if(details.length&&!activeDetails.length)return null;
  const detail=activeDetails[0]||{};
  const start=carsTime(detail['start-time']??detail.startTime??e['start-time']);
  const end=carsTime(detail['end-time']??detail.endTime??e['end-time']);
  if((start!=null&&start>now)||(end!=null&&end<now))return null;
  const modified=carsTime(e['update-time']??e.updateTime??
    detail['update-time']??detail.updateTime);
  // A current event still needs a parseable observation time; otherwise the
  // public UI could misrepresent an unverified, outdated record as live.
  if(modified==null||modified>now+300000)return null;
  const locations=[...activeDetails.flatMap(d=>arr(d.locations||d.location)),
    ...arr(e.locations||e.location)];
  const loc=locations.find(x=>point(x))||locations[0]||{};
  const geo=point(loc)||point(e);
  const route=routeString(loc['route-designator']??loc.routeDesignator??
    loc['link-location']?.['route-designator']??loc.linkLocation?.routeDesignator??
    loc.routeId??e.routeId??e.roadwayName);
  const crossingId=matchCrossing(route,geo);
  if(!crossingId)return null;
  // Crossing cards do not represent the full length of an interstate. Only
  // source-located events close to the referenced bridge/tunnel are included.
  const proximityKm=Math.min(...CROSSINGS[crossingId].points.map(p=>km(geo,p)));
  if(proximityKm>2.3)return null;
  const priority=num(e.priority);
  const isClosure=/clos/i.test(category+' '+code);
  return {id:text(e['event-id']??e.eventId??e.id),crossingId,category,code,
    description,route:text(route),direction:text(loc['link-direction']??loc.linkDirection??''),
    priority,penaltyPoints:isClosure?12:priority!=null&&priority<=2?7:priority!=null&&priority<=4?5:3,
    updatedAt:new Date(modified).toISOString()};
}
function normalizeSign(s){
  const location=s.location||{};
  const crossingId=matchCrossing(routeString(location.routeId??location.routeDesignator??s.routeId),point(location)||point(s));
  if(!crossingId)return null;
  const status=text(s.status?.name??s.status?.status??s.status??'');
  if(/offline|out.of.service|inactive|blank|disabled|fault/i.test(status))return null;
  const phrases=[];
  function scan(x,depth=0){
    if(depth>6||x==null)return;
    if(typeof x==='string'){const z=text(x);if(z)phrases.push(z);return;}
    if(Array.isArray(x)){x.forEach(v=>scan(v,depth+1));return;}
    if(typeof x==='object')for(const [k,v] of Object.entries(x)){
      if(/^(phase|phases|phaseText|message|messages|messageText|messagePhases|text|textLines|lines|line\d+|displayText|content)$/i.test(k))scan(v,depth+1);
    }
  }
  scan(s.messages||s.message||s.phases||s.messagePhases||s.currentMessage||s.displayMessage);
  const message=[...new Set(phrases)].join(' / ').slice(0,300);
  if(!message)return null;
  return {id:text(s.id??s.signId??''),crossingId,message,status};
}
function summaries(events,signs){
  const output=Object.fromEntries(Object.keys(CROSSINGS).map(id=>[id,{incidentCount:0,events:[],signCount:0,signs:[],penaltyPoints:0}]));
  for(const item of events){const g=output[item.crossingId];if(!g)continue;g.incidentCount++;g.penaltyPoints+=item.penaltyPoints||0;if(g.events.length<8)g.events.push(item);}
  for(const item of signs){const g=output[item.crossingId];if(!g)continue;g.signCount++;if(g.signs.length<4)g.signs.push(item);}
  return output;
}
async function storeCommand(command, { env = process.env, fetchImpl = fetch } = {}) {
  if (!stateReady(env)) return { configured: false, result: null };
  return { configured: true, result: await stateCommand(command, { env, fetchImpl, timeoutMs: command[0] === 'GET' ? CACHE_TIMEOUT_MS : REFRESH_TIMEOUT_MS }) };
}
function parseRecord(raw){try{const v=JSON.parse(raw);return v&&Array.isArray(v.items)&&Number.isFinite(Date.parse(v.updatedAt))?v:null;}catch{return null;}}
async function getCached511(options={}){
  const empty={state:'AWAITING_FIRST_POLL',updatedAt:null,events:{updatedAt:null,items:[]},signs:{updatedAt:null,items:[]},crossings:summaries([],[])};
  try{
    const [er,sr]=await Promise.all([storeCommand(['GET',KEY_EVENTS],options),storeCommand(['GET',KEY_SIGNS],options)]);
    if(!er.configured||!sr.configured)return {...empty,state:'NOT_CONFIGURED'};
    const rawEvents=parseRecord(er.result)||empty.events,signs=parseRecord(sr.result)||empty.signs;
    // Reject an entire legacy event cache if it contains malformed dates or
    // the old no-active-reporting pseudo-incidents. This avoids exposing
    // known-bad alerts before the next successful scheduled refresh.
    const events=rawEvents.items.every(e=>
      e&&Number.isFinite(Date.parse(e.updatedAt||''))&&
      !unreportedEvent(e.category,e.code,e.description))?rawEvents:empty.events;
    const stamps=[events.updatedAt,signs.updatedAt].filter(Boolean).sort(),oldest=stamps[0],latest=stamps[stamps.length-1];
    const state=!latest?'AWAITING_FIRST_POLL':
      stamps.length===2&&Date.now()-Date.parse(oldest)<=INTERVAL_MS*2?'LIVE':'STALE';
    return {state,updatedAt:latest||null,events,signs,crossings:summaries(events.items,signs.items)};
  }catch(error){
    // Public diagnostic categories only, never cache URLs, tokens or raw errors.
    const cacheIssue=error?.name==='TimeoutError'||error?.name==='AbortError'?'TIMEOUT':'REQUEST_FAILED';
    return {...empty,state:'CACHE_UNAVAILABLE',cacheIssue};
  }
}
function eventsPage(route,offset=0){
  return EVENTS_URL+'?'+new URLSearchParams({routeDesignator:route,limit:String(EVENTS_PAGE_SIZE),offset:String(offset)});
}
function nextLink(header,expectedRoute=null){
  const match=String(header||'').match(/<([^>]+)>\s*;\s*rel="?next"?/i);
  if(!match)return null;
  const url=new URL(match[1],EVENTS_URL),base=new URL(EVENTS_URL);
  if(url.origin!==base.origin||url.pathname!==base.pathname)throw Error('Unexpected next-page origin');
  if(expectedRoute&&url.searchParams.get('routeDesignator')!==expectedRoute)
    throw Error('511NY pagination route changed');
  return url.toString();
}
async function apiJson(url,auth,fetchImpl){
  const response=await fetchImpl(url,{headers:{Authorization:auth,Accept:'application/json'},signal:AbortSignal.timeout(7500)});
  if(!response.ok)throw Error('511NY upstream status '+response.status);
  const data=await response.json();
  if(!Array.isArray(data))throw Error('511NY upstream unexpected body');
  return {data,link:response.headers?.get?.('link')||''};
}
async function fetchEventsRoute(route,auth,fetchImpl,now,deadline){
  let url=eventsPage(route),items=[],seen=new Set(),rawCount=0;
  for(let i=0;url&&i<MAX_EVENT_PAGES_PER_ROUTE;i++){
    if(Date.now()>deadline||seen.has(url))throw Error('511NY pagination limit');
    seen.add(url);
    const result=await apiJson(url,auth,fetchImpl);
    rawCount+=result.data.length;
    items.push(...result.data.map(e=>normalizeEvent(e,now)).filter(Boolean));
    url=nextLink(result.link,route);
    // A full page lacking Link metadata can mean the server omitted paging
    // headers. Do not declare that page a complete empty incident survey.
    if(!url&&result.data.length>=EVENTS_PAGE_SIZE)throw Error('511NY pagination metadata missing');
  }
  if(url)throw Error('511NY pagination page cap');
  return {items,rawCount};
}
async function fetchEvents(auth,fetchImpl,now=Date.now()){
  const deadline=Date.now()+EVENT_REFRESH_BUDGET_MS;
  const byId=new Map();
  // Restrict concurrency to avoid overwhelming the upstream 511NY feed.
  for(let index=0;index<EVENT_ROUTES.length;index+=3){
    const routes=EVENT_ROUTES.slice(index,index+3);
    const group=await Promise.all(routes.map(route=>fetchEventsRoute(route,auth,fetchImpl,now,deadline)));
    for(const record of group)for(const item of record.items){
      if(item.id)byId.set(item.id,item);
    }
  }
  return [...byId.values()];
}
async function fetchSigns(auth,fetchImpl){
  const result=await apiJson(SIGNS_URL,auth,fetchImpl);
  return result.data.map(normalizeSign).filter(Boolean);
}
// Expose only bounded categories for scheduled refresh diagnostics. Do not emit
// URLs, credentials, response bodies, or raw upstream error messages.
function refreshIssue(error){
  const message=String(error?.message||'');
  if(/pagination metadata missing/.test(message))return 'PAGINATION_INCOMPLETE';
  if(/pagination route changed/.test(message))return 'PAGINATION_ROUTE_CHANGED';
  if(/pagination page cap|pagination limit/.test(message))return 'PAGINATION_LIMIT';
  const http=/511NY upstream status (\d{3})/.exec(message);
  if(http)return 'UPSTREAM_HTTP_'+http[1];
  if(/unexpected body/.test(message))return 'UPSTREAM_RESPONSE_INVALID';
  if(/Private tool state failed/.test(message))return 'CACHE_WRITE_FAILED';
  if(error?.name==='TimeoutError'||error?.name==='AbortError')return 'TIMEOUT';
  return 'REQUEST_FAILED';
}
// A separate read-only diagnostic for source health. The public crossing
// runtime never pays for this extra cache read on each visitor request.
async function getPollHealth(options={}){
  try{
    const result=await storeCommand(['GET',KEY_HEALTH],options);
    if(!result.configured)return null;
    const value=JSON.parse(result.result||'null');
    if(!value||!Number.isFinite(Date.parse(value.checkedAt)))return null;
    const status=v=>typeof v==='string'&&/^(UPDATED|PAGINATION_[A-Z_]+|UPSTREAM_HTTP_[0-9]{3}|UPSTREAM_RESPONSE_INVALID|CACHE_WRITE_FAILED|TIMEOUT|REQUEST_FAILED)$/.test(v)?v:'UNKNOWN';
    return {checkedAt:value.checkedAt,eventsStatus:status(value.eventsStatus),
      signsStatus:status(value.signsStatus),eventsCount:Number.isInteger(value.eventsCount)?value.eventsCount:null,
      signsCount:Number.isInteger(value.signsCount)?value.signsCount:null};
  }catch{return null;}
}
async function refresh511({env=process.env,fetchImpl=fetch,now=Date.now()}={}){
  const user=env.NY511_USERNAME,password=env.NY511_PASSWORD;
  if(!user||!password)return {state:'NOT_CONFIGURED',reason:'Missing NY511_USERNAME or NY511_PASSWORD'};
  let lease;
  try{lease=await storeCommand(['SET',KEY_LOCK,String(now),'NX','EX',300],{env,fetchImpl});}
  catch(error){return {state:'CACHE_UNAVAILABLE',reason:error?.name==='TimeoutError'||error?.name==='AbortError'?'CACHE_TIMEOUT':'CACHE_REQUEST_FAILED'};}
  if(!lease.configured)return {state:'NOT_CONFIGURED',reason:'Shared cache not configured'};
  if(lease.result!=='OK')return {state:'ALREADY_POLLED'};
  const auth='Basic '+Buffer.from(user+':'+password,'utf8').toString('base64');
  const results=await Promise.allSettled([
    (async()=>{const items=await fetchEvents(auth,fetchImpl,now);
      const stored=await storeCommand(['SET',KEY_EVENTS,JSON.stringify({updatedAt:new Date().toISOString(),items}),'EX',RETENTION_SECONDS],{env,fetchImpl});
      if(!stored.configured||stored.result!=='OK')throw Error('Private tool state failed');
      return items.length;})(),
    (async()=>{const items=await fetchSigns(auth,fetchImpl);
      const stored=await storeCommand(['SET',KEY_SIGNS,JSON.stringify({updatedAt:new Date().toISOString(),items}),'EX',RETENTION_SECONDS],{env,fetchImpl});
      if(!stored.configured||stored.result!=='OK')throw Error('Private tool state failed');
      return items.length;})()
  ]);
  const report={state:results.every(r=>r.status==='fulfilled')?'UPDATED':results.every(r=>r.status==='rejected')?'STALE_CACHE':'PARTIAL',
    eventsCount:results[0].status==='fulfilled'?results[0].value:null,
    signsCount:results[1].status==='fulfilled'?results[1].value:null,
    eventsStatus:results[0].status==='fulfilled'?'UPDATED':refreshIssue(results[0].reason),
    signsStatus:results[1].status==='fulfilled'?'UPDATED':refreshIssue(results[1].reason),
    updatedAt:new Date().toISOString()};
  // Best-effort diagnostics must not invalidate a successfully cached feed.
  try{
    const health=await storeCommand(['SET',KEY_HEALTH,JSON.stringify({checkedAt:report.updatedAt,
      eventsStatus:report.eventsStatus,signsStatus:report.signsStatus,
      eventsCount:report.eventsCount,signsCount:report.signsCount}),'EX',RETENTION_SECONDS],{env,fetchImpl});
    report.healthStored=health.configured&&health.result==='OK';
  }catch{report.healthStored=false;}
  return report;
}
module.exports={EVENTS_URL,EVENT_ROUTES,SIGNS_URL,CROSSINGS,normalizeEvent,normalizeSign,matchCrossing,summaries,
  getCached511,getPollHealth,refresh511,nextLink,storeCommand,eventsPage};
