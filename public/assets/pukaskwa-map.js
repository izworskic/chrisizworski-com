import { verifyMapCatalog, MAP_DATA_ROUTE, relatedPlace, mapLink, placeInterpretation } from './pukaskwa-map-contract.mjs';
import {verifyCommunityCenterlines, TRAIL_GEOJSON_URL, APPROVED_WAYS, summaryForTrail, OSM_COPYRIGHT_URL, ODBL_URL} from './pukaskwa-trail-geometry.mjs';
import {startAdvice,officialMapOrientation} from './pukaskwa-starts.mjs';
import {mappedJunctionEvidence,osmNodeUrl,osmWayUrl} from './pukaskwa-junction-evidence.mjs';

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
const focusTrail=doc.getElementById('pk-map-focus-trail');
const trailNote=doc.getElementById('pk-map-choice-trail-note');
const startText=doc.getElementById('pk-map-start-text');
const startSequence=doc.getElementById('pk-map-start-sequence');
const startWarning=doc.getElementById('pk-map-start-warning');
const accessProofHead=doc.getElementById('pk-access-proof-heading');
const accessProofDetail=doc.getElementById('pk-access-proof-detail');
const parkDiagramRing=doc.getElementById('pk-official-label-ring');
const parkDiagramTitle=doc.getElementById('pk-official-wayfinding-title');
const parkDiagramText=doc.getElementById('pk-official-wayfinding-text');
const findParkLabel=doc.getElementById('pk-find-park-map-label');
const junctionHead=doc.getElementById('pk-junction-heading');
const junctionSummary=doc.getElementById('pk-junction-summary');
const junctionList=doc.getElementById('pk-junction-list');
const junctionSources=doc.getElementById('pk-junction-sources');
const junctionWarning=doc.getElementById('pk-junction-warning');
const trailToggle=doc.getElementById('pk-show-trail-lines');
const trailStatus=doc.getElementById('pk-trail-lines-status');
const placeNodes=[...doc.querySelectorAll('[data-map-place]')];
const buttons=[...doc.querySelectorAll('[data-map-focus]')];
if(!officialButton||!interactiveButton||!originalPanel||!interactivePanel||!mapFrame||!status||
   !explanationTitle||!explanationBody||!focusChoice||!focusTrail||!trailToggle||!trailStatus||!placeNodes.length) {
  throw new Error('Pukaskwa visitor map HTML is incomplete');
}
const resourceUrl='/api/carto-basemap-config';
const CDN_CSS='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
const CDN_JS='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
const OSM_TILES='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
let catalog=null,map=null,markers=new Map(),requestedMap=null,libraryLoad=null;
let communityLines=null,communityFetch=null,communityLayer=null,trailLayers=new Map();
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
function renderJunctionEvidence(trailId,status){
  // This is source-relationship evidence only, deliberately independent of
  // the GIS catalog and of the Leaflet/CARTO tile-loading path.
  if(!junctionHead||!junctionSummary||!junctionList||!junctionWarning||!junctionSources)return;
  const blocked=status==='closed'||status==='out-of-season'||status==='last-known-closed';
  const audit=mappedJunctionEvidence(trailId,{blocked});
  junctionHead.textContent=audit.heading;
  junctionSummary.textContent=audit.summary;
  junctionWarning.textContent=audit.safety;
  junctionList.replaceChildren();
  junctionSources.hidden=!audit.items.length;
  for(const entry of audit.items){
    const li=doc.createElement('li');
    const name=doc.createElement('strong');name.textContent=entry.label;
    const original=doc.createElement('a');
    original.href=osmNodeUrl(entry.nodeId);original.target='_blank';original.rel='noopener noreferrer';
    original.textContent='Original OSM node';
    const trail=doc.createElement('a');
    trail.href=osmWayUrl(entry.trailWay);trail.target='_blank';trail.rel='noopener noreferrer';
    trail.textContent='Named trail';
    const adjoining=doc.createElement('a');
    adjoining.href=osmWayUrl(entry.adjoiningWay);adjoining.target='_blank';adjoining.rel='noopener noreferrer';
    adjoining.textContent=entry.adjoiningClass==='service-road'?'Mapped road':'Adjoining trail';
    li.append(name,doc.createTextNode(' '),original,doc.createTextNode(' · '),trail,
      doc.createTextNode(' · '),adjoining);
    junctionList.append(li);
  }
}

