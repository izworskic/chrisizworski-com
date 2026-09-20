(() => {
  'use strict';
  const API='/api/mackinac-island';
  const state={personas:new Set(['day-trip']),origin:'lower',data:null,mapLoaded:false,mapInstance:null,mapWasOpened:false,mapPoints:[],routeIds:[]};
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const track=(name,params={})=>{try{if(typeof window.gtag==='function')window.gtag('event',name,params);}catch{}};
  const clock=m=>{if(!Number.isFinite(Number(m)))return '—';let n=((Number(m)%1440)+1440)%1440,h=Math.floor(n/60),min=n%60,s=h>=12?'PM':'AM';h=h%12||12;return `${h}:${String(min).padStart(2,'0')} ${s}`;};
  const labelScore=n=>n>=84?'EXCELLENT':n>=74?'GOOD':n>=62?'FAIR':n>=48?'MARGINAL':'POOR';
  const setText=(id,v)=>{const el=$(id);if(el)el.textContent=v??'—';};
  const selectedPersonas=()=>[...state.personas];
  function plannerParams(){
    const p=new URLSearchParams();
    p.set('personas',selectedPersonas().join(','));
    p.set('origin',state.origin);
    const simple={trip:'tripMode',adults:'adultCount',children:'childCount',origin_city:'originCity',bikes:'bikePlan',pace:'pace',mobility:'mobility',dinner:'dinner',return_by:'returnBy',event_start:'eventStart'};
    Object.entries(simple).forEach(([key,id])=>{const el=$(id);if(el&&String(el.value).trim())p.set(key,String(el.value).trim());});
    const interests=[...document.querySelectorAll('#interestChoices input:checked')].map(x=>x.value);
    const must=[...document.querySelectorAll('#mustDoChoices input:checked')].map(x=>x.value);
    if(interests.length)p.set('interests',interests.join(','));
    if(must.length)p.set('must_do',must.join(','));
    return p;
  }
  const buildUrl=()=>`${API}?${plannerParams().toString()}`;
  function scrollToTarget(selector){const el=document.querySelector(selector);if(el){el.scrollIntoView({behavior:'smooth',block:'start'});track('mackinac_section_opened',{section:selector.slice(1)});}}
  document.querySelectorAll('[data-scroll]').forEach(b=>b.addEventListener('click',()=>scrollToTarget(b.dataset.scroll)));

  document.querySelectorAll('#personaChips .chip').forEach(btn=>btn.addEventListener('click',()=>{
    const p=btn.dataset.persona;
    if(p==='day-trip' && state.personas.has('overnight')) state.personas.delete('overnight');
    if(p==='overnight' && state.personas.has('day-trip')) state.personas.delete('day-trip');
    if(p==='day-trip' && $('tripMode')) $('tripMode').value='day-trip';
    if(p==='overnight' && $('tripMode')) $('tripMode').value='overnight';
    if(state.personas.has(p)){ if(state.personas.size>1)state.personas.delete(p); }
    else { if(state.personas.size>=3){const first=[...state.personas].find(x=>x!=='day-trip'&&x!=='overnight')||[...state.personas][0];state.personas.delete(first);} state.personas.add(p); }
    document.querySelectorAll('#personaChips .chip').forEach(x=>{const a=state.personas.has(x.dataset.persona);x.classList.toggle('active',a);x.setAttribute('aria-pressed',String(a));});
    track('mackinac_persona_selected',{personas:selectedPersonas().join('|')});
    loadDecision();
  }));
  document.querySelectorAll('#originSwitch button').forEach(btn=>btn.addEventListener('click',()=>{
    state.origin=btn.dataset.origin;
    document.querySelectorAll('#originSwitch button').forEach(x=>{const a=x===btn;x.classList.toggle('active',a);x.setAttribute('aria-pressed',String(a));});
    track('mackinac_start_location_entered',{origin:state.origin});loadDecision();
  }));
  $('tripBuilder')?.addEventListener('submit',e=>{
    e.preventDefault();
    setText('builderStatus','Rebuilding ferry choice and itinerary from your constraints…');
    track('mackinac_itinerary_created',{personas:selectedPersonas().join('|'),origin_city:$('originCity')?.value||'none',children:Number($('childCount')?.value||0),bikes:$('bikePlan')?.value||'none',pace:$('pace')?.value||'balanced'});
    loadDecision();
  });
  $('tripBuilder')?.addEventListener('change',e=>{
    if(e.target?.id==='tripMode'){
      const trip=e.target.value;
      state.personas.delete(trip==='overnight'?'day-trip':'overnight');
      state.personas.add(trip);
      document.querySelectorAll('#personaChips .chip').forEach(x=>{const a=state.personas.has(x.dataset.persona);x.classList.toggle('active',a);x.setAttribute('aria-pressed',String(a));});
    }
    setText('builderStatus','Trip inputs changed. Tap “Build this trip” to rerun the full plan.');
    track('mackinac_itinerary_changed',{});
  });

  function renderTop(d){
    const dec=d.decision||{}, score=Math.round(dec.score||0), plan=d.ferry?.recommended_plan||{};
    setText('verdict',`${labelScore(score)} — ${score}/100`);
    setText('scoreValue',score||'—');
    $('scoreRing').className='score-ring '+(score>=74?'good':score>=55?'fair':'poor');
    $('scoreRing').setAttribute('aria-label',`Visit score ${score} out of 100`);
    setText('confidence',`${String(dec.confidence||'medium').toUpperCase()} CONFIDENCE${dec.engine==='shared-harness-jev'?' · JEV-ranked feasible plan':' · deterministic ranking'}`);
    const banner=$('planningBanner');
    if(d.planning_mode==='tomorrow'){banner.hidden=false;banner.textContent=`Today’s useful day-trip window has closed. Planning ${d.plan_date_label||'tomorrow'} instead.`;$('page-title').textContent='Mackinac Island Tomorrow';}
    else {banner.hidden=true;$('page-title').textContent='Mackinac Island Today';}
    setText('bestArrival',plan.arrival_time||'No verified plan');
    setText('crowdsTop',d.crowds?.label||'—');
    setText('bikeTop',d.bike?`${d.bike.label} · ${Math.round(d.bike.score||0)}/100`:'—');
    setText('weatherTop',d.weather?.visitor_summary||'Forecast unavailable');
    setText('marineTop',d.marine?.comfort_label||'Observation unavailable');
    setText('returnTop',d.ferry?.recommended_return?.departure_time||'—');
    setText('lastTop',d.ferry?.last_scheduled_return?`Last scheduled: ${d.ferry.last_scheduled_return.departure_time}`:'Last scheduled: unavailable');
    const port=plan.origin_port||'the better mainland port';
    const dep=plan.departure_time||'a verified departure';
    $('primaryRec').innerHTML=plan.departure_time?`<strong>Take the ${esc(dep)} from ${esc(port)}.</strong> ${esc(dec.primary_reason||'This preserves the strongest usable island window.')}`:'<strong>No verified ferry recommendation.</strong> Use the official operator links below before leaving.';
    const profile=d.trip_profile||{};
    const party=`${Number(profile.adults||2)} adult${Number(profile.adults||2)===1?'':'s'}${Number(profile.children||0)?` + ${profile.children} child${Number(profile.children)===1?'':'ren'}`:''}`;
    const priorities=[...(profile.interests||[]),...(profile.must_do||[]).map(x=>`must: ${x}`)].slice(0,3);
    setText('heroTripContext',[party,profile.trip==='overnight'?'overnight':'day trip',priorities.length?priorities.join(' · '):null].filter(Boolean).join(' · '));
    setText('heroLeave',d.leave_home?.time||'Add a starting city');
    setText('heroFerry',plan.departure_time?`${plan.departure_time} · ${plan.origin_port}`:'No verified ferry');
    setText('heroIsland',plan.arrival_time||'—');
    setText('heroReturn',d.ferry?.recommended_return?.departure_time||(profile.trip==='overnight'?'Overnight':'—'));
    const f=d.generated_at?new Date(d.generated_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'—';
    setText('freshLine',`Decision generated ${f} ET · ${d.degraded?'Some inputs are degraded':'Core inputs available'}`);
  }

  function reasonList(id,items){const el=$(id);el.innerHTML=(items&&items.length?items:['No material factor identified.']).slice(0,5).map(x=>`<li>${esc(x)}</li>`).join('');}
  function renderWhy(d){
    const dec=d.decision||{};reasonList('helping',dec.helping);reasonList('hurting',dec.hurting);reasonList('whyFerry',dec.why_ferry);
    setText('engineBadge',dec.engine==='shared-harness-jev'?'Structured candidates + JEV ranking':'Structured deterministic ranking');
    const comps=dec.components||{};const max=Object.values(comps).reduce((m,v)=>Math.max(m,Number(v)||0),100)||100;
    $('componentBars').innerHTML=Object.entries(comps).map(([k,v])=>`<div class="component-row"><span>${esc(k.replace(/_/g,' '))}</span><div class="component-track"><i style="width:${Math.max(3,Math.round((Number(v)||0)/max*100))}%"></i></div><strong>${Math.round(Number(v)||0)}</strong></div>`).join('');
  }

  function renderTimeline(id, rows, best){
    const el=$(id); if(!el)return;
    if(!rows?.length){el.innerHTML='<span class="muted">No verified departures</span>';return;}
    el.innerHTML=rows.slice(0,18).map(r=>`<span class="time-pill ${best&&r.departure_time===best.departure_time&&r.operator===best.operator?'best':''}" title="${esc(r.operator)}">${esc(r.departure_time)}</span>`).join('');
  }
  function renderFerries(d){
    const f=d.ferry||{},plan=f.recommended_plan||{};
    $('ferryPick').innerHTML=plan.departure_time?`<strong>${esc(plan.origin_port)} is the better fit for this plan.</strong> Target ${esc(plan.operator)} at ${esc(plan.departure_time)}; island arrival about ${esc(plan.arrival_time)}.`:'<strong>Ferry plan degraded.</strong> We could not verify enough schedule data to choose a departure safely.';
    setText('ferryFreshness',f.freshness?.label||'Schedule status unavailable');
    const ports=f.port_summary||{};
    ['Mackinaw City','St. Ignace'].forEach((name,i)=>{
      const key=i===0?'mackinaw':'stIgnace',p=ports[name]||{};
      setText(`${key}Best`,p.best_departure?`${p.best_departure.departure_time} · ${p.best_departure.operator}`:'No verified departure');
      setText(`${key}Meta`,p.next_departure?`${p.next_departure_origin_adjusted?'Next reachable from your start':'Next available'} ${p.next_departure.departure_time} · ${p.departure_count||0} departures in the modeled schedule`:'No current departure found');
      const card=$(key+'Card');card?.classList.toggle('recommended',plan.origin_port===name);
      renderTimeline(key+'Timeline',p.departures||[],plan.origin_port===name?plan:null);
    });
    setText('recommendedReturn',f.recommended_return?.departure_time||'—');setText('literalLast',f.last_scheduled_return?.departure_time||'—');
    setText('returnReason',f.return_reason||'Provides a practical margin before the last boat.');
  }

  function renderConditions(d){
    const w=d.weather||{},m=d.marine||{},b=d.bike||{},a=d.astronomy||{};
    setText('weatherFreshness',w.freshness_label||'NWS forecast');
    setText('islandWeather',w.visitor_summary||'Unavailable');setText('islandWeatherNote',w.detail||'');
    setText('ferryComfort',m.comfort_label||'Unavailable');setText('ferryComfortNote',m.comfort_note||'Marine observations are context, not an operating-status feed.');
    setText('bikeWeather',b.label?`${b.label} · ${Math.round(b.score||0)}/100`:'Unavailable');setText('bikeWeatherNote',b.best_window||b.note||'');
    setText('walkingComfort',w.walking?.label||'Unavailable');setText('walkingComfortNote',w.walking?.note||'');
    setText('photoConditions',w.photo?.label||'Unavailable');setText('photoNote',w.photo?.note||'');
    setText('daylightWindow',a.sunrise&&a.sunset?`${a.sunrise}–${a.sunset}`:'Unavailable');setText('daylightNote',a.golden_hour?`Best evening light roughly ${a.golden_hour}.`:'');
    const alerts=w.alerts||[];const box=$('alertBox');if(alerts.length){box.hidden=false;box.innerHTML=`<strong>Weather alert:</strong> ${alerts.slice(0,2).map(x=>esc(x.headline||x.event)).join(' · ')}`;}else box.hidden=true;
  }

  function renderCrowdsOpen(d){
    const c=d.crowds||{};setText('crowdLabel',c.label||'—');setText('crowdWindows',c.summary||'Crowd estimate unavailable.');setText('crowdConfidence',`${String(c.confidence||'medium').toUpperCase()} confidence`);setText('crowdBasis',c.basis||'Modeled from calendar, weather and events.');
    const attrs=d.attractions||[];$('attractionList').innerHTML=attrs.length?attrs.map(x=>`<div class="status-item"><span>${esc(x.name)}</span><strong class="${x.open?'status-open':'status-closed'}">${x.open?`OPEN${x.hours?' · '+esc(x.hours):''}`:`${esc(x.status||'CLOSED')}`}</strong></div>`).join(''):'<p>No attraction-status data available.</p>';
    setText('openness',d.island_openness?.label?`Island openness: ${d.island_openness.label}`:'');
  }

  function renderSeasonal(d){
    const events=d.events||[];$('eventsList').innerHTML=events.length?events.map(x=>`<div class="status-item"><span>${esc(x.title)}</span><strong>${esc(x.impact_label||x.impact||'Today')}</strong></div>`).join(''):'<p>No major event signal in the modeled calendar today.</p>';
    const f=d.fall_color||{};setText('fallColorLabel',f.label||'Not a primary factor');setText('fallColorText',f.summary||'Shared statewide color intelligence is unavailable or out of season; no replacement estimate is invented.');
  }

  function renderPlanner(d){
    const it=d.itinerary||[],p=d.trip_profile||{};
    setText('plannerSummary',d.itinerary_summary||'A feasible plan could not be built from the verified inputs.');
    $('itinerary').innerHTML=it.length?it.map(x=>`<li><time>${esc(x.time||'')}</time><div><strong>${esc(x.title||x.label||'Plan stop')}</strong>${x.movement?`<span class="movement">${esc(x.movement)}</span>`:''}<p>${esc(x.detail||'')}</p></div></li>`).join(''):'<li><time>—</time><div><strong>No complete itinerary</strong><p>Use the official ferry source links before leaving.</p></div></li>';
    setText('plannerExplain',d.itinerary_reason||'');
    setText('leaveHome',d.leave_home?.time||'Start from the ferry dock');
    setText('leaveHomeNote',d.leave_home?.detail||'Choose a supported starting city to add a planning leave time. Drive estimates are not live traffic.');
    const party=`${Number(p.adults||2)} adult${Number(p.adults||2)===1?'':'s'}${Number(p.children||0)?` + ${p.children} child${Number(p.children)===1?'':'ren'}`:''}`;
    const fit=[party,p.trip==='overnight'?'overnight':'day trip',p.pace?`${p.pace} pace`:null,p.bikes&&p.bikes!=='none'?`${p.bikes} bikes`:null,p.mobility==='limited'?'limited steep walking':null].filter(Boolean);
    setText('tripFit',fit.join(' · '));
    const priorities=[...(p.interests||[]),...(p.must_do||[]).map(x=>`must: ${x}`)];
    setText('tripFitNote',priorities.length?`Priorities: ${priorities.join(', ')}.`:`Using the selected visitor modes plus live ferry/weather constraints.`);
    setText('builderStatus',d.degraded?'Trip rebuilt; some source inputs are degraded and are labeled below.':'Trip rebuilt from the current live decision bundle.');
  }

  function renderSources(d){
    const src=d.sources||{};setText('overallDataState',d.degraded?'DEGRADED · some source gaps':'CORE SOURCES AVAILABLE');
    const order=Object.entries(src);$('sourceList').innerHTML=order.length?order.map(([k,s])=>`<div class="source-row"><a href="${esc(s.url||'#')}" target="_blank" rel="noopener">${esc(s.name||k.replace(/_/g,' '))}</a><span class="source-state ${s.available?'ok':'warn'}">${s.available?'available':'unavailable'}</span></div>`).join(''):'<p>No source-provenance payload was returned.</p>';
    const refs=d.planning_references||{};
    if(refs.accessibility?.url)$('sourceList').insertAdjacentHTML('beforeend',`<div class="source-row"><a href="${esc(refs.accessibility.url)}" target="_blank" rel="noopener">${esc(refs.accessibility.name||'Accessibility planning source')}</a><span class="source-state ok">planning reference</span></div>`);
    if(refs.drive_times?.url)$('sourceList').insertAdjacentHTML('beforeend',`<div class="source-row"><a href="${esc(refs.drive_times.url)}" target="_blank" rel="noopener">${esc(refs.drive_times.label||'Origin drive-time reference')}</a><span class="source-state ok">planning estimate · not live traffic</span></div>`);
    if(d.failures?.length){$('sourceList').insertAdjacentHTML('beforeend',`<div class="error-panel"><strong>Degraded inputs:</strong> ${d.failures.map(x=>esc(x.source||x.name||x.message||x.error||'source unavailable')).join(' · ')}</div>`);}
  }

  function renderMapPoints(d){
    const refresh=state.mapWasOpened;
    state.mapPoints=d.map_points||[];
    state.routeIds=d.map?.recommended_stop_ids||[];
    if(refresh){
      try{state.mapInstance?.remove();}catch{}
      state.mapInstance=null;state.mapLoaded=false;
      const host=$('map');if(host){host.className='map-placeholder';host.innerHTML='<div><strong>Your itinerary changed.</strong><p>Refreshing the route and recommended stops…</p></div>';}
      buildMap();
    }
  }
  function renderAll(d){state.data=d;renderTop(d);renderWhy(d);renderFerries(d);renderConditions(d);renderCrowdsOpen(d);renderSeasonal(d);renderPlanner(d);renderSources(d);renderMapPoints(d);}

  async function loadDecision(){
    $('decisionPanel').setAttribute('aria-busy','true');
    try{const r=await fetch(buildUrl(),{headers:{accept:'application/json'}});const j=await r.json();if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);renderAll(j);track('mackinac_decision_loaded',{score:j.decision?.score,engine:j.decision?.engine,planning_mode:j.planning_mode,origin:j.ferry?.recommended_plan?.origin_port||'none'});}
    catch(err){
      $('planningBanner').hidden=false;$('planningBanner').textContent='Live decision unavailable. Use the official ferry operator links below before relying on departure times.';
      setText('verdict','LIVE DATA DEGRADED');setText('confidence','No recommendation is being invented');setText('primaryRec','We could not verify enough live inputs to build a reliable plan.');
      $('sourceList').innerHTML=`<div class="error-panel">${esc(err.message)}. <a href="https://www.arnoldtransitcompany.com/summer-schedule/" target="_blank" rel="noopener">Arnold schedule</a> · <a href="https://www.sheplersferry.com/" target="_blank" rel="noopener">Shepler’s schedule</a></div>`;
    } finally{$('decisionPanel').setAttribute('aria-busy','false');}
  }

  function loadLeaflet(){
    if(window.L)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      if(!document.querySelector('link[data-mackinac-leaflet]')){const css=document.createElement('link');css.rel='stylesheet';css.dataset.mackinacLeaflet='1';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(css);}
      const existing=document.querySelector('script[data-mackinac-leaflet]');
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
      const scr=document.createElement('script');scr.dataset.mackinacLeaflet='1';scr.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';scr.onload=resolve;scr.onerror=reject;document.head.appendChild(scr);
    });
  }
  async function buildMap(){
    const btn=$('loadMap');
    if(!state.data){btn.disabled=false;btn.textContent='Load planning map';return;}
    btn.disabled=true;btn.textContent='Loading map…';
    try{await loadLeaflet();const host=$('map');host.className='leaflet-map';host.innerHTML='';const map=L.map(host,{scrollWheelZoom:false}).setView([45.852,-84.617],13);state.mapInstance=map;state.mapLoaded=true;state.mapWasOpened=true;L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
      const points=state.mapPoints?.length?state.mapPoints:[{id:'downtown',name:'Downtown / ferry docks',lat:45.8492,lon:-84.6176},{id:'fort',name:'Fort Mackinac',lat:45.8527,lon:-84.6177},{id:'arch-rock',name:'Arch Rock',lat:45.8548,lon:-84.5936},{id:'british-landing',name:'British Landing',lat:45.8731,lon:-84.6411},{id:'grand-hotel',name:'Grand Hotel',lat:45.8498,lon:-84.6294}];
      const routeIds=Array.isArray(state.routeIds)?state.routeIds:[];
      const orderedUnique=[...new Set(routeIds.filter(Boolean))];
      const byId=new Map(points.map(p=>[p.id,p]));
      const itineraryPoints=orderedUnique.map(id=>byId.get(id)).filter(Boolean);
      points.forEach(p=>{
        const planned=orderedUnique.includes(p.id);
        const marker=planned
          ? L.circleMarker([p.lat||p.latitude,p.lon||p.longitude],{radius:8,weight:3,fillOpacity:.85})
          : L.marker([p.lat||p.latitude,p.lon||p.longitude]);
        marker.addTo(map).bindPopup(`<strong>${esc(p.name)}</strong>${planned?'<br><em>In your recommended itinerary</em>':''}${(p.note||p.detail)?`<br>${esc(p.note||p.detail)}`:''}`);
      });
      if(itineraryPoints.length>=2){
        L.polyline(itineraryPoints.map(p=>[p.lat||p.latitude,p.lon||p.longitude]),{weight:3,dashArray:'7 7',opacity:.75})
          .addTo(map)
          .bindTooltip('Your itinerary · orientation only, not turn-by-turn routing');
      }
      const loop=[[45.849,-84.618],[45.848,-84.600],[45.855,-84.587],[45.870,-84.588],[45.884,-84.610],[45.879,-84.639],[45.865,-84.655],[45.849,-84.645],[45.849,-84.618]];
      if(routeIds.includes('m185')) L.polyline(loop,{weight:4,opacity:.75}).addTo(map).bindTooltip('M-185 perimeter · approximate orientation');
      if(itineraryPoints.length) map.fitBounds(L.latLngBounds(itineraryPoints.map(p=>[p.lat||p.latitude,p.lon||p.longitude])).pad(.25),{maxZoom:14});
      btn.textContent='Map loaded';track('mackinac_map_opened',{points:points.length,itinerary_points:itineraryPoints.length});
    }catch(e){btn.disabled=false;btn.textContent='Retry map';$('map').innerHTML='<div><strong>Interactive map could not load.</strong><p>The movement notes remain available and the live decision does not depend on the map provider.</p></div>';state.mapLoaded=false;state.mapInstance=null;}
  }
  $('loadMap').addEventListener('click',buildMap);
  const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)&&!state.mapLoaded&&state.data)buildMap();},{rootMargin:'200px'});observer.observe($('map-section'));

  $('sharePlan').addEventListener('click',async()=>{
    const d=state.data,plan=d?.ferry?.recommended_plan;if(!d||!plan)return;
    const text=`Our Mackinac plan: ${plan.departure_time} from ${plan.origin_port}, island arrival ${plan.arrival_time}, return ${d.ferry?.recommended_return?.departure_time||'check schedule'}. ${location.href}`;
    try{if(navigator.share)await navigator.share({title:'Our Mackinac Day',text,url:location.href});else{await navigator.clipboard.writeText(text);$('sharePlan').textContent='Copied';setTimeout(()=>$('sharePlan').textContent='Share plan',1600);}track('mackinac_share_plan',{method:navigator.share?'native':'clipboard'});}catch{}
  });

  document.addEventListener('click',e=>{const a=e.target.closest('#ferries a');if(a)track('mackinac_ferry_compared',{});});
  loadDecision();
})();
