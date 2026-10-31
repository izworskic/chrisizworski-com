'use strict';
(() => {
 const node=document.getElementById('explorer-data');
 if(!node)return;
 let model;
 try{model=JSON.parse(node.textContent)}catch{document.getElementById('result-hint').textContent='The interactive trail guide could not load. The official distances and Ontario Parks links below are still here to help you plan.';return}
 const KM_TO_MI=0.62137119223733;
 const showDistance=(km,precision=1)=>(km*KM_TO_MI).toFixed(precision)+' mi ('+km.toFixed(precision)+' km)';
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
 const mapRoutePicker=document.getElementById('map-route-picker');
 const featured=document.getElementById('featured-adventure'),featuredPhoto=document.getElementById('featured-photo');
 const featuredImage=document.getElementById('featured-image'),featuredCredit=document.getElementById('featured-credit');
 const focusTitle=document.getElementById('focus-title'),focusStory=document.getElementById('focus-story');
 const focusDistance=document.getElementById('focus-distance'),focusTime=document.getElementById('focus-time');
 const focusAccess=document.getElementById('focus-access'),focusStatus=document.getElementById('focus-status');
 const focusMapButton=document.getElementById('focus-map-button');

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
  'top-of-the-giant':'After miles of forest comes the climb to the Giant’s high summit. The lake appears far below the cliffs and both sides of the peninsula open to the horizon. This is a long, demanding walk.',
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
 const verifiedPhotos={
  'sea-lion':{
   filename:'Diabase_dyke_formation_known_as_the_sea_lion_in_Sleeping_Giant_Provincial_Park_in_Ontario_02.jpg',
   alt:'The Sea Lion diabase rock arch viewed from a forest trail above Lake Superior',
   author:'Mcdougallgregor',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'
  },
  'top-of-the-giant':{
   filename:'View_from_the_top_of_the_Sleeping_Giant_Trail.jpg',
   alt:'Rocky cliff and forest viewed from the Top of the Giant Trail',
   author:'Tariq Hossenbux',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'
  },
  'middlebrun-beach':{
   filename:'Middlebrun_Bay_Rock.jpg',
   alt:'Pink shoreline rock at Middlebrun Bay beside Lake Superior',
   author:'Sharon Mollerus',license:'CC BY 2.0',licenseUrl:'https://creativecommons.org/licenses/by/2.0/'
  }
 };
 const walkingTimes={
  'sea-lion':'About 1 hour',
  'top-of-the-giant':'6–10 hours on foot',
  'head-of-the-giant':'Not published',
  'nanabosho-lookout':'Not published',
  'middlebrun-beach':'Not published',
  'pass-lake-overlook':'Not published'
 };
 const accessNotes={
  'sea-lion':'Begin at South Kabeyun parking. Ontario Parks describes a difficult rocky approach. Trail conditions and the exact mapped parking connection are not verified here.',
  'top-of-the-giant':'Begin at South Kabeyun parking. Permitted cycling ends at the Talus Lake junction, where Ontario Parks documents a bike rack. Allow daylight for the full return.',
  'head-of-the-giant':'Begin at South Kabeyun parking. The permitted Sawyer Bay bicycle approach has no documented rack at the walk transition. Plan for the full steep return.',
  'nanabosho-lookout':'Begin at South Kabeyun parking. Some cycling is permitted on the approach, but no rack is documented where the walk begins. Check access with Ontario Parks.',
  'middlebrun-beach':'This beach walk has its own trailhead, separate from the long Giant climbs. Confirm parking and current access with Ontario Parks before travelling.',
  'pass-lake-overlook':'This short sandstone lookout walk has its own trailhead. Ontario Parks has not supplied a complete walking time; confirm current access and parking.'
 };
 let photoRequest=0;
 function updateFeatured(route){
  featured.dataset.selectedTrail=route.id;
  focusTitle.textContent=route.name;
  focusStory.textContent=summaries[route.id]||'Choose a trail to learn what makes this part of Sleeping Giant distinctive.';
  focusDistance.textContent=showDistance(route.roundTripKm);
  focusTime.textContent=walkingTimes[route.id]||'Not published';
  focusAccess.textContent=(accessNotes[route.id]||'Check Ontario Parks before travelling.')+
   ' This planner does not confirm a trail is open.';
  focusStatus.textContent='Showing '+route.name+'. No live trail status is available.';
  const photo=verifiedPhotos[route.id],request=++photoRequest;
  if(!photo){
   featuredPhoto.hidden=true;
   featured.classList.add('no-photo');
   return;
  }
  // Never show the previous trail's photograph while the next one loads.
  featuredPhoto.hidden=true;
  featured.classList.add('no-photo');
  const source='https://commons.wikimedia.org/wiki/File:'+photo.filename;
  const src='https://commons.wikimedia.org/wiki/Special:FilePath/'+photo.filename+'?width=960';
  const preloader=new Image();
  preloader.onload=()=>{
   if(request!==photoRequest)return;
   featuredImage.src=src;
   featuredImage.alt=photo.alt;
   featuredCredit.replaceChildren();
   const author=document.createElement('a');author.href=source;author.textContent=photo.author;
   const license=document.createElement('a');license.href=photo.licenseUrl;license.textContent=photo.license;
   featuredCredit.append(author,' · ',license,' · cropped');
   featuredPhoto.hidden=false;
   featured.classList.remove('no-photo');
  };
  preloader.onerror=()=>{
   if(request!==photoRequest)return;
   featuredPhoto.hidden=true;
   featured.classList.add('no-photo');
  };
  preloader.src=src;
 }
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
   // Do not style a timing outcome as a trail endorsement.
   // Timing affects the note and ordering, never approval or disapproval colors.
   card.dataset.status=score.classification;
  });
  for(const score of results)if(cards.has(score.id))cardList.append(cards.get(score.id));
  const fitting=results.filter(score=>score.classification==='planning_candidate').length;
  document.getElementById('result-count').textContent=results.length+' trails to explore';
  const h=document.getElementById('result-hint');
  h.textContent=mode==='bike-hike'
   ?'Only Ontario Parks’ permitted cycling stretches are shown. No complete bike-and-hike time is published, so give every outing room to breathe.'
   :'Only Ontario Parks’ published return-walk times are used here. For other trails, take the distance as a starting point, not a promise about how long your day will take.';
  document.getElementById('result-head').textContent=fitting?
   'A few trails may fit the hours you have.':'Let the landscape and your available time guide the choice.';
  const matching=results.filter(score=>score.interestMatched);
  const first=matching.find(score=>score.classification==='planning_candidate')||matching[0]||results[0];
  return first?.id||currentId;
 }
 function drawRoute(id){
  const route=routes.get(id);if(!route)return;
  currentId=id;
  mapRoutePicker.value=id;
  updateFeatured(route);
  for(const [cardId,card] of cards){
   const selected=cardId===id;
   card.classList.toggle('is-selected',selected);
   const action=card.querySelector('[data-select]');
   if(action)action.setAttribute('aria-pressed',String(selected));
  }
  const overlay=overlays.get(id);
  map.setAttribute('aria-label',overlay
    ?'Research-only trail outline for '+route.name+', with an approximate parking area indicated separately. Not a navigation map.'
    :'No research trail outline available for '+route.name+'. The official distance is separate; parking and trail access remain unverified. Not a navigation map.');
  const isBike=currentMode()==='bike-hike'&&route.bikePermission==='official_documented';
  detailTitle.textContent=route.name;
  detailIntro.textContent=summaries[id]||'Every trail has a story. Ontario Parks has the official route description.';
  officialDist.textContent=showDistance(route.roundTripKm);
  bikePanel.replaceChildren();
  bikePanel.hidden=!isBike;
  if(isBike){
    bikePanel.textContent=showDistance(route.bikeApproachRoundTripKm)+' cycling + '+
      showDistance(route.bikeHikeRemainingRoundTripKm)+' walking, both round-trip. '+bikeStops[id]+
      ' Ontario Parks has not published a full time for this combined ride and walk.';
  }
  paths.replaceChildren();pins.replaceChildren();
  focusPoints=null;
  mapFocus.value='overview';
  map.setAttribute('viewBox','0 0 820 610');
  mapFocus.disabled=!overlay;
  renderGeo(id,overlay);
  focusMap('overview');
  if(!overlay){
    mapTitle.textContent=route.name+' · route line not available';
    mappedDist.textContent='Not mapped';
    gap.textContent='This trail has its own starting place, but we do not yet have a reliable map line for it. Ontario Parks’ official return distance remains your best guide.';
    mapStatus.textContent='No verified trail line here. Follow park signs and official maps, not an estimated shortcut.';
    return;
  }
  mapTitle.textContent=route.name;
  mappedDist.textContent=showDistance(overlay.mappedReturnKm,2);
  gap.textContent='This mapped trail line accounts for '+showDistance(Math.abs(overlay.unmappedOrSourceDifferenceReturnKm),2)+
    ' less than the full return distance given by Ontario Parks. The approach from parking is unverified here, so do not treat the gap as a straight-line shortcut.';
  mapStatus.textContent='These lines help you see the landscape. They are not directions or a live trail report.';
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
 mapRoutePicker.addEventListener('change',()=>drawRoute(mapRoutePicker.value));
 focusMapButton.addEventListener('click',()=>{
  drawRoute(currentId);
  document.getElementById('map-section').scrollIntoView({
   behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',
   block:'start'
  });
 });
 planner.addEventListener('change',()=>drawRoute(updateDecisions()));
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
 drawRoute(updateDecisions());
})();
