'use strict';
/* Kodiak access atlas. Never present a launch listing or park as an access permit.
 * LL2 data is exclusively the shared /api/rocket-launch-usa snapshot.
 * No range routes, invented closures, pad trajectories, or public viewing certainty.
 */
(()=>{
 const API='/api/rocket-launch-usa',PLACES='/kodiak-rocket-launch-viewing/places.json';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const $=id=>document.getElementById(id);
 const set=(id,v)=>{const node=$(id);if(node)node.textContent=v??'Not verified';};
 const state={places:[],map:null,pins:new Map(),osm:null,tiles:false,loading:null,request:0,data:null,rocketPins:null,rust:null,selection:'pasagshak'};
 const local=(iso,opts={})=>{const date=new Date(iso||'');return Number.isFinite(+date)?
  date.toLocaleString('en-US',{timeZone:'America/Anchorage',month:'short',day:'numeric',year:'numeric',...opts}):'Not verified';};
 const timing=m=>{
  if(!m||!m.net)return 'Launch time not announced';
  if(!['minute','second','hour'].includes(m.netPrecision)){
   const p=m.netPrecision;
   return (p==='year'?'Year':p==='month'?'Month':'Date')+' only · exact launch time to come ('+local(m.net)+')';
  }
  return local(m.net,{hour:'numeric',minute:'2-digit',timeZoneName:'short'})+
   (m.netPrecision==='hour'?' · hour approximate':' · scheduled target, not launch GO');
 };
 function selectedNational(id){
  const query='?region=alaska'+(id&&UUID.test(id)?'&launchId='+encodeURIComponent(id):'');
  for(const key of ['national-link','bottom-national']){const a=$(key);if(a)a.href='/national-tools/rocket-launch-live/'+query;}
 }
 function present(data,expired){
  state.data=data;
  const region=Array.isArray(data.regions)?data.regions.find(r=>r.id==='alaska'):null;
  const missions=Array.isArray(region?.launches)?region.launches.filter(m=>UUID.test(m.id)):[];
  const selected=data.selectedLaunch?.region==='alaska'?data.selectedLaunch:null;
  const select=$('mission-select');select.replaceChildren();
  for(const m of missions){const op=document.createElement('option');op.value=m.id;op.textContent=(m.name||'Kodiak mission')+' · '+timing(m);select.appendChild(op);}
  if(!missions.length){const op=document.createElement('option');op.textContent='No upcoming Kodiak flight listed here';op.value='';select.appendChild(op);}
  select.disabled=!missions.length;
  if(selected&&missions.some(m=>m.id===selected.id))select.value=selected.id;
  else if(missions.length&&!select.value)select.value=missions[0].id;
  const picked=missions.find(m=>m.id===select.value)||null;
  state.rocketPins?.update(missions,picked?.id);
  set('mission-name',picked?.name||'No upcoming Kodiak flight listed here');
  set('mission-time',timing(picked));
  set('mission-pad',picked?.pad?picked.pad+' · restricted range, not an approach destination':'Restricted range · exact pad not verified');
  set('mission-freshness',data.scheduleCheckedAt?local(data.scheduleCheckedAt,{hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Last calendar update unavailable');
  let note='';
  if(expired)note+='The flight you followed is no longer on this calendar. Check Alaska Aerospace for its status. ';
  note+=region?.feedState==='unavailable'?
   'The Kodiak calendar isn’t loading. Check Alaska Aerospace. ':
   'This public calendar can miss government and short-notice flights. ';
  note+=data.scheduleFreshness==='stale'?
   'The listed launch time may be out of date. ':data.scheduleFreshness==='recent'?
   'The calendar was checked recently, but launch is not approved by this listing. ':'The last calendar update time is unknown. ';
  if(data.scheduleWarning)note+=data.scheduleWarning;
  set('feed-detail',note);
  set('mission-advice',picked?
   'A rocket on the calendar doesn’t open Narrow Cape. Check Alaska Aerospace road and access notices before driving. We have not confirmed a public viewing area for this flight.':
   'No upcoming launch is listed here. The range may still be active, and government flights might not be announced in advance.');
  window.RocketFoundryHandoff?.loaded('alaska',picked?.id,picked?.name);
  selectedNational(picked?.id);
  const url=new URL(location.href);
  if(picked?.id)url.searchParams.set('launchId',picked.id);else url.searchParams.delete('launchId');
  history.replaceState(null,'',url.pathname+url.search+url.hash);
 }
 async function loadMission(id,expired=false){
  const serial=++state.request,params=new URLSearchParams({region:'alaska'});
  if(id&&UUID.test(id))params.set('launchId',id);
  $('mission-select').disabled=true;set('feed-detail','Checking the next published Kodiak flight…');
  try{
   const response=await fetch(API+'?'+params.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
   if(serial!==state.request)return;
   if(response.status===404&&id&&!expired){await loadMission(null,true);return;}
   const data=await response.json();
   if(serial!==state.request)return;
   if(!response.ok||!data?.ok||data.region?.id!=='alaska')throw Error('Source unavailable');
   present(data,expired);
  }catch{
   if(serial!==state.request)return;
   state.data=null;state.rocketPins?.update([],null);
   set('mission-name','Kodiak launch calendar unavailable');
   set('mission-time','Not verified');
   set('mission-pad','Restricted range · no visit directions');
   set('mission-freshness','Source unavailable');
   set('feed-detail','The public launch calendar isn’t loading. That doesn’t mean a rocket launched or was cancelled.');
   set('mission-advice','Check the operator for the latest flight and road update. Don’t use an old countdown as a reason to enter a restricted area.');
   const select=$('mission-select');select.replaceChildren();
   const op=document.createElement('option');op.textContent='Source unavailable';select.appendChild(op);select.disabled=true;
   selectedNational(null);
  }
 }
 async function loadPlaces(){
  if(state.places.length)return state.places;
  const response=await fetch(PLACES,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Geography unavailable');
  const data=await response.json();
  if(data.schemaVersion!==1||!Array.isArray(data.places)||data.places.length!==2||
   new Set(data.places.map(x=>x.id)).size!==2||
   !data.places.every(p=>['pasagshak','range'].includes(p.id)&&
     Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>57.3&&p.lat<57.55&&p.lon> -152.6&&p.lon< -152.2&&
     /^https:\/\//.test(p.source)&&/^https:\/\//.test(p.access)))throw Error('Unverified map reference');
  state.places=data.places;return state.places;
 }
 async function leaflet(){
  if(window.L?.map)return;
  if(state.loading)return state.loading;
  state.loading=new Promise((resolve,reject)=>{
   const style=document.createElement('link');style.rel='stylesheet';style.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(style);
   const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
   script.onload=()=>window.L?.map?resolve():reject(Error('Map library did not load'));
   script.onerror=()=>reject(Error('Map library failed'));document.head.appendChild(script);
  });return state.loading;
 }
 function renderRustPlace(id){
  const panel=$('k-rust-place-status');
  if(!panel||!state.rust)return;
  const kind=state.rust.placeClass(id);
  if(kind===1){
    panel.textContent='Pasagshak is a published recreation-area reference, not an approved launch viewpoint. Verify road closures and park access with the managing agencies.';
  }else if(kind===2){
    panel.textContent='Restricted working launch range. Do not use the spaceport map reference as an approach, spectator viewpoint, parking location or invitation to enter.';
  }else return;
  panel.dataset.decisionEngine='rust-wasm';
  panel.hidden=false;
 }
 async function enableRust(){
  try{
   const places=await loadPlaces();
   const engine=await window.RocketRangeRust?.load('kodiak',places.map(p=>p.id));
   if(!engine)return;
   state.rust=engine;
   renderRustPlace(state.selection);
  }catch(_){
   // Original source-linked HTML and map remain usable if Rust is blocked.
  }
 }
 function choose(id,focus=true){
  const place=state.places.find(x=>x.id===id);if(!place)return;
  state.selection=id;renderRustPlace(id);
  document.querySelectorAll('.place').forEach(card=>{card.dataset.selected=card.id==='place-'+id?'true':'false';});
  document.querySelectorAll('[data-map-place]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mapPlace===id?'true':'false'));
  if(focus&&state.map){state.map.panTo([place.lat,place.lon],{animate:false});state.pins.get(id)?.openPopup();}
  set('map-status',place.coordinateRole+'. This is not an approved launch-viewing spot or permission to drive toward the range.');
 }
 function pinIcon(p){return window.L.divIcon({className:'k-icon-wrap',html:'<span class="k-pin'+(p.kind==='restricted-range'?' is-range':'')+'">'+(p.kind==='restricted-range'?'!':'P')+'</span>',iconSize:[37,37],iconAnchor:[18,18]});}
 async function startMap(){
  if(state.map)return;
  const button=$('load-map');if(button){button.disabled=true;button.textContent='Loading map…';}
  try{
   const places=await loadPlaces();await leaflet();
   const root=$('k-map');root.replaceChildren();root.setAttribute('role','region');
   const L=window.L,map=L.map(root,{scrollWheelZoom:false,zoomControl:true,preferCanvas:true});
   state.map=map;
   const attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
   const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution,maxZoom:18}).addTo(map);
   state.osm=osm;
   osm.on('tileload',()=>{state.tiles=true;});
   osm.on('tileerror',()=>{if(!state.tiles)set('map-status','The map background isn’t loading. Use the official park and spaceport links beside it.');});
   for(const p of places){
    const marker=L.marker([p.lat,p.lon],{icon:pinIcon(p),keyboard:true,title:p.name});
    const content=document.createElement('div');content.className='k-popup';
    const title=document.createElement('strong');title.textContent=p.name;
    const msg=document.createElement('p');msg.textContent=p.coordinateRole;
    const link=document.createElement('a');link.href=p.access;link.textContent='Check official access rules';link.target='_blank';link.rel='noopener noreferrer';
    content.append(title,msg,link);marker.bindPopup(content);marker.on('click',()=>choose(p.id,false));
    marker.addTo(map);state.pins.set(p.id,marker);
   }
   map.fitBounds(places.map(p=>[p.lat,p.lon]),{padding:[35,35],maxZoom:11,animate:false});
   state.rocketPins=window.RocketMapPins?.mount(map,{
     region:'alaska',centers:{alaska:{lat:57.43,lon:-152.34}},
     onSelect:id=>{void loadMission(id);}
   });
   state.rocketPins?.update(state.data?.regions?.find(r=>r.id==='alaska')?.launches||[],
     state.data?.selectedLaunchId);
   set('map-status','The public park and restricted spaceport are on the map for context. No launch parking, pad route or live closure is shown.');
   if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map.invalidateSize()).observe(root);
   fetch('/api/carto-basemap-config',{signal:AbortSignal.timeout(5500)}).then(r=>r.ok?r.json():null).then(c=>{
    if(c?.provider!=='CARTO'||!c.key?.trim())return;
    const keyed='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(c.key.trim());
    const carto=L.tileLayer(keyed,{subdomains:'abcd',maxZoom:19,attribution:attribution+' &copy; <a href="https://carto.com/attributions">CARTO</a>'});
    let loaded=false,failures=0;
    carto.on('tileload',()=>{if(!loaded&&map.hasLayer(carto)){loaded=true;map.removeLayer(osm);}});
    carto.on('tileerror',()=>{if(++failures>2&&!loaded&&map.hasLayer(carto)){map.removeLayer(carto);if(!map.hasLayer(osm))osm.addTo(map);}});
    carto.addTo(map);
   }).catch(()=>{});
  }catch{set('map-status','The map isn’t loading. You can still follow the state park and Alaska Aerospace links.');if(button){button.disabled=false;button.textContent='Retry map';}}
 }
 $('load-map')?.addEventListener('click',()=>{void startMap();});
 document.querySelectorAll('[data-map-place]').forEach(b=>b.addEventListener('click',async()=>{
  if(!state.map)await startMap();choose(b.dataset.mapPlace);
 }));
 $('mission-select')?.addEventListener('change',e=>{if(UUID.test(e.target.value))void loadMission(e.target.value);});
 const id=new URL(location.href).searchParams.get('launchId');
 void loadMission(id&&UUID.test(id)?id:null);
 void enableRust();
})();
