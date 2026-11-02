'use strict';

// Read-only public mission ledger. No visitor-triggered LL2/SNAPI/RLL calls.
const { UUID }=require('../lib/space-coast-ksc-snapshot');
const { ToolState,stateReady }=require('../lib/tool-state');
const { KEY,publicTruthV2 }=require('../lib/rocket-launch-truth');
const { KEY:NATIONAL_KEY }=require('../lib/rocket-launch-national');

function createHandler({
  now=Date.now,
  getState=async()=>stateReady()?new ToolState().get(KEY):null,
  getNationalState=async()=>stateReady()?new ToolState().get(NATIONAL_KEY):null
}={}){
  return async function handler(req,res){
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(req.method && req.method!=='GET'){
      res.setHeader('Allow','GET');
      res.setHeader('Cache-Control','no-store');
      return res.status(405).json({ok:false,error:'method-not-allowed'});
    }
    const id=req.query?.launchId;
    if(typeof id!=='string'||!UUID.test(id)){
      res.setHeader('Cache-Control','no-store');
      return res.status(400).json({ok:false,error:'invalid-mission-id'});
    }
    res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=60');
    try{
      const [enriched,national]=await Promise.all([
        getState().catch(()=>null),getNationalState().catch(()=>null)
      ]);
      const report=publicTruthV2(enriched,id,null,now(),national);
      return res.status(200).json({
        ok:true,selectedLaunchId:id,...report,
        provenance:'LL2 updates, Spaceflight News API and RocketLaunch.Live next-five, via signed scheduled monitor',
        caveat:'No flight outcome, pad access, webcast status or official launch weather approval is inferred by this ledger.'
      });
    }catch(_){
      return res.status(200).json({
        ok:true,selectedLaunchId:id,...publicTruthV2(null,id,null,now(),null),
        provenance:'Scheduled evidence ledger unavailable',
        caveat:'No external evidence could be read; consult the launch operator. This is not a scrub or cancellation.'
      });
    }
  };
}
module.exports=createHandler();
module.exports._test={createHandler};
