/* Great Lakes winter field desk prototype. No generated travel prose and no safety prediction.
 * Changing the chosen outing cancels prior weather requests and changes photo, map and sources together.
 */
(function(){
  'use strict';
  const C=window.GreatLakesWinterDesk;
  if(!C)return;
  const $=id=>document.getElementById(id);
  const state={goal:'falls',effort:'short',day:'today',chosen:'gooseberry-upper',request:0,weather:null,sourceDocument:null,routeDocument:null};
  const weatherCache=new Map();
  const mapState={map:null,markers:new Map()};
  const SAFE=new Set(['available','empty','stale','unknown']);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const niceDay=()=>({today:'today',tomorrow:'tomorrow',third:'in two days'}[state.day]);
  function setStatus(msg){$('desk-status').textContent=msg;}
  function selectGoal(goal){
    if(!Object.hasOwn(C.GOALS,goal))return;
    state.goal=goal;
    const candidate=C.PLACES.find(p=>p.goal===goal);
    state.effort=candidate.effort;
    $('effort').value=state.effort;
    render();
  }
  function renderButtons(){
    document.querySelectorAll('[data-goal]').forEach(btn=>{
      const active=btn.dataset.goal===state.goal;
      btn.setAttribute('aria-pressed',String(active));
      btn.classList.toggle('active',active);
    });
    document.querySelectorAll('[data-place]').forEach(btn=>{
      const active=btn.dataset.place===state.chosen;
      btn.setAttribute('aria-pressed',String(active));
      btn.classList.toggle('active',active);
    });
  }
  function render(){
    const requestedPlace=C.PLACES.find(p=>p.goal===state.goal);
    const access=C.routeAccess(state.routeDocument,requestedPlace,state,new Date());
    const blocked=access.blocks===true;
    const scopedBlock=blocked&&requestedPlace?{[requestedPlace.id]:{status:'closed',verified:true}}:{};
    const outcome=C.recommend(state,scopedBlock);
    const place=outcome.place;
    if(!place)return;
    state.chosen=place.id;
    const match=outcome.kind==='candidate';
    $('quick-outing').textContent=blocked?'Access warning: '+place.title:match?place.title:'Reconsider this outing length';
    $('quick-reason').textContent=blocked?access.message:match
      ?place.short+'. Official access is not yet verified.'
      :outcome.reason;
    $('quick-source').href=place.conditions;
    $('stage-region').textContent=place.label;
    $('stage-title').textContent=place.title;
    $('stage-short').textContent=place.short;
    $('stage-description').textContent=place.featured;
    $('stage-why').textContent=place.why;
    $('stage-length').textContent=place.length;
    $('stage-blocker').textContent=place.blocker;
    $('stage-status').textContent=blocked?(access.kind==='conflict'?'Conflicting official access notices':'Official access restriction reported'):match?'Candidate outing. Current access not verified.':'Not a fit for your chosen outing length';
    $('stage-status').className='access-status'+(match?'':' access-status--mismatch');
    $('stage-reason').textContent=blocked?access.message:match?access.message:outcome.reason;
    $('official-link').href=place.official;
    $('conditions-link').href=place.conditions;
    $('arrival-link').href=place.entrance;
    $('maps-link').href=C.safeGoogleUrl(place)||place.official;
    $('photo-credit').textContent=place.photoCredit;
    $('photo-credit').href=place.photoPage;
    $('photo-note').textContent=place.photoNote;
    const photo=$('stage-photo');
    const fallback=$('photo-missing');
    const img=document.createElement('img');
    img.id='stage-photo';
    img.loading='lazy';img.decoding='async';img.alt=place.photoAlt;
    img.src=place.photo;
    img.addEventListener('error',()=>{
      if(state.chosen!==place.id||$('stage-photo')!==img)return;
      img.hidden=true;fallback.hidden=false;
    });
    img.addEventListener('load',()=>{
      if(state.chosen!==place.id||$('stage-photo')!==img)return;
      img.hidden=false;fallback.hidden=true;
    });
    photo.replaceWith(img);
    fallback.hidden=true;
    $('assignment-flag').textContent=blocked?'ACCESS REVIEW REQUIRED':match?'FIELD ASSIGNMENT':'CHANGE YOUR OUTING LENGTH';
    $('last-research').textContent='Park source review: '+C.SOURCE_REVIEWED+'. Not a same-day access check.';
    renderSourceDesk(place);
    renderRouteEvidence(place,access);
    $('trip-period').textContent='Forecast lens: '+niceDay();
    $('weather-point').textContent='NWS forecast point near '+place.region+'. Not measured on the trail.';
    $('weather-site').href='https://forecast.weather.gov/MapClick.php?lat='+place.weatherPoint.lat+'&lon='+place.weatherPoint.lon;
    renderButtons();
    updateMap();
    weatherFor(place);
    setStatus(place.title+'. '+(blocked?access.message:match?'Current park access needs an official check.':'Selected effort does not match this route.'));
  }
  function renderRouteEvidence(place,access){
    $('route-day').textContent=access.date||'Date unavailable';
    $('route-access').textContent=access.message;
    $('route-access').className='route-access'+(access.blocks?' route-access--blocked':'');
    $('route-policy').textContent=access.policy?.text||
      'No verified route-specific winter guidance is available from this snapshot.';
    $('route-policy-link').href=access.policy?.sourceUrl||place.official;
    $('route-policy-link').textContent='Read this route on the land manager site ↗';
  }
  async function loadRouteEvidence(){
    try{
      const response=await fetch('./route-access-evidence.json',{cache:'no-store'});
      if(!response.ok)throw Error('route evidence unavailable');
      const data=await response.json();
      if(data?.schemaVersion!==1||data.operatorAccessReady!==false)throw Error('invalid route record');
      state.routeDocument=data;
    }catch(_){
      state.routeDocument=null;
    }
    render();
  }
  function renderSourceDesk(place){
    $('source-direct').href=place.conditions;
    const status=C.sourceReachability(state.sourceDocument,place,new Date());
    $('source-signal').textContent=status.message+
      (status.checkedAt?' Last automated request: '+new Date(status.checkedAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:place.tz,timeZoneName:'short'})+'.':'');
  }
  async function loadSourceDesk(){
    try{
      const response=await fetch('./source-checks.json',{cache:'no-store'});
      if(!response.ok)throw Error('source checks unavailable');
      const data=await response.json();
      if(data?.schemaVersion!==1||data.accessVerified!==false)throw Error('invalid evidence contract');
      state.sourceDocument=data;
    }catch(_){
      state.sourceDocument=null;
    }
    const place=C.getPlace(state.chosen);
    if(place)renderSourceDesk(place);
  }
  function weatherUnknown(note){
    const selected=C.PLACES.find(p=>p.goal===state.goal);
    const access=C.routeAccess(state.routeDocument,selected,state,new Date());
    const block=access.blocks&&selected?{[selected.id]:{status:'closed',verified:true}}:{};
    const current=C.recommend(state,block);
    if(current.kind==='candidate')$('quick-reason').textContent='No usable hourly forecast is available. Park access also needs a separate check.';
    $('weather-head').textContent='Forecast not available';
    $('weather-sub').textContent=note;
    $('weather-issued').textContent='No confirmed NWS issue time';
    $('weather-hours').replaceChildren();
    $('weather-hours').hidden=true;
    $('weather-hour-insight').hidden=true;
    $('weather-unavailable').hidden=false;
    $('weather-unavailable').textContent='Use the official NWS forecast link to check conditions before leaving. Weather does not establish park access.';
  }
  function showWeather(doc,place){
    const w=C.forecastWindow(doc,new Date(),place.tz,state.day);
    if(!SAFE.has(w.status))return weatherUnknown('Unexpected weather data.');
    if(w.status!=='available')return weatherUnknown(w.note);
    $('weather-head').textContent='The daylight window';
    $('weather-sub').textContent='Forecast air, wind and precipitation for '+C.dateKey(new Date(w.hours[0].time),place.tz)+'. No access verdict.';
    $('weather-issued').textContent='NWS issued '+new Date(w.issued).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:place.tz,timeZoneName:'short'});
    $('weather-unavailable').hidden=true;
    $('weather-hours').hidden=false;
    $('weather-hour-insight').hidden=false;
    $('weather-hours').replaceChildren();
    const advisoryHours=w.hours.filter(h=>h.kind==='advisory').length;
    if(!$('stage-status').classList.contains('access-status--mismatch')){
      $('quick-reason').textContent=advisoryHours
        ?'NWS flags '+advisoryHours+' forecast hours with weather concerns. Current park access remains unverified.'
        :'Hourly NWS forecast loaded. Park access still needs a separate official check.';
    }
    function selectHour(index){
      const h=w.hours[index];
      if(!h)return;
      document.querySelectorAll('.hour-choose').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
      const local=new Date(h.time).toLocaleString('en-US',{weekday:'short',hour:'numeric',timeZone:place.tz});
      const temp=h.temperature===null?'temperature not reported':h.temperature+'°'+h.tempUnit;
      const precip=h.precip===null?'precipitation percentage unavailable':h.precip+'% precipitation probability';
      $('weather-hour-insight').textContent=local+': '+h.forecast+'. '+temp+', '+h.wind+', '+precip+'. NWS forecast, not observed trail conditions.';
    }
    w.hours.forEach(h=>{
      const cell=document.createElement('li');
      const time=document.createElement('time');time.dateTime=h.time;
      time.textContent=new Date(h.time).toLocaleTimeString('en-US',{hour:'numeric',timeZone:place.tz});
      const temp=document.createElement('strong');temp.textContent=h.temperature===null?'Temp n/a':h.temperature+'°'+h.tempUnit;
      const bar=document.createElement('div');bar.className='precip-bar';
      const fill=document.createElement('span');fill.style.height=(h.precip===null?0:Math.max(6,h.precip))+'%';
      fill.className=h.precip===null?'precip-unknown':'';
      bar.append(fill);
      const chance=document.createElement('small');chance.textContent=h.precip===null?'Precip n/a':h.precip+'% precip';
      const detail=document.createElement('span');detail.className='hour-note';detail.textContent=h.forecast+'; '+h.wind;
      const alert=document.createElement('span');alert.className='hour-indicator '+h.kind;alert.textContent=h.label;
      const inspect=document.createElement('button');
      inspect.type='button';inspect.className='hour-choose';
      inspect.setAttribute('aria-pressed','false');inspect.textContent='Inspect hour';
      inspect.addEventListener('click',()=>selectHour(w.hours.indexOf(h)));
      cell.append(time,temp,bar,chance,detail,alert,inspect);
      $('weather-hours').append(cell);
    });
    selectHour(0);
  }
  async function weatherFor(place,force=false){
    const req=++state.request;
    const cached=weatherCache.get(place.id);
    if(!force&&cached&&Date.now()-cached.fetched<600000){showWeather(cached.data,place);return;}
    $('weather-head').textContent='Reading the forecast';
    $('weather-sub').textContent='Asking the National Weather Service for the hourly forecast near this destination.';
    $('weather-issued').textContent='Waiting for a source-issued timestamp';
    $('weather-hours').replaceChildren();
    $('weather-hours').hidden=true;
    $('weather-hour-insight').hidden=true;
    $('weather-unavailable').hidden=true;
    if(!navigator.onLine)return weatherUnknown('You appear to be offline.');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    try{
      const point='https://api.weather.gov/points/'+place.weatherPoint.lat+','+place.weatherPoint.lon;
      const points=await fetch(point,{signal:controller.signal,headers:{Accept:'application/geo+json'}});
      if(!points.ok)throw Error('Point lookup unavailable');
      const summary=await points.json();
      const hourly=summary?.properties?.forecastHourly;
      if(!/^https:\/\/api\.weather\.gov\//.test(hourly||''))throw Error('Missing trusted hourly endpoint');
      const result=await fetch(hourly,{signal:controller.signal,headers:{Accept:'application/geo+json'}});
      if(!result.ok)throw Error('Hourly forecast unavailable');
      const data=await result.json();
      if(req!==state.request||place.id!==state.chosen)return;
      weatherCache.set(place.id,{data,fetched:Date.now()});
      showWeather(data,place);
    }catch(_){
      if(req===state.request&&place.id===state.chosen)weatherUnknown('The NWS hourly source could not be reached or verified.');
    }finally{clearTimeout(timeout);}
  }
  function initMap(){
    const holder=$('coast-map');
    if(!holder||typeof L==='undefined'){
      $('map-fallback').hidden=false;
      return;
    }
    try{
      mapState.map=L.map(holder,{scrollWheelZoom:false,zoomControl:true}).setView([46.92,-90.1],6);
      const basemap=L.tileLayer('https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
        attribution:'&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom:18
      }).addTo(mapState.map);
      let loaded=0,errors=0;
      basemap.on('loading',()=>{loaded=0;errors=0;});
      basemap.on('tileload',()=>{loaded++;$('map-fallback').hidden=true;});
      basemap.on('tileerror',()=>{
        errors++;
        if(errors>=2&&loaded===0)$('map-fallback').hidden=false;
      });
      C.PLACES.forEach(p=>{
        const mark=L.circleMarker([p.lat,p.lon],{radius:9,weight:3,color:'#152d39',fillColor:'#e7b76b',fillOpacity:1});
        mark.addTo(mapState.map).bindTooltip(p.region);
        mark.on('click',()=>selectGoal(p.goal));
        mapState.markers.set(p.id,mark);
      });
      holder.addEventListener('keydown',e=>{if(e.key==='Escape')holder.blur();});
    }catch(_){
      $('map-fallback').hidden=false;holder.hidden=true;
    }
  }
  function updateMap(){
    const map=mapState.map;
    if(!map)return;
    C.PLACES.forEach(p=>{
      const marker=mapState.markers.get(p.id);
      if(!marker)return;
      const active=p.id===state.chosen;
      marker.setStyle({radius:active?12:8,fillColor:active?'#d56a3a':'#e7b76b',weight:active?4:2});
    });
    const p=C.getPlace(state.chosen);
    if(p)map.flyTo([p.lat,p.lon],7,{animate:!matchMedia('(prefers-reduced-motion: reduce)').matches,duration:0.6});
  }
  function init(){
    document.querySelectorAll('[data-goal]').forEach(btn=>btn.addEventListener('click',()=>selectGoal(btn.dataset.goal)));
    document.querySelectorAll('[data-place]').forEach(btn=>btn.addEventListener('click',()=>selectGoal(C.getPlace(btn.dataset.place).goal)));
    $('effort').addEventListener('change',e=>{state.effort=e.target.value;render();});
    $('day').addEventListener('change',e=>{state.day=e.target.value;render();});
    $('refresh-weather').addEventListener('click',()=>weatherFor(C.getPlace(state.chosen),true));
    $('copy-plan').addEventListener('click',()=>{
      const p=C.getPlace(state.chosen);
      const message=p.title+'\n'+p.length+'\nOfficial activity: '+p.official+'\nConditions: '+p.conditions+'\nCurrent access is not verified. Forecast weather is not trail status.';
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(message).then(()=>setStatus('Field note copied.')).catch(()=>setStatus('Copy unavailable; use the official links.'));
      else setStatus('Copy unavailable; use the official links.');
    });
    initMap();render();loadSourceDesk();loadRouteEvidence();
  }
  document.addEventListener('DOMContentLoaded',init);
})();
