(() => {
 'use strict';
 const node=document.getElementById('ferry-config'),core=globalThis.FerryPlanning;if(!node||!core)return;
 const c=JSON.parse(node.textContent),x=c.experience,$=id=>document.getElementById(id);if(!x)return;
 const escape=s=>String(s??'').replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
 const money=n=>new Intl.NumberFormat(c.currency==='CAD'?'en-CA':'en-US',{style:'currency',currency:c.currency}).format(n);
 const duration=n=>n<60?`${n} min`:`${Math.floor(n/60)} h${n%60?' '+n%60+' min':''}`;
 const ids=['trip-date','trip-type','adult-count','child-count','vehicle-count','journey-route','journey-direction','journey-departure','journey-return','journey-return-date','journey-margin','journey-drive','journey-unload','journey-parking','journey-extra','journey-drive-around'];
 function inputs(){return {date:$('trip-date').value,tripType:$('trip-type').value,route:$('journey-route').value,direction:$('journey-direction')?.value||'outward',vehicle:$('vehicle-count').value,departure:$('journey-departure').value,returnTime:$('journey-return').value,returnDate:$('journey-return-date').value,margin:$('journey-margin').value,drive:$('journey-drive').value,unload:$('journey-unload').value};}
 let map=null,mapLayer=null,mapPromise=null,lastPlan=null;
 function terminalHTML(t){const href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(t.address);return `<div><strong>${escape(t.name)}</strong><p>${escape(t.address)}</p><small>${escape(t.zone==='America/Chicago'?'Central Time':'Eastern Time')}</small><p><a href="${escape(href)}" target="_blank" rel="noopener noreferrer">Open directions ↗</a></p></div>`;}
 function updateMap(r){
  $('terminal-cards').innerHTML=terminalHTML(r.a)+terminalHTML(r.b);
  if(!map)return;const L=globalThis.L;mapLayer.clearLayers();
  for(const [i,t] of [r.a,r.b].entries()){
   const popup=document.createElement('div');const title=document.createElement('strong');title.textContent=t.name;const text=document.createElement('p');text.textContent=t.address;popup.append(title,text);
   const a=document.createElement('a');a.href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(t.address);a.textContent='Open terminal directions ↗';a.target='_blank';a.rel='noopener noreferrer';popup.append(a);
   L.circleMarker([t.lat,t.lon],{radius:8,color:'#fff',weight:3,fillColor:i?'#9a642b':'#155c64',fillOpacity:1}).addTo(mapLayer).bindPopup(popup,{maxWidth:225});
  }
  L.polyline([[r.a.lat,r.a.lon],[r.b.lat,r.b.lon]],{color:'#1a6775',weight:3,dashArray:'7 8'}).addTo(mapLayer);
  map.fitBounds([[r.a.lat,r.a.lon],[r.b.lat,r.b.lon]],{padding:[40,35],maxZoom:11});
 }
 function startMap(){
  if(mapPromise)return mapPromise;
  $('map-load').textContent='Loading map…';mapPromise=new Promise((resolve,reject)=>{if(globalThis.L)return resolve();const s=document.createElement('script');s.src='/assets/leaflet-1.9.4.js';s.onload=resolve;s.onerror=reject;document.head.append(s);}).then(()=>{
   const L=globalThis.L;$('ferry-map').textContent='';map=L.map('ferry-map',{scrollWheelZoom:false,dragging:!L.Browser.mobile,tap:false});mapLayer=L.layerGroup().addTo(map);
   L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'}).on('tileerror',()=>{$('map-message').textContent='Some map tiles are unavailable. The terminal directions below still work. Markers show approximate areas; dashed lines are schematic.';}).addTo(map);
   $('map-load').textContent='Reset route view';updateMap(lastPlan.route);
  }).catch(()=>{$('map-message').textContent='The interactive map could not load. Use the terminal directions below.';$('map-load').textContent='Retry map';mapPromise=null;});return mapPromise;
 }
 $('map-load').addEventListener('click',()=>{if(map)updateMap(lastPlan.route);else startMap();});
 function clock(t,zone){return new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(t));}
 function render(){
  const i=inputs();let r=core.routeFor(c,i.route,i.date,i.vehicle,i.direction);
  // The city winter route is Ward's. Keep closed docks selectable for explanation rather than silently changing a visitor's choice.
  const p=core.tripPlan(c,i);lastPlan=p;r=p.route;
  $('route-reason').textContent=r.why;$('boarding-rule').textContent=`${r.buffer} minutes ${r.bufferKind==='operator'?'operator check-in minimum':'planning allowance (verify your operator’s rule)'}, plus your extra margin. ${c.id==='beaver'&&+i.vehicle?'Vehicle check-in uses the operator’s 90-minute minimum.':''}`;
  updateMap(r);
  const notices=p.warnings.map(w=>`<p class="journey-notice warning">${escape(w)}</p>`).join('');
  const extra=c.id==='manitou'?`<p>${escape(r.why)}</p><p><strong>Next step:</strong> read the current NPS access notice, then wait for Manitou Island Transit’s confirmed restart calendar.</p>`:p.events.length?`<p>${escape(r.a.name)} → ${escape(r.b.name)}. ${escape(clock(p.departure,r.a.zone))} departure; approximately ${escape(clock(p.arrival,r.b.zone))} arrival.</p>`:'<p>Once you have an operator departure, enter it at left. The timeline will show when to reach the booth, when you may arrive, and whether the return leaves useful time ashore.</p>';
  $('journey-status').innerHTML=`<h3>${escape(p.availability.title)}</h3><p>${escape(p.availability.text)}</p>${extra}${notices}`;
  $('journey-metrics').innerHTML=p.availability.state==='reference'?`<div><strong>${escape(duration(r.minutes))}</strong><small>Approximate one-way crossing</small></div><div><strong>${p.buffer} min</strong><small>Before departure, with your margin</small></div><div><strong>${p.ashoreMinutes!=null&&p.ashoreMinutes>0?escape(duration(p.ashoreMinutes)):'—'}</strong><small>After outward unloading, before return check-in</small></div>`:'';
  $('journey-timeline').innerHTML=p.events.length?`<ol class="journey-timeline">${p.events.map(e=>`<li class="timeline-stop"><time datetime="${new Date(e.instant).toISOString()}">${escape(clock(e.instant,e.zone))}</time><strong>${escape(e.name)}</strong><small>${escape(e.detail)}</small></li>`).join('')}</ol>${notices}`:`<p class="journey-notice">${p.availability.state==='reference'?'Enter a real outward departure to work backward from the boat. No sailing times are assumed.':escape(p.availability.text)}</p>`;
  if($('road-comparison')){
   const h=Number($('journey-drive-around').value);$('road-comparison').textContent=h>0&&p.availability.state==='reference'?`Your road estimate: ${duration(Math.round(h*60))}. Ferry plan: about ${duration(p.totalMinutes)}${p.drive==null?' plus your drive to the terminal (not supplied)':''}. ${p.drive==null?'Add the terminal drive before comparing totals.':`On these inputs the ferry plan is ${duration(Math.abs(Math.round(h*60)-p.totalMinutes))} ${h*60>=p.totalMinutes?'shorter':'longer'} in elapsed time.`} No road traffic, queues beyond your allowances, or sailing availability are modeled.`:'Add your drive-around estimate to compare elapsed travel time. Ferry availability is checked with the operator.';
  }
  renderBudget(p,i);
 }
 function renderBudget(p,i){
  const o=c.options.find(o=>o.id===i.route||(i.route==='sea-hunter'&&o.id==='hunter'))||(c.options.length===1?c.options[0]:null);
  const f=o?core.fare(c,o,i.date,$('adult-count').value,$('child-count').value,+i.vehicle,i.tripType==='roundtrip'):null;
  const parking=$('journey-parking').value,extras=$('journey-extra').value;
  const host=$('journey-budget');if(!f||p.availability.state!=='reference'){host.textContent='A complete published ferry subtotal is not available for this route, date or group. Check the operator; do not substitute a zero fare.';return;}
  const park=parking===''?null:Math.max(0,Math.min(10000,Number(parking)||0)),extra=extras===''?null:Math.max(0,Math.min(10000,Number(extras)||0));
  host.innerHTML=`<span class="budget-breakdown"><span>Selected service: ${escape(o.name)}</span>${[['Passenger reference',money(f.passengers)],['Vehicle reference',money(f.vehicle)],['Published fees included',money(f.fees)],['Your parking amount',park==null?'Unpriced':money(park)],['Your other costs',extra==null?'Unpriced':money(extra)]].map(([a,b])=>`<span>${escape(a)}: <strong>${escape(b)}</strong></span>`).join('')}<strong>Priced subtotal: ${money(f.total+(park||0)+(extra||0))}</strong><span>${park==null||extra==null?'Incomplete trip budget: blank costs are unpriced.':'A planning sum of published references and your inputs, not an operator checkout quote.'}</span></span>`;
 }
 // Share only explicit form settings. No account or server-side storage is involved.
 const params=new URLSearchParams(location.search);if(params.get('ferryPlan')==='1')for(const id of ids){const el=$(id),value=params.get(id);if(el&&value!=null&&value.length<100){if(el.tagName==='SELECT'){if([...el.options].some(o=>o.value===value))el.value=value;}else{el.value=value;if(!el.validity.valid)el.value=el.defaultValue||'';}}}
 for(const id of ids){const el=$(id);if(el){el.addEventListener('change',render);if(el.type==='number')el.addEventListener('input',render);}}
 $('ferry-form').addEventListener('submit',()=>{render();$('your-timeline').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
 $('journey-share').addEventListener('click',async()=>{const u=new URL(location.href);u.search='';u.hash='crossing-planner';u.searchParams.set('ferryPlan','1');for(const id of ids)if($(id)&&$(id).value!=='')u.searchParams.set(id,$(id).value);try{await navigator.clipboard.writeText(u.href);$('journey-save-status').textContent='Plan link copied. Sailing times are your inputs; recheck the operator before travel.';}catch{$('journey-save-status').textContent='Select and copy your plan link:';let box=$('share-fallback');if(!box){box=document.createElement('input');box.id='share-fallback';box.readOnly=true;box.setAttribute('aria-label','Plan link to copy');$('journey-save-status').after(box);}box.value=u.href;box.select();}});
 $('journey-print').addEventListener('click',()=>window.print());
 for(const img of document.querySelectorAll('.ferry-photo img'))img.addEventListener('error',()=>{img.hidden=true;img.parentNode.classList.add('photo-unavailable');});
 $('trip-date').dispatchEvent(new Event('change'));render();
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){startMap();observer.disconnect();}},{rootMargin:'150px'});observer.observe($('ferry-map'));}
})();
