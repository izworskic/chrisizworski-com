'use strict';
const {live}=require('../lib/utah-ski/road-service');
// Single public endpoint and cache key. No parameters, raw feeds, secrets or per-user data.
module.exports=async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(req.method!=='GET'){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Allow','GET');
  return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 }
 if((req.url||'').includes('?')){
  res.setHeader('Cache-Control','no-store');
  return res.status(400).json({error:'UNSUPPORTED_PARAMETERS'});
 }
 const result=await live.get(process.env.UDOT_API_KEY);
 // Regional shared cache, included with Vercel; 10min TTL helps stay far
 // below the upstream 10/60s allowance in ordinary traffic. This is NOT a
 // distributed global token bucket: rare simultaneous multi-region misses
 // still need monitoring. Failures and 429 always report UNKNOWN.
 const ttl=result.sourceHealth==='COMPLETE'?600:120;
 res.setHeader('Cache-Control','public, max-age=30');
 res.setHeader('CDN-Cache-Control','public, s-maxage='+ttl+', stale-while-revalidate=45');
 res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage='+ttl+', stale-while-revalidate=45');
 return res.status(200).json(result);
};
