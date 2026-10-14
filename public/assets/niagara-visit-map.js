/* Niagara Falls itinerary map: OSM places + operator arrival guidance, not fake pedestrian routing. */
(function(){
 'use strict';
 var map=null,layers=null,pins={};
 function el(id){return document.getElementById(id);}
 function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function mapsSearch(s){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s);}
 function walkingUrl(w){
  var stops=w.route_stops||[];
  if(!stops.length)return mapsSearch('Niagara Falls '+(w.side==='CA'?'Ontario':'New York'));
  var origin=w.parking&&w.parking.id!=='caC'?w.parking.address:stops.length>1?stops[0].lat+','+stops[0].lng:null;
  var last=stops[stops.length-1];
  var points=stops.slice(w.parking?0:1,-1);
  var url='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(last.lat+','+last.lng)+'&travelmode=walking';
  if(origin)url+='&origin='+encodeURIComponent(origin);
  if(points.length)url+='&waypoints='+encodeURIComponent(points.map(function(p){return p.lat+','+p.lng;}).join('|'));
  return url;
 }
 function createMap(){
  if(map)return true;
  if(!window.L||!el('niagara-route-map'))return false;
  map=L.map('niagara-route-map',{scrollWheelZoom:false,zoomControl:true,attributionControl:true}).setView([43.0835,-79.075],14);
  var tiles=L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
   subdomains:'abcd',maxZoom:19,maxNativeZoom:18,
   attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
  });
  tiles.addTo(map);
  layers=L.layerGroup().addTo(map);
  setTimeout(function(){if(map)map.invalidateSize();},0);
  return true;
 }
 function pinIcon(label,kind){
  return L.divIcon({className:'niagara-map-marker',html:'<span class="niagara-pin '+kind+'">'+escapeHtml(label)+'</span>',iconSize:[36,42],iconAnchor:[18,38],popupAnchor:[0,-36]});
 }
 function focusPoint(id){
  var m=pins[id];if(!m||!map)return;
  map.setView(m.getLatLng(),16,{animate:true});m.openPopup();
  if(window.matchMedia&&window.matchMedia('(max-width: 700px)').matches)el('niagara-route-map').scrollIntoView({behavior:'smooth',block:'center'});
 }
 function renderComparison(w){
  var target=el('niagara-travel-choices'),comp=w&&w.comparison;
  if(!target)return;
  if(!comp){target.textContent='No travel comparison for this route.';return;}
  var html='<p class="transport-verdict">'+escapeHtml(comp.verdict)+'</p><div class="comparison-options">';
  comp.choices.forEach(function(choice){
   var cost=choice.total_verified?comp.currency+' $'+Number(choice.known_total).toFixed(2):'Price unknown';
   html+='<article class="transport-option'+(choice.selected?' is-current':'')+'">';
   html+='<div class="transport-option-top"><h4>'+escapeHtml(choice.name)+'</h4>';
   if(choice.selected)html+='<span class="transport-current">YOUR ARRIVAL SETTING</span>';
   html+='</div><p class="transport-cost">'+escapeHtml(cost)+'</p>';
   html+='<p class="transport-time">'+(choice.arrival_allowance_minutes===null?'Origin-dependent travel time':choice.arrival_allowance_minutes===0?'Already at first stop':'Allow about '+choice.arrival_allowance_minutes+' min before sightseeing')+'</p>';
   if(choice.roundtrip_extra_minutes)html+='<p class="transport-time">Return-trip planning allowance '+escapeHtml(choice.roundtrip_extra_minutes.min)+'–'+escapeHtml(choice.roundtrip_extra_minutes.max)+' min. Not a verified timetable.</p>';
   html+='<p>'+escapeHtml(choice.explanation)+'</p><p class="transport-check"><strong>Check:</strong> '+escapeHtml(choice.required_check)+'</p>';
   html+='<div class="transport-actions"><a href="'+escapeHtml(choice.source_url)+'" rel="noopener noreferrer" target="_blank">Official information ↗</a>';
   if(!choice.selected)html+='<button type="button" data-travel-choice="'+escapeHtml(choice.id)+'">Use this arrival option →</button>';
   html+='</div></article>';
  });
  html+='</div><p class="transport-limit"><strong>Comparison limit:</strong> '+escapeHtml(comp.important)+' '+escapeHtml(comp.timing_note)+'</p>';
  target.innerHTML=html;
  target.querySelectorAll('[data-travel-choice]').forEach(function(btn){
   btn.addEventListener('click',function(){
    var id=btn.getAttribute('data-travel-choice'),form=el('plan-form');if(!form)return;
    var mode=id==='walk'?'walk':id==='park'?'drive':'transit';
    var radio=form.querySelector('input[name="arrival_mode"][value="'+mode+'"]');
    if(radio)radio.checked=true;
    var origin=form.querySelector('[name="transport_origin"]');
    if(origin)origin.value=id==='rapidsview'?'rapidsview':'other';
    try{if(typeof window.gtag==='function')window.gtag('event','niagara_transport_option_selected',{option:id});}catch(_){}
    if(form.requestSubmit)form.requestSubmit();
   });
  });
 }
 function render(r){
  var w=r&&r.wayfinding;
  var status=el('wayfinding-status'),decision=el('arrival-decision'),list=el('wayfinding-stop-list');
  if(!status||!decision||!list)return;
  if(!w){
   renderComparison(null);
   if(layers)layers.clearLayers();
   pins={};
   status.textContent=r&&r.status==='WEATHER_SAFETY_HOLD'?'Outdoor itinerary suspended by official severe-weather warning.':'A feasible route is not available for this request.';
   decision.innerHTML='<p>Review the itinerary result and operator warnings before travelling. No route is being shown as confirmed.</p>';
   list.innerHTML='<li>There is no route to plot.</li>';
   return;
  }
  renderComparison(w);
  var stops=w.route_stops||[],park=w.parking;
  status.textContent=stops.length+' planned stop'+(stops.length===1?'':'s')+' · '+(w.mode==='drive'?'Parking guidance':w.mode==='transit'?'Transit guidance':'Walking / drop-off')+' · '+(w.side==='CA'?'Ontario':'New York');
  var html='<span class="index">START HERE</span><h3>'+escapeHtml(w.first_action)+'</h3>';
  if(park){
   html+='<div class="parking-verdict"><strong>'+escapeHtml(park.name)+'</strong><p>'+escapeHtml(park.address)+'</p><p><b>Why here:</b> '+escapeHtml(park.basis)+'</p><p><b>Published parking cost:</b> '+escapeHtml(park.price_note)+'</p><a href="'+mapsSearch(park.address)+'" target="_blank" rel="noopener noreferrer">Navigate to parking ↗</a> · <a href="'+escapeHtml(park.source)+'" target="_blank" rel="noopener noreferrer">Official lot information ↗</a></div>';
  }else html+='<p>Your chosen arrival mode does not require an assumed parking spot. The first numbered stop is your destination.</p>';
  html+='<p class="transit-guide"><strong>'+escapeHtml(w.transport.transport_name)+':</strong> '+escapeHtml(w.transport.guide)+' <a href="'+escapeHtml(w.transport.operator_url)+'" target="_blank" rel="noopener noreferrer">Hours, routes and tickets ↗</a></p>';
  html+='<ul class="wayfinding-notes">'+w.notes.map(function(n){return '<li>'+escapeHtml(n)+'</li>';}).join('')+'</ul>';
  decision.innerHTML=html;
  var route=el('open-route-map'),first=el('open-first-stop');
  if(route)route.href=walkingUrl(w);
  if(first)first.href=park?mapsSearch(park.address):stops[0]?mapsSearch(stops[0].location):mapsSearch('Niagara Falls');
  if(route)route.textContent=park?'Walking directions from parking ↗':'Open walking route ↗';
  list.innerHTML=stops.length?stops.map(function(p){
   return '<li><button type="button" data-focus-stop="'+escapeHtml(p.id)+'"><b>'+p.number+'</b><span><strong>'+escapeHtml(p.name)+'</strong><small>'+escapeHtml(p.arrival)+' · '+escapeHtml(p.hint)+'</small></span><span aria-hidden="true">⌖</span></button><a href="'+mapsSearch(p.location)+'" target="_blank" rel="noopener noreferrer" aria-label="Navigate to '+escapeHtml(p.name)+'">Directions ↗</a></li>';
  }).join(''):'<li>No stops in this plan. Review availability and change date or time.</li>';
  list.querySelectorAll('[data-focus-stop]').forEach(function(b){b.addEventListener('click',function(){focusPoint(b.getAttribute('data-focus-stop'));});});
  if(!createMap()){
   el('niagara-route-map').innerHTML='<div class="map-fallback"><strong>Interactive map is unavailable.</strong><p>Open walking directions above, or use the numbered stops and official parking address. No API key is required from you.</p></div>';
   return;
  }
  layers.clearLayers();pins={};
  var bounds=[];
  if(park&&Number.isFinite(park.lat)&&Number.isFinite(park.lng)){
   var pm=L.marker([park.lat,park.lng],{icon:pinIcon('P','parking')}).bindPopup('<strong>'+escapeHtml(park.name)+'</strong><p>'+escapeHtml(park.address)+'</p><p>'+escapeHtml(park.approximate?'Approximate parking-area pin. Follow posted lot entrances.':'Parking area marked in OpenStreetMap.')+'</p><a href="'+mapsSearch(park.address)+'" target="_blank" rel="noopener noreferrer">Directions to parking ↗</a>');
   layers.addLayer(pm);pins.parking=pm;bounds.push([park.lat,park.lng]);
  }
  var line=[];
  stops.forEach(function(p){
   if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return;
   var loc=[p.lat,p.lng],m=L.marker(loc,{icon:pinIcon(String(p.number),'stop')}).bindPopup('<strong>'+escapeHtml(p.number+'. '+p.name)+'</strong><p>'+escapeHtml(p.hint)+'</p><p>Planned visit: '+escapeHtml(p.arrival)+'–'+escapeHtml(p.departure)+' Eastern.</p><a href="'+mapsSearch(p.location)+'" target="_blank" rel="noopener noreferrer">Open navigation ↗</a>');
   pins[p.id]=m;layers.addLayer(m);bounds.push(loc);line.push(loc);
  });
  // The polyline is strictly order-of-visit; it is not a walking path.
  if(line.length>1)layers.addLayer(L.polyline(line,{color:'#276576',weight:3,dashArray:'7 11',opacity:.72,interactive:false}));
  if(bounds.length>1)map.fitBounds(bounds,{padding:[28,28],maxZoom:15});
  else if(bounds.length===1)map.setView(bounds[0],15);
  setTimeout(function(){map.invalidateSize();},0);
  try{if(typeof window.gtag==='function')window.gtag('event','niagara_route_map_loaded',{side:w.side,stops:stops.length,mode:w.mode});}catch(_){}
 }
 window.NiagaraVisitMap={render:render,walkingUrl:walkingUrl};
})();