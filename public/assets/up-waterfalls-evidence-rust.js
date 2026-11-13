'use strict';
/* Actual Rust/WebAssembly engine for evidence-source point classification and
   regional day-sheet authorization. The 640 published source observations and
   all land-manager text remain editable, inspectable JSON/HTML, not compiled.
   This engine never emits parking coordinates or a travel route.
 */
(function(root){
  if(!root || root.UPWaterfallEvidenceRust)return;
  let modulePromise=null,atlasActive=null,regionActive=null;
  const KINDS={guide:1,gis:2,name:3,tourism:4};
  const STATUS={verify:0,seasonal:1,restricted:2,closed:3,research:4};
  const PRESET={'keweenaw-parks':1,'keweenaw-gorge':2,'black-river-one':3,'black-river-corridor':4};
  const role=r=>({
    'natural-waterfall-feature-not-arrival':1,
    'state-natural-feature-point-not-parking-or-trailhead':2,
    'multi-falls-day-use-reference-not-natural-waterfall-feature':3,
    'no-geographic-point':4,
    'tourism-index-no-geographic-point-or-arrival':4
  })[r.mapRole]||0;
  const coordinates=r=>r.lat===null&&r.lng===null?0:
    Number.isFinite(r.lat)&&Number.isFinite(r.lng)?1:2;
  async function wasm(){
    if(modulePromise)return modulePromise;
    modulePromise=(async()=>{
      if(typeof WebAssembly==='undefined'||typeof atob!=='function')return null;
      const response=await fetch('/assets/up-waterfalls-atlas-regional.wasm.b64',{
        credentials:'same-origin',signal:AbortSignal.timeout(7000)
      });
      if(!response.ok)throw Error('Waterfall evidence WASM unavailable');
      const base64=(await response.text()).trim();
      if(base64.length<150||base64.length>50000||!/^[a-zA-Z0-9+/]+=*$/.test(base64))
        throw Error('Invalid waterfall evidence WASM');
      const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
      if(bytes[0]!==0||bytes[1]!==97||bytes[2]!==115||bytes[3]!==109)
        throw Error('Not WebAssembly');
      const e=(await WebAssembly.instantiate(bytes,{})).instance.exports;
      if(e.wa_version?.()!==3 || !['wa_record_safe','wa_plot','wa_stop','wa_plan']
        .every(n=>typeof e[n]==='function'))throw Error('Unknown waterfall evidence ABI');
      return e;
    })().catch(()=>null);
    return modulePromise;
  }
  const jsRecordSafe=r=>{
    if(!KINDS[r.kind]||(r.priorityAccess&&r.kind!=='tourism'))return false;
    if(r.kind==='guide')return (role(r)===1&&coordinates(r)===1)||(role(r)===3&&coordinates(r)===0);
    if(r.kind==='gis')return role(r)===2&&coordinates(r)===1;
    return role(r)===4&&coordinates(r)===0;
  };
  const jsPlot=(r,shadowed,guideOnly)=>{
    if(!jsRecordSafe(r))return false;
    return r.kind==='gis'||r.kind==='guide'&&role(r)===1&&(guideOnly||!shadowed);
  };
  async function loadAtlas(records){
    if(atlasActive)return atlasActive;
    if(!Array.isArray(records)||records.length!==640)return null;
    const e=await wasm();if(!e)return null;
    try{
      const ids=new Set();
      for(const r of records){
        if(ids.has(r.id))throw Error('Duplicate evidence record');
        ids.add(r.id);
        const safe=e.wa_record_safe(KINDS[r.kind]||0,role(r),coordinates(r),r.priorityAccess?1:0)===1;
        if(safe!==jsRecordSafe(r)||!safe)throw Error('Evidence atlas safety divergence '+r.id);
        for(const shadow of [0,1])for(const only of [0,1]){
          const plotted=e.wa_plot(KINDS[r.kind],role(r),coordinates(r),shadow,only)===1;
          if(plotted!==jsPlot(r,shadow,only))throw Error('Evidence point parity '+r.id);
        }
      }
      if(e.wa_plot(4,4,1,0,0)!==0 || e.wa_plot(3,4,1,0,0)!==0 ||
        e.wa_plot(1,3,0,0,1)!==0)throw Error('Unmapped records generated a pin');
      atlasActive=Object.freeze({engine:'rust-wasm',canPlot(r,visibleGis,filterKind){
        const shadow=(r.linkedGisIds||[]).some(id=>visibleGis.has(id))?1:0;
        return e.wa_plot(KINDS[r.kind]||0,role(r),coordinates(r),shadow,filterKind==='guide'?1:0)===1;
      }});
      return atlasActive;
    }catch{return null;}
  }
  function regionCode(e,key,cards,selected,date,datePolicy,presets,restricted){
    const preset=PRESET[key]||0,ids=presets[key];
    if(!ids)return 0;
    const policy=datePolicy(date);
    const chosen=new Set(selected||[]);
    const missing=ids.filter(id=>!chosen.has(id));
    let allValid=1;
    for(const id of ids){
      const c=cards?.get(id);
      const construction=restricted.has(id)?1:0;
      const eligible=c&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)&&
          c.querySelector?.('.save')&&
          e.wa_stop(STATUS[c.dataset.status]??99,c.dataset.arrivalVerified==='verified'?1:0,
            construction,preset)===1;
      if(!eligible)allValid=0;
    }
    return e.wa_plan(preset,policy.valid?(policy.dated?2:1):0,
      policy.dated?Number(date.slice(5,7)):0,chosen.size,missing.length,allValid);
  }
  async function loadRegion(presets,restricted,datePolicy,legacyAssess,cards){
    if(regionActive)return regionActive;
    if(!presets||!restricted||typeof datePolicy!=='function'||
      typeof legacyAssess!=='function'||!cards||cards.size!==80)return null;
    const e=await wasm();if(!e)return null;
    try{
      const fixtures=['','invalid','2026-12-01','2027-03-31','2027-05-20','2027-06-15'];
      for(const key of Object.keys(presets))for(const day of fixtures)for(const chosen of
        [[],['great-conglomerate-falls'],['outside-1','outside-2','outside-3','outside-4','outside-5','outside-6']]){
        const legacy=legacyAssess(key,cards,chosen,day);
        const rust=regionCode(e,key,cards,chosen,day,datePolicy,presets,restricted);
        if((rust===1)!==legacy.ok)throw Error('Regional Rust/source decision mismatch '+key+' '+day);
      }
      if(e.wa_stop(3,1,0,4)!==0 || e.wa_stop(4,1,0,4)!==0 ||
        e.wa_stop(0,0,0,4)!==0 || e.wa_stop(2,1,1,2)!==0 ||
        e.wa_plan(4,2,1,0,4,1)!==4)throw Error('Unsafe regional Rust decision');
      regionActive=Object.freeze({engine:'rust-wasm',decide(key,cards,selected,date){
        return regionCode(e,key,cards,selected,date,datePolicy,presets,restricted);
      }});
      return regionActive;
    }catch{return null;}
  }
  root.UPWaterfallEvidenceRust=Object.freeze({
    loadAtlas,loadRegion,atlas:()=>atlasActive,region:()=>regionActive
  });
})(window);
