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
  first:{order:['nasa-visitor','reed','harbor'],note:'If NASA opens the viewing lawn for this flight, it is a great place for range audio and a view over the marsh. Otherwise try the Chincoteague waterfronts.'},
  backup:{order:['reed','harbor','nasa-visitor'],note:'The downtown waterfronts are worth considering if the NASA lawn is closed or full. Check local parking and any event restrictions.'},
  science:{order:['nasa-visitor','reed','harbor'],note:'Want to hear Range Control while you watch? NASA’s Visitor Center is the place to check, but it opens for selected events only.'},
  photo:{order:['harbor','reed','nasa-visitor'],note:'Harbor boats and tidal water give your photos a sense of place. Check the actual sightline; a map cannot promise an unobstructed rocket.'}
 };
 const external=(url,label)=>{if(typeof url!=='string'||!/^https:\/\//.test(url))return null;
  const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';return a};
 const stamp=(iso)=>{const d=new Date(iso||'');return Number.isFinite(+d)?
  d.toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'})+' ET':'not verified'};
 const timing=(m)=>{
  const dt=new Date(m?.net||'');
  if(!Number.isFinite(+dt))return 'Time not announced';
  const p=m?.netPrecision||'unknown';
  if(['year','month','date-tbd'].includes(p))return 'Date is tentative · exact liftoff time to come';
  const fmt={timeZone:['day','time-tbd'].includes(p)?'UTC':'America/New_York',
   year:'numeric',month:'short',day:'numeric'};
  if(['minute','second','hour'].includes(p)){fmt.hour='numeric';fmt.minute='2-digit';fmt.timeZoneName='short';}
  return new Intl.DateTimeFormat('en-US',fmt).format(dt)+
   (['minute','second'].includes(p)?' · scheduled target, not launch GO':' · launch hour not verified');
 };
 const noTime=()=>{set('w-mission-time','Exact launch time not announced');set('w-mission-pad','Restricted pad unverified');};
 function updateOfficial(d){
  const schedule=d?.schedule||{},range=d?.range||{};
  const publicState=schedule.status==='no-public-listed'?
   'No upcoming public launch listed by NASA':schedule.status==='source-checked'?
   'NASA schedule checked · no matching future date':'NASA schedule could not be checked';
  set('w-nasa-public-status',publicState);
  set('w-nasa-public-note',schedule.summary||'We couldn’t confirm NASA’s next public flight. An empty calendar doesn’t mean the range is inactive.');
  set('w-nasa-range-status',range.status==='source-checked'?
   'NASA Range Blog checked':'Range Blog could not be checked');
  set('w-nasa-range-note',range.summary||
   'Science and partner flights may appear on NASA’s Range Blog instead of the public calendar.');
  set('w-nasa-checked','NASA sources last checked: public schedule '+stamp(schedule.checkedAt)+
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
    '. Check hours, parking and local restrictions before arriving. This pin is not a reserved viewing place.';pop.appendChild(note);
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
   set('w-map-status','The three viewing places are on the map. This flight’s exact pad location is not confirmed, so no direction or flight path is shown.');
   return;
  }
  const marker=window.L.marker([pad.lat,pad.lon],{
   icon:window.L.divIcon({className:'w-pin-shell w-restricted-marker',
    html:'<span class="w-pin w-pin-restricted">!</span>',iconSize:[38,38],iconAnchor:[19,19]})});
  const popup=document.createElement('div');popup.className='w-map-popup';
  const head=document.createElement('strong');head.textContent='RESTRICTED range pad: '+pad.name;
  const p=document.createElement('p');p.textContent='This is a restricted launch pad, not a visitor entrance or driving route. The line does not predict the rocket’s flight.';
  popup.append(head,p);marker.bindPopup(popup).addTo(state.map);state.padMarker=marker;
  const site=state.places.find(x=>x.id===state.site);
  if(site){
   state.bearingLine=window.L.polyline([[site.lat,site.lon],[pad.lat,pad.lon]],
    {color:'#b9783a',weight:3,opacity:.85,dashArray:'6 7',interactive:false}).addTo(state.map);
  }
  set('w-map-status','Three viewing areas and the restricted pad are mapped. The dashed line points toward the pad, not along a road or the rocket’s path.');
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
  set('w-selected-story',site.scene+' Mapped location: '+site.coordinateRole+'.');
  const d=state.data?.wallopsViewing?.sites?.find(p=>p.id===site.id);
  set('w-selected-bearing',d?.geometry&&Number.isFinite(d.geometry.miles)&&
   Number.isFinite(d.geometry.bearingDegrees)?
   'Approximately '+d.geometry.miles.toFixed(1)+' miles from published place reference to mission-listed pad at '+d.geometry.bearingDegrees+'° '+d.geometry.bearingCardinal+
   ' in a STRAIGHT LINE. Not road distance, a rocket flight track or a proven sightline.':
   'The pad isn’t confirmed for this mission, so we can’t show a dependable distance or bearing.');
  set('w-selected-warning',site.id==='nasa-visitor'?
   'NASA must announce the viewing lawn as open for this flight. Entry is free when offered, but parking is first-come.':
   'NASA names this public waterfront alternative, but current event parking, hours, access and direct sightline have not been verified.');
  const actions=$('w-selected-actions');actions.replaceChildren();
  for(const [url,label]of [[site.accessSource,'Read the launch-viewing rules'],
   [site.geographicSource,'See the map reference']]){
   const a=external(url,label);if(a)actions.appendChild(a);
  }
  // Source-verified public arrival only. Never offer GPS to the restricted range.
  if(site.id==='nasa-visitor'){
   const a=external('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(site.navigation),
    'Directions to NASA’s public Visitor Center');
   if(a)actions.appendChild(a);
  }else if(typeof site.navigation==='string'){
   const a=external('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(site.navigation),
    'Find this town waterfront on Google Maps');
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
   const option=document.createElement('option');option.value='';option.textContent='No upcoming Wallops flights listed here';
   picker.appendChild(option);picker.disabled=true;
  }
  const type=data.wallopsViewing?.missionType||{};
  set('w-mission-type-tag',(type.name||'Mission not classified').toUpperCase());
  set('w-mission-name',picked?.name||'No upcoming Wallops flight listed here');
  set('w-mission-time',picked?timing(picked):'Liftoff time not yet confirmed');
  set('w-mission-pad',picked?.pad?picked.pad+' · restricted launch facility':'Pad unverified; no public directions');
  set('w-mission-science',type.summary||
   'No rocket type is listed yet. Check NASA’s launch announcements to see what might fly next.');
  set('w-mission-observed',(wasExpired?
   'The flight you followed is no longer listed, so a different mission is shown. Check NASA for news about the earlier launch. ':'')+
   'Calendar last checked '+stamp(data.scheduleCheckedAt)+'. '+
   (data.scheduleFreshness==='stale'?'This launch time may be old. Check NASA. ':
    data.scheduleFreshness==='recent'?'The calendar was checked recently, but liftoff is not guaranteed. ':'Last calendar update time not confirmed. ')+
   (data.scheduleWarning||''));
  const precise=picked&&['minute','second'].includes(picked.netPrecision);
  set('w-decision-title',precise?'BEFORE YOU GO / CHECK NASA’S VIEWING EVENT':
   picked?'TRIP DECISION · LAUNCH HOUR UNVERIFIED':'TRIP DECISION · NO CURRENT LISTING');
  set('w-decision-copy',precise?
   'A launch target is published, but NASA has not verified this event’s Visitor Center opening in this tool. Confirm the NASA event notice, access, local restrictions and last-minute mission changes before traveling.':
   picked?'We have a date but no exact launch time yet. Wait for NASA’s latest window and check whether the Visitor Center will open for this mission.':
   'No upcoming flight is listed here right now. Smaller science flights or range operations may still be planned; check NASA’s schedule and Range Blog.');
  const clouds=Array.isArray(data.weather?.places)?data.weather.places:[];
  const sky=clouds.filter(p=>p.status==='ok'&&p.cloudStatus==='ok'&&Number.isInteger(p.cloudCoverPercent));
  set('w-sky-status',precise&&sky.length?
   'NWS spectator sky near '+sky.map(x=>x.name+': '+x.cloudCoverPercent+'% cloud').join(' / ')+
   ' · not trajectory, GO or viewing permission':
   'NWS: mission-time spectator sky comparison unavailable, not a clear-view promise');
  state.data=data;
  state.rocketPins?.update(missions,picked?.id);
  frameMissionOrigins();
  window.RocketFoundryHandoff?.loaded('virginia',picked?.id,picked?.name);
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
  set('w-mission-observed','Looking for upcoming Wallops flights…');
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
   set('w-mission-name','Wallops launch calendar unavailable');
   set('w-mission-type-tag','SOURCE UNAVAILABLE');noTime();
   set('w-mission-observed','The national calendar isn’t loading right now. NASA’s own schedule and Range Blog are the best places to check.');
   set('w-mission-science','We can’t tell which rocket is next until the schedule comes back.');
   set('w-decision-title','BEFORE YOU GO / CALENDAR UNAVAILABLE');
   set('w-decision-copy','Don’t plan the drive around an old countdown. Check NASA’s new launch time and whether the viewing lawn will open.');
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
