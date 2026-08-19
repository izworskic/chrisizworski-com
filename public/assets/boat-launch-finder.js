(()=>{
'use strict';
if(location.pathname!=='/michigan-boat-launches/')return;

const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const emit=(name,props={})=>{try{window.va?.('event',{name,...props});}catch{}};

const SOURCE_API='/api/boat-launches';
const GEOCODE_API='/api/boat-launch-geocode';
const DRIVE_API='/api/boat-launch-drive';
const RANK=window.BoatLaunchRanking;
const MAX_ROAD_MILES=RANK?RANK.MAX_ROAD_MILES:60;
const DNR_LAYER='https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/PRDBASPublicView/FeatureServer/0';

const destinationForm=$('#destination-form');
const destinationSearch=$('#destination-search');
const destinationSubmit=$('#destination-submit');
const launchName=$('#launch-name-filter');
const access=$('#access-filter');
const ramp=$('#ramp-filter');
const parking=$('#parking-filter');
const summary=$('#launch-summary');
const sourceStatus=$('#launch-source-status');
const results=$('#launch-results');
const resultsTitle=$('#results-title');
const reset=$('#launch-reset');

let records=[];
let shortlist=[];
let map=null;
let layer=null;
let destinationMarker=null;
let destinationPoint=null;
let radiusUsed=null;
let routed=false;
let hidden={total:0,unknownParking:0,provisional:0};
let outOfScope=false;
let measuring=false;
let comfortable=0;
let selectedId='';
let sourceReady=false;
const markerById=new Map();

function num(v){if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function dateText(v){
  if(v===null||v===undefined||v==='')return '';
  const n=Number(v);const d=Number.isFinite(n)?new Date(n):new Date(v);
  return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
}
function toRadians(deg){return deg*Math.PI/180;}
function distanceMiles(lat1,lon1,lat2,lon2){return RANK.distanceMiles(lat1,lon1,lat2,lon2);}
function reachMiles(a){return routed&&a.driveMiles!==null&&a.driveMiles!==undefined?a.driveMiles:a.distanceMiles;}
function reachText(a){
  if(routed&&a.driveMiles!==null&&a.driveMiles!==undefined){
    const mins=a.driveMinutes===null||a.driveMinutes===undefined?null:Math.round(a.driveMinutes);
    return `${a.driveMiles.toFixed(1)} mi by road${mins!==null?` · ${mins} min`:''}`;
  }
  return `${a.distanceMiles.toFixed(1)} mi straight line`;
}
function operatorText(a){return a.operator||a.owner||'Not listed';}
function isReview(a){return a.verificationStatus==='dnr-review-in-progress'||a.detailsUnderReview===true;}
function isSupplemental(a){return a.verificationStatus==='municipal-source-qualified'||a.sourceType==='municipal-supplemental';}
function rampText(a){
  if(isSupplemental(a)&&a.rampDescription)return a.rampDescription;
  const code=num(a.rampClass);
  if(code===1)return 'Hard-surface ramp · DNR class for most trailerable boats';
  if(code===2)return 'Hard-surface ramp · DNR notes limited depth';
  if(code===3)return 'Gravel ramp · DNR class for smaller boats';
  if(a.carryDown)return `Carry-down${a.carryDownType?` · ${a.carryDownType}`:''}`;
  return 'Ramp class not listed';
}
function coordinateText(a){
  if(isSupplemental(a))return a.coordinatePrecision||'Municipal launch · corroborated launch coordinate';
  const c=num(a.coordinateCollection);
  if(c===0)return 'DNR coordinate · smart-device collection (~5 m)';
  if(c===1)return 'DNR coordinate · field observed (approx.)';
  if(c===5)return 'DNR coordinate · aerial imagery (approx.)';
  return 'DNR-published facility coordinate';
}
function directions(a){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${a.latitude},${a.longitude}`)}`;}
function satellite(a){return `https://www.google.com/maps/@?api=1&map_action=map&center=${encodeURIComponent(`${a.latitude},${a.longitude}`)}&zoom=18&basemap=satellite`;}

function accessMatches(a){
  if(!access.value)return true;
  if(isSupplemental(a))return false;
  const t=String(a.greatLakesAccess||'').toLowerCase();
  if(access.value==='0.5')return t.includes('within 0.5');
  if(access.value==='2')return t.includes('0.5 - 2')||t.includes('0.5-2');
  return true;
}
function rampMatches(a){
  if(!ramp.value)return true;
  if(isReview(a)||isSupplemental(a))return false;
  if(ramp.value==='carry')return !!a.carryDown;
  return String(num(a.rampClass))===ramp.value;
}
function parkingMatches(a){
  const min=Number(parking.value||0);
  if(!min)return true;
  if(isReview(a)||isSupplemental(a))return false;
  const listed=num(a.trailerParking);
  if(listed===null)return false;
  return listed>=min;
}
function parkingUnknown(a){
  return Number(parking.value||0)>0&&!isReview(a)&&!isSupplemental(a)&&num(a.trailerParking)===null;
}
function launchNameMatches(a){
  const q=launchName.value.trim().toLowerCase();
  if(!q)return true;
  return [a.name,a.labelName,a.waterbody,a.county,a.operator].join(' ').toLowerCase().includes(q);
}
function refinedRecords(){return records.filter(a=>accessMatches(a)&&rampMatches(a)&&parkingMatches(a)&&launchNameMatches(a));}

/*
 * A refinement that quietly removes half the local inventory is worse than one
 * that removes it out loud. Provisional DNR records and municipal supplements
 * cannot satisfy a precise DNR field, and an unlisted trailer-parking count is
 * not the same as zero spaces, so both are counted and reported rather than
 * disappearing.
 */
function measureHidden(){
  if(!destinationPoint){return {total:0,unknownParking:0,provisional:0};}
  const near=RANK.candidatePool(records,destinationPoint,RANK.WIDE_POOL_SIZE).pool;
  const removed=near.filter(a=>!(accessMatches(a)&&rampMatches(a)&&parkingMatches(a)&&launchNameMatches(a)));
  return {
    total:removed.length,
    unknownParking:removed.filter(parkingUnknown).length,
    provisional:removed.filter(a=>(isReview(a)||isSupplemental(a))&&(ramp.value||Number(parking.value||0)>0||access.value)).length,
  };
}

async function driveTable(point,pool){
  if(!pool.length)return null;
  const to=pool.map(a=>`${a.latitude},${a.longitude}`).join(';');
  try{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
    const r=await fetch(`${DRIVE_API}?from=${point.latitude},${point.longitude}&to=${encodeURIComponent(to)}`,{signal:controller.signal,headers:{Accept:'application/json'}});
    clearTimeout(timeout);
    if(!r.ok)return null;
    return await r.json();
  }catch{return null;}
}

/*
 * Straight-line distance only picks the candidates, because it is a lower bound
 * on road distance. The shortlist itself is ordered by how far it really is to
 * tow a trailer there. If routing is unavailable the page falls back to
 * straight-line order and says so rather than presenting it as drive distance.
 */
function shape(result){
  return {
    items:result.items,
    radius:result.reach===null?null:Math.ceil(result.reach),
    expanded:result.reach!==null&&result.reach>RANK.COMFORTABLE_MILES,
    routed:result.routed,
    reason:result.reason,
    comfortable:result.within25,
  };
}

/*
 * Routing takes up to a few seconds on a free community service, so the
 * straight-line shortlist paints first and is labeled as straight line. The
 * drive-ordered answer replaces it as soon as the table returns. onFirstPaint
 * is what keeps a slow router from turning into a slow page.
 */
async function chooseNearby(base,onFirstPaint){
  if(!destinationPoint||!base.length)return {items:[],radius:null,expanded:false,routed:false,reason:base.length?null:'no-records'};
  let {pool,nextStraightMiles}=RANK.candidatePool(base,destinationPoint,RANK.DEFAULT_POOL_SIZE);
  if(typeof onFirstPaint==='function'){
    onFirstPaint(shape(RANK.finalizeShortlist({pool,nextStraightMiles,drive:null,maxRoadMiles:MAX_ROAD_MILES})));
  }
  let drive=await driveTable(destinationPoint,pool);
  let result=RANK.finalizeShortlist({pool,nextStraightMiles,drive,maxRoadMiles:MAX_ROAD_MILES});
  if(result.needsWiderPool){
    ({pool,nextStraightMiles}=RANK.candidatePool(base,destinationPoint,RANK.WIDE_POOL_SIZE));
    drive=await driveTable(destinationPoint,pool);
    result=RANK.finalizeShortlist({pool,nextStraightMiles,drive,maxRoadMiles:MAX_ROAD_MILES});
  }
  return shape(result);
}

function cardHTML(a,index){
  const qa=dateText(a.qaDate),edited=dateText(a.lastEditedDate||a.sourceUpdatedAt);
  const restrooms=(num(a.vaultToilets)||0)+(num(a.flushToilets)||0)+(num(a.otherToilets)||0);
  const review=isReview(a),supplemental=isSupplemental(a);
  const badges=supplemental?[
    '<span class="badge municipal">Municipal launch</span>',
    '<span class="badge verified">Source-qualified supplement</span>',
    a.seasonalStatus?`<span class="badge">${esc(a.seasonalStatus)}</span>`:''
  ].filter(Boolean).join(''):[
    '<span class="badge open">DNR status: Open</span>',
    review?'<span class="badge review">DNR review in progress</span>':'<span class="badge verified">Source-qualified</span>',
    a.waterwaysConfirmed?'<span class="badge confirmed">Waterways confirmed</span>':'',
    a.grantInAid?'<span class="badge">Grant-in-aid</span>':'',
    a.carryDown?'<span class="badge">Carry-down</span>':''
  ].filter(Boolean).join('');
  const reviewCallout=review?'<div class="review-callout"><strong>Facility details under DNR review.</strong> This is an official open DNR launch record with published coordinates, but ramp, parking, fee, hours or other metadata may still be changing. Confirm those details before a trip.</div>':'';
  const supplementalCallout=supplemental?`<div class="municipal-callout"><strong>Municipal supplemental record.</strong> ${esc(a.operator||'The local operator')} confirms this launch. The launch-specific coordinate is independently documented; this record is not being presented as DNR data.</div>`:'';
  const provisional=review?' · provisional':'';
  const hours=a.operatingHours||a.seasonalStatus||'Not listed';
  const sourceHref=a.sourceUrl||DNR_LAYER;
  const sourceLabel=supplemental?'City source':'DNR source';
  return `<article class="launch-card${a.id===selectedId?' selected':''}${review?' under-review':''}${supplemental?' municipal-record':''}" data-launch-id="${esc(a.id)}" tabindex="0">
    <div class="rank" aria-label="Result ${index+1}">${index+1}</div>
    <div class="card-body">
      <div class="card-top"><div><h3 class="card-title">${esc(a.name)}</h3><div class="waterbody">${esc(a.waterbody||a.county||'Waterbody not listed')}</div></div><strong class="distance">${esc(reachText(a))}</strong></div>
      <div class="badges">${badges}</div>
      ${reviewCallout}${supplementalCallout}
      <div class="decision-line">${esc(rampText(a))}${review?'<span class="provisional"> · provisional</span>':''}</div>
      <div class="facts">
        <div class="fact"><b>Trailer parking</b><span>${a.trailerParking===null?'Not listed':esc(a.trailerParking)}${a.trailerParking!==null?provisional:''}</span></div>
        <div class="fact"><b>Launch lanes</b><span>${a.lanes===null?'Not listed':esc(a.lanes)}${a.lanes!==null?provisional:''}</span></div>
        <div class="fact"><b>Fee / pass</b><span>${esc(a.fee||'Not listed')}${a.fee&&review?provisional:''}</span></div>
        <div class="fact"><b>Hours / season</b><span>${esc(hours)}${a.operatingHours&&review?provisional:''}</span></div>
        <div class="fact"><b>Operator</b><span>${esc(operatorText(a))}</span></div>
        <div class="fact"><b>Restrooms</b><span>${restrooms>0?`Listed${provisional}`:'Not listed'}</span></div>
      </div>
      <div class="note">${esc(a.greatLakesAccess||'Great Lakes access')} · ${esc(coordinateText(a))}${edited?` · source checked ${esc(edited)}`:''}${qa?` · QA ${esc(qa)}`:''}</div>
      <div class="actions">
        <a class="primary-action" href="${directions(a)}" target="_blank" rel="noopener" data-action="directions">Directions</a>
        <button type="button" data-action="map" data-launch-id="${esc(a.id)}">Show on map</button>
        <a href="${satellite(a)}" target="_blank" rel="noopener" data-action="satellite">Satellite</a>
        <a href="${esc(sourceHref)}" target="_blank" rel="noopener" data-action="source">${sourceLabel}</a>
      </div>
    </div>
  </article>`;
}

function popupHTML(a,index){
  const review=isReview(a)?'<br><small><strong>DNR review in progress</strong> · facility details provisional</small>':'';
  const municipal=isSupplemental(a)?'<br><small><strong>Municipal source-qualified supplement</strong> · not DNR data</small>':'';
  return `<strong>${index+1}. ${esc(a.name)}</strong><br><span>${esc(reachText(a))} from ${esc(destinationPoint?.label||'destination')}</span><br><small>${esc(a.waterbody||'Waterbody not listed')} · ${esc(rampText(a))}</small>${review}${municipal}<div style="margin-top:7px"><a href="${directions(a)}" target="_blank" rel="noopener">Directions</a> · <a href="#" data-popup-card="${esc(a.id)}">Open result</a></div>`;
}

function loadLeaflet(){
  return new Promise((resolve,reject)=>{
    if(window.L){resolve();return;}
    if(!document.querySelector('link[data-launch-leaflet]')){
      const css=document.createElement('link');css.rel='stylesheet';css.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';css.dataset.launchLeaflet='1';document.head.append(css);
    }
    let s=document.querySelector('script[data-launch-leaflet]');
    if(!s){s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.dataset.launchLeaflet='1';document.head.append(s);}
    const start=Date.now();
    const timer=setInterval(()=>{if(window.L){clearInterval(timer);resolve();}else if(Date.now()-start>8000){clearInterval(timer);reject(new Error('Map failed to load'));}},100);
  });
}

async function initMap(){
  try{await loadLeaflet();}catch{return;}
  map=L.map('launch-map',{scrollWheelZoom:false,zoomControl:true}).setView([44.6,-85.5],6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; OpenStreetMap contributors &copy; CARTO',subdomains:'abcd',maxZoom:19}).addTo(map);
  layer=L.layerGroup().addTo(map);
  drawMap(true);
}

function launchIcon(index,selected,review,supplemental){
  return L.divIcon({className:'launch-number-icon',html:`<span class="${selected?'is-selected ':''}${review?'is-review ':''}${supplemental?'is-municipal':''}">${index+1}</span>`,iconSize:[30,30],iconAnchor:[15,15]});
}

function drawMap(fit=false){
  if(!map||!layer)return;
  layer.clearLayers();markerById.clear();destinationMarker=null;
  const bounds=[];
  if(destinationPoint){
    destinationMarker=L.circleMarker([destinationPoint.latitude,destinationPoint.longitude],{radius:9,weight:3,fillOpacity:.9,className:'destination-map-marker'}).addTo(layer).bindTooltip(`Destination: ${esc(destinationPoint.label)}`);
    bounds.push([destinationPoint.latitude,destinationPoint.longitude]);
  }
  shortlist.forEach((a,index)=>{
    const m=L.marker([a.latitude,a.longitude],{icon:launchIcon(index,a.id===selectedId,isReview(a),isSupplemental(a))}).addTo(layer);
    m.bindPopup(popupHTML(a,index),{maxWidth:330});
    m.on('click',()=>select(a.id,'marker'));
    markerById.set(a.id,m);bounds.push([a.latitude,a.longitude]);
  });
  if(fit&&bounds.length>1)map.fitBounds(bounds,{padding:[32,32],maxZoom:11});
  else if(fit&&bounds.length===1)map.setView(bounds[0],10);
}

function render(){
  if(!destinationPoint){
    resultsTitle.textContent='Nearby launch choices';
    results.innerHTML='<div class="empty"><strong>Choose where you want to boat.</strong><br>Search a Michigan city, bay, lake, river or harbor. The finder ranks official DNR launch records plus separately verified municipal supplements by driving distance, with each source type labeled.</div>';
    summary.textContent=sourceReady?`${records.length} source-backed Great Lakes and connecting-water launch records ready to search.`:'Loading current launch records…';
    shortlist=[];drawMap(true);return;
  }
  resultsTitle.textContent=`Launches near ${destinationPoint.label}`;
  const hiddenText=hidden.total?` <strong>${hidden.total}</strong> nearby record${hidden.total===1?' is':'s are'} hidden by your refinements${hidden.unknownParking?`, including ${hidden.unknownParking} whose trailer parking is simply not listed`:''}.`:'';
  if(!shortlist.length){
    if(outOfScope){
      results.innerHTML=`<div class="empty"><strong>No Great Lakes launch within a ${MAX_ROAD_MILES}-mile drive of ${esc(destinationPoint.label)}.</strong><br>This finder covers Michigan's Great Lakes shoreline and the Detroit, St. Clair and St. Marys connecting rivers. Inland-lake launches are a separate DNR inventory and are not in this dataset, so an inland destination will find nothing here even where the state runs launches on that lake.</div>`;
      summary.innerHTML=`<strong>${esc(destinationPoint.label)}</strong> is outside this tool's Great Lakes coverage, not merely far from a launch.`;
      emit('Boat Launch Zero Result',{reason:'out-of-scope'});
    }else{
      results.innerHTML=`<div class="empty"><strong>No source-backed launches match these refinements.</strong><br>Reset the optional ramp, parking or launch-name filters to broaden the shortlist.${hidden.total?` ${hidden.total} nearby record${hidden.total===1?'':'s'} would return without them.`:''}</div>`;
      summary.innerHTML=`No matching launch record remains near <strong>${esc(destinationPoint.label)}</strong> after these refinements.`;
      emit('Boat Launch Zero Result',{reason:'refinements'});
    }
  }else{
    results.innerHTML=shortlist.map(cardHTML).join('');
    const rangeText=routed
      ?` Ranked by driving distance; the farthest shown is about <strong>${radiusUsed} road miles</strong>.`
      :measuring
        ?' Ordered by <strong>straight-line distance</strong> while the drive to each one is measured.'
        :' Road routing is unavailable right now, so these are ordered by <strong>straight-line distance</strong>, which understates any drive around a bay.';
    const stretchText=!comfortable&&radiusUsed?` <strong>No Great Lakes launch is within a ${RANK.COMFORTABLE_MILES}-mile drive</strong> of here; the nearest is about a ${radiusUsed}-mile drive.`:'';
    const reviews=shortlist.filter(isReview).length;
    const supplements=shortlist.filter(isSupplemental).length;
    const reviewText=reviews?` <strong>${reviews}</strong> result${reviews===1?' is':'s are'} marked DNR review in progress.`:'';
    const supplementText=supplements?` <strong>${supplements}</strong> result${supplements===1?' is a':'s are'} separately source-qualified municipal supplement${supplements===1?'':'s'}.`:'';
    summary.innerHTML=`Showing <strong>${shortlist.length}</strong> closest source-backed launch choice${shortlist.length===1?'':'s'} for <strong>${esc(destinationPoint.label)}</strong>.${rangeText}${stretchText}${reviewText}${supplementText}${hiddenText}`;
  }
  drawMap(true);
}

function applyChoice(choice){
  shortlist=choice.items;radiusUsed=choice.radius;routed=choice.routed;comfortable=choice.comfortable||0;
  hidden=measureHidden();
  outOfScope=!shortlist.length&&!hidden.total;
  selectedId='';render();
}

async function rerank(source='filter'){
  if(!destinationPoint){render();return;}
  const choice=await chooseNearby(refinedRecords(),first=>{measuring=true;applyChoice(first);});
  measuring=false;
  applyChoice(choice);
  emit('Boat Launch Filter',{filter:source,results:shortlist.length,radius:radiusUsed||0,routed,outOfScope,hidden:hidden.total,reviewInProgress:shortlist.filter(isReview).length,municipalSupplemental:shortlist.filter(isSupplemental).length});
}

async function searchDestination(source='form'){
  const q=destinationSearch.value.trim();
  if(q.length<2){destinationSearch.focus();return;}
  destinationSubmit.disabled=true;destinationSubmit.textContent='Finding…';
  summary.textContent='Locating destination and ranking source-backed launch records…';
  try{
    const r=await fetch(`${GEOCODE_API}?q=${encodeURIComponent(q)}`,{headers:{Accept:'application/json'}});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||j.detail||'Destination lookup failed');
    destinationPoint={latitude:Number(j.latitude),longitude:Number(j.longitude),label:compactDestination(j.displayName,q)};
    if(!Number.isFinite(destinationPoint.latitude)||!Number.isFinite(destinationPoint.longitude))throw new Error('Destination lookup returned invalid coordinates');
    await rerank('destination');updateURL(q);
    emit('Boat Launch Destination Search',{source,results:shortlist.length,radius:radiusUsed||0,routed,outOfScope,reviewInProgress:shortlist.filter(isReview).length,municipalSupplemental:shortlist.filter(isSupplemental).length});
  }catch(err){
    destinationPoint=null;shortlist=[];radiusUsed=null;outOfScope=false;
    resultsTitle.textContent='Destination not found';
    results.innerHTML=`<div class="empty error"><strong>Could not locate that Michigan destination.</strong><br>${esc(err.message)}. Try a nearby city, bay, lake or harbor name.</div>`;
    summary.textContent='Launch inventory is still available; only the destination lookup failed.';
    drawMap(true);emit('Boat Launch Zero Result',{reason:'geocode'});
  }finally{
    destinationSubmit.disabled=false;destinationSubmit.textContent='Find launches';
  }
}

function compactDestination(displayName,fallback){
  const parts=String(displayName||fallback).split(',').map(x=>x.trim()).filter(Boolean);
  const miIndex=parts.findIndex(x=>x==='Michigan'||x==='MI');
  if(miIndex>0)return parts.slice(0,Math.min(miIndex+1,3)).join(', ');
  return parts.slice(0,2).join(', ')||fallback;
}

function select(id,source='card'){
  const a=shortlist.find(x=>x.id===id);if(!a)return;
  selectedId=id;
  results.querySelectorAll('.launch-card.selected').forEach(x=>x.classList.remove('selected'));
  const card=results.querySelector(`[data-launch-id="${CSS.escape(id)}"]`);card?.classList.add('selected');
  drawMap(false);
  const marker=markerById.get(id);
  if(map&&marker){map.flyTo([a.latitude,a.longitude],Math.max(map.getZoom(),12),{duration:.4});setTimeout(()=>marker.openPopup(),420);}
  emit('Boat Launch Select',{source,rank:shortlist.findIndex(x=>x.id===id)+1,reviewInProgress:isReview(a),municipalSupplemental:isSupplemental(a)});
}

function updateURL(destination=''){
  const u=new URL(location.href);u.searchParams.delete('destination');
  if(destination)u.searchParams.set('destination',destination.slice(0,100));
  history.replaceState(null,'',u.pathname+(u.searchParams.toString()?`?${u.searchParams}`:''));
}

function resetRefinements(){
  launchName.value='';access.value='';ramp.value='';parking.value='0';rerank('reset');
}

function wire(){
  destinationForm.addEventListener('submit',e=>{e.preventDefault();searchDestination('form');});
  document.querySelectorAll('[data-destination]').forEach(btn=>btn.addEventListener('click',()=>{destinationSearch.value=btn.dataset.destination;searchDestination('example');}));
  launchName.addEventListener('input',()=>rerank('launch-name'));
  access.addEventListener('change',()=>rerank('access'));
  ramp.addEventListener('change',()=>rerank('ramp'));
  parking.addEventListener('change',()=>rerank('parking'));
  reset.addEventListener('click',resetRefinements);
  results.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]');
    if(action){emit('Boat Launch Action',{action:action.dataset.action});if(action.dataset.action==='map'){e.preventDefault();select(action.dataset.launchId,'map-button');}return;}
    const card=e.target.closest('.launch-card');if(card&&!e.target.closest('a,button'))select(card.dataset.launchId,'card');
  });
  results.addEventListener('keydown',e=>{const card=e.target.closest('.launch-card');if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(card.dataset.launchId,'keyboard');}});
  document.addEventListener('click',e=>{const p=e.target.closest('[data-popup-card]');if(!p)return;e.preventDefault();const id=p.dataset.popupCard;select(id,'popup');results.querySelector(`[data-launch-id="${CSS.escape(id)}"]`)?.scrollIntoView({behavior:'smooth',block:'center'});});
}

