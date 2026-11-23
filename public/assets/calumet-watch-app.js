/* Calumet industrial river desk: reuses existing same-site AIS source, never predicts crossings. */
(function(){
'use strict';
const core=window.CalumetWatchCore,links=window.VisitorMapLinks,shipUI=window.RiverWatchVesselUI;
const $=id=>document.getElementById(id);
const state={guide:null,map:null,live:null,selected:null,places:null,bridges:null,railBridges:null,ships:null,shipKindFilter:'all'};
const timeFmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
const node=(tag,text,cls)=>{const e=document.createElement(tag);e.textContent=String(text??'');if(cls)e.className=cls;return e;};
const ext=(label,url)=>{const a=node('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
function detail(label,name,body,actions=[],note=''){
 const box=$('selection');box.replaceChildren(node('p',label,'selection-kicker'),node('h3',name),node('p',body));
 if(actions.length){const links=node('div','','detail-links');for(const a of actions)if(a.url)links.append(ext(a.label,a.url));box.append(links);}
 if(note)box.append(node('p',note,'access-note'));
}
function focus(lat,lon,zoom=15){if(state.map)state.map.setView([lat,lon],zoom,{animate:false});}
function pin(kind,glyph){
 return L.divIcon({className:'',html:'<span class="cw-pin '+kind+'">'+glyph+'</span>',iconSize:[31,31],iconAnchor:[15,15]});
}
function boatPin(v){
 // Local ship profile is always upright, including for stopped/unknown course;
 // only the separate small compass pointer follows valid reported travel course.
 if(!shipUI)return pin('ship','▲');
 const glyph=shipUI.marker(v,{zoom:state.map?.getZoom()||13,selected:state.selected?.id===v.mmsi});
 return L.divIcon({className:glyph.className,html:glyph.html,iconSize:glyph.size,
   iconAnchor:[glyph.size[0]/2,glyph.size[1]/2]});
}
function syncShipHighlight(){
 state.ships?.eachLayer(marker=>marker.getElement()?.classList.toggle('is-active-vessel',
   marker.options.shipMmsi===state.selected?.id&&state.selected?.kind==='ship'));
}
function refreshShipIconSize(){
 if(!shipUI||!state.ships)return;
 state.ships.eachLayer(marker=>{if(marker.options.shipReport)marker.setIcon(boatPin(marker.options.shipReport));});
 syncShipHighlight();
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
 state.selected={kind:'place',id};pressPlace(id);syncShipHighlight();
 const signal=core.nearPlace(p,state.live);
 const description=signal.closest?' A fresh AIS fix is '+signal.closest.distanceMiles.toFixed(1)+' straight-line miles from this approximate area. This does not establish visibility or direction of travel.':
  state.live?.state==='NO_FRESH_LOCAL_REPORTS'?' No fresh local AIS reports are available, which does not establish an empty river.':
  ' A nearby fresh AIS position has not been established.';
 const mapUrl=links?.placeSearch({role:'public-place',query:p.mapsQuery})||
  'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.mapsQuery);
 detail(p.accessClass==='PUBLIC_SIDEWALK_AREA_VERIFY_ACCESS'?'PUBLIC SIDEWALK AREA / VERIFY ACCESS':'PUBLIC PARK / SIGHTLINE UNVERIFIED',
  p.name,p.visit+description,
  [{label:'Source and visitor information ↗',url:p.sourceUrl},{label:'View area in Google Maps ↗',url:mapUrl}],p.coordinateNote);
 if(pan)focus(p.lat,p.lon,14);
}
function chooseBridge(id,pan=true){
 const b=state.guide?.bridges.find(x=>x.id===id);if(!b)return;
 state.selected={kind:'bridge',id};pressPlace(null);$('bridge-select').value=id;syncShipHighlight();
 if(b.group==='rail'&&state.railBridges&&state.map){$('rail-layer').checked=true;state.railBridges.addTo(state.map);}
 detail('PUBLISHED BRIDGE REFERENCE / NOT LIVE STATUS',b.name,b.summary+' Published river mile '+b.riverMile+'. The marker does not establish when the crossing is opening.',
  [{label:'Bridge source ↗',url:b.sourceUrl},{label:'USCG navigation notices ↗',url:'https://www.navcen.uscg.gov/local-notices-to-mariners-by-cg-district'}],
  'Bridge pins are not parking or public viewing entrances. Never enter restricted terminal or railway areas.');
 $('bridge-caption').textContent=b.name+' · '+b.type+' · river mile '+b.riverMile+'. No live opening time is known.';
 if(pan)focus(b.lat,b.lon,15);
}
function chooseShip(mmsi,pan=true){
 const v=state.live?.vessels?.find(x=>x.mmsi===mmsi);if(!v)return;
 if(shipUI&&state.shipKindFilter!=='all'&&!shipUI.match(v,state.shipKindFilter)){
  state.shipKindFilter='all';showShips();
 }
 state.selected={kind:'ship',id:mmsi};pressPlace(null);syncShipHighlight();
 const visual=core.vesselVisual(v);
 detail('OBSERVED AIS POSITION / NO ARRIVAL FORECAST',v.name,'Reported type: '+(shipUI?.typeName(shipUI.kindOf(v))||'Type unknown')+'. Last reported '+timeFmt.format(new Date(v.seen))+' at '+v.lat.toFixed(5)+', '+v.lon.toFixed(5)+'. '+(v.speedKnots===null?'Speed not reported.':'Reported speed '+v.speedKnots.toFixed(1)+' knots.')+' '+(visual.course===null?'Course not reported.':'Course '+Math.round(visual.course)+'°.')+' The report does not establish a path, sighting, bridge crossing or ETA.',
  [{label:'Open full ship tracker ↗',url:'/great-lakes-freighter-tracking/'}],
  'Source: '+v.source+'. Vessel type and size icons are illustrations, not hull geometry or map-scale depictions.');
 if(pan)focus(v.lat,v.lon,15);
}
function plotGuide(){
 if(!state.guide)return;
 state.places?.clearLayers();state.bridges?.clearLayers();state.railBridges?.clearLayers();
 for(const p of state.guide.viewpoints){
  if(!state.places)continue;
  const m=L.marker([p.lat,p.lon],{title:p.name,alt:p.name+' approximate area',icon:pin('place','●'),zIndexOffset:1000}).addTo(state.places);
  m.bindTooltip(p.name);m.on('click',()=>choosePlace(p.id,false));
 }
 for(const b of state.guide.bridges){
  const layer=b.group==='rail'?state.railBridges:state.bridges;
  if(!layer)continue;
  const kind=b.group==='rail'?'rail':'bridge';
  const m=L.marker([b.lat,b.lon],{title:b.name,alt:b.name+' rounded chart reference',icon:pin(kind,kind==='rail'?'▤':'⇧')}).addTo(layer);
  m.bindTooltip(b.name);m.on('click',()=>chooseBridge(b.id,false));
 }
 const select=$('bridge-select');select.replaceChildren(node('option','Choose a bridge'));select.options[0].value='';
 for(const b of state.guide.bridges){const option=node('option',b.name+' · '+b.type+(b.group==='rail'?' / railroad':''));option.value=b.id;select.append(option);}
 for(const btn of document.querySelectorAll('[data-place]'))btn.addEventListener('click',()=>choosePlace(btn.dataset.place));
 choosePlace('bridge95',false);
}
function showShips(){
 const r=state.live,list=$('reported-ships');list.replaceChildren();state.ships?.clearLayers();
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
   btn.type='button';btn.className='river-vessel-entry';
   const kind=shipUI?.kindOf(v)||'unknown';
   if(shipUI){const glyph=node('span','','river-vessel-list-glyph type-'+kind);
     glyph.innerHTML=shipUI.glyphSvg(kind);glyph.setAttribute('aria-hidden','true');btn.append(glyph);}
   const info=node('span','','river-vessel-name');info.append(node('strong',v.name),
     node('small',(shipUI?.typeName(kind)||'Type unreported')+' · '+timeFmt.format(new Date(v.seen))+
     ' · '+(v.speedKnots===null?'speed unknown':v.speedKnots.toFixed(1)+' knots')+' · '+v.source));
   btn.append(info);btn.addEventListener('click',()=>chooseShip(v.mmsi));item.append(btn);list.append(item);
   if(state.ships){
    const m=L.marker([v.lat,v.lon],{title:v.name+' last AIS fix',alt:v.name+' reported '+(shipUI?.typeName(kind)||'vessel')+' position',
      shipMmsi:v.mmsi,shipReport:v,icon:boatPin(v),zIndexOffset:500}).addTo(state.ships);
    const course=shipUI?.bearing(v);
    m.bindTooltip(v.name+' · '+(shipUI?.typeName(kind)||'Type unknown')+
      ' · '+timeFmt.format(new Date(v.seen))+
      (course!==null&&course!==undefined?' · travel course '+Math.round(course)+'°':' · direction unverified'));
    m.on('click',()=>chooseShip(v.mmsi,false));
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
}
async function loadGuide(){
 try{
  const res=await fetch('/calumet-freighter-watch/guide.json',{cache:'force-cache',signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw Error('guide unavailable');
  const guide=await res.json();if(!core.validateGuide(guide))throw Error('guide invalid');
  state.guide=guide;plotGuide();
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
$('bridge-select').addEventListener('change',e=>{if(e.target.value)chooseBridge(e.target.value);});
$('rail-layer').addEventListener('change',e=>{if(!state.map||!state.railBridges)return;
 if(e.target.checked)state.railBridges.addTo(state.map);else state.map.removeLayer(state.railBridges);
});
loadGuide();loadShips();
})();