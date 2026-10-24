'use strict';
const {regionIds,sourceUrl,assess,combine}=require('../lib/seaway-ais');
module.exports=async function handler(req,res){
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Access-Control-Allow-Origin','https://chrisizworski.com');
  if(req.method&&req.method!=='GET'){
    res.setHeader('Allow','GET');res.setHeader('Cache-Control','no-store');
    return res.status(405).json({ok:false,state:'invalid',error:'GET required'});
  }
  const value=req.query?.region??'all';
  const ids=typeof value==='string'?regionIds(value):null;
  if(!ids){res.setHeader('Cache-Control','no-store');return res.status(400).json({ok:false,state:'invalid',error:'Choose a supported Seaway region'});}
  const results=await Promise.all(ids.map(async id=>{
    try{
      const headers={Accept:'application/geo+json,application/json','User-Agent':'SeawayShipWatch/1.0 (+https://chrisizworski.com/st-lawrence-seaway/)'};
      if(process.env.OPEN_WATERS_API_TOKEN)headers.Authorization='Bearer '+process.env.OPEN_WATERS_API_TOKEN;
      const r=await fetch(sourceUrl(id),{headers,signal:AbortSignal.timeout(8500)});
      if(!r.ok)throw new Error('AIS upstream unavailable');
      return assess(await r.json(),id);
    }catch(_){return {id,state:'unavailable',checkedAt:new Date().toISOString(),vessels:[],truncated:false};}
  }));
  const data=combine(results);
  res.setHeader('Cache-Control',data.ok?'public, s-maxage=90, stale-while-revalidate=90':'no-store');
  return res.status(data.ok?200:502).json(data);
};
