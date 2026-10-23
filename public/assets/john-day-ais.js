'use strict';
/* On-demand public AIS evidence for John Day. Does not predict lock passage.
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
  // This is a source coverage statement and cannot be mistaken for USACE queue data.
  if(result.observationState==='no-recent-reports'){
   setStatus('unknown','No AIS vessel positions reported in this area in the previous 30 minutes. Receiver coverage is unverified, so boats may still be present.');
  }else if(result.observationState==='recent-reports'){
   setStatus('evidence',result.vesselCount+' recent AIS vessel observation'+(result.vesselCount===1?'':'s')+
    ' within the broad John Day area. These are NOT confirmed vessels entering the lock.');
  }else{
   setStatus('unknown','Public AIS observations are not available.');
  }
  const checked=elt('span','Feed checked '+clock(result.checkedAt)+' · Open Waters AIS, last 30 minutes');
  const source=elt('a','Source and report definitions ↗');
  source.href=result.provider||'https://openwaters.io/api/ais/';source.target='_blank';source.rel='noopener';
  const caveat=elt('span','No lock ETA, queue, transit confirmation or navigation clearance is inferred.');
  meta.append(checked,source,caveat);
  const items=Array.isArray(result.vessels)?result.vessels:[];
  for(const v of items){
   const row=elt('button','','aisVessel');row.type='button';
   const name=elt('strong',v.name||'Unidentified AIS vessel ('+v.mmsi+')');
   const t=elt('span','Last heard '+clock(v.seen)+(Number.isFinite(v.speedKnots)?' · '+v.speedKnots.toFixed(1)+' kn':'')+
    ' · AIS location, not an arrival estimate');
   const src=elt('small','MMSI '+v.mmsi+' · source '+(v.source||'not labeled'));
   row.append(name,t,src);
   row.addEventListener('click',()=>{
    window.dispatchEvent(new CustomEvent('john-day-ais-select',{detail:{mmsi:v.mmsi}}));
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
   window.dispatchEvent(new CustomEvent('john-day-ais-observations',{detail:{observations:[],checkedAt:null}}));
   setStatus('unknown','Recent AIS feed unavailable. This is not evidence of an empty river. Check the official lock reports; do not infer an ETA or navigation clearance.');
   button.textContent='Retry AIS check';
  }finally{button.disabled=false;pending=false}
 }
 button.addEventListener('click',check);
})();