const isBlockedStatus=status=>['closed','out-of-season','last-known-closed'].includes(status);
findParkLabel?.addEventListener('click',()=>{
  if(isBlockedStatus(selectedStatus))return;
  officialButton.click();
  const target=officialMapOrientation(selectedTrail)?.label
    ? doc.getElementById('pk-campground-detail') : doc.getElementById('pk-map-official-panel');
  target?.scrollIntoView({behavior:'smooth',block:'start'});
});

function updateTrailSelection() {
  renderJunctionEvidence(selectedTrail,selectedStatus);
  if(!catalog)return;
  const point=relatedPlace(catalog,selectedTrail);
  const title=doc.querySelector('#pk-'+selectedTrail+' h3')?.textContent?.trim()||
    doc.getElementById('pk-result-heading')?.textContent?.trim()||'Your selected hike';
  text(explanationTitle,title);
  text(explanationBody,placeInterpretation(point,selectedTrail)+
    (isBlockedStatus(selectedStatus)?' This trail has a documented closure or season restriction; do not plan to enter.':' The pin does not establish present access.'));
  focusChoice.dataset.mapTarget=point?.id||'';
  focusChoice.disabled=!point;
  focusChoice.textContent=point?'Locate the related mapped place':'Route location is intentionally withheld';
  if(point)selectFromList(point.id,{moveMap:Boolean(map)});
  const hasTrail=Object.hasOwn(APPROVED_WAYS,selectedTrail);
  const blocked=isBlockedStatus(selectedStatus);
  const parkEvidence=officialMapOrientation(selectedTrail,{blocked});
  if(parkEvidence&&parkDiagramTitle&&parkDiagramText&&parkDiagramRing){
    parkDiagramTitle.textContent=blocked?'Closed: no approach suggested':
      (parkEvidence.label?'Find the printed trail label':'Refer to the full park trail map');
    parkDiagramText.textContent=parkEvidence.description+' '+parkEvidence.mappingMeaning;
    parkDiagramRing.hidden=!parkEvidence.label;
    if(parkEvidence.label){
      parkDiagramRing.setAttribute('cx',String(parkEvidence.label.x));
      parkDiagramRing.setAttribute('cy',String(parkEvidence.label.y));
      parkDiagramRing.setAttribute('aria-label',parkEvidence.label.caption);
    }
    if(findParkLabel){
      findParkLabel.disabled=blocked;
      findParkLabel.textContent=blocked?'Trail reported closed · no approach':
        parkEvidence.label?'Show name on park campground map':'Show on full official park map';
    }
  }
  const orientation=startAdvice(selectedTrail,{closed:blocked,hasApprovedGeometry:hasTrail});
  if(orientation&&startText&&startSequence&&startWarning) {
    startText.textContent=orientation.guidance;
    startWarning.textContent=orientation.closureNote+' '+orientation.geometryNote;
    if(accessProofHead&&accessProofDetail){
      accessProofHead.textContent=orientation.accessEvidenceClass==='closed-no-route'
        ? 'Closed trail: no walking approach recommended'
        : orientation.accessEvidenceClass==='official-named-circuit-no-gps'
          ? 'Park-described walking circuit · no verified GPS connection'
          : 'Official Visitor Centre origin · signed GPS entrance not verified';
      accessProofDetail.textContent=orientation.pedestrianAccessEvidence;
    }
    const steps=orientation.sequence.map(value=>{const li=doc.createElement('li');li.textContent=value;return li;});
    startSequence.replaceChildren(...steps);
  }
  focusTrail.disabled=!hasTrail||blocked;
  focusTrail.textContent=blocked?'Trail is reported closed':hasTrail?'Show mapped trail line':'No independently mapped trail line';
  if(trailNote) {
    trailNote.textContent=blocked
      ? 'The route is reported closed. A mapped line never overrides that closure.'
      : hasTrail
        ? 'This path is community-mapped, not Parks Canada GPS-surveyed. Missing access connectors and return legs are not drawn.'
        : 'No approved coordinate path is available for this outing; use the official illustration and dated park notices.';
  }
  updateCommunityHighlight();
}

