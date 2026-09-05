(()=>{
'use strict';
if(location.pathname!=='/michigan-boat-launches/')return;

const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const emit=(name,props={})=>{try{window.va?.('event',{name,...props});}catch{}};
const SOURCE_API='/api/boat-launches';
const GEOCODE_API='/api/boat-launch-geocode';
const DRIVE_API='/api/boat-launch-drive';
const WEATHER_API='/api/boat-launch-weather';
const DNR_LAYER='https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/PRDBASPublicView/FeatureServer/0';
const RANK=window.BoatLaunchRanking;

const form=$('#launch-search-form');
const search=$('#launch-search');
const submit=$('#launch-search-submit');
const clear=$('#launch-clear');
const sort=$('#sort-filter');
const scope=$('#scope-filter');
const ramp=$('#ramp-filter');
const parking=$('#parking-filter');
const summary=$('#launch-summary');
const sourceStatus=$('#launch-source-status');
const resultsTitle=$('#results-title');
const resultsCount=$('#results-count');
const results=$('#launch-results');
const selected=$('#selected-launch');

let records=[];
let filtered=[];
let displayed=[];
let destinationPoint=null;
let destinationQuery='';
let searchMode='all';
let routed=false;
let selectedId='';
let map=null;
let cluster=null;
let destinationMarker=null;
const markerById=new Map();
const weatherCache=new Map();

function num(v){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function toRadians(deg){return deg*Math.PI/180;}
function distanceMiles(lat1,lon1,lat2,lon2){return RANK?RANK.distanceMiles(lat1,lon1,lat2,lon2):2*3958.7613*Math.asin(Math.sqrt(Math.sin(toRadians(lat2-lat1)/2)**2+Math.cos(toRadians(lat1))*Math.cos(toRadians(lat2))*Math.sin(toRadians(lon2-lon1)/2)**2));}
function isReview(a){return a.verificationStatus==='dnr-review-in-progress'||a.detailsUnderReview===true;}
function isSupplemental(a){return a.verificationStatus==='municipal-source-qualified'||a.sourceType==='municipal-supplemental';}
function operatorText(a){return a.operator||a.owner||'Not listed';}
function launchStatusText(a){return String(a.launchStatus||'Open').trim()||'Open';}
function conditionText(a){return String(a.facilityCondition||'').trim();}
function rampText(a){
  if(isSupplemental(a)&&a.rampDescription)return a.rampDescription;
  const code=num(a.rampClass);
  if(code===1)return 'Hard-surface ramp · most trailerable boats';
  if(code===2)return 'Hard-surface ramp · limited depth';
  if(code===3)return 'Gravel ramp · smaller boats';
  if(a.carryDown)return `Carry-down${a.carryDownType?` · ${a.carryDownType}`:''}`;
  return 'Ramp class not listed';
}
function directions(a){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${a.latitude},${a.longitude}`)}`;}
function satellite(a){return `https://www.google.com/maps/@?api=1&map_action=map&center=${encodeURIComponent(`${a.latitude},${a.longitude}`)}&zoom=18&basemap=satellite`;}
function searchHaystack(a){return [a.name,a.labelName,a.waterbody,a.county,a.operator,a.owner].filter(Boolean).join(' ').toLowerCase();}
function directMatches(q,base=filtered){const needle=q.trim().toLowerCase();return needle?base.filter(a=>searchHaystack(a).includes(needle)):[];}
function recordDistance(a){return destinationPoint?distanceMiles(destinationPoint.latitude,destinationPoint.longitude,Number(a.latitude),Number(a.longitude)):null;}
function reachText(a){
  if(destinationPoint&&a.driveMiles!==null&&a.driveMiles!==undefined){const mins=num(a.driveMinutes);return `${a.driveMiles.toFixed(1)} mi · ${mins===null?'drive':`${Math.round(mins)} min`}`;}
  const d=a.distanceMiles??recordDistance(a);return d===null?'':`${d.toFixed(1)} mi straight line`;
}

function passesFilters(a){
  if(scope.value&&a.waterScope!==scope.value)return false;
  if(ramp.value){
    if(isReview(a)||isSupplemental(a))return false;
    if(ramp.value==='carry'){if(!a.carryDown)return false;}
    else if(String(num(a.rampClass))!==ramp.value)return false;
  }
  const minParking=Number(parking.value||0);
  if(minParking){
    if(isReview(a)||isSupplemental(a))return false;
    const listed=num(a.trailerParking);
    if(listed===null||listed<minParking)return false;
  }
  return true;
}
function sortList(list){
  const copy=list.slice();
  if(sort.value==='nearest'&&destinationPoint){
    return copy.sort((a,b)=>{
      const ad=num(a.driveMinutes),bd=num(b.driveMinutes);
      if(routed&&ad!==null&&bd!==null&&Math.round(ad)!==Math.round(bd))return Math.round(ad)-Math.round(bd);
      const ar=num(a.driveMiles)??a.distanceMiles??recordDistance(a)??Infinity;
      const br=num(b.driveMiles)??b.distanceMiles??recordDistance(b)??Infinity;
      return ar-br;
    });
  }
  if(sort.value==='parking')return copy.sort((a,b)=>(num(b.trailerParking)??-1)-(num(a.trailerParking)??-1)||a.name.localeCompare(b.name));
  if(sort.value==='waterbody')return copy.sort((a,b)=>String(a.waterbody||'').localeCompare(String(b.waterbody||''))||a.name.localeCompare(b.name));
  return copy.sort((a,b)=>a.name.localeCompare(b.name));
}

function compactDestination(displayName,fallback){
  const parts=String(displayName||fallback).split(',').map(x=>x.trim()).filter(Boolean);
  return parts.slice(0,3).join(', ')||fallback;
}
function updateURL(q=''){
  const url=new URL(location.href);if(q)url.searchParams.set('q',q);else url.searchParams.delete('q');history.replaceState(null,'',url.pathname+url.search);
}

function loadScript(src,key){return new Promise((resolve,reject)=>{if(document.querySelector(`script[data-${key}]`)){const wait=setInterval(()=>{if(window.L){clearInterval(wait);resolve();}},50);setTimeout(()=>{clearInterval(wait);resolve();},5000);return;}const s=document.createElement('script');s.src=src;s.dataset[key]='1';s.onload=resolve;s.onerror=reject;document.head.append(s);});}
function loadCss(href,key){if(document.querySelector(`link[data-${key}]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset[key]='1';document.head.append(l);}
async function initMap(){
  loadCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css','launchLeaflet');
  if(!window.L)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js','launchLeaflet');
  loadCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css','launchCluster');
  loadCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css','launchClusterDefault');
  try{await loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js','launchClusterJs');}catch{}
  map=L.map('launch-map',{scrollWheelZoom:false,zoomControl:true}).setView([44.7,-85.5],6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88',{attribution:'&copy; OpenStreetMap contributors &copy; CARTO',subdomains:'abcd',maxZoom:19}).addTo(map);
  cluster=typeof L.markerClusterGroup==='function'?L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:48,spiderfyOnMaxZoom:true,disableClusteringAtZoom:14}):L.layerGroup();
  cluster.addTo(map);
  drawMap(true);
}
function launchIcon(a){
  const classes=[isSupplemental(a)?'municipal':'open',a.id===selectedId?'active':''].filter(Boolean).join(' ');
  return L.divIcon({className:'launch-dot',html:`<span class="${classes}"></span>`,iconSize:[20,20],iconAnchor:[10,10]});
}
function popupHTML(a){return `<strong>${esc(a.name)}</strong><br><small>${esc(a.waterbody||a.county||'Waterbody not listed')}</small><div style="margin-top:6px"><a href="#" data-popup-card="${esc(a.id)}">Open details</a> · <a href="${directions(a)}" target="_blank" rel="noopener">Directions</a></div>`;}
function mapSet(){return filtered;}
function drawMap(fit=false,fitRecords=null){
  if(!map||!cluster)return;
  cluster.clearLayers();markerById.clear();
  if(destinationMarker){map.removeLayer(destinationMarker);destinationMarker=null;}
  for(const a of mapSet()){
    const marker=L.marker([a.latitude,a.longitude],{icon:launchIcon(a),title:a.name});
    marker.bindPopup(popupHTML(a),{maxWidth:300});
    marker.on('click',()=>selectLaunch(a.id,'marker'));
    cluster.addLayer(marker);markerById.set(a.id,marker);
  }
  if(destinationPoint){destinationMarker=L.circleMarker([destinationPoint.latitude,destinationPoint.longitude],{radius:8,weight:3,fillOpacity:.88,className:'destination-marker'}).addTo(map).bindTooltip(`Search: ${esc(destinationPoint.label)}`);}
  if(!fit)return;
  const target=Array.isArray(fitRecords)&&fitRecords.length?fitRecords:mapSet();
  const bounds=target.slice(0,5000).map(a=>[a.latitude,a.longitude]);
  if(destinationPoint)bounds.push([destinationPoint.latitude,destinationPoint.longitude]);
  if(bounds.length>1)map.fitBounds(bounds,{padding:[28,28],maxZoom:11});
  else if(bounds.length===1)map.setView(bounds[0],11);
}

function resultRow(a){
  const d=destinationPoint?reachText(a):'';
  const status=isSupplemental(a)?'Municipal source':launchStatusText(a);
  return `<button class="result-row${a.id===selectedId?' active':''}" type="button" data-launch-id="${esc(a.id)}"><span><span class="result-name">${esc(a.name)}</span><span class="result-meta">${esc(a.waterbody||a.county||'Waterbody not listed')} · ${esc(status)}${a.trailerParking!==null&&a.trailerParking!==undefined?` · ${esc(a.trailerParking)} trailer spaces`:''}</span></span><span class="result-distance">${esc(d)}</span></button>`;
}
function renderResults(){
  displayed=sortList(displayed);
  resultsCount.textContent=`${displayed.length.toLocaleString()} shown`;
  if(!displayed.length){results.innerHTML='<div class="empty"><strong>No launches match this view.</strong><br>Clear filters or search another Michigan place.</div>';return;}
  results.innerHTML=displayed.map(resultRow).join('');
}
function renderSummary(){
  const total=filtered.length;
  if(searchMode==='destination'&&destinationPoint){
    summary.innerHTML=`<strong>${displayed.length}</strong> nearby launch${displayed.length===1?'':'es'} for <strong>${esc(destinationPoint.label)}</strong>. The map still contains all <strong>${total.toLocaleString()}</strong> launches allowed by your filters.`;
    resultsTitle.textContent=`Near ${destinationPoint.label}`;
  }else if(searchMode==='text'){
    summary.innerHTML=`<strong>${displayed.length}</strong> launch record${displayed.length===1?'':'s'} match <strong>${esc(destinationQuery)}</strong>. The map still contains all <strong>${total.toLocaleString()}</strong> launches allowed by your filters.`;
    resultsTitle.textContent=`Matches for ${destinationQuery}`;
  }else{
    summary.innerHTML=`Showing <strong>${total.toLocaleString()}</strong> source-backed public boat launches across Michigan.`;
    resultsTitle.textContent='All Michigan launches';
  }
}

function detailHTML(a){
  const review=isReview(a),supplemental=isSupplemental(a),condition=conditionText(a);
  const sourceHref=a.sourceUrl||DNR_LAYER;
  const badges=[`<span class="badge open">${esc(launchStatusText(a))}</span>`,supplemental?'<span class="badge municipal">Municipal source</span>':'<span class="badge source">Michigan DNR</span>',condition?`<span class="badge condition-reported">DNR condition: ${esc(condition)}</span>`:'',review?'<span class="badge verify">Some details being verified</span>':'',a.waterScope==='great-lakes'?'<span class="badge">Great Lakes</span>':'<span class="badge">Inland / other</span>'].filter(Boolean).join('');
  const conditionFact=!supplemental&&condition?`<div class="fact"><b>DNR condition</b><span>${esc(condition)}</span></div>`:'';
  return `<h2>${esc(a.name)}</h2><div class="waterbody">${esc(a.waterbody||a.county||'Waterbody not listed')}${a.county?` · ${esc(a.county)} County`:''}</div><div class="badges">${badges}</div><div class="facts"><div class="fact"><b>Ramp</b><span>${esc(rampText(a))}</span></div><div class="fact"><b>Trailer parking</b><span>${a.trailerParking===null||a.trailerParking===undefined?'Not listed':esc(a.trailerParking)}</span></div><div class="fact"><b>Launch lanes</b><span>${a.lanes===null||a.lanes===undefined?'Not listed':esc(a.lanes)}</span></div>${conditionFact}<div class="fact"><b>Fee / pass</b><span>${esc(a.fee||'Not listed')}</span></div><div class="fact"><b>Hours</b><span>${esc(a.operatingHours||a.seasonalStatus||'Not listed')}</span></div><div class="fact"><b>Operator</b><span>${esc(operatorText(a))}</span></div></div>${review?'<div class="source-note"><strong>This launch is listed Open by Michigan DNR.</strong> DNR is still verifying some facility details, so amenity information such as parking or ramp details may change.</div>':''}${supplemental?'<div class="source-note"><strong>Municipal source.</strong> This launch is separately sourced and is not being presented as DNR data.</div>':''}<div class="detail-actions"><a class="primary" href="${directions(a)}" target="_blank" rel="noopener" data-detail-action="directions">Directions</a><a href="${satellite(a)}" target="_blank" rel="noopener" data-detail-action="satellite">Satellite</a><a href="${esc(sourceHref)}" target="_blank" rel="noopener" data-detail-action="source">Source</a></div><div class="source-note">Coordinates: ${Number(a.latitude).toFixed(5)}, ${Number(a.longitude).toFixed(5)} · Missing source fields are not guessed.</div><div class="weather" id="launch-weather"><div class="weather-title"><strong>Local weather</strong><span>National Weather Service</span></div><div class="weather-copy" style="margin-top:8px">Loading forecast and active alerts for this launch…</div></div>`;
}
function weatherTime(iso){const d=new Date(iso);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString('en-US',{hour:'numeric'});}
function weatherHTML(data){
  const periods=Array.isArray(data.periods)?data.periods:[];const first=periods[0]||{};const alerts=Array.isArray(data.alerts)?data.alerts:[];
  const alertBlock=alerts.length?`<div class="weather-alert"><strong>${esc(alerts[0].event||'Active NWS alert')}</strong>${alerts[0].headline?`<br>${esc(alerts[0].headline)}`:''}${alerts.length>1?`<br>+ ${alerts.length-1} more active alert${alerts.length===2?'':'s'}`:''}</div>`:'';
  const hours=periods.slice(0,6).map(p=>`<div class="weather-hour"><b>${esc(weatherTime(p.startTime)||p.name||'Forecast')}</b>${p.temperature!==null&&p.temperature!==undefined?`${esc(p.temperature)}°${esc(p.temperatureUnit||'F')}<br>`:''}${esc(p.shortForecast||'')}<br>${esc([p.windDirection,p.windSpeed].filter(Boolean).join(' '))}</div>`).join('');
  return `<div class="weather-title"><strong>Local weather</strong><span>National Weather Service</span></div><div class="weather-now"><div class="weather-temp">${first.temperature!==null&&first.temperature!==undefined?`${esc(first.temperature)}°${esc(first.temperatureUnit||'F')}`:'—'}</div><div class="weather-copy"><strong>${esc(first.shortForecast||'Forecast available')}</strong><br>${esc([first.windDirection,first.windSpeed].filter(Boolean).join(' '))}</div></div>${alertBlock}${hours?`<div class="weather-hours">${hours}</div>`:''}<div class="weather-disclaimer">${esc(data.disclaimer||'Local forecast context only; not a boating-safety determination.')}</div>`;
}
async function loadWeather(a){
  const box=$('#launch-weather');if(!box)return;
  if(weatherCache.has(a.id)){box.innerHTML=weatherHTML(weatherCache.get(a.id));return;}
  try{
    const r=await fetch(`${WEATHER_API}?lat=${encodeURIComponent(a.latitude)}&lon=${encodeURIComponent(a.longitude)}`,{headers:{Accept:'application/json'}});const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||'Weather unavailable');
    weatherCache.set(a.id,j);if(selectedId===a.id&&$('#launch-weather'))$('#launch-weather').innerHTML=weatherHTML(j);
  }catch(err){if(selectedId===a.id&&$('#launch-weather'))$('#launch-weather').innerHTML=`<div class="weather-title"><strong>Local weather</strong><span>National Weather Service</span></div><div class="weather-copy" style="margin-top:8px">${esc(err.message)}. Launch details and directions still work.</div>`;}
}
function keepResultVisible(row){
  if(!row||!results)return;
  const top=row.offsetTop,bottom=top+row.offsetHeight,viewTop=results.scrollTop,viewBottom=viewTop+results.clientHeight;
  if(top<viewTop)results.scrollTop=Math.max(0,top-8);
  else if(bottom>viewBottom)results.scrollTop=bottom-results.clientHeight+8;
}
function focusSelectedForSmallScreen(source){
  if(source!=='marker'&&source!=='popup')return;
  if(!window.matchMedia('(max-width: 980px)').matches)return;
  requestAnimationFrame(()=>selected.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
}
function selectLaunch(id,source='list'){
  const a=records.find(x=>x.id===id);if(!a)return;
  const old=selectedId;selectedId=id;
  selected.classList.remove('empty-detail');selected.innerHTML=detailHTML(a);loadWeather(a);
  const oldRow=old?results.querySelector(`[data-launch-id="${CSS.escape(old)}"]`):null;if(oldRow)oldRow.classList.remove('active');
  const newRow=results.querySelector(`[data-launch-id="${CSS.escape(id)}"]`);if(newRow){newRow.classList.add('active');keepResultVisible(newRow);}
  if(map){
    const oldMarker=markerById.get(old),newMarker=markerById.get(id);if(oldMarker)oldMarker.setIcon(launchIcon(records.find(x=>x.id===old)));if(newMarker)newMarker.setIcon(launchIcon(a));
    if(newMarker&&cluster&&typeof cluster.zoomToShowLayer==='function')cluster.zoomToShowLayer(newMarker,()=>{map.panTo(newMarker.getLatLng());newMarker.openPopup();});
    else if(newMarker){map.setView(newMarker.getLatLng(),Math.max(map.getZoom(),11));newMarker.openPopup();}
  }
  focusSelectedForSmallScreen(source);
  emit('Boat Launch Select',{source,scope:a.waterScope||'unknown',review:isReview(a),municipal:isSupplemental(a),condition:conditionText(a)||'not-reported'});
}

async function driveTable(point,pool){
  if(!pool.length)return null;
  try{const r=await fetch(`${DRIVE_API}?from=${point.latitude},${point.longitude}&to=${encodeURIComponent(pool.map(a=>`${a.latitude},${a.longitude}`).join(';'))}`,{headers:{Accept:'application/json'}});return r.ok?await r.json():null;}catch{return null;}
}
async function rankNearDestination(base){
  if(!destinationPoint||!base.length)return [];
  const {pool,nextStraightMiles}=RANK.candidatePool(base,destinationPoint,RANK.WIDE_POOL_SIZE);
  const drive=await driveTable(destinationPoint,pool);
  const result=RANK.finalizeShortlist({pool,nextStraightMiles,drive,limit:RANK.WIDE_POOL_SIZE,maxRoadMiles:RANK.MAX_ROAD_MILES});
  routed=result.routed;
  return result.items;
}
async function runDestinationSearch(q){
  const r=await fetch(`${GEOCODE_API}?q=${encodeURIComponent(q)}`,{headers:{Accept:'application/json'}});const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||j.detail||'Destination lookup failed');
  destinationPoint={latitude:Number(j.latitude),longitude:Number(j.longitude),label:compactDestination(j.displayName,q)};
  if(!Number.isFinite(destinationPoint.latitude)||!Number.isFinite(destinationPoint.longitude))throw new Error('Destination lookup returned invalid coordinates');
  displayed=await rankNearDestination(filtered);searchMode='destination';sort.value='nearest';
  if(!displayed.length){const local=directMatches(q);if(local.length){displayed=local;searchMode='text';destinationPoint=null;routed=false;}}
}
async function executeSearch(source='form'){
  const q=search.value.trim();if(q.length<2){search.focus();return;}
  destinationQuery=q;submit.disabled=true;submit.textContent='Searching…';summary.textContent='Finding that Michigan place and nearby public launches…';
  try{
    await runDestinationSearch(q);
  }catch(err){
    destinationPoint=null;routed=false;const local=directMatches(q);displayed=local;searchMode=local.length?'text':'text';
    if(!local.length)summary.innerHTML=`<strong>No launch or Michigan destination matched “${esc(q)}”.</strong> The statewide map remains available.`;
  }finally{
    submit.disabled=false;submit.textContent='Search';updateURL(q);renderResults();renderSummary();drawMap(true,displayed.length?displayed:null);emit('Boat Launch Destination Search',{source,mode:searchMode,results:displayed.length,routed});
  }
}
function resetAll(){
  search.value='';destinationQuery='';destinationPoint=null;searchMode='all';routed=false;selectedId='';sort.value='name';scope.value='';ramp.value='';parking.value='0';filtered=records.slice();displayed=filtered.slice();selected.classList.add('empty-detail');selected.innerHTML='<strong>Select a launch</strong><br>Tap any pin or result to see ramp details, directions, source information and local National Weather Service planning weather.';renderResults();renderSummary();drawMap(true);updateURL('');emit('Boat Launch Filter',{filter:'clear-all',results:filtered.length});
}
async function applyFilters(source='filter'){
  filtered=records.filter(passesFilters);
  if(selectedId&&!filtered.some(a=>a.id===selectedId)){selectedId='';selected.classList.add('empty-detail');selected.innerHTML='<strong>Select a launch</strong><br>Tap any pin or result to see details and local weather.';}
  if(searchMode==='destination'&&destinationPoint)displayed=await rankNearDestination(filtered);
  else if(searchMode==='text'&&destinationQuery)displayed=directMatches(destinationQuery,filtered);
  else displayed=filtered.slice();
  renderResults();renderSummary();drawMap(searchMode!=='all',displayed);emit('Boat Launch Filter',{filter:source,results:filtered.length});
}

async function loadInventory(){
  try{
    const r=await fetch(SOURCE_API,{headers:{Accept:'application/json'}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.detail||j.error||'Launch source unavailable');
    records=Array.isArray(j.launches)?j.launches:[];if(!records.length)throw new Error('No launch records returned');
    filtered=records.slice();displayed=filtered.slice();
    sourceStatus.textContent=`${j.dnr_count?.toLocaleString?.()||records.length.toLocaleString()} DNR + ${j.municipal_supplemental_count||0} municipal`;
    renderResults();renderSummary();drawMap(true);
    const q=new URL(location.href).searchParams.get('q');if(q){search.value=q;await executeSearch('url');}
  }catch(err){
    results.innerHTML=`<div class="empty"><strong>Authoritative launch data is unavailable.</strong><br>${esc(err.message)}. No legacy or guessed launch pins are shown.</div>`;summary.textContent='Launch source unavailable.';sourceStatus.textContent='Source error';
  }
}

form.addEventListener('submit',e=>{e.preventDefault();executeSearch('form');});
clear.addEventListener('click',resetAll);
for(const el of [sort,scope,ramp,parking])el.addEventListener('change',()=>applyFilters(el.id));
results.addEventListener('click',e=>{const row=e.target.closest('[data-launch-id]');if(row)selectLaunch(row.dataset.launchId,'result');});
document.addEventListener('click',e=>{const p=e.target.closest('[data-popup-card]');if(p){e.preventDefault();selectLaunch(p.dataset.popupCard,'popup');}const action=e.target.closest('[data-detail-action]');if(action)emit('Boat Launch Action',{action:action.dataset.detailAction});});

Promise.allSettled([initMap(),loadInventory()]);
})();