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
  // Late content never goes above the hero: that pushed the whole page down after it
  // had painted. Pages ship a reserved focus slot under the decision cards; this only
  // covers pages that predate it.
  function insertAfterDecisions(node){
    const anchor=document.querySelector("main .decision-strip")||document.querySelector("main .page-hero,main .hero");
    if(anchor){anchor.insertAdjacentElement("afterend",node);return;}
    const main=document.querySelector("main");if(main)main.append(node);
  }
  const CACHE_KEY="mackinac-surface-cache-v1";
  function readCache(answers){
    try{const all=JSON.parse(localStorage.getItem(CACHE_KEY)||"{}");const hit=all[rawSurface];return hit&&hit.sig===JSON.stringify(answers)?hit.data:null;}catch{return null;}
  }
  function writeCache(answers,data){
    try{const all=JSON.parse(localStorage.getItem(CACHE_KEY)||"{}");all[rawSurface]={sig:JSON.stringify(answers),data,at:Date.now()};localStorage.setItem(CACHE_KEY,JSON.stringify(all));}catch{}
  }
  function ensureFocusHost(){
    let host=document.querySelector("[data-mackinac-platform-focus]");
    if(host)return host;
    host=document.createElement("section");
    host.className="shell platform-focus-wrap";
    host.dataset.mackinacPlatformFocus="1";
    insertAfterDecisions(host);
    return host;
  }

  function applyNavOrder(order=[]){
    const nav=document.querySelector(".mackinac-destination-nav");
    if(!nav||!order.length)return;
    const links=new Map([...nav.querySelectorAll("[data-mackinac-nav]")].map(a=>[a.dataset.mackinacNav,a]));
    const seen=new Set();
    const normalized=order.map(item=>({...item,id:(item.id==="today"||item.id==="plan")?"my-trip":item.id})).filter(item=>!seen.has(item.id)&&seen.add(item.id));
    // Primary nav keeps a fixed order on every page. Reordering it per visitor made the
    // tabs jump under the pointer after each navigation; the next useful stop is marked.
    const current=rawSurface==="today"?"my-trip":rawSurface;
    const first=normalized.find(x=>x.id!==current&&x.id!=="my-trip"&&links.has(x.id));
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
      insertAfterDecisions(shell);
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
    return `<div class="platform-adaptive" data-platform-adaptive><strong>One more question:</strong><span>${esc(q.prompt)}</span><div class="platform-choice-row">${q.options.map(([value,label])=>`<button type="button" data-adaptive-id="${esc(q.id)}" data-adaptive-value="${esc(value)}">${esc(label)}</button>`).join("")}<button type="button" class="muted-choice" data-adaptive-skip>Skip</button></div></div>`;
  }

  function renderFocus(profile,surface,answers){
    const host=ensureFocusHost();
    const focus=surface?.focus;
    if(!focus){host.remove();return;}
    host.innerHTML=`<div class="platform-focus-card"><div><span class="platform-kicker">For your trip · ${esc(surfaceLabel())}</span><h2>${esc(focus.title)}</h2><p>${esc(focus.summary)}</p></div><a class="btn primary" href="${esc(surface.nav_order?.find(x=>x.id===focus.next)?.path||"/mackinac-island/")}">Next: ${esc(({plan:"Trip guide",today:"My Trip",ferries:"Ferries",stay:"Stay",eat:"Eat",explore:"Explore",events:"Events",straits:"Straits"})[focus.next]||"My Trip")}</a>${adaptiveMarkup(profile)}</div>`;
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

  function paint(data,answers){
    renderFocus(data.profile,data.surface,data.profile?.answers||answers);
    renderSavedContext(data.profile,data.surface,readPlan());
    applyNavOrder(data.surface?.nav_order);
    applyPlaceRanking(data.surface);
  }
  async function personalize(answers,{fromCache=false}={}){
    // Last answer for this page paints immediately; the live answer then refreshes it
    // in place. Visitors returning to a page never watch it rebuild.
    const cached=readCache(answers);
    if(cached&&!fromCache)paint(cached,answers);
    try{
      const data=await classify(answers);
      write({answers:data.profile?.answers||answers,profile:data.profile});
      writeCache(answers,data);
      if(!cached||JSON.stringify(cached)!==JSON.stringify(data))paint(data,answers);
      track("mackinac_surface_personalized",{surface:data.surface?.surface||rawSurface,profile:data.profile?.primary?.id||"unknown",engine:data.surface?.engine||data.profile?.engine||"deterministic"});
    }catch(error){
      if(cached)return;
      const host=ensureFocusHost();
      host.innerHTML=`<div class="platform-focus-card degraded"><div><span class="platform-kicker">Your trip is saved</span><h2>Your suggestion for this page didn’t load</h2><p>Everything in the guide below still applies. Reload in a moment to see what fits your trip.</p></div></div>`;
    }
  }

  function valuePresent(q,value){
    return q.type==="multi"?Array.isArray(value)&&value.length>0:Boolean(value);
  }

  // The build-your-trip prompt ships in the page's hero strip, so nothing is injected
  // here; this only records that an unplanned visitor saw it.
  function renderStartGate(){
    document.documentElement.classList.remove("has-trip");
    track("mackinac_trip_gate_shown",{surface:rawSurface});
  }
  function wireTracking(){
    document.querySelectorAll("[data-mackinac-nav]").forEach(a=>a.addEventListener("click",()=>track("mackinac_destination_nav",{surface:rawSurface,target:a.dataset.mackinacNav||"unknown"})));
    document.querySelectorAll("[data-mackinac-planner-cta]").forEach(a=>a.addEventListener("click",()=>track("mackinac_planner_cta",{surface:rawSurface})));
  }

  async function apply(){
    normalizePrimaryNav();
    wireTracking();
    if(isLive)return;
    const saved=read();
    if(saved?.profile?.complete&&saved?.answers)await personalize(saved.answers);
    else renderStartGate();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
})();