/* Live-first Cuyahoga shore watch. Shared AIS positions, no synthetic tracks. */
(function(){
 'use strict';
 const core=window.CuyahogaWatchCore,shipUI=window.RiverWatchVesselUI,Icons=window.SeawayVesselIcons;
 const $=id=>document.getElementById(id);
 if(!core){$('vessel-status').textContent='Interactive data is unavailable. Use the official source links below.';return;}
 const state={parks:null,bridges:null,bridgeNotices:null,live:null,selectedParkId:null,selectedBridgeId:null,map:null,selectedShip:null,shipKindFilter:'all'};
 const mapGroup={parks:null,bridges:null,ships:null};
 let vesselPopup=null;
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
 function revealMobileFocus(){
  if(window.matchMedia('(max-width:830px)').matches) $('river-focus').scrollIntoView({block:'start',behavior:'auto'});
 }
 function mapPointIcon(kind){
  if(!window.L)return null;
  const classes={park:'pin-park',bridge:'pin-bridge',work:'pin-work'};
  const width=kind==='park'?18:30,glyph=kind==='park'?'':kind==='work'?'!':'&#9646;';
  return L.divIcon({className:'',html:'<div class="map-pin '+(classes[kind]||classes.bridge)+'" style="width:'+width+'px;height:'+width+'px">'+glyph+'</div>',iconSize:[width,width],iconAnchor:[width/2,width/2]});
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
  state.map.on('zoomend',()=>{if(shipUI)mapGroup.ships?.eachLayer(m=>{if(m.options.shipReport)m.setIcon(liveVesselIcon(m.options.shipReport));});syncShipSelection();});
 }
 function plotParks(){
  if(!state.parks)return;
  // Fit all four sourced park-area references on the initial phone map.
  // A center chosen for desktop clipped Wendy Park at narrow widths.
  if(state.map&&state.parks.spots.length){
   state.map.fitBounds(state.parks.spots.map(p=>[p.lat,p.lon]),{
    paddingTopLeft:[44,52],paddingBottomRight:[44,46],maxZoom:14,animate:false
   });
  }
  for(const park of state.parks.spots){
   const btn=document.querySelector('[data-park="'+park.id+'"]');
   if(btn){
    btn.addEventListener('click',()=>{choosePark(park.id,true);revealMobileFocus();});
    btn.title=park.suitability;
   }
   if(mapGroup.parks){
    const marker=L.marker([park.lat,park.lon],{title:park.name,alt:park.name+' approximate park area',icon:mapPointIcon('park')}).addTo(mapGroup.parks);
    marker.bindTooltip(park.name,{direction:'top'});
    marker.on('click',()=>{choosePark(park.id,false);revealMobileFocus();});
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
  if(vesselPopup&&state.map?.hasLayer(vesselPopup))state.map.removeLayer(vesselPopup);
  const park=state.parks?.spots.find(p=>p.id===id);
  if(!park)return;
  state.selectedParkId=id;state.selectedBridgeId=null;state.selectedShip=null;
  syncShipSelection();
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
  if(vesselPopup&&state.map?.hasLayer(vesselPopup))state.map.removeLayer(vesselPopup);
  const bridge=state.bridges?.bridges.find(x=>x.channel==='main'&&x.id===bridgeId);
  if(!bridge)return;
  state.selectedBridgeId=bridge.id;state.selectedParkId=null;state.selectedShip=null;
  syncShipSelection();
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
   marker.on('click',()=>{chooseBridge(bridge.id,false);revealMobileFocus();});
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

 // Overhead silhouettes. AIS course over ground describes travel direction, not bow heading.
 // Without both usable movement and COG we draw a neutral position dot.
 function markerHasTravelCourse(v){
  return typeof v.speedKnots==='number'&&v.speedKnots>0.5&&
   core.vesselVisual(v).reportedCourseDegrees!==null;
 }
 // Travel course only indicates motion; true heading can orient a docked hull.
 // Without either, draw a symmetrical recognizable ship without an inferred bow.
 function markerBearing(v){
  const visual=core.vesselVisual(v);
  if(markerHasTravelCourse(v))return {degrees:visual.reportedCourseDegrees,basis:'course over ground'};
  if(visual.reportedHeadingDegrees!==null)return {degrees:visual.reportedHeadingDegrees,basis:'true heading'};
  return null;
 }
 function liveVesselIcon(v){
  // Exactly the Soo Locks SVG factory and sizes. No additional course badges.
  if(Icons){
   const g=Icons.icon(v,{zoom:state.map?.getZoom()||13,selected:state.selectedShip===String(v.mmsi)});
   return L.divIcon({className:g.className+' soo-ais-symbol cuyahoga-vessel-icon cuyahoga-ship-'+g.kind,html:g.html,iconSize:g.size,iconAnchor:[g.size[0]/2,g.size[1]/2],popupAnchor:[0,-g.size[1]/2]});
  }
  return L.divIcon({className:'cuyahoga-vessel-icon',html:'<span class="map-pin pin-vessel" style="width:18px;height:18px"></span>',iconSize:[18,18],iconAnchor:[9,9]});
 }
 // A single shared popup, like Soo Locks. Source strings are always DOM text.
 function openShipPopup(marker,v){
  if(!state.map||!marker)return;
  const content=escText('div','');
  content.append(escText('strong',v.name||'Vessel '+v.mmsi));
  const type=Icons?.KINDS?.find(k=>k.kind===Icons.classify(v))?.label||'Unknown vessel type';
  content.append(escText('p','Reported AIS type: '+type));
  if(Number.isFinite(v.lengthMeters))content.append(escText('p','Reported length: '+Math.round(v.lengthMeters*3.28084)+' ft'));
  content.append(escText('p',speedCopy(v)+' · reported '+locClock.format(new Date(v.seen))));
  content.append(escText('p','MMSI '+v.mmsi+' · '+v.source));
  if(Number.isFinite(v.course))content.append(escText('p','Reported travel course: '+Math.round(v.course)+'°'));
  if(!vesselPopup)vesselPopup=L.popup({autoClose:true,closeOnClick:true});
  const anchor=marker.options.icon?.options?.popupAnchor||[0,-8];
  vesselPopup.options.offset=L.point(anchor[0],anchor[1]);
  vesselPopup.setLatLng(marker.getLatLng()).setContent(content).openOn(state.map);
 }
 function findShipMarker(v){
  let found=null;
  mapGroup.ships?.eachLayer(marker=>{if(marker.options.shipMmsi===String(v.mmsi))found=marker;});
  return found;
 }
 function frameMap(mode='all'){
  if(!state.map)return;
  const parks=(state.parks?.spots||[]).map(p=>[p.lat,p.lon]);
  const ships=(state.live?.vessels||[]).filter(v=>!shipUI||shipUI.match(v,state.shipKindFilter)).map(v=>[v.lat,v.lon]);
  const points=mode==='parks'?parks:mode==='ships'?ships:[...parks,...ships];
  if(!points.length)return;
  if(points.length===1)state.map.setView(points[0],14,{animate:false});
  else state.map.fitBounds(points,{paddingTopLeft:[52,54],paddingBottomRight:[52,54],maxZoom:14,animate:false});
 }
 function syncShipSelection(){
  for(const btn of document.querySelectorAll('[data-ship]')){
   btn.setAttribute('aria-current',String(btn.dataset.ship===state.selectedShip));
  }
  if(mapGroup.ships)mapGroup.ships.eachLayer(marker=>{
   const selected=marker.options.shipMmsi===state.selectedShip;
   if(Icons&&marker.options.shipReport){const current=marker.options.icon?.options?.className||'';if(current.includes('is-selected')!==selected)marker.setIcon(liveVesselIcon(marker.options.shipReport));}
   marker.getElement()?.classList.toggle('is-active-vessel',selected);
   if(marker.getElement()&&marker.options.shipReport)marker.getElement().setAttribute('aria-label',marker.options.shipReport.name);
  });
 }
 function speedCopy(v){
  return v.speedKnots===null?'Speed not reported':v.speedKnots.toFixed(1)+' kn reported';
 }
 function selectShip(v,move=true){
  if(shipUI&&state.shipKindFilter!=='all'&&!shipUI.match(v,state.shipKindFilter)){state.shipKindFilter='all';renderLive();}
  state.selectedParkId=null;state.selectedBridgeId=null;
  for(const btn of document.querySelectorAll('[data-park]'))btn.setAttribute('aria-current','false');
  state.selectedShip=String(v.mmsi);
  syncShipSelection();
  const visual=core.vesselVisual(v);
  const bearing=markerBearing(v);
  replaceFocus('LATEST RECEIVED AIS / OBSERVATION',v.name,
   'AIS position reported '+locClock.format(new Date(v.seen))+'. '+speedCopy(v)+'. '+(shipUI?.typeName(shipUI.kindOf(v))||visual.label)+' (AIS type, if reported). '+
   (visual.reportedLengthMeters===null?'Length not reported.':'Reported length '+Math.round(visual.reportedLengthMeters*3.28084)+' feet. ')+
   (bearing?(bearing.basis==='course over ground'?'Reported travel course ':'Reported bow heading ')+Math.round(bearing.degrees)+' degrees ('+bearing.basis+'). ':
    'This illustrative side-profile ship does not establish a bow direction. ')+
   'The ship symbol is illustrative; this is not a bridge arrival estimate.',
   [{label:'Open the full ship tracker ↗',url:'/great-lakes-freighter-tracking/'}],
   'MMSI '+v.mmsi+' · '+v.source+' · coordinates '+v.lat.toFixed(4)+', '+v.lon.toFixed(4)+'. Do not navigate by a public AIS map.');
  if(move&&state.map){state.map.setView([v.lat,v.lon],15,{animate:false});openShipPopup(findShipMarker(v),v);}
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
  const summary=shipUI?.summarize(result);
  if(!summary?.available||!summary.groups.some(g=>g.kind===state.shipKindFilter))state.shipKindFilter='all';
  shipUI?.renderTypeFilters($('cuyahoga-type-counts'),result,state.shipKindFilter,kind=>{
   state.shipKindFilter=kind;
   if(state.selectedShip&&!shipUI.match(result.vessels.find(v=>v.mmsi===state.selectedShip),kind)){state.selectedShip=null;if(state.parks)choosePark('scranton',false);}
   renderLive();$('cuyahoga-type-counts')?.querySelector('[data-kind="'+kind+'"]')?.focus({preventScroll:true});
  });
  const knownIds=new Set();
  const localUnique=result.vessels.filter(v=>{const id=String(v.mmsi);if(knownIds.has(id))return false;knownIds.add(id);return true;});
  const visible=localUnique.filter(v=>!shipUI||shipUI.match(v,state.shipKindFilter));
  if(result.state==='REPORTS_AVAILABLE'){
   const names=result.vessels.slice(0,2).map(v=>v.name).join(' · ');
   readout.textContent=result.count+' recent AIS '+(result.count===1?'report':'reports')+' · '+names+(result.count>2?' +'+(result.count-2):'');
   status.textContent=result.reason+(state.shipKindFilter==='all'?'':' Showing '+visible.length+' of '+(summary?.total??localUnique.length)+' reports.');
  }else{
   readout.textContent=result.state==='UNAVAILABLE'?'AIS reporting unavailable':'No fresh AIS positions in this map area';
   status.textContent=result.reason;
  }
  const showShips=$('show-ships-on-map');
  if(showShips){showShips.disabled=!visible.length;showShips.textContent='Show '+visible.length+(visible.length===1?' ship':' ships');}
  if(vesselPopup&&state.map?.hasLayer(vesselPopup))state.map.removeLayer(vesselPopup);
  if(mapGroup.ships)mapGroup.ships.clearLayers();
  if(state.selectedShip&&!result.vessels.some(v=>String(v.mmsi)===state.selectedShip)){
   state.selectedShip=null;
   if(!state.selectedParkId&&!state.selectedBridgeId)replaceFocus('RECENT AIS / REPORT EXPIRED',
    'That vessel is no longer in recent reports',
    'The previous AIS position no longer meets this tool’s freshness limit. Choose a public park or refresh the reports to plan a river watch.',
    [{label:'Check the full Great Lakes tracker ↗',url:'/great-lakes-freighter-tracking/'}]);
  }
  if(!visible.length){
   list.append(escText('li',result.vessels.length?'No vessels match this type filter.':result.reason));
   renderParkSignals();
   if(state.selectedParkId)choosePark(state.selectedParkId,false);
   return;
  }
  for(const v of visible){
   const item=escText('li',''),btn=escText('button','');
   btn.type='button';btn.dataset.ship=String(v.mmsi);btn.classList.add('river-vessel-entry');
   if(shipUI){const kind=shipUI.kindOf(v),glyph=escText('span','','river-vessel-list-glyph type-'+kind);glyph.innerHTML=shipUI.glyphSvg(kind);glyph.setAttribute('aria-hidden','true');btn.append(glyph);}
   const info=escText('span','','river-vessel-name');info.append(escText('strong',v.name),escText('small',(shipUI?.typeName(shipUI.kindOf(v))||core.vesselVisual(v).label)+' · '+speedCopy(v)+' · '+locClock.format(new Date(v.seen))));btn.append(info);
   btn.addEventListener('click',()=>{selectShip(v);$('cuyahoga-map').scrollIntoView({block:'center',behavior:'auto'});});item.append(btn);list.append(item);
   if(mapGroup.ships){
    const bearing=markerBearing(v);
    const marker=L.marker([v.lat,v.lon],{title:v.name,alt:v.name+' recent AIS report',shipMmsi:String(v.mmsi),shipReport:v,icon:liveVesselIcon(v),zIndexOffset:1000}).addTo(mapGroup.ships);
    // Soo Locks uses one popup, not a competing hover tooltip and scroll-away panel.
    marker.getElement()?.setAttribute('aria-label',v.name+' · '+(Icons?.KINDS?.find(k=>k.kind===Icons.classify(v))?.label||'Vessel'));
    marker.on('click',()=>{selectShip(v,false);openShipPopup(marker,v);});
   }
  }
  syncShipSelection();
  renderParkSignals();
  if(state.selectedParkId)choosePark(state.selectedParkId,false);
  else if(state.selectedShip){
   const selected=visible.find(v=>String(v.mmsi)===state.selectedShip);
   if(selected)selectShip(selected,false);
  }
 }
 async function getLive(){
  const refresh=$('refresh-ais');
  if(refresh.disabled)return;
  refresh.disabled=true;
  try{
   // Same bounded Open Waters AIS approach as Soo and Duluth; Cleveland query only.
   const response=await fetch('/api/freighter-ais?region=cuyahoga',{cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('AIS HTTP failure');
   const data=await response.json();
   if(data.scope!=='cuyahoga-regional-openwaters')throw Error('Incorrect AIS area');
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
  $('show-ships-on-map').addEventListener('click',()=>frameMap('ships'));
  $('show-parks-on-map').addEventListener('click',()=>frameMap('parks'));
  $('bridge-select').addEventListener('change',e=>{if(e.target.value){chooseBridge(e.target.value,true);revealMobileFocus();}});
  $('show-all-bridges').addEventListener('change',renderBridgeMarkers);
  document.querySelector('.bridge-picker')?.addEventListener('toggle',renderBridgeMarkers);

 }
 initMap();wire();Promise.allSettled([loadReferenceData(),getLive()]).then(()=>frameMap('all'));
 // Match Duluth and Soo Locks: refresh every minute only while a visitor is present.
 setInterval(()=>{if(!document.hidden)getLive();},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)getLive();});
})();
