const NOMINATIM='https://nominatim.openstreetmap.org/search';
const ROUTERS=[
  {base:'https://routing.openstreetmap.de/routed-car/table/v1/driving',label:'routing.openstreetmap.de',timeoutMs:5000},
  {base:'https://router.project-osrm.org/table/v1/driving',label:'router.project-osrm.org',timeoutMs:4500}
];
const PORTS=[
  {name:'Mackinaw City',lat:45.7796,lon:-84.7272},
  {name:'St. Ignace',lat:45.8672,lon:-84.7260}
];
const UA='MackinacIslandLive/1.0 (+https://chrisizworski.com/mackinac-island/)';

function cleanQuery(value){return String(value||'').trim().replace(/\s+/g,' ').slice(0,100);}
function compactLabel(row){
  const a=row?.address||{};
  const place=a.city||a.town||a.village||a.hamlet||a.municipality||a.county||row?.name||'Starting point';
  const region=a.state||a.province||a.region||'';
  const country=a.country_code?String(a.country_code).toUpperCase():(a.country||'');
  return [place,region,country].filter(Boolean).filter((v,i,arr)=>arr.indexOf(v)===i).join(', ');
}
async function fetchJson(url,timeoutMs){
  const c=new AbortController();const t=setTimeout(()=>c.abort(),timeoutMs);
  try{
    const r=await fetch(url,{headers:{accept:'application/json','user-agent':UA},signal:c.signal});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }finally{clearTimeout(t);}
}
async function geocode(q){
  const params=new URLSearchParams({q,format:'jsonv2',limit:'5',addressdetails:'1',countrycodes:'us,ca',dedupe:'1'});
  const rows=await fetchJson(`${NOMINATIM}?${params}`,5000);
  if(!Array.isArray(rows)||!rows.length)throw new Error('No matching city found');
  const preferred=rows.find(x=>['place','boundary'].includes(String(x.class||'')))||rows[0];
  const lat=Number(preferred.lat),lon=Number(preferred.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error('Geocoder returned an invalid location');
  return {label:compactLabel(preferred),lat,lon};
}
async function routeMatrix(origin,host){
  const coords=[[origin.lon,origin.lat],...PORTS.map(p=>[p.lon,p.lat])].map(x=>x.join(',')).join(';');
  const params=new URLSearchParams({sources:'0',destinations:'1;2',annotations:'duration,distance'});
  const data=await fetchJson(`${host.base}/${coords}?${params}`,host.timeoutMs);
  const durations=data?.durations?.[0],distances=data?.distances?.[0];
  if(!Array.isArray(durations)||durations.length<2)throw new Error('Router did not return both port durations');
  return PORTS.map((p,i)=>({
    port:p.name,
    drive_minutes:Number.isFinite(Number(durations[i]))?Math.round(Number(durations[i])/60):null,
    drive_miles:Array.isArray(distances)&&Number.isFinite(Number(distances[i]))?Math.round(Number(distances[i])/1609.344*10)/10:null
  }));
}
async function routePorts(origin){
  let last=null;
  for(const host of ROUTERS){
    try{
      const routes=await routeMatrix(origin,host);
      const usable=routes.filter(r=>Number.isFinite(r.drive_minutes));
      if(usable.length!==2)throw new Error('Incomplete routing result');
      usable.sort((a,b)=>a.drive_minutes-b.drive_minutes);
      return {routes,preferred:usable[0],router:host.label};
    }catch(e){last=e;}
  }
  throw new Error(`Drive-time routing unavailable: ${String(last?.message||last||'no router answered')}`);
}
module.exports=async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return res.status(405).json({error:'Method not allowed'});}
  const q=cleanQuery(req.query?.q);
  if(q.length<2){res.setHeader('Cache-Control','no-store');return res.status(400).json({error:'Enter a city, state/province, or ZIP/postal code'});}
  try{
    const origin=await geocode(q);
    const routed=await routePorts(origin);
    res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({
      query:q,
      origin,
      preferred_port:routed.preferred.port,
      drive_minutes:routed.preferred.drive_minutes,
      drive_miles:routed.preferred.drive_miles,
      routes:routed.routes,
      source:`OpenStreetMap geocoding + OSRM routing via ${routed.router}`,
      boundary:'Drive times are planning estimates, not live traffic. Ferry parking and dock check-in time are added separately.'
    });
  }catch(e){
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'Could not resolve that starting city',detail:String(e?.message||e)});
  }
};
module.exports._test={cleanQuery,compactLabel,PORTS};
