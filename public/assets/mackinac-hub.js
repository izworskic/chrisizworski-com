(()=>{
  "use strict";
  const PROFILE_KEY="mackinac-trip-profile-v1";
  const surface=String(document.body?.dataset?.mackinacSurface||document.body?.dataset?.mackinacIntent||"unknown");
  function read(){try{const raw=localStorage.getItem(PROFILE_KEY);return raw?JSON.parse(raw):null}catch{return null}}
  function track(name,params={}){try{if(typeof window.gtag==="function")window.gtag("event",name,params)}catch{}}
  function apply(){
    const saved=read();
    if(saved?.profile?.primary)document.body.dataset.mackinacProfile=saved.profile.primary.id||"saved";
    document.querySelectorAll("[data-mackinac-nav]").forEach(a=>a.addEventListener("click",()=>track("mackinac_destination_nav",{surface,target:a.dataset.mackinacNav||"unknown"})));
    document.querySelectorAll("[data-mackinac-planner-cta]").forEach(a=>a.addEventListener("click",()=>track("mackinac_planner_cta",{surface})));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
})();