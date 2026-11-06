'use strict';
const {verifyGitHubActionsToken}=require('../lib/space-coast-ksc-watch-auth');
const {validateSnapshot,saveSnapshot,readSnapshot,REGIONS}=require('../lib/rocket-official-notices');
const {stateReady}=require('../lib/tool-state');
const {readNationalSchedule}=require('../lib/rocket-launch-national');
const AUDIENCE='https://chrisizworski.com/api/rocket-official-notices';
const WORKFLOW='izworskic/chrisizworski-com/.github/workflows/rocket-official-notices.yml@refs/heads/main';
async function authorize(header,verify=verifyGitHubActionsToken){
 if(typeof header!=='string'||!header.startsWith('Bearer '))return false;
 const token=header.slice(7);
 if(token.length<10||token.length>16000)return false;
 return verify(token,{identity:{audience:AUDIENCE,workflowRef:WORKFLOW}});
}
function createHandler({authorized=authorize,save=saveSnapshot,read=readSnapshot,ready=stateReady,clock=Date.now,getNational=readNationalSchedule}={}){
 return async(req,res)=>{
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(req.method==='POST'){
   res.setHeader('Cache-Control','no-store');
   const allowed=await authorized(req.headers?.authorization||'');
   if(!allowed)return res.status(401).json({ok:false,error:'not-authorized'});
   if(!ready())return res.status(503).json({ok:false,error:'official-notice-state-unavailable'});
   if(Number(req.headers?.['content-length']||0)>65000)
    return res.status(413).json({ok:false,error:'payload-too-large'});
   try{
    const raw=typeof req.body==='string'?JSON.parse(req.body):req.body;
    // Validate before accessing private Postgres state.
    validateSnapshot(raw,clock());
    const committed=await save(raw,{now:clock()});
    return res.status(200).json({ok:true,version:1,...committed});
   }catch(err){
    const code=/invalid-|source-|signal-|region-|duplicate-|collection-date|outage-has-claims/.test(err.message)?400:503;
    return res.status(code).json({ok:false,error:code===400?'snapshot-invalid':'snapshot-store-failed'});
   }
  }
  if(req.method&&req.method!=='GET'){
   res.setHeader('Allow','GET, POST');
   return res.status(405).json({ok:false,error:'method-not-allowed'});
  }
  res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=1200');
  // One small sanitized GET of the SAME authenticated Postgres-backed national
  // LL2 snapshot. The scheduled Python job never calls LL2 or regional weather.
  if(req.query?.manifest!==undefined){
   if(req.query.manifest!=='1')return res.status(400).json({ok:false,error:'manifest-option-invalid'});
   try{
    const snapshot=await getNational(clock());
    const fresh=snapshot?.freshness==='recent'&&Array.isArray(snapshot.launches);
    return res.status(200).json({ok:true,version:1,health:fresh?'recent':'unavailable',
     source:'shared-postgres-ll2-national-v2',checkedAt:fresh?snapshot.checkedAt:null,
     complete:fresh&&snapshot.complete===true,
     missions:fresh?snapshot.launches.slice(0,220).map(m=>({
      id:m.id,region:m.region,name:String(m.name||'').slice(0,180),
      net:m.net,netPrecision:m.netPrecision,sourceStale:m.sourceStale===true
     })):[]});
   }catch{return res.status(200).json({ok:true,version:1,health:'unavailable',
    checkedAt:null,missions:[],source:'shared-postgres-ll2-national-v2'});}
  }
  try{
   const result=await read({now:clock()});
   const region=req.query?.region;
   if(region!==undefined){
    if(typeof region!=='string'||!REGIONS.includes(region))return res.status(400).json({ok:false,error:'invalid-region'});
    return res.status(200).json({...result,regions:{[region]:result.regions[region]||[]}});
   }
   return res.status(200).json(result);
  }catch{
   return res.status(200).json({ok:true,version:1,health:'unavailable',checkedAt:null,regions:{}});
  }
 };
}
module.exports=createHandler();
module.exports._test={AUDIENCE,WORKFLOW,authorize,createHandler};
