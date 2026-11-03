'use strict';
/* Source-first Starbase viewing guide. Static place references keep the map
   usable when the shared launch/notice API fails; launch pad only uses real
   LL2 mission GPS. Region/mission continuity uses the national UUID. */
(()=>{
 const API='/api/rocket-launch-usa',PLACES='/starbase-rocket-launch-viewing/places.json';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const $=id=>document.getElementById(id),set=(id,value)=>{const x=$(id);if(x)x.textContent=value??'Not verified'};
 const state={request:0,places:[],site:'isla-blanca',profile:'first-time',map:null,markers:new Map(),
   padMarker:null,bearingLine:null,data:null,tilesReady:false,sourceAvailable:false};
 const allowedIds=new Set(['isla-blanca','zapata','lighthouse']);
 const profiles={
  'first-time':{hint:'Start with the island county park most clearly documented for Starship viewing; expect queues and verify current gate access.',order:['isla-blanca','zapata','lighthouse']},
  'no-causeway':{hint:'Mainland sites avoid the island crossing, but their current hours and launch-day sightlines are not independently verified.',order:['zapata','lighthouse','isla-blanca']},
  history:{hint:'Port Isabel Lighthouse is a historical daytime addition, not an authorized launch-event grandstand.',order:['lighthouse','zapata','isla-blanca']}
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
   'Published place feature is '+d.padDistanceMiles.toFixed(1)+' miles in a straight line from the selected mission’s pad, at an approximate '+Math.round(d.padBearingDegrees)+'° bearing. This is not a road route, flight track or verified unobstructed view.':
   'Launch pad coordinates unavailable or unverified. No mission-specific bearing or distance is claimed.');
  const actions=$('sb-selected-actions');actions.replaceChildren();
  if(site.accessSource?.startsWith('https://')) actions.appendChild(src(site.accessSource,'Check the land manager'));
  if(site.geographicSource?.startsWith('https://'))actions.appendChild(src(site.geographicSource,'Published place coordinate source'));
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
  const marker=state.markers.get(id);
  if(marker&&state.map&&move)state.map.panTo(marker.getLatLng(),{animate:false});
 }
 function changeProfile(profile){
  if(!profiles[profile])return;
  state.profile=profile;set('sb-profile-reason',profiles[profile].hint);
  const list=$('sb-place-list');
  for(const id of profiles[profile].order){
   const card=$(id);if(card)list.appendChild(card);
  }
  chooseSite(profiles[profile].order[0],true);
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
   const note=document.createElement('p');note.textContent='Published place feature, not an exact entrance or guaranteed launch-viewing spot.';popup.appendChild(note);
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
   setMapStatus('Three source-referenced visitor places mapped. The selected mission lacks verified pad GPS; no straight-line bearing is shown.');
   return;
  }
  const icon=window.L.divIcon({className:'sb-restricted-pin',iconSize:[18,18],iconAnchor:[9,9]});
  const marker=window.L.marker([pad.lat,pad.lon],{icon});
  const popup=document.createElement('div');
  const head=document.createElement('strong');head.textContent='RESTRICTED launch pad — '+pad.name;
  popup.appendChild(head);
  const p=document.createElement('p');p.textContent='Mission-source geographic reference only. No public access, directions or predicted rocket track.';popup.appendChild(p);
  marker.bindPopup(popup).addTo(state.map);state.padMarker=marker;
  const site=state.places.find(x=>x.id===state.site);
  // Intentional: only one straight-line comparison, never a route polyline.
  if(site){
   state.bearingLine=window.L.polyline([[site.lat,site.lon],[pad.lat,pad.lon]],
    {color:'#cb7644',weight:2,dashArray:'7 7',opacity:.85,interactive:false}).addTo(state.map);
  }
  setMapStatus('Three public reference points and restricted mission pad mapped. Dashed line is a geometric reference, not a flight track or driving path.');
 }
 function setTileReady(){
  state.tilesReady=true;const root=$('sb-map');if(root)root.dataset.tiles='ready';
 }
 function initMap(){
  if(state.map||!window.L||!state.places.length){
   if(!window.L)fallbackMap('Interactive mapping library unavailable.');
   return;
  }
  try{
   const node=$('sb-map');const map=window.L.map(node,{scrollWheelZoom:false,preferCanvas:true});
   state.map=map;
   const credit='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
   const osm=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:19,attribution:credit}).addTo(map);
   osm.on('tileload',setTileReady);
   osm.on('tileerror',()=>{if(!state.tilesReady)fallbackMap('Map imagery could not be loaded.');});
   addPlacesToMap();displayPad();selection();
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
  }catch{fallbackMap('Source-verified geographic coordinates unavailable.');}
 }
 function fmtDate(iso,precision){
  const d=new Date(iso||'');if(!Number.isFinite(+d))return 'Launch time not verified';
  if(['month','year','date-tbd'].includes(precision))return 'Only a coarse date is listed; time TBD';
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
   option.textContent='No Starbase launch in bounded feed';select.appendChild(option);
   select.disabled=true;
  }
  const caution=linkLost?'The linked launch is no longer listed; this is a NEW selection, not an outcome for the previous mission. ':'';
  set('sb-mission-name',picked?.name||'No upcoming Starbase launch in the current bounded schedule');
  set('sb-mission-time',picked?fmtDate(picked.net,picked.netPrecision):'No verified next launch window');
  set('sb-mission-source',caution+'Schedule observed '+safeStamp(data.scheduleCheckedAt)+
   '. '+(data.scheduleFreshness==='stale'?'Source snapshot stale. ':
    data.scheduleFreshness==='recent'?'Cached schedule, not live launch control. ':'Freshness unverified. ')+
    (data.scheduleWarning||'Always verify with SpaceX.'));
  set('sb-mission-pad',picked?.pad?
   'Listed pad: '+picked.pad+'. Restricted launch pad; no visitor directions.' :
   'Pad not published or unverified. No pad GPS or bearing inferred.');
  const notice=data.starbaseViewing?.accessNotice||{};
  const status=$('sb-access-status');status.dataset.state=notice.state||'unknown';
  set('sb-access-label',notice.label||'Current official notice not confirmed');
  set('sb-access-note',notice.detail||'No verified current beach/road information. Consult the city.');
  set('sb-access-checked','Official city notice checked: '+safeStamp(notice.checkedAt));
  const weather=data.weather||{};
  const sky=$('sb-sky-status');
  const checked=Array.isArray(weather.places)?weather.places:[];
  const good=checked.filter(x=>x.status==='ok'&&x.cloudStatus==='ok'&&Number.isInteger(x.cloudCoverPercent));
  sky.dataset.state=good.length===2?'general-open':'unknown';
  set('sb-sky-label',good.length===2?
    'NWS cloud grids checked for two coastal areas':
    'Mission-specific sky comparison not verified');
  set('sb-sky-note',good.length===2?
    good.map(x=>x.name+': '+x.cloudCoverPercent+'% sky cover').join(' · ')+
    '. Local forecast; not launch approval or full flight visibility.':
    'The launch timing or NWS forecast is missing, stale, or too far out. No clear-sky verdict is inferred.');
  set('sb-sky-checked','Weather issue time: '+(good.length?good.map(x=>safeStamp(x.updatedAt)).join(' / '):'not verified'));
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
  set('sb-mission-source','Checking cached national schedule…');
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
   select.disabled=true;set('sb-mission-name','Launch schedule unavailable');
   set('sb-mission-time','No current mission time can be confirmed');
   set('sb-mission-source','Shared mission source not available. Use the official SpaceX schedule; no launch result inferred.');
   set('sb-mission-pad','Pad coordinates and mission-specific bearings unavailable.');
   $('sb-access-status').dataset.state='unknown';
   set('sb-access-label','Current beach status cannot be confirmed');
   set('sb-access-note','The combined source request failed. Check the City of Starbase official notice directly.');
   $('sb-sky-status').dataset.state='unknown';
   set('sb-sky-label','Spectator weather unavailable');
   deepLink(null);
   state.data=null;displayPad();selection();
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