async function load(){
  wire();initMap();
  try{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    const r=await fetch(SOURCE_API,{signal:controller.signal,headers:{Accept:'application/json'}});clearTimeout(timeout);
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.detail||j.error||`Launch source returned ${r.status}`);
    records=(j.launches||[]).filter(a=>a&&a.id&&a.name&&num(a.latitude)!==null&&num(a.longitude)!==null).map(a=>({...a,latitude:num(a.latitude),longitude:num(a.longitude)}));
    records=[...new Map(records.map(a=>[a.id,a])).values()];
    if(!records.length)throw new Error('Michigan DNR returned no usable open Great Lakes-access sites');
    sourceReady=true;
    const updated=dateText(j.source_updated_at);
    const qualified=Number(j.source_qualified_count)||records.filter(a=>a.verificationStatus==='source-qualified').length;
    const reviewing=Number(j.review_in_progress_count)||records.filter(isReview).length;
    const supplemental=Number(j.municipal_supplemental_count)||records.filter(isSupplemental).length;
    const connecting=Number(j.connecting_water_count)||0;
    const connectingText=connecting?` · ${connecting} on the Detroit, St. Clair and St. Marys connecting rivers`:'';
    sourceStatus.textContent=(updated?`DNR source updated ${updated}`:'Live source data')+` · ${qualified} DNR source-qualified · ${reviewing} DNR review in progress · ${supplemental} municipal supplement${supplemental===1?'':'s'}${connectingText}`;
    render();emit('Boat Launch Source Load',{records:records.length,sourceQualified:qualified,reviewInProgress:reviewing,municipalSupplemental:supplemental,source:'PRDBASPublicView+municipal'});
    const initial=new URLSearchParams(location.search).get('destination');
    if(initial){destinationSearch.value=initial.slice(0,100);await searchDestination('url');}
  }catch(err){
    sourceReady=false;records=[];shortlist=[];destinationPoint=null;outOfScope=false;
    results.innerHTML=`<div class="empty error"><strong>Launch data unavailable.</strong><br>${esc(err.message)}. No legacy or guessed launch pins are being shown.</div>`;
    summary.textContent='Primary Michigan DNR launch data could not be loaded.';sourceStatus.textContent='Source unavailable';
    if(layer)layer.clearLayers();emit('Boat Launch Source Error',{message:String(err.message).slice(0,80)});
  }
}

load();
})();
