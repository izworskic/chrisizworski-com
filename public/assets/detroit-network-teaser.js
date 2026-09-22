(()=>{"use strict";
const configs={
 freighter:{url:"/api/detroit-outdoors?intent=freighter",href:"/detroit-river-freighters/",fallback:"No fresh Detroit River freighter window right now."},
 water:{url:"/api/detroit-outdoors?intent=water",href:"/lake-st-clair-outdoors/",fallback:"Lake St. Clair is not clearing the calm-water gate right now."}
};
function candidateHeadline(c){
 if(!c)return"";
 if(c.specialist&&c.specialist.headline)return c.specialist.headline;
 if(c.story&&c.story.headline)return c.story.headline;
 return c.title||((c.place&&c.place.name)||"Detroit Outdoors");
}
async function hydrate(node){
 const intent=node.dataset.detroitIntent||"";
 const engine=node.dataset.detroitEngine||"";
 const cfg=configs[intent]||null;
 const url=cfg?cfg.url:"/api/detroit-outdoors?edition=cards-v1&surface=network-teaser";
 try{
  const res=await fetch(url,{headers:{accept:"application/json"}});
  const data=await res.json();
  if(!res.ok||!data.ok)throw new Error("Detroit signal unavailable");
  let c=null,copy="",href=cfg?cfg.href:"/detroit-outdoors/";
  if(cfg){
    c=data.intent&&data.intent.candidate||null;
    copy=c?(c.whyNow||"A live Detroit opportunity cleared the current gates."):(data.intent&&data.intent.noSignal||cfg.fallback);
  }else{
    const rows=Array.isArray(data.opportunities)?data.opportunities:[];
    c=rows.find(x=>x&&x.sourceEngine===engine)||rows[0]||null;
    copy=c?(c.whyNow||((c.story&&c.story.move)||"Open the Detroit board for the current short list.")):"The Detroit board is quiet right now.";
  }
  node.querySelector("[data-dnt-headline]").textContent=c?candidateHeadline(c):(cfg?cfg.fallback:"Detroit Outdoors is quiet right now.");
  node.querySelector("[data-dnt-copy]").textContent=copy;
  const a=node.querySelector("[data-dnt-link]");a.href=href;
  node.hidden=false;
 }catch{
  node.querySelector("[data-dnt-headline]").textContent="See what changed around Detroit today.";
  node.querySelector("[data-dnt-copy]").textContent="Open the Detroit Outdoors board for the current live short list.";
  node.querySelector("[data-dnt-link]").href="/detroit-outdoors/";
  node.hidden=false;
 }
}
document.querySelectorAll("[data-detroit-teaser]").forEach(hydrate);
document.addEventListener("click",e=>{
 const a=e.target.closest("[data-dnt-link]");if(!a)return;
 if(typeof window.gtag==="function")window.gtag("event","detroit_network_open",{source:document.body.dataset.analyticsPage||location.pathname,destination:a.href,transport_type:"beacon"});
});
})();
