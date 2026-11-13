'use strict';
/* Source-first Starbase viewing guide. Static place references keep the map
   usable when the shared launch/notice API fails; launch pad only uses real
   LL2 mission GPS. Region/mission continuity uses the national UUID. */
(()=>{
 const API='/api/rocket-launch-usa',PLACES='/starbase-rocket-launch-viewing/places.json';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const $=id=>document.getElementById(id),set=(id,value)=>{const x=$(id);if(x)x.textContent=value??'Not verified'};
 const state={request:0,places:[],site:'isla-blanca',profile:'first-time',map:null,markers:new Map(),
   padMarker:null,bearingLine:null,data:null,rocketPins:null,tilesReady:false,sourceAvailable:false,rust:null};
 const allowedIds=new Set(['isla-blanca','zapata','lighthouse']);
 const profiles={
  'first-time':{hint:'Start at Isla Blanca County Park for a documented public viewing spot. Expect crowds for major flights and check parking before you go.',order:['isla-blanca','zapata','lighthouse']},
  'no-causeway':{hint:'Want to skip the causeway? Look into mainland spots near Port Isabel, but check each place’s hours and actual view.',order:['zapata','lighthouse','isla-blanca']},
  history:{hint:'The Port Isabel Lighthouse is worth visiting, but it has no confirmed special opening for a Starship launch.',order:['lighthouse','zapata','isla-blanca']}
 };
 const src=(url,label)=>{
  const a=document.createElement('a');a.href=url;a.textContent=label;
  a.target='_blank';a.rel='noopener noreferrer';return a;
 };
 function selection(){
  const site=state.places.find(x=>x.id===state.site);
  if(!site)return;
  set('sb-selected-name',site.name);
  set('sb-selected-context',site.scene+' '+site.accessNote);
  const d=state.data?.starbaseViewing?.sites?.find(x=>x.id===site.id);
  set('sb-selected-geometry',Number.isFinite(d?.padDistanceMiles)&&Number.isFinite(d?.padBearingDegrees)?
   'This place is roughly '+d.padDistanceMiles.toFixed(1)+' miles in a straight line from the selected mission’s pad, at an approximate '+Math.round(d.padBearingDegrees)+'° bearing. This is not a driving route or the rocket’s flight track or verified unobstructed view.':
   'The pad location isn’t confirmed for this flight, so no reliable distance or direction is shown.');
  const actions=$('sb-selected-actions');actions.replaceChildren();
  if(site.accessSource?.startsWith('https://')) actions.appendChild(src(site.accessSource,'Check the land manager'));
  if(site.geographicSource?.startsWith('https://'))actions.appendChild(src(site.geographicSource,'See the location source'));
  const cards=[...document.querySelectorAll('[data-site]')];
  for(const card of cards)card.dataset.active=card.dataset.site===site.id?'true':'false';
  for(const button of document.querySelectorAll('[data-site-select]')){
   const yes=button.dataset.siteSelect===site.id;
   button.setAttribute('aria-pressed',yes?'true':'false');
   button.textContent=yes?'Selected on map':'Locate on map';
  }
  for(const [id,marker] of state.markers)marker.setIcon(publicIcon(id===site.id));
  if(state.map&&state.markers.has(site.id)){
   const marker=state.markers.get(site.id);
   marker.setZIndexOffset(yesNumber(site.id)*10);
  }
 }
 function yesNumber(id){return id===state.site?700:0}
 function chooseSite(id,move=true){
  if(!allowedIds.has(id)||!state.places.some(x=>x.id===id))return;
  state.site=id;selection();
  // Recompute the optional straight-line comparison for this exact choice.
  if(state.map)displayPad();
  const marker=state.markers.get(id);
  if(marker&&state.map&&move)state.map.panTo(marker.getLatLng(),{animate:false});
 }
 async function enableRustPreferences(){
  const engine=await window.RocketRustViewing?.load('starbase',state.places.map(x=>x.id));
  if(!engine)return;
  state.rust=engine;
  const list=$('sb-place-list');if(list)list.dataset.decisionEngine='rust-wasm';
  changeProfile(state.profile);
 }
 function changeProfile(profile){
  if(!profiles[profile])return;
  state.profile=profile;set('sb-profile-reason',profiles[profile].hint);
  const list=$('sb-place-list');
  const order=state.rust?.order(profile)||profiles[profile].order;
  for(const id of order){
   const card=$(id);if(card)list.appendChild(card);
  }
  chooseSite(order[0],true);
 }
 function publicIcon(selected){
  return window.L.divIcon({className:'sb-public-pin'+(selected?' is-selected':''),
   iconSize:selected?[20,20]:[16,16],iconAnchor:selected?[10,10]:[8,8]});
 }
 function setMapStatus(value){set('sb-map-status',value)}
 function fallbackMap(message){
  const x=$('sb-map');if(x)x.dataset.tiles='unavailable';
  setMapStatus(message+' The source-linked place cards and OpenStreetMap link remain available.');
 }
 function addPlacesToMap(){
  if(!state.map||!window.L)return;
  for(const marker of state.markers.values())state.map.removeLayer(marker);
  state.markers.clear();
  const bounds=[];
  for(const site of state.places){
   if(!Number.isFinite(site.lat)||!Number.isFinite(site.lon))continue;
   const marker=window.L.marker([site.lat,site.lon],{icon:publicIcon(site.id===state.site)});
   const popup=document.createElement('div');
   const heading=document.createElement('strong');heading.textContent=site.name;popup.appendChild(heading);
   const note=document.createElement('p');note.textContent='This pin marks the general place, not a parking entrance or reserved launch-viewing spot.';popup.appendChild(note);
   if(site.accessSource?.startsWith('https://'))popup.appendChild(src(site.accessSource,'Check land manager'));
   marker.bindPopup(popup);marker.on('click',()=>chooseSite(site.id,false));
   marker.addTo(state.map);state.markers.set(site.id,marker);bounds.push([site.lat,site.lon]);
  }
  if(bounds.length)state.map.fitBounds(bounds,{padding:[30,30],maxZoom:11,animate:false});
 }
 function displayPad(){
  if(!state.map)return;
  if(state.padMarker)state.map.removeLayer(state.padMarker);
  if(state.bearingLine)state.map.removeLayer(state.bearingLine);
  state.padMarker=null;state.bearingLine=null;
  const pad=state.data?.starbaseViewing?.pad;
  if(!pad||!Number.isFinite(pad.lat)||!Number.isFinite(pad.lon)){
   setMapStatus('Three possible viewing areas are on the map. We don’t have a confirmed pad location for this flight yet.');
   return;
  }
  const icon=window.L.divIcon({className:'sb-restricted-pin',iconSize:[18,18],iconAnchor:[9,9]});
  const marker=window.L.marker([pad.lat,pad.lon],{icon});
  const popup=document.createElement('div');
  const head=document.createElement('strong');head.textContent='RESTRICTED launch pad — '+pad.name;
  popup.appendChild(head);
  const p=document.createElement('p');p.textContent='This is a restricted launch pad, not a public route or a prediction of the rocket’s path.';popup.appendChild(p);
  marker.bindPopup(popup).addTo(state.map);state.padMarker=marker;
  const site=state.places.find(x=>x.id===state.site);
  // Intentional: only one straight-line comparison, never a route polyline.
  if(site){
   state.bearingLine=window.L.polyline([[site.lat,site.lon],[pad.lat,pad.lon]],
    {color:'#cb7644',weight:2,dashArray:'7 7',opacity:.85,interactive:false}).addTo(state.map);
  }
  setMapStatus('The public places and restricted pad are on the map. The dashed line points toward the pad, not along the rocket’s path or a road.');
 }
 function setTileReady(){
  state.tilesReady=true;const root=$('sb-map');if(root)root.dataset.tiles='ready';
 }
 function initMap(){
  if(state.map||!window.L||!state.places.length){
   if(!window.L)fallbackMap('The map isn’t loading. The places and official access links are still listed below.');
   return;
  }
  try{
   const node=$('sb-map');const map=window.L.map(node,{scrollWheelZoom:false,preferCanvas:true});
   state.map=map;
   const credit='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
   const osm=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:19,attribution:credit}).addTo(map);
   osm.on('tileload',setTileReady);
   osm.on('tileerror',()=>{if(!state.tilesReady)fallbackMap('Map images aren’t loading. Try the listed places and official links instead.');});
   addPlacesToMap();displayPad();selection();
      state.rocketPins=window.RocketMapPins?.mount(map,{
       region:'texas',centers:{texas:{lat:25.997,lon:-97.157}},
       onSelect:id=>{void loadMission(id);}
      });
      state.rocketPins?.update(state.data?.regions?.find(r=>r.id==='texas')?.launches||[],
       state.data?.selectedLaunchId);
   // Optional existing licensed CARTO configuration, never an unkeyed endpoint.
   fetch('/api/carto-basemap-config',{signal:AbortSignal.timeout(5000)})
    .then(r=>r.ok?r.json():null).then(config=>{
     if(config?.provider!=='CARTO'||!config.key?.trim())return;
     const url='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(config.key);
     const tile=window.L.tileLayer(url,{subdomains:'abcd',maxZoom:19,attribution:credit+' &copy; <a href="https://carto.com/attributions">CARTO</a>'});
     let ready=false;
     tile.on('tileload',()=>{
      if(!ready&&state.map?.hasLayer(tile)){ready=true;setTileReady();map.removeLayer(osm);}
     });
     tile.on('tileerror',()=>{if(!ready&&map.hasLayer(tile)){map.removeLayer(tile);osm.addTo(map);}});
     tile.addTo(map);
    }).catch(()=>{});
  }catch(err){fallbackMap('The interactive map could not initialize.');}
 }
 async function loadPlaces(){
  try{
   const response=await fetch(PLACES,{headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Place manifest offline');
   const payload=await response.json();
   if(payload.schemaVersion!==1||!Array.isArray(payload.sites)||payload.sites.length!==3)throw Error('Invalid geographic source');
   if(!payload.sites.every(x=>allowedIds.has(x.id)&&Number.isFinite(x.lat)&&Number.isFinite(x.lon)
      &&x.lat>25.8&&x.lat<26.2&&x.lon< -97&&x.lon> -97.5))throw Error('Untrusted place geometry');
   state.places=payload.sites;initMap();chooseSite(state.site,false);
   void enableRustPreferences();
  }catch{fallbackMap('Viewing-place coordinates aren’t loading. Check the official place links.');}
 }
 function fmtDate(iso,precision){
  const d=new Date(iso||'');if(!Number.isFinite(+d))return 'Launch time not confirmed';
  if(['month','year','date-tbd'].includes(precision))return 'Date is tentative; exact liftoff time to come';
  const opts={timeZone:'America/Chicago',year:'numeric',month:'short',day:'numeric'};
  if(['minute','second','hour'].includes(precision)){opts.hour='numeric';opts.minute='2-digit';opts.timeZoneName='short';}
  return new Intl.DateTimeFormat('en-US',opts).format(d)+(precision==='day'?' · launch hour TBD':' · target, not guaranteed');
 }
 function safeStamp(iso){
  const d=new Date(iso||'');return Number.isFinite(+d)?
   d.toLocaleString('en-US',{timeZone:'America/Chicago',dateStyle:'medium',timeStyle:'short'})+' CT':'time unavailable';
 }
 function deepLink(id){
  const tail=id&&UUID.test(id)?'&launchId='+encodeURIComponent(id):'';
  for(const name of ['sb-national-link','sb-bottom-national']){
   const a=$(name);if(a)a.href='/national-tools/rocket-launch-live/?region=texas'+tail;
  }
 }
 function showMission(data,linkLost=false){
  state.data=data;
  const picked=data.selectedLaunch||null;
  const options=(data.regions||[]).find(x=>x.id==='texas')?.launches||[];
  const select=$('sb-mission-picker');select.replaceChildren();
  if(options.length){
   for(const m of options){
    if(typeof m.id!=='string'||!UUID.test(m.id))continue;
    const option=document.createElement('option');option.value=m.id;
    option.textContent=(m.name||'Mission')+' · '+fmtDate(m.net,m.netPrecision);
    select.appendChild(option);
   }
   select.disabled=false;
   if(picked?.id)select.value=picked.id;
  }else{
   const option=document.createElement('option');option.value='';
   option.textContent='No upcoming Starship flight listed here';select.appendChild(option);
   select.disabled=true;
  }
  const caution=linkLost?'Your earlier flight is no longer listed. A different mission is shown; check SpaceX for the original flight’s status. ':'';
  set('sb-mission-name',picked?.name||'No upcoming Starship flight listed here right now');
  set('sb-mission-time',picked?fmtDate(picked.net,picked.netPrecision):'Next launch window not announced');
  set('sb-mission-source',caution+'Calendar last checked '+safeStamp(data.scheduleCheckedAt)+
   '. '+(data.scheduleFreshness==='stale'?'Launch timing may have changed. ':
    data.scheduleFreshness==='recent'?'A calendar update is not a go-for-launch call. ':'Last update time unknown. ')+
    (data.scheduleWarning||'Always verify with SpaceX.'));
  set('sb-mission-pad',picked?.pad?
   'Listed pad: '+picked.pad+'. Restricted launch pad; no visitor directions.' :
   'The pad hasn’t been confirmed for this flight, so we can’t show a reliable bearing.');
  const notice=data.starbaseViewing?.accessNotice||{};
  const status=$('sb-access-status');status.dataset.state=notice.state||'unknown';
  set('sb-access-label',notice.label||'City beach and road notice not confirmed');
  set('sb-access-note',notice.detail||'We don’t have a current city access update. Check Starbase’s road and beach page.');
  set('sb-access-checked','City road and beach update checked: '+safeStamp(notice.checkedAt));
  const weather=data.weather||{};
  const sky=$('sb-sky-status');
  const checked=Array.isArray(weather.places)?weather.places:[];
  const good=checked.filter(x=>x.status==='ok'&&x.cloudStatus==='ok'&&Number.isInteger(x.cloudCoverPercent));
  sky.dataset.state=good.length===2?'general-open':'unknown';
  set('sb-sky-label',good.length===2?
    'NWS cloud grids checked for two coastal areas':
    'No launch-time sky comparison yet');
  set('sb-sky-note',good.length===2?
    good.map(x=>x.name+': '+x.cloudCoverPercent+'% sky cover').join(' · ')+
    '. Local forecast; not launch approval or full flight visibility.':
    'The launch may still be too far away for an hourly forecast. We can’t say which shore will have clearer sky yet.');
  set('sb-sky-checked','Weather forecast updated: '+(good.length?good.map(x=>safeStamp(x.updatedAt)).join(' / '):'not verified'));
  state.rocketPins?.update(options,picked?.id);
  window.RocketFoundryHandoff?.loaded('texas',picked?.id,picked?.name);
   deepLink(picked?.id);
  const u=new URL(location.href);
  if(picked?.id&&UUID.test(picked.id))u.searchParams.set('launchId',picked.id);
  else u.searchParams.delete('launchId');
  history.replaceState(null,'',u.pathname+u.search+u.hash);
  displayPad();selection();
 }
 async function loadMission(id,fromExpired=false){
  const seq=++state.request,query=new URLSearchParams({region:'texas'});
  if(id&&UUID.test(id))query.set('launchId',id);
  const select=$('sb-mission-picker');select.disabled=true;
  set('sb-mission-source','Looking for the latest Starship flight…');
  try{
   const response=await fetch(API+'?'+query,{headers:{Accept:'application/json'}});
   const data=await response.json();
   if(seq!==state.request)return;
   if(response.status===404&&id&&!fromExpired){
    await loadMission(null,true);return;
   }
   if(!response.ok||!data.ok||data.region?.id!=='texas')throw Error(data.error||'Schedule unavailable');
   showMission(data,fromExpired);
  }catch(error){
   if(seq!==state.request)return;
   select.disabled=true;set('sb-mission-name','Starship launch calendar unavailable');
   set('sb-mission-time','No current liftoff target confirmed');
   set('sb-mission-source','The launch calendar isn’t loading. Check SpaceX for the next flight; an outage here doesn’t mean a launch happened or was scrubbed.');
   set('sb-mission-pad','Pad coordinates and mission-specific bearings unavailable.');
   $('sb-access-status').dataset.state='unknown';
   set('sb-access-label','Beach and road status unavailable');
   set('sb-access-note','We can’t load the latest City of Starbase notice. Check its official beach and road updates before driving.');
   $('sb-sky-status').dataset.state='unknown';
   set('sb-sky-label','Viewing-area forecast unavailable');
   deepLink(null);
   state.data=null;state.rocketPins?.update([],null);displayPad();selection();
  }
 }
 document.querySelectorAll('[data-site-select]').forEach(button=>
  button.addEventListener('click',()=>chooseSite(button.dataset.siteSelect)));
 document.querySelectorAll('input[name="sb-profile"]').forEach(input=>
  input.addEventListener('change',()=>{if(input.checked)changeProfile(input.value)}));
 $('sb-mission-picker')?.addEventListener('change',e=>{
  if(UUID.test(e.target.value))loadMission(e.target.value);
 });
 const id=new URL(location.href).searchParams.get('launchId');
 loadPlaces();loadMission(id&&UUID.test(id)?id:null);
})();
