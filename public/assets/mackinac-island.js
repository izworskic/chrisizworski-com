(() => {
  'use strict';
  const API='/api/mackinac-island';
  const ORIGIN_API='/api/mackinac-origin';
  const PROFILE_API='/api/mackinac-profile';
  const PROFILE_STORAGE_KEY='mackinac-trip-profile-v1';
  const state={personas:new Set(['day-trip']),origin:'lower',originResolved:null,originQuery:'',originRequestId:0,tripDate:'',departTime:'',data:null,mapLoaded:false,mapInstance:null,mapWasOpened:false,mapPoints:[],routeIds:[],webcamSelectedId:null,webcamHls:null,intakeSchema:null,intakeAnswers:{},intakeStep:0,tripProfile:null,adaptiveAsked:false};
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

  const TAB_TARGETS={
    'my-trip':'#planner','live':'#conditions','getting-there':'#ferries','island':'#crowds-open',
    'map':'#map-section','stay':'#stay-guide','eat':'#eat-guide','events':'#seasonal','around-straits':'#straits-guide'
  };
  function storageGet(){
    try{const raw=localStorage.getItem(PROFILE_STORAGE_KEY);return raw?JSON.parse(raw):null;}catch{return null;}
  }
  function storageSet(){
    try{localStorage.setItem(PROFILE_STORAGE_KEY,JSON.stringify({answers:state.intakeAnswers,profile:state.tripProfile,saved_at:Date.now()}));}catch{}
  }
  function storageClear(){try{localStorage.removeItem(PROFILE_STORAGE_KEY);}catch{}}
  function profileFocusLabels(profile){
    const v=profile?.vector||{},items=[];
    if(v.crowd_avoidance>=.75)items.push('Avoid crowds');
    if(v.outdoors>=.78)items.push('Outdoor-first');
    if(v.history>=.78)items.push('History matters');
    if(v.food>=.75)items.push('Food matters');
    if(v.photography>=.78)items.push('Scenery + light');
    if(v.kids_priority>=.7)items.push('Kid-friendly pacing');
    if(v.walking_tolerance<=.3)items.push('Limit walking');
    if(v.budget_sensitivity>=.78)items.push('Protect value');
    if(v.special_occasion>=.75)items.push('Special occasion');
    if(v.regional_exploration>=.75)items.push('Explore the Straits');
    return items.slice(0,4);
  }
  function renderTripTabs(profile){
    const wrap=$('tripTabsWrap'),host=$('tripTabs');if(!wrap||!host||!profile)return;
    const tabs=(profile.tabs||[]).filter(t=>TAB_TARGETS[t.id]&&document.querySelector(TAB_TARGETS[t.id]));
    host.innerHTML=tabs.map((t,i)=>`<button class="trip-tab${i===0?' primary':''}" type="button" data-trip-tab="${esc(t.id)}" data-target="${esc(TAB_TARGETS[t.id])}">${esc(t.label)}</button>`).join('');
    setText('tripTabsProfile',profile.primary?.label||'your trip');
    wrap.hidden=false;
    host.querySelectorAll('[data-trip-tab]').forEach(btn=>btn.addEventListener('click',()=>{
      const target=btn.dataset.target;scrollToTarget(target);
      track('mackinac_tab_opened',{tab:btn.dataset.tripTab,profile:profile.primary?.id||'unknown'});
    }));
  }
  function renderDepthGuides(profile){
    if(!profile)return;const v=profile.vector||{},a=profile.answers||{};
    const overnight=['one-night','two-three','four-plus'].includes(a.trip_duration);
    setText('stayGuideText',overnight
      ? (v.crowd_avoidance>=.72?'Your profile favors getting value from the Island after day-trip crowds ease. Compare quiet location against the convenience of staying downtown.':'Your stay should minimize friction between lodging, meals and the experiences you care about most.')
      : 'This profile is a day trip, so lodging stays out of the way unless you decide the quiet evening and early morning are worth adding a night.');
    const stayCards=$('stayGuideCards');if(stayCards)stayCards.innerHTML=[
      ['Location',v.crowd_avoidance>=.72?'Quiet after the ferries':'Convenient to your day','Use location as a trip decision, not just a room filter.'],
      ['Experience',v.special_occasion>=.68?'Make the stay part of the memory':'Keep lodging proportional','Resort, historic inn, B&B or simple room should match why you are here.'],
      ['Trip length',overnight?'Use the no-ferry hours':'Day trip stays lean',overnight?'Early and late Island time is part of the value.':'Do not let lodging research distract from a same-day plan.']
    ].map(x=>`<article class="depth-card"><span>${esc(x[0])}</span><strong>${esc(x[1])}</strong><p>${esc(x[2])}</p></article>`).join('');
    setText('eatGuideText',v.food>=.72?'Food is part of the experience for this profile, so the itinerary should protect a real meal window instead of squeezing one in wherever there is a gap.':v.kids_priority>=.7?'Meals should protect energy and avoid letting hunger become the thing that breaks the day.':'Meals should fit the route and crowd pattern rather than forcing unnecessary backtracking.');
    const eatCards=$('eatGuideCards');if(eatCards)eatCards.innerHTML=[
      ['Timing',v.crowd_avoidance>=.72?'Favor off-peak windows':'Fit the route first',v.crowd_avoidance>=.72?'Shift the meal when that buys you a calmer Island experience.':'Avoid crossing the Island just to satisfy a rigid meal clock.'],
      ['Pace',v.food>=.72?'Protect 60–90 minutes':'Keep it flexible',v.food>=.72?'A real meal belongs in the plan.':'Use a shorter meal when activities matter more.'],
      ['Party',v.kids_priority>=.7?'Easy + forgiving':'Match the occasion',v.kids_priority>=.7?'Shorter waits and flexible menus matter more with kids.':v.special_occasion>=.68?'The meal can be one of the anchor experiences.':'Let location and timing do most of the work.']
    ].map(x=>`<article class="depth-card"><span>${esc(x[0])}</span><strong>${esc(x[1])}</strong><p>${esc(x[2])}</p></article>`).join('');
    setText('straitsGuideText',v.regional_exploration>=.72?'This profile has enough time and appetite for a broader Straits trip. We’ll favor stops that lie naturally on your approach or departure instead of creating side-trip sprawl.':v.regional_exploration<=.2?'Keep this one Island-focused. Mainland stops should only appear when they solve a timing or weather problem.':'Treat Mackinaw City and St. Ignace as useful gateways, not mandatory add-ons. Add a mainland stop only when it fits the route or fills otherwise dead time.');
  }
  function renderProfile(profile){
    state.tripProfile=profile;if(!profile)return;
    const card=$('tripProfileCard');if(card)card.hidden=false;
    setText('tripProfileName',profile.primary?.label||'Your Mackinac trip');
    setText('tripProfileSummary',profile.primary?.summary||'We’ll shape the trip around your answers.');
    const focus=$('tripProfileFocus');if(focus)focus.innerHTML=profileFocusLabels(profile).map(x=>`<span>${esc(x)}</span>`).join('');
    const work=$('intakeWork');if(work)work.hidden=true;
    const reset=$('intakeReset');if(reset)reset.hidden=false;
    renderTripTabs(profile);renderDepthGuides(profile);storageSet();
    track('mackinac_profile_classified',{profile:profile.primary?.id||'unknown',engine:profile.engine||'unknown',confidence:profile.jev_confidence??profile.confidence??0});
    if(profile.next_question&&!state.adaptiveAsked)renderAdaptiveQuestion(profile.next_question);
    else if($('adaptiveQuestion'))$('adaptiveQuestion').hidden=true;
  }
  function renderAdaptiveQuestion(q){
    const host=$('adaptiveQuestion');if(!host||!q)return;
    host.hidden=false;
    host.innerHTML=`<strong>One thing would sharpen this plan: ${esc(q.prompt)}</strong><div class="adaptive-options">${(q.options||[]).map(([value,label])=>`<button type="button" data-adaptive-value="${esc(value)}" data-adaptive-id="${esc(q.id)}">${esc(label)}</button>`).join('')}</div><button class="text-button" type="button" id="adaptiveSkip">Skip this</button>`;
    track('mackinac_adaptive_question_shown',{question:q.id});
    host.querySelectorAll('[data-adaptive-value]').forEach(btn=>btn.addEventListener('click',async()=>{
      state.intakeAnswers[btn.dataset.adaptiveId]=btn.dataset.adaptiveValue;state.adaptiveAsked=true;
      await classifyIntake({scroll:false});
    }));
    host.querySelector('#adaptiveSkip')?.addEventListener('click',()=>{state.adaptiveAsked=true;host.hidden=true;storageSet();});
  }
  function syncPersonaButtons(){
    document.querySelectorAll('#personaChips .chip').forEach(x=>{const active=state.personas.has(x.dataset.persona);x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));});
  }
  function setChecked(selector,values){
    const wanted=new Set(values||[]);document.querySelectorAll(selector).forEach(input=>{input.checked=wanted.has(input.value);});
  }
  function applyProfileToPlanner(profile){
    const a=profile?.answers||state.intakeAnswers||{},v=profile?.vector||{};
    const mode=$('tripMode'),nights=$('nightCount');
    if(a.trip_duration==='day'){if(mode)mode.value='day-trip';state.personas=new Set(['day-trip']);}
    else if(['one-night','two-three','four-plus'].includes(a.trip_duration)){
      if(mode)mode.value='overnight';state.personas=new Set(['overnight']);
      if(nights)nights.value=a.trip_duration==='one-night'?'1':a.trip_duration==='two-three'?'2':'4';
    }
    const partyDefaults={
      solo:[1,0],couple:[2,0],'family-young':[2,2],'family-teens':[2,2],
      'adults-friends':[3,0],multigenerational:[4,2],'large-group':[6,0]
    };
    const party=partyDefaults[a.party];if(party){if($('adultCount'))$('adultCount').value=party[0];if($('childCount'))$('childCount').value=party[1];}
    const interests=[],must=[];
    for(const vision of a.trip_vision||[]){
      if(vision==='icons')state.personas.add('first-visit');
      if(vision==='biking'){state.personas.add('biking');interests.push('biking');if($('bikePlan'))$('bikePlan').value='rent';}
      if(vision==='history')interests.push('history');
      if(vision==='food-shopping'){interests.push('food','shopping');}
      if(vision==='kids')state.personas.add('kids');
      if(vision==='scenery'){state.personas.add('photography');interests.push('scenery','photography');}
      if(vision==='special')interests.push('food','photography');
      if(vision==='relaxed'&&$('pace'))$('pace').value='easy';
    }
    if(a.party==='family-young'||a.party==='family-teens'||a.party==='multigenerational')state.personas.add('kids');
    if(a.trip_loss==='walking'&&$('mobility'))$('mobility').value='limited';
    if(a.trip_loss==='rushed'&&$('pace'))$('pace').value='easy';
    if(a.trip_loss==='missing')state.personas.add('first-visit');
    if(a.walking_tolerance==='low'&&$('mobility'))$('mobility').value='limited';
    if(a.bike_style&&$('bikePlan'))$('bikePlan').value='rent';
    if(a.bike_style==='hills'&&$('pace'))$('pace').value='active';
    if(v.photography>=.78)state.personas.add('photography');
    setChecked('#interestChoices input',interests);
    setChecked('#mustDoChoices input',must);
    syncPersonaButtons();syncTripModeUi();
  }
  async function classifyIntake({scroll=true}={}){
    if(!$('tripProfileCard'))return;
    $('tripProfileCard').hidden=false;setText('tripProfileName','Building your trip style…');setText('tripProfileSummary','Matching your answers to a planning profile and deciding whether one more question is worth asking.');
    try{
      const r=await fetch(PROFILE_API,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({answers:state.intakeAnswers})});
      const j=await r.json();if(!r.ok||!j.profile)throw new Error(j.error||`HTTP ${r.status}`);
      renderProfile(j.profile);applyProfileToPlanner(j.profile);
      if(scroll)$('tripProfileCard')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(e){
      $('tripProfileCard').hidden=false;setText('tripProfileName','Use the detailed planner below');setText('tripProfileSummary','The quick trip-style classifier is unavailable right now. Your ferry, weather and detailed planning tools still work normally.');
      track('mackinac_profile_error',{message:String(e?.message||e).slice(0,80)});
    }
  }
  function renderIntakeStep(){
    const schema=state.intakeSchema,questions=schema?.base_questions||[];if(!questions.length)return;
    const q=questions[state.intakeStep];if(!q){classifyIntake();return;}
    setText('intakeProgress',`Question ${state.intakeStep+1} of ${questions.length}`);
    const question=$('intakeQuestion'),options=$('intakeOptions'),actions=$('intakeActions');
    if(question)question.innerHTML=`<strong>${esc(q.prompt)}</strong>${q.type==='multi'?'<small>Choose up to two.</small>':''}`;
    const current=q.type==='multi'?new Set(Array.isArray(state.intakeAnswers[q.id])?state.intakeAnswers[q.id]:[]):new Set([state.intakeAnswers[q.id]].filter(Boolean));
    if(options)options.innerHTML=(q.options||[]).map(([value,label])=>`<button type="button" class="intake-option${current.has(value)?' selected':''}" data-intake-value="${esc(value)}">${esc(label)}</button>`).join('');
    if(actions)actions.hidden=q.type!=='multi';
    if($('intakeContinue'))$('intakeContinue').disabled=q.type==='multi'&&current.size===0;
    options?.querySelectorAll('[data-intake-value]').forEach(btn=>btn.addEventListener('click',()=>{
      const value=btn.dataset.intakeValue;
      if(q.type==='multi'){
        const selected=new Set(Array.isArray(state.intakeAnswers[q.id])?state.intakeAnswers[q.id]:[]);
        if(selected.has(value))selected.delete(value);else if(selected.size<Number(q.max||2))selected.add(value);
        state.intakeAnswers[q.id]=[...selected];renderIntakeStep();
      }else{
        state.intakeAnswers[q.id]=value;
        track('mackinac_intake_answered',{question:q.id,answer:value});
        state.intakeStep++;renderIntakeStep();
      }
    }));
  }
  async function initIntake(){
    const restored=storageGet();
    try{
      const r=await fetch(PROFILE_API,{headers:{accept:'application/json'}});const schema=await r.json();if(!r.ok)throw new Error(`HTTP ${r.status}`);
      state.intakeSchema=schema;
      if(restored?.answers&&restored?.profile){
        state.intakeAnswers=restored.answers;state.tripProfile=restored.profile;state.adaptiveAsked=true;
        renderProfile(restored.profile);applyProfileToPlanner(restored.profile);
        setText('intakeProgress','Saved trip style');$('intakeReset').hidden=false;
        return;
      }
      track('mackinac_intake_started',{});renderIntakeStep();
    }catch(e){
      setText('intakeProgress','Quick trip builder unavailable');
      if($('intakeQuestion'))$('intakeQuestion').innerHTML='<strong>Use the detailed planner below.</strong><small>Your live ferry and weather tools are still available.</small>';
    }
  }

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
    setText('heroLeave','Enter date, city + time above');
    setOriginStatus('Add your trip date, starting city and leave time. We’ll compare both ferry ports and line up the smoothest arrival.');
  }
  function originMatches(value){
    const q=cleanOrigin(value).toLowerCase();
    if(!q||!state.originResolved)return false;
    return q===cleanOrigin(state.originQuery).toLowerCase()||q===cleanOrigin(state.originResolved.origin?.label).toLowerCase();
  }
  async function resolveOrigin(value,{reload=true,source='trip-at-a-glance'}={}){
    const q=cleanOrigin(value);
    const requestId=++state.originRequestId;
    if(!q){clearResolvedOrigin({clearInputs:true});if(reload)loadDecision();return true;}
    setOriginStatus('Finding your starting point and comparing both ferry ports…','loading');
    const submit=$('heroOriginSubmit');if(submit)submit.disabled=true;
    try{
      const r=await fetch(`${ORIGIN_API}?q=${encodeURIComponent(q)}`,{headers:{accept:'application/json'}});
      const j=await r.json();if(!r.ok)throw new Error(j.detail||j.error||`HTTP ${r.status}`);
      if(requestId!==state.originRequestId)return false;
      state.originResolved=j;state.originQuery=q;state.origin=j.preferred_port==='St. Ignace'?'upper':'lower';
      syncOriginInputs(j.origin?.label||q);syncOriginSide();
      const alt=(j.routes||[]).find(x=>x.port!==j.preferred_port);
      const alternate=alt&&Number.isFinite(Number(alt.drive_minutes))?` · ${alt.port} ${driveLabel(alt.drive_minutes)}`:'';
      setOriginStatus(`${j.origin?.label||q} → ${j.preferred_port} about ${driveLabel(j.drive_minutes)}${alternate}. Add the trip date and leave-home time so the planner can choose the actual reachable ferry.`,'resolved');
      setText('heroLeave',state.departTime?'Calculating…':'Enter leave time above');
      track('mackinac_start_city_selected',{origin_city:j.origin?.label||q,preferred_port:j.preferred_port,source});
      if(reload&&state.departTime)loadDecision();
      return true;
    }catch(err){
      if(requestId!==state.originRequestId)return false;
      state.originResolved=null;state.originQuery='';
      setOriginStatus(`Couldn’t resolve “${q}.” Try city + state/province or a ZIP/postal code.`,'error');
      setText('builderStatus','Starting city was not resolved. Add a state/province or ZIP/postal code and try again.');
      return false;
    }finally{if(submit)submit.disabled=false;}
  }
  function plannerParams(){
    const p=new URLSearchParams();
    p.set('personas',selectedPersonas().join(','));
    const ia=state.intakeAnswers||{};
    if(ia.trip_duration)p.set('intake_trip_duration',ia.trip_duration);
    if(ia.party)p.set('intake_party',ia.party);
    if(Array.isArray(ia.trip_vision)&&ia.trip_vision.length)p.set('intake_trip_vision',ia.trip_vision.join(','));
    if(ia.trip_loss)p.set('intake_trip_loss',ia.trip_loss);
    for(const key of ['lodging_style','walking_tolerance','bike_style','budget_tradeoff','kids_ages','regional_interest','weather_flexibility'])if(ia[key])p.set(`intake_${key}`,ia[key]);
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

  $('intakeContinue')?.addEventListener('click',()=>{const q=state.intakeSchema?.base_questions?.[state.intakeStep];if(!q)return;const v=state.intakeAnswers[q.id];if(q.type==='multi'&&Array.isArray(v)&&v.length){track('mackinac_intake_answered',{question:q.id,answer:v.join('|')});state.intakeStep++;renderIntakeStep();}});
  $('intakeReset')?.addEventListener('click',()=>{storageClear();state.intakeAnswers={};state.tripProfile=null;state.intakeStep=0;state.adaptiveAsked=false;$('tripProfileCard').hidden=true;$('intakeWork').hidden=false;$('tripTabsWrap').hidden=true;$('intakeReset').hidden=true;track('mackinac_intake_started',{restart:true});renderIntakeStep();});
  $('profileEdit')?.addEventListener('click',()=>{$('tripProfileCard').hidden=true;$('intakeWork').hidden=false;state.intakeStep=0;renderIntakeStep();});
  $('profileBuildTrip')?.addEventListener('click',()=>{applyProfileToPlanner(state.tripProfile);track('mackinac_plan_generated',{profile:state.tripProfile?.primary?.id||'unknown'});loadDecision();scrollToTarget('#planner');});

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
    setText('heroLeave',state.tripDate&&state.originResolved&&state.departTime?'Ready to plan':'Enter date, city + time above');
  });
  $('heroDepartTime')?.addEventListener('change',e=>{
    syncDepartInputs(e.target.value);
    if(state.originResolved)setText('heroLeave',state.tripDate&&state.departTime?'Ready to plan':'Enter date, city + time above');
  });
  $('heroOriginForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const originText=cleanOrigin($('heroOriginInput')?.value);
    syncTripDateInputs($('heroTripDate')?.value||'');
    syncDepartInputs($('heroDepartTime')?.value||'');
    if(!state.tripDate){
      setOriginStatus('Choose your trip date first.','error');
      $('heroTripDate')?.focus();
      setText('heroLeave','Enter date, city + time above');
      return;
    }
    if(!originText){
      setOriginStatus('Enter your starting city first.','error');
      $('heroOriginInput')?.focus();
      setText('heroLeave','Enter date, city + time above');
      return;
    }
    if(!originMatches(originText)){
      const ok=await resolveOrigin(originText,{reload:false,source:'trip-at-a-glance'});
      if(!ok)return;
    }
    if(!state.departTime){
      setText('heroLeave','Enter leave time above');
      $('heroDepartTime')?.focus();
      setOriginStatus('Date and starting city are set. Add the time you’d like to leave home and we’ll line up the ferry.','error');
      return;
    }
    setText('heroLeave','Calculating…');
    setOriginStatus(`Planning ${dateLabel(state.tripDate)} from ${state.originResolved?.origin?.label||state.originQuery}: drive to both ports, check-in timing, ferry wait and island arrival…`,'loading');
    loadDecision();
  });
  $('tripBuilder')?.addEventListener('submit',async e=>{
    e.preventDefault();
    setText('builderStatus','Updating your ferry and Island day around those choices…');
    const originText=cleanOrigin($('originCityInput')?.value);
    syncTripDateInputs($('tripDate')?.value||'');
    syncDepartInputs($('departTime')?.value||'');
    if(!state.tripDate){
      setText('builderStatus','Add your trip date before building the plan.');
      setText('leaveHome','Enter date, city + time above');
      return;
    }
    if(!originText){
      setText('builderStatus','Add your starting city before building the plan.');
      setText('leaveHome','Enter date, city + time above');
      return;
    }
    if(originText&&!originMatches(originText)){
      const ok=await resolveOrigin(originText,{reload:false,source:'full-planner'});
      if(!ok)return;
    }
    if(!state.departTime){
      setText('builderStatus','Add the time you’d like to leave home so we can find the ferry you can comfortably reach.');
      setText('leaveHome','Enter leave time above');
      setText('heroLeave','Enter leave time above');
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
    setText('builderStatus','Your trip details changed. Tap “Build my Island plan” to update the day.');
    track('mackinac_itinerary_changed',{});
  });

  function renderTop(d){
    const dec=d.decision||{}, score=Math.round(dec.score||0), plan=d.ferry?.recommended_plan||{};
    setText('verdict',`${labelScore(score)} — ${score}/100`);
    setText('scoreValue',score||'—');
    $('scoreRing').className='score-ring '+(score>=74?'good':score>=55?'fair':'poor');
    $('scoreRing').setAttribute('aria-label',`Visit score ${score} out of 100`);
    setText('confidence',`${String(dec.confidence||'medium').toUpperCase()} PLAN CONFIDENCE · ferry, weather and timing checked`);
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
    $('primaryRec').innerHTML=plan.departure_time?`<strong>For an easy start, take the ${esc(dep)} from ${esc(port)}.</strong> ${esc(dec.primary_reason||'That gives you a strong window to enjoy the Island without making the day feel rushed.')}`:'<strong>We can’t confidently choose a ferry yet.</strong> Check the operator links below before you head for the dock.';
    const profile=d.trip_profile||{};
    if(profile.trip_date)syncTripDateInputs(profile.trip_date);
    if(state.originResolved?.origin?.label)syncOriginInputs(state.originResolved.origin.label);
    const party=`${Number(profile.adults||2)} adult${Number(profile.adults||2)===1?'':'s'}${Number(profile.children||0)?` + ${profile.children} child${Number(profile.children)===1?'':'ren'}`:''}`;
    const priorities=[...(profile.interests||[]),...(profile.must_do||[]).map(x=>`must: ${x}`)].slice(0,3);
    setText('heroTripContext',[party,profile.trip==='overnight'?`${profile.nights||1} night${Number(profile.nights||1)===1?'':'s'}`:'day trip',priorities.length?priorities.join(' · '):null].filter(Boolean).join(' · '));
    setText('heroLeave',d.leave_home?.time||(state.tripDate&&state.originResolved&&state.departTime?'No reachable ferry':'Enter date, city + time above'));
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
    const sourceNote=core.length?'A key trip detail needs a recheck':optional.length?'Ferry and weather are ready · a few extras are limited':'Trip details checked';
    setText('freshLine',`Updated ${f} ET · ${sourceNote}`);
  }

  function reasonList(id,items){const el=$(id);el.innerHTML=(items&&items.length?items:['No material factor identified.']).slice(0,5).map(x=>`<li>${esc(x)}</li>`).join('');}
  function renderWhy(d){
    const dec=d.decision||{};reasonList('helping',dec.helping);reasonList('hurting',dec.hurting);reasonList('whyFerry',dec.why_ferry);
    setText('engineBadge',dec.engine==='shared-harness-jev'?'Live trip inputs checked':'Live trip inputs checked');
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
    $('ferryPick').innerHTML=plan.departure_time?`<strong>${esc(plan.origin_port)} lines up best for this visit.</strong> Aim for the ${esc(plan.departure_time)} ${esc(plan.operator)} ferry and you should step onto the Island around ${esc(plan.arrival_time)}.`:'<strong>Ferry timing needs a recheck.</strong> We couldn’t verify enough schedule detail to comfortably pick a boat.';
    setText('ferryFreshness',f.freshness?.label||'Schedule status unavailable');
    const ports=f.port_summary||{};
    ['Mackinaw City','St. Ignace'].forEach((name,i)=>{
      const key=i===0?'mackinaw':'stIgnace',p=ports[name]||{};
      setText(`${key}Best`,p.best_departure?`${p.best_departure.departure_time} · ${p.best_departure.operator}`:'No departure verified');
      setText(`${key}Meta`,p.next_departure?`${p.next_departure_origin_adjusted?'Next one you can comfortably reach':'Next available'} ${p.next_departure.departure_time} · ${p.departure_count||0} published departures in this schedule`:'No current departure found');
      const card=$(key+'Card');card?.classList.toggle('recommended',plan.origin_port===name);
      renderTimeline(key+'Timeline',p.departures||[],plan.origin_port===name?plan:null);
    });
    const rp=f.return_plan||{};
    setText('recommendedReturn',returnPlanText(d));
    setText('literalLast',f.last_scheduled_return?`${dateLabel(rp.return_date)} · ${f.last_scheduled_return.departure_time}`:'Unavailable');
    setText('returnReason',f.return_reason||'Your ferry back depends on how long you’re staying and whether you gave us a time you want to be back.');
  }

  function renderConditions(d){
    const w=d.weather||{},m=d.marine||{},b=d.bike||{},a=d.astronomy||{};
    setText('weatherFreshness',w.freshness_label||'NWS forecast');
    setText('islandWeather',w.visitor_summary||'Unavailable');setText('islandWeatherNote',w.detail||'');
    setText('ferryComfort',m.comfort_label||'Unavailable');setText('ferryComfortNote',m.comfort_note||'Marine observations help describe the ride; your ferry operator decides service.');
    setText('bikeWeather',b.label?`${b.label} · ${Math.round(b.score||0)}/100`:'Unavailable');setText('bikeWeatherNote',b.best_window||b.note||'');
    setText('walkingComfort',w.walking?.label||'Unavailable');setText('walkingComfortNote',w.walking?.note||'');
    setText('photoConditions',w.photo?.label||'Unavailable');setText('photoNote',w.photo?.note||'');
    setText('daylightWindow',a.sunrise&&a.sunset?`${a.sunrise}–${a.sunset}`:'Unavailable');setText('daylightNote',a.golden_hour?`Best evening light roughly ${a.golden_hour}.`:'');
    const alerts=w.alerts||[];const box=$('alertBox');if(alerts.length){box.hidden=false;box.innerHTML=`<strong>Weather alert:</strong> ${alerts.slice(0,2).map(x=>esc(x.headline||x.event)).join(' · ')}`;}else box.hidden=true;
  }


  function loadHlsJs(){
    if(window.Hls)return Promise.resolve(window.Hls);
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-hlsjs]');
      if(existing){existing.addEventListener('load',()=>resolve(window.Hls),{once:true});existing.addEventListener('error',reject,{once:true});return;}
      const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';s.async=true;s.dataset.hlsjs='1';
      s.onload=()=>resolve(window.Hls);s.onerror=reject;document.head.appendChild(s);
    });
  }

  function mountHlsVideo(stage,cam){
    if(state.webcamHls){try{state.webcamHls.destroy();}catch{} state.webcamHls=null;}
    stage.innerHTML=`<video class="webcam-video" controls muted autoplay playsinline aria-label="${esc(cam.name)} live camera"></video>`;
    const video=stage.querySelector('video');
    if(video.canPlayType('application/vnd.apple.mpegurl')){
      video.src=cam.stream_url;video.play().catch(()=>{});
      return;
    }
    loadHlsJs().then(Hls=>{
      if(!Hls||!Hls.isSupported())throw new Error('HLS unsupported');
      const hls=new Hls({enableWorker:true,lowLatencyMode:true});
      state.webcamHls=hls;hls.loadSource(cam.stream_url);hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED,()=>video.play().catch(()=>{}));
    }).catch(()=>{
      stage.innerHTML=`<div class="webcam-stage-placeholder"><strong>${esc(cam.name)}</strong><p>The live stream is unavailable here right now.</p><a class="btn primary webcam-external" href="${esc(cam.source_url)}" target="_blank" rel="noopener">Open official live camera ↗</a></div>`;
    });
  }

  function cameraOwner(name){
    return String(name||'').split(' · ')[0]||'camera owner';
  }

  function renderWebcamViewer(cams,w){
    const recommendedId=w?.recommended_id||w?.recommended?.id||cams[0]?.id||null;
    if(!state.webcamSelectedId || !cams.some(cam=>cam.id===state.webcamSelectedId)) state.webcamSelectedId=recommendedId;
    const cam=cams.find(x=>x.id===state.webcamSelectedId)||cams.find(x=>x.id===recommendedId)||cams[0]||null;
    const stage=$('webcamStage'),action=$('webcamViewerAction');
    if(!cam){
      if(stage)stage.innerHTML='<div class="webcam-stage-placeholder"><strong>Live cameras unavailable</strong><p>Try again later.</p></div>';
      setText('webcamTitle','Live cameras unavailable');setText('webcamView','');setText('webcamWhy','');setText('webcamSuggested','');
      if(action)action.innerHTML='';setText('webcamAttribution','');
      return;
    }

    setText('webcamSuggested',cam.id===recommendedId?'Suggested for this trip':'You selected this view');
    setText('webcamTitle',cam.name);
    setText('webcamView',cam.view||'Live Mackinac Island view');
    setText('webcamWhy',cam.id===recommendedId?(cam.reason||cam.default_reason||'A useful visual check for this trip.'):'Switch anytime using the camera choices below.');
    setText('webcamAttribution',`Camera: ${cameraOwner(cam.name)}`);

    if(stage){
      if(state.webcamHls){try{state.webcamHls.destroy();}catch{} state.webcamHls=null;}
      if(cam.stream_url){
        mountHlsVideo(stage,cam);
      }else if(cam.embed_url){
        stage.innerHTML=`<iframe src="${esc(cam.embed_url)}" title="${esc(cam.name)} live camera" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
      }else{
        stage.innerHTML=`<div class="webcam-stage-placeholder"><strong>${esc(cam.name)}</strong><p>This owner publishes this view on its own live-camera page.</p></div>`;
      }
    }
    if(action){
      action.innerHTML=cam.embed_url||cam.stream_url?'':`<a class="btn primary webcam-external" href="${esc(cam.source_url)}" target="_blank" rel="noopener">${cam.id==='horns-main-street'?'Watch Horn’s live ↗':cam.id==='town-crier-market'?'Watch Town Crier live ↗':'Open official live camera ↗'}</a>`;
    }
  }

  function renderWebcams(d){
    const w=d.webcams||{},cams=Array.isArray(w.list)?w.list:[];
    const picker=$('webcamPicker'); if(!picker)return;
    if(!cams.length){
      picker.innerHTML='<p class="muted">Live cameras are temporarily unavailable.</p>';
      renderWebcamViewer([],w);
      return;
    }
    const recommendedId=w.recommended_id||w.recommended?.id||cams[0]?.id||null;
    if(!state.webcamSelectedId || !cams.some(cam=>cam.id===state.webcamSelectedId)) state.webcamSelectedId=recommendedId;
    picker.innerHTML=cams.map(cam=>{
      const selected=cam.id===state.webcamSelectedId,recommended=cam.id===recommendedId;
      return `<button class="webcam-choice ${selected?'active':''}" type="button" aria-pressed="${selected?'true':'false'}" data-webcam-id="${esc(cam.id)}">
        <span>${esc(cam.location||'Mackinac Island')}</span>
        <strong>${esc(cam.name)}</strong>
        ${recommended?'<small>Suggested</small>':(!(cam.embed_url||cam.stream_url)?'<small>Opens separately</small>':'')}
      </button>`;
    }).join('');
    picker.querySelectorAll('.webcam-choice').forEach(btn=>btn.addEventListener('click',()=>{
      state.webcamSelectedId=btn.dataset.webcamId||null;
      const selected=cams.find(cam=>cam.id===state.webcamSelectedId);
      track('mackinac_webcam_selected',{camera:state.webcamSelectedId||'unknown',embedded:Boolean(selected?.embed_url||selected?.stream_url),recommended:state.webcamSelectedId===recommendedId});
      renderWebcams(d);
    }));
    renderWebcamViewer(cams,w);
  }

  function renderCrowdsOpen(d){
    const c=d.crowds||{};setText('crowdLabel',c.label||'—');setText('crowdWindows',c.summary||'Crowd outlook unavailable.');setText('crowdConfidence',`${String(c.confidence||'medium').toUpperCase()} confidence`);setText('crowdBasis',c.basis||'Estimated from the calendar, weather and events.');
    const attrs=d.attractions||[];$('attractionList').innerHTML=attrs.length?attrs.map(x=>`<div class="status-item"><span>${esc(x.name)}</span><strong class="${x.open?'status-open':'status-closed'}">${x.open?`OPEN${x.hours?' · '+esc(x.hours):''}`:`${esc(x.status||'CLOSED')}`}</strong></div>`).join(''):'<p>No attraction-status data available.</p>';
    setText('openness',d.island_openness?.label?`Island openness: ${d.island_openness.label}`:'');
  }

  function renderSeasonal(d){
    const events=d.events||[];$('eventsList').innerHTML=events.length?events.map(x=>`<div class="status-item"><span>${esc(x.title)}</span><strong>${esc(x.impact_label||x.impact||'Today')}</strong></div>`).join(''):'<p>Nothing major on the Island calendar is expected to reshape the day.</p>';
    const f=d.fall_color||{};setText('fallColorLabel',f.label||'Not a primary factor');setText('fallColorText',f.summary||'Fall-color guidance is out of season or temporarily unavailable.');
  }

  function renderPlanner(d){
    const it=d.itinerary||[],p=d.trip_profile||{};
    setText('plannerSummary',d.itinerary_summary||'We couldn’t put together a comfortable plan from the trip details we could verify.');
    const days=d.trip_days||[];
    const dayHost=$('tripDays');
    if(dayHost)dayHost.innerHTML=days.length?days.map(x=>`<article class="trip-day ${esc(x.role||'')}"><span>Day ${esc(x.day)} · ${esc(dateLabel(x.date))}</span><strong>${esc(x.title||'Trip day')}</strong><p>${esc(x.summary||'')}</p></article>`).join(''):'';
    $('itinerary').innerHTML=it.length?it.map(x=>`<li><time>${esc(x.time||'')}</time><div><strong>${esc(x.title||x.label||'Plan stop')}</strong>${x.movement?`<span class="movement">${esc(x.movement)}</span>`:''}<p>${esc(x.detail||'')}</p></div></li>`).join(''):'<li><time>—</time><div><strong>Your Island plan needs a recheck</strong><p>Check the ferry links below before heading to the dock.</p></div></li>';
    setText('plannerExplain',d.itinerary_reason||'');
    setText('leaveHome',d.leave_home?.time||(state.tripDate&&state.originResolved&&state.departTime?'No reachable ferry':'Enter date, city + time above'));
    setText('leaveHomeNote',d.leave_home?.detail||(state.tripDate&&state.originResolved&&state.departTime?'No ferry in the verified schedule can be reached from that city on that date after your entered leave-home time.':'Add your trip date, starting city and leave time. Drive times are planning estimates, not live traffic.'));
    const party=`${Number(p.adults||2)} adult${Number(p.adults||2)===1?'':'s'}${Number(p.children||0)?` + ${p.children} child${Number(p.children)===1?'':'ren'}`:''}`;
    const fit=[party,p.trip==='overnight'?`${p.nights||1} night${Number(p.nights||1)===1?'':'s'}`:'day trip',p.pace?`${p.pace} pace`:null,p.bikes&&p.bikes!=='none'?`${p.bikes} bikes`:null,p.mobility==='limited'?'limited steep walking':null].filter(Boolean);
    setText('tripFit',fit.join(' · '));
    const priorities=[...(p.interests||[]),...(p.must_do||[]).map(x=>`must: ${x}`)];
    setText('tripFitNote',priorities.length?`You want to make time for: ${priorities.join(', ')}.`:`Built around the kind of Island visit you selected, plus current ferry and weather details.`);
    const optional=optionalFailures(d),core=coreFailures(d);
    setText('builderStatus',core.length?'Plan updated, but one important trip detail needs a recheck below.':optional.length?'Plan updated. Ferry and weather details are ready; a few optional extras are limited.':'Your Island plan is updated.');
  }

  function renderSources(d){
    const src=d.sources||{},optional=optionalFailures(d),core=coreFailures(d);
    setText('overallDataState',core.length?'RECHECK NEEDED':optional.length?'TRIP READY · A FEW EXTRAS LIMITED':'TRIP DETAILS READY');
    const order=Object.entries(src);$('sourceList').innerHTML=order.length?order.map(([k,s])=>`<div class="source-row"><a href="${esc(s.url||'#')}" target="_blank" rel="noopener">${esc(s.name||k.replace(/_/g,' '))}</a><span class="source-state ${s.available?'ok':'warn'}">${esc(s.status_label||(s.available?'available':'unavailable'))}</span></div>`).join(''):'<p>Source details are temporarily unavailable.</p>';
    const refs=d.planning_references||{};
    if(refs.accessibility?.url)$('sourceList').insertAdjacentHTML('beforeend',`<div class="source-row"><a href="${esc(refs.accessibility.url)}" target="_blank" rel="noopener">${esc(refs.accessibility.name||'Accessibility planning source')}</a><span class="source-state ok">planning reference</span></div>`);
    if(refs.ferry_ticket_flexibility?.url)$('sourceList').insertAdjacentHTML('beforeend',`<div class="source-row"><a href="${esc(refs.ferry_ticket_flexibility.url)}" target="_blank" rel="noopener">${esc(refs.ferry_ticket_flexibility.name||'Ferry ticket flexibility')}</a><span class="source-state ok">flexible ticket reference</span></div>`);
    if(refs.drive_times?.url)$('sourceList').insertAdjacentHTML('beforeend',`<div class="source-row"><a href="${esc(refs.drive_times.url)}" target="_blank" rel="noopener">${esc(refs.drive_times.label||'Origin drive-time reference')}</a><span class="source-state ok">planning estimate · not live traffic</span></div>`);
    if(core.length)$('sourceList').insertAdjacentHTML('beforeend','<div class="error-panel"><strong>One important trip detail needs a recheck.</strong> Check the unavailable ferry or weather source before you rely on the timing.</div>');
    else if(optional.length)$('sourceList').insertAdjacentHTML('beforeend','<div class="source-note"><strong>A few optional details are limited right now.</strong> Your ferry and weather plan is still available; the missing extras are labeled above.</div>');
  }

  function renderMapPoints(d){
    const refresh=state.mapWasOpened;
    state.mapPoints=d.map_points||[];
    state.routeIds=d.map?.recommended_stop_ids||[];
    if(refresh){
      try{state.mapInstance?.remove();}catch{}
      state.mapInstance=null;state.mapLoaded=false;
      const host=$('map');if(host){host.className='map-placeholder';host.innerHTML='<div><strong>Your Island day changed.</strong><p>Updating the map and recommended stops…</p></div>';}
      buildMap();
    }
  }
  function renderAll(d){state.data=d;renderTop(d);renderWhy(d);renderFerries(d);renderConditions(d);renderWebcams(d);renderCrowdsOpen(d);renderSeasonal(d);renderPlanner(d);renderSources(d);renderMapPoints(d);if(state.tripProfile){renderTripTabs(state.tripProfile);renderDepthGuides(state.tripProfile);}else if(d.visitor_intelligence){renderTripTabs(d.visitor_intelligence);renderDepthGuides(d.visitor_intelligence);}}

  async function loadDecision(){
    $('decisionPanel').setAttribute('aria-busy','true');
    try{const r=await fetch(buildUrl(),{headers:{accept:'application/json'}});const j=await r.json();if(!r.ok)throw new Error(j.error||`HTTP ${r.status}`);renderAll(j);track('mackinac_decision_loaded',{score:j.decision?.score,engine:j.decision?.engine,planning_mode:j.planning_mode,origin:j.ferry?.recommended_plan?.origin_port||'none'});}
    catch(err){
      $('planningBanner').hidden=false;$('planningBanner').textContent='Live trip details are temporarily unavailable. Check the ferry operators below before relying on a departure time.';
      setText('verdict','TRIP DETAILS NEED A RECHECK');setText('confidence','We’re not guessing at a ferry time');setText('primaryRec','We couldn’t verify enough live details to comfortably choose your ferry right now.');
      setText('heroTripContext','Live trip details unavailable');setText('heroLeave','Unavailable');setText('heroFerry','Unavailable');setText('heroIsland','Unavailable');setText('heroReturn','Unavailable');
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
    }catch(e){btn.disabled=false;btn.textContent='Retry map';$('map').innerHTML='<div><strong>The Island map could not load.</strong><p>Your walking and biking notes are still here, so you can keep planning.</p></div>';state.mapLoaded=false;state.mapInstance=null;}
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
  initIntake();
  loadDecision();
})();
