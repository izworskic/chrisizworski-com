/* Shared itinerary decisions for existing waterfall planners.
 * Rust/WASM may veto but NEVER promote an unapproved stop. The JS oracle stays
 * independent and functional with blocked/missing WebAssembly.
 * This is geographic discovery + a source-linked CHECKLIST, not road routing.
 */
(function(root){
  'use strict';
  const MAX_STOPS = 6;
  const STATES = Object.freeze({verify:0,seasonal:1,restricted:2,closed:3,research:4});
  const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const HOLD = Object.freeze({
    0:'The itinerary policy is unavailable. No stops were added.',
    2:'Choose a valid calendar date before preparing this outing.',
    3:'Choose a visit date before preparing this longer outing.',
    4:'The extended walk or park drive is held for winter precautions. No route or legal closure is being inferred.',
    5:'Your six-stop day sheet is full. Remove a stop first; nothing was changed.',
    6:'A stop lacks a verified visitor approach. Nothing was saved.'
  });
  let native = null, loading = null;
  const arrival = c => c?.dataset?.arrivalVerified === 'verified' ? 1 : 0;
  const status = c => Object.hasOwn(STATES,c?.dataset?.status) ? STATES[c.dataset.status] : 99;
  const stopOracle = c => status(c) <= 2 && arrival(c) === 1;
  function calendar(value) {
    if (value === '') return {state:1,month:0};
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return {state:0,month:0};
    const [y,m,d] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(y,m-1,d));
    if (y < 1000 || parsed.getUTCFullYear()!==y || parsed.getUTCMonth()!==m-1 || parsed.getUTCDate()!==d)
      return {state:0,month:0};
    return {state:2,month:m};
  }
  function planOracle(saved,missing,verified,dateState,month,season) {
    if (![0,1,2].includes(season) || ![0,1,2].includes(dateState) ||
      ![0,1].includes(verified) || (dateState===2 && (month<1 || month>12)) ||
      (dateState!==2 && month!==0)) return 0;
    if (dateState===0) return 2;
    if (season===1 && dateState!==2) return 3;
    if (dateState===2 && (month===12 || month<=3) && season!==0) return 4;
    if (saved>MAX_STOPS || missing>MAX_STOPS || saved+missing>MAX_STOPS) return 5;
    if (verified!==1) return 6;
    return 1;
  }
  function planCode(...args) {
    const baseline = planOracle(...args);
    if (!native) return baseline;
    let code;
    try {code = native.it_plan(...args);}
    catch {native=null;return 0;}
    if (code!==baseline) {native=null;return 0;} // fail closed on runtime drift
    return code;
  }
  function candidate(card) {
    const baseline = stopOracle(card);
    if (!native) return baseline;
    try {
      if ((native.it_stop(status(card),arrival(card))===1)!==baseline) {native=null;return false;}
      return baseline;
    } catch {native=null;return false;}
  }
  function nearbyEligible(card,distance,radius) {
    const d=Number(distance),r=Number(radius);
    const baseline=stopOracle(card)&&Number.isFinite(d)&&d>=0&&
      [10,25,50].includes(r)&&d<=r;
    if (!native) return baseline;
    try {
      const result=native.it_nearby(status(card),arrival(card),d,r)===1;
      if (result!==baseline) {native=null;return false;}
      return result;
    } catch {native=null;return false;}
  }
  function assess({ids,cards,selected=[],date='',season=0}) {
    if (!Array.isArray(ids) || !cards || typeof cards.get!=='function')
      return {ok:false,missing:[],reason:HOLD[0]};
    const picked=new Set(selected);
    const missing=[...new Set(ids)].filter(id=>!picked.has(id));
    const everyValid=ids.length>0 && ids.every(id=>ID.test(id)&&
      candidate(cards.get(id))&&Boolean(cards.get(id)?.querySelector?.('.save')));
    const {state,month}=calendar(date);
    const code=planCode(picked.size,missing.length,everyValid?1:0,state,month,season);
    return code===1 ? {ok:true,missing,reason:'Use the original guide and agency sources; no route, current opening or drive time was computed.',engine:native?'rust-wasm':'js-parity'}
      : {ok:false,missing:[],reason:HOLD[code]||HOLD[0],engine:native?'rust-wasm':'js-parity'};
  }
  function vetoApproved(baseline,options) {
    if (!baseline?.ok) return baseline;
    const shared=assess(options);
    if (!shared.ok) return {...baseline,ok:false,missing:[],reason:shared.reason,message:shared.reason};
    return {...baseline,itineraryEngine:shared.engine};
  }
  function sheetKind(saved,regionCount) {
    const local=saved<1||saved>MAX_STOPS||regionCount<1||regionCount>saved ? 0 : regionCount>1?2:1;
    if (!native) return local;
    try {
      const actual=native.it_sheet(saved,regionCount);
      if (actual!==local){native=null;return 0;}
      return actual;
    } catch {native=null;return 0;}
  }
  async function activate() {
    if (loading) return loading;
    if (!root || typeof root.fetch!=='function' || typeof root.WebAssembly==='undefined'||
        typeof root.atob!=='function') return null;
    loading=(async()=>{
      const response=await root.fetch('/assets/shared-itinerary.wasm.b64',{credentials:'same-origin'});
      if (!response.ok) return null;
      const b64=(await response.text()).trim();
      if (b64.length<100||b64.length>70000||!/^[a-zA-Z0-9+/]+=*$/.test(b64)) return null;
      const bytes=Uint8Array.from(root.atob(b64),c=>c.charCodeAt(0));
      if (bytes[0]!==0||bytes[1]!==97||bytes[2]!==115||bytes[3]!==109) return null;
      const e=(await root.WebAssembly.instantiate(bytes,{})).instance.exports;
      if (e.it_version?.()!==1||!['it_stop','it_plan','it_nearby','it_sheet']
        .every(name=>typeof e[name]==='function'))return null;
      // Native must agree with independent JS logic before taking any decisions.
      for(let status=0;status<=6;status++)for(let arrival=0;arrival<=2;arrival++){
        const expected=status<=2&&arrival===1?1:0;
        if(e.it_stop(status,arrival)!==expected)return null;
        for(const radius of [10,25,50])for(const distance of [-1,0,10,25,50,50.1,NaN]){
          const expectedNearby=expected===1&&Number.isFinite(distance)&&distance>=0&&distance<=radius?1:0;
          if(e.it_nearby(status,arrival,distance,radius)!==expectedNearby)return null;
        }
      }
      for(let saved=0;saved<=7;saved++)for(let missing=0;missing<=7;missing++)
        for(let verified=0;verified<=1;verified++)for(let state=0;state<=2;state++)
          for(const month of (state===2?[1,3,4,12,13]:[0]))
            for(let season=0;season<=2;season++)
              if(e.it_plan(saved,missing,verified,state,month,season)!==
                 planOracle(saved,missing,verified,state,month,season))return null;
      for(let saved=0;saved<=7;saved++)for(let regions=0;regions<=7;regions++){
        const expected=saved<1||saved>6||regions<1||regions>saved?0:regions>1?2:1;
        if(e.it_sheet(saved,regions)!==expected)return null;
      }
      native=e;
      return 'rust-wasm';
    })().catch(()=>null);
    return loading;
  }
  const api=Object.freeze({MAX_STOPS,calendar,candidate,nearbyEligible,assess,vetoApproved,sheetKind,
    activate,engine:()=>native?'rust-wasm':'js-parity'});
  if (typeof module!=='undefined'&&module.exports)module.exports=api;
  if (root){root.SharedItineraryEngine=api;void activate();}
})(typeof window==='undefined'?null:window);
