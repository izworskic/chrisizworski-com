'use strict';
// TMDD 3.0 field mappings from the 511NY_Events_API_Migration_Guide_v4 (Sept 2026).
// Browser code never contacts 511NY. Credentials only in Authorization headers.
const EVENTS_URL='https://nysdot.carsprogram.org/carsapi_v1/api/events?limit=100&offset=0';
const SIGNS_URL='https://nyapi.carsprogram.org/signs.json';
const KEY_EVENTS='nyc:511ny:events:v1',KEY_SIGNS='nyc:511ny:signs:v1',KEY_LOCK='nyc:511ny:refresh-lock:v1';
const INTERVAL_MS=300000,RETENTION_SECONDS=172800,CACHE_TIMEOUT_MS=750;
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
function point(v){
  if(!v||typeof v!=='object')return null;
  const p=v['primary-location']||v.primaryLocation||v.location||v;
  const g=p['geo-location']||p.geoLocation||p;
  const a=num(g.latitude??g.lat),b=num(g.longitude??g.lon??g.lng);
  return a!=null&&b!=null&&Math.abs(a)<=90&&Math.abs(b)<=180?[a,b]:null;
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
  const onRoute=matches.filter(m=>m.routeMatch&&m.dist<=7.5).sort((a,b)=>a.dist-b.dist);
  if(onRoute.length)return onRoute[0].id;
  const near=matches.sort((a,b)=>a.dist-b.dist)[0];
  return near&&near.dist<=2.3?near.id:null;
}
function normalizeEvent(e,now=Date.now()){
  const locations=arr(e.locations||e.location);
  const loc=locations.find(x=>point(x))||locations[0]||{};
  const geo=point(loc)||point(e);
  const route=routeString(loc['route-designator']??loc.routeDesignator??loc.routeId??e.routeId??e.roadwayName);
  const crossingId=matchCrossing(route,geo);
  if(!crossingId)return null;
  const details=e.details||{},headline=e.headline||{};
  const end=Date.parse(details['end-time']||details.endTime||'');
  const start=Date.parse(details['start-time']||details.startTime||'');
  if(Number.isFinite(end)&&end<now||Number.isFinite(start)&&start>now)return null;
  const category=text(headline.category||e.eventType||'Incident');
  const code=text(headline.code||e.eventSubType||'');
  const priority=num(e.priority);
  const isClosure=/clos/i.test(category+' '+code);
  return {id:text(e['event-id']??e.eventId??e.id),crossingId,category,code,
    description:text(e.description||code||category),route:text(route),
    direction:text(loc['link-direction']??loc.linkDirection??''),
    priority,penaltyPoints:isClosure?12:priority!=null&&priority<=2?7:priority!=null&&priority<=4?5:3,
    updatedAt:text(details['update-time']??details.updateTime??'')};
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
async function redis(command,{env=process.env,fetchImpl=fetch}={}){
  const url=env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL,token=env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN;
  if(!url||!token)return {configured:false,result:null};
  const response=await fetchImpl(url,{method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify(command),signal:AbortSignal.timeout(CACHE_TIMEOUT_MS)});
  if(!response.ok)throw Error('Redis read/write failed');
  const json=await response.json();
  if(json.error)throw Error('Redis read/write failed');
  return {configured:true,result:json.result};
}
function parseRecord(raw){try{const v=JSON.parse(raw);return v&&Array.isArray(v.items)&&Number.isFinite(Date.parse(v.updatedAt))?v:null;}catch{return null;}}
async function getCached511(options={}){
  const empty={state:'AWAITING_FIRST_POLL',updatedAt:null,events:{updatedAt:null,items:[]},signs:{updatedAt:null,items:[]},crossings:summaries([],[])};
  try{
    const [er,sr]=await Promise.all([redis(['GET',KEY_EVENTS],options),redis(['GET',KEY_SIGNS],options)]);
    if(!er.configured||!sr.configured)return {...empty,state:'NOT_CONFIGURED'};
    const events=parseRecord(er.result)||empty.events,signs=parseRecord(sr.result)||empty.signs;
    const stamps=[events.updatedAt,signs.updatedAt].filter(Boolean).sort(),oldest=stamps[0],latest=stamps[stamps.length-1];
    const state=!latest?'AWAITING_FIRST_POLL':
      stamps.length===2&&Date.now()-Date.parse(oldest)<=INTERVAL_MS*2?'LIVE':'STALE';
    return {state,updatedAt:latest||null,events,signs,crossings:summaries(events.items,signs.items)};
  }catch{return {...empty,state:'CACHE_UNAVAILABLE'};}
}
function nextLink(header){
  const match=String(header||'').match(/<([^>]+)>\s*;\s*rel="?next"?/i);
  if(!match)return null;
  const url=new URL(match[1],EVENTS_URL),base=new URL(EVENTS_URL);
  if(url.origin!==base.origin||url.pathname!==base.pathname)throw Error('Unexpected next-page origin');
  return url.toString();
}
async function apiJson(url,auth,fetchImpl){
  const response=await fetchImpl(url,{headers:{Authorization:auth,Accept:'application/json'},signal:AbortSignal.timeout(7500)});
  if(!response.ok)throw Error('511NY upstream status '+response.status);
  const data=await response.json();
  if(!Array.isArray(data))throw Error('511NY upstream unexpected body');
  return {data,link:response.headers?.get?.('link')||''};
}
async function fetchEvents(auth,fetchImpl){
  let url=EVENTS_URL,items=[],seen=new Set(),start=Date.now();
  for(let i=0;url&&i<80;i++){
    if(Date.now()-start>42000||seen.has(url))throw Error('511NY pagination limit');
    seen.add(url);
    const result=await apiJson(url,auth,fetchImpl);
    items.push(...result.data.map(e=>normalizeEvent(e)).filter(Boolean));
    url=nextLink(result.link);
  }
  if(url)throw Error('511NY pagination page cap');
  return items;
}
async function fetchSigns(auth,fetchImpl){
  const result=await apiJson(SIGNS_URL,auth,fetchImpl);
  return result.data.map(normalizeSign).filter(Boolean);
}
async function refresh511({env=process.env,fetchImpl=fetch,now=Date.now()}={}){
  const user=env.NY511_USERNAME,password=env.NY511_PASSWORD;
  if(!user||!password)return {state:'NOT_CONFIGURED',reason:'Missing NY511_USERNAME or NY511_PASSWORD'};
  let lease;
  try{lease=await redis(['SET',KEY_LOCK,String(now),'NX','EX',300],{env,fetchImpl});}
  catch{return {state:'CACHE_UNAVAILABLE',reason:'Shared cache required for 5-minute rate limit'};}
  if(!lease.configured)return {state:'NOT_CONFIGURED',reason:'Shared cache not configured'};
  if(lease.result!=='OK')return {state:'ALREADY_POLLED'};
  const auth='Basic '+Buffer.from(user+':'+password,'utf8').toString('base64');
  const results=await Promise.allSettled([
    (async()=>{const items=await fetchEvents(auth,fetchImpl);await redis(['SET',KEY_EVENTS,JSON.stringify({updatedAt:new Date().toISOString(),items}),'EX',RETENTION_SECONDS],{env,fetchImpl});return items.length;})(),
    (async()=>{const items=await fetchSigns(auth,fetchImpl);await redis(['SET',KEY_SIGNS,JSON.stringify({updatedAt:new Date().toISOString(),items}),'EX',RETENTION_SECONDS],{env,fetchImpl});return items.length;})()
  ]);
  return {state:results.every(r=>r.status==='fulfilled')?'UPDATED':results.every(r=>r.status==='rejected')?'STALE_CACHE':'PARTIAL',
    eventsCount:results[0].status==='fulfilled'?results[0].value:null,
    signsCount:results[1].status==='fulfilled'?results[1].value:null,
    updatedAt:new Date().toISOString()};
}
module.exports={EVENTS_URL,SIGNS_URL,CROSSINGS,normalizeEvent,normalizeSign,matchCrossing,summaries,
  getCached511,refresh511,nextLink,redis};
