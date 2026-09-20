(function(){
  "use strict";
  const body=document.body;
  const intent=body?.dataset?.mackinacIntent||"unknown";
  function event(name,params={}){
    const payload={event:name,event_category:"mackinac_intent",mackinac_intent:intent,...params};
    if(typeof window.gtag==="function")window.gtag("event",name,{event_category:"mackinac_intent",mackinac_intent:intent,...params});
    else{window.dataLayer=window.dataLayer||[];window.dataLayer.push(payload);}
  }
  event("mackinac_intent_landing",{page_path:location.pathname});
  document.querySelectorAll('a[data-mackinac-planner-cta]').forEach((link,index)=>{
    link.addEventListener("click",()=>event("mackinac_intent_to_planner",{cta_position:index+1,destination:link.getAttribute("href")||""}));
  });
})();