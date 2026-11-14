/* Shared itinerary Rust WASM — Lake Superior Circle Tour adapter.
 * 31 editorial stop identities; never a road graph, live closure decision,
 * parking locator or routed ETA. Original Circle Tour content is authoritative.
 * A native mismatch vetoes an unsafe plan; missing WASM retains JS source gates.
 */
(function(root){
  'use strict';
  const ORDER=Object.freeze(['1','2','3','4','5','6','7','8','9','10','11','12','31','13','14',
    '15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30']);
  const INDEX=new Map(ORDER.map((id,i)=>[id,i]));
  const VALID_DIRECTIONS=new Set(['counterclockwise','clockwise']);
  let native=null, loading=null;
  const ident=id=>typeof id==='string'&&INDEX.has(id);
  const alias=(a,b)=>(a==='1'&&b==='30')||(a==='30'&&b==='1');
  const next=(a,b,direction)=>{
    if(!ident(a)||!ident(b)||!VALID_DIRECTIONS.has(direction))return false;
    const i=INDEX.get(a),j=INDEX.get(b);
    return j===(direction==='counterclockwise'?(i+1)%31:(i+30)%31);
  };
  const same=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<0.000001;
  const legOracle=(a,b,d,m,verified)=>
    next(a,b,d)&&verified===true&&Number.isFinite(m)&&
    (alias(a,b)?m===0:m>0&&m<=600);
  const dayOracle=(first,last,miles,count)=>ident(first)&&ident(last)&&
    Number.isInteger(count)&&count>0&&count<=31&&Number.isSafeInteger(miles)&&miles>=0&&
    miles<=600&&(miles===0?(first===last&&count===1):(first!==last&&count>1));
  const borderOracle=b=>Boolean(b&&typeof b==='object'&&
    Number.isFinite(b.allowanceMinutes)&&b.allowanceMinutes>=0&&b.allowanceMinutes<=360&&
    (b.available===true?
      Number.isFinite(b.waitMinutes)&&b.waitMinutes>=0&&b.waitMinutes<=360&&b.allowanceMinutes===b.waitMinutes:
      b.available===false&&b.allowanceMinutes===45));
  const driveOracle=(miles,hours,stay)=>Number.isFinite(miles)&&Number.isFinite(hours)&&
    miles>=0&&miles<=10000&&hours>=0&&hours<=500&&
    (stay?(miles===0&&hours===0):same(hours,miles/47*1.2));

  // A stop card's .stop-dist is the source of a directly adjacent *planning*
  // distance. An explicitly partial border or park-spur label is withheld.
  // Re-read the HTML independently of the old live-day edgeMiles() calculation.
  function evidenceMiles(from,to,getCard){
    if(!ident(from)||!ident(to))return null;
    if(alias(from,to))return 0; // Identical Duluth endpoints, not zero-length driving.
    const a=INDEX.get(from),b=INDEX.get(to);
    let target;
    if((a+1)%31===b)target=to;
    else if((b+1)%31===a)target=from;
    else return null;
    const card=typeof getCard==='function'?
      getCard(target):(typeof document!=='undefined'?document.getElementById('stop-'+target):null);
    const distance=card?.querySelector?.('.stop-dist');
    if(!distance||distance.dataset?.edgeVerified==='false')return null;
    const matched=(distance.textContent||'').match(/([\d,.]+)\s*mi/i);
    const miles=matched?Number(matched[1].replace(/,/g,'')):null;
    return Number.isFinite(miles)?miles:null;
  }
  function rustAgreement(exportName,args,baseline){
    if(!native)return baseline;
    try {
      const result=native[exportName](...args)===1;
      if(result!==baseline){native=null;return false;}
      return result;
    }catch{native=null;return false;}
  }
  function publishedDayGate(first,last,miles,count){
    const baseline=dayOracle(first,last,miles,count);
    return rustAgreement('ct_published_day',[Number(first),Number(last),miles,count],baseline);
  }
  // Route previews use published *day* estimates, not a sum of guessed legs.
  // Clockwise keeps the same estimates but reverses editorial day endpoints.
  function verifyPreset(route,baseline,direction){
    if(baseline===null)return null;
    if(!Array.isArray(route)||!route.length||!VALID_DIRECTIONS.has(direction)||
      !Number.isSafeInteger(baseline)||baseline<0)return null;
    let total=0,previous=null;
    for(const day of route){
      const ids=day?.stops?.map(String)||[];
      if(!ids.length||ids.some(id=>!ident(id))||(!publishedDayGate(ids[0],ids.at(-1),day.miles,ids.length))||
        (previous!==null&&previous!==ids[0]))return null;
      // Named waypoints may skip numbers. They cannot reverse the chosen tour.
      for(let i=1;i<ids.length;i++){
        const a=INDEX.get(ids[i-1]),b=INDEX.get(ids[i]);
        const steps=direction==='counterclockwise'?(b-a+31)%31:(a-b+31)%31;
        if(steps===0)return null;
      }
      previous=ids.at(-1); total+=day.miles;
    }
    const first=route[0].stops[0],last=route.at(-1).stops.at(-1);
    if(direction==='counterclockwise'?(first!=='1'||last!=='30'):(first!=='30'||last!=='1'))return null;
    return total===baseline?baseline:null;
  }

  function crossingsFor(segment){
    const pairs=[];
    for(let i=1;i<segment.length;i++){
      const a=segment[i-1],b=segment[i];
      if((a==='13'&&b==='14')||(a==='14'&&b==='13'))pairs.push('Sault Ste. Marie');
      if((a==='20'&&b==='21')||(a==='21'&&b==='20'))pairs.push('Pigeon River / Grand Portage');
    }
    return pairs;
  }
  function auditSegment({segment,direction,routeMiles,driveHours,borderAllowances=[],
    borderMinutes,borderUnknown,getEdgeMiles,getCard}={}){
    const fail=reason=>({ok:false,reason,engine:native?'rust-wasm':'js-parity'});
    if(!Array.isArray(segment)||!segment.length||segment.length>31||
      segment.some(id=>!ident(id))||!VALID_DIRECTIONS.has(direction)||
      typeof getEdgeMiles!=='function')return fail('Unsupported Circle Tour stop or route direction.');
    const stay=segment.length===1;
    let sum=0;
    for(let i=1;i<segment.length;i++){
      const from=segment[i-1],to=segment[i];
      const published=evidenceMiles(from,to,getCard);
      const original=getEdgeMiles(from,to);
      const baseline=Number.isFinite(published)&&Number.isFinite(original)&&same(published,original)&&
        legOracle(from,to,direction,original,true);
      if(!baseline||!rustAgreement('ct_leg',[Number(from),Number(to),direction==='clockwise'?1:0,original,1],baseline))
        return fail('A route leg is missing reviewed distance evidence or is out of order.');
      sum+=published;
    }
    if(!Number.isFinite(routeMiles)||!same(sum,routeMiles)||!driveOracle(routeMiles,driveHours,stay)||
      !rustAgreement('ct_drive',[routeMiles,driveHours,stay?1:0],true))
      return fail('The published mileage and conservative drive allowance could not be reconciled.');
    if(!Array.isArray(borderAllowances))return fail('Crossing data is not available.');
    const crossingNames=crossingsFor(segment);
    if(crossingNames.length!==borderAllowances.length)return fail('A border crossing was omitted.');
    let reserve=0;
    for(let i=0;i<crossingNames.length;i++){
      const b=borderAllowances[i];
      if(b?.name!==crossingNames[i]||!borderOracle(b)||
        !rustAgreement('ct_border',[b.available?1:0,Number(b.waitMinutes),b.allowanceMinutes],true))
        return fail('An unavailable or stale border wait was treated as a confirmed time.');
      reserve+=b.allowanceMinutes;
    }
    if(!Number.isFinite(borderMinutes)||borderMinutes!==reserve||
      Boolean(borderUnknown)!==borderAllowances.some(b=>!b.available))
      return fail('The border-time budget is inconsistent.');
    return {ok:true,reason:'Editorial mileage checked; traffic, weather, roads and border access remain unverified.',
      engine:native?'rust-wasm':'js-parity',miles:sum,borderMinutes:reserve};
  }

  // Feasibility is a bounded editorial DAY allowance, never a road route or
  // an opening/closure decision. Missing leg evidence wins over apparent spare
  // hours; a winter-sensitive experience is held for park-source verification.
  function feasibility({miles,availableHours,visitHours,borderMinutes=0,
    evidenceComplete=false,seasonalHold=false}={}){
    const inputs=[miles,availableHours,visitHours,borderMinutes];
    let code=0;
    if(inputs.every(Number.isFinite)&&miles>=0&&miles<=600&&availableHours>0&&
      availableHours<=24&&visitHours>=0&&visitHours<=24&&
      borderMinutes>=0&&borderMinutes<=720&&
      typeof evidenceComplete==='boolean'&&typeof seasonalHold==='boolean'){
      const remaining=availableHours-(miles/47*1.2+visitHours+borderMinutes/60);
      code=!evidenceComplete?4:seasonalHold?5:remaining<0?3:remaining<.75?2:1;
    }
    const baseline=code;
    if(native){
      try{
        const result=native.ct_feasibility(...inputs,evidenceComplete?1:0,seasonalHold?1:0);
        if(result!==baseline){native=null;code=0;}
      }catch{native=null;code=0;}
    }
    const labels={
      0:'Planning data unavailable',
      1:'Reasonable allowance, not a live ETA',
      2:'Tight day: little spare time',
      3:'Over budget: simplify the day',
      4:'Arrival clock withheld: a road leg remains incomplete',
      5:'Verify seasonal park access before committing'
    };
    return {code,label:labels[code],engine:native?'rust-wasm':'js-parity',
      remainingHours:code===1||code===2||code===3
        ?Math.round((availableHours-(miles/47*1.2+visitHours+borderMinutes/60))*10)/10:null};
  }
  async function activate(){
    if(loading)return loading;
    if(!root||!root.fetch||!root.WebAssembly||!root.atob)return null;
    loading=(async()=>{
      const r=await root.fetch('/assets/shared-itinerary.wasm.b64',{credentials:'same-origin'});
      if(!r.ok)return null;
      const b64=(await r.text()).trim();
      if(b64.length<100||b64.length>70000||!/^[a-zA-Z0-9+/]+=*$/.test(b64))return null;
      const bytes=Uint8Array.from(root.atob(b64),c=>c.charCodeAt(0));
      if(bytes[0]!==0||bytes[1]!==97||bytes[2]!==115||bytes[3]!==109)return null;
      const e=(await root.WebAssembly.instantiate(bytes,{})).instance.exports;
      if(e.ct_version?.()!==2||e.it_version?.()!==1||
        !['ct_leg','ct_published_day','ct_border','ct_drive','ct_feasibility'].every(x=>typeof e[x]==='function'))
        return null;
      for(let i=0;i<ORDER.length;i++)for(const direction of ['counterclockwise','clockwise']){
        const nextId=ORDER[(i+(direction==='counterclockwise'?1:30))%31];
        const miles=alias(ORDER[i],nextId)?0:42;
        if(e.ct_leg(Number(ORDER[i]),Number(nextId),direction==='clockwise'?1:0,miles,1)!==1)
          return null;
        if(e.ct_leg(Number(ORDER[i]),Number(nextId),direction==='clockwise'?1:0,miles,0)!==0)
          return null;
      }
      for(const [a,b,m,c] of [[1,3,87,3],[1,1,0,1],[1,30,0,2],[5,6,601,2]])
        if((e.ct_published_day(a,b,m,c)===1)!==dayOracle(String(a),String(b),m,c))return null;
      for(const b of [
        {available:false,allowanceMinutes:45,waitMinutes:NaN},
        {available:false,allowanceMinutes:0,waitMinutes:0},
        {available:true,allowanceMinutes:14,waitMinutes:14},
        {available:true,allowanceMinutes:45,waitMinutes:14}
      ])if((e.ct_border(b.available?1:0,b.waitMinutes,b.allowanceMinutes)===1)!==borderOracle(b))return null;
      for(const [m,h,stay] of [[0,0,true],[0,0,false],[47,1.2,false],[47,1,false],[NaN,0,false]])
        if((e.ct_drive(m,h,stay?1:0)===1)!==driveOracle(m,h,stay))return null;
      native=e;return 'rust-wasm';
    })().catch(()=>null);
    return loading;
  }
  const api=Object.freeze({ORDER,evidenceMiles,verifyPreset,auditSegment,feasibility,activate,
    engine:()=>native?'rust-wasm':'js-parity'});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root){root.CircleTourRust=api;void activate();}
})(typeof window==='undefined'?null:window);
