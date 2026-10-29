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
 const NS='http://www.w3.org/2000/svg';
 const summaries={
  'sea-lion':'An extraordinary rock arch at the edge of Lake Superior, reached by a shorter walk from South Kabeyun.',
  'top-of-the-giant':'The signature cliff and plateau experience. This is a demanding, long outing even with a bicycle.',
  'head-of-the-giant':'The steepest of the Giant summit trails, accessed beyond the Sawyer Bay approach.',
  'nanabosho-lookout':'A remarkable view across the Sibley Peninsula, reached after a long approach and uphill walking.',
  'middlebrun-beach':'A quieter beach walk from its own trailhead. Detailed geospatial verification is not available yet.',
  'pass-lake-overlook':'A short climb to a sandstone lookout from a separate trailhead. Detailed map evidence is pending.'
 };
 const bikeStops={
  'top-of-the-giant':'Ontario Parks reports a rack at Kabeyun / Talus; do not cycle beyond the cutoff.',
  'head-of-the-giant':'No official bike rack is documented at the Head walking transition.',
  'nanabosho-lookout':'No official bike rack is documented at the Nanabosho walking transition.'
 };
 let currentId='sea-lion';
 function el(name,attributes,parent){
  const element=document.createElementNS(NS,name);
  Object.entries(attributes).forEach(([key,val])=>element.setAttribute(key,String(val)));
  parent.appendChild(element);return element;
 }
 function labelFor(score,route,mode){
  if(mode==='bike-hike'&&route.bikePermission!=='official_documented')
    return 'No documented complete bicycle approach. Choose on foot.';
  if(mode==='bike-hike')
    return 'Legal bike/foot split documented, but no official total bike-and-hike duration.';
  switch(score.durationStatus){
   case 'below_documented_minimum':return 'Below Ontario Parks’ published minimum hiking time. Choose a shorter option.';
   case 'within_documented_range_not_assured':return 'Your time falls within the reported hiking range, not beyond its upper end.';
   case 'meets_documented_upper_duration':return 'Published hiking range fits your time budget; conditions and daylight still unverified.';
   case 'unknown_duration':return 'Ontario Parks provides a distance but no complete outing time. Fit cannot be verified.';
   default:return 'Compare official distances and verify current conditions with Ontario Parks.';
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
  const text=el('text',{x:Math.max(10,Math.min(650,lx+11)).toFixed(2),
    y:Math.max(20,Math.min(585,ly-12)).toFixed(2)},pins);
  text.textContent='Approx. lot (unverified entrance)';
 }
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
 updateDecisions();drawRoute(currentId);
})();
