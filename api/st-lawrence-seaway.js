'use strict';
const {regionIds,sourceUrl,assess,combine}=require('../lib/seaway-ais');
const ERROR_STATES=new Set(['rate-limited','upstream-error','timeout','network-error','invalid-response']);
// Warm-instance per-region single-flight prevents broad and regional UI checks
// from multiplying provider traffic. Never cache indefinitely or fabricate ships.
const SOURCE_OK_TTL_MS=12000;
const SOURCE_ERROR_TTL_MS=2000;
const sourceCache=new Map();
function classify(error){
  if(error?.name==='TimeoutError'||error?.name==='AbortError')return 'timeout';
  if(error?.httpStatus===429)return 'rate-limited';
  if(Number(error?.httpStatus)>=400)return 'upstream-error';
  if(error?.invalidResponse)return 'invalid-response';
  return 'network-error';
}
async function readRegionSource(id){
  const now=Date.now(),fetcher=global.fetch;
  const cached=sourceCache.get(id);
  // Fetch identity isolates test mocks and lets a replaced transport retry.
  if(cached&&cached.fetcher===fetcher&&cached.expiresAt>now)
    return {...await cached.promise,reused:true};
  const entry={fetcher,expiresAt:now+9000,promise:null};
  entry.promise=(async()=>{
    const start=Date.now();
    try{
      const headers={Accept:'application/geo+json,application/json','User-Agent':'SeawayShipWatch/1.1 (+https://chrisizworski.com/st-lawrence-seaway/)'};
      if(process.env.OPEN_WATERS_API_TOKEN)headers.Authorization='Bearer '+process.env.OPEN_WATERS_API_TOKEN;
      const upstream=await fetcher(sourceUrl(id),{headers,signal:AbortSignal.timeout(8500)});
      if(!upstream.ok){const error=new Error('AIS upstream HTTP failure');error.httpStatus=upstream.status;throw error;}
      let raw;
      try{raw=await upstream.json();}catch(_){const error=new Error('AIS JSON invalid');error.invalidResponse=true;throw error;}
      try{assess(raw,id,Date.now());}catch(_){const error=new Error('AIS schema invalid');error.invalidResponse=true;throw error;}
      return {ok:true,raw,sourceCheckedAt:new Date().toISOString(),elapsedMs:Date.now()-start};
    }catch(error){
      const reason=classify(error);
      return {ok:false,reason:ERROR_STATES.has(reason)?reason:'network-error',httpStatus:Number(error?.httpStatus)||null,sourceCheckedAt:new Date().toISOString(),elapsedMs:Date.now()-start};
    }
  })();
  sourceCache.set(id,entry);
  const result=await entry.promise;
  if(sourceCache.get(id)===entry)entry.expiresAt=Date.now()+(result.ok?SOURCE_OK_TTL_MS:SOURCE_ERROR_TTL_MS);
  return {...result,reused:false};
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
    const source=await readRegionSource(id);
    if(!source.ok)return {
      id,state:'unavailable',reason:source.reason,httpStatus:source.httpStatus,
      elapsedMs:source.elapsedMs,checkedAt:source.sourceCheckedAt,vessels:[],truncated:false
    };
    // Re-normalize at response time so cached reports cannot exceed 30 minutes.
    const result=assess(source.raw,id,Date.now());
    return {...result,checkedAt:source.sourceCheckedAt,elapsedMs:source.elapsedMs,
      sourceCheckAgeSeconds:Math.max(0,Math.floor((Date.now()-Date.parse(source.sourceCheckedAt))/1000))};
  }));
  const data=combine(results);
  const summary={event:'seaway_ais_check',scope:value,regions:results.map(r=>({id:r.id,state:r.state,reason:r.reason||null,status:r.httpStatus||null,count:r.vessels?.length||0,ms:r.elapsedMs||null})),outcome:data.state,ms:Date.now()-started};
  if(results.some(r=>r.state==='unavailable'))console.error(JSON.stringify(summary));
  else if(process.env.SEAWAY_AIS_VERBOSE_LOGS==='1')console.info(JSON.stringify(summary));
  // Avoid caching full failures. Partial results expire faster than a complete check.
  res.setHeader('Cache-Control',!data.ok?'no-store':data.state==='partial'?'public, s-maxage=30, stale-while-revalidate=30':'public, s-maxage=90, stale-while-revalidate=90');
  return res.status(data.ok?200:502).json(data);
};
