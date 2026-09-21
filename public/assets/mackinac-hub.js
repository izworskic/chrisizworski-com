(()=>{
  "use strict";

  const KEY="mackinac-trip-profile-v1";
  const PLAN_KEY="mackinac-trip-plan-v1";
  const API="/api/mackinac-profile";
  const body=document.body;
  const rawSurface=body?.dataset?.mackinacSurface||body?.dataset?.mackinacIntent||"today";
  const isLive=location.pathname==="/mackinac-island/"||location.pathname==="/mackinac-island";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function read(){
    try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null;}catch{return null;}
  }
  function write(value){
    try{localStorage.setItem(KEY,JSON.stringify({...value,saved_at:Date.now()}));}catch{}
  }
  function readPlan(){
    try{const raw=localStorage.getItem(PLAN_KEY);return raw?JSON.parse(raw)?.plan||null:null;}catch{return null;}
  }
  function dateLabel(value){
    if(!value)return "";
    const d=new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  }
  function planFacts(plan){
    if(!plan)return [];
    const facts=[];
    if(plan.trip_date)facts.push(dateLabel(plan.trip_date));
    if(plan.origin_text)facts.push(`from ${plan.origin_text}`);
    if(plan.depart_at)facts.push(`leave ${plan.depart_at}`);
    if(plan.trip==="overnight")facts.push(`${Number(plan.nights||1)} night${Number(plan.nights||1)===1?"":"s"}`);
    else if(plan.trip)facts.push("day trip");
    const adults=Number(plan.adults||0),children=Number(plan.children||0);
    if(adults||children)facts.push([adults?`${adults} adult${adults===1?"":"s"}`:"",children?`${children} child${children===1?"":"ren"}`:""].filter(Boolean).join(" + "));
    return facts.filter(Boolean);
  }
  function track(name,params={}){
    try{if(typeof window.gtag==="function")window.gtag("event",name,params);}catch{}
  }
  function surfaceLabel(){
    const map={"my-trip":"My Trip",today:"My Trip",plan:"Trip guide",ferries:"Ferries",stay:"Stay",eat:"Eat",explore:"Explore",events:"Events",straits:"Straits"};
    return map[rawSurface]||rawSurface.replace(/-/g," ");
  }
  function normalizePrimaryNav(){
    const nav=document.querySelector(".mackinac-destination-nav");if(!nav)return;
    const root=nav.querySelector('[data-mackinac-nav="today"],[data-mackinac-nav="my-trip"]');
    if(root){root.dataset.mackinacNav="my-trip";root.textContent="My Trip";root.href="/mackinac-island/";}
    nav.querySelector('[data-mackinac-nav="plan"]')?.remove();
  }
  function insertAtDecisionFront(node){
    const hero=document.querySelector("main .hero");
    if(hero&&hero.parentNode){hero.insertAdjacentElement("beforebegin",node);return;}
    const main=document.querySelector("main");if(main)main.prepend(node);
  }
  function ensureFocusHost(){
    let host=document.querySelector("[data-mackinac-platform-focus]");
    if(host)return host;
    host=document.createElement("section");
    host.className="platform-focus-wrap";
    host.dataset.mackinacPlatformFocus="1";
    insertAtDecisionFront(host);
    return host;
  }
  function ensureIntakeHost(){
    let host=document.querySelector("[data-mackinac-platform-intake]");
    if(host)return host;
    host=document.createElement("section");
    host.className="platform-intake-wrap";
    host.dataset.mackinacPlatformIntake="1";
    insertAtDecisionFront(host);
    return host;
  }

  function applyNavOrder(order=[]){
    const nav=document.querySelector(".mackinac-destination-nav");
    if(!nav||!order.length)return;
    const links=new Map([...nav.querySelectorAll("[data-mackinac-nav]")].map(a=>[a.dataset.mackinacNav,a]));
    const seen=new Set();
    const normalized=order.map(item=>({...item,id:(item.id==="today"||item.id==="plan")?"my-trip":item.id})).filter(item=>!seen.has(item.id)&&seen.add(item.id));
    for(const item of normalized){
      const a=links.get(item.id);
      if(a)nav.appendChild(a);
    }
    const current=rawSurface==="today"?"my-trip":rawSurface;
    const first=normalized.find(x=>x.id!==current&&links.has(x.id));
    nav.querySelectorAll("a").forEach(a=>a.classList.remove("trip-next"));
    if(first)links.get(first.id)?.classList.add("trip-next");
  }

  function applyPlaceRanking(surface){
    const rows=surface?.place_ranking?.[surface.surface]||[];
    if(!rows.length)return;
    const containers=[...document.querySelectorAll(".catalog-grid")];
    for(const container of containers){
      const cards=new Map([...container.querySelectorAll("[data-place-id]")].map(el=>[el.dataset.placeId,el]));
      let moved=0;
      rows.forEach((row,index)=>{
        const card=cards.get(row.id);if(!card)return;
        container.appendChild(card);moved++;
        card.classList.toggle("profile-top-match",index===0);
        let badge=card.querySelector(".profile-fit-badge");
        if(!badge){badge=document.createElement("span");badge.className="profile-fit-badge";card.prepend(badge);}
        badge.textContent=index===0?"Best fit for your trip":`${Math.round(Number(row.fit_score)||0)}% trip fit`;
      });
      if(moved){
        const ordered=rows.map(x=>cards.get(x.id)).filter(Boolean);
        [...ordered].reverse().forEach(card=>container.prepend(card));
      }
    }
  }

  function renderSavedContext(profile,surface,plan){
    let host=document.querySelector("[data-trip-context]");
    if(!host){
      host=document.createElement("aside");
      host.className="trip-context";
      host.dataset.tripContext="1";
      const shell=document.createElement("div");shell.className="shell";shell.appendChild(host);
      const focus=document.querySelector("[data-mackinac-platform-focus]");
      if(focus)focus.insertAdjacentElement("afterend",shell);else insertAtDecisionFront(shell);
    }
    const label=profile?.primary?.label||"your Mackinac trip";
    const facts=planFacts(plan);
    host.hidden=false;
    host.innerHTML=`<div><span>Using your saved Mackinac plan</span><strong>${esc(label)}</strong><p class="trip-context-facts">${facts.length?facts.map(esc).join(" · "):esc(profile?.primary?.summary||"Your choices are shaping the same trip across every Mackinac page.")}</p><p>${esc(profile?.primary?.summary||"This page is already using the trip you built.")}</p></div><a class="btn primary" data-mackinac-planner-cta href="/mackinac-island/#trip-intake">Edit my trip</a>`;
    host.querySelector("[data-mackinac-planner-cta]")?.addEventListener("click",()=>track("mackinac_planner_cta",{surface:rawSurface,personalized:true}));
    if(surface?.engine==="shared-harness-jev")host.dataset.engine="jev";
  }

  function adaptiveMarkup(profile){
    const q=profile?.next_question;
    if(!q?.id||!Array.isArray(q.options)||!q.options.length)return"";
    return `<div class="platform-adaptive" data-platform-adaptive><strong>One answer could sharpen this:</strong><span>${esc(q.prompt)}</span><div class="platform-choice-row">${q.options.map(([value,label])=>`<button type="button" data-adaptive-id="${esc(q.id)}" data-adaptive-value="${esc(value)}">${esc(label)}</button>`).join("")}<button type="button" class="muted-choice" data-adaptive-skip>Skip</button></div></div>`;
  }

  function renderFocus(profile,surface,answers){
    const host=ensureFocusHost();
    const focus=surface?.focus;
    if(!focus){host.remove();return;}
    host.innerHTML=`<div class="shell"><div class="platform-focus-card"><div><span class="platform-kicker">Your ${esc(surfaceLabel())} focus</span><h2>${esc(focus.title)}</h2><p>${esc(focus.summary)}</p><small>${surface.engine==="shared-harness-jev"?"JEV ranked this focus from bounded choices after your deterministic visitor profile was built.":"Deterministic fallback is active; your trip facts and profile still control the page."}</small></div><a class="btn primary" href="${esc(surface.nav_order?.find(x=>x.id===focus.next)?.path||"/mackinac-island/")}">Next useful decision</a>${adaptiveMarkup(profile)}</div></div>`;
    host.querySelectorAll("[data-adaptive-value]").forEach(btn=>btn.addEventListener("click",async()=>{
      const next={...answers,[btn.dataset.adaptiveId]:btn.dataset.adaptiveValue};
      track("mackinac_adaptive_question_answered",{question:btn.dataset.adaptiveId,surface:rawSurface});
      await personalize(next);
    }));
    host.querySelector("[data-adaptive-skip]")?.addEventListener("click",()=>host.querySelector("[data-platform-adaptive]")?.remove());
  }

  async function classify(answers){
    const r=await fetch(API,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({answers,surface:rawSurface})});
    const data=await r.json();
    if(!r.ok)throw new Error(data?.detail||data?.error||`HTTP ${r.status}`);
    return data;
  }

  async function personalize(answers){
    try{
      const data=await classify(answers);
      const plan=readPlan();
      write({answers:data.profile?.answers||answers,profile:data.profile});
      document.querySelector("[data-mackinac-platform-intake]")?.remove();
      renderFocus(data.profile,data.surface,data.profile?.answers||answers);
      renderSavedContext(data.profile,data.surface,plan);
      applyNavOrder(data.surface?.nav_order);
      applyPlaceRanking(data.surface);
      track("mackinac_surface_personalized",{surface:data.surface?.surface||rawSurface,profile:data.profile?.primary?.id||"unknown",engine:data.surface?.engine||data.profile?.engine||"deterministic"});
    }catch(error){
      const host=ensureFocusHost();
      host.innerHTML=`<div class="shell"><div class="platform-focus-card degraded"><div><span class="platform-kicker">Your trip is still saved</span><h2>Personalized focus needs a recheck</h2><p>We couldn't refresh the Mackinac intelligence layer on this page. The source-backed page content remains available.</p></div></div></div>`;
    }
  }

  function valuePresent(q,value){
    return q.type==="multi"?Array.isArray(value)&&value.length>0:Boolean(value);
  }

  async function renderIntake(existing={}){
    const host=ensureIntakeHost();
    try{
      const r=await fetch(API,{headers:{accept:"application/json"}});const schema=await r.json();if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const answers={...existing};
      const questions=schema.base_questions||[];
      const next=questions.find(q=>!valuePresent(q,answers[q.id]));
      if(!next){await personalize(answers);return;}
      const selected=new Set(Array.isArray(answers[next.id])?answers[next.id]:[]);
      host.innerHTML=`<div class="shell"><div class="platform-intake-card"><div><span class="platform-kicker">Make this page about your trip</span><h2>${esc(next.prompt)}</h2><p>Four high-value answers shape the whole Mackinac platform. You won't restart when you change pages.</p></div><div class="platform-choice-row">${(next.options||[]).map(([value,label])=>`<button type="button" data-intake-value="${esc(value)}" aria-pressed="${selected.has(value)?"true":"false"}">${esc(label)}</button>`).join("")}</div>${next.type==="multi"?'<button type="button" class="btn primary" data-intake-continue disabled>Continue</button>':""}<button type="button" class="text-button" data-intake-skip>Use the general page</button></div></div>`;
      const buttons=[...host.querySelectorAll("[data-intake-value]")];
      if(next.type==="multi"){
        const cont=host.querySelector("[data-intake-continue]");
        buttons.forEach(btn=>btn.addEventListener("click",()=>{
          const value=btn.dataset.intakeValue;
          if(selected.has(value))selected.delete(value);else if(selected.size<Number(next.max||2))selected.add(value);
          buttons.forEach(b=>b.setAttribute("aria-pressed",String(selected.has(b.dataset.intakeValue))));
          cont.disabled=selected.size===0;
        }));
        cont?.addEventListener("click",()=>{answers[next.id]=[...selected];write({answers});track("mackinac_intake_answered",{question:next.id,surface:rawSurface});renderIntake(answers);});
      }else{
        buttons.forEach(btn=>btn.addEventListener("click",()=>{answers[next.id]=btn.dataset.intakeValue;write({answers});track("mackinac_intake_answered",{question:next.id,surface:rawSurface});renderIntake(answers);}));
      }
      host.querySelector("[data-intake-skip]")?.addEventListener("click",()=>{host.remove();track("mackinac_intake_skipped",{surface:rawSurface,question:next.id});});
      track("mackinac_platform_intake_shown",{surface:rawSurface,question:next.id});
    }catch{
      host.remove();
    }
  }

  function wireTracking(){
    document.querySelectorAll("[data-mackinac-nav]").forEach(a=>a.addEventListener("click",()=>track("mackinac_destination_nav",{surface:rawSurface,target:a.dataset.mackinacNav||"unknown"})));
    document.querySelectorAll("[data-mackinac-planner-cta]").forEach(a=>a.addEventListener("click",()=>track("mackinac_planner_cta",{surface:rawSurface})));
  }

  async function apply(){
    wireTracking();
    if(isLive)return;
    const saved=read();
    if(saved?.profile?.complete&&saved?.answers)await personalize(saved.answers);
    else await renderIntake(saved?.answers||{});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
})();