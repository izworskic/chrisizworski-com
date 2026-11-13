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
 walk:{label:'BEACH RECREATION / READ THE SIGNS',
  title:'Designated beaches can be open for recreation, not for launch viewing.',
  desc:'The Navy allows walk-in recreation on certain marked beaches from the north or south boundaries. Stay within the signs and vegetation line. You cannot enter restricted federal property, drive on state beaches or remain during a safety closure.',
  facts:['Stay inside the posted beach boundary','No vehicles on state beaches','No approved launch viewing confirmed'],
  links:[['https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Operations-and-Management/Beach-Access/','Navy designated shoreline policy']]},
 guest:{label:'MWR GUEST CARD / RECREATION ONLY',
  title:'A Navy guest card opens some recreation facilities, not the launch pad.',
  desc:'The Navy describes access to some recreation facilities through its guest-card program, subject to hours, screening, fees and security conditions. A card does not give you launch-day access to operational areas, restricted beaches or the pad.',
  facts:['Application and background check','Not a launch ticket','Force-protection restrictions prevail'],
  links:[['https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/Resources/MWR-Guest-Pass-Program/','Navy guest-card requirements'],['https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/','Navy Pass & ID: 808-335-4221']]},
 boat:{label:'ON THE WATER / CURRENT NOTICES REQUIRED',
  title:'A boat is not a shortcut into a launch safety zone.',
  desc:'For certain STARS operations, the Coast Guard may activate a maritime safety area. The rule is published, but we have not verified whether it is active today. Mariners must check current broadcasts and notices; other range hazards may exist.',
  facts:['This map is not for navigation','Check current Coast Guard notices','No approved marine viewing area'],
  links:[['https://navcen.uscg.gov/local-notices-to-mariners-by-cg-district','Current Coast Guard LNM hub'],['https://www.ecfr.gov/current/title-33/chapter-I/subchapter-P/part-165/section-165.1406','33 CFR 165.1406 official text']]}
};
const state={data:null,request:0,atlas:null,map:null,pins:new Map(),polygon:null,rocketPins:null,tilesReady:false,leaflet:null,loadingMap:false,ruleShown:true,rust:null,mode:'walk',agencyEvidence:null};
const external=(href,label)=>{
 if(typeof href!=='string'||!/^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(href))return null;
 const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;return a;
};
function renderRustAccess(){
 const panel=$('pmrf-rust-access');
 if(!panel||!state.rust)return;
 const evidence=state.agencyEvidence||{};
 const policy=state.mode==='walk'?
   evidence.beach?.status==='general-policy-retrieved':
   state.mode==='guest'?
   evidence.guest?.status==='recreation-only-confirmed':false;
 const classification=state.rust.pmrfModeState(state.mode,policy);
 if(classification===1){
   panel.textContent='Rust source check: Navy general beach-recreation policy retrieved. This does not confirm an open beach today or public launch-viewing permission.';
 }else if(classification===2){
   panel.textContent='Rust source check: Navy MWR guest-card recreation policy retrieved. Guest privileges do not include range access or any launch-viewing authorization.';
 }else if(classification===3){
   panel.textContent='Rust source check: current Coast Guard broadcast and range notices are required for a boating decision. This website does not verify a safety zone is inactive or authorize a marine viewing position.';
 }else{
   panel.textContent='Rust source check: current applicable agency evidence is missing or unverified. Do not infer entry, beach access or launch-viewing permission.';
 }
 panel.dataset.decisionEngine='rust-wasm';
 panel.hidden=false;
}
async function enableRustAccess(){
 const engine=await window.RocketRangeRust?.load('pmrf',['pmrf-range','polihale-park']);
 if(!engine)return;
 state.rust=engine;renderRustAccess();
}
function changeMode(name){
 const m=modes[name];if(!m)return;
 state.mode=name;renderRustAccess();
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
 if(!['hour','minute','second'].includes(p))return 'Exact launch time not announced';
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
 if(!missions.length){const opt=document.createElement('option');opt.value='';opt.textContent='No upcoming Barking Sands flight listed here';select.appendChild(opt);}
 select.disabled=!missions.length;
 const pick=data.selectedLaunch?.region==='hawaii'?data.selectedLaunch:null;
 if(pick&&missions.some(m=>m.id===pick.id))select.value=pick.id;
 const selected=missions.find(m=>m.id===select.value)||null;
 state.rocketPins?.update(missions,selected?.id);
 set('mission-name',selected?.name||'No upcoming Barking Sands flight listed here');
 set('mission-time',target(selected));
 set('mission-facility',selected?.pad?selected.pad+' · restricted facility; no public pad directions':'PMRF military range · pad unverified');
 set('mission-observed',data.scheduleCheckedAt?time(data.scheduleCheckedAt,{hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Calendar update time unavailable');
 const notes=[];
 if(expired)notes.push('A flight you followed has disappeared from the public calendar. Check the operator before assuming what happened.');
 if(region?.feedState==='unavailable')notes.push('The Hawaiʻi launch calendar is not responding.');
 else if(!missions.length)notes.push('No flight is listed here right now. Navy tests may still happen without appearing on this calendar.');
 else notes.push('These are public calendar listings. Navy tests and range notices are separate.');
 if(data.scheduleFreshness==='stale')notes.push('The calendar may be out of date.');
 else if(data.scheduleFreshness==='recent')notes.push('The calendar was checked recently, but this is not launch clearance.');
 else notes.push('Last calendar update time not confirmed.');
 if(data.scheduleWarning)notes.push(data.scheduleWarning);
 set('feed-note',notes.join(' '));
 set('mission-advice',selected?
  'A rocket on the calendar does not make the range a viewing destination. Check Navy shoreline rules and any operational closures. Neither a guest card nor ordinary beach access is a launch ticket.':
  'Nothing listed here does not mean the beaches are open, the water is unrestricted or the Navy has canceled an operation.');
 window.RocketFoundryHandoff?.loaded('hawaii',selected?.id,selected?.name);
 network(selected?.id);
 const url=new URL(location.href);if(selected?.id)url.searchParams.set('launchId',selected.id);else url.searchParams.delete('launchId');
 history.replaceState(null,'',url.pathname+url.search+url.hash);
}
async function loadMission(id,expired=false){
 const seq=++state.request,params=new URLSearchParams({region:'hawaii'});
 if(id&&UUID.test(id))params.set('launchId',id);
 $('mission-picker').disabled=true;set('feed-note','Looking for public Barking Sands launch announcements…');
 try{
  const r=await fetch(API+'?'+params.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(13000)});
  if(seq!==state.request)return;
  if(r.status===404&&id&&!expired){await loadMission(null,true);return;}
  const d=await r.json();
  if(seq!==state.request)return;
  if(!r.ok||!d?.ok||d.region?.id!=='hawaii')throw Error('PMRF national feed unavailable');
  showMissions(d,expired);
 }catch{
  if(seq!==state.request)return;
  state.data=null;state.rocketPins?.update([],null);$('mission-picker').disabled=true;
  const sel=$('mission-picker');sel.replaceChildren();const op=document.createElement('option');op.textContent='Schedule unavailable';sel.appendChild(op);
  set('mission-name','Barking Sands calendar unavailable');set('mission-time','Not verified');
  set('mission-facility','Military range · no public pad directions');
  set('mission-observed','Source unavailable');set('feed-note','We couldn’t refresh the launch calendar. That does not mean a test happened or was canceled.');
  set('mission-advice','Don’t travel based on an old countdown. Check Navy shoreline updates and Coast Guard notices before heading toward the range.');
  network(null);
 }
}
async function loadOfficial(){
 try{
  const r=await fetch(OFFICIAL,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(16000)});
  if(!r.ok)throw Error('source desk offline');
  const d=await r.json();if(!d?.ok||!d.evidence)throw Error('source desk incomplete');
  state.agencyEvidence=d.evidence;renderRustAccess();
  const labels={
   beach:{'general-policy-retrieved':'Navy beach rules retrieved','unverified':'Changed or unverified','source-unavailable':'Official source unavailable','archived-policy-not-live':'2026-11-05 policy · live refresh blocked'},
   guest:{'recreation-only-confirmed':'Navy guest-card rules retrieved','unverified':'Changed or unverified','source-unavailable':'Official source unavailable','archived-policy-not-live':'2026-11-05 policy · live refresh blocked'},
   park:{'published-closure':'State park closure notice retrieved','unverified':'Park opening status not confirmed','source-unavailable':'Official source unavailable'}
  };
  for(const k of ['beach','guest','park']){const record=d.evidence[k]||{},value=labels[k][record.status]||'No verification';set('source-'+k,value);}
  const navyArchived=['beach','guest'].some(k=>d.evidence[k]?.status==='archived-policy-not-live');
  set('source-checked','Agency websites checked '+time(d.checkedAt,{hour:'numeric',minute:'2-digit',timeZoneName:'short'})+'. '+
   (navyArchived?'The Navy website could not be refreshed automatically. The policy shown was reviewed November 5, 2026; it does not confirm a beach is open today. ':'')+
   'These website checks cannot tell us whether a gate is open or an offshore safety area is active right now.');
 }catch{
  state.agencyEvidence=null;renderRustAccess();
  for(const k of ['beach','guest','park'])set('source-'+k,'Official check unavailable');
  set('source-checked','Agency updates could not be checked here. Follow the Navy, Hawaiʻi DLNR and Coast Guard links before going; do not assume access is open.');
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
 set('map-status',point.coordinateRole+' This marker is for orientation, not permission to drive, enter or watch a launch.');
 if(move&&state.map){state.map.panTo([point.lat,point.lon],{animate:false});state.pins.get(id)?.openPopup();}
}
function syncRule(){
 state.ruleShown=$('show-rule')?.checked===true;
 if(!state.map||!state.polygon)return;
 if(state.ruleShown&&!state.map.hasLayer(state.polygon))state.polygon.addTo(state.map);
 else if(!state.ruleShown&&state.map.hasLayer(state.polygon))state.map.removeLayer(state.polygon);
 set('map-status',state.ruleShown?'The published STARS safety area is shown, but we have not confirmed a live closure. Never navigate a boat using this map.':
  'The offshore area is hidden on the map. Navy and Coast Guard rules still apply.');
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
  osm.on('tileerror',()=>{if(!state.tilesReady)set('map-status','The map background isn’t loading. You can still follow the official links beside it.');});
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
  const message=document.createElement('p');message.textContent='Published Coast Guard area; not confirmed active. This is not a nautical chart or a complete map of Navy hazards.';
  popup.append(strong,message);const anchor=external(d.maritimeRule.source,'Read governing rule');if(anchor)popup.append(anchor);
  state.polygon.bindPopup(popup);if(state.ruleShown)state.polygon.addTo(map);
  bounds.push(...coords);map.fitBounds(bounds,{padding:[24,24],maxZoom:11,animate:false});
 state.rocketPins=window.RocketMapPins?.mount(map,{
   region:'hawaii',centers:{hawaii:{lat:22.02,lon:-159.78}},
   onSelect:id=>{void loadMission(id);}
 });
 state.rocketPins?.update(state.data?.regions?.find(r=>r.id==='hawaii')?.launches||[],
   state.data?.selectedLaunchId);
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
  set('map-status','The map isn’t loading, but the Navy beach rules, DLNR park notice and Coast Guard regulation are still linked here.');
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
void enableRustAccess();
})();
