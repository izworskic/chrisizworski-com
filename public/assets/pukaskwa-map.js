import { verifyMapCatalog, MAP_DATA_ROUTE, relatedPlace, mapLink, placeInterpretation } from './pukaskwa-map-contract.mjs';

const doc=document;
const officialButton=doc.getElementById('pk-official-map-tab');
const interactiveButton=doc.getElementById('pk-interactive-map-tab');
const originalPanel=doc.getElementById('pk-map-official-panel');
const interactivePanel=doc.getElementById('pk-map-interactive-panel');
const mapFrame=doc.getElementById('pk-interactive-map');
const status=doc.getElementById('pk-map-status');
const explanationTitle=doc.getElementById('pk-map-choice-title');
const explanationBody=doc.getElementById('pk-map-choice-body');
const focusChoice=doc.getElementById('pk-map-focus-choice');
const placeNodes=[...doc.querySelectorAll('[data-map-place]')];
const buttons=[...doc.querySelectorAll('[data-map-focus]')];
if(!officialButton||!interactiveButton||!originalPanel||!interactivePanel||!mapFrame||!status||
   !explanationTitle||!explanationBody||!focusChoice||!placeNodes.length) {
  throw new Error('Pukaskwa visitor map HTML is incomplete');
}
const resourceUrl='/api/carto-basemap-config';
const CDN_CSS='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
const CDN_JS='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
const OSM_TILES='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
let catalog=null,map=null,markers=new Map(),requestedMap=null,libraryLoad=null;
let activeId=null,selectedTrail='southern-headland',selectedStatus='source-unverified';
const text=(el,value)=>{if(el)el.textContent=value};
const requestedLink=()=>doc.getElementById('pk-result-link')?.getAttribute('href')?.replace(/^#pk-/,'')||'southern-headland';
selectedTrail=requestedLink();

async function loadCatalog() {
  if(catalog)return catalog;
  const response=await fetch(MAP_DATA_ROUTE,{headers:{Accept:'application/json'},cache:'force-cache',signal:AbortSignal.timeout(7000)});
  if(!response.ok)throw new Error('Parks Canada public visitor points unavailable');
  const info=verifyMapCatalog(await response.json());
  catalog=info;
  updateTrailSelection();
  return info;
}

function selectFromList(id,{moveMap=true}={}) {
  if(!catalog)return;
  const point=catalog.points.find(p=>p.id===id);
  if(!point)return;
  activeId=id;
  for(const li of placeNodes){
    const picked=li.dataset.mapPlace===id;
    li.dataset.picked=String(picked);
    const control=li.querySelector('[data-map-focus]');
    if(control)control.setAttribute('aria-pressed',String(picked));
  }
  if(map&&moveMap&&markers.has(id)){
    map.setView([point.lat,point.lon],Math.max(map.getZoom(),15),{animate:false});
    markers.get(id).openPopup();
  }
  for(const [pointId,marker] of markers) {
    const selected=pointId===id;
    marker.setStyle({radius:selected?11:7,weight:selected?3:1.5,fillOpacity:selected?1:.85});
    marker.bringToFront();
  }
}
function updateTrailSelection() {
  if(!catalog)return;
  const point=relatedPlace(catalog,selectedTrail);
  const title=doc.querySelector('#pk-'+selectedTrail+' h3')?.textContent?.trim()||
    doc.getElementById('pk-result-heading')?.textContent?.trim()||'Your selected hike';
  text(explanationTitle,title);
  text(explanationBody,placeInterpretation(point,selectedTrail)+
    (selectedStatus==='closed'?' This trail has a documented closure; do not plan to enter.':' The pin does not establish present access.'));
  focusChoice.dataset.mapTarget=point?.id||'';
  focusChoice.disabled=!point;
  focusChoice.textContent=point?'Locate the related mapped place':'Route location is intentionally withheld';
  if(point)selectFromList(point.id,{moveMap:Boolean(map)});
}
function switchDisplay(which) {
  const interactive=which==='interactive';
  originalPanel.hidden=interactive;
  interactivePanel.hidden=!interactive;
  officialButton.setAttribute('aria-pressed',String(!interactive));
  interactiveButton.setAttribute('aria-pressed',String(interactive));
  if(interactive&&map){requestAnimationFrame(()=>map.invalidateSize({pan:false}));}
}

function scriptLoad(url) {
  return new Promise((resolve,reject)=>{
    const tag=doc.createElement('script');
    tag.src=url;tag.async=true;tag.crossOrigin='anonymous';
    tag.onload=()=>resolve();tag.onerror=()=>reject(new Error('Interactive map library unavailable'));
    doc.head.append(tag);
  });
}
function getLeaflet() {
  if(window.L?.map)return Promise.resolve(window.L);
  if(libraryLoad)return libraryLoad;
  if(!doc.querySelector('link[data-pk-leaflet]')) {
    const css=doc.createElement('link');css.rel='stylesheet';css.href=CDN_CSS;
    css.dataset.pkLeaflet='';doc.head.append(css);
  }
  libraryLoad=scriptLoad(CDN_JS).then(()=>{
    if(!window.L?.map)throw new Error('Leaflet library did not initialize');
    return window.L;
  });
  return libraryLoad;
}
function popupFor(point) {
  const div=doc.createElement('div');div.className='pk-map-popup';
  const heading=doc.createElement('strong');heading.textContent=point.name;div.append(heading);
  const category=doc.createElement('small');
  category.textContent=point.kind==='parking'?'Parks Canada mapped parking point · access not verified':'Parks Canada public visitor point · not a trailhead';
  div.append(category);
  const para=doc.createElement('p');para.textContent=point.description;div.append(para);
  const actions=doc.createElement('div');actions.className='pk-map-linkline';
  const official=doc.createElement('a');official.href=point.url;official.target='_blank';official.rel='noopener noreferrer';official.textContent='Official park details';
  const maps=doc.createElement('a');maps.href=mapLink(point);maps.target='_blank';maps.rel='noopener noreferrer';maps.textContent='View GIS point in Google Maps';
  actions.append(official,maps);div.append(actions);
  return div;
}
function showMapFailure(message){
  mapFrame.dataset.tiles='unavailable';
  doc.body.dataset.pkMapReady='fallback';
  status.dataset.state='failure';
  text(status,message+' The original Parks Canada trail map and every mapped-place link remain available.');
  switchDisplay('official');
  const evidence=doc.querySelector('.pk-map-evidence');
  if(evidence) evidence.dataset.mapFailure='true';
  if(map){try{map.remove()}catch{}map=null;markers.clear();}
  requestedMap=null;
}
function tilePromise(layer,mapInstance,{timeout=9000,errorsAllowed=2}={}) {
  return new Promise((resolve,reject)=>{
    let resolved=false,failures=0;
    const cancel=()=>{layer.off('tileload',loaded);layer.off('tileerror',failed);clearTimeout(timer)};
    const loaded=()=>{if(resolved)return;resolved=true;cancel();resolve(layer)};
    const failed=()=>{if(++failures>=errorsAllowed&&!resolved){resolved=true;cancel();reject(new Error('Map tiles are blocked or unavailable'))}};
    const timer=setTimeout(()=>{if(resolved)return;resolved=true;cancel();reject(new Error('Map tiles did not load'))},timeout);
    layer.on('tileload',loaded);layer.on('tileerror',failed);layer.addTo(mapInstance);
  });
}
async function addRealTiles(L,m) {
  // Basemap's public key is stored in Vercel, not in this repository. Do not
  // cache or print the key; only place it in the authorized CARTO tile URL.
  let conf=null;
  try{
    const response=await fetch(resourceUrl,{credentials:'same-origin',signal:AbortSignal.timeout(6000)});
    if(response.ok)conf=await response.json();
  }catch{}
  if(conf?.provider==='CARTO'&&typeof conf.key==='string'&&conf.key.trim()){
    const tile='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key='+encodeURIComponent(conf.key.trim());
    const layer=L.tileLayer(tile,{subdomains:'abcd',maxZoom:19,crossOrigin:true,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'});
    try{
      await tilePromise(layer,m,{timeout:7500});
      mapFrame.dataset.tiles='carto';
      return 'CARTO';
    }catch{if(m.hasLayer(layer))m.removeLayer(layer);}
  }
  // Leaflet and the listed visitor points are still usable without CARTO, but
  // tiles must *actually render*. If both providers fail, show the official map.
  const osm=L.tileLayer(OSM_TILES,{maxZoom:19,crossOrigin:true,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'});
  try{
    await tilePromise(osm,m,{timeout:9000,errorsAllowed:2});
    mapFrame.dataset.tiles='osm';
    return 'OpenStreetMap';
  }catch{
    if(m.hasLayer(osm))m.removeLayer(osm);
    throw new Error('Both CARTO and fallback map tiles failed');
  }
}
async function createMap(){
  const L=await getLeaflet();
  const info=await loadCatalog();
  if(map)return;
  switchDisplay('interactive');
  map=L.map(mapFrame,{scrollWheelZoom:false,zoomControl:true,attributionControl:true,preferCanvas:false});
  map.setView([48.591,-86.294],14.5);
  for(const point of info.points){
    const marker=L.circleMarker([point.lat,point.lon],{
      radius:7,weight:1.5,color:'#f7f4e9',fillOpacity:.88,
      fillColor:point.kind==='parking'?'#ad6c28':'#236d61',
    });
    marker.addTo(map);
    marker.bindPopup(popupFor(point),{maxWidth:290});
    marker.on('click',()=>selectFromList(point.id,{moveMap:false}));
    markers.set(point.id,marker);
  }
  selectFromList(activeId||'day-use-parking',{moveMap:false});
  await new Promise(resolve=>requestAnimationFrame(()=>{map.invalidateSize({pan:false});resolve()}));
  text(status,'Checking real basemap tiles and the seven publicly released Parks Canada coordinates…');
  const provider=await addRealTiles(L,map);
  map.invalidateSize({pan:false});
  doc.body.dataset.pkMapReady='true';
  status.dataset.state='ready';
  text(status,provider+' map tiles loaded. Seven Parks Canada public places are mapped. No trail paths, safe crossings or road access are inferred.');
}
async function showInteractive(){
  switchDisplay('interactive');
  if(map&&doc.body.dataset.pkMapReady==='true'){map.invalidateSize({pan:false});return;}
  if(requestedMap)return requestedMap;
  requestedMap=createMap().catch(e=>{showMapFailure(String(e?.message||'Map unavailable'));});
  return requestedMap;
}
officialButton.addEventListener('click',()=>switchDisplay('official'));
interactiveButton.addEventListener('click',()=>{void showInteractive()});
for(const button of buttons){
  button.addEventListener('click',()=>{
    if(!catalog){void loadCatalog().then(()=>{
      selectFromList(button.dataset.mapFocus,{moveMap:false});
      return showInteractive();
    }).catch(e=>showMapFailure(String(e?.message||'Map data missing')));return;}
    selectFromList(button.dataset.mapFocus,{moveMap:false});
    void showInteractive().then(()=>{
      selectFromList(button.dataset.mapFocus,{moveMap:true});
    });
  });
}
focusChoice.addEventListener('click',()=>{
  const pointId=focusChoice.dataset.mapTarget;
  if(!pointId)return;
  void showInteractive().then(()=>selectFromList(pointId,{moveMap:true}));
});
doc.addEventListener('pukaskwa:choice',event=>{
  selectedTrail=event.detail?.id||'';
  selectedStatus=event.detail?.status||'source-unverified';
  updateTrailSelection();
});
// Small JSON metadata fetch is allowed before map activation; Leaflet and map
// tiles remain deferred until the visitor explicitly requests the map.
loadCatalog().catch(()=>{
  focusChoice.disabled=true;
  text(explanationBody,'Public visitor GIS locations could not be loaded. The official park map and its own trail descriptions remain available.');
});
