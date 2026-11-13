/* On-demand, source-audited DNR snowmobile parking discovery.
 * Never infers a legal trail connection or current lot availability.
 * The existing /api/snowmobile and /api/snowmobile-route remain untouched.
 */
'use strict';
const {sourceUrl,normalizeFeed}=require('../lib/snowmobile/parking.cjs');
let cached=null,cacheUntil=0;
function send(res,code,payload){
  res.status(code);
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control',code===200?'public, s-maxage=1800, stale-while-revalidate=3600':'no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  return res.json(payload);
}
module.exports=async function handler(req,res){
  if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
  if(cached&&cacheUntil>Date.now())return send(res,200,cached);
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9500);
    let response;
    try{response=await fetch(sourceUrl(),{headers:{Accept:'application/geo+json,application/json'},signal:controller.signal});}
    finally{clearTimeout(timer);}
    if(!response.ok)throw Error('Source returned non-success status');
    const json=await response.json();
    const feed=normalizeFeed(json);
    if(!feed.sites.length)throw Error('No verified parking assets in DNR response');
    cached={...feed,sourceCheckedAt:new Date().toISOString(),
      accessStatus:'NOT_VERIFIED',
      note:'DNR field asset record, not current parking availability, plowing, trailer capacity, trail connection, or authorization to ride.'};
    cacheUntil=Date.now()+30*60*1000;
    return send(res,200,cached);
  }catch{
    return send(res,503,{error:'Official DNR parking source unavailable or incomplete',
      note:'No parking locations will be guessed. Check the DNR interactive snowmobile map before traveling.',
      source:'https://www.michigan.gov/dnr/things-to-do/snowmobiling/where'});
  }
};
module.exports._test={clearCache(){cached=null;cacheUntil=0;}};
