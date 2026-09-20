/*
 * Narrow drive-time helper for Michigan Snowmobile Conditions.
 * The destination is fixed at Grayling, so this is not an open routing proxy.
 * Routing failures are explicit and never become guessed drive times.
 */
const DESTINATION={lat:44.6614,lon:-84.7148,label:'Grayling, Michigan'};
const HOSTS=[
  {base:'https://routing.openstreetmap.de/routed-car/route/v1/driving',label:'routing.openstreetmap.de',timeoutMs:4500},
  {base:'https://router.project-osrm.org/route/v1/driving',label:'router.project-osrm.org',timeoutMs:3500}
];
function parsePoint(value){
  const p=String(value||'').split(',');if(p.length!==2)return null;
  const lat=Number(p[0]),lon=Number(p[1]);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180)return null;
  return {lat:Number(lat.toFixed(5)),lon:Number(lon.toFixed(5))};
}
async function route(host,origin){
  const coords=`${origin.lon},${origin.lat};${DESTINATION.lon},${DESTINATION.lat}`;
  const url=`${host.base}/${coords}?overview=false&steps=false&alternatives=false`;
  const r=await fetch(url,{headers:{accept:'application/json','user-agent':'ChrisIzworskiSnowmobileConditions/1.0 (+https://chrisizworski.com/snowmobile/)'},signal:AbortSignal.timeout(host.timeoutMs)});
  if(!r.ok)throw new Error(`${host.label} returned ${r.status}`);
  const j=await r.json();const best=j?.routes?.[0];
  if(j?.code&&j.code!=='Ok')throw new Error(j.message||`${host.label} said ${j.code}`);
  if(!Number.isFinite(Number(best?.duration))||!Number.isFinite(Number(best?.distance)))throw new Error(`${host.label} returned no usable route`);
  return {seconds:Number(best.duration),meters:Number(best.distance),host:host.label};
}
module.exports=async function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return res.status(405).json({error:'Method not allowed'});}
  const origin=parsePoint(req.query?.from);
  if(!origin){res.setHeader('Cache-Control','no-store');return res.status(400).json({error:'Provide from=lat,lon'});}
  let last=null;
  for(const host of HOSTS){
    try{
      const r=await route(host,origin);
      res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=86400');
      return res.status(200).json({
        destination:DESTINATION,origin,
        driveMinutes:Math.round(r.seconds/60),driveMiles:Math.round((r.meters/1609.344)*10)/10,
        source:`OSRM routing via ${r.host}`,attribution:'Routing © OpenStreetMap contributors',
        boundary:'Drive time ends at Grayling. Local staging, unloading and trailhead travel are additional.'
      });
    }catch(error){last=error;}
  }
  res.setHeader('Cache-Control','no-store');return res.status(502).json({error:'Drive-time routing unavailable',detail:String(last?.message||last||'No router answered')});
};
module.exports._test={DESTINATION,HOSTS,parsePoint};
