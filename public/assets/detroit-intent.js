(()=>{"use strict";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const intent=document.body.dataset.detroitIntent;
const configs={
 freighter:{cta:"Open live Great Lakes ship map",fallback:"No fresh commercial-vessel window is close enough to Detroit right now.",context:"The detector looks for fresh named commercial-vessel AIS reports within the Detroit River window. AIS can move or disappear quickly, so the map is the last check before leaving."},
 birding:{cta:"Open live Michigan bird sightings",fallback:"No Detroit birding window clears the current weather and hazard filters.",context:"This page identifies a weather-and-season birding window, not a sighting. Use the live Michigan Birding Report for actual recent observations and hotspots."},
 water:{cta:"Open Great Lakes buoy conditions",fallback:"Lake St. Clair does not clear the conservative calm-water gate right now.",context:"The calm-water gate uses a nearby NOAA/NDBC observation plus marine hazards and the land forecast. It is intentionally stricter than a general weather forecast."},
 sunset:{cta:"Open the Detroit Riverfront guide",fallback:"No Detroit sunset/photography window clears the current sky and weather gate.",context:"The sunset read combines deterministic solar timing, NWS sky cover and nearby Detroit weather. Cloud percentage cannot guarantee a colorful sunset."}
};
const config=configs[intent]||configs.birding;
function reasonText(candidate){
 const reasons=Array.isArray(candidate&&candidate.reasons)?candidate.reasons:[];
 return reasons.slice(0,4);
}
function headline(candidate){
 if(!candidate)return config.fallback;
 if(intent==="freighter"&&candidate.specialist&&candidate.specialist.headline)return candidate.specialist.headline;
 if(intent==="water"&&candidate.specialist&&candidate.specialist.headline)return candidate.specialist.headline;
 if(intent==="sunset")return candidate.timeWindow&&candidate.timeWindow.label?candidate.timeWindow.label:"Detroit sunset window";
 if(intent==="birding")return candidate.place&&candidate.place.name?candidate.place.name+" is the strongest birding window right now.":"A Detroit birding window is open.";
 return candidate.story&&candidate.story.headline||candidate.title||"Live Detroit outdoor window";
}
function statusLabel(state){
 if(state==="live-window")return"Live window";
 if(state==="source-unavailable")return"Source unavailable";
 return"Not a window now";
}
async function load(){
 const status=$("#intent-status"),title=$("#intent-headline"),copy=$("#intent-copy"),list=$("#intent-reasons"),updated=$("#intent-updated"),primary=$("#intent-primary"),context=$("#intent-context");
 try{
  const res=await fetch("/api/detroit-outdoors?intent="+encodeURIComponent(intent),{headers:{accept:"application/json"}});
  const data=await res.json();
  if(!res.ok||!data.ok||!data.intent)throw new Error(data.error||"Intent signal unavailable");
  const signal=data.intent,c=signal.candidate;
  status.textContent=statusLabel(signal.status);status.className="signal-status "+signal.status;
  title.textContent=headline(c);
  copy.textContent=c?(c.whyNow||config.context):(signal.noSignal||config.fallback);
  const reasons=c?reasonText(c):((signal.rejected||[]).flatMap(r=>r.reasons||[]).slice(0,4));
  list.innerHTML=reasons.length?reasons.map(r=>"<li>"+esc(r)+"</li>").join(""):"<li>"+esc(config.context)+"</li>";
  updated.textContent="Updated "+new Date(data.generatedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  context.textContent=config.context;
  primary.href=c&&c.specialistHandoff&&c.specialistHandoff.url||signal.deeperUrl||"/detroit-outdoors/";
  primary.textContent=config.cta+" →";
 }catch(err){
  status.textContent="Live refresh unavailable";status.className="signal-status source-unavailable";
  title.textContent=config.fallback;copy.textContent=config.context;list.innerHTML="<li>Open the deeper specialist tool for the latest source data.</li>";
  primary.href="/detroit-outdoors/";primary.textContent="Open Detroit Outdoors Today →";
  updated.textContent="Live signal temporarily unavailable";
 }
}
document.addEventListener("click",e=>{
 const a=e.target.closest("a");if(!a)return;
 if(typeof window.gtag==="function"&&(a.id==="intent-primary"||a.dataset.detroitGrowth)){
  window.gtag("event","detroit_growth_handoff",{intent:intent,destination:a.href,surface:a.id==="intent-primary"?"intent-primary":"intent-related",transport_type:"beacon"});
 }
});
load();setInterval(load,30*60*1000);
})();
