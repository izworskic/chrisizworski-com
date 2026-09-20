(() => {
  'use strict';
  const API='/api/mackinac-island';
  const ORIGIN_API='/api/mackinac-origin';
  const state={personas:new Set(['day-trip']),origin:'lower',originResolved:null,originQuery:'',tripDate:'',departTime:'',data:null,mapLoaded:false,mapInstance:null,mapWasOpened:false,mapPoints:[],routeIds:[]};
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const track=(name,params={})=>{try{if(typeof window.gtag==='function')window.gtag('event',name,params);}catch{}};
  const clock=m=>{if(!Number.isFinite(Number(m)))return '—';let n=((Number(m)%1440)+1440)%1440,h=Math.floor(n/60),min=n%60,s=h>=12?'PM':'AM';h=h%12||12;return `${h}:${String(min).padStart(2,'0')} ${s}`;};
  const labelScore=n=>n>=84?'EXCELLENT':n>=74?'GOOD':n>=62?'FAIR':n>=48?'MARGINAL':'POOR';
  const setText=(id,v)=>{const el=$(id);if(el)el.textContent=v??'—';};
  const selectedPersonas=()=>[...state.personas];
  const OPTIONAL_FAILURES=new Set(['fall_color','attractions']);
  const failureKey=x=>String(x?.source||x?.name||'').trim().toLowerCase();
  const optionalFailures=d=>(d?.failures||[]).filter(x=>OPTIONAL_FAILURES.has(failureKey(x)));
  const coreFailures=d=>(d?.failures||[]).filter(x=>!OPTIONAL_FAILURES.has(failureKey(x)));
  const cleanOrigin=s=>String(s||'').trim().replace(/\s+/g,' ').slice(0,100);
  const driveLabel=m=>{const n=Math.max(0,Math.round(Number(m)||0));const h=Math.floor(n/60),min=n%60;return h?`${h} hr${min?` ${min} min`:''}`:`${min} min`;};
  const inputTimeMinutes=value=>{const m=String(value||'').match(/^(\d{1,2}):(\d{2})$/);if(!m)return null;const h=Number(m[1]),min=Number(m[2]);return h>=0&&h<=23&&min>=0&&min<=59?h*60+min:null;};
  function syncOriginInputs(value){
    const v=String(value||'');
    if($('originCityInput')&&$('originCityInput').value!==v)$('originCityInput').value=v;
    if($('heroOriginInput')&&$('heroOriginInput').value!==v)$('heroOriginInput').value=v;
  }
  function syncTripDateInputs(value){
    const v=String(value||'').trim();
    state.tripDate=v;
    if($('tripDate')&&$('tripDate').value!==v)$('tripDate').value=v;
    if($('heroTripDate')&&$('heroTripDate').value!==v)$('heroTripDate').value=v;
  }
  function syncDepartInputs(value){
    const v=String(value||'').trim();
    state.departTime=v;
    if($('departTime')&&$('departTime').value!==v)$('departTime').value=v;
    if($('heroDepartTime')&&$('heroDepartTime').value!==v)$('heroDepartTime').value=v;
  }
  function setOriginStatus(text,kind=''){
    const el=$('heroOriginStatus');if(!el)return;el.textContent=text;el.className=`origin-status${kind?` ${kind}`:''}`;
  }
  function syncOriginSide(){
    document.querySelectorAll('#originSwitch button').forEach(x=>{const a=x.dataset.origin===state.origin;x.classList.toggle('active',a);x.setAttribute('aria-pressed',String(a));});
  }
  const dateLabel=value=>{
    if(!value)return '—';
    const d=new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  };
  const detroitToday=()=>{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value||'';
    return `${get('year')}-${get('month')}-${get('day')}`;
  };
  function syncTripModeUi(){
    const overnight=$('tripMode')?.value==='overnight'||state.personas.has('overnight');
    const field=$('nightCountField'),input=$('nightCount');
    if(field)field.hidden=!overnight;
    if(input){input.disabled=!overnight;if(!overnight)input.value='1';}
  }
  function returnPlanText(d){
    const f=d?.ferry||{},rp=f.return_plan||{},profile=d?.trip_profile||{};
    if(profile.trip!=='overnight')return f.recommended_return?.departure_time||'No feasible return';
    const day=dateLabel(rp.return_date);
    if(rp.mode==='deadline'&&rp.recommended)return `${day} · ${rp.recommended.departure_time}`;
    if(rp.mode==='deadline-unmet')return `${day} · deadline unmet`;
    if(rp.mode==='unavailable')return `${day} · schedule unavailable`;
    return `${day} · flexible`;
  }
  function clearResolvedOrigin({clearInputs=false}={}){
    state.originResolved=null;state.originQuery='';
    if(clearInputs)syncOriginInputs('');
    setText('heroLeave','Add date + city + time');
    setOriginStatus('Choose the trip date, starting city and leave-home time for a drive-aware ferry plan.');
  }
  function originMatches(value){
    const q=cleanOrigin(value).toLowerCase();
    if(!q||!state.originResolved)return false;
    return q===cleanOrigin(state.originQuery).toLowerCase()||q===cleanOrigin(state.originResolved.origin?.label).toLowerCase();
  }
  async function resolveOrigin(value,{reload=true,source='trip-at-a-glance'}={}){
    const q=cleanOrigin(value);
    if(!q){clearResolvedOrigin({clearInputs:true});if(reload)loadDecision();return true;}
    setOriginStatus('Finding that city and comparing both ferry ports…','loading');
    const submit=$('heroOriginSubmit');if(submit)submit.disabled=true;
    try{
      const r=await fetch(`${ORIGIN_API}?q=${encodeURIComponent(q)}`,{headers:{accept:'application/json'}});
      const j=await r.json();if(!r.ok)throw new Error(j.detail||j.error||`HTTP ${r.status}`);
      state.originResolved=j;state.originQuery=q;state.origin=j.preferred_port==='St. Ignace'?'upper':'lower';
      syncOriginInputs(j.origin?.label||q);syncOriginSide();
      const alt=(j.routes||[]).find(x=>x.port!==j.preferred_port);
      const alternate=alt&&Number.isFinite(Number(alt.drive_minutes))?` · ${alt.port} ${driveLabel(alt.drive_minutes)}`:'';
      setOriginStatus(`${j.origin?.label||q} → ${j.preferred_port} about ${driveLabel(j.drive_minutes)}${alternate}. Add the trip date and leave-home time so the planner can choose the actual reachable ferry.`,'resolved');
      setText('heroLeave',state.departTime?'Calculating…':'Add leave time');
      track('mackinac_start_city_selected',{origin_city:j.origin?.label||q,preferred_port:j.preferred_port,source});
      if(reload&&state.departTime)loadDecision();
      return true;
    }catch(err){
      state.originResolved=null;state.originQuery='';
      setOriginStatus(`Couldn’t resolve “${q}.” Try city + state/province or a ZIP/postal code.`,'error');
      setText('builderStatus','Starting city was not resolved. Add a state/province or ZIP/postal code and try again.');
      return false;
    }finally{if(submit)submit.disabled=false;}
  }
  function plannerParams(){
    const p=new URLSearchParams();
    p.set('personas',selectedPersonas().join(','));
    p.set('origin',state.origin);
    const simple={trip:'tripMode',nights:'nightCount',adults:'adultCount',children:'childCount',bikes:'bikePlan',pace:'pace',mobility:'mobility',dinner:'dinner',return_by:'returnBy',event_start:'eventStart'};
    Object.entries(simple).forEach(([key,id])=>{const el=$(id);if(el&&String(el.value).trim())p.set(key,String(el.value).trim());});
    if(state.originResolved){
      p.set('origin_name',state.originResolved.origin?.label||state.originQuery);
      p.set('origin_drive_minutes',String(state.originResolved.drive_minutes));
      p.set('origin_preferred_port',state.originResolved.preferred_port);
      const mackinaw=(state.originResolved.routes||[]).find(x=>x.port==='Mackinaw City');
      const stIgnace=(state.originResolved.routes||[]).find(x=>x.port==='St. Ignace');
      if(Number.isFinite(Number(mackinaw?.drive_minutes)))p.set('origin_mackinaw_minutes',String(mackinaw.drive_minutes));
      if(Number.isFinite(Number(stIgnace?.drive_minutes)))p.set('origin_st_ignace_minutes',String(stIgnace.drive_minutes));
    }
    if(state.tripDate)p.set('trip_date',state.tripDate);
    if(state.departTime)p.set('depart_at',state.departTime);
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
    syncTripModeUi();
    track('mackinac_persona_selected',{personas:selectedPersonas().join('|')});
    loadDecision();
  }));
  document.querySelectorAll('#originSwitch button').forEach(btn=>btn.addEventListener('click',()=>{
    state.origin=btn.dataset.origin;clearResolvedOrigin({clearInputs:true});syncOriginSide();
    track('mackinac_start_location_entered',{origin:state.origin});loadDecision();
  }));
  $('heroTripDate')?.addEventListener('change',e=>{
    syncTripDateInputs(e.target.value);
    setText('heroLeave',state.tripDate&&state.originResolved&&state.departTime?'Ready to plan':'Add date + city + time');
  });
  $('heroDepartTime')?.addEventListener('change',e=>{
    syncDepartInputs(e.target.value);
    if(state.originResolved)setText('heroLeave',state.tripDate&&state.departTime?'Ready to plan':'Add date + city + time');
  });
  $('heroOriginForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const originText=cleanOrigin($('heroOriginInput')?.value);
    syncTripDateInputs($('heroTripDate')?.value||'');
    syncDepartInputs($('heroDepartTime')?.value||'');
    if(!state.tripDate){
      setOriginStatus('Choose the trip date first.','error');
      setText('heroLeave','Add date + city + time');
      return;
    }
    if(!originText){
      setOriginStatus('Enter your starting city first.','error');
      setText('heroLeave','Add date + city + time');
      return;
    }
    if(!originMatches(originText)){
      const ok=await resolveOrigin(originText,{reload:false,source:'trip-at-a-glance'});
      if(!ok)return;
    }
    if(!state.departTime){
      setText('heroLeave','Add leave time');
      setOriginStatus('Date and starting city are set. Add the time you plan to leave home to calculate the reachable ferry and island arrival.','error');
      return;
    }
    setText('heroLeave','Calculating…');
    setOriginStatus(`Planning ${dateLabel(state.tripDate)} from ${state.originResolved?.origin?.label||state.originQuery}: drive to both ports, check-in timing, ferry wait and island arrival…`,'loading');
    loadDecision();
  });
  $('tripBuilder')?.addEventListener('submit',async e=>{
    e.preventDefault();
    setText('builderStatus','Rebuilding ferry choice and itinerary from your constraints…');
    const originText=cleanOrigin($('originCityInput')?.value);
    syncTripDateInputs($('tripDate')?.value||'');
    syncDepartInputs($('departTime')?.value||'');
    if(!state.tripDate){
      setText('builderStatus','Add the trip date before building the trip.');
      setText('leaveHome','Add date + city + time');
      return;
    }
    if(!originText){
      setText('builderStatus','Enter starting location before building the trip.');
      setText('leaveHome','Add date + city + time');
      return;
    }
    if(originText&&!originMatches(originText)){
      const ok=await resolveOrigin(originText,{reload:false,source:'full-planner'});
      if(!ok)return;
    }
    if(!state.departTime){
      setText('builderStatus','Add the time you plan to leave home. Ferry feasibility depends on it.');
      setText('leaveHome','Add leave time');
      setText('heroLeave','Add leave time');
      return;
    }
    track('mackinac_itinerary_created',{personas:selectedPersonas().join('|'),trip_date:state.tripDate,origin_city:state.originResolved?.origin?.label||'none',depart_at:state.departTime,children:Number($('childCount')?.value||0),bikes:$('bikePlan')?.value||'none',pace:$('pace')?.value||'balanced'});
    loadDecision();
  });
  $('tripBuilder')?.addEventListener('change',e=>{
    if(e.target?.id==='tripDate')syncTripDateInputs(e.target.value);
    if(e.target?.id==='departTime')syncDepartInputs(e.target.value);
    if(e.target?.id==='tripMode'){
      const trip=e.target.value;
      state.personas.delete(trip==='overnight'?'day-trip':'overnight');
      state.personas.add(trip);
      document.querySelectorAll('#personaChips .chip').forEach(x=>{const a=state.personas.has(x.dataset.persona);x.classList.toggle('active',a);x.setAttribute('aria-pressed',String(a));});
      syncTripModeUi();
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
    if(d.planning_mode==='tomorrow'){banner.hidden=false;banner.textContent=d.planning_reason||`Today’s useful day-trip window has closed. Planning ${d.plan_date_label||'tomorrow'} instead.`;$('page-title').textContent='Mackinac Island Tomorrow';}
    else if(d.planning_mode==='selected-date'){
      const selectedToday=d.target_date===d.local_now?.date;
      banner.hidden=selectedToday&&!d.planning_reason;
      banner.textContent=d.planning_reason||`Planning ${dateLabel(d.target_date)} from your selected trip date.`;
      $('page-title').textContent=selectedToday?'Mackinac Island Today':`Mackinac Island · ${dateLabel(d.target_date)}`;
    } else {banner.hidden=true;$('page-title').textContent='Mackinac Island Today';}
    setText('bestArrival',plan.arrival_time||'No verified plan');
    setText('crowdsTop',d.crowds?.label||'—');
    setText('bikeTop',d.bike?`${d.bike.label} · ${Math.round(d.bike.score||0)}/100`:'—');
    setText('weatherTop',d.weather?.visitor_summary||'Forecast unavailable');
    setText('marineTop',d.marine?.comfort_label||'Observation unavailable');
    setText('returnTop',returnPlanText(d));
    const rp=d.ferry?.return_plan||{};
    setText('lastTop',d.ferry?.last_scheduled_return
      ? `${d.trip_profile?.trip==='overnight'?`Last ${dateLabel(rp.return_date)}`:'Last scheduled'}: ${d.ferry.last_scheduled_return.departure_time}`
      : d.trip_profile?.trip==='overnight'?'Return-day schedule unavailable':'Last scheduled: unavailable');
    const port=plan.origin_port||'the better mainland port';
    const dep=plan.departure_time||'a verified departure';
    $('primaryRec').innerHTML=plan.departure_time?`<strong>Take the ${esc(dep)} from ${esc(port)}.</strong> ${esc(dec.primary_reason||'This preserves the strongest usable island window.')}`:'<strong>No verified ferry recommendation.</strong> Use the official operator links below before leaving.';
    const profile=d.trip_profile||{};
    if(profile.trip_date)syncTripDateInputs(profile.trip_date);
    if(state.originResolved?.origin?.label)syncOriginInputs(state.originResolved.origin.label);
    const party=`${Number(profile.adults||2)} adult${Number(profile.adults||2)===1?'':'s'}${Number(profile.children||0)?` + ${profile.children} child${Number(profile.children)===1?'':'ren'}`:''}`;
    const priorities=[...(profile.interests||[]),...(profile.must_do||[]).map(x=>`must: ${x}`)].slice(0,3);
    setText('heroTripContext',[party,profile.trip==='overnight'?`${profile.nights||1} night${Number(profile.nights||1)===1?'':'s'}`:'day trip',priorities.length?priorities.join(' · '):null].filter(Boolean).join(' · '));
    setText('heroLeave',d.leave_home?.time||(state.tripDate&&state.originResolved&&state.departTime?'No reachable ferry':'Add date + city + time'));
    setText('heroFerry',plan.departure_time?`${plan.departure_time} · ${plan.origin_port}`:'No verified ferry');
    setText('heroIsland',plan.arrival_time||'—');
    setText('heroReturn',returnPlanText(d));
    if(state.tripDate&&state.originResolved&&state.departTime){
      const j=d.journey||{};
      const leave=j.leave_time||clock(inputTimeMinutes(state.departTime));
      const drive=Number.isFinite(Number(j.mainland_drive_minutes))?driveLabel(j.mainland_drive_minutes):'drive time unavailable';
      const wait=Number.isFinite(Number(j.pre_ferry_idle_minutes))?` · ${Math.round(j.pre_ferry_idle_minutes)} min before check-in window`:'';
      setOriginStatus(plan.departure_time
        ? `${dateLabel(j.trip_date||state.tripDate)} · ${j.origin_label||state.originResolved.origin?.label||state.originQuery} ${leave} → ${j.ferry_port||plan.origin_port} (${drive})${wait} → ${j.ferry_departure||plan.departure_time} ferry → ${j.island_arrival||plan.arrival_time} island.`
        : `${dateLabel(state.tripDate)} · ${state.originResolved.origin?.label||state.originQuery} at ${clock(inputTimeMinutes(state.departTime))}. No published ferry is reachable under the current constraints.`,
        plan.departure_time?'resolved':'error');
    }
    const f=d.generated_at?new Date(d.generated_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'—';
    const optional=optionalFailures(d),core=coreFailures(d);
    const sourceNote=core.length?'Core source gap — verify sources below':optional.length?'Core ferry/weather plan available · optional planning feeds limited':'Core inputs available';
    setText('freshLine',`Decision generated ${f} ET · ${sourceNote}`);
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
    const rp=f.return_plan||{};
    setText('recommendedReturn',returnPlanText(d));
    setText('literalLast',f.last_scheduled_return?`${dateLabel(rp.return_date)} · ${f.last_scheduled_return.departure_time}`:'Unavailable');
    setText('returnReason',f.return_reason||'Return timing depends on the trip duration and any deadline you supplied.');
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
    const days=d.trip_days||[];
    const dayHost=$('tripDays');
    if(dayHost)dayHost.innerHTML=days.length?days.map(x=>`<article class="trip-day ${esc(x.role||'')}"><span>Day ${esc(x.day)} · ${esc(dateLabel(x.date))}</span><strong>${esc(x.title||'Trip day')}</strong><p>${esc(x.summary||'')}</p></article>`).join(''):'';
    $('itinerary').innerHTML=it.length?it.map(x=>`<li><time>${esc(x.time||'')}</time><div><strong>${esc(x.title||x.label||'Plan stop')}</strong>${x.movement?`<span class="movement">${esc(x.movement)}</span>`:''}<p>${esc(x.detail||'')}</p></div></li>`).join(''):'<li><time>—</time><div><strong>No complete itinerary</strong><p>Use the official ferry source links before leaving.</p></div></li>';
    setText('plannerExplain',d.itinerary_reason||'');
    setText('leaveHome',d.leave_home?.time||(state.tripDate&&state.originResolved&&state.departTime?'No reachable ferry':'Add date + city + time'));
    setText('leaveHomeNote',d.leave_home?.detail||(state.tripDate&&state.originResolved&&state.departTime?'No ferry in the verified schedule can be reached from that city on that date after your entered leave-home time.':'Enter the trip date, starting city and leave-home time. Drive estimates are not live traffic.'));
    const party=`${Number(p.adults||2)} adult${Number(p.adults||2)===1?'':'s'}${Number(p.children||0)?` + ${p.children} child${Number(p.children)===1?'':'ren'}`:''}`;
    const fit=[party,p.trip==='overnight'?`${p.nights||1} night${Number(p.nights||1)===1?'':'s'}`:'day trip',p.pace?`${p.pace} pace`:null,p.bikes&&p.bikes!=='none'?`${p.bikes} bikes`:null,p.mobility==='limited'?'limited steep walking':null].filter(Boolean);
    setText('tripFit',fit.join(' · '));
    const priorities=[...(p.interests||[]),...(p.must_do||[]).map(x=>`must: ${x}`)];
    setText('tripFitNote',priorities.length?`Priorities: ${priorities.join(', ')}.`:`Using the selected visitor modes plus live ferry/weather constraints.`);
    const optional=optionalFailures(d),core=coreFailures(d);
    setText('builderStatus',core.length?'Trip rebuilt, but a core source needs rechecking below.':optional.length?'Trip rebuilt. Core ferry/weather planning is available; some optional context is limited.':'Trip rebuilt from the current live decision bundle.');
  }

  function renderSources(d){
    const src=d.sources||{},optional=optionalFailures(d),core=coreFailures(d);
    setText('overallDataState',core.length?'CORE SOURCE GAP':optional.length?'CORE SOURCES AVAILABLE · OPTIONAL CONTEXT LIMITED':'CORE SOURCES AVAILABLE');
    const order=Object.entries(src);$('sourceList').innerHTML=order.length?order.map(([k,s])=>`<div class="source-row"><a href="${esc(s.url||'#')}" target="_blank" rel="noopener">${esc(s.name||k.replace(/_/g,' '))}</a><span class="source-state ${s.available?'ok':'warn'}">${esc(s.status_label||(s.available?'available':'unavailable'))}</span></div>`).join(''):'<p>No source-provenance payload was returned.</p>';
    const refs=d.planning_references||{};
    if(refs.accessibility?.url)$('sourceList').insertAdjacentHTML('beforeend',`<div class="source-row"><a href="${esc(refs.accessibility.url)}" target="_blank" rel="noopener">${esc(refs.accessibility.name||'Accessibility planning source')}</a><span class="source-state ok">planning reference</span></div>`);
    if(refs.ferry_ticket_flexibility?.url)$('sourceList').insertAdjacentHTML('beforeend',`<div class="source-row"><a href="${esc(refs.ferry_ticket_flexibility.url)}" target="_blank" rel="noopener">${esc(refs.ferry_ticket_flexibility.name||'Ferry ticket flexibility')}</a><span class="source-state ok">flexible ticket reference</span></div>`);
    if(refs.drive_times?.url)$('sourceList').insertAdjacentHTML('beforeend',`<div class="source-row"><a href="${esc(refs.drive_times.url)}" target="_blank" rel="noopener">${esc(refs.drive_times.label||'Origin drive-time reference')}</a><span class="source-state ok">planning estimate · not live traffic</span></div>`);
    if(core.length)$('sourceList').insertAdjacentHTML('beforeend','<div class="error-panel"><strong>Core source check needed.</strong> Recheck the unavailable ferry or weather source before relying on the plan.</div>');
    else if(optional.length)$('sourceList').insertAdjacentHTML('beforeend','<div class="source-note"><strong>Optional planning context is limited right now.</strong> The ferry and weather decision remains available; unavailable optional sources are labeled above.</div>');
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
      setText('heroTripContext','Live planning unavailable');setText('heroLeave','Unavailable');setText('heroFerry','Unavailable');setText('heroIsland','Unavailable');setText('heroReturn','Unavailable');
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
    const text=`Our Mackinac plan: ${plan.departure_time} from ${plan.origin_port}, island arrival ${plan.arrival_time}, return ${returnPlanText(d)}. ${location.href}`;
    try{if(navigator.share)await navigator.share({title:'Our Mackinac Trip',text,url:location.href});else{await navigator.clipboard.writeText(text);$('sharePlan').textContent='Copied';setTimeout(()=>$('sharePlan').textContent='Share plan',1600);}track('mackinac_share_plan',{method:navigator.share?'native':'clipboard'});}catch{}
  });

  document.addEventListener('click',e=>{const a=e.target.closest('#ferries a');if(a)track('mackinac_ferry_compared',{});});
  syncTripDateInputs(detroitToday());
  syncTripModeUi();
  loadDecision();
})();
