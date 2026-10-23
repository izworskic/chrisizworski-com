'use strict';
/* John Day Columbia River lock reference map.
 * Static Corps LPMS lock-characteristics GEOMETRY, not navigation waypoints,
 * public access, real-time statuses, vessel tracks or charted routes.
 * Preferred CARTO Voyager + domain-limited public key; OpenFreeMap fallback.
 * A user's position is shown only after a deliberate geolocation request.
 */
(()=>{
 const $=id=>document.getElementById(id);
 const URLS={
  data:'https://services7.arcgis.com/n1YM8pTrFmm7L4hs/ArcGIS/rest/services/Locks/FeatureServer/0',
  carto:'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  fallback:'https://tiles.openfreemap.org/styles/liberty'
 };
 const LOCKS=[
  {id:'bonneville',name:'Bonneville Lock',lon:-121.947259,lat:45.638124,mile:145.3,lift:65,year:1993},
  {id:'the-dalles',name:'The Dalles Lock',lon:-121.139626,lat:45.614994,mile:191.7,lift:88,year:1957},
  {id:'john-day',name:'John Day Lock',lon:-120.697630,lat:45.719149,mile:216.5,lift:110,year:1968},
  {id:'mcnary',name:'McNary Lock',lon:-119.300560,lat:45.940161,mile:292.0,lift:103,year:1953}
 ];
 const byId=new Map(LOCKS.map(s=>[s.id,s]));
 const buttons=[...document.querySelectorAll('[data-river-lock]')];
 let map=null,GL=null,loaded=false,inFlight=false,candidate='unknown',failedOver=false,selected='john-day',user=null,providerErrors=0;
 const status=$('lockMapStatus'),panel=$('lockMapSelection'),stage=$('lockMap');
 function announce(text){status.textContent=text;}
 function escapeUrl(raw,key){
  if(!key)return raw;
  try{
   const url=new URL(raw);if(url.protocol==='https:'&&url.hostname==='basemaps.cartocdn.com'){url.searchParams.set('key',key);return url.toString()}
  }catch{}
  return raw;
 }
 function describe(site){
  panel.replaceChildren();
  const title=document.createElement('h3');title.textContent=site.name+(site.id==='john-day'?' · this explorer':'');
  const intro=document.createElement('p');intro.textContent='USACE historic lock inventory · river mile '+site.mile.toFixed(1)+
   ' · listed design lift '+site.lift+' ft · year opened '+site.year+'. This is not the current lift or operating status.';
  const dims=document.createElement('p');dims.textContent='Chamber inventory: 675 ft overall length, 650 ft usable; 86 ft overall width, 84 ft usable. USACE lists similar chamber dimensions for these four Columbia River locks.';
  const note=document.createElement('p');note.className='micro';
  note.textContent=site.id==='john-day'?
    'John Day project publications describe a maximum lift of 113 ft; the lock-characteristics inventory lists 110 ft. These are different published reference measures, not readings from today.':
    'Reference location only. No public dam viewing, roadway or lockage access is implied by this point.';
  const a=document.createElement('a');a.href=URLS.data;a.rel='noopener';a.target='_blank';a.textContent='USACE lock-characteristics source ↗';
  panel.append(title,intro,dims,note,a);
  for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.riverLock===site.id));
 }
 function geo(){
  return {type:'FeatureCollection',features:LOCKS.map(s=>({type:'Feature',id:s.id,geometry:{type:'Point',coordinates:[s.lon,s.lat]},
   properties:{id:s.id,label:s.name,mile:s.mile,selected:s.id===selected?1:0}}))};
 }
 function draw(){
  if(!map)return;
  const source=map.getSource('reference-locks');if(source)source.setData(geo());
 }
 function select(id,fromMap=false){
  const s=byId.get(id);if(!s)return;selected=id;describe(s);draw();
  // A marker already being in view never causes a surprise camera jump.
  if(!fromMap&&map&&loaded)map.easeTo({center:[s.lon,s.lat],zoom:Math.max(7,map.getZoom()),duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:400});
 }
 function renderLayers(){
  if(map.getSource('reference-locks'))return;
  map.addSource('reference-locks',{type:'geojson',data:geo()});
  map.addLayer({id:'reference-lock-points',type:'circle',source:'reference-locks',paint:{
   'circle-radius':['case',['==',['get','selected'],1],11,9],
   'circle-color':['case',['==',['get','selected'],1],'#ca7c36','#075e70'],
   'circle-stroke-color':'#fff','circle-stroke-width':3
  }});
  map.addLayer({id:'reference-lock-names',type:'symbol',source:'reference-locks',layout:{
   'text-field':['get','label'],'text-font':['Open Sans Regular','Arial Unicode MS Regular'],
   'text-size':12,'text-offset':[0,1.75],'text-anchor':'top'
  },paint:{'text-color':'#123843','text-halo-color':'#fff','text-halo-width':2.5}});
  map.on('click','reference-lock-points',e=>{const id=e.features?.[0]?.properties?.id;if(id)select(id,true)});
  map.on('mouseenter','reference-lock-points',()=>{map.getCanvas().style.cursor='pointer'});
  map.on('mouseleave','reference-lock-points',()=>{map.getCanvas().style.cursor=''});
  map.on('click','reference-lock-names',e=>{const id=e.features?.[0]?.properties?.id;if(id)select(id,true)});
 }

 // AIS observations remain independent of the official static lock inventory.
 // Never infer queue, lock status, or estimated transit from these markers.
 let aisReports=[],aisPopup=null;
 function aisData(){
  return {type:'FeatureCollection',features:aisReports.map(v=>({type:'Feature',
   geometry:{type:'Point',coordinates:[v.lon,v.lat]},
   properties:{mmsi:v.mmsi,name:v.name||'Unidentified AIS vessel',seen:v.seen,source:v.source||'unknown',speedKnots:v.speedKnots}}))};
 }
 function drawAIS(){
  if(!map||!loaded||!map.isStyleLoaded())return;
  let source=map.getSource('recent-ais');
  if(source){source.setData(aisData());return}
  map.addSource('recent-ais',{type:'geojson',data:aisData()});
  map.addLayer({id:'john-day-ais-markers',type:'circle',source:'recent-ais',paint:{
   'circle-radius':8,'circle-color':'#8536a8','circle-stroke-width':3,'circle-stroke-color':'#fff'
  }});
  map.on('click','john-day-ais-markers',e=>{
   const feature=e.features?.[0],props=feature?.properties||{},point=feature?.geometry?.coordinates;
   if(!point||!Array.isArray(point))return;
   if(aisPopup){aisPopup.remove();aisPopup=null}
   const div=document.createElement('div');
   const name=document.createElement('strong');name.textContent=props.name||'AIS vessel';
   const note=document.createElement('p');note.textContent='AIS last heard '+(props.seen||'unknown')+
    '. This is not a lock-queue record, arrival prediction, or real-time navigation report.';
   div.append(name,note);
   if(typeof GL.Popup==='function')aisPopup=new GL.Popup({closeButton:true,maxWidth:'300px',offset:18})
    .setLngLat(point).setDOMContent(div).addTo(map);
  });
  map.on('mouseenter','john-day-ais-markers',()=>{map.getCanvas().style.cursor='pointer'});
  map.on('mouseleave','john-day-ais-markers',()=>{map.getCanvas().style.cursor=''});
 }
 window.addEventListener('john-day-ais-observations',e=>{
  aisReports=Array.isArray(e.detail?.observations)?e.detail.observations.filter(v=>Number.isFinite(v.lon)&&Number.isFinite(v.lat)):[];
  if(aisPopup){aisPopup.remove();aisPopup=null}
  drawAIS();
 });
 window.addEventListener('john-day-ais-select',e=>{
  const v=aisReports.find(v=>v.mmsi===e.detail?.mmsi);
  if(v&&map&&loaded)map.easeTo({center:[v.lon,v.lat],zoom:Math.max(9,map.getZoom()),duration:350});
 });

 function ifUser(){
  if(!map||!user)return;
  const pt={type:'Feature',geometry:{type:'Point',coordinates:[user.longitude,user.latitude]},properties:{}};
  const source=map.getSource('reader-location');
  if(source){source.setData(pt);return}
  map.addSource('reader-location',{type:'geojson',data:pt});
  map.addLayer({id:'reader-location-circle',type:'circle',source:'reader-location',paint:{
   'circle-radius':8,'circle-color':'#245dc5','circle-stroke-color':'#fff','circle-stroke-width':3
  }});
 }
 function fit(){
  if(map&&loaded)map.fitBounds([[-122.05,45.47],[-119.12,46.03]],{padding:45,maxZoom:8,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:350});
 }
 function cleanMap(){
  if(aisPopup){aisPopup.remove();aisPopup=null}
  if(map){try{map.remove()}catch{ }map=null}
  loaded=false;
 }
 function runStyle(style,key,isCarto){
  cleanMap();providerErrors=0;
  candidate=isCarto?'CARTO Voyager':'OpenFreeMap Liberty';
  const el=$('lockMapSurface');el.replaceChildren();
  try{
   const instance=new GL.Map({
    container:el,style:isCarto?escapeUrl(style,key):style,
    center:[-120.697630,45.719149],zoom:11,minZoom:3,maxZoom:16,
    attributionControl:false,dragRotate:false,pitchWithRotate:false,
    transformRequest:url=>({url:isCarto?escapeUrl(url,key):url})
   });
   map=instance;
   instance.addControl(new GL.NavigationControl({showCompass:false}),'top-right');
   instance.addControl(new GL.AttributionControl({compact:true}),'bottom-right');
   let watchdog=setTimeout(()=>{if(map===instance&&!loaded){if(isCarto)fallback('CARTO basemap did not load');else fail('Basemap timed out')}},11000);
   instance.on('error',()=>{
    if(map!==instance)return;
    providerErrors++;
    if(isCarto)fallback('CARTO tiles unavailable');
    else if(!loaded||providerErrors>=3)fail('Reference map unavailable');
   });
   instance.on('load',()=>{
    if(map!==instance)return;
    clearTimeout(watchdog);
    try{loaded=true;renderLayers();ifUser();drawAIS();
     announce(candidate+' map · verified federal lock locations only. Pin = facility position, not a public visitor entrance or nautical waypoint.');
    }catch{if(isCarto)fallback('CARTO map layers failed');else fail('Map layers unavailable')}
   });
  }catch{if(isCarto)fallback('CARTO initialization failed');else fail('Map software unavailable')}
 }
 function fallback(message){
  if(failedOver)return fail(message);
  failedOver=true;runStyle(URLS.fallback,'',false);
 }
 function fail(message){
  cleanMap();inFlight=false;
  announce(message+'. The lock selection list and federal source remain available without a map.');
  stage.querySelector('.corridorMapWrap')?.classList.add('map-unavailable');
 }
 async function start(){
  if(inFlight)return;inFlight=true;
  stage.querySelector('.corridorMapWrap')?.classList.remove('map-unavailable');
  announce('Preparing the Columbia River reference map…');
  try{
   const s=document.createElement('link');s.rel='stylesheet';s.href='https://cdn.jsdelivr.net/npm/maplibre-gl@6.3.0/dist/maplibre-gl.css';document.head.append(s);
   GL=await import('https://cdn.jsdelivr.net/npm/maplibre-gl@6.3.0/dist/maplibre-gl.mjs');
   let key='';
   try{const r=await fetch('/api/carto-basemap-config',{signal:AbortSignal.timeout(6500)});
    if(r.ok){const d=await r.json();if(d.provider==='CARTO'&&typeof d.key==='string'&&d.key.length>9)key=d.key}
   }catch{}
   if(key)runStyle(URLS.carto,key,true);else runStyle(URLS.fallback,'',false);
  }catch{fail('MapLibre could not load')}
 }
 buttons.forEach(b=>b.addEventListener('click',()=>select(b.dataset.riverLock)));
 $('lockMapFocus').addEventListener('click',fit);
 $('lockMapLocate').addEventListener('click',()=>{
  if(!navigator.geolocation){announce('Device location unavailable; use lock buttons to explore instead.');return}
  announce('Asking your device for your approximate location (used only on this map)…');
  navigator.geolocation.getCurrentPosition(
   pos=>{
    user={latitude:pos.coords.latitude,longitude:pos.coords.longitude};
    ifUser();if(map&&loaded)map.easeTo({center:[user.longitude,user.latitude],zoom:7,duration:350});
    announce('Location shown when the map is ready. No location is stored by this website; the map provider receives ordinary map-tile requests. No road route or navigation advice is calculated.');
   },
   ()=>announce('Device location denied or unavailable. Select a lock above to explore.'),{enableHighAccuracy:false,timeout:9000,maximumAge:300000}
  );
 });
 $('lockMapStart').addEventListener('click',start);
 describe(byId.get('john-day'));
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();start()}},{rootMargin:'80px'});
  observer.observe(stage);
 } // no observer? accessible explicit button remains
})();
