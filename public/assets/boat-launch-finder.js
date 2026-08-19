(()=>{
'use strict';
if(location.pathname!=='/michigan-boat-launches/')return;

const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const emit=(name,props={})=>{try{window.va?.('event',{name,...props});}catch{}};

const DNR_LAYER='https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services/PRDBASPublicView/FeatureServer/0';
const DNR_FINDER='https://www.michigan.gov/dnr/things-to-do/boating';
const WHERE=[
  "bas_type='Boating Access Site'",
  "launch_status='Open'",
  "greatlakesaccess LIKE 'Yes%'",
  'latitude IS NOT NULL',
  'longitude IS NOT NULL'
].join(' AND ');
const FIELDS=[
  'facilityid','legacyid','name','labelname','waterbody','waterbodytype','bas_type','descrip','condition',
  'recpassport','rampcode_new','ownedby','dnradmin','maintby','collecttype','datasource','latitude','longitude',
  'nlanes','carrydown','npiers','ntrailerableparking','nvehicleonlyparking','nvaulttoilets','nflushtoilets',
  'nothertoilets','county','qaqc_1_date','qaqc_1_comments','referenceonly','gia','carrydowntype',
  'ncarrydownlaunches','flag','flagcomments','staffed','contact','phone','greatlakesaccess','parkingsurface',
  'waterwaysprogramconfirmation','operating_hours','launch_status','fish_cleaning_station',
  'local_watercraft_controls','accessible_feat_piers','accessible_feat_park','accessible_feat_ped_route',
  'accessible_feat_restroom','NameCounty','WaterbodyCounty','closures_url','last_edited_date'
];

const search=$('#launch-search');
const access=$('#access-filter');
const ramp=$('#ramp-filter');
const parking=$('#parking-filter');
const summary=$('#launch-summary');
const sourceStatus=$('#launch-source-status');
const results=$('#launch-results');
const reset=$('#launch-reset');

let records=[];
let filtered=[];
let map=null;
let layer=null;
let selectedId='';
const markerById=new Map();

function endpoint(){
  const q=new URLSearchParams({
    where:WHERE,
    outFields:FIELDS.join(','),
    returnGeometry:'false',
    orderByFields:'name',
    f:'json'
  });
  return `${DNR_LAYER}/query?${q}`;
}

function slug(v){
  return String(v||'launch').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function idFor(a,index){
  return String(a.facilityid||a.legacyid||`${slug(a.name)}-${index}`);
}

function num(v){
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}

function yes(v){return String(v||'').toLowerCase()==='yes';}

function dateText(v){
  const n=Number(v);
  if(!Number.isFinite(n))return '';
  const d=new Date(n);
  return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
}

function rampText(a){
  const code=num(a.rampcode_new);
  if(code===1)return 'Hard-surface ramp; DNR class for most trailerable watercraft';
  if(code===2)return 'Hard-surface ramp; limited depth can make larger boats difficult';
  if(code===3)return 'Gravel ramp; DNR class for smaller watercraft';
  if(yes(a.carrydown))return `Developed carry-down${a.carrydowntype?`: ${a.carrydowntype}`:''}`;
  return 'Ramp class not listed';
}

function accuracyText(a){
  const c=num(a.collecttype);
  if(c===0)return 'DNR coordinate · smart-device collection (~5 m)';
  if(c===1)return 'DNR coordinate · field observed (approximate)';
  if(c===5)return 'DNR coordinate · aerial imagery (approximate)';
  return 'DNR-published facility coordinate';
}

function directions(a){
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${a.latitude},${a.longitude}`)}`;
}

function satellite(a){
  return `https://www.google.com/maps/@?api=1&map_action=map&center=${encodeURIComponent(`${a.latitude},${a.longitude}`)}&zoom=18&basemap=satellite`;
}

function regionLabel(a){
  return a.WaterbodyCounty||a.NameCounty||a.waterbody||'Michigan';
}

function cleanFeature(f,index){
  const a=f?.attributes||{};
  const lat=num(a.latitude),lng=num(a.longitude);
  if(!a.name||lat===null||lng===null)return null;
  if(String(a.referenceonly||'').toLowerCase()==='yes')return null;
  if(String(a.flag||'').trim())return null;
  return {...a,id:idFor(a,index),latitude:lat,longitude:lng};
}

function accessMatches(a){
  if(!access.value)return true;
  const t=String(a.greatlakesaccess||'').toLowerCase();
  if(access.value==='0.5')return t.includes('within 0.5');
  if(access.value==='2')return t.includes('0.5 - 2')||t.includes('0.5-2');
  return true;
}

function rampMatches(a){
  if(!ramp.value)return true;
  if(ramp.value==='carry')return yes(a.carrydown);
  return String(num(a.rampcode_new))===ramp.value;
}

function parkingMatches(a){
  const min=Number(parking.value||0);
  if(!min)return true;
  return (num(a.ntrailerableparking)||0)>=min;
}

function textMatches(a){
  const q=search.value.trim().toLowerCase();
  if(!q)return true;
  const hay=[a.name,a.labelname,a.waterbody,a.NameCounty,a.WaterbodyCounty,a.dnradmin,a.ownedby,a.descrip].join(' ').toLowerCase();
  return hay.includes(q);
}

function cardHTML(a){
  const lanes=num(a.nlanes),trailer=num(a.ntrailerableparking),piers=num(a.npiers);
  const toilets=[num(a.nvaulttoilets),num(a.nflushtoilets),num(a.nothertoilets)].filter(v=>v!==null).reduce((x,y)=>x+y,0);
  const confirmed=String(a.waterwaysprogramconfirmation||'').toLowerCase()==='yes';
  const qa=dateText(a.qaqc_1_date);
  const edited=dateText(a.last_edited_date);
  const badges=[
    '<span class="badge open">DNR status: Open</span>',
    confirmed?'<span class="badge confirmed">Waterways confirmed</span>':'',
    yes(a.gia)?'<span class="badge">Grant-in-aid site</span>':'',
    yes(a.carrydown)?'<span class="badge">Carry-down</span>':''
  ].filter(Boolean).join('');
  const facts=[
    `<div class="fact"><b>Great Lakes access:</b> ${esc(a.greatlakesaccess||'Yes')}</div>`,
    `<div class="fact"><b>Ramp:</b> ${esc(rampText(a))}</div>`,
    `<div class="fact"><b>Launch lanes:</b> ${lanes===null?'not listed':lanes}</div>`,
    `<div class="fact"><b>Trailer parking:</b> ${trailer===null?'not listed':trailer}</div>`,
    `<div class="fact"><b>Piers:</b> ${piers===null?'not listed':piers}</div>`,
    `<div class="fact"><b>Restrooms:</b> ${toilets>0?'listed':'not listed'}</div>`,
    `<div class="fact"><b>Facility fee/passport:</b> ${esc(a.recpassport||'not listed')}</div>`,
    `<div class="fact"><b>Hours:</b> ${esc(a.operating_hours||'not listed')}</div>`
  ].join('');
  return `<article class="launch-card${a.id===selectedId?' selected':''}" id="launch-${esc(a.id)}" data-launch-id="${esc(a.id)}" tabindex="0">
    <div class="card-top"><div><h3 class="card-title">${esc(a.name)}</h3><div class="waterbody">${esc(a.waterbody||regionLabel(a))}</div></div></div>
    <div class="badges">${badges}</div>
    <div class="facts">${facts}</div>
    <div class="note">${esc(accuracyText(a))}${qa?` · QA ${esc(qa)}`:''}${edited?` · record edited ${esc(edited)}`:''}</div>
    <div class="actions">
      <a href="${directions(a)}" target="_blank" rel="noopener" data-action="directions">Directions</a>
      <a href="${satellite(a)}" target="_blank" rel="noopener" data-action="satellite">Satellite</a>
      <button type="button" data-action="map" data-launch-id="${esc(a.id)}">Show on map</button>
      <a href="${DNR_FINDER}" target="_blank" rel="noopener" data-action="dnr">DNR boating finder</a>
    </div>
  </article>`;
}

function popupHTML(a){
  const trailer=num(a.ntrailerableparking);
  return `<strong>${esc(a.name)}</strong><br><span>${esc(a.waterbody||regionLabel(a))}</span><br><small>${esc(rampText(a))}${trailer!==null?` · ${trailer} trailer spaces`:''}</small><div style="margin-top:7px"><a href="${directions(a)}" target="_blank" rel="noopener">Directions</a> · <a href="#launch-${esc(a.id)}" data-popup-card="${esc(a.id)}">Open record</a></div>`;
}

function loadLeaflet(){
  return new Promise((resolve,reject)=>{
    if(window.L){resolve();return;}
    if(!document.querySelector('link[data-launch-leaflet]')){
      const css=document.createElement('link');
      css.rel='stylesheet';css.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';css.dataset.launchLeaflet='1';document.head.append(css);
    }
    let s=document.querySelector('script[data-launch-leaflet]');
    if(!s){
      s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.dataset.launchLeaflet='1';document.head.append(s);
    }
    const start=Date.now();
    const timer=setInterval(()=>{
      if(window.L){clearInterval(timer);resolve();}
      else if(Date.now()-start>8000){clearInterval(timer);reject(new Error('Leaflet failed to load'));}
    },100);
  });
}

async function initMap(){
  try{await loadLeaflet();}catch{return;}
  map=L.map('launch-map',{scrollWheelZoom:false,zoomControl:true}).setView([44.6,-85.5],6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
    attribution:'&copy; OpenStreetMap &copy; CARTO',subdomains:'abcd',maxZoom:19
  }).addTo(map);
  layer=L.layerGroup().addTo(map);
  drawMarkers(true);
}

function drawMarkers(fit=false){
  if(!map||!layer)return;
  layer.clearLayers();markerById.clear();
  const bounds=[];
  for(const a of filtered){
    const m=L.circleMarker([a.latitude,a.longitude],{
      radius:a.id===selectedId?9:7,
      color:a.id===selectedId?'#173c24':'#fff',
      weight:a.id===selectedId?3:1.5,
      fillColor:'#2d6a3c',
      fillOpacity:.92
    }).addTo(layer);
    m.bindPopup(popupHTML(a),{maxWidth:330});
    m.on('click',()=>select(a.id,'marker'));
    markerById.set(a.id,m);
    bounds.push([a.latitude,a.longitude]);
  }
  if(fit&&bounds.length)map.fitBounds(bounds,{padding:[28,28],maxZoom:8});
}

function updateURL(){
  const u=new URL(location.href);
  ['q','access','ramp','parking'].forEach(k=>u.searchParams.delete(k));
  if(search.value.trim())u.searchParams.set('q',search.value.trim());
  if(access.value)u.searchParams.set('access',access.value);
  if(ramp.value)u.searchParams.set('ramp',ramp.value);
  if(Number(parking.value)>0)u.searchParams.set('parking',parking.value);
  if(selectedId)u.hash=`launch-${slug(selectedId)}`;else u.hash='';
  history.replaceState(null,'',u.pathname+(u.searchParams.toString()?`?${u.searchParams}`:'')+u.hash);
}

function render(){
  results.innerHTML=filtered.length?filtered.map(cardHTML).join(''):'<div class="empty">No currently open DNR Great Lakes-access records match these filters.</div>';
  summary.innerHTML=`Showing <strong>${filtered.length}</strong> of <strong>${records.length}</strong> source-qualified launches.`;
  drawMarkers(true);
  updateURL();
}

function apply(source='filter'){
  filtered=records.filter(a=>textMatches(a)&&accessMatches(a)&&rampMatches(a)&&parkingMatches(a));
  if(selectedId&&!filtered.some(a=>a.id===selectedId))selectedId='';
  render();
  emit('Boat Launch Filter',{filter:source,results:filtered.length});
}

function select(id,source='card'){
  const a=records.find(x=>x.id===id);
  if(!a)return;
  selectedId=id;
  results.querySelectorAll('.launch-card.selected').forEach(x=>x.classList.remove('selected'));
  const card=$(`[data-launch-id="${CSS.escape(id)}"]`,results);
  card?.classList.add('selected');
  drawMarkers(false);
  const m=markerById.get(id);
  if(map&&m){
    map.flyTo([a.latitude,a.longitude],Math.max(map.getZoom(),11),{duration:.45});
    setTimeout(()=>m.openPopup(),450);
  }
  updateURL();
  emit('Boat Launch Select',{source,facility:id});
}

function wire(){
  search.addEventListener('input',()=>apply('search'));
  access.addEventListener('change',()=>apply('access'));
  ramp.addEventListener('change',()=>apply('ramp'));
  parking.addEventListener('change',()=>apply('parking'));
  reset.addEventListener('click',()=>{
    search.value='';access.value='';ramp.value='';parking.value='0';selectedId='';apply('reset');
  });
  results.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]');
    if(action){
      const id=action.dataset.launchId;
      emit('Boat Launch Action',{action:action.dataset.action});
      if(action.dataset.action==='map'&&id){e.preventDefault();select(id,'map-button');}
      return;
    }
    const card=e.target.closest('.launch-card');
    if(card&&!e.target.closest('a,button'))select(card.dataset.launchId,'card');
  });
  results.addEventListener('keydown',e=>{
    const card=e.target.closest('.launch-card');
    if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(card.dataset.launchId,'keyboard');}
  });
  document.addEventListener('click',e=>{
    const p=e.target.closest('[data-popup-card]');
    if(!p)return;
    e.preventDefault();
    const id=p.dataset.popupCard;
    select(id,'popup');
    const card=$(`[data-launch-id="${CSS.escape(id)}"]`,results);
    card?.scrollIntoView({behavior:'smooth',block:'center'});
  });
}

