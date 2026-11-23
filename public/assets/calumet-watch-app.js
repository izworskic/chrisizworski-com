/* Calumet industrial river desk: reuses existing same-site AIS source, never predicts crossings. */
(function(){
'use strict';
const core=window.CalumetWatchCore,links=window.VisitorMapLinks,shipUI=window.RiverWatchVesselUI,Icons=window.SeawayVesselIcons;
const $=id=>document.getElementById(id);
const state={guide:null,map:null,live:null,selected:null,places:null,bridges:null,railBridges:null,ships:null,shipKindFilter:'all'};
let vesselPopup=null;
const placeMarkers=new Map();
const timeFmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
const node=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=String(text??'');if(cls)e.className=cls;return e;};
const ext=(label,url)=>{const a=node('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
// The Calumet uses Cuyahoga's map vocabulary: pictured public places,
// a different icon for each bridge type, and one readable source-backed popup.
function placeMapsUrl(p){
 return links?.placeSearch({role:'public-place',query:p.mapsQuery})||
  'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.mapsQuery);
}
function popupActionRow(actions){
 const row=node('div','','park-popup-actions');
 for(const a of actions)if(a.url)row.append(ext(a.label,a.url));
 return row;
}
function placePopupContent(p){
 const wrap=node('div','','park-popup-content calumet-place-popup');
 wrap.append(node('strong',p.name,'park-popup-title'),
  node('p',p.visit,'park-popup-description'));
 wrap.append(popupActionRow([{label:'Google Maps ↗',url:placeMapsUrl(p)},
  {label:'Official / documented place details ↗',url:p.sourceUrl}]));
 wrap.append(node('small',p.accessClass==='PUBLIC_SIDEWALK_AREA_VERIFY_ACCESS'?
  'Approximate bridge reference, not a verified sidewalk standing spot, parking entrance or open crossing. Confirm public access before visiting.':
  'General public park area, not a verified view of ships or an entrance. Check current park access and sightlines.',
  'park-popup-note'));
 return wrap;
}
function bridgePopupContent(b){
 const wrap=node('div','','park-popup-content calumet-bridge-popup');
 wrap.append(node('strong',b.name,'park-popup-title'));
 wrap.append(node('p',b.type+' · published river mile '+b.riverMile,'calumet-popup-meta'));
 wrap.append(node('p',b.summary,'park-popup-description'));
 wrap.append(popupActionRow([{label:'NOAA bridge reference ↗',url:b.sourceUrl},
  {label:'Coast Guard notices ↗',url:'https://www.navcen.uscg.gov/local-notices-to-mariners-by-cg-district'}]));
 wrap.append(node('small','Rounded NOAA chart location only; not a live bridge opening, public viewpoint, or place to park. Stay out of restricted terminals and rail areas.','park-popup-note'));
 return wrap;
}
function vesselType(v){
 return Icons?.KINDS?.find(k=>k.kind===Icons.classify(v))?.label||
  shipUI?.typeName(shipUI.kindOf(v))||'Unknown vessel type';
}
function shipPopupContent(v){
 const wrap=node('div','','park-popup-content calumet-vessel-popup');
 wrap.append(node('strong',v.name||'Vessel '+v.mmsi,'park-popup-title'));
 wrap.append(node('p','Reported AIS type: '+vesselType(v),'calumet-popup-meta'));
 if(Number.isFinite(v.lengthMeters))wrap.append(node('p','Reported length: '+Math.round(v.lengthMeters*3.28084)+' ft','calumet-popup-meta'));
 wrap.append(node('p',(v.speedKnots===null?'Speed not reported':v.speedKnots.toFixed(1)+' knots reported')+
  ' · '+timeFmt.format(new Date(v.seen)),'calumet-popup-meta'));
 wrap.append(node('p','MMSI '+v.mmsi+' · '+v.source,'calumet-popup-meta'));
 const motion=shipUI?.bearing(v);
 if(motion!==null&&motion!==undefined)wrap.append(node('p','Reported travel course: '+Math.round(motion)+'°','calumet-popup-meta'));
 else if(Number.isFinite(v.heading))wrap.append(node('p','Reported true heading: '+Math.round(v.heading)+'°','calumet-popup-meta'));
 wrap.append(node('p','Last position: '+v.lat.toFixed(4)+', '+v.lon.toFixed(4),'calumet-popup-meta'));
 wrap.append(popupActionRow([{label:'Full ship tracker ↗',url:'/great-lakes-freighter-tracking/'}]));
 wrap.append(node('small','Fresh AIS position, not a ship sighting or future arrival. The icon is an illustration of the reported vessel class and length band.','park-popup-note'));
 return wrap;
}
function openShipPopup(marker,v){
 if(!state.map||!marker)return;
 if(!vesselPopup)vesselPopup=L.popup({autoClose:true,closeOnClick:true,maxWidth:305});
 const anchor=marker.options.icon?.options?.popupAnchor||[0,-10];
 vesselPopup.options.offset=L.point(anchor[0],anchor[1]);
 vesselPopup.setLatLng(marker.getLatLng()).setContent(shipPopupContent(v)).openOn(state.map);
}
function findShipMarker(mmsi){
 let found=null;
 state.ships?.eachLayer(m=>{if(m.options.shipMmsi===String(mmsi))found=m;});
 return found;
}
function placePin(p,offset=false){
 const id=p.id==='calumetpark'?'calumetpark':'bridge95';
 const html='<span class="calumet-place-pin calumet-place-pin--'+id+(offset?' is-offset':'')+'" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><use href="#cal-place-'+id+'"></use></svg></span>';
 return L.divIcon({className:'calumet-viewpoint-icon',html,iconSize:[36,40],iconAnchor:[18,offset?77:37],popupAnchor:[0,offset?-85:-34]});
}
function bridgePin(b){
 const kind=b.group==='rail'?'rail':'road';
 const html='<span class="calumet-bridge-pin calumet-bridge-pin--'+kind+'" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><use href="#cal-bridge-'+kind+'"></use></svg></span>';
 return L.divIcon({className:'calumet-bridge-icon',html,iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-21]});
}
function detail(label,name,body,actions=[],note=''){
 const box=$('selection');box.replaceChildren(node('p',label,'selection-kicker'),node('h3',name),node('p',body));
 if(actions.length){const links=node('div','','detail-links');for(const a of actions)if(a.url)links.append(ext(a.label,a.url));box.append(links);}
 if(note)box.append(node('p',note,'access-note'));
}
function focus(lat,lon,zoom=15){if(state.map)state.map.setView([lat,lon],zoom,{animate:false});}
// Match the Cuyahoga river desk: visitors can frame reported vessels or
// confirmed public-place *areas* independently. No estimated approaches.
function visibleShips(){
 return state.live?.state==='REPORTS_AVAILABLE'?(state.live.vessels||[]).filter(v=>!shipUI||shipUI.match(v,state.shipKindFilter)):[];
}
function updateMapViewControls(){
 const ships=visibleShips(),places=state.guide?.viewpoints||[];
 const shipsButton=$('calumet-show-ships'),placesButton=$('calumet-show-places');
 if(shipsButton){
  shipsButton.disabled=!state.map||!ships.length;
  shipsButton.textContent='Show '+ships.length+(ships.length===1?' ship':' ships');
 }
 if(placesButton)placesButton.disabled=!state.map||!places.length;
}
function frameMap(mode='all'){
 if(!state.map)return;
 const places=(state.guide?.viewpoints||[]).map(p=>[p.lat,p.lon]);
 const ships=visibleShips().map(v=>[v.lat,v.lon]);
 const points=mode==='places'?places:mode==='ships'?ships:[...places,...ships];
 if(!points.length)return;
 if(points.length===1)state.map.setView(points[0],14,{animate:false});
 else state.map.fitBounds(points,{padding:[35,35],maxZoom:13,animate:false});
}
function pin(kind,glyph){
 return L.divIcon({className:'',html:'<span class="cw-pin '+kind+'">'+glyph+'</span>',iconSize:[31,31],iconAnchor:[15,15]});
}
function boatPin(v){
 // Same Soo Locks vessel SVG factory, length bands and selected state as Cuyahoga.
 // The ship remains upright; any real course/heading belongs in the detail popup.
 if(Icons){
  const glyph=Icons.icon(v,{zoom:state.map?.getZoom()||13,
   selected:state.selected?.kind==='ship'&&state.selected.id===String(v.mmsi)});
  return L.divIcon({className:glyph.className+' soo-ais-symbol calumet-vessel-icon calumet-ship-'+glyph.kind,
   html:glyph.html,iconSize:glyph.size,iconAnchor:[glyph.size[0]/2,glyph.size[1]/2],
   popupAnchor:[0,-glyph.size[1]/2]});
 }
 if(!shipUI)return pin('ship','▲');
 const glyph=shipUI.marker(v,{zoom:state.map?.getZoom()||13});
 return L.divIcon({className:glyph.className,html:glyph.html,iconSize:glyph.size,
  iconAnchor:[glyph.size[0]/2,glyph.size[1]/2],popupAnchor:[0,-glyph.size[1]/2]});
}
function syncShipHighlight(){
 for(const btn of document.querySelectorAll('#reported-ships [data-ship]')){
  btn.setAttribute('aria-current',String(state.selected?.kind==='ship'&&btn.dataset.ship===state.selected.id));
 }
 state.ships?.eachLayer(marker=>{
  const selected=marker.options.shipMmsi===state.selected?.id&&state.selected?.kind==='ship';
  if(Icons&&marker.options.shipReport){
   const cls=marker.options.icon?.options?.className||'';
   if(cls.includes('is-selected')!==selected)marker.setIcon(boatPin(marker.options.shipReport));
  }
  marker.getElement()?.classList.toggle('is-active-vessel',selected);
  marker.getElement()?.setAttribute('aria-label',marker.options.shipReport?.name||'Reported vessel');
 });
}
function refreshShipIconSize(){
 if(!shipUI||!state.ships)return;
 state.ships.eachLayer(marker=>{if(marker.options.shipReport)marker.setIcon(boatPin(marker.options.shipReport));});
 syncShipHighlight();
 separatePlaceAndShipPins();
}
function separatePlaceAndShipPins(){
 if(!state.map||!state.guide)return;
 for(const p of state.guide.viewpoints){
  const marker=placeMarkers.get(p.id);if(!marker)continue;
  const point=state.map.latLngToLayerPoint([p.lat,p.lon]);
  const overlaps=visibleShips().some(v=>{
   const shipPoint=state.map.latLngToLayerPoint([v.lat,v.lon]);
   return Math.abs(point.x-shipPoint.x)<54&&Math.abs(point.y-shipPoint.y)<38;
  });
  if(marker.options.placeOffset!==overlaps){
   marker.options.placeOffset=overlaps;
   marker.setIcon(placePin(p,overlaps));
  }
 }
}
function initMap(){
 if(!window.L){$('calumet-map').querySelector('.map-loading').textContent='Map service unavailable. Use the official public-place links and ship reports.';return;}
 try{
  state.map=L.map('calumet-map',{zoomControl:true,scrollWheelZoom:false,worldCopyJump:false,preferCanvas:true});
  state.map.setView([41.719,-87.546],13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(state.map);
  state.places=L.layerGroup().addTo(state.map);state.bridges=L.layerGroup().addTo(state.map);state.railBridges=L.layerGroup();state.ships=L.layerGroup().addTo(state.map);
  $('calumet-map').querySelector('.map-loading')?.remove();
  state.map.on('tileerror',()=>{$('calumet-map').title='Some map tiles failed; public-place links remain available.';});
  state.map.on('zoomend',refreshShipIconSize);
 }catch(_){state.map=null;$('calumet-map').textContent='Map unavailable. See public places, AIS reports and bridge information alongside.';}
}
function pressPlace(id){for(const b of document.querySelectorAll('[data-place]'))b.setAttribute('aria-pressed',String(b.dataset.place===id));}
function choosePlace(id,pan=true){
 const p=state.guide?.viewpoints.find(x=>x.id===id);if(!p)return;
 state.map?.closePopup();
 state.selected={kind:'place',id};pressPlace(id);syncShipHighlight();
 const signal=core.nearPlace(p,state.live);
 const description=signal.closest?' A fresh AIS fix is '+signal.closest.distanceMiles.toFixed(1)+' straight-line miles from this approximate area. This does not establish visibility or direction of travel.':
  state.live?.state==='NO_FRESH_LOCAL_REPORTS'?' No fresh local AIS reports are available, which does not establish an empty river.':
  ' A nearby fresh AIS position has not been established.';
 const mapUrl=placeMapsUrl(p);
 detail(p.accessClass==='PUBLIC_SIDEWALK_AREA_VERIFY_ACCESS'?'PUBLIC SIDEWALK AREA / VERIFY ACCESS':'PUBLIC PARK / SIGHTLINE UNVERIFIED',
  p.name,p.visit+description,
  [{label:'Source and visitor information ↗',url:p.sourceUrl},{label:'View area in Google Maps ↗',url:mapUrl}],p.coordinateNote);
 if(pan)focus(p.lat,p.lon,14);
}
function chooseBridge(id,pan=true){
 const b=state.guide?.bridges.find(x=>x.id===id);if(!b)return;
 state.map?.closePopup();
 state.selected={kind:'bridge',id};pressPlace(null);$('bridge-select').value=id;syncShipHighlight();
 if(b.group==='rail'&&state.railBridges&&state.map){$('rail-layer').checked=true;state.railBridges.addTo(state.map);}
 detail('PUBLISHED BRIDGE REFERENCE / NOT LIVE STATUS',b.name,b.summary+' Published river mile '+b.riverMile+'. The marker does not establish when the crossing is opening.',
  [{label:'Bridge source ↗',url:b.sourceUrl},{label:'USCG navigation notices ↗',url:'https://www.navcen.uscg.gov/local-notices-to-mariners-by-cg-district'}],
  'Bridge pins are not parking or public viewing entrances. Never enter restricted terminal or railway areas.');
 $('bridge-caption').textContent=b.name+' · '+b.type+' · river mile '+b.riverMile+'. No live opening time is known.';
 if(pan)focus(b.lat,b.lon,15);
}
function chooseShip(mmsi,pan=true){
 const v=state.live?.vessels?.find(x=>x.mmsi===String(mmsi));if(!v)return;
 state.map?.closePopup();
 if(shipUI&&state.shipKindFilter!=='all'&&!shipUI.match(v,state.shipKindFilter)){
  state.shipKindFilter='all';showShips();
 }
 state.selected={kind:'ship',id:String(mmsi)};pressPlace(null);syncShipHighlight();
 const visual=core.vesselVisual(v),course=shipUI?.bearing(v);
 const motion=course!==null&&course!==undefined?'Reported travel course '+Math.round(course)+'°. ':
  Number.isFinite(v.heading)?'Reported true heading '+Math.round(v.heading)+'°. ':
  'Travel direction and bow heading not verified. ';
 detail('LATEST RECEIVED AIS / OBSERVATION',v.name,
  'AIS position reported '+timeFmt.format(new Date(v.seen))+'. '+
  (v.speedKnots===null?'Speed not reported.':'Reported speed '+v.speedKnots.toFixed(1)+' knots. ')+
  (shipUI?.typeName(shipUI.kindOf(v))||'Type unknown')+' (AIS type if reported). '+
  (visual.size==='not-reported'?'Length not reported.':'Reported length '+Math.round(v.lengthMeters*3.28084)+' feet. ')+
  motion+'The ship silhouette is illustrative; no future bridge crossing or arrival time is predicted.',
  [{label:'Open full ship tracker ↗',url:'/great-lakes-freighter-tracking/'}],
  'MMSI '+v.mmsi+' · '+v.source+' · coordinates '+v.lat.toFixed(4)+', '+v.lon.toFixed(4)+'. Do not navigate using public AIS.');
 if(pan&&state.map){
  focus(v.lat,v.lon,15);
  openShipPopup(findShipMarker(v.mmsi),v);
 }
}
function plotGuide(){
 if(!state.guide)return;
 state.places?.clearLayers();state.bridges?.clearLayers();state.railBridges?.clearLayers();placeMarkers.clear();
 for(const p of state.guide.viewpoints){
  if(!state.places)continue;
  const m=L.marker([p.lat,p.lon],{title:p.name+' · public area (verify access)',
   alt:p.name+' approximate public viewing area',placeId:p.id,placeOffset:false,icon:placePin(p),zIndexOffset:1000}).addTo(state.places);
  placeMarkers.set(p.id,m);
  m.bindPopup(placePopupContent(p),{maxWidth:295,autoPan:true,closeButton:true});
  m.on('click',()=>{choosePlace(p.id,false);m.openPopup();});
 }
 for(const b of state.guide.bridges){
  const layer=b.group==='rail'?state.railBridges:state.bridges;
  if(!layer)continue;
  const m=L.marker([b.lat,b.lon],{title:b.name+' · published bridge reference',
   alt:b.name+' NOAA rounded chart reference',bridgeId:b.id,icon:bridgePin(b)}).addTo(layer);
  m.bindPopup(bridgePopupContent(b),{maxWidth:290,autoPan:true,closeButton:true});
  m.on('click',()=>{chooseBridge(b.id,false);m.openPopup();});
 }
 const select=$('bridge-select');select.replaceChildren(node('option','Choose a bridge'));select.options[0].value='';
 for(const b of state.guide.bridges){const option=node('option',b.name+' · '+b.type+(b.group==='rail'?' / railroad':''));option.value=b.id;select.append(option);}
 for(const btn of document.querySelectorAll('[data-place]'))btn.addEventListener('click',()=>choosePlace(btn.dataset.place));
 choosePlace('bridge95',false);
 separatePlaceAndShipPins();
}
function showShips(){
 const r=state.live,list=$('reported-ships');list.replaceChildren();state.map?.closePopup();state.ships?.clearLayers();
 updateMapViewControls();
 const summary=shipUI?.summarize(r);
 if(!summary?.available||!summary.groups.some(g=>g.kind===state.shipKindFilter))state.shipKindFilter='all';
 shipUI?.renderTypeFilters($('calumet-type-counts'),r,state.shipKindFilter,kind=>{
   state.shipKindFilter=kind;
   if(state.selected?.kind==='ship'&&!shipUI.match(r?.vessels.find(v=>v.mmsi===state.selected.id),kind)){
     state.selected={kind:'place',id:'bridge95'};
   }
   showShips();
   $('calumet-type-counts')?.querySelector('[data-kind="'+kind+'"]')?.focus({preventScroll:true});
 });
 const reportedTotal=summary?.available?summary.total:(r?.vessels?.length||0);
 $('signal-text').textContent=r?.state==='REPORTS_AVAILABLE'?reportedTotal+' recently reported vessel'+(summary.total===1?'':'s')+' in the Calumet area':
  r?.state==='NO_FRESH_LOCAL_REPORTS'?'No fresh local ship reports':r?.state==='STALE'?'AIS report is stale':'AIS report unavailable';
 $('signal-age').textContent=r?.checkedAt?'Source checked '+timeFmt.format(new Date(r.checkedAt))+'. Individual positions also must be less than 30 minutes old.':
  'Missing source observations do not establish an empty waterway.';
 const visible=r?.state==='REPORTS_AVAILABLE'?r.vessels.filter(v=>!shipUI||shipUI.match(v,state.shipKindFilter)):[];
 $('report-message').textContent=(r?.reason||'The AIS source could not be checked.')+
  (state.shipKindFilter==='all'?'':' Showing '+visible.length+' of '+reportedTotal+' fresh reported vessels.');
 if(r?.state==='REPORTS_AVAILABLE'){
  for(const v of visible){
   const item=node('li',''),btn=node('button','');
   btn.type='button';btn.className='river-vessel-entry';btn.dataset.ship=String(v.mmsi);
   const kind=shipUI?.kindOf(v)||'unknown';
   if(shipUI){const glyph=node('span','','river-vessel-list-glyph type-'+kind);
     glyph.innerHTML=shipUI.glyphSvg(kind);glyph.setAttribute('aria-hidden','true');btn.append(glyph);}
   const info=node('span','','river-vessel-name');info.append(node('strong',v.name),
     node('small',(shipUI?.typeName(kind)||'Type unreported')+' · '+timeFmt.format(new Date(v.seen))+
     ' · '+(v.speedKnots===null?'speed unknown':v.speedKnots.toFixed(1)+' knots')+' · '+v.source));
   btn.append(info);btn.addEventListener('click',()=>chooseShip(v.mmsi));item.append(btn);list.append(item);
   if(state.ships){
    const m=L.marker([v.lat,v.lon],{title:v.name+' last AIS fix',alt:v.name+' reported '+(shipUI?.typeName(kind)||'vessel')+' position',
      shipMmsi:String(v.mmsi),shipReport:v,icon:boatPin(v),zIndexOffset:500}).addTo(state.ships);
    // Like Cuyahoga: one click-open popup. No competing hover tooltip.
    m.getElement()?.setAttribute('aria-label',v.name+' · '+vesselType(v));
    m.on('click',()=>{chooseShip(v.mmsi,false);openShipPopup(m,v);});
   }
  }
 }else list.append(node('li','Check the full Great Lakes ship tracker. No local report is not proof that the river is empty.'));
 const box=$('provider-credits');box.replaceChildren();
 if(r?.attributions?.length){box.append(node('strong','Upstream AIS credits: '));r.attributions.forEach((x,i)=>{if(i)box.append(document.createTextNode(' · '));box.append(document.createTextNode(x.source+': '+x.credit));});}
 else box.append(document.createTextNode('Upstream source credit was not supplied in this response. '),ext('Provider information ↗','https://openwaters.io/ais/'));
 if(state.selected?.kind==='place')choosePlace(state.selected.id,false);
 if(state.selected?.kind==='ship'){
  if(visible.some(v=>v.mmsi===state.selected.id))chooseShip(state.selected.id,false);
  else if(state.guide)choosePlace('bridge95',false);
 }
 syncShipHighlight();
 separatePlaceAndShipPins();
}
async function loadGuide(){
 try{
  const res=await fetch('/calumet-freighter-watch/guide.json',{cache:'force-cache',signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw Error('guide unavailable');
  const guide=await res.json();if(!core.validateGuide(guide))throw Error('guide invalid');
  state.guide=guide;plotGuide();updateMapViewControls();
 }catch(_){
  $('bridge-caption').textContent='Bridge catalog unavailable. Consult current Coast Guard notices.';
  detail('REFERENCE GUIDE UNAVAILABLE','Use official public-place sources','The map guide could not be verified. Static official links remain available on this page.',
    [{label:'95th bridge ship-watching article ↗',url:'https://www.chicagomag.com/city-life/the-best-place-in-the-city-to-watch-boats/'},{label:'Calumet Park manager ↗',url:'https://www.chicagoparkdistrict.com/parks-facilities/calumet-park'}]);
 }
}
async function loadShips(){
 const btn=$('refresh-ships');btn.disabled=true;
 try{const res=await fetch('/api/freighter-ais',{cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw Error('AIS unavailable');state.live=core.classifyLive(await res.json(),Date.now());
 }catch(_){state.live=core.classifyLive(null,Date.now());}
 finally{btn.disabled=false;showShips();}
}
function wireBridgeDemo(){
 const slider=$('bridge-angle'),out=$('angle-output'),note=$('demo-explanation');
 const update=()=>{
  const a=Number(slider.value);
  $('left-leaf').setAttribute('transform','rotate('+(-a)+' 154 135)');
  $('right-leaf').setAttribute('transform','rotate('+a+' 426 135)');
  out.value=a+'°';out.textContent=a+'°';
  note.textContent=a===0?'Roadway leaves shown closed. An actual lift is controlled by bridge operators.':
   'Illustrated leaves opened '+a+'°. Real bridges differ in geometry and operating sequence.';
 };
 slider.addEventListener('input',update);$('bridge-reset').addEventListener('click',()=>{slider.value='0';update();slider.focus();});update();
}
if(!core){$('report-message').textContent='Interactive rules unavailable. Use the official source links.';return;}
initMap();wireBridgeDemo();
$('refresh-ships').addEventListener('click',loadShips);
$('calumet-show-ships').addEventListener('click',()=>frameMap('ships'));
$('calumet-show-places').addEventListener('click',()=>frameMap('places'));
$('bridge-select').addEventListener('change',e=>{if(e.target.value)chooseBridge(e.target.value);});
$('rail-layer').addEventListener('change',e=>{if(!state.map||!state.railBridges)return;
 if(e.target.checked)state.railBridges.addTo(state.map);else state.map.removeLayer(state.railBridges);
});
Promise.allSettled([loadGuide(),loadShips()]).then(()=>frameMap('all'));
})();