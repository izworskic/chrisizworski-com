'use strict';
const {regionIds,sourceUrl,assess,combine}=require('../lib/seaway-ais');
const ERROR_STATES=new Set(['rate-limited','upstream-error','timeout','network-error','invalid-response']);
function classify(error){
  if(error?.name==='TimeoutError'||error?.name==='AbortError')return 'timeout';
  if(error?.httpStatus===429)return 'rate-limited';
  if(Number(error?.httpStatus)>=400)return 'upstream-error';
  if(error?.invalidResponse)return 'invalid-response';
  return 'network-error';
}
module.exports=async function handler(req,res){
  const started=Date.now();
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
    const stamp=Date.now();
    try{
      const headers={Accept:'application/geo+json,application/json','User-Agent':'SeawayShipWatch/1.1 (+https://chrisizworski.com/st-lawrence-seaway/)'};
      if(process.env.OPEN_WATERS_API_TOKEN)headers.Authorization='Bearer '+process.env.OPEN_WATERS_API_TOKEN;
      const r=await fetch(sourceUrl(id),{headers,signal:AbortSignal.timeout(8500)});
      if(!r.ok){const e=new Error('upstream HTTP failure');e.httpStatus=r.status;throw e;}
      let raw;
      try{raw=await r.json();}catch(_){const e=new Error('AIS JSON invalid');e.invalidResponse=true;throw e;}
      let result;
      try{result=assess(raw,id);}catch(_){const e=new Error('AIS schema invalid');e.invalidResponse=true;throw e;}
      return {...result,elapsedMs:Date.now()-stamp};
    }catch(error){
      const reason=classify(error);
      return {id,state:'unavailable',reason:ERROR_STATES.has(reason)?reason:'network-error',httpStatus:Number(error?.httpStatus)||null,elapsedMs:Date.now()-stamp,checkedAt:new Date().toISOString(),vessels:[],truncated:false};
    }
  }));
  const data=combine(results);
  const summary={event:'seaway_ais_check',scope:value,regions:results.map(r=>({id:r.id,state:r.state,reason:r.reason||null,status:r.httpStatus||null,count:r.vessels?.length||0,ms:r.elapsedMs||null})),outcome:data.state,ms:Date.now()-started};
  if(results.some(r=>r.state==='unavailable'))console.error(JSON.stringify(summary));
  else if(process.env.SEAWAY_AIS_VERBOSE_LOGS==='1')console.info(JSON.stringify(summary));
  // Avoid caching full failures. Partial results expire faster than a complete check.
  res.setHeader('Cache-Control',!data.ok?'no-store':data.state==='partial'?'public, s-maxage=30, stale-while-revalidate=30':'public, s-maxage=90, stale-while-revalidate=90');
  return res.status(data.ok?200:502).json(data);
};