async function loadMetadata(){
  try{
    const r=await fetch(`${DNR_LAYER}?f=json`,{headers:{Accept:'application/json'}});
    if(!r.ok)return;
    const j=await r.json();
    const stamp=j?.editingInfo?.lastEditDate||j?.lastEditDate;
    if(stamp){
      sourceStatus.textContent=`DNR layer updated ${dateText(stamp)}`;
      return;
    }
    sourceStatus.textContent='Live Michigan DNR Parks & Recreation data';
  }catch{sourceStatus.textContent='Live Michigan DNR Parks & Recreation data';}
}

async function load(){
  const params=new URLSearchParams(location.search);
  search.value=(params.get('q')||'').slice(0,80);
  access.value=['0.5','2'].includes(params.get('access'))?params.get('access'):'';
  ramp.value=['1','2','3','carry'].includes(params.get('ramp'))?params.get('ramp'):'';
  parking.value=['10','25','50'].includes(params.get('parking'))?params.get('parking'):'0';
  wire();
  initMap();
  loadMetadata();
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),9000);
    const r=await fetch(endpoint(),{signal:controller.signal,headers:{Accept:'application/json'}});
    clearTimeout(timeout);
    if(!r.ok)throw new Error(`DNR source returned ${r.status}`);
    const j=await r.json();
    if(j.error)throw new Error(j.error.message||'DNR source error');
    const raw=(j.features||[]).map(cleanFeature).filter(Boolean);
    const unique=new Map();
    for(const a of raw)unique.set(a.id,a);
    records=[...unique.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    filtered=[...records];
    if(!records.length)throw new Error('DNR source returned no qualifying open Great Lakes-access records');
    sourceStatus.textContent=sourceStatus.textContent||'Live Michigan DNR Parks & Recreation data';
    apply('source-load');
    emit('Boat Launch Source Load',{records:records.length,source:'PRDBASPublicView'});
  }catch(err){
    records=[];filtered=[];
    results.innerHTML=`<div class="empty error"><strong>Launch data unavailable.</strong><br>${esc(err.message||'The Michigan DNR source could not be reached.')}<br><br>No legacy or guessed launch pins are being shown.</div>`;
    summary.innerHTML='Unable to load the authoritative launch dataset.';
    sourceStatus.textContent='No fallback coordinates used';
    if(layer)layer.clearLayers();
    emit('Boat Launch Source Error',{message:String(err.message||err)});
  }
}
load();
})();
