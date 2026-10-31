import {chooseOuting,normalize,fromQuery,serializeInputs,SOURCE} from './gooseberry-engine.mjs';

const $=(id)=>document.getElementById(id);
const fields={minutes:$('visit-time'),mobility:$('visit-mobility'),season:$('visit-season'),interest:$('visit-interest')};
const output={name:$('answer-name'),why:$('answer-why'),time:$('answer-time'),terrain:$('answer-terrain'),location:$('answer-location'),permit:$('answer-permit'),story:$('answer-story'),alternative:$('answer-alternative'),warning:$('answer-warning'),source:$('answer-source'),map:$('answer-map')};
const buttons=[...document.querySelectorAll('[data-outing]')];
let regionalEvidence={},map=null,pins=new Map(),mapAttempt=null;
function currentInputs(){return normalize({minutes:fields.minutes.value,mobility:fields.mobility.value,season:fields.season.value,interest:fields.interest.value});}
function applyInputs(inputs){
 const c=normalize(inputs);
 fields.minutes.value=String(c.minutes);fields.mobility.value=c.mobility;fields.season.value=c.season;fields.interest.value=c.interest;
}
function render() {
 const r=chooseOuting(currentInputs(),regionalEvidence);
 output.name.textContent=r.outing.name;
 output.why.textContent=r.why;
 output.time.textContent=r.outing.minutes;
 output.terrain.textContent=r.outing.terrain;
 output.location.textContent=r.outing.location;
 output.permit.textContent=r.outing.permit;
 output.story.textContent=r.outing.description;
 output.alternative.textContent=r.alternatives.join(' ');
 output.warning.textContent=r.warnings.join(' ');
 output.source.href=r.outing.source;output.map.href=r.outing.map;
 document.querySelectorAll('[data-outing]').forEach(b=>{
   const picked=b.dataset.outing===r.outing.id;
   b.setAttribute('aria-pressed',String(picked));b.dataset.selected=String(picked);
 });
 const u=new URL(location.href);
 u.search=serializeInputs(r.input);
 history.replaceState(null,'',u.pathname+u.search+u.hash);
 return r;
}
applyInputs(fromQuery(location.search));
for(const input of Object.values(fields))input.addEventListener('change',render);
for(const b of buttons)b.addEventListener('click',()=>{
  const target=b.dataset.outing;
  const change={short:{minutes:30,interest:'waterfalls'},loop:{minutes:90,interest:'waterfalls'},
    fifth:{minutes:150,interest:'long-hike'},shoreline:{minutes:90,interest:'shoreline'}}[target];
  if(!change)return;
  applyInputs({...currentInputs(),...change});
  render();
  $('choose').scrollIntoView({behavior:'auto',block:'start'});
});
const share=$('copy-plan');
if(share)share.addEventListener('click',async()=>{
  const text=location.href;
  try {
    if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
    share.textContent='Plan link copied';
    share.dataset.copied='yes';
  }catch {
    share.textContent='Select address bar to copy plan link';
    share.dataset.copied='no';
  }
});
render();

// Live regional forecast/alerts: never promote into verified park access or a river-flow status.
async function loadConditions(){
  const title=$('weather-title'),detail=$('weather-detail'),age=$('weather-age');
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8500);
    let data;
    try {
      const response=await fetch('/api/gooseberry-conditions',{headers:{Accept:'application/json'},signal:controller.signal});
      if(!response.ok)throw new Error('forecast service error');
      data=await response.json();
    }finally{clearTimeout(timeout);}
    if(data?.scope!=='regional-weather-only'||data?.parkAccess!=='UNVERIFIED')throw new Error('unexpected evidence scope');
    const checkedTime=Date.parse(data.checkedAt);
    if(!Number.isFinite(checkedTime)||Date.now()-checkedTime>35*60*1000||checkedTime>Date.now()+5*60*1000)
      throw new Error('outdated evidence');
    if(data.weather?.state==='forecast'&&Array.isArray(data.weather.periods)&&data.weather.periods.length){
      const now=Date.now();
      const current=data.weather.periods.find(p=>Date.parse(p.endTime)>now)||data.weather.periods[0];
      title.textContent=current?.name||'Regional forecast';
      detail.textContent=(current?.shortForecast||'Forecast detail unavailable')+
        (Number.isFinite(current?.temperature)?' · '+current.temperature+'°'+(current.temperatureUnit||'F'):'')+
        '. This is forecast weather, not a trail surface observation.';
      const issue=Date.parse(data.weather.issuedAt);
      age.textContent='NWS forecast · '+(Number.isFinite(issue)?new Date(issue).toLocaleString('en-US',{timeZone:'America/Chicago',dateStyle:'medium',timeStyle:'short'})+' Central':'issuance time unavailable')+
        ' · checked '+new Date(checkedTime).toLocaleTimeString('en-US',{timeZone:'America/Chicago',timeStyle:'short'})+' Central';
    }else{title.textContent='Forecast unavailable';detail.textContent='The official NWS forecast is linked here; no conditions are inferred from a failed feed.';age.textContent='No validated forecast received';}
    const active=Array.isArray(data.alerts?.items)?data.alerts.items.filter(a=>{
      const expiry=Date.parse(a.expiresAt);return Number.isFinite(expiry)&&expiry>Date.now()&&['Severe','Extreme'].includes(a.severity);
    }):[];
    regionalEvidence={alerts:active};
    if(active.length){
      title.textContent=active[0].event||'Serious regional NWS alert';
      detail.textContent='NWS '+active[0].severity+' alert in the park vicinity: '+(active[0].headline||'check the official alert before departure')+'. Forecast and alerts do not verify park closures.';
    }
    render();
  }catch{
    title.textContent='Forecast unavailable';
    detail.textContent='Weather is not currently verified here. Check NWS directly and the DNR for specific trail conditions.';
    age.textContent='No current automated evidence';
    regionalEvidence={};render();
  }
}
void loadConditions();

