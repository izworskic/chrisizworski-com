'use strict';
/**
 * Small Rust/WebAssembly adapter for launch range/shoreline public access.
 * This is conservative classification, NEVER an access authorization.
 * All facts are checked against source-linked existing site manifests and
 * official agency evidence. Existing HTML and JS remain usable offline.
 */
(function(root){
  if(!root||root.RocketRangeRust)return;
  const SPECS=Object.freeze({
    kodiak:{region:1,ids:['pasagshak','range']},
    pmrf:{region:2,ids:['pmrf-range','polihale-park']}
  });
  const MODES=['walk','guest','boat'];
  let promise=null;
  async function wasm(){
    if(promise)return promise;
    promise=(async()=>{
      if(typeof WebAssembly==='undefined'||typeof atob!=='function')return null;
      const response=await fetch('/assets/rocket-range-access.wasm.b64',{
        credentials:'same-origin',signal:AbortSignal.timeout(7000)
      });
      if(!response.ok)throw new Error('Rust access module unavailable');
      const b64=(await response.text()).trim();
      if(b64.length<100||b64.length>30000||!/^[A-Za-z0-9+/]+=*$/.test(b64))
        throw new Error('Invalid access module');
      const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
      const {instance}=await WebAssembly.instantiate(bytes,{});
      const e=instance.exports;
      if(e.ra_version?.()!==1||e.ra_region_count?.()!==2||
        !['ra_place_count','ra_place_class','ra_mode_state',
          'ra_state_park_closure','ra_launch_viewing_authorized'].every(
            key=>typeof e[key]==='function'))return null;
      if(e.ra_launch_viewing_authorized(1)!==0||
         e.ra_launch_viewing_authorized(2)!==0||
         e.ra_place_class(1,1)!==2||
         e.ra_place_class(2,0)!==2)return null;
      return e;
    })().catch(()=>null);
    return promise;
  }
  async function load(region,identifiers){
    const spec=SPECS[region];
    if(!spec||!Array.isArray(identifiers)||
       identifiers.length!==spec.ids.length||
       !identifiers.every((id,i)=>id===spec.ids[i]))return null;
    const e=await wasm();
    if(!e||e.ra_place_count(spec.region)!==spec.ids.length)return null;
    const places=identifiers.map((id,i)=>e.ra_place_class(spec.region,i));
    if(places.some(x=>x<=0))return null;
    return Object.freeze({
      engine:'rust-wasm',
      placeClass(id){
        const index=identifiers.indexOf(id);
        return index<0?0:places[index];
      },
      pmrfModeState(mode,policyConfirmed){
        if(region!=='pmrf')return 0;
        const index=MODES.indexOf(mode);
        return index<0?0:e.ra_mode_state(index,policyConfirmed?1:0);
      },
      parkClosure(published){
        return region==='pmrf'?
          e.ra_state_park_closure(published?1:0):0;
      },
      launchViewingAuthorized:()=>false
    });
  }
  root.RocketRangeRust=Object.freeze({load});
})(window);
