'use strict';
/* Automatically loaded public AIS evidence for John Day. Does not predict lock passage.
   The site must not describe an empty feed as an empty Columbia River. */
(()=>{
 const $=id=>document.getElementById(id);
 const button=$('aisLoad'),status=$('aisStatus'),list=$('aisVessels'),meta=$('aisMeta');
 if(!button||!status||!list)return;
 let lastData=null,pending=false;
 const setStatus=(kind,message)=>{
  status.className='aisState '+kind;status.textContent=message;
 };
 const elt=(tag,text,className)=>{
  const e=document.createElement(tag);e.textContent=text;
  if(className)e.className=className;return e;
 };
 const clock=v=>{
  const t=Date.parse(v||'');
  return Number.isFinite(t)?new Date(t).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'unknown time';
 };
 function show(result){
  lastData=result;list.replaceChildren();meta.replaceChildren();
  const items=(Array.isArray(result.vessels)?result.vessels:[]).map(v=>window.JohnDayVessels.describe(v)).filter(Boolean).sort((a,b)=>a.km-b.km);
  // This is a source coverage statement and cannot be mistaken for USACE queue data.
  if(!items.length){
   setStatus('unknown','No AIS vessel positions reported in this area in the previous 30 minutes. Receiver coverage is unverified, so boats may still be present.');
  }else if(result.observationState==='recent-reports'){
   setStatus('evidence',items.length+' recent AIS vessel observation'+(items.length===1?'':'s')+
    ' within the broad John Day area. These are NOT confirmed vessels entering the lock.');
  }else{
   setStatus('unknown','Public AIS observations are not available.');
  }
  const checked=elt('span','Feed checked '+clock(result.checkedAt)+' · Open Waters AIS, last 30 minutes');
  const source=elt('a','Source and report definitions ↗');
  source.href=result.provider||'https://openwaters.io/api/ais/';source.target='_blank';source.rel='noopener';
  const caveat=elt('span','No lock ETA, queue, transit confirmation or navigation clearance is inferred.');
  meta.append(checked,source,caveat);
  if(!items.length){
   const card=elt('article','','shipEmpty');
   card.append(elt('span','AIS COVERAGE GAP','smallcaps'),elt('h4','No vessel cards from this receiver right now'),elt('p','The provider returned no usable reports from the past 30 minutes. Incoming traffic is unknown—not zero. Open the official queue or compare another AIS network below.'));list.append(card);
  }
  for(const v of items){
   const row=elt('button','','aisVessel');row.type='button';
   const badge=elt('span',v.movement,'shipMovement '+v.kind);
   const name=elt('strong',v.name||'Unidentified AIS vessel ('+v.mmsi+')');
   const distance=elt('span',v.km.toFixed(1)+' km from John Day · straight-line distance','shipDistance');
   const t=elt('span','Last heard '+clock(v.seen)+(Number.isFinite(v.speedKnots)?' · '+v.speedKnots.toFixed(1)+' kn':'')+
    ' · AIS location, not an arrival estimate');
   const src=elt('small','MMSI '+v.mmsi+' · source '+(v.source||'not labeled'));
   const destination=elt('span','AIS destination: '+(v.destination||'not reported'));
   row.append(badge,name,distance,t,destination,src);row.dataset.mmsi=v.mmsi;
   row.addEventListener('click',()=>{
    window.dispatchEvent(new CustomEvent('john-day-ais-select',{detail:{mmsi:v.mmsi}}));
    document.getElementById('lockMap')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    for(const el of list.querySelectorAll('button'))el.setAttribute('aria-pressed',String(el===row));
   });
   row.setAttribute('aria-pressed','false');list.append(row);
  }
  if(items.length){
   const note=elt('p','On-map AIS symbols indicate last-heard positions only; a blank stretch does not mean it has no vessel traffic.','micro');
   list.append(note);
  }
  if(result.truncated){
   list.append(elt('p','Only a capped subset of recent observations is shown; do not treat this as a complete traffic list.','micro'));
  }
  for(const credit of result.attribution||[]){
   const c=elt('span',credit.credit||credit.source,'aisCredit');meta.append(c);
  }
  window.dispatchEvent(new CustomEvent('john-day-ais-observations',{detail:{observations:items,checkedAt:result.checkedAt}}));
 }
 async function check(){
  if(pending)return;pending=true;button.disabled=true;
  button.textContent='Checking AIS reports…';setStatus('loading','Reading the Open Waters vessel observation feed…');
  try{
   const r=await fetch('/api/john-day-ais',{signal:AbortSignal.timeout(12000)});
   const data=await r.json();
   if(!r.ok||!data.ok||!['recent-reports','no-recent-reports'].includes(data.observationState))throw Error('AIS unavailable');
   show(data);
   button.textContent='Refresh AIS observations';
  }catch{
   // Do not leave stale markers or positions on screen pretending to be current.
   lastData=null;list.replaceChildren();meta.replaceChildren();
   const card=elt('article','','shipEmpty');card.append(elt('h4','Vessel feed unavailable'),elt('p','Incoming ships cannot be verified from this receiver. The official traffic and alternate AIS links remain available below.'));list.append(card);
   window.dispatchEvent(new CustomEvent('john-day-ais-observations',{detail:{observations:[],checkedAt:null}}));
   setStatus('unknown','Recent AIS feed unavailable. This is not evidence of an empty river. Check the official lock reports; do not infer an ETA or navigation clearance.');
   button.textContent='Retry AIS check';
  }finally{button.disabled=false;pending=false}
 }
 window.addEventListener('john-day-ais-focus',e=>{for(const row of list.querySelectorAll('button'))row.setAttribute('aria-pressed',String(row.dataset.mmsi===e.detail?.mmsi))});
 button.addEventListener('click',check);
 check();
 setInterval(()=>{if(!document.hidden)check()},120000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
})();
