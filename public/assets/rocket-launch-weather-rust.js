'use strict';
/* Rust/WebAssembly launch-day sky trend. Reads only the delay scenarios the
 * national API already returned; makes no weather, schedule or map requests.
 * If the module is missing or fails its self-check, the delay planner keeps
 * its original JavaScript presentation and simply omits the trend line.
 */
(function(root){
  if(!root||root.RocketLaunchWeatherRust)return;
  const UNKNOWN_CLOUD=255;
  const OFFSETS=[1,3,6];
  let promise=null;
  const cloud=place=>place&&place.cloudStatus==='ok'&&Number.isInteger(place.cloudCoverPercent)&&
    place.cloudCoverPercent>=0&&place.cloudCoverPercent<=100?place.cloudCoverPercent:UNKNOWN_CLOUD;
  const hazard=place=>place?.assessment?.level==='poor'?1:0;
  async function load(){
    if(promise)return promise;
    promise=(async()=>{
      if(typeof WebAssembly==='undefined'||typeof atob!=='function')return null;
      const response=await fetch('/assets/rocket-launch-weather.wasm.b64',{
        credentials:'same-origin',signal:AbortSignal.timeout(7000)
      });
      if(!response.ok)throw new Error('Launch weather Rust module unavailable');
      const text=(await response.text()).trim();
      if(text.length<100||text.length>30000||!/^[A-Za-z0-9+/]+=*$/.test(text))
        throw new Error('Launch weather Rust module invalid');
      const bytes=Uint8Array.from(atob(text),c=>c.charCodeAt(0));
      const {instance}=await WebAssembly.instantiate(bytes,{});
      const e=instance.exports;
      if(e.lw_engine_version?.()!==1||
        !['lw_meaningful_points','lw_spot_trend','lw_window_trend','lw_slip_verdict','lw_first_window']
          .every(key=>typeof e[key]==='function'))return null;
      // Self-check the threshold and the "missing is never clear" rule so an
      // incompatible module cannot quietly change what the trend line says.
      if(e.lw_meaningful_points()!==20||e.lw_spot_trend(12,32,0,0)!==2||
         e.lw_spot_trend(12,31,0,0)!==3||e.lw_spot_trend(UNKNOWN_CLOUD,0,0,0)!==0||
         e.lw_window_trend(2,2)!==2||e.lw_slip_verdict(0,0,0)!==0)return null;
      return Object.freeze({
        engine:'rust-wasm',
        // scenarios: weather.slip.scenarios from /api/rocket-launch-usa.
        trend(scenarios){
          const list=Array.isArray(scenarios)?scenarios:[];
          const base=list.find(s=>s?.offsetHours===0);
          if(!base||base.status==='outside-horizon'||(base.places||[]).length!==2)return null;
          const windows={};
          for(const offset of OFFSETS){
            const later=list.find(s=>s?.offsetHours===offset);
            if(!later||later.status==='outside-horizon'||(later.places||[]).length!==2){
              windows[offset]={code:0,spots:[]};continue;
            }
            const spots=base.places.map((place,i)=>{
              const next=later.places.find(p=>p?.id===place?.id)||later.places[i];
              return {id:place?.id,name:place?.name,
                from:cloud(place),to:cloud(next),hazard:hazard(next)===1&&hazard(place)===0,
                code:e.lw_spot_trend(cloud(place),cloud(next),hazard(place),hazard(next))};
            });
            windows[offset]={code:e.lw_window_trend(spots[0].code,spots[1].code),spots};
          }
          const w=OFFSETS.map(o=>windows[o].code);
          const verdict=e.lw_slip_verdict(w[0],w[1],w[2]);
          return Object.freeze({engine:'rust-wasm',verdict,windows,
            firstOffset:e.lw_first_window(w[0],w[1],w[2],verdict),
            unknownWindows:w.filter(x=>x===0).length});
        }
      });
    })().catch(()=>null);
    return promise;
  }
  root.RocketLaunchWeatherRust=Object.freeze({load,UNKNOWN_CLOUD});
})(window);
