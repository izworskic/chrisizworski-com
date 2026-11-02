'use strict';
const { ToolState, stateReady } = require('../lib/tool-state');
const { authorizeWeatherWatchRequest } = require('../lib/space-coast-ksc-watch-auth');
const { readWatch } = require('../lib/space-coast-launch-day');
const { KEY, UUID, TTL, ingest, missionForecast, publicHealth } =
  require('../lib/space-coast-official-weather');

function createHandler({
  authorized = authorizeWeatherWatchRequest, ready = stateReady,
  state = new ToolState(), loadSchedule = (_time, store) => readWatch(store), now = Date.now
} = {}) {
  return async function handler(req,res) {
    res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Cache-Control','no-store');
    if(req.method === 'POST') {
      if(!await authorized({authorization:req.headers?.authorization||''}))
        return res.status(401).json({ok:false,error:'unauthorized'});
      if(!ready())return res.status(503).json({ok:false,error:'private-weather-state-unavailable'});
      try {
        const body=req.body;
        if(!body||typeof body!=='object'||Buffer.byteLength(JSON.stringify(body))>32_000)
          return res.status(400).json({ok:false,error:'invalid-weather-observation'});
        const schedule=await loadSchedule(now(),state);
        const last=Date.parse(schedule?.checkedAt||'');
        if(schedule?.version!==1||!Array.isArray(schedule.missions)||
          !Number.isFinite(last)||now()-last>75*60000)
          return res.status(503).json({ok:false,error:'trusted-mission-observation-unavailable'});
        const previous=await state.get(KEY);
        // Fail closed on an outdated collector response to prevent stale
        // observations overwriting a newer verified official PDF.
        const latest=Date.parse(previous?.lastCheckedAt||'');
        if(Number.isFinite(latest)&&latest>now()+60_000)
          return res.status(503).json({ok:false,error:'weather-clock-skew'});
        const outcome=ingest(previous,body,schedule.missions.filter(m=>m.presentInUpcoming),now());
        await state.set(KEY,outcome.state,{ex:TTL});
        return res.status(200).json({ok:true,checkedAt:outcome.state.lastCheckedAt,
          monitorStatus:outcome.state.monitorStatus,accepted:outcome.accepted,
          changes:outcome.changes,rejected:outcome.rejected,
          parsedPovRecords:body.reports.filter(r=>Number.isInteger(r.povPercent)).length});
      } catch (e) {
        console.error('official_weather_monitor_error',String(e.message||e).slice(0,120));
        return res.status(503).json({ok:false,error:'official-weather-observation-rejected'});
      }
    }
    if(req.method && req.method!=='GET'){
      res.setHeader('Allow','GET, POST');
      return res.status(405).json({ok:false,error:'method-not-allowed'});
    }
    const id=req.query?.launchId;
    if(id!=null&&(typeof id!=='string'||!UUID.test(id)))
      return res.status(400).json({ok:false,error:'invalid-launch-id'});
    try {
      if(!ready()){
        return res.status(200).json({ok:true,health:publicHealth(null),forecast:
          id?missionForecast({id},null,now()):null});
      }
      const stateData=await state.get(KEY);
      if(!id){
        res.setHeader('Cache-Control','public, s-maxage=90, stale-while-revalidate=60');
        return res.status(200).json({ok:true,health:publicHealth(stateData,now())});
      }
      const schedule=await loadSchedule(now(),state);
      const mission=schedule?.missions?.find(m=>m.id===id&&m.presentInUpcoming) || null;
      const forecast=missionForecast(mission,stateData,now());
      res.setHeader('Cache-Control','public, s-maxage=90, stale-while-revalidate=60');
      return res.status(200).json({ok:true,selectedLaunchId:id,forecast,
        note:'Mission schedule sourced from LL2. Forecast values sourced only from verified 45WS PDFs.'});
    }catch{return res.status(503).json({ok:false,error:'weather-record-temporarily-unavailable'});}
  };
}
module.exports=createHandler();
module.exports._test={createHandler};
