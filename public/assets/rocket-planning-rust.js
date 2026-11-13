'use strict';
/* Reproducible Rust/WebAssembly decisions. Source truth remains with the
 * existing national/Florida API; no client schedule, weather or NPS fetches.
 * Failure to load the WASM never blocks the original JS/HTML experience.
 */
(function(root){
  if(!root||root.RocketPlanningRust)return;
  const PRECISION=Object.freeze({minute:1,second:2,hour:3,day:4});
  let promise=null;
  async function load(){
    if(promise)return promise;
    promise=(async()=>{
      if(typeof WebAssembly==='undefined'||typeof atob!=='function')return null;
      const response=await fetch('/assets/rocket-planning-core.wasm.b64',{
        credentials:'same-origin',signal:AbortSignal.timeout(7000)
      });
      if(!response.ok)throw new Error('Planning Rust module unavailable');
      const text=(await response.text()).trim();
      if(text.length<100||text.length>30000||!/^[A-Za-z0-9+/]+=*$/.test(text))
        throw new Error('Planning Rust module invalid');
      const bytes=Uint8Array.from(atob(text),c=>c.charCodeAt(0));
      const {instance}=await WebAssembly.instantiate(bytes,{});
      const e=instance.exports;
      if(e.rp_engine_version?.()!==1||
        !['rp_time_precise','rp_national_window','rp_florida_cutoff_state','rp_access_verified']
          .every(key=>typeof e[key]==='function')||
        e.rp_access_verified()!==0)return null;
      // Validate boundaries so an incompatible module cannot silently change
      // what a published 'Next 10 days' button means.
      if(e.rp_national_window(1,1,-60000)!==1||
         e.rp_national_window(1,1,-60001)!==0||
         e.rp_national_window(1,1,864000000)!==1||
         e.rp_national_window(1,1,864000001)!==0)return null;
      const precisionCode=p=>PRECISION[p]||0;
      return Object.freeze({
        engine:'rust-wasm',
        tenDayVisible(precision,netMs,nowMs){
          const delta=netMs-nowMs;
          return e.rp_national_window(1,precisionCode(precision),delta)===1;
        },
        timePrecise(precision){
          return e.rp_time_precise(precisionCode(precision))===1;
        },
        floridaCutoffState(precision,sourceFresh,reported,cutoffMs,nowMs){
          return e.rp_florida_cutoff_state(precisionCode(precision),
            sourceFresh?1:0,reported?1:0,cutoffMs-nowMs);
        }
      });
    })().catch(()=>null);
    return promise;
  }
  root.RocketPlanningRust=Object.freeze({load});
})(window);
