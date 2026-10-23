'use strict';
// Progressive experience: the page and source links remain useful with JS disabled.
(function(){
 const $=id=>document.getElementById(id);
 const tabs=[...document.querySelectorAll('[role="tab"]')];
 const panels=[...document.querySelectorAll('[role="tabpanel"]')];
 function activate(mode){
  for(const t of tabs){const active=t.dataset.mode===mode;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;}
  for(const p of panels)p.hidden=p.id!=='panel-'+mode;
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
 function svgEl(tag,attrs,text){
  const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));
  if(text!==undefined)el.textContent=text;return el;
 }
 const x=i=>65+i*29.8;
 function render(){
  const valid=measurements.filter(v=>Number.isFinite(v.outflowKcfs));if(!valid.length)return;
  const min=Math.max(0,Math.floor(Math.min(...valid.map(v=>v.outflowKcfs))/25)*25-25);
  const max=Math.ceil(Math.max(...valid.map(v=>v.outflowKcfs))/25)*25+25;
  const y=n=>250-((n-min)/(max-min))*210;
  g.replaceChildren();
  for(let i=0;i<5;i++){const n=min+(max-min)*i/4,yy=y(n);
   g.append(svgEl('line',{x1:57,y1:yy,x2:754,y2:yy,stroke:'#d2e0dd','stroke-width':1}),svgEl('text',{x:5,y:yy+4},n.toFixed(0)));}
  const points=measurements.filter(v=>Number.isFinite(v.outflowKcfs)).map(v=>x(v.hour-1)+','+y(v.outflowKcfs)).join(' ');
  $('flowLine').setAttribute('points',points);
  function update(){
   let i=Number($('hour').value);i=Math.min(i,measurements.length-1);
   const v=measurements[i];$('hourLabel').textContent='Hour '+v.hour;
   $('cursorLine').setAttribute('x1',x(v.hour-1));$('cursorLine').setAttribute('x2',x(v.hour-1));
   $('cursorDot').setAttribute('cx',x(v.hour-1));$('cursorDot').setAttribute('cy',y(v.outflowKcfs));
   const fields=[['flowValue','outflowKcfs',1],['genValue','generationKcfs',1],['spillValue','spillKcfs',1],['foreValue','forebayFt',2],['tailValue','tailwaterFt',2],['headValue','headFt',2]];
   for(const [id,key,digits] of fields)$(id).textContent=Number.isFinite(v[key])?v[key].toFixed(digits):'—';
  }
  $('hour').max=measurements.length-1;$('hour').value=Math.min(Number($('hour').value),measurements.length-1);
  window.johnDayUpdateHour=update;update();
 }
 $('hour').addEventListener('input',()=>{if(window.johnDayUpdateHour)window.johnDayUpdateHour()});
 render();
 $('loadReport').addEventListener('click',async()=>{
  const button=$('loadReport');button.disabled=true;button.textContent='Checking USACE…';
  try{
   const r=await fetch('/api/john-day-water',{signal:AbortSignal.timeout(12000)});const d=await r.json();
   if(!r.ok||!d.ok||!Array.isArray(d.observations)||!d.observations.length)throw Error('no validated observations');
   measurements=d.observations;
   $('reportDate').textContent=d.reportDate+' · completed-day USACE report';
   $('reportNote').textContent='Reported hourly observations, not real-time flow or navigation clearance. Checked '+new Date(d.checkedAt).toLocaleString()+'.';
   $('hour').value=0;render();button.textContent='Reload official report';
  }catch(_){
   $('reportNote').textContent='USACE report unavailable or format not validated. Chart still shows July 10, 2026 historical source data; not a live reading.';
   button.textContent='Try official report again';
  }finally{button.disabled=false;}
 });
})();
