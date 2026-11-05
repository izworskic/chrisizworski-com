'use strict';
/* PMRF / Barking Sands public desk.
 * National launch timing comes ONLY from shared /api/rocket-launch-usa.
 * Source checks are independent and never promote a published shoreline
 * policy, Navy recreation credential or historic marine polygon into
 * verified launch viewing or live maritime-zone authorization.
 */
(()=>{
const API='/api/rocket-launch-usa',OFFICIAL='/api/pmrf-official',ATLAS='/barking-sands-rocket-launch-viewing/atlas.json';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const $=id=>document.getElementById(id);
const set=(id,value)=>{const n=$(id);if(n)n.textContent=value??'Unverified';};
const modes={
 walk:{label:'PUBLIC BEACH RECREATION / CONDITIONAL',
  title:'You may use only posted, designated public shoreline.',
  desc:'Navy guidance permits walk-in recreation at designated beach areas from the northern or southern boundary. Restricted-area signs and the beachfront vegetation line control. This is not permission to enter federal property inland, drive on the beach, or watch a launch during a safety closure.',
  facts:['Respect restricted signs','No vehicles on state beaches','No verified launch-viewing area'],
  links:[['https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Operations-and-Management/Beach-Access/','Navy designated shoreline policy']]},
 guest:{label:'CREDENTIALED MWR RECREATION / NOT FLIGHT AUTHORIZATION',
  title:'A Navy MWR guest card adds recreational access, not launch viewing.',
  desc:'The Navy describes guest-card access through the main gate to certain recreational facilities, generally between 5 a.m. and 10 p.m. except during heightened force-protection conditions. Applications require screening and a fee. A card does not grant access to pads, operations areas, restricted shoreline or a launch event.',
  facts:['Application and background check','Recreation only','Force-protection restrictions prevail'],
  links:[['https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Resources/MWR-Guest-Pass-Program/','Navy guest-card requirements'],['https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/','Navy Pass & ID: 808-335-4221']]},
 boat:{label:'MARITIME OPERATIONS / ACTIVE NOTICES REQUIRED',
  title:'The sea is not an unrestricted launch-viewing parking lot.',
  desc:'The Coast Guard defines a STARS-specific maritime safety area in 33 CFR 165.1406. It is closed when activated for designated operations by published or broadcast notice. This page has NOT verified that the zone is active or inactive today. Other Navy range hazards may also apply.',
  facts:['Do not navigate by this map','Verify broadcast/local notices','No marine launch-viewing authorization'],
  links:[['https://navcen.uscg.gov/local-notices-to-mariners-by-cg-district','Current Coast Guard LNM hub'],['https://www.ecfr.gov/current/title-33/chapter-I/subchapter-P/part-165/section-165.1406','33 CFR 165.1406 official text']]}
};
const state={data:null,request:0,atlas:null,map:null,pins:new Map(),polygon:null,tilesReady:false,leaflet:null,loadingMap:false,ruleShown:true};
const external=(href,label)=>{
 if(typeof href!=='string'||!/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(href))return null;
 const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;return a;
};
function changeMode(name){
 const m=modes[name];if(!m)return;
 set('mode-label',m.label);set('mode-title',m.title);set('mode-desc',m.desc);
 const facts=$('mode-facts');facts.replaceChildren();
 for(const value of m.facts){const s=document.createElement('span');s.textContent=value;facts.appendChild(s);}
 const links=$('mode-links');links.replaceChildren();
 for(const [url,label]of m.links){const link=external(url,label);if(link)links.appendChild(link);}
 document.querySelectorAll('[data-mode]').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.mode===name?'true':'false'));
}
const time=(iso,options={})=>{
 const dt=new Date(iso||'');if(!Number.isFinite(+dt))return 'Not verified';
 return dt.toLocaleString('en-US',{timeZone:'Pacific/Honolulu',year:'numeric',month:'short',day:'numeric',...options});
};
function target(m){
 if(!m?.net)return 'No confirmed target';
 const p=m.netPrecision||'unknown',dt=new Date(m.net);
 if(!Number.isFinite(+dt))return 'No confirmed target';
 if(p==='year')return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',year:'numeric'}).format(dt)+' · year only';
 if(p==='month')return new Intl.DateTimeFormat('en-US',{timeZone:'UTC',year:'numeric',month:'long'}).format(dt)+' · month only';
 if(['day','date-tbd','time-tbd'].includes(p))return
  new Intl.DateTimeFormat('en-US',{timeZone:'UTC',year:'numeric',month:'short',day:'numeric'}).format(dt)+' · time not verified';
 if(!['hour','minute','second'].includes(p))return 'Precision unavailable; check operator';
 return time(m.net,{hour:'numeric',minute:'2-digit',timeZoneName:'short'})+
  (p==='hour'?' · hour approximate':' · scheduled target, not launch GO');
}
function network(id){
 const q='?region=hawaii'+(id&&UUID.test(id)?'&launchId='+encodeURIComponent(id):'');
 for(const key of ['mission-link','bottom-national']){const a=$(key);if(a)a.href='/national-tools/rocket-launch-live/'+q;}
}
function showMissions(data,expired=false){
 state.data=data;
 const region=Array.isArray(data.regions)?data.regions.find(r=>r.id==='hawaii'):null;
 const missions=Array.isArray(region?.launches)?region.launches.filter(m=>UUID.test(m.id)):[];
 const select=$('mission-picker');select.replaceChildren();
 for(const m of missions){const opt=document.createElement('option');opt.value=m.id;opt.textContent=(m.name||'PMRF mission')+' · '+target(m);select.appendChild(opt);}
 if(!missions.length){const opt=document.createElement('option');opt.value='';opt.textContent='No upcoming PMRF mission in this bounded feed';select.appendChild(opt);}
 select.disabled=!missions.length;
 const pick=data.selectedLaunch?.region==='hawaii'?data.selectedLaunch:null;
 if(pick&&missions.some(m=>m.id===pick.id))select.value=pick.id;
 const selected=missions.find(m=>m.id===select.value)||null;
 set('mission-name',selected?.name||'No upcoming Barking Sands launch in this bounded feed');
 set('mission-time',target(selected));
 set('mission-facility',selected?.pad?selected.pad+' · restricted facility; no public pad directions':'PMRF military range · pad unverified');
 set('mission-observed',data.scheduleCheckedAt?time(data.scheduleCheckedAt,{hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Snapshot time unavailable');
 const notes=[];
 if(expired)notes.push('The formerly linked launch disappeared from this bounded snapshot. Its outcome is unknown.');
 if(region?.feedState==='unavailable')notes.push('The Hawaii launch-location feed is unavailable.');
 else if(!missions.length)notes.push('No launch is returned in the selected source window. Unannounced military tests may still occur.');
 else notes.push('Third-party launch calendar. Check Navy notices; defense tests may be unpublished.');
 if(data.scheduleFreshness==='stale')notes.push('Schedule snapshot is stale.');
 else if(data.scheduleFreshness==='recent')notes.push('Schedule recently observed, not cleared for flight.');
 else notes.push('Schedule freshness unverified.');
 if(data.scheduleWarning)notes.push(data.scheduleWarning);
 set('feed-note',notes.join(' '));
 set('mission-advice',selected?
  'Launch target does not imply a public spectator venue. Confirm any official operational and shoreline restrictions separately; neither a guest card nor a beach policy is a launch ticket.':
  'No mission in the bounded feed is NOT evidence of an open beach, inactive safety zone or canceled Navy operation.');
 network(selected?.id);
 const url=new URL(location.href);if(selected?.id)url.searchParams.set('launchId',selected.id);else url.searchParams.delete('launchId');
 history.replaceState(null,'',url.pathname+url.search+url.hash);
}
async function loadMission(id,expired=false){
 const seq=++state.request,params=new URLSearchParams({region:'hawaii'});
 if(id&&UUID.test(id))params.set('launchId',id);
 $('mission-picker').disabled=true;set('feed-note','Checking the shared bounded national launch snapshot…');
 try{
  const r=await fetch(API+'?'+params.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(13000)});
  if(seq!==state.request)return;
  if(r.status===404&&id&&!expired){await loadMission(null,true);return;}
  const d=await r.json();if(!r.ok||!d?.ok||d.region?.id!=='hawaii')throw Error('PMRF national feed unavailable');
  showMissions(d,expired);
 }catch{
  if(seq!==state.request)return;
  state.data=null;$('mission-picker').disabled=true;
  const sel=$('mission-picker');sel.replaceChildren();const op=document.createElement('option');op.textContent='Schedule unavailable';sel.appendChild(op);
  set('mission-name','Shared launch schedule unavailable');set('mission-time','Not verified');
  set('mission-facility','Military range · no public pad directions');
  set('mission-observed','Source unavailable');set('feed-note','The national snapshot could not be checked. No launch or cancellation can be inferred.');
  set('mission-advice','Do not travel based on an old target or assume safe shoreline access. Consult official Navy and Coast Guard sources.');
  network(null);
 }
}
async function loadOfficial(){
 try{
  const r=await fetch(OFFICIAL,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(16000)});
  if(!r.ok)throw Error('source desk offline');
  const d=await r.json();if(!d?.ok||!d.evidence)throw Error('source desk incomplete');
  const labels={
   beach:{'general-policy-retrieved':'General shoreline policy retrieved','unverified':'Changed or unverified','source-unavailable':'Official source unavailable'},
   guest:{'recreation-only-confirmed':'Recreation-only terms retrieved','unverified':'Changed or unverified','source-unavailable':'Official source unavailable'},
   park:{'published-closure':'Closure bulletin retrieved','unverified':'Closure/reopening not verified','source-unavailable':'Official source unavailable'}
  };
  for(const k of ['beach','guest','park']){const record=d.evidence[k]||{},value=labels[k][record.status]||'No verification';set('source-'+k,value);}
  set('source-checked','Independent official pages last fetched '+time(d.checkedAt,{hour:'numeric',minute:'2-digit',timeZoneName:'short'})+
   '. These are source-text checks, not live gate, beach or maritime activation sensors.');
 }catch{
  for(const k of ['beach','guest','park'])set('source-'+k,'Official check unavailable');
  set('source-checked','Could not fetch the official source desk. Follow Navy, DLNR and Coast Guard links. No open-access inference is made.');
 }
}
async function loadAtlas(){
 if(state.atlas)return state.atlas;
 const r=await fetch(ATLAS,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('map manifest unavailable');
 const data=await r.json();
 if(data.schemaVersion!==1||!Array.isArray(data.points)||data.points.length!==2||
    new Set(data.points.map(p=>p.id)).size!==2||
    !data.points.every(p=>['pmrf-range','polihale-park'].includes(p.id)&&
      Number.isFinite(p.lat)&&p.lat>21.9&&p.lat<22.2&&Number.isFinite(p.lon)&&p.lon< -159.6&&p.lon> -160&&
      /^https:\/\//.test(p.source)&&/^https:\/\//.test(p.access))||
    data.maritimeRule?.statute!=='33 CFR 165.1406'||
    data.maritimeRule?.datum!=='OHD'||!Array.isArray(data.maritimeRule.polygonLatLon)||
    data.maritimeRule.polygonLatLon.length!==4||
    !data.maritimeRule.polygonLatLon.every(pair=>Array.isArray(pair)&&pair.length===2&&
      Number.isFinite(pair[0])&&pair[0]>21.9&&pair[0]<22.2&&Number.isFinite(pair[1])&&pair[1]< -159.6&&pair[1]> -160))
    throw Error('Unverified regulatory map data');
 state.atlas=data;return data;
}
async function loadLeaflet(){
 if(window.L?.map)return;
 if(state.leaflet)return state.leaflet;
 state.leaflet=new Promise((resolve,reject)=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(css);
  const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload=()=>window.L?.map?resolve():reject(Error('Map library invalid'));
  script.onerror=()=>reject(Error('Map library unavailable'));document.head.appendChild(script);
 });return state.leaflet;
}
function icon(p){const park=p.id==='polihale-park';return window.L.divIcon({className:'pmrf-marker',html:'<span class="p-pin'+(park?' park':'')+'">'+(park?'P':'!')+'</span>',iconSize:[36,36],iconAnchor:[18,18]});}
function locate(id,move=true){
 const point=state.atlas?.points?.find(p=>p.id===id);if(!point)return;
 for(const e of document.querySelectorAll('[data-place]'))e.setAttribute('aria-pressed',e.dataset.place===id?'true':'false');
 document.querySelectorAll('.place[id]').forEach(e=>e.dataset.selected=e.id==='place-'+id?'true':'false');
 set('map-status',point.coordinateRole+' This point is not permission to enter, drive or watch a launch.');
 if(move&&state.map){state.map.panTo([point.lat,point.lon],{animate:false});state.pins.get(id)?.openPopup();}
}
function syncRule(){
 state.ruleShown=$('show-rule')?.checked===true;
 if(!state.map||!state.polygon)return;
 if(state.ruleShown&&!state.map.hasLayer(state.polygon))state.polygon.addTo(state.map);
 else if(!state.ruleShown&&state.map.hasLayer(state.polygon))state.map.removeLayer(state.polygon);
 set('map-status',state.ruleShown?'The STARS regulation area is illustrated. Activation is NOT checked; never navigate using this overlay.':
  'Regulatory polygon hidden. Coast Guard and Navy restrictions still apply regardless of map visibility.');
}
async function startMap(){
 if(state.map||state.loadingMap)return;
 state.loadingMap=true;const button=$('load-map');if(button)button.disabled=true;
 try{
  const d=await loadAtlas();await loadLeaflet();const L=window.L,root=$('pmrf-map');
  root.replaceChildren();root.setAttribute('role','region');root.setAttribute('aria-label','Interactive interpretive west Kauaʻi range map');
  const map=L.map(root,{scrollWheelZoom:false,preferCanvas:true,zoomControl:true});state.map=map;
  const osmCredit='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:osmCredit}).addTo(map);
  osm.on('tileload',()=>{state.tilesReady=true;});
  osm.on('tileerror',()=>{if(!state.tilesReady)set('map-status','Map basemap unavailable. Official source cards remain usable.');});
  const bounds=[];
  for(const p of d.points){
   const marker=L.marker([p.lat,p.lon],{icon:icon(p),keyboard:true,title:p.name});
   const popup=document.createElement('div');popup.className='p-popup';const title=document.createElement('strong');
   title.textContent=p.name;const message=document.createElement('p');message.textContent=p.coordinateRole;
   const link=external(p.access,'Check official access source');popup.append(title,message);if(link)popup.append(link);
   marker.bindPopup(popup);marker.on('click',()=>locate(p.id,false));marker.addTo(map);state.pins.set(p.id,marker);bounds.push([p.lat,p.lon]);
  }
  const coords=d.maritimeRule.polygonLatLon;
  state.polygon=L.polygon(coords,{color:'#277da0',fillColor:'#4fa4c1',weight:2,fillOpacity:.18,dashArray:'5 6'});
  const popup=document.createElement('div');popup.className='p-popup';const strong=document.createElement('strong');
  strong.textContent='Conditional STARS maritime safety area';
  const message=document.createElement('p');message.textContent='33 CFR 165.1406, OHD coordinates. NOT verified active. Not every PMRF hazard area and not navigation-grade geometry.';
  popup.append(strong,message);const anchor=external(d.maritimeRule.source,'Read governing rule');if(anchor)popup.append(anchor);
  state.polygon.bindPopup(popup);if(state.ruleShown)state.polygon.addTo(map);
  bounds.push(...coords);map.fitBounds(bounds,{padding:[24,24],maxZoom:11,animate:false});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>map.invalidateSize()).observe(root);
  syncRule();
  fetch('/api/carto-basemap-config',{signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json():null).then(c=>{
   if(c?.provider!=='CARTO'||typeof c.key!=='string'||!c.key.trim())return;
   const url='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+encodeURIComponent(c.key.trim());
   const carto=L.tileLayer(url,{subdomains:'abcd',maxZoom:19,attribution:osmCredit+' &copy; <a href="https://carto.com/attributions">CARTO</a>'});
   let loaded=false,errors=0;
   carto.on('tileload',()=>{if(!loaded&&map.hasLayer(carto)){loaded=true;map.removeLayer(osm);}});
   carto.on('tileerror',()=>{if(++errors>2&&!loaded&&map.hasLayer(carto)){map.removeLayer(carto);if(!map.hasLayer(osm))osm.addTo(map);}});
   carto.addTo(map);
  }).catch(()=>{});
 }catch{
  if(button){button.disabled=false;button.textContent='Retry coast map';}
  set('map-status','Interactive map unavailable. The Navy beach rules, DLNR closure notice and Coast Guard regulation remain linked beside it.');
 }finally{state.loadingMap=false;}
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>changeMode(b.dataset.mode)));
document.querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',async()=>{if(!state.map)await startMap();locate(b.dataset.place);}));
$('show-rule')?.addEventListener('change',syncRule);
$('view-zone')?.addEventListener('click',async()=>{if(!state.map)await startMap();if(state.map&&state.polygon){$('show-rule').checked=true;syncRule();state.map.fitBounds(state.polygon.getBounds(),{padding:[20,20],maxZoom:11,animate:false});state.polygon.openPopup();}});
$('load-map')?.addEventListener('click',()=>{void startMap();});
$('mission-picker')?.addEventListener('change',e=>{if(UUID.test(e.target.value))void loadMission(e.target.value);});
const requested=new URL(location.href).searchParams.get('launchId');
void loadMission(requested&&UUID.test(requested)?requested:null);
void loadOfficial();
})();
