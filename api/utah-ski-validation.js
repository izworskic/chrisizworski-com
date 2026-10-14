'use strict';
// Protected preview-only integration smoke test. Never expose upstream credentials.
const {diagnostic}=require('../lib/utah-ski/udot-fetch');
let state=null,flight=null;
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
  if(process.env.VERCEL_ENV!=='preview')return res.status(404).json({error:'NOT_FOUND'});
  // Never export or log the URL, token, raw upstream body or internal fetch errors.
  const now=Date.now();
  if(state&&now-state.ms<5*60*1000)return res.status(200).json({...state.response,cached:true});
  if(!flight)flight=diagnostic({key:process.env.UDOT_API_KEY,timeoutMs:6500})
    .then(data=>{
      const response={source:'UDOT 511 developer API',sourceUrl:'https://udottraffic.utah.gov/developers/doc',
        observedAt:new Date().toISOString(),apiCoverage:data.health,
        canyons:Object.fromEntries(Object.entries(data.canyons).map(([route,c])=>[route,{
          canyon:c.canyon,status:c.status,reason:c.reason,openConfirmed:false,
          coverage:c.coverage,signalTypes:c.signals.map(s=>({feed:s.type,kind:s.kind,fresh:s.fresh})).slice(0,35),
          matchedSignalCount:c.signals.length,officialSource:c.officialSource}]))};
      state={ms:Date.now(),response};return response;
    }).finally(()=>{flight=null;});
  const response=await flight;
  return res.status(200).json(response);
};
