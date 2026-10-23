'use strict';
const {AIS_URL,assess,PROVIDER}=require('../lib/john-day-ais');
module.exports=async function handler(req,res){
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Access-Control-Allow-Origin','https://chrisizworski.com');
 if(req.method&&req.method!=='GET'){
  res.setHeader('Allow','GET');
  res.setHeader('Cache-Control','no-store');
  return res.status(405).json({ok:false,observationState:'invalid',error:'GET required'});
 }
 const checkedAt=new Date().toISOString();
 try{
  const headers={Accept:'application/geo+json, application/json',
   'User-Agent':'JohnDayLockExplorer/1.0 (+https://chrisizworski.com/john-day-lock/)'};
  if(process.env.OPEN_WATERS_API_TOKEN)headers.Authorization='Bearer '+process.env.OPEN_WATERS_API_TOKEN;
  const r=await fetch(AIS_URL,{headers,signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('Provider unavailable');
  const observed=assess(await r.json(),Date.now());
  // User-initiated read only; CDN requests capped to avoid per-visitor provider load.
  res.setHeader('Cache-Control','public,s-maxage=90,stale-while-revalidate=90');
  return res.status(200).json(observed);
 }catch(_){
  res.setHeader('Cache-Control','no-store');
  return res.status(502).json({
    ok:false,observationState:'unavailable',coverageState:'unverified',
    lockStatus:'unknown',lockQueue:'unknown',checkedAt,provider:PROVIDER,
    error:'Recent public AIS reports cannot be checked. This is not a claim of no vessels or an open lock.'
  });
 }
};
