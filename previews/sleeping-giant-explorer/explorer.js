'use strict';
(() => {
 const node=document.getElementById('explorer-data');
 if(!node)return;
 let model;
 try{model=JSON.parse(node.textContent)}catch{document.getElementById('result-hint').textContent='Interactive data unavailable. Use the official distances and source links shown below.';return}
 const routes=new Map(model.routes.map(r=>[r.id,r]));
 const overlays=new Map(model.overlays.map(r=>[r.routeId,r]));
 const cardList=document.getElementById('route-grid');
 const cards=new Map([...cardList.querySelectorAll('[data-id]')].map(el=>[el.dataset.id,el]));
 const hours=document.getElementById('hours'),interest=document.getElementById('interest'),planner=document.getElementById('planner');
 const detailTitle=document.getElementById('detail-title'),detailIntro=document.getElementById('detail-intro');
 const map=document.getElementById('map-canvas'),paths=document.getElementById('route-shapes'),pins=document.getElementById('route-pins');
 const mapTitle=document.getElementById('map-route-name'),officialDist=document.getElementById('official-distance');
 const mappedDist=document.getElementById('mapped-distance'),gap=document.getElementById('gap-note');
 const bikePanel=document.getElementById('bike-breakdown'),mapStatus=document.getElementById('map-status');
 const mapFocus=document.getElementById('map-focus'),mapZoomStatus=document.getElementById('map-zoom-status');

 const geoElement=document.getElementById('map-geographic');
 const geoFrame=document.getElementById('map-viewport');
 const geoNote=document.getElementById('basemap-note');
 let geoMap=null,geoLines=null,geoBounds=null,geoTargets=null;
 const osmCredit='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
 const cartoCredit=osmCredit+' &copy; <a href="https://carto.com/attributions">CARTO</a>';
 function showGeographic(provider){
   if(!geoMap)return;
   geoFrame.classList.add('is-geographic');
   map.setAttribute('aria-hidden','true');
   geoElement.setAttribute('aria-hidden','false');
   geoNote.textContent=provider+' basemap · research overlay, not navigation';
   geoMap.invalidateSize({animate:false});
 }
 function fitGeo(bounds,maxZoom=14){
   if(geoMap&&bounds?.isValid())geoMap.fitBounds(bounds.pad(.17),{
     padding:[24,24],animate:false,maxZoom});
 }
 function renderGeo(id,overlay){
   if(!geoMap)return;
   const L=window.L,route=routes.get(id);
   geoLines.clearLayers();geoBounds=null;geoTargets=null;
   geoElement.setAttribute('aria-label',overlay
     ?'Geographic map with Ontario Trail Network research sections for '+route.name+'. Not a navigation map.'
     :'Park context only. No mapped trail route or parking location is verified for '+route.name+'.');
   if(!overlay){
     const all=[...overlays.values()].flatMap(o=>o.sections.flatMap(p=>p.researchGeometry.coordinates));
     fitGeo(L.latLngBounds(all.map(p=>[p[1],p[0]])),11);
     return;
   }
   const flip=coord=>[coord[1],coord[0]];
   const start=overlay.sections[0].researchGeometry.coordinates[0];
   const end=overlay.sections.at(-1).researchGeometry.coordinates.at(-1);
   const parking=model.parking.center,vertices=[];
   overlay.sections.forEach(section=>{
     const positions=section.researchGeometry.coordinates.map(flip);
     if(positions.length<2)return;
     vertices.push(...positions);
     const bike=section.modeOnMappedTrail==='bike';
     L.polyline(positions,{color:bike?'#157864':'#b26122',weight:5,opacity:.96,
       lineCap:'round',lineJoin:'round'}).bindTooltip(
         section.trail+' · '+(bike?'park-permitted cycling':'walking')+' · research geometry only'
       ).addTo(geoLines);
   });
   const mark=(coord,color,label)=>L.circleMarker(flip(coord),{
      radius:7,color:'#fff',weight:2,fillColor:color,fillOpacity:1
    }).bindTooltip(label).addTo(geoLines);
   mark(start,'#183e36','Mapped section start; parking connector unverified');
   mark(end,'#b26122','Mapped destination; signed endpoint not independently verified');
   mark(parking,'#b04432','Approximate parking research point; NOT a navigation waypoint');
   geoTargets={start:flip(start),destination:flip(end),parking:flip(parking)};
   geoBounds=L.latLngBounds([...vertices,flip(parking)]);
   fitGeo(geoBounds);
 }
 function initGeo(){
   if(!window.L||!geoElement)return;
   const L=window.L;
   try{
     geoMap=L.map(geoElement,{scrollWheelZoom:false,zoomControl:true,
       attributionControl:true,minZoom:7,maxZoom:18,zoomSnap:.5});
     const anchor=overlays.get('sea-lion').sections[0].researchGeometry.coordinates[0];
     geoMap.setView([anchor[1],anchor[0]],10);
     geoLines=L.layerGroup().addTo(geoMap);
     const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
       maxZoom:18,attribution:osmCredit,crossOrigin:true});
     let active=osm,loadedOSM=0,errorsOSM=0;
     osm.on('tileload',()=>{loadedOSM++;if(active===osm)showGeographic('OpenStreetMap')});
     osm.on('tileerror',()=>{
       if(++errorsOSM>=3&&loadedOSM===0&&active===osm){
         geoFrame.classList.remove('is-geographic');
         map.removeAttribute('aria-hidden');
         geoElement.setAttribute('aria-hidden','true');
         geoNote.textContent='Map tiles unavailable. Research outline shown instead.';
       }
     });
     osm.addTo(geoMap);
     fetch('/api/carto-basemap-config',{credentials:'same-origin'})
       .then(response=>response.ok?response.json():null).then(config=>{
       if(config?.provider!=='CARTO'||typeof config.key!=='string'||!config.key.trim())return;
       const url='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='+
         encodeURIComponent(config.key.trim());
       const carto=L.tileLayer(url,{subdomains:'abcd',maxZoom:18,attribution:cartoCredit});
       let loaded=0,errors=0;
       carto.on('tileload',()=>{
         if(++loaded>=2&&active!==carto){
           active=carto;
           if(geoMap.hasLayer(osm))geoMap.removeLayer(osm);
           showGeographic('CARTO Voyager');
         }
       });
       carto.on('tileerror',()=>{
         if(++errors>=2){
           if(!geoMap.hasLayer(osm))osm.addTo(geoMap);
           active=osm;
           if(geoMap.hasLayer(carto))geoMap.removeLayer(carto);
           geoNote.textContent='OpenStreetMap fallback · research overlay, not navigation';
         }
       });
       carto.addTo(geoMap);
     }).catch(()=>{});
     if(typeof ResizeObserver!=='undefined'){
       const observer=new ResizeObserver(()=>geoMap?.invalidateSize({animate:false}));
       observer.observe(geoElement);
     }
   }catch{
     if(geoMap){try{geoMap.remove()}catch{}}
     geoMap=null;geoLines=null;
     geoNote.textContent='Basemap unavailable. Research outline shown instead.';
   }
 }
 let focusPoints=null;
 function focusMap(mode) {
   if(geoMap){
     if(mode==='overview'&&geoBounds)fitGeo(geoBounds);
     else if(geoTargets?.[mode])geoMap.setView(geoTargets[mode],15,{animate:false});
     if(geoBounds || mode==='overview'){
       const names={overview:'Full research outline',start:'Mapped trail start',
         destination:'Mapped destination',parking:'Approximate parking study point'};
       mapZoomStatus.textContent=(names[mode]||'Park context')+' · not for navigation';
     }
   }
   const target=focusPoints?.[mode];
   if(!target){map.setAttribute('viewBox','0 0 820 610');mapZoomStatus.textContent='Overview · not for navigation';return}
   const detail=mode!=='overview',zoom=detail?2.5:1;
   const width=820/zoom,height=610/zoom;
   const x=Math.max(width/2,Math.min(820-width/2,target[0]));
   const y=Math.max(height/2,Math.min(610-height/2,target[1]));
   map.setAttribute('viewBox',[
     (x-width/2).toFixed(2),(y-height/2).toFixed(2),
     width.toFixed(2),height.toFixed(2)
   ].join(' '));
   const labels={overview:'Full trail outline',start:'Mapped trail start',destination:'Mapped destination',
     parking:'Approximate parking study point'};
   mapZoomStatus.textContent=(labels[mode]||'Research view')+' · not for navigation';
 }

 const NS='http://www.w3.org/2000/svg';
 const summaries={
  'sea-lion':'Follow the forest path past Perry Bay, then meet a remarkable arch of dark stone beside the open lake. The interpretive signs tell how the rock was formed.',
  'top-of-the-giant':'After kilometres of forest comes the climb to the Giant’s high summit. The lake appears far below the cliffs and both sides of the peninsula open to the horizon. This is a long, demanding walk.',
  'head-of-the-giant':'Beyond Sawyer Bay, the park’s steepest trail climbs to a headland view. The ascent takes care and energy; the great sweep of land and water is its reward.',
  'nanabosho-lookout':'The trail rises to the Giant’s chest, where Sawyer Bay, Marie Louise Lake and islands across the peninsula come into view after a long approach.',
  'middlebrun-beach':'Walk through the forest to a quiet sweep of sand and the sound of Superior on the shore. This trail has a separate starting point that has not been precisely mapped here.',
  'pass-lake-overlook':'Climb a sandstone bluff that once stood above glacial water as an island. Pass Lake and Thunder Bay spread out below, and cedar shade greets you on the return.'
 };
 const bikeStops={
  'top-of-the-giant':'Ontario Parks describes a bicycle rack where South Kabeyun meets Talus Lake Trail. Leave your bike there; do not cycle beyond the cutoff.',
  'head-of-the-giant':'No bicycle rack is documented where the Head Trail becomes a walk.',
  'nanabosho-lookout':'No bicycle rack is documented where the Nanabosho approach becomes a walk.'
 };
 let currentId='sea-lion';
 function el(name,attributes,parent){
  const element=document.createElementNS(NS,name);
  Object.entries(attributes).forEach(([key,val])=>element.setAttribute(key,String(val)));
  parent.appendChild(element);return element;
 }
 function labelFor(score,route,mode){
  if(mode==='bike-hike'&&route.bikePermission!=='official_documented')
    return 'No documented complete bicycle approach. Walk this trail; the full route by bicycle has not been established.';
  if(mode==='bike-hike')
    return 'Ontario Parks allows cycling on parts of this approach, but has no official total time for the ride and walk together. Allow plenty of daylight.';
  switch(score.durationStatus){
   case 'below_documented_minimum':return 'The time you have set aside is shorter than Ontario Parks’ published minimum for this return walk. Save this trail for a longer day.';
   case 'within_documented_range_not_assured':return 'You have allowed some of the time Ontario Parks suggests, but not the full upper range. Leave room for rests, changing conditions and daylight.';
   case 'meets_documented_upper_duration':return 'Ontario Parks’ published walking-time range fits the hours you selected. Enjoy the journey, but check conditions and daylight before you leave.';
   case 'unknown_duration':return 'Ontario Parks gives a return distance but no complete walking time for this trail. Choose a generous daylight window rather than a tight schedule.';
   default:return 'Use the official distances to imagine your day, then check current conditions with Ontario Parks.';
  }
 }
 function currentMode(){return planner.querySelector('input[name="mode"]:checked')?.value||'hike'}
 function updateDecisions(){
  const mode=currentMode();
  const key=hours.value+'|'+mode+'|'+interest.value;
  const results=model.plans[key];
  if(!Array.isArray(results)||results.length!==6)return;
  results.forEach(score=>{
   const card=cards.get(score.id),route=routes.get(score.id);
   if(!card||!route)return;
   const d=card.querySelector('.card-decision');
   d.textContent=labelFor(score,route,mode);
   card.classList.toggle('is-highlight',score.classification==='planning_candidate');
   card.classList.toggle('is-denied',score.classification==='not_suitable');
   card.dataset.status=score.classification;
  });
  for(const score of results)if(cards.has(score.id))cardList.append(cards.get(score.id));
  const fitting=results.filter(score=>score.classification==='planning_candidate').length;
  document.getElementById('result-count').textContent=fitting+' timing reference'+(fitting===1?'':'s')+' in '+results.length+' options';
  const h=document.getElementById('result-hint');
  h.textContent=mode==='bike-hike'
   ?'Only official cycling approaches are considered. Complete bike-trip times remain unknown; no route is certified time-feasible.'
   :'Only Ontario Parks’ documented full-trip times can support a budget match. Unknown timing never becomes a positive verdict.';
  document.getElementById('result-head').textContent=fitting?
   'A planning starting point, not a green light.':'Compare the distances; confirm the uncertain parts.';
 }
 function drawRoute(id){
  const route=routes.get(id);if(!route)return;
  currentId=id;
  const overlay=overlays.get(id);
  map.setAttribute('aria-label',overlay
    ?'Research-only trail outline for '+route.name+', with an approximate parking area indicated separately. Not a navigation map.'
    :'No research trail outline available for '+route.name+'. The official distance is separate; parking and trail access remain unverified. Not a navigation map.');
  const isBike=currentMode()==='bike-hike'&&route.bikePermission==='official_documented';
  detailTitle.textContent=route.name;
  detailIntro.textContent=summaries[id]||'Official route descriptions available from Ontario Parks.';
  officialDist.textContent=route.roundTripKm.toFixed(1)+' km';
  bikePanel.replaceChildren();
  bikePanel.hidden=!isBike;
  if(isBike){
    bikePanel.textContent=route.bikeApproachRoundTripKm.toFixed(1)+' km cycling + '+
      route.bikeHikeRemainingRoundTripKm.toFixed(1)+' km walking, both round-trip. '+bikeStops[id]+
      ' The total trip duration cannot be verified from published bike/walk timings.';
  }
  paths.replaceChildren();pins.replaceChildren();
  focusPoints=null;
  mapFocus.value='overview';
  map.setAttribute('viewBox','0 0 820 610');
  mapFocus.disabled=!overlay;
  renderGeo(id,overlay);
  focusMap('overview');
  if(!overlay){
    mapTitle.textContent=route.name+' · reference unavailable';
    mappedDist.textContent='Not mapped';
    gap.textContent='No full-detail government trail overlay has been source-reconciled for this separate trailhead. The official route distance still applies.';
    mapStatus.textContent='No research line available. Do not infer a route or parking pin.';
    return;
  }
  mapTitle.textContent=route.name;
  mappedDist.textContent=overlay.mappedReturnKm.toFixed(2)+' km';
  gap.textContent='The OTN geometry is '+Math.abs(overlay.unmappedOrSourceDifferenceReturnKm).toFixed(2)+
    ' km shorter than Ontario Parks’ official full return. The parking-to-trail segment is unverified, not a straight-line connector.';
  mapStatus.textContent='Mapped trail sections only. No certified directions or live access.';
  const parking=model.parking.center,all=overlay.sections.flatMap(s=>s.researchGeometry.coordinates);
  const coords=all.concat([parking]);
  const latAvg=coords.reduce((sum,p)=>sum+p[1],0)/coords.length;
  const cos=Math.cos(latAvg*Math.PI/180);
  const values=coords.map(p=>[p[0]*cos,p[1]]);
  const xs=values.map(p=>p[0]),ys=values.map(p=>p[1]);
  const midX=(Math.min(...xs)+Math.max(...xs))/2,midY=(Math.min(...ys)+Math.max(...ys))/2;
  const xSpan=Math.max(...xs)-Math.min(...xs),ySpan=Math.max(...ys)-Math.min(...ys);
  const scale=Math.max(xSpan/700,ySpan/500,0.000009);
  const to=point=>[410+(point[0]*cos-midX)/scale,305-(point[1]-midY)/scale];
  overlay.sections.forEach(section=>{
    const path=section.researchGeometry.coordinates.map((point,i)=>{
      const [x,y]=to(point);return (i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2);
    }).join(' ');
    const shape=el('path',{class:'route',d:path,stroke:section.modeOnMappedTrail==='bike'?'#7fe5c3':'#f8c076',
      'data-source-id':section.sourceObjectId},paths);
    el('title',{},shape).textContent=section.trail+'; '+section.modeOnMappedTrail+
      '; research geometry only, not directions';
  });
  const start=overlay.sections[0].researchGeometry.coordinates[0];
  const end=overlay.sections.at(-1).researchGeometry.coordinates.at(-1);
  [
    [start,'Mapped trail start; parking connector not verified','#fff8df'],
    [end,'Mapped destination; signed endpoint not independently surveyed','#f8c076'],
    [parking,'Approximate OSM parking area centre; NOT a navigation waypoint','#f47d77']
  ].forEach(([coord,description,color])=>{
    const [cx,cy]=to(coord);
    const dot=el('circle',{cx:cx.toFixed(2),cy:cy.toFixed(2),r:6.5,fill:color},pins);
    el('title',{},dot).textContent=description;
  });
  const [lx,ly]=to(parking);
  const atRight=lx>540;
  const text=el('text',{x:Math.max(14,Math.min(805,atRight?lx-12:lx+12)).toFixed(2),
    y:Math.max(20,Math.min(585,ly-12)).toFixed(2),'text-anchor':atRight?'end':'start'},pins);
  text.textContent='Approx. parking · unverified';
  focusPoints={overview:[410,305],start:to(start),destination:to(end),parking:to(parking)};
  focusMap('overview');
 }
 mapFocus.addEventListener('change',()=>focusMap(mapFocus.value));
 planner.addEventListener('change',()=>{updateDecisions();drawRoute(currentId)});
 cardList.addEventListener('click',event=>{
   const button=event.target.closest('[data-select]');
   if(!button)return;
   const id=button.dataset.select;
   if(!routes.has(id))return;
   drawRoute(id);
   document.getElementById('map-section').scrollIntoView({behavior:
     window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 });
 initGeo();
 updateDecisions();drawRoute(currentId);
})();
