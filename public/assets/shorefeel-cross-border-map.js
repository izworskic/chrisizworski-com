(function(){
 'use strict';
 const $=id=>document.getElementById(id),host=$('gl-explorer'),legacy=$('legacy-explorer');
 if(!host||!legacy)return;
 const geometry=window.ShoreMapGeometry;
 const STATES={MI:'Michigan',WI:'Wisconsin',MN:'Minnesota',IL:'Illinois',IN:'Indiana',OH:'Ohio',PA:'Pennsylvania',NY:'New York',ON:'Ontario'};
 const BATCH=4,MAX_VIEW=24,LIST_PAGE=24;
 let beaches=[],matching=[],byKey=new Map(),lake='All',region='All',query='',selected=null,group=null,limit=LIST_PAGE,units='F',map=null,layer=null,pins=new Map(),viewportRequest=null,detailRequest=null,detailRow=null,viewTimer=null,searchTimer=null,tileLoaded=false,tileErrors=0;
 const cache=new Map(),now=()=>Date.now();
 const text=(id,value)=>{$(id).textContent=value;};
 const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const label=b=>[b.town||b.county&&b.county+' County',STATES[b.region],b.lake?'Lake '+b.lake:'Lake not classified'].filter(Boolean).join(' · ');
 const fmt=f=>Number.isFinite(f)?Math.round(units==='F'?f:(f-32)*5/9)+'°'+units:'Unavailable';
 const time=iso=>Number.isFinite(Date.parse(iso))?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short',timeZone:'UTC'}).format(new Date(iso)):'Unavailable';
 function link(id,href,caption){const a=$(id);a.hidden=!href;if(href){a.href=href;a.textContent=caption;}else a.removeAttribute('href');}
 function fresh(id){
  const item=cache.get(id);
  if(!item||item.until<=now())return null;
  if(item.row.status==='forecast-based'&&geometry.temperature(item.row,now())===null)return null;
  return item.row;
 }
 function remember(row){
  if(!byKey.has(row?.id)||!['forecast-based','upcoming','unavailable'].includes(row.status))return;
  const expiry=Date.parse(row.validUntil);
  cache.set(row.id,{row,until:Math.min(now()+(row.status==='unavailable'?45000:120000),Number.isFinite(expiry)?expiry:Infinity)});
 }
 function refreshPins(){
  for(const [id,marker] of pins){
   const el=marker.getElement(),node=el?.querySelector('.gl-temperature');if(!node)continue;
   const row=fresh(id),value=geometry.temperature(row,now());
   node.textContent=value!==null?fmt(value):row?'—':'•';
   node.classList.toggle('has-value',value!==null);node.classList.toggle('no-value',!!row&&value===null);
   const caption=byKey.get(id).name+(value===null?row?', no current forecast':', forecast not loaded':', ShoreFeel '+fmt(value));
   el.setAttribute('aria-label',caption);el.title=caption;
  }
 }
 function clearDetail(){
  if(detailRequest)detailRequest.abort();
  selected=null;detailRow=null;$('gl-detail').hidden=true;$('gl-select-hint').hidden=false;
  const u=new URL(location.href);u.searchParams.delete('id');u.searchParams.delete('beach');history.replaceState(null,'',u);
 }
 function renderHours(row){
  const target=$('gl-hours');target.replaceChildren();
  const rows=(row.hours||[]).filter(h=>Number.isFinite(h.feelsLikeF)&&Number.isFinite(Date.parse(h.validAt))&&Date.parse(h.validAt)+3600000>now());
  $('gl-hour-section').hidden=!rows.length;
  for(const h of rows){
   const div=document.createElement('div'),stamp=document.createElement('span'),v=document.createElement('strong');
   stamp.textContent=time(h.validAt);v.textContent=fmt(h.feelsLikeF);div.append(stamp,v);target.append(div);
  }
 }
 function renderDetail(row){
  if(!selected)return;
  const current=row?.status==='forecast-based'&&geometry.temperature(row,now())!==null;
  const upcoming=row?.status==='upcoming'&&Date.parse(row.validAt)>now()&&Number.isFinite(row.feelsLikeF);
  text('gl-feel',current||upcoming?fmt(row.feelsLikeF):row?'Unavailable':'Checking…');
  text('gl-feel-label',upcoming?'Upcoming forecast':'ShoreFeel near the beach');
  text('gl-air',current||upcoming?fmt(row.airF):'—');
  text('gl-wind',(current||upcoming)&&Number.isFinite(row.windMph)?(units==='F'?Math.round(row.windMph)+' mph':Math.round(row.windMph*1.609344)+' km/h')+(row.windFrom?' '+row.windFrom:''):'—');
  const water=row?.water,waterOK=water&&Number.isFinite(water.tempF)&&now()-Date.parse(water.observedAt)>=0&&now()-Date.parse(water.observedAt)<=36*3600000;
  text('gl-water',waterOK?fmt(water.tempF):'—');
  text('gl-water-note',waterOK?'NOAA offshore analysis · '+water.distanceKm+' km away · '+time(water.observedAt):'No verified nearby offshore reading');
  const source=current||upcoming?row.method+' · valid '+time(row.validAt)+' · issued '+time(row.issuedAt)+(row.forecastReference?.kind==='city-area'?' · '+row.forecastReference.name+' ('+row.forecastReference.distanceKm+' km away)':''):(row?.reason||(row?'The previous forecast has expired. Select the beach again to refresh.':'Checking the official forecast.'));
  text('gl-source',source);
  text('gl-influence',waterOK&&row?.lakeEffect?.explanation?row.lakeEffect.explanation:'Water and wind can influence the air at the shore. No measured or calibrated beach-air correction is available.');
  renderHours(current||upcoming?row:{});
 }
 async function select(b,focusMap=false,userAction=false){
  if(!b)return;
  if(detailRequest)detailRequest.abort();
  selected=b;detailRow=null;$('gl-detail').hidden=false;$('gl-select-hint').hidden=true;
  text('gl-name',b.name);text('gl-place',label(b));text('gl-story',b.story||'Check the wind and nearby forecast before heading to the shore.');
  $('gl-alert').hidden=!b.accessAlert;text('gl-alert',b.accessAlert||'');
  link('gl-guide',b.guide,b.guide?.includes('?beach=')?'Share beach location':'Read the beach guide');
  link('gl-official',b.officialUrl,'Official beach information');
  link('gl-advisory',b.advisoryUrl,b.advisoryName||'Official beach advisories');
  link('gl-directions','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(b.name+', '+(b.town||b.county||'')+' '+STATES[b.region]),'Find on Google Maps');
  renderDetail(null);renderList();
  if(map&&focusMap)map.setView([b.lat,b.lon],Math.max(12,map.getZoom()),{animate:false});
  draw();
  if(userAction){$('gl-name').focus({preventScroll:true});if(matchMedia('(max-width:760px)').matches)$('gl-detail').scrollIntoView({block:'start',behavior:'instant'});}
  const u=new URL(location.href);u.searchParams.set('id',b.id);u.searchParams.delete('beach');history.replaceState(null,'',u);
  const controller=new AbortController();detailRequest=controller;
  try{
   const response=await fetch('/api/shorefeel-us?id='+encodeURIComponent(b.id),{signal:controller.signal});
   if(!response.ok)throw Error('Forecast unavailable');
   const body=await response.json(),row=body.results?.find(x=>x.id===b.id);
   if(controller.signal.aborted||selected?.id!==b.id)return;
   if(body.version!=='shorefeel-2.0'||!row)throw Error('Forecast unavailable');
   detailRow=row;remember(row);renderDetail(row);refreshPins();
  }catch(e){if(controller.signal.aborted||selected?.id!==b.id)return;detailRow={id:b.id,status:'unavailable',reason:'The forecast could not be retrieved. Official beach information remains available.'};renderDetail(detailRow);}
 }
 function renderList(){
  const rows=group||matching,target=$('gl-results');target.replaceChildren();
  text('gl-count',rows.length+' beach '+(rows.length===1?'record':'records')+(group?' in this group':' matching'));
  $('gl-clear-group').hidden=!group;$('gl-more').hidden=rows.length<=limit;$('gl-no-match').hidden=rows.length!==0;
  for(const b of rows.slice(0,limit)){
   const li=document.createElement('li'),btn=document.createElement('button'),title=document.createElement('strong'),sub=document.createElement('span');
   btn.type='button';btn.dataset.id=b.id;btn.setAttribute('aria-pressed',String(selected?.id===b.id));
   title.textContent=b.name;sub.textContent=label(b);btn.append(title,sub);btn.addEventListener('click',()=>select(b,true,true));li.append(btn);target.append(li);
  }
 }
 function fit(rows){
  if(!map||!rows.length)return;
  map.fitBounds(window.L.latLngBounds(rows.map(b=>[b.lat,b.lon])),{padding:[38,38],maxZoom:12,animate:false});
 }
 function filters(){
  group=null;limit=LIST_PAGE;const words=norm(query).split(' ').filter(Boolean);
  matching=beaches.filter(b=>{
   if(lake!=='All'&&b.lake!==lake||region!=='All'&&(region==='CA'?b.country!=='CA':region==='MI'?b.region!=='MI':b.country!=='US'))return false;
   const hay=norm([b.name,b.town,b.county,b.area,STATES[b.region],b.region,b.country,b.country==='CA'?'Canada':'United States',b.lake?'Lake '+b.lake:'',...b.aliases,...b.refs.map(r=>r.key+' '+r.forecast.key)].join(' '));
   return words.every(w=>hay.includes(w));
  });
  if(selected&&!matching.some(b=>b.id===selected.id))clearDetail();
  renderList();fit(matching);draw();schedule();
 }
 function draw(){
  if(!map||!layer)return;
  layer.clearLayers();pins.clear();
  const bounds=map.getBounds().pad(.06);
  const points=matching.filter(b=>bounds.contains([b.lat,b.lon])).map(b=>{const p=map.latLngToContainerPoint([b.lat,b.lon]);return {x:p.x,y:p.y,b};});
  const groups=geometry.cluster(points);let represented=0;
  for(const g of groups){
   const members=g.members.map(p=>p.b),b=g.anchor.b,count=members.length;represented+=count;
   const icon=window.L.divIcon({className:'gl-map-icon',html:count>1?'<span class="gl-cluster">'+count+'</span>':'<span class="gl-temperature">•</span>',iconSize:[54,38],iconAnchor:[27,19]});
   const marker=window.L.marker([b.lat,b.lon],{icon,title:count>1?count+' beaches. Zoom in or choose from group.':b.name,keyboard:true}).addTo(layer);
   const el=marker.getElement();if(el&&members.some(x=>x.id===selected?.id))el.classList.add('gl-selected');
   if(count===1){pins.set(b.id,marker);marker.on('click',()=>select(b,false,true));}
   else marker.on('click',()=>{
    group=members;limit=LIST_PAGE;renderList();
    if(map.getZoom()<16){
     const before=map.getZoom(),box=window.L.latLngBounds(members.map(x=>[x.lat,x.lon]));
     map.fitBounds(box,{padding:[42,42],maxZoom:16,animate:false});
     if(map.getZoom()<=before)map.setView([b.lat,b.lon],Math.min(16,before+2),{animate:false});
    }
    if(map.getZoom()>=16)$('gl-list-heading').scrollIntoView({block:'nearest'});
   });
  }
  $('gl-map').dataset.represented=String(represented);refreshPins();
  text('gl-map-status',represented+' beach records in view · numbered circles are groups');
  $('gl-load-more').hidden=!pendingIds().length;
 }
 function pendingIds(){
  if(!map||map.getZoom()<8)return [];
  const bounds=map.getBounds(),center=map.getCenter();
  return [...pins.keys()].filter(id=>!fresh(id)&&bounds.contains([byKey.get(id).lat,byKey.get(id).lon])).sort((a,b)=>{
   const x=byKey.get(a),y=byKey.get(b);return center.distanceTo([x.lat,x.lon])-center.distanceTo([y.lat,y.lon]);
  });
 }
 async function loadVisible(){
  if(!map)return;
  if(viewportRequest)viewportRequest.abort();
  const ids=pendingIds().slice(0,MAX_VIEW);
  if(!ids.length){$('gl-load-more').hidden=true;return;}
  const controller=new AbortController();viewportRequest=controller;
  $('gl-load-more').disabled=true;text('gl-temperature-status','Loading forecasts for visible beaches…');
  for(let i=0;i<ids.length&&!controller.signal.aborted;i+=BATCH){
   const batch=ids.slice(i,i+BATCH);
   try{
    const r=await fetch('/api/shorefeel-us?ids='+encodeURIComponent(batch.join(',')),{signal:controller.signal});
    if(!r.ok)throw Error('Forecast unavailable');
    const body=await r.json();if(controller.signal.aborted)return;
    if(body.version!=='shorefeel-2.0'||!Array.isArray(body.results))throw Error('Forecast unavailable');
    for(const row of body.results)if(batch.includes(row.id))remember(row);
   }catch(e){if(controller.signal.aborted)return;for(const id of batch)remember({id,status:'unavailable'});}
   refreshPins();
  }
  if(controller.signal.aborted)return;
  $('gl-load-more').disabled=false;$('gl-load-more').hidden=!pendingIds().length;
  text('gl-temperature-status','Temperatures appear as forecasts arrive. A dash means no current forecast was verified.');
 }
 function schedule(){
  if(viewportRequest)viewportRequest.abort();$('gl-load-more').disabled=false;clearTimeout(viewTimer);viewTimer=setTimeout(loadVisible,220);
 }
 function initMap(){
  if(!window.L||!geometry){$('gl-map-shell').hidden=true;text('gl-map-status','Map unavailable. Search and select a beach from the list.');return;}
  try{
   const surface=$('gl-map'),keepPinch=event=>{if(event.touches?.length>1&&event.cancelable)event.preventDefault();};
   surface.addEventListener('touchstart',keepPinch,{passive:false,capture:true});
   surface.addEventListener('touchmove',keepPinch,{passive:false,capture:true});
   map=window.L.map(surface,{scrollWheelZoom:false,touchZoom:true,dragging:true,zoomControl:true,maxZoom:16,zoomAnimation:false}).setView([44.8,-84.8],5);
   const tiles=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:16,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'});
   tiles.on('tileload',()=>{tileLoaded=true;tileErrors=0;$('gl-tile-note').hidden=true;});
   tiles.on('tileerror',()=>{if(++tileErrors>=3&&!tileLoaded)$('gl-tile-note').hidden=false;});
   tiles.addTo(map);layer=window.L.layerGroup().addTo(map);
   map.on('movestart zoomstart',()=>{if(viewportRequest)viewportRequest.abort();clearTimeout(viewTimer);});
   map.on('moveend zoomend resize',()=>{draw();schedule();});
   setTimeout(()=>{if(!tileLoaded)$('gl-tile-note').hidden=false;},8000);
   fit(matching);draw();schedule();
  }catch(e){if(map)map.remove();map=null;layer=null;$('gl-map-shell').hidden=true;text('gl-map-status','Map unavailable. Search and select a beach from the list.');}
 }
 function setUnits(value){
  units=value;for(const b of host.querySelectorAll('[data-units]'))b.setAttribute('aria-pressed',String(b.dataset.units===units));
  refreshPins();if(selected)renderDetail(detailRow);
 }
 async function start(){
  host.hidden=false;legacy.hidden=true;document.body.classList.add('gl-active');
  try{
   if(!geometry)throw Error('Map helpers unavailable');
   const res=await fetch('/assets/great-lakes-beach-registry.json');if(!res.ok)throw Error('Catalog unavailable');
   const data=await res.json();
   if(data.version!==1||!Array.isArray(data.beaches)||data.beaches.length<50||data.beaches.length>5000)throw Error('Catalog unavailable');
   beaches=data.beaches.filter(b=>typeof b.id==='string'&&typeof b.name==='string'&&Number.isFinite(b.lat)&&Number.isFinite(b.lon)&&Array.isArray(b.refs)&&Array.isArray(b.aliases));
   if(beaches.length!==data.beaches.length)throw Error('Invalid catalog');
   for(const b of beaches){byKey.set(b.id,b);for(const ref of b.refs){byKey.set(ref.key,b);byKey.set(ref.forecast.key,b);}}
   matching=beaches;
   text('gl-coverage',beaches.length.toLocaleString('en-US')+' beach records across eight U.S. states and Ontario. Coverage is not exhaustive.');
   $('gl-search').disabled=false;renderList();initMap();
   $('gl-search').addEventListener('input',e=>{clearTimeout(searchTimer);query=e.target.value;searchTimer=setTimeout(filters,160);});
   host.querySelectorAll('[data-gl-lake]').forEach(btn=>btn.addEventListener('click',()=>{
    lake=btn.dataset.glLake;host.querySelectorAll('[data-gl-lake]').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));filters();
   }));
   $('gl-region').addEventListener('change',e=>{region=e.target.value;filters();});
   host.querySelectorAll('[data-units]').forEach(btn=>btn.addEventListener('click',()=>setUnits(btn.dataset.units)));
   $('gl-more').addEventListener('click',()=>{limit+=LIST_PAGE;renderList();});
   $('gl-clear-group').addEventListener('click',()=>{group=null;limit=LIST_PAGE;renderList();});
   $('gl-load-more').addEventListener('click',loadVisible);
   const q=new URLSearchParams(location.search),b=byKey.get(q.get('id')||q.get('beach'));if(b)select(b,true);
   setInterval(()=>{refreshPins();if(selected&&detailRow)renderDetail(detailRow);if(map)$('gl-load-more').hidden=!pendingIds().length;},30000);
  }catch(e){
   if(map){try{map.remove();}catch{}}
   host.hidden=true;legacy.hidden=false;document.body.classList.remove('gl-active');
   if(typeof window.startLegacyShoreFeel==='function')window.startLegacyShoreFeel();
  }
 }
 start();
})();
