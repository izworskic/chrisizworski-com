'use strict';
/**
 * Tiny, shared progressive-enhancement adapter for region-specific Rust/WASM.
 * The source of truth for places remains the existing reviewed places.json.
 * Failure to fetch, validate, or instantiate must never hide the static guide,
 * break Leaflet, or change official mission/access decisions.
 */
(function(root){
  if(!root||root.RocketRustViewing)return;
  const CATALOG=Object.freeze({
    wallops:{region:1,ids:['nasa-visitor','reed','harbor'],
      profiles:{first:0,backup:1,science:2,photo:3}},
    starbase:{region:2,ids:['isla-blanca','zapata','lighthouse'],
      profiles:{'first-time':0,'no-causeway':1,history:2}}
  });
  let wasmPromise=null;
  async function module(){
    if(wasmPromise)return wasmPromise;
    wasmPromise=(async()=>{
      if(typeof WebAssembly==='undefined'||typeof atob!=='function')return null;
      const response=await fetch('/assets/rocket-rust-viewing-network.wasm.b64',{
        credentials:'same-origin',signal:AbortSignal.timeout(7000)
      });
      if(!response.ok)throw new Error('Rust module unavailable');
      const body=(await response.text()).trim();
      if(body.length<100||body.length>30000||!/^[A-Za-z0-9+/]+=*$/.test(body))
        throw new Error('Invalid Rust module');
      const bytes=Uint8Array.from(atob(body),c=>c.charCodeAt(0));
      const {instance}=await WebAssembly.instantiate(bytes,{});
      const e=instance.exports;
      if(e.rv_engine_version?.()!==1||e.rv_region_count?.()!==2||
        !['rv_site_count','rv_profile_count','rv_rank','rv_access_verified']
          .every(key=>typeof e[key]==='function'))
        throw new Error('Rust version or ABI mismatch');
      return e;
    })().catch(()=>null);
    return wasmPromise;
  }
  async function load(which,manifestIds){
    const spec=CATALOG[which];
    if(!spec||!Array.isArray(manifestIds)||
      manifestIds.length!==spec.ids.length||
      !manifestIds.every((id,i)=>id===spec.ids[i]))return null;
    const e=await module();
    if(!e||e.rv_site_count(spec.region)!==spec.ids.length||
      e.rv_profile_count(spec.region)!==Object.keys(spec.profiles).length)return null;
    // The Rust scoring ABI has no data source capable of proving access.
    for(let i=0;i<spec.ids.length;i++)
      if(e.rv_access_verified(spec.region,i)!==0)return null;
    function order(profile){
      const code=spec.profiles[profile];
      if(!Number.isInteger(code))return null;
      const choices=spec.ids.map((id,index)=>({
        id,score:e.rv_rank(spec.region,code,index)
      }));
      if(choices.some(x=>x.score<0)||new Set(choices.map(x=>x.score)).size!==choices.length)
        return null;
      return choices.sort((a,b)=>b.score-a.score).map(x=>x.id);
    }
    // Before activating, verify all published profiles produce complete lists.
    if(!Object.keys(spec.profiles).every(p=>order(p)?.length===spec.ids.length))return null;
    return Object.freeze({order,engine:'rust-wasm',region:which});
  }
  root.RocketRustViewing=Object.freeze({load});
})(window);
