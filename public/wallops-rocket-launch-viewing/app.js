'use strict';
/* Wallops coast atlas. Independent NASA public schedule vs range source checks.
 * The mission, pad, geometry and clouds are read only from the national
 * authenticated scheduled snapshot. No client LL2, trajectory, invented
 * visitor-center event, parking guarantee, NASA GO or livestream.
 */
(()=>{
 const NATIONAL='/api/rocket-launch-usa',OFFICIAL='/api/wallops-official',
  PLACES='/wallops-rocket-launch-viewing/places.json';
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const IDS=new Set(['nasa-visitor','reed','harbor']),$=id=>document.getElementById(id);
 const set=(id,value)=>{const node=$(id);if(node)node.textContent=value??'Not verified'};
 const state={request:0,data:null,places:[],profile:'first',site:'nasa-visitor',
  map:null,markers:new Map(),padMarker:null,bearingLine:null,rocketPins:null,tiles:false,leafletPromise:null};
 const profiles={
  first:{order:['nasa-visitor','reed','harbor'],note:'Start with the NASA launch-viewing event if NASA explicitly opens its lawn for this mission. Otherwise investigate the downtown Chincoteague waterfront.'},
  backup:{order:['reed','harbor','nasa-visitor'],note:'Town waterfronts are alternatives to investigate if the NASA Visitor Center is closed or full; launch parking and local access still require confirmation.'},
  science:{order:['nasa-visitor','reed','harbor'],note:'NASA range audio and interpretive staff are the strongest educational setting, but the Visitor Center lawn must be opened for this specific launch.'},
  photo:{order:['harbor','reed','nasa-visitor'],note:'Fishing harbors and tidal water add foreground character. Neither an exact flight path nor an unobstructed camera view is verified.'}
 };
 const external=(url,label)=>{if(typeof url!=='string'||!/^https:\/\//.test(url))return null;
  const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';return a};
 const stamp=(iso)=>{const d=new Date(iso||'');return Number.isFinite(+d)?
  d.toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'})+' ET':'not verified'};
 const timing=(m)=>{
  const dt=new Date(m?.net||'');
  if(!Number.isFinite(+dt))return 'No time verified';
  const p=m?.netPrecision||'unknown';
  if(['year','month','date-tbd'].includes(p))return 'Date provisional · no launch hour confirmed';
  const fmt={timeZone:['day','time-tbd'].includes(p)?'UTC':'America/New_York',
   year:'numeric',month:'short',day:'numeric'};
  if(['minute','second','hour'].includes(p)){fmt.hour='numeric';fmt.minute='2-digit';fmt.timeZoneName='short';}
  return new Intl.DateTimeFormat('en-US',fmt).format(dt)+
   (['minute','second'].includes(p)?' · scheduled target, not launch GO':' · launch hour not verified');
 };
 const noTime=()=>{set('w-mission-time','No precise launch target');set('w-mission-pad','Restricted pad unverified');};
 function updateOfficial(d){
  const schedule=d?.schedule||{},range=d?.range||{};
  const publicState=schedule.status==='no-public-listed'?
   'NASA reports no public launch listed':schedule.status==='source-checked'?
   'Official page retrieved · no future date matched':'Official check unavailable';
  set('w-nasa-public-status',publicState);
  set('w-nasa-public-note',schedule.summary||'The NASA public list could not be confirmed. An empty LL2 list does not prove no operations.');
  set('w-nasa-range-status',range.status==='source-checked'?
   'Official Range Blog accessible':'Range notice check unavailable');
  set('w-nasa-range-note',range.summary||
   'Non-NASA launches and short-notice operations may be announced here separately.');
  set('w-nasa-checked','Independent NASA source checks: public schedule '+stamp(schedule.checkedAt)+
   ' · range blog '+stamp(range.checkedAt)+'. Neither is a visitor-center event authorization.');
 }
 async function loadOfficial(){
  try{
   const r=await fetch(OFFICIAL,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw Error('Official check response unavailable');
   const body=await r.json();
   if(!body?.ok)throw Error('Official NASA check unavailable');
   updateOfficial(body);
  }catch{updateOfficial(null);}
 }
 function icon(id,selected=false){
  const label=id==='nasa-visitor'?'N':id==='reed'?'R':'H';
  return window.L.divIcon({className:'w-pin-shell w-public-marker',
   html:'<span class="w-pin" data-active="'+(selected?'true':'false')+'">'+label+'</span>',
   iconSize:[38,38],iconAnchor:[19,19],popupAnchor:[0,-16]});
 }
 function readyTiles(){state.tiles=true;const n=$('w-map');if(n)n.dataset.tiles='ready';}
 function mapFallback(reason){
  const n=$('w-map');if(n)n.dataset.tiles='unavailable';
  set('w-map-status',reason+' The NASA and town viewing cards remain usable without the map.');
 }
 function addMapSites(){
  if(!state.map||!window.L||!state.places.length)return;
  for(const marker of state.markers.values())state.map.removeLayer(marker);
  state.markers.clear();
  const bounds=[];
  for(const p of state.places){
   const marker=window.L.marker([p.lat,p.lon],{icon:icon(p.id,p.id===state.site),keyboard:true,title:p.name});
   const pop=document.createElement('div');pop.className='w-map-popup';
   const name=document.createElement('strong');name.textContent=p.name;pop.appendChild(name);
   const note=document.createElement('p');note.textContent=p.coordinateRole+
    '. No confirmed current spectator entrance, launch-day parking or legal access.';pop.appendChild(note);
   const link=external(p.accessSource,'Check published venue rules');if(link)pop.appendChild(link);
   marker.bindPopup(pop);marker.on('click',()=>selectSite(p.id,false));
   marker.addTo(state.map);state.markers.set(p.id,marker);bounds.push([p.lat,p.lon]);
  }
  state.map.fitBounds(bounds,{padding:[25,25],maxZoom:12,animate:false});
  updatePad();
 }
 function frameMissionOrigins(){
  if(!state.map||!state.places.length)return;
  const refs=state.places.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon))
    .map(p=>[p.lat,p.lon]);
  const origins=state.rocketPins?.getGroups()||[];
  for(const g of origins)if(Number.isFinite(g.lat)&&Number.isFinite(g.lon))
    refs.push([g.lat,g.lon]);
  // Include viewing places and scheduled origin, including approximate fallback
  // whose regional reference can fall outside a phone-sized visitor-only map.
  if(refs.length)state.map.fitBounds(refs,{padding:[34,34],maxZoom:11,animate:false});
 }
 function updatePad(){
  if(!state.map||!window.L)return;
  if(state.padMarker)state.map.removeLayer(state.padMarker);
  if(state.bearingLine)state.map.removeLayer(state.bearingLine);
  state.padMarker=null;state.bearingLine=null;
  const pad=state.data?.wallopsViewing?.pad;
  if(!pad||!Number.isFinite(pad.lat)||!Number.isFinite(pad.lon)){
   set('w-map-status','Mapped three public/official place references. The shared selected mission has no trusted launch-pad location; no geometry or flight-path claim.');
   return;
  }
  const marker=window.L.marker([pad.lat,pad.lon],{
   icon:window.L.divIcon({className:'w-pin-shell w-restricted-marker',
    html:'<span class="w-pin w-pin-restricted">!</span>',iconSize:[38,38],iconAnchor:[19,19]})});
  const popup=document.createElement('div');popup.className='w-map-popup';
  const head=document.createElement('strong');head.textContent='RESTRICTED range pad: '+pad.name;
  const p=document.createElement('p');p.textContent='Third-party mission GPS, not an entrance, viewing site, road route or predicted ascent track.';
  popup.append(head,p);marker.bindPopup(popup).addTo(state.map);state.padMarker=marker;
  const site=state.places.find(x=>x.id===state.site);
  if(site){
   state.bearingLine=window.L.polyline([[site.lat,site.lon],[pad.lat,pad.lon]],
    {color:'#b9783a',weight:3,opacity:.85,dashArray:'6 7',interactive:false}).addTo(state.map);
  }
  set('w-map-status','Mapped three audited public place references and the mission-listed restricted pad. Dashed line is straight-line geographic direction only, never a rocket path or legal route.');
 }
 function loadLeaflet(){
  if(window.L?.map)return Promise.resolve(window.L);
  if(state.leafletPromise)return state.leafletPromise;
  state.leafletPromise=new Promise((resolve,reject)=>{
   const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(l);
   const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
   s.onload=()=>window.L?.map?resolve(window.L):reject(Error('Map failed to initialize'));
   s.onerror=()=>reject(Error('Map library unavailable'));document.head.appendChild(s);
  });
  return state.leafletPromise;
 }
 async function initMap(){
  if(state.map||!state.places.length)return;
  try{
   const L=await loadLeaflet(),screen=$('w-map');
   if(!screen)return;
   screen.replaceChildren();
   state.map=L.map(screen,{scrollWheelZoom:false,preferCanvas:true,zoomControl:true});
   const credit='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
   const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:credit}).addTo(state.map);
   osm.on('tileload',readyTiles);
   osm.on('tileerror',()=>{if(!state.tiles)mapFallback('Base-map tiles could not load.');});
   addMapSites();
      state.rocketPins=window.RocketMapPins?.mount(state.map,{
        region:'virginia',centers:{virginia:{lat:37.84,lon:-75.48}},
        onSelect:id=>{void loadMission(id);}
      });
      state.rocketPins?.update(state.data?.regions?.find(r=>r.id==='virginia')?.launches||[],
        state.data?.selectedLaunchId);
      frameMissionOrigins();
   if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>state.map?.invalidateSize()).observe(screen);
   fetch('/api/carto-basemap-config',{signal:AbortSignal.timeout(5500)})
    .then(r=>r.ok?r.json():null).then(config=>{
     if(!config||config.provider!=='CARTO'||typeof config.key!=='string'||!config.key.trim())return;
     const url='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(config.key.trim());
     const tile=L.tileLayer(url,{subdomains:'abcd',maxZoom:19,attribution:credit+' &copy; <a href="https://carto.com/attributions">CARTO</a>'});
     let loaded=false,errors=0;
     tile.on('tileload',()=>{if(!loaded&&state.map?.hasLayer(tile)){
      loaded=true;readyTiles();if(state.map.hasLayer(osm))state.map.removeLayer(osm);}});
     tile.on('tileerror',()=>{if(++errors>2&&!loaded&&state.map?.hasLayer(tile)){
      state.map.removeLayer(tile);if(!state.map.hasLayer(osm))osm.addTo(state.map);}});
     tile.addTo(state.map);
    }).catch(()=>{});
  }catch{mapFallback('Interactive map library unavailable.');}
 }
 async function loadPlaces(){
  try{
   const r=await fetch(PLACES,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
   if(!r.ok)throw Error('Geographic manifest unavailable');
   const data=await r.json(),v=data?.sites;
   if(data.schemaVersion!==1||!Array.isArray(v)||v.length!==3||!v.every(x=>
    IDS.has(x.id)&&typeof x.lat==='number'&&typeof x.lon==='number'&&
    x.lat>37.7&&x.lat<38.1&&x.lon< -75.25&&x.lon> -75.8 &&
    typeof x.geographicSource==='string'&&x.geographicSource.startsWith('https://')))throw Error('Invalid geography');
   state.places=v;
   await initMap();selectSite(state.site,false);
  }catch{mapFallback('Public location geometry unavailable.');}
 }
 function selection(){
  const site=state.places.find(s=>s.id===state.site);
  if(!site)return;
  set('w-selected-name',site.name);
  set('w-selected-story',site.scene+' Geographic reference: '+site.coordinateRole+'.');
  const d=state.data?.wallopsViewing?.sites?.find(p=>p.id===site.id);
  set('w-selected-bearing',d?.geometry&&Number.isFinite(d.geometry.miles)&&
   Number.isFinite(d.geometry.bearingDegrees)?
   'Approximately '+d.geometry.miles.toFixed(1)+' miles from published place reference to mission-listed pad at '+d.geometry.bearingDegrees+'° '+d.geometry.bearingCardinal+
   ' in a STRAIGHT LINE. Not road distance, a rocket flight track or a proven sightline.':
   'No verified mission-specific pad GPS: distance, direction and flight path are withheld.');
  set('w-selected-warning',site.id==='nasa-visitor'?
   'This visitor-center lawn is a mission-specific NASA event, not an automatically open destination. Free entry does not guarantee a parking space.':
   'NASA names this public waterfront alternative, but current event parking, hours, access and direct sightline have not been verified.');
  const actions=$('w-selected-actions');actions.replaceChildren();
  for(const [url,label]of [[site.accessSource,'Official launch viewing source'],
   [site.geographicSource,'Published map coordinate source']]){
   const a=external(url,label);if(a)actions.appendChild(a);
  }
  // Source-verified public arrival only. Never offer GPS to the restricted range.
  if(site.id==='nasa-visitor'){
   const a=external('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(site.navigation),
    'Navigate to the NASA PUBLIC visitor center');
   if(a)actions.appendChild(a);
  }else if(typeof site.navigation==='string'){
   const a=external('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(site.navigation),
    'Find the named town place (not parking)');
   if(a)actions.appendChild(a);
  }
  for(const card of document.querySelectorAll('[data-place]'))card.dataset.active=card.dataset.place===site.id?'true':'false';
  for(const btn of document.querySelectorAll('[data-choose]')){
   const yes=btn.dataset.choose===site.id;btn.setAttribute('aria-pressed',yes?'true':'false');
   btn.textContent=yes?'Selected on map':btn.dataset.choose==='nasa-visitor'?'Locate NASA arrival':'Locate on map';
  }
  for(const [id,marker]of state.markers)marker.setIcon(icon(id,id===site.id));
 }
 function selectSite(id,move=true){
  if(!IDS.has(id))return;
  state.site=id;selection();updatePad();
  const marker=state.markers.get(id);
  if(marker&&state.map&&move)state.map.panTo(marker.getLatLng(),{animate:false});
 }
 function changeProfile(p){
  if(!profiles[p])return;
  state.profile=p;set('w-profile-note',profiles[p].note);
  const container=$('w-place-list');for(const id of profiles[p].order){
   const card=container.querySelector('[data-place="'+id+'"]');if(card)container.appendChild(card);
  }
  selectSite(profiles[p].order[0]);
 }
 function deepLink(id){
  const tail=id&&UUID.test(id)?'&launchId='+encodeURIComponent(id):'';
  for(const key of ['w-national-link','w-network-link']){
   const a=$(key);if(a)a.href='/national-tools/rocket-launch-live/?region=virginia'+tail;
  }
 }
 function showMission(data,wasExpired=false){
  state.data=data;
  const missions=Array.isArray(data.regions)?data.regions.find(r=>r.id==='virginia')?.launches||[]:[];
  const picked=data.selectedLaunch?.region==='virginia'?data.selectedLaunch:null;
  const picker=$('w-mission-select');picker.replaceChildren();
  if(missions.length){
   for(const m of missions){
    if(!UUID.test(m.id))continue;
    const option=document.createElement('option');option.value=m.id;
    option.textContent=(m.name||'Wallops mission')+' · '+timing(m);
    picker.appendChild(option);
   }
   picker.disabled=picker.options.length===0;
   if(picked&&UUID.test(picked.id))picker.value=picked.id;
  }else{
   const option=document.createElement('option');option.value='';option.textContent='No upcoming Wallops missions in bounded national feed';
   picker.appendChild(option);picker.disabled=true;
  }
  const type=data.wallopsViewing?.missionType||{};
  set('w-mission-type-tag',(type.name||'Mission not classified').toUpperCase());
  set('w-mission-name',picked?.name||'No upcoming Wallops launch in the shared bounded feed');
  set('w-mission-time',picked?timing(picked):'No public launch time verified');
  set('w-mission-pad',picked?.pad?picked.pad+' · restricted launch facility':'Pad unverified; no public directions');
  set('w-mission-science',type.summary||
   'No mission type or payload can be inferred from an empty national feed. Check NASA range announcements.');
  set('w-mission-observed',(wasExpired?
   'The linked launch was removed from the bounded schedule. This is a NEW selection; no outcome for the old mission is inferred. ':'')+
   'Shared calendar last observed '+stamp(data.scheduleCheckedAt)+'. '+
   (data.scheduleFreshness==='stale'?'The snapshot is stale. Check the operator. ':
    data.scheduleFreshness==='recent'?'Schedule is recently observed, not launch GO. ':'Source freshness not verified. ')+
   (data.scheduleWarning||''));
  const precise=picked&&['minute','second'].includes(picked.netPrecision);
  set('w-decision-title',precise?'TRIP DECISION · CONFIRM EVENT OPENING':
   picked?'TRIP DECISION · LAUNCH HOUR UNVERIFIED':'TRIP DECISION · NO CURRENT LISTING');
  set('w-decision-copy',precise?
   'A launch target is published, but NASA has not verified this event’s Visitor Center opening in this tool. Confirm the NASA event notice, access, local restrictions and last-minute mission changes before traveling.':
   picked?'The shared feed does not establish an exact launch hour. A date alone is not a travel countdown or evidence that NASA will open the Visitor Center.':
   'No upcoming mission in the bounded third-party feed. That is not proof there are no range operations; check NASA’s public schedule and its separate Wallops Range Blog.');
  const clouds=Array.isArray(data.weather?.places)?data.weather.places:[];
  const sky=clouds.filter(p=>p.status==='ok'&&p.cloudStatus==='ok'&&Number.isInteger(p.cloudCoverPercent));
  set('w-sky-status',precise&&sky.length?
   'NWS spectator sky near '+sky.map(x=>x.name+': '+x.cloudCoverPercent+'% cloud').join(' / ')+
   ' · not trajectory, GO or viewing permission':
   'NWS: mission-time spectator sky comparison unavailable, not a clear-view promise');
  state.data=data;
  state.rocketPins?.update(missions,picked?.id);
  frameMissionOrigins();
  deepLink(picked?.id);
  const u=new URL(location.href);
  if(picked?.id&&UUID.test(picked.id))u.searchParams.set('launchId',picked.id);
  else u.searchParams.delete('launchId');
  history.replaceState(null,'',u.pathname+u.search+u.hash);
  selection();updatePad();
 }
 async function loadMission(id,expired=false){
  const seq=++state.request;
  const params=new URLSearchParams({region:'virginia'});
  if(id&&UUID.test(id))params.set('launchId',id);
  $('w-mission-select').disabled=true;
  set('w-mission-observed','Checking the bounded shared launch schedule…');
  try{
   const response=await fetch(NATIONAL+'?'+params,{headers:{Accept:'application/json'}});
   const data=await response.json();
   if(seq!==state.request)return;
   if(response.status===404&&id&&!expired){await loadMission(null,true);return;}
   if(!response.ok||!data.ok||data.region?.id!=='virginia')throw Error('Launch source unavailable');
   showMission(data,expired);
  }catch{
   if(seq!==state.request)return;
   state.data=null;$('w-mission-select').disabled=true;
   set('w-mission-name','Shared launch schedule unavailable');
   set('w-mission-type-tag','SOURCE UNAVAILABLE');noTime();
   set('w-mission-observed','National snapshot could not be checked. The NASA public schedule and range blog are separate sources, not proof of an upcoming flight.');
   set('w-mission-science','No flight class or payload can be inferred during a schedule outage.');
   set('w-decision-title','TRIP DECISION · SOURCE UNAVAILABLE');
   set('w-decision-copy','Do not travel based on an old countdown. Confirm any mission and launch-specific visitor opening directly with NASA.');
   set('w-sky-status','NWS spectator weather unavailable');
   state.rocketPins?.update([],null);
   deepLink(null);selection();updatePad();
  }
 }
 document.querySelectorAll('[data-choose]').forEach(btn=>btn.addEventListener('click',()=>selectSite(btn.dataset.choose)));
 document.querySelectorAll('input[name="w-profile"]').forEach(input=>input.addEventListener('change',()=>{
  if(input.checked)changeProfile(input.value);
 }));
 $('w-mission-select')?.addEventListener('change',e=>{if(UUID.test(e.target.value))loadMission(e.target.value)});
 const requested=new URL(location.href).searchParams.get('launchId');
 void loadPlaces();
 void loadOfficial();
 void loadMission(requested&&UUID.test(requested)?requested:null);
})();
