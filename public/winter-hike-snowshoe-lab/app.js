'use strict';
/* Route research preview. NOAA/NWS are checked for one selected route at a time.
 * Geographic dots = recreation reference areas, NEVER winter parking.
 * No route grades or "go" recommendations without dated, route-specific access evidence.
 */
(() => {
 const $=id=>document.getElementById(id),state={
  routes:[],filtered:[],selected:null,parkFilter:null,pointFilter:null,geolocation:null,
  map:null,mapLoaded:false,areas:[],routeSource:null,request:null,cache:new Map()
 };
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const distance=(a,b)=>{const rad=Math.PI/180,dLat=(a.lat-b.lat)*rad,dLon=(a.lon-b.lon)*rad;
  const v=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
  return 3958.8*2*Math.atan2(Math.sqrt(v),Math.sqrt(Math.max(0,1-v)))};
 function day() {
  const d=new Date();d.setHours(12,0,0,0);
  const start=new Date(d),end=new Date(d);end.setDate(d.getDate()+6);
  const toIso=t=>t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
  $('day').min=toIso(start);$('day').max=toIso(end);
  const saturday=new Date(d);saturday.setDate(d.getDate()+(6-d.getDay()+7)%7);
  $('day').value=toIso(saturday<=end?saturday:d);
 }
 function areaPins(routes) {
  // One park can have several widely separated trailheads: cluster by source position.
  const map=new Map();
  for(const r of routes){
   const key=r.group+'|'+Number(r.point.lat).toFixed(5)+'|'+Number(r.point.lon).toFixed(5);
   if(!map.has(key))map.set(key,{id:key,group:r.group,title:r.title,
     lat:r.point.lat,lon:r.point.lon,count:0,routeIds:[]});
   const pin=map.get(key);pin.count++;pin.routeIds.push(r.id);
  }
  return [...map.values()];
 }
 function filtered(){
  const query=$('search').value.trim().toLowerCase(),mode=$('activity').value,region=$('region').value;
  let list=state.routes.filter(r=>(mode==='either'||r.activities.includes(mode)) &&
    (region==='all'||r.region===region) && (!state.parkFilter||r.group===state.parkFilter) &&
    (!state.pointFilter||state.pointFilter.has(r.id)) &&
    (!query||(r.title+' '+r.group).toLowerCase().includes(query)));
  if(state.geolocation)list.sort((a,b)=>distance(state.geolocation,a.point)-distance(state.geolocation,b.point));
  state.filtered=list;renderCards();
  drawAreas();
 }
 function routeCard(r){
  const active=r.id===state.selected?.id;
  const doc=r.mileageStatus==='historical_official'?'historic miles':r.mileageStatus==='approximate_official'?'approx. miles':r.miles===null?'length unverified':'mapped miles';
  const near=state.geolocation?' · '+Math.round(distance(state.geolocation,r.point))+' mi straight-line':'';
  return '<button type="button" class="route-card'+(active?' active':'')+'" data-route="'+esc(r.id)+'" aria-pressed="'+active+'">'+
   '<span class="r-top"><span class="r-name">'+esc(r.title)+'</span><span class="pill">'+esc(r.miles===null?'Length unknown':r.miles+' mi')+'</span></span>'+
   '<span class="r-summary">'+esc(r.summary||'Officially named trail; the current winter surface and access must be checked.')+'</span>'+
   '<span class="r-meta"><span>'+esc(r.region.replace(/-/g,' '))+'</span><span>'+esc(r.activities.join(' & '))+
   '</span><span>'+esc(doc)+esc(near)+'</span></span></button>';
 }
 function renderCards(){
  $('result-count').textContent=state.filtered.length+' of '+state.routes.length+' documented routes'+
    (state.parkFilter?' · '+state.parkFilter.replace(/-/g,' '):'')+
    (state.geolocation?' · straight-line distance order (not drive time)':'');
  $('cards').innerHTML=state.filtered.length?state.filtered.map(routeCard).join(''):
    '<div class="empty">No documented routes match these filters. Try another region or activity.</div>';
  $('clear').hidden=!state.parkFilter;
 }
 function pick(id,scroll=false){
  const route=state.routes.find(r=>r.id===id);if(!route)return;
  state.selected=route;renderCards();drawAreas();drawLines([]);
  window.WinterHikeSatelliteUI?.selected(route);
  $('detail-title').textContent=route.title;
  $('detail-intro').textContent=(route.summary||'Named official route.')+' Snow, road and parking conditions are checked separately.';
  let caveats=(route.caveats||[]).map(t=>'<li>'+esc(t)+'</li>').join('');
  const p=route.winterAccess||{},tracked=p.tracked===true;
  const accessRows=tracked?[
   ['Named trail',p.trail],['Approach road',p.road],['Winter parking',p.parking]
  ].map(([label,value])=>'<li><strong>'+esc(label)+':</strong> '+esc(value==='unknown'?'Not verified':value==='conflict'?'Conflicting manager reports':value)+'</li>').join(''):'<li>Trail-specific winter parking checkpoint has not been researched yet.</li>';
  const accessDetails=tracked?
    '<p><strong>Published location clue:</strong> '+esc(p.parkingHint||'not available')+'</p>'+
    '<p><strong>Road approach:</strong> '+esc(p.roadHint||'not available')+'</p>'+
    '<p><strong>Unresolved access question:</strong> '+esc(p.managerQuestion||'Current trail, road and plowed lot conditions are unknown')+'</p>'+
    '<p><a href="'+esc(p.source)+'" target="_blank" rel="noopener">Review the official manager source ↗</a> · Description reviewed '+esc(p.sourceReviewedAt||'undated')+'. This is not a live plowing report.</p>':'';
  const winterAccessPanel='<div class="verification" aria-label="Winter parking access status"><strong>Winter arrival evidence — '+esc(tracked?'access conditions remain unverified':'specific parking research incomplete')+'</strong>'+
   '<ul class="evidence-list">'+accessRows+'</ul>'+accessDetails+
   '<p><strong>No GPS directions:</strong> a trail reference point or park address is not certified cleared winter parking.</p></div>';
  $('detail-body').innerHTML=
   '<div class="evidence-grid"><div class="metric"><b>'+esc(route.miles===null?'—':route.miles+' mi')+'</b><small>'+
    esc(route.mileageStatus==='historical_official'?'Historic documented length':route.mileageStatus==='not_verified'?'No verified mileage':'Official named-route length')+
   '</small></div><div class="metric"><b>'+esc(route.activities.join(' / '))+'</b><small>Documented activity, not current access</small></div></div>'+
   '<p class="subhead">Trail-specific cautions</p><ul class="evidence-list">'+(caveats||'<li>Winter ground and parking status unavailable</li>')+'</ul>'+
   winterAccessPanel+
   '<div class="detail-links"><a href="'+esc(route.officialUrl)+'" target="_blank" rel="noopener">Official manager page ↗</a>'+
   (route.mapUrl?'<a href="'+esc(route.mapUrl)+'" target="_blank" rel="noopener">Official route map ↗</a>':'')+'</div>'+
   '<section class="history-zone" id="history-zone" aria-label="Four winter snow depth comparison"></section>'+
   '<section class="season-zone" id="season-zone" aria-label="Full-season historic snow cover patterns"></section>'+ 
   '<button type="button" class="action-primary" id="check-weather">Check '+esc($('day').value)+' weather for this route</button>'+
   '<p class="source-line">No driving directions will be provided without a validated winter trailhead.</p>'+
   '<div id="weather-output" aria-live="polite"></div>';
  $('check-weather').addEventListener('click',check);
  window.WinterHikeHistory?.render($('history-zone'),route);
  window.WinterHikeSeason?.render($('season-zone'),route);
  if(scroll && matchMedia('(max-width:850px)').matches)$('detail').scrollIntoView({behavior:'smooth',block:'start'});
 }
 function selectGroup(pinId){
  const pin=state.areas.find(a=>a.id===pinId);if(!pin)return;
  state.parkFilter=pin.group;state.pointFilter=new Set(pin.routeIds);$('search').value='';filtered();
  const first=state.filtered[0];if(first)pick(first.id);
  if(matchMedia('(max-width:850px)').matches)$('routes').scrollIntoView({behavior:'smooth'});
 }
 function warningBox(list){return '<div class="verification"><strong>Must verify before traveling</strong><ul class="evidence-list">'+list.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>'}
 function drawEvidence(data){
  if(!state.selected || data.selected?.id!==state.selected.id)return;
  const e=data.sourceWeather||{},snow=e.snow||{},f=e.forecast||{},a=e.alerts||{};
  const outcome=data.outcome||{};
  const weatherMode=outcome.mode==='snowshoe'?'Snowshoe conditions worth investigating':
    outcome.mode==='hike'?'Boot hiking may fit the modeled snow':'No clear activity fit';
  let view='<p class="subhead">Daytime evidence · '+esc(data.tripDate)+'</p>'+
    '<p class="status"><strong>'+esc(weatherMode)+'</strong> · '+esc(outcome.state||'verify')+
    ' — never an open-trail approval</p>';
  const visuals=window.WinterHikeVisuals;
  view+=visuals?visuals.render({snow,forecast:f,alerts:a,selectedDate:data.tripDate}):
    '<div class="wx-no-data">Interactive weather graphics could not be loaded. Check the NWS and NOAA source directly.</div>';
  view+='<p class="source-line">Official evidence requested '+esc(e.checkedAt||'date unknown')+
    '. Forecast and modeled snow do not establish trail access.</p>';
  const v=data.parkingVerification||{};
  if(v.tracked){
   view+='<p class="subhead">Current winter arrival verification</p><div class="verification"><strong>'+esc(v.status||'verification-needed')+'</strong><p>Trail: '+esc(v.trail||'unknown')+' · Road: '+esc(v.road||'unknown')+' · Parking: '+esc(v.parking||'unknown')+'</p><p>'+esc(v.managerQuestion||'Current winter road, parking and access conditions remain unverified')+'</p></div>';
  }
  const checks=[...(outcome.verification||[]),...(outcome.blockers||[])];
  if(!checks.length)checks.push('Current winter lot and road access remain unresolved; imagery cannot verify plowing');
  if(a.status!=='verified'&&!checks.some(x=>/alert/i.test(x)))checks.push('Current NWS alert check failed');
  view+=warningBox([...new Set(checks)]);
  view+='<p class="subhead">Official route geometry</p>'+
    '<p class="muted">'+esc(data.sourceGeometry?.overlay?.note||
     'No complete digitally mapped route. The official manager map or description is the source.')+'</p>';
  view+='<p class="source-line">No official trailhead GPS or directions are available. NOAA snow is modeled landscape context; future warnings can change.</p>';
  $('weather-output').innerHTML=view;
  visuals?.rememberTimeline($('detail'),f);
  drawLines(data.sourceGeometry?.overlay?.features||[]);
 }
 async function check(){
  const route=state.selected;if(!route)return;
  const date=$('day').value,activity=$('activity').value;
  if(!$('day').validity.valid){$('weather-output').textContent='Choose a date in the next seven days.';return}
  const chosen=activity==='either'?'either':route.activities.includes(activity)?activity:'either';
  const key=[route.id,date,chosen].join('|');
  const cached=state.cache.get(key);
  if(cached && Date.now()-cached.savedAt<8*60*1000){drawEvidence(cached.result);return}
  if(state.request)state.request.abort();
  const request=new AbortController();state.request=request;
  $('weather-output').innerHTML='<p class="status">Reading NOAA snow depth, NWS forecast and DNR trail-line evidence…</p>';
  $('check-weather').disabled=true;
  try{
   const q=new URLSearchParams({mode:'preview',route:route.id,date,activity:chosen});
   const r=await fetch('/api/winter-hike-lab?'+q.toString(),{signal:request.signal,headers:{Accept:'application/json'}});
   const d=await r.json();if(!r.ok)throw Error(d.error||'Official data request unavailable');
   state.cache.set(key,{savedAt:Date.now(),result:d});
   if(state.selected?.id===route.id && $('day').value===date)drawEvidence(d);
  }catch(error){
   if(error.name!=='AbortError'&&state.selected?.id===route.id)
    $('weather-output').innerHTML='<div class="verification">Official data is unavailable for this date. Try again later and check the park manager. No conditions have been inferred from the missing result.</div>';
  }finally{if(state.request===request)state.request=null;
   if(state.selected?.id===route.id&&$('check-weather'))$('check-weather').disabled=false}
 }
 function drawAreas(){
  if(!state.mapLoaded)return;
  const visible=new Set(state.filtered.map(r=>r.id));
  const geo={type:'FeatureCollection',features:state.areas.filter(a=>a.routeIds.some(id=>visible.has(id))).map(a=>({
   type:'Feature',geometry:{type:'Point',coordinates:[a.lon,a.lat]},
   properties:{id:a.id,name:a.title,count:a.count,selected:a.routeIds.includes(state.selected?.id)?1:0}
  }))};
  const s=state.map.getSource('winter-areas');if(s)s.setData(geo);
 }
 function drawUserLocation(){
  if(!state.mapLoaded||!state.geolocation)return;
  const loc=state.geolocation;
  if(loc.lat<41||loc.lat>49||loc.lon< -91||loc.lon> -82)return;
  const source=state.map.getSource('winter-user');
  if(source)source.setData({type:'FeatureCollection',features:[{
    type:'Feature',geometry:{type:'Point',coordinates:[loc.lon,loc.lat]},properties:{}
  }]});
 }
 function drawLines(features){
  if(!state.mapLoaded)return;
  const safe=(Array.isArray(features)?features:[]).filter(f=>f.type==='Feature'&&
    f.geometry?.type==='LineString'&&Array.isArray(f.geometry.coordinates));
  const s=state.map.getSource('winter-lines');if(s)s.setData({type:'FeatureCollection',features:safe});
 }
 function mapFallback(reason){$('map-status').textContent=reason+'. The route list remains available below.'}
 function initMap(){
  if(!window.maplibregl){mapFallback('Map script unavailable');return}
  const lib=window.maplibregl;const CARTO='https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
  const FREE='https://tiles.openfreemap.org/styles/liberty';
  let cartoKey='',hasFallback=false,map=null;
  const resource=u=>{try{const url=new URL(u);if(url.hostname==='basemaps.cartocdn.com'&&cartoKey)url.searchParams.set('key',cartoKey);return url.toString()}catch{return u}};
  const start=(style,carto)=>{
   try{
    if(map){map.remove();state.map=null;state.mapLoaded=false}
    map=new lib.Map({container:'map',style,center:[-86.9,44.4],zoom:5.2,minZoom:3,maxZoom:13,
      dragRotate:false,pitchWithRotate:false,attributionControl:false,
      transformRequest:request=>({url:carto?resource(request):request})});
    state.map=map;let timeout=setTimeout(()=>{if(!state.mapLoaded){if(carto&&!hasFallback){hasFallback=true;start(FREE,false)}else mapFallback('Map tiles unavailable')}},12000);
    map.addControl(new lib.NavigationControl({showCompass:false}),'top-right');
    map.addControl(new lib.AttributionControl({compact:true}),'bottom-right');
    map.on('load',()=>{
     clearTimeout(timeout);state.mapLoaded=true;$('map-status').textContent=carto?'CARTO map · dots mark reference areas':'Fallback map · dots mark reference areas';
     map.addSource('winter-areas',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
     map.addLayer({id:'winter-area-ring',type:'circle',source:'winter-areas',paint:{
      'circle-radius':['case',['==',['get','selected'],1],17,12],
      'circle-color':['case',['==',['get','selected'],1],'#e1f09c','#267f60'],
      'circle-stroke-color':'#fff','circle-stroke-width':2.5}});
     map.addLayer({id:'winter-area-label',type:'symbol',source:'winter-areas',layout:{
       'text-field':['to-string',['get','count']],'text-size':12,'text-allow-overlap':true},
       paint:{'text-color':['case',['==',['get','selected'],1],'#1b4333','#fff']}});
     map.addSource('winter-lines',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
     map.addLayer({id:'winter-lines-normal',type:'line',source:'winter-lines',
       filter:['!=',['get','kind'],'closed-segment'],
       paint:{'line-color':'#673c9b','line-width':4,'line-opacity':.85}});
     map.addLayer({id:'winter-lines-closed',type:'line',source:'winter-lines',
       filter:['==',['get','kind'],'closed-segment'],
       paint:{'line-color':'#ad3030','line-width':5,'line-dasharray':[1,1]}});
     map.on('click','winter-area-ring',event=>{
      const id=event.features?.[0]?.properties?.id;if(!id)return;
      selectGroup(id);
     });
     map.on('mouseenter','winter-area-ring',()=>map.getCanvas().style.cursor='pointer');
     map.on('mouseleave','winter-area-ring',()=>map.getCanvas().style.cursor='');
     map.addSource('winter-user',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
     map.addLayer({id:'winter-user-dot',type:'circle',source:'winter-user',
       paint:{'circle-radius':7,'circle-color':'#1752b0',
         'circle-stroke-color':'#fff','circle-stroke-width':3}});
     drawAreas();drawUserLocation();
     window.WinterHikeSatelliteUI?.attach(map);
    });
    map.on('error',error=>{
     if(error?.sourceId==='historic-modis'){window.WinterHikeSatelliteUI?.reportTileError();return}
     // A historical overlay tile must NEVER trigger a basemap restart, which
     // used to reset CARTO position and the selected destination.
     if(!state.mapLoaded&&carto&&!hasFallback){hasFallback=true;start(FREE,false)}
    });
   }catch{if(carto&&!hasFallback){hasFallback=true;start(FREE,false)}else mapFallback('Map failed to initialize')}
  };
  fetch('/api/carto-basemap-config',{headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():null)
   .then(cfg=>{if(cfg?.provider==='CARTO'&&typeof cfg.key==='string'&&cfg.key.length>=10){cartoKey=cfg.key;start(resource(CARTO),true)}else start(FREE,false)})
   .catch(()=>start(FREE,false));
 }
 async function init(){
  day();
  window.WinterHikeSatelliteUI?.init();
  window.WinterHikeVisuals?.bind($('detail'),{
   onDayChange(value){
    const input=$('day');
    if(value<input.min||value>input.max||value===input.value)return;
    input.value=value;
    if(state.selected){pick(state.selected.id);check()}
   }
  });['activity','region','search'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{
   if(id==='activity'&&state.selected&&!['either',...state.selected.activities].includes($('activity').value)){
    state.selected=null;$('detail-title').textContent='Choose an allowed route';$('detail-body').replaceChildren();
   }
   filtered();
  }));
  $('day').addEventListener('change',()=>{if(state.selected)pick(state.selected.id)});
  $('clear').addEventListener('click',()=>{state.parkFilter=null;state.pointFilter=null;filtered()});
  $('all-map').addEventListener('click',()=>{state.parkFilter=null;state.pointFilter=null;filtered();if(state.mapLoaded)state.map.easeTo({center:[-86.9,44.4],zoom:5.2,duration:400})});
  $('cards').addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b)pick(b.dataset.route,true)});
  $('nearby').addEventListener('click',()=>{
   if(!navigator.geolocation){$('map-status').textContent='Geolocation unavailable; filter by region.';return}
   $('map-status').textContent='Requesting your device location…';
   navigator.geolocation.getCurrentPosition(pos=>{
    state.geolocation={lat:pos.coords.latitude,lon:pos.coords.longitude};filtered();
    $('map-status').textContent='Sorted by straight-line distance from your device, NOT by driving time or winter road access.';
    if(state.mapLoaded) {
     drawUserLocation();
     // An out-of-state user still gets Michigan results. Don't pan the map
     // thousands of miles away from its useful trail pins.
     if(pos.coords.latitude>=41&&pos.coords.latitude<=49 &&
        pos.coords.longitude>=-91&&pos.coords.longitude<=-82)
       state.map.easeTo({center:[pos.coords.longitude,pos.coords.latitude],zoom:6.5,duration:550});
    }
   },()=>{$('map-status').textContent='Device location not shared; you can browse all routes normally.'},{timeout:10000,enableHighAccuracy:false,maximumAge:300000});
  });
  try{
   const r=await fetch('/api/winter-hike-lab?mode=catalog',{headers:{Accept:'application/json'}});
   if(!r.ok)throw Error('Catalog service is unavailable');
   const json=await r.json();
   if(!Array.isArray(json.routes)||!json.routes.length)throw Error('Catalog is empty');
   state.routes=json.routes;state.areas=areaPins(json.routes);
   filtered();initMap();
  }catch(e){$('result-count').textContent='Inventory unavailable';$('cards').innerHTML='<div class="empty">The official route catalog could not be loaded. No substitute or fabricated trails have been added.</div>';mapFallback('Route catalog unavailable')}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
