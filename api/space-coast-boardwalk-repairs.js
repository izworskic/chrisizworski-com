'use strict';

// Park press coverage is not an inspection or open-gate API. Kept on a
// separate six-hour CDN cache so LL2 launch availability is never delayed.
const {
  NPS_NEWS_ENDPOINT,repairNewsResponse,archivedOnlyResponse
}=require('../lib/space-coast-boardwalk-repairs');
const USER_AGENT='ChrisIzworskiSpaceCoast/1.0 (https://chrisizworski.com/)';
const TIMEOUT_MS=7000;
async function fetchNews(key){
  if(typeof key!=='string'||!key.trim())throw Error('No NPS key configured');
  const response=await fetch(NPS_NEWS_ENDPOINT,{
    headers:{
      'X-Api-Key':key,
      'User-Agent':USER_AGENT,
      'Accept':'application/json'
    },
    signal:AbortSignal.timeout(TIMEOUT_MS)
  });
  if(!response.ok)throw Error('NPS news release endpoint returned non-success status');
  return response.json();
}
module.exports=async function handler(req,res){
  if(req.method&&req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({ok:false,error:'Method not allowed'});
  }
  res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=3600');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  const now=Date.now();
  let result=null;
  if(process.env.NPS_API_KEY){
    try{
      result=repairNewsResponse(await fetchNews(process.env.NPS_API_KEY),now);
    }catch(_err){
      result=archivedOnlyResponse(now,'api-unavailable');
    }
  }else result=archivedOnlyResponse(now,'api-not-configured');
  // Do not expose the key, transport errors, or unsupported facility
  // status assertions. This endpoint never labels a boardwalk "open".
  return res.status(200).json({
    ok:true,generatedAt:new Date(now).toISOString(),
    ...result
  });
};
module.exports._test={fetchNews};
