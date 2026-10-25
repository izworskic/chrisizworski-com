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
   setStatus('unknown','No recent vessel signals have reached this feed for the John Day area. Boats may still be on the river; receiver coverage has gaps.');
  }else if(result.observationState==='recent-reports'){
   setStatus('evidence',items.length+' recent AIS vessel observation'+(items.length===1?'':'s')+
    ' around John Day. Select a card to explore; these positions do not confirm a place in the lock queue.');
  }else{
   setStatus('unknown','Public AIS observations are not available.');
  }
  const checked=elt('span','Feed checked '+clock(result.checkedAt)+' · Open Waters AIS, last 30 minutes');
  const source=elt('a','How these vessel signals work ↗');
  source.href=result.provider||'https://openwaters.io/api/ais/';source.target='_blank';source.rel='noopener';
  const caveat=elt('span','A radio report is a glimpse of a journey, not a lock booking or permission to navigate.');
  meta.append(checked,source,caveat);
  if(!items.length){
   const card=elt('article','','shipEmpty');
   card.append(elt('span','Listening for the next report','smallcaps'),elt('h4','The river’s moving. We’re waiting for a signal.'),elt('p','Our shared AIS feed has no usable vessel reports here from the past 30 minutes. That leaves incoming traffic unknown, not zero. While we listen, explore the river stops below, or check the Corps queue and another AIS network for a second view.'));list.append(card);
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
  button.textContent='Checking AIS reports…';setStatus('loading','Listening for vessel reports from Open Waters AIS…');
  try{
   const r=await fetch('/api/john-day-ais',{signal:AbortSignal.timeout(12000)});
   const data=await r.json();
   if(!r.ok||!data.ok||!['recent-reports','no-recent-reports'].includes(data.observationState))throw Error('AIS unavailable');
   show(data);
   button.textContent='Refresh AIS observations';
  }catch{
   // Do not leave stale markers or positions on screen pretending to be current.
   lastData=null;list.replaceChildren();meta.replaceChildren();
   const card=elt('article','','shipEmpty');card.append(elt('h4','The ship signals are taking a break.'),elt('p','We could not reach the vessel feed. Try again in a moment, or use the Corps traffic reports and alternate AIS map below to keep exploring.'));list.append(card);
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
