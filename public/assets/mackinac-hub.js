(()=>{
  "use strict";
  const PROFILE_KEY="mackinac-trip-profile-v1";
  const PLAN_KEY="mackinac-trip-plan-v1";
  const API="/api/mackinac-profile";
  const TAB_MAP={"my-trip":"plan",live:"today","getting-there":"ferries",island:"explore",map:"explore",stay:"stay",eat:"eat",events:"events","around-straits":"straits"};
  const state={schema:null,answers:{},profile:null,surfaceDecision:null,step:0,adaptiveAsked:false};
  const host=document.querySelector("[data-trip-context]");
  const surface=String(document.body?.dataset?.mackinacSurface||document.body?.dataset?.mackinacIntent||"plan").trim()||"plan";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function read(key){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null}catch{return null}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
  function track(name,params={}){try{if(typeof window.gtag==="function")window.gtag("event",name,params)}catch{}}
  function currentSaved(){return read(PROFILE_KEY)}
  function profileCompleteAnswers(answers={}){
    return Boolean(answers.trip_duration&&answers.party&&Array.isArray(answers.trip_vision)&&answers.trip_vision.length&&answers.trip_loss);
  }
  function plannerState(){
    const stored=read(PLAN_KEY)?.plan||null;
    if(stored&&window.MackinacTripState)return window.MackinacTripState.sanitize(stored);
    const saved=currentSaved();
    if(saved?.answers&&window.MackinacTripState)return window.MackinacTripState.sanitize({intake:saved.answers});
    return null;
  }
  function plannerHref(){
    const plan=plannerState();
    if(plan&&window.MackinacTripState)return "/mackinac-island/"+window.MackinacTripState.encode(plan);
    return "/mackinac-island/#trip-intake";
  }
  function rewritePlannerLinks(){
    const saved=currentSaved();
    if(!saved?.profile?.primary&&!read(PLAN_KEY)?.plan)return;
    const href=plannerHref();
    document.querySelectorAll("[data-mackinac-planner-cta]").forEach(a=>a.setAttribute("href",href));
  }
  function markPriorityTabs(profile){
    document.querySelectorAll("[data-mackinac-nav]").forEach(a=>{a.classList.remove("trip-priority");a.removeAttribute("data-trip-rank")});
    const ordered=[];
    for(const tab of profile?.tabs||[]){
      const id=TAB_MAP[tab.id];
      if(id&&!ordered.includes(id))ordered.push(id);
      if(ordered.length>=3)break;
    }
    ordered.forEach((id,index)=>{
      const a=document.querySelector('[data-mackinac-nav="'+id+'"]');
      if(a){a.classList.add("trip-priority");a.dataset.tripRank=String(index+1)}
    });
  }
  function setHostMode(mode){
    if(!host)return;
    host.hidden=false;
    host.dataset.mode=mode;
  }
  function workHost(){return host?.querySelector("[data-trip-context-work]")||null}
  function actionHost(){return host?.querySelector("[data-trip-context-actions]")||null}
  function setTitle(title,summary){
    const t=host?.querySelector("[data-trip-context-title]");
    const p=host?.querySelector("[data-trip-context-summary]");
    if(t)t.textContent=title;
    if(p)p.textContent=summary||"";
  }
  function renderLoading(text="Updating this page for your trip…"){
    if(!host)return;
    setHostMode("loading");
    setTitle("Your Mackinac trip is carrying forward",text);
    const work=workHost();if(work)work.innerHTML='<div class="trip-intelligence-loading" aria-live="polite">Checking the best focus for this part of the trip…</div>';
    const actions=actionHost();if(actions)actions.innerHTML="";
  }
  function focusMarkup(decision){
    const pick=decision?.selected;
    if(!pick)return "";
    return '<div class="surface-focus" data-surface-focus><span>For this part of your trip</span><strong>'+esc(pick.label)+'</strong><p>'+esc(pick.summary)+'</p></div>';
  }
  function renderProfile(profile,decision){
    if(!host||!profile?.primary)return;
    state.profile=profile;state.surfaceDecision=decision||null;
    setHostMode("profile");
    setTitle(profile.primary.label,profile.primary.summary||"Your trip profile is active across Mackinac.");
    const work=workHost();
    if(work)work.innerHTML=focusMarkup(decision);
    const actions=actionHost();
    if(actions)actions.innerHTML='<a class="btn primary" data-mackinac-planner-cta href="'+esc(plannerHref())+'">Open my trip</a><button class="text-button" type="button" data-trip-context-edit>Edit trip style</button>';
    actions?.querySelector("[data-trip-context-edit]")?.addEventListener("click",()=>startIntake({preserve:true}));
    markPriorityTabs(profile);rewritePlannerLinks();
    track("mackinac_surface_personalized",{surface,profile:profile.primary.id,engine:decision?.engine||"none",focus:decision?.selected?.id||"none"});
  }
  function optionButton(value,label,selected=false){
    return '<button type="button" class="trip-answer'+(selected?" selected":"")+'" data-trip-answer="'+esc(value)+'" aria-pressed="'+(selected?"true":"false")+'">'+esc(label)+'</button>';
  }
  function renderQuestion(q,{adaptive=false}={}){
    if(!host||!q)return;
    setHostMode("intake");
    const total=state.schema?.base_questions?.length||4;
    const step=adaptive?total:Math.min(total,state.step+1);
    setTitle(adaptive?"One useful follow-up":"Make the whole Mackinac site fit this trip",adaptive?"This answer is optional. It only appears when it can materially change the plan.":"Four quick answers shape every Mackinac page you open next.");
    const selected=Array.isArray(state.answers[q.id])?state.answers[q.id]:[];
    const options=(q.options||[]).map(([value,label])=>optionButton(value,label,q.type==="multi"&&selected.includes(value))).join("");
    const work=workHost();
    if(work)work.innerHTML='<div class="trip-question"><div class="trip-question-progress">'+(adaptive?"Optional follow-up":"Question "+step+" of "+total)+'</div><strong>'+esc(q.prompt)+'</strong><div class="trip-answer-grid">'+options+'</div><div class="trip-question-actions">'+(q.type==="multi"?'<button type="button" class="btn small" data-trip-answer-continue '+(selected.length?"":"disabled")+'>Continue</button>':"")+(adaptive?'<button type="button" class="text-button" data-trip-answer-skip>Skip</button>':"")+'</div></div>';
    const actions=actionHost();if(actions)actions.innerHTML="";
    work?.querySelectorAll("[data-trip-answer]").forEach(btn=>btn.addEventListener("click",()=>{
      const value=btn.dataset.tripAnswer;
      if(q.type==="multi"){
        const arr=Array.isArray(state.answers[q.id])?[...state.answers[q.id]]:[];
        const idx=arr.indexOf(value);
        if(idx>=0)arr.splice(idx,1);else if(arr.length<(q.max||2))arr.push(value);
        state.answers[q.id]=arr;
        renderQuestion(q,{adaptive});
        return;
      }
      state.answers[q.id]=value;
      track("mackinac_intake_answered",{question:q.id,answer:value,surface});
      if(adaptive){state.adaptiveAsked=true;classifyAndRender();}
      else{state.step++;advanceBase();}
    }));
    work?.querySelector("[data-trip-answer-continue]")?.addEventListener("click",()=>{
      const arr=Array.isArray(state.answers[q.id])?state.answers[q.id]:[];
      if(!arr.length)return;
      track("mackinac_intake_answered",{question:q.id,answer:arr.join("|"),surface});
      state.step++;advanceBase();
    });
    work?.querySelector("[data-trip-answer-skip]")?.addEventListener("click",()=>{
      state.adaptiveAsked=true;
      renderProfile(state.profile,state.surfaceDecision);
    });
  }
  function firstMissingBase(){
    const rows=state.schema?.base_questions||[];
    return rows.findIndex(q=>q.type==="multi"?!(Array.isArray(state.answers[q.id])&&state.answers[q.id].length):!state.answers[q.id]);
  }
  function advanceBase(){
    const rows=state.schema?.base_questions||[];
    const missing=firstMissingBase();
    if(missing>=0){state.step=missing;renderQuestion(rows[missing]);return}
    classifyAndRender();
  }
  async function apiPost(body){
    const res=await fetch(API,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify(body)});
    const data=await res.json().catch(()=>null);
    if(!res.ok||!data?.profile)throw new Error(data?.detail||data?.error||("HTTP "+res.status));
    return data;
  }
  async function classifyAndRender(){
    renderLoading("Building one shared visitor profile and applying it to this page.");
    try{
      const data=await apiPost({answers:state.answers,surface});
      state.profile=data.profile;state.surfaceDecision=data.surface_decision||null;
      write(PROFILE_KEY,{answers:data.profile.answers,profile:data.profile,saved_at:Date.now()});
      state.answers={...data.profile.answers};
      track("mackinac_profile_classified",{surface,profile:data.profile.primary?.id||"unknown",engine:data.profile.engine||"unknown"});
      if(data.profile.next_question&&!state.adaptiveAsked){
        state.adaptiveAsked=true;
        renderQuestion(data.profile.next_question,{adaptive:true});
        return;
      }
      renderProfile(data.profile,data.surface_decision);
    }catch(error){
      setHostMode("error");
      setTitle("Trip intelligence needs a retry","The rest of the page is still usable. Your trip answers have not been lost.");
      const work=workHost();if(work)work.innerHTML='<button class="btn small" type="button" data-trip-retry>Retry trip intelligence</button>';
      work?.querySelector("[data-trip-retry]")?.addEventListener("click",classifyAndRender);
    }
  }
  async function refreshSurface(saved){
    renderLoading();
    try{
      const data=await apiPost({answers:saved.answers||saved.profile?.answers||{},surface,mode:"surface",primary_id:saved.profile?.primary?.id||""});
      const profile={...data.profile,primary:saved.profile?.primary||data.profile.primary,engine:saved.profile?.engine||data.profile.engine,jev_confidence:saved.profile?.jev_confidence??data.profile.jev_confidence};
      write(PROFILE_KEY,{answers:data.profile.answers,profile,saved_at:Date.now()});
      state.answers={...data.profile.answers};state.profile=profile;state.surfaceDecision=data.surface_decision||null;
      renderProfile(profile,data.surface_decision);
    }catch{
      state.answers={...(saved.answers||saved.profile?.answers||{})};
      state.profile=saved.profile||null;
      renderProfile(saved.profile,null);
    }
  }
  async function loadSchema(){
    if(state.schema)return state.schema;
    const res=await fetch(API,{headers:{accept:"application/json"}});
    const data=await res.json();if(!res.ok)throw new Error("Profile schema unavailable");
    state.schema=data;return data;
  }
  async function startIntake({preserve=false}={}){
    try{
      await loadSchema();
      const saved=currentSaved();
      state.answers=preserve?{...(saved?.answers||saved?.profile?.answers||state.answers||{})}:{};
      state.adaptiveAsked=false;
      const missing=firstMissingBase();
      state.step=missing>=0?missing:0;
      if(missing<0){renderQuestion(state.schema.base_questions[0]);state.step=0;return}
      renderQuestion(state.schema.base_questions[state.step]);
      track("mackinac_intake_started",{surface,restart:Boolean(saved)});
    }catch{
      setHostMode("error");setTitle("Build your trip on Mackinac Today","The quick trip questions are temporarily unavailable on this page.");
      const work=workHost();if(work)work.innerHTML='<a class="btn primary" href="/mackinac-island/#trip-intake">Open the trip builder</a>';
    }
  }
  function wireTracking(){
    document.querySelectorAll("[data-mackinac-nav]").forEach(a=>a.addEventListener("click",()=>track("mackinac_destination_nav",{surface,target:a.dataset.mackinacNav||"unknown"})));
    document.querySelectorAll("[data-mackinac-planner-cta]").forEach(a=>a.addEventListener("click",()=>track("mackinac_planner_cta",{surface})));
  }
  async function apply(){
    wireTracking();rewritePlannerLinks();
    if(!host)return;
    const saved=currentSaved();
    if(saved?.profile?.primary&&profileCompleteAnswers(saved.answers||saved.profile.answers||{}))await refreshSurface(saved);
    else await startIntake();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
})();