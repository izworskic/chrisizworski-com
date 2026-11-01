'use strict';
const { ToolState,stateReady }=require('../lib/tool-state');
const { UUID }=require('../lib/space-coast-ksc-snapshot');
const { KEY,publicMission }=require('../lib/space-coast-launch-day');
function createHandler({now=Date.now,getState=async()=>stateReady()?new ToolState().get(KEY):null}={}){
  return async function handler(req,res){
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(req.method&&req.method!=='GET'){
      res.setHeader('Allow','GET');res.setHeader('Cache-Control','no-store');
      return res.status(405).json({ok:false,error:'method-not-allowed'});
    }
    const id=req.query?.launchId;
    if(typeof id!=='string'||!UUID.test(id)){
      res.setHeader('Cache-Control','no-store');
      return res.status(400).json({ok:false,error:'invalid-mission-id'});
    }
    res.setHeader('Cache-Control','public, s-maxage=45, stale-while-revalidate=30');
    try{
      const state=await getState();
      const checkedAt=state?.checkedAt||null;
      const mission=publicMission(state,id,now());
      return res.status(200).json({
        ok:true,selectedLaunchId:id,monitorCheckedAt:checkedAt,
        monitorStatus:!state?'unavailable':mission?.freshness||'mission-not-yet-observed',
        mission:mission||null,
        source:'https://ll.thespacedevs.com/',
        official:'https://www.kennedyspacecenter.com/launches-and-events/',
        caveat:'The schedule monitor is nominally 15-minute, not a real-time launch operations feed. An absent mission does not prove scrub or liftoff.'
      });
    }catch{
      return res.status(200).json({ok:true,selectedLaunchId:id,
        monitorStatus:'unavailable',mission:null,monitorCheckedAt:null,
        source:'https://ll.thespacedevs.com/',
        official:'https://www.kennedyspacecenter.com/launches-and-events/',
        caveat:'The schedule observation store is temporarily unavailable. Confirm the mission time and status with its operator.'});
    }
  };
}
module.exports=createHandler();
module.exports._test={createHandler};