function trailStatusFor(id){
  return doc.getElementById('pk-'+id)?.dataset.status||'source-unverified';
}
function styleForTrail(id){
  const closed=isBlockedStatus(trailStatusFor(id));
  const selected=id===selectedTrail&&!closed;
  return {
    className:'pk-community-trail',
    color:closed?'#a03f2a':selected?'#176e64':'#708d80',
    weight:closed?4:selected?6:3.3,
    opacity:closed?.85:selected?1:.66,
    dashArray:closed?'4 5':selected?null:'7 6',
    lineCap:'round',lineJoin:'round',
  };
}
function popupForTrail(feature) {
  const item=feature.properties,trailId=item.trailId;
  const summary=summaryForTrail(communityLines,trailId);
  const state=trailStatusFor(trailId);
  const holder=doc.createElement('div');holder.className='pk-map-popup';
  const title=doc.createElement('strong');title.textContent=item.name||'Community-mapped trail';holder.append(title);
  const provenance=doc.createElement('small');
  provenance.textContent='OpenStreetMap georeferenced path segment · NOT an official GPS-surveyed track';
  holder.append(provenance);
  const p=doc.createElement('p');
  p.textContent=summary
    ? 'Community-mapped segments: '+summary.mappedCenterlineKm.toFixed(2)+' km across '+summary.mappedSegmentCount+
      ' ways. Parks Canada full hike: '+summary.officialEntireOutingKm+' km. These are different measurements, not interchangeable.'
    : 'Only part of this walking path may be mapped.';
  holder.append(p);
  if(isBlockedStatus(state)){
    const warning=doc.createElement('p');warning.textContent='Parks Canada has reported this trail closed or out of season. Do not enter based on this line.';
    warning.style.fontWeight='800';warning.style.color='#a03f2a';holder.append(warning);
  } else {
    const notice=doc.createElement('p');
    notice.textContent='This is location-reference geometry only. Inspect official trail condition dates and follow park signs before hiking.';
    holder.append(notice);
  }
  const links=doc.createElement('div');links.className='pk-map-linkline';
  const original=doc.createElement('a');original.href=item.sourceUrl;original.target='_blank';original.rel='noopener noreferrer';
  original.textContent='View original OSM way';links.append(original);
  const official=doc.createElement('a');
  official.href='https://parks.canada.ca/pn-np/on/pukaskwa/activ/experience/randonnees-hiking/etat-sentiers-trail-conditions';
  official.target='_blank';official.rel='noopener noreferrer';official.textContent='Official dated conditions';
  links.append(official);holder.append(links);
  return holder;
}
function updateCommunityHighlight(){
  if(!map||!communityLayer)return;
  communityLayer.eachLayer(layer=>{
    const f=layer.feature, id=f?.properties?.trailId;
    if(id){
      layer.setStyle(styleForTrail(id));
      layer.bindPopup(popupForTrail(f),{maxWidth:310});
    }
  });
  mapFrame.dataset.activeTrail=selectedTrail||'none';
  if(trailToggle.checked){
    const selected=trailLayers.get(selectedTrail)||[];
    selected.forEach(layer=>layer.bringToFront());
    for(const marker of markers.values())marker.bringToFront();
  }
}
async function loadCommunityLines(){
  if(communityLines)return communityLines;
  if(communityFetch)return communityFetch;
  communityFetch=fetch(TRAIL_GEOJSON_URL,{
    headers:{Accept:'application/geo+json,application/json'},cache:'force-cache',
    signal:AbortSignal.timeout(8500)
  }).then(async response=>{
    if(!response.ok)throw new Error('Community trail data unavailable');
    const len=Number(response.headers.get('content-length')||'0');
    if(len>130000)throw new Error('Unexpectedly large trail file');
    const raw=await response.text();
    if(raw.length>130000)throw new Error('Unexpectedly large trail file');
    communityLines=verifyCommunityCenterlines(JSON.parse(raw));
    return communityLines;
  }).finally(()=>{communityFetch=null;});
  return communityFetch;
}
function attachCommunityLines(L){
  if(!map||!communityLines||communityLayer)return;
  trailLayers=new Map();
  communityLayer=L.geoJSON(communityLines,{
    style:f=>styleForTrail(f.properties.trailId),
    onEachFeature:(feature,layer)=>{
      const id=feature.properties.trailId;
      if(!trailLayers.has(id))trailLayers.set(id,[]);
      trailLayers.get(id).push(layer);
      layer.bindPopup(popupForTrail(feature),{maxWidth:310});
    }
  });
  map.attributionControl.addAttribution(
    'Trail lines &copy; <a href="'+OSM_COPYRIGHT_URL+'" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors (ODbL)</a>'
  );
  if(trailToggle.checked)communityLayer.addTo(map);
  mapFrame.dataset.trailLines=String(communityLines.features.length);
  mapFrame.dataset.visibleTrailLines=trailToggle.checked?String(communityLines.features.length):'0';
  trailStatus.textContent=communityLines.features.length+' community-mapped segments for five named trails. Not certified for GPS navigation.';
  updateCommunityHighlight();
}
function setTraceVisibility(){
  if(!map||!communityLayer)return;
  const show=trailToggle.checked;
  if(show&&!map.hasLayer(communityLayer))communityLayer.addTo(map);
  if(!show&&map.hasLayer(communityLayer))map.removeLayer(communityLayer);
  mapFrame.dataset.visibleTrailLines=show?String(communityLines.features.length):'0';
  if(show)updateCommunityHighlight();
}
function focusSelectedTrace(){
  if(!map||!communityLayer||!communityLines||!trailToggle.checked)return;
  const layers=trailLayers.get(selectedTrail)||[];
  if(!layers.length||isBlockedStatus(trailStatusFor(selectedTrail)))return;
  const L=window.L;
  const points=layers.flatMap(layer=>layer.feature.geometry.coordinates.map(p=>[p[1],p[0]]));
  if(!points.length)return;
  // The visitor explicitly asked to see the trail, not keep a large place popup
  // covering the mapped line on a narrow mobile viewport.
  map.closePopup();
  map.fitBounds(L.latLngBounds(points).pad(.22),{maxZoom:15.5,animate:false});
  updateCommunityHighlight();
  map.invalidateSize({pan:false});
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
  if(map){try{map.remove()}catch{}map=null;markers.clear();trailLayers.clear();communityLayer=null;}
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
  try {
    await loadCommunityLines();
    attachCommunityLines(L);
  } catch(err) {
    mapFrame.dataset.trailLines='unavailable';
    trailStatus.textContent='Community-mapped centerlines unavailable. Parks Canada’s official trail diagram remains the route reference.';
  }
  map.invalidateSize({pan:false});
  doc.body.dataset.pkMapReady='true';
  status.dataset.state='ready';
  text(status,provider+' map tiles loaded. Seven Parks Canada visitor points and '+(communityLines?communityLines.features.length+' community trail segments':'no verified trail lines')+' are available. Lines are not full-route GPS directions or access authorization.');
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
trailToggle.addEventListener('change',setTraceVisibility);
focusTrail.addEventListener('click',async()=>{
  if(focusTrail.disabled)return;
  await showInteractive();
  if(!communityLayer||!map)return;
  if(!trailToggle.checked){trailToggle.checked=true;setTraceVisibility();}
  focusSelectedTrace();
});
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
