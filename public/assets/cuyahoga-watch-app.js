/* Live-first Cuyahoga shore watch. Shared AIS positions, no synthetic tracks. */
(function(){
 'use strict';
 const core=window.CuyahogaWatchCore;
 const $=id=>document.getElementById(id);
 if(!core){$('vessel-status').textContent='Interactive data is unavailable. Use the official source links below.';return;}
 const state={parks:null,bridges:null,bridgeNotices:null,live:null,selectedParkId:null,selectedBridgeId:null,map:null,selectedShip:null};
 const mapGroup={parks:null,bridges:null,ships:null};
 const featuredBridgeIds=new Set(['center-st-139','columbus-193','carter-243','west-third-369','eagle-280']);
 const locClock=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
 const escText=(tag,text,className)=>{const e=document.createElement(tag);e.textContent=String(text??'');if(className)e.className=className;return e};
 const el=(tag,attrs={})=>{const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e};
 function replaceFocus(kicker,title,description,actions=[],note=''){
  const panel=$('river-focus');
  panel.replaceChildren(escText('p',kicker,'eyebrow'),escText('h3',title),escText('p',description));
  if(actions.length){
   const row=escText('div','','detail-actions');
   for(const a of actions){const link=escText('a',a.label);link.href=a.url;link.target='_blank';link.rel='noopener noreferrer';row.append(link);}
   panel.append(row);
  }
  if(note)panel.append(escText('p',note,'detail-small'));
 }
 function mapPointIcon(kind,content){
  if(!window.L)return null;
  const classes={park:'pin-park',bridge:'pin-bridge',work:'pin-work'};
  return L.divIcon({className:'',html:'<div class="map-pin '+(classes[kind]||classes.bridge)+'" style="width:30px;height:30px">'+(kind==='park'?'&#10003;':kind==='work'?'!': '&#9646;')+'</div>',iconSize:[30,30],iconAnchor:[15,15]});
 }
 function initMap(){
  if(!window.L){
   $('cuyahoga-map').querySelector('.map-loading').textContent='Map unavailable. The four official park links and AIS status below still work.';
   return;
  }
  state.map=L.map('cuyahoga-map',{scrollWheelZoom:false,zoomControl:true,preferCanvas:true,worldCopyJump:false});
  state.map.setView([41.493,-81.698],14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(state.map);
  $('cuyahoga-map').querySelector('.map-loading')?.remove();
  for(const key of ['parks','bridges','ships'])mapGroup[key]=L.layerGroup().addTo(state.map);
  state.map.on('tileerror',function(){
   $('map-heading').title='Some map tiles are unavailable. Public parks and text links remain usable.';
  });
 }
 function plotParks(){
  if(!state.parks)return;
  for(const park of state.parks.spots){
   const btn=document.querySelector('[data-park="'+park.id+'"]');
   if(btn){
    btn.addEventListener('click',()=>choosePark(park.id,true));
    btn.title=park.suitability;
   }
   if(mapGroup.parks){
    const marker=L.marker([park.lat,park.lon],{title:park.name,alt:park.name+' approximate park area',icon:mapPointIcon('park')}).addTo(mapGroup.parks);
    marker.bindTooltip(park.name,{direction:'top'});
    marker.on('click',()=>choosePark(park.id,false));
   }
  }
 }
 function parkSignalLine(park){

  const observed=core.parkObservation(park,state.live,Date.now());
  if(observed.closest)return observed.closest.vessel.name+' · '+observed.closest.straightLineMiles.toFixed(1)+' mi direct';
  return observed.status==='NO_FRESH_REPORT_NEAR_REFERENCE'
    ?'No nearby fresh AIS report'
    :'AIS reports not yet available';
 }
 function renderParkSignals(){
  if(!state.parks)return;
  for(const park of state.parks.spots){
   const btn=document.querySelector('[data-park="'+park.id+'"]');
   if(!btn)continue;
   let signal=btn.querySelector('.park-signal');
   if(!signal){signal=escText('small','','park-signal');btn.append(signal);}
   signal.textContent=parkSignalLine(park);
  }
 }
 function choosePark(id,move){
  const park=state.parks?.spots.find(p=>p.id===id);
  if(!park)return;
  state.selectedParkId=id;state.selectedBridgeId=null;state.selectedShip=null;
  const chooser=$('bridge-select');if(chooser)chooser.value='';
  renderBridgeMarkers();
  for(const btn of document.querySelectorAll('[data-park]'))btn.setAttribute('aria-current',String(btn.dataset.park===id));
  const official=[
   {label:'Official park details ↗',url:park.officialUrl},
   {label:'Find the park on a map ↗',url:core.safeMapsQuery(park.name)}
  ];
  const note='Distances use the general park reference, not a surveyed viewing deck. They cannot establish line of sight, vessel arrival, or a safe entrance. Confirm current park access.';
  let description=park.experience,action=null;
     const observed=core.parkObservation(park,state.live,Date.now());
   if(observed.closest){
    const nearby=observed.closest;
    description+=' A fresh reported position for '+nearby.vessel.name+' is '+
      nearby.straightLineMiles.toFixed(2)+' straight-line miles from this approximate park location, '+
      'last observed '+locClock.format(new Date(nearby.vessel.seen))+
      '. '+(nearby.reportedMotion==='MOVING_AT_REPORTED_SPEED'?'Its AIS reports motion.':
        nearby.reportedMotion==='LOW_REPORTED_SPEED'?'Its last AIS speed was low.':'Its AIS speed was not reported.');
    action={label:'Inspect this reported vessel',callback:()=>selectShip(nearby.vessel)};
   }else description+=' '+observed.note;
  replaceFocus('PUBLIC SHORE WATCH / CLEVELAND METROPARKS',park.name,description,official,note);
  if(action){
   const button=escText('button',action.label,'focus-action');
   button.type='button';button.addEventListener('click',action.callback);
   $('river-focus').append(button);
  }
  if(move&&state.map)state.map.setView([park.lat,park.lon],15,{animate:false});
 }
 function clevelandCalendarDay(){
  const values=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date()).filter(p=>['year','month','day'].includes(p.type)).map(p=>[p.type,p.value]));
  return values.year+'-'+values.month+'-'+values.day;
 }
 function chooseBridge(bridgeId,move){
  const bridge=state.bridges?.bridges.find(x=>x.channel==='main'&&x.id===bridgeId);
  if(!bridge)return;
  state.selectedBridgeId=bridge.id;state.selectedParkId=null;state.selectedShip=null;
  for(const btn of document.querySelectorAll('[data-park]'))btn.setAttribute('aria-current','false');
  const selector=$('bridge-select');if(selector)selector.value=bridge.id;
  renderBridgeMarkers();
  const notice=core.bridgeNoticeContext(state.bridgeNotices,bridge.id,clevelandCalendarDay());
  const sourceConflict=state.bridges.knownConflicts?.find(c=>c.id===bridge.id);
  let context='The Coast Pilot identifies this '+bridge.structureType+
    ' crossing at river mile '+bridge.riverMile+'. This rounded point is not a measured bridge span.';
  if(bridge.structureType==='fixed')context+=' A fixed bridge does not lift for passing freighters.';
  else if(/permanently open/i.test(bridge.structureType))context+=' This draw is cataloged as permanently open, not an ordinary scheduled bridge opening.';
  else context+=' The NOAA Coast Pilot does not establish current bridge opening availability.';
  if(sourceConflict)context+=' Federal bridge regulations and the NOAA Coast Pilot disagree on its river-mile reference. Do not silently substitute one value.';
  const actions=[{label:'NOAA Coast Pilot ↗',url:state.bridges.sourceUrl}];
  if(notice){
    context+=' '+notice.message;
    actions.push({label:'Dated Coast Guard notice ↗',url:notice.sourceUrl});
    if(notice.projectUrl)actions.push({label:'Ohio DOT removal project ↗',url:notice.projectUrl});
  }
  replaceFocus(notice?'OFFICIAL NOTICE / NOT LIVE BRIDGE STATUS':'NOAA COAST PILOT / REFERENCE ONLY',bridge.name,
    context,actions,
    'No live drawbridge state or future vessel crossing time is verified. Check current Coast Guard notices and the bridge owner before planning a visit.');
  if(move&&state.map)state.map.setView([bridge.latitude,bridge.longitude],15,{animate:false});
 }
 function renderBridgeMarkers(){
  if(!state.bridges)return;
  const showAll=$('show-all-bridges')?.checked===true;
  const bridgePickerOpen=document.querySelector('.bridge-picker')?.open===true;
  for(const item of document.querySelectorAll('[data-bridge-legend]'))item.hidden=!bridgePickerOpen&&!state.selectedBridgeId;
  if(mapGroup.bridges)mapGroup.bridges.clearLayers();
  if(!bridgePickerOpen&&!state.selectedBridgeId){
   const status=$('bridge-layer-status');
   if(status)status.textContent='Bridge pins are hidden until you open the bridge explorer. Public viewing places and observed vessels remain visible.';
   return;
  }
  let visible=0;
  for(const bridge of state.bridges.bridges){
   if(bridge.channel!=='main')continue;
   if(!showAll&&!featuredBridgeIds.has(bridge.id)&&state.selectedBridgeId!==bridge.id)continue;
   visible++;
   if(!mapGroup.bridges)continue;
   const notice=core.bridgeNoticeContext(state.bridgeNotices,bridge.id,clevelandCalendarDay());
   const marker=L.marker([bridge.latitude,bridge.longitude],{
    title:bridge.name+(notice?' · published removal notice':''),
    alt:bridge.name+' NOAA approximate bridge reference',
    icon:mapPointIcon(notice?'work':'bridge')
   }).addTo(mapGroup.bridges);
   marker.bindTooltip(bridge.name+' · river mile '+bridge.riverMile+(notice?' · planned removal work':''));
   marker.on('click',()=>chooseBridge(bridge.id,false));
  }
  const status=$('bridge-layer-status');
  if(status)status.textContent=showAll?'Showing all '+visible+' NOAA main-channel references. Dated chart points are not live bridge status.':
    'Showing '+visible+' selected bridge landmarks. All 19 remain accessible through the selector.';
 }
 function plotBridges(){
  if(!state.bridges)return;
  const select=$('bridge-select');
  if(select)select.replaceChildren(new Option('Select a bridge',''));
  for(const bridge of state.bridges.bridges){
   if(bridge.channel!=='main')continue;
   if(select){
     const notice=core.bridgeNoticeContext(state.bridgeNotices,bridge.id,clevelandCalendarDay());
     const option=document.createElement('option');
     option.value=bridge.id;
     option.textContent=bridge.name+' · mile '+bridge.riverMile+(notice?' · Coast Guard work notice':'');
     select.append(option);
   }
  }
  renderBridgeMarkers();
 }
 function liveVesselIcon(v){
  const info=core.vesselVisual(v);
  const widths={large:70,medium:58,small:44,'not-reported':48};
  const width=widths[info.widthClass]||48;
  const deck={
   cargo:'<path d="M13 14V6H23V14M27 15h8m3 0h8m3 0h8" class="ship-deck"/>',
   tanker:'<path d="M14 14V6H24V14M29 11h27M32 9v6m10-6v6m10-6v6" class="ship-deck"/>',
   tug:'<path d="M19 16V6H39L45 16M27 6V2H32V6" class="ship-deck"/>',
   passenger:'<path d="M12 15V7H56L62 15M17 10h4m5 0h4m5 0h4m5 0h4" class="ship-deck"/>',
   unknown:'<path d="M17 15V9H32V15M35 13h12" class="ship-deck"/>'
  }[info.kind];
  // Default bow points right (east), so reported COG 90° is zero rotation.
  // Vessel shapes and length bands are illustrative, not precise hull drawings.
  const course=info.reportedCourseDegrees;
  const rotate=course===null?'':(' style="transform:rotate('+(course-90).toFixed(1)+'deg)"');
  const html='<span class="cuyahoga-ship-marker pin-vessel cuyahoga-ship-'+info.kind+' cuyahoga-ship-'+info.widthClass+
    '"><svg viewBox="0 0 72 30" aria-hidden="true" focusable="false"'+rotate+
    '><path d="M3 17H59L69 12L66 20L59 24H13Z" class="ship-hull"/>'+
    deck+'</svg></span>';
  return L.divIcon({className:'cuyahoga-vessel-icon',html,iconSize:[width,38],iconAnchor:[width/2,19]});
 }
 function speedCopy(v){
  return v.speedKnots===null?'Speed not reported':v.speedKnots.toFixed(1)+' kn reported';
 }
 function selectShip(v){
  state.selectedShip=String(v.mmsi);
  const visual=core.vesselVisual(v);
  replaceFocus('LATEST RECEIVED AIS / OBSERVATION',v.name,
   'AIS position reported '+locClock.format(new Date(v.seen))+'. '+speedCopy(v)+'. '+visual.label+' (AIS type, if reported). '+
   (visual.reportedLengthMeters===null?'Length not reported.':'Reported length '+Math.round(visual.reportedLengthMeters*3.28084)+' feet. ')+
   (visual.reportedCourseDegrees===null?'Course over ground unavailable.':'Reported course over ground '+Math.round(visual.reportedCourseDegrees)+' degrees. ')+
   'The ship symbol is illustrative; this is not a bridge arrival estimate.',
   [{label:'Open the full ship tracker ↗',url:'/great-lakes-freighter-tracking/'}],
   'MMSI '+v.mmsi+' · '+v.source+' · coordinates '+v.lat.toFixed(4)+', '+v.lon.toFixed(4)+'. Do not navigate by a public AIS map.');
  if(state.map)state.map.setView([v.lat,v.lon],15,{animate:false});
 }
 function renderLive(){
  const status=$('vessel-status'),list=$('live-vessels'),readout=$('live-readout'),age=$('source-age');
  list.replaceChildren();
  const result=state.live;
  if(!result){
   status.textContent='No live source has been loaded yet.';
   readout.textContent='Live AIS status unavailable';
   return;
  }
  age.textContent=result.checkedAt?'Feed checked '+locClock.format(new Date(result.checkedAt)):'Source check not available';
  const credits=$('ais-source-credits');
  if(credits){
   credits.replaceChildren();
   if(result.attributions?.length)credits.append(escText('span','AIS upstream source credits: '+result.attributions.map(a=>a.credit).join(' · ')));
   else credits.append(escText('span','Source-by-source AIS credit not returned in the current response.'));
   const link=escText('a','Open Waters licensing and attribution ↗');
   link.href='https://openwaters.io/ais/';link.target='_blank';link.rel='noopener noreferrer';
   credits.append(document.createTextNode(' · '),link);
  }
  if(result.state==='REPORTS_AVAILABLE'){
   readout.textContent=result.count+' recent AIS '+(result.count===1?'position':'positions')+' in the greater Cleveland riverfront area';
   status.textContent=result.reason;
  }else{
   readout.textContent=result.state==='UNAVAILABLE'?'AIS reporting unavailable':'No fresh AIS positions in this map area';
   status.textContent=result.reason;
  }
  if(mapGroup.ships)mapGroup.ships.clearLayers();
  if(!result.vessels.length){
   list.append(escText('li',result.reason));
   renderParkSignals();
   if(state.selectedParkId)choosePark(state.selectedParkId,false);
   return;
  }
  for(const v of result.vessels){
   const item=escText('li',''),btn=escText('button','');
   btn.type='button';
   btn.append(escText('strong',v.name),escText('small',core.vesselVisual(v).label+' · '+speedCopy(v)+' · '+locClock.format(new Date(v.seen))));
   btn.addEventListener('click',()=>selectShip(v));item.append(btn);list.append(item);
   if(mapGroup.ships){
    const marker=L.marker([v.lat,v.lon],{title:v.name,alt:v.name+' recent AIS report',icon:liveVesselIcon(v),zIndexOffset:1000}).addTo(mapGroup.ships);
    marker.bindTooltip(v.name);
    marker.on('click',()=>selectShip(v));
   }
  }
  renderParkSignals();
  if(state.selectedParkId)choosePark(state.selectedParkId,false);
 }
 async function getLive(){
  const refresh=$('refresh-ais');refresh.disabled=true;
  try{
   const response=await fetch('/api/freighter-ais',{cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('AIS HTTP failure');
   const data=await response.json();
   state.live=core.classifyLive(data,Date.now());
  }catch(_){
   state.live=core.classifyLive(null,Date.now());
  }finally{
   refresh.disabled=false;
   renderLive();
  }
 }
 async function loadReferenceData(){
  const safeGet=async url=>{const r=await fetch(url,{cache:'force-cache',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('No public resource');return r.json()};
  const results=await Promise.allSettled([
    safeGet('/cuyahoga-freighter-watch/viewpoints.json'),
    safeGet('/cuyahoga-freighter-watch/bridges.json'),
    safeGet('/cuyahoga-freighter-watch/bridge-notices.json')]);
  const parks=results[0].status==='fulfilled'?results[0].value:null;
  if(core.validCatalog(parks)){state.parks=parks;plotParks();renderParkSignals();choosePark('scranton',false);}
  else replaceFocus('PARK SOURCE UNAVAILABLE','Check Cleveland Metroparks','The park directory could not be verified. Use the official park manager links in the text below.');
  const notices=results[2].status==='fulfilled'?results[2].value:null;
  if(notices?.schemaVersion===1&&Array.isArray(notices.notices))state.bridgeNotices=notices;
  const bridges=results[1].status==='fulfilled'?results[1].value:null;
  if(bridges?.schemaVersion===1&&Array.isArray(bridges.bridges)){state.bridges=bridges;plotBridges();}

 }
 function wire(){

  $('refresh-ais').addEventListener('click',getLive);
  $('bridge-select').addEventListener('change',e=>{if(e.target.value)chooseBridge(e.target.value,true);});
  $('show-all-bridges').addEventListener('change',renderBridgeMarkers);
  document.querySelector('.bridge-picker')?.addEventListener('toggle',renderBridgeMarkers);

 }
 initMap();wire();loadReferenceData();getLive();
})();