// Verified orientation markers only: one published park-parking coordinate,
// a geotagged falls photograph and a geotagged licensed Agate Beach photograph.
// No implied trail routing or verified availability at any marker.
const places=[
 {id:'visitor',title:'Visitor center vicinity',lat:47.14035,lng:-91.46955,
   description:'Parking orientation based on published park visitor-center coordinates. Use official address and posted signage for access.',
   proof:'https://www.minnesotaseasons.com/Destinations/Gooseberry_Falls_State_Park.html'},
 {id:'falls',title:'Falls photographed viewpoint',lat:47.143658,lng:-91.469361,
   description:'Photograph GPS position, not a public parking space, trailhead, or guaranteed accessible overlook.',
   proof:'https://commons.wikimedia.org/wiki/File:Goosberry_Falls.jpg'},
 {id:'beach',title:'Agate Beach photographed vicinity',lat:47.140518,lng:-91.455215,
   description:'Location from a geotagged historic beach photograph; vehicle access and surface conditions must be checked.',
   proof:'https://commons.wikimedia.org/wiki/File:Agate_Beach_(Gooseberry_Falls_State_Park).jpg'}
];
const mapArea=$('gb-map'),mapStatus=$('map-status'),mapWrap=document.querySelector('.map-wrap');
function failMap() {
 if(map){try{map.remove()}catch{}map=null;pins.clear();}
 mapWrap.dataset.failed='true';
 mapStatus.textContent='Interactive tiles did not load. Use the official DNR summer/winter trail maps and the park address instead.';
}
function makePopup(place){
 const p=document.createElement('div');const h=document.createElement('strong');h.textContent=place.title;
 const d=document.createElement('p');d.textContent=place.description;
 const a=document.createElement('a');a.href=place.proof;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Coordinate evidence';
 p.append(h,d,a);return p;
}
function selectPlace(id){
 const place=places.find(x=>x.id===id);
 if(!place)return;
 const guideTitle=document.querySelector('.map-guide h3');
 const guideBody=document.querySelector('.map-guide > p');
 if(guideTitle)guideTitle.textContent=place.title;
 if(guideBody)guideBody.textContent=place.description;
 if(map&&pins.has(id)){
   map.setView([place.lat,place.lng],Math.max(13,map.getZoom()),{animate:false});
   pins.get(id).openPopup();
 }
 document.querySelectorAll('[data-place]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.place===id)));
}
async function tilesLoad(L,m,template,label,credit){
 const layer=L.tileLayer(template,{subdomains:'abcd',maxZoom:19,attribution:credit,crossOrigin:true});
 await new Promise((resolve,reject)=>{
   let done=false,errors=0;
   const end=(error)=>{if(done)return;done=true;clearTimeout(timer);layer.off('tileload',onLoad);layer.off('tileerror',onError);if(error){m.removeLayer(layer);reject(error);}else resolve();};
   const onLoad=()=>end(null);
   const onError=()=>{if(++errors>=2)end(new Error('tile unavailable'));};
   const timer=setTimeout(()=>end(new Error('tile timeout')),7500);
   layer.on('tileload',onLoad);layer.on('tileerror',onError);layer.addTo(m);
 });
 mapStatus.textContent=label+' basemap tile loaded. Markers are orientation only, not a hiking route or access clearance.';
 return layer;
}
async function createMap(){
 if(!window.L?.map)throw new Error('Leaflet script missing');
 const L=window.L;
 map=L.map(mapArea,{scrollWheelZoom:false,zoomControl:true}).setView([47.142,-91.463],13);
 for(const p of places){
   const marker=L.circleMarker([p.lat,p.lng],{radius:8,weight:2,color:'#fff',fillColor:p.id==='visitor'?'#9a5b23':'#135b68',fillOpacity:.95}).addTo(map);
   marker.bindPopup(makePopup(p));marker.on('click',()=>selectPlace(p.id));
   pins.set(p.id,marker);
 }
 map.fitBounds(L.latLngBounds(places.map(p=>[p.lat,p.lng])).pad(.2),{maxZoom:14});
 if('ResizeObserver'in window)new ResizeObserver(()=>map?.invalidateSize({pan:false})).observe(mapArea);
 const credit='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
 let config=null;
 try {const r=await fetch('/api/carto-basemap-config',{signal:AbortSignal.timeout(4500)});if(r.ok)config=await r.json();}catch{}
 if(config?.provider==='CARTO'&&typeof config.key==='string'&&config.key.trim()){
   try{await tilesLoad(L,map,'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key='+encodeURIComponent(config.key.trim()),'CARTO',credit+' &copy; <a href="https://carto.com/attributions">CARTO</a>');return;}catch{}
 }
 await tilesLoad(L,map,'https://tile.openstreetmap.org/{z}/{x}/{y}.png','OpenStreetMap',credit);
}
if(mapArea){
 mapAttempt=createMap().catch(failMap);
 document.querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',async()=>{
   if(mapAttempt)await mapAttempt;
   selectPlace(b.dataset.place);
 }));
}
