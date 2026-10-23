'use strict';
// Progressive experience: the page and source links remain useful with JS disabled.
(function(){
 const $=id=>document.getElementById(id);
 const tabs=[...document.querySelectorAll('[role="tab"]')];
 const panels=[...document.querySelectorAll('[role="tabpanel"]')];
 function activate(mode){
  for(const t of tabs){const active=t.dataset.mode===mode;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;}
  for(const p of panels)p.hidden=p.id!=='panel-'+mode;
  if(mode==='river'&&!autoLoaded){autoLoaded=true;refreshReport();}
 }
 tabs.forEach((t,i)=>{
  t.addEventListener('click',()=>activate(t.dataset.mode));
  t.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
   e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   tabs[j].focus();activate(tabs[j].dataset.mode);
  });
 });
 function localDate(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const o=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return o.year+'-'+o.month+'-'+o.day;
 }
 const boatDate=$('boatDate'),direction=$('boatDirection'),craft=$('boatCraft'),verdict=$('boatVerdict');
 boatDate.value=localDate();
 let requestId=0;
 async function refreshBoat(){
  const id=++requestId;
  verdict.className='verdict';
  verdict.replaceChildren();
  const lead=document.createElement('strong');lead.textContent='Checking dated USACE rules…';verdict.append(lead);
  try{
   const params=new URLSearchParams({date:boatDate.value,direction:direction.value,craft:craft.value});
   const r=await fetch('/api/john-day-rules?'+params,{signal:AbortSignal.timeout(8000)});
   const d=await r.json();if(id!==requestId)return;
   if(!r.ok||!d.ok)throw Error('unsupported input');
   verdict.className='verdict'+((d.kind==='assist-required'||d.kind==='unverified-period')?' warning':'');
   verdict.replaceChildren();
   const kicker=document.createElement('span');kicker.className='smallcaps';kicker.textContent=d.verified?'Published USACE seasonal guidance':'Further confirmation required';
   const title=document.createElement('h3');title.textContent=d.title;
   const message=document.createElement('p');message.textContent=d.explanation;
   verdict.append(kicker,title,message);
   if(d.times.length){const times=document.createElement('p');const strong=document.createElement('strong');strong.textContent='Published time slots: ';times.append(strong,document.createTextNode(d.times.join(' · ')));verdict.append(times);}
   const ul=document.createElement('ul');for(const s of d.limitations){const li=document.createElement('li');li.textContent=s;ul.append(li);}verdict.append(ul);
   const note=document.createElement('p');note.className='micro';note.textContent='This is never permission to navigate. Present-day lock operating status is unknown to this website.';
   verdict.append(note);
   if(d.source){const link=document.createElement('a');link.href=d.source;link.target='_blank';link.rel='noopener';link.textContent='Read the controlling published source ↗';verdict.append(link);}
  }catch(_){
   if(id!==requestId)return;
   verdict.className='verdict warning';verdict.replaceChildren();
   const title=document.createElement('h3');title.textContent='Automated lookup unavailable';
   const p=document.createElement('p');p.textContent='Use the linked USACE winter and summer notices and contact lock control before travelling. No navigation clearance can be inferred.';
   verdict.append(title,p);
  }
 }
 [boatDate,direction,craft].forEach(el=>el.addEventListener('change',refreshBoat));refreshBoat();
 const level=$('lift'),water=$('chamberWater'),boat=$('boatShape'),number=$('liftNumber'),title=$('liftTitle'),explain=$('liftExplanation');
 function move(n){
  const v=Math.min(95,Math.max(10,Number(n)||10));level.value=v;
  water.style.height=v+'%';boat.style.bottom='calc('+v+'% - 13px)';number.textContent=v+'%';
  if(v<30){title.textContent='Near the lower river';explain.textContent='With the chamber drained to the lower water level, the vessel floats near the downstream elevation.';}
  else if(v<75){title.textContent='Water enters the chamber';explain.textContent='Rising water displaces the floating vessel upward, without a mechanical hoist.';}
  else{title.textContent='Near the upper reservoir';explain.textContent='The boat approaches upstream water elevation. Only the lock crew can safely operate the real gates.';}
 }
 level.addEventListener('input',()=>move(level.value));$('fillBtn').addEventListener('click',()=>move(95));$('drainBtn').addEventListener('click',()=>move(10));move(10);
 // One deliberate step per action: no animation timer, no simulated operational ETA.
 let passageStep=0;
 const passageCopy={
  up:[['Start at the lower river.','A vessel approaches from downstream. The chamber must match that lower water level before entry.'],['Enter at the lower level.','With water levels equalized and entry permitted by the crew, the vessel enters the chamber.'],['Enclose the chamber.','The entry gate is closed before the water level changes. The vessel stays afloat inside the chamber.'],['Rise with the water.','Water enters the chamber and the vessel rises with it toward Lake Umatilla. The boat is floating, not being hoisted.'],['Leave at the upper level.','After levels match and the crew permits departure, the vessel continues upstream into the reservoir.']],
  down:[['Start at the upper reservoir.','A vessel approaches from Lake Umatilla. The chamber must match the upper water level before entry.'],['Enter at the upper level.','With water levels equalized and entry permitted by the crew, the vessel enters the chamber.'],['Enclose the chamber.','The entry gate is closed before the water level changes. The vessel stays afloat inside the chamber.'],['Descend with the water.','Water leaves the chamber and the vessel settles toward the lower river level. Its weight remains supported by water.'],['Leave at the lower level.','After levels match and the crew permits departure, the vessel continues downstream toward The Dalles.']]
 };
 function showPassage(){
  const up=$('passageDirection').value==='up',copy=passageCopy[up?'up':'down'][passageStep];
  $('passageCount').textContent='Step '+(passageStep+1)+' of 5 · '+(up?'upstream':'downstream');
  $('passageTitle').textContent=copy[0];$('passageStory').textContent=copy[1]+' Simplified illustration, not operating guidance.';
  $('simGate').textContent=['Approach','Enter','Entry gate closed','Water level changes','Depart'][passageStep];
  [...$('passageTrack').children].forEach((el,i)=>{if(i===passageStep)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')});
  $('passageBack').disabled=passageStep===0;$('passageNext').disabled=passageStep===4;
  const outside=passageStep===0||passageStep===4;
  boat.hidden=outside;$('passageOutside').hidden=!outside;
  const upper=passageStep===0?!up:up;
  $('passageOutside').style.left=upper?'77%':'3%';$('passageOutside').style.bottom=upper?'73%':'19%';
  move((passageStep<3)===up?10:95);
 }
 $('passageNext').addEventListener('click',()=>{passageStep=Math.min(4,passageStep+1);showPassage()});
 $('passageBack').addEventListener('click',()=>{passageStep=Math.max(0,passageStep-1);showPassage()});
 for(const id of ['passageReset','passageDirection'])$(id).addEventListener(id==='passageDirection'?'change':'click',()=>{passageStep=0;showPassage()});
 // Manual experiments are visibly separate from the selected passage stage.
 function freeExplore(){ boat.hidden=false;$('passageOutside').hidden=true; $('passageCount').textContent='Free exploration · illustrative water level';$('passageTitle').textContent='Try raising and lowering the water.';$('passageStory').textContent='You are adjusting the illustration directly. Use Restart to return to the five passage stages.';$('simGate').textContent='Manual water exploration';[...$('passageTrack').children].forEach(el=>el.removeAttribute('aria-current')); }
 level.addEventListener('input',freeExplore);$('fillBtn').addEventListener('click',freeExplore);$('drainBtn').addEventListener('click',freeExplore);
 showPassage();
 // Exact USACE data from July 10, 2026. Historical example, never presented as a live measurement.
 const history=[
 [131,79.2,50.9,263.62,160.72,102.90],[132.9,79.2,50.9,263.52,160.32,103.20],
 [130.7,78.9,50.9,263.52,160.29,103.23],[142.8,89.2,51,263.62,161.01,102.61],
 [142.2,90.3,51,263.72,160.72,103],[174.2,122.4,50.9,263.42,161.68,101.74],
 [203.2,149.6,50.9,263.52,161.52,102],[184.5,132.7,50.9,263.52,160.92,102.60],
 [164,112.2,51,263.81,160.62,103.19],[154.6,100.9,51,263.92,160.42,103.50],
 [140.7,88.8,51,263.72,160.42,103.30],[142.1,88.5,51,263.72,160.42,103.30],
 [140,88.1,51,263.62,160.42,103.20],[142.4,88.7,50.9,263.72,160.32,103.30],
 [140.2,88.3,51,263.72,160.32,103.40],[139.9,88.1,51,263.72,160.22,103.50],
 [145.9,94.1,51,263.62,160.52,103.10],[146.3,94.5,50.9,263.52,160.32,103.20],
 [141.3,89.4,50.9,263.51,160.22,103.29],[141.7,89.9,50.9,263.52,160.32,103.20],
 [141.3,89.4,50.9,263.52,160.22,103.29],[139,87.2,50.9,263.52,160.07,103.45],
 [124.8,73,50.9,263.62,159.72,103.90],[124.5,72.7,50.9,263.52,159.92,103.60]
 ];
 let measurements=history.map((v,i)=>({hour:i+1,outflowKcfs:v[0],generationKcfs:v[1],spillKcfs:v[2],forebayFt:v[3],tailwaterFt:v[4],headFt:v[5]}));
 const ns='http://www.w3.org/2000/svg',g=$('grid');
 let autoLoaded=false,loadingReport=false,flowMetric='outflowKcfs';
 const flowTitles={outflowKcfs:'Total river outflow',generationKcfs:'Generation water flow',spillKcfs:'Spill flow'};
 function svgEl(tag,attrs,text){
  const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));
  if(text!==undefined)el.textContent=text;return el;
 }
 const x=i=>65+i*29.8;
 function render(){
  const valid=measurements.filter(v=>Number.isFinite(v[flowMetric]));if(!valid.length)return;
  const values=valid.map(v=>v[flowMetric]);const peak=Math.max(...values);
  const step=peak<10?2:peak<50?10:25;
  const min=Math.max(0,Math.floor(Math.min(...values)/step)*step-step);
  const max=Math.ceil(peak/step)*step+step;
  $('chartTitle').textContent=flowTitles[flowMetric]+' by reported hour';
  const y=n=>250-((n-min)/(max-min))*210;
  g.replaceChildren();
  for(let i=0;i<5;i++){const n=min+(max-min)*i/4,yy=y(n);
   g.append(svgEl('line',{x1:57,y1:yy,x2:754,y2:yy,stroke:'#d2e0dd','stroke-width':1}),svgEl('text',{x:5,y:yy+4},n.toFixed(0)));}
  const points=measurements.filter(v=>Number.isFinite(v[flowMetric])).map(v=>x(v.hour-1)+','+y(v[flowMetric])).join(' ');
  $('flowLine').setAttribute('points',points);
  function update(){
   let i=Number($('hour').value);i=Math.min(i,measurements.length-1);
   const v=measurements[i];$('hourLabel').textContent='Hour '+v.hour;
   $('cursorLine').setAttribute('x1',x(v.hour-1));$('cursorLine').setAttribute('x2',x(v.hour-1));
   $('cursorDot').setAttribute('cx',x(v.hour-1));$('cursorDot').setAttribute('cy',y(v[flowMetric]));
   const fields=[['flowValue','outflowKcfs',1],['genValue','generationKcfs',1],['spillValue','spillKcfs',1],['foreValue','forebayFt',2],['tailValue','tailwaterFt',2],['headValue','headFt',2]];
   for(const [id,key,digits] of fields)$(id).textContent=Number.isFinite(v[key])?v[key].toFixed(digits):'—';
  }
  $('hour').max=measurements.length-1;$('hour').value=Math.min(Number($('hour').value),measurements.length-1);
  window.johnDayUpdateHour=update;update();
 }
 $('hour').addEventListener('input',()=>{if(window.johnDayUpdateHour)window.johnDayUpdateHour()});
 render();
 document.querySelectorAll('[data-flow-series]').forEach(button=>button.addEventListener('click',()=>{
  flowMetric=button.dataset.flowSeries;
  document.querySelectorAll('[data-flow-series]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  render();
 }));
 function summarize(report){
  const list=report.observations;
  const low=list.reduce((a,b)=>b.outflowKcfs<a.outflowKcfs?b:a);
  const high=list.reduce((a,b)=>b.outflowKcfs>a.outflowKcfs?b:a);
  const mean=(list.reduce((n,v)=>n+v.outflowKcfs,0)/list.length).toFixed(1);
  const spillMean=(list.reduce((n,v)=>n+v.spillKcfs,0)/list.length).toFixed(1);
  $('flowStory').textContent='On '+report.reportDate+', reported outflow ranged from '+low.outflowKcfs.toFixed(1)+
    ' thousand cfs (hour '+low.hour+') to '+high.outflowKcfs.toFixed(1)+' thousand cfs (hour '+high.hour+
    '). The sampled-day average was '+mean+' thousand cfs; mean spill was '+spillMean+
    ' thousand cfs. These are observations, not a river-level forecast or a navigation clearance.';
 }
 summarize({reportDate:'2026-07-10',observations:measurements});
 async function refreshReport(){
  if(loadingReport)return;
  loadingReport=true;
  const button=$('loadReport');button.disabled=true;button.textContent='Checking USACE report…';
  try{
   const response=await fetch('/api/john-day-water',{signal:AbortSignal.timeout(12000)});
   const d=await response.json();
   if(!response.ok||!d.ok||!Array.isArray(d.observations)||d.observations.length<20||
      !d.observations.every(v=>Number.isFinite(v.outflowKcfs)&&Number.isFinite(v.generationKcfs)&&Number.isFinite(v.spillKcfs)))
    throw Error('No validated completed-day report');
   measurements=d.observations;
   $('reportDate').textContent=d.reportDate+' · USACE completed-day data ('+d.observedHours+'/24 hours)';
   $('reportNote').textContent='Dated provisional hourly observations. Checked '+new Date(d.checkedAt).toLocaleString()+
     '. Not real-time flow, lock status, or navigation clearance.';
   $('reportSourceLink').href=d.sourceUrl;
   $('hour').value=0;render();summarize(d);
   button.textContent='Refresh USACE observations';
  }catch(_){
   $('reportNote').textContent='Newer observations could not be verified. Previously loaded data remain displayed; check the report date above. These are not current navigation-lock conditions.';
   button.textContent='Retry official report';
  }finally{loadingReport=false;button.disabled=false;}
 }
 $('loadReport').addEventListener('click',refreshReport);
})();
