(()=>{"use strict";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const intent=document.body.dataset.detroitIntent;
const configs={
 freighter:{
  cta:"Open live Great Lakes ship map",
  fallback:"No fresh commercial-vessel window is close enough to Detroit right now.",
  context:"The detector looks for fresh named commercial-vessel AIS reports within the Detroit River window. AIS can move or disappear quickly, so the map is the last check before leaving.",
  editorialTitle:"The ship-watcher read",
  nextTitle:"Use this like a spotter, not a schedule",
  next:["Read the current named-vessel signal.","Open the live ship map immediately before leaving.","Use the Riverwalk as the viewing corridor only after the live position still makes sense."]
 },
 birding:{
  cta:"Open live Michigan bird sightings",
  fallback:"No Detroit birding window clears the current weather and hazard filters.",
  context:"This page identifies a weather-and-season birding window, not a sighting. Use the live Michigan Birding Report for actual recent observations and hotspots.",
  editorialTitle:"The birder's read",
  nextTitle:"Window first, sightings second",
  next:["Use this page to choose the strongest weather-and-season window.","Check recent sightings and hotspots before committing.","Treat the live sighting source, not migration timing alone, as the final birding check."]
 },
 water:{
  cta:"Open Great Lakes buoy conditions",
  fallback:"Lake St. Clair does not clear the conservative calm-water gate right now.",
  context:"The calm-water gate uses a nearby NOAA/NDBC observation plus marine hazards and the land forecast. It is intentionally stricter than a general weather forecast.",
  editorialTitle:"The water-window read",
  nextTitle:"Regional signal, then launch-level judgment",
  next:["Use the live gate to decide whether Lake St. Clair is worth a closer look.","Open the buoy and marine checks before leaving.","Recheck the actual launch, local wind, traffic, currents and cold-water risk before entering the water."]
 },
 sunset:{
  cta:"Open the Detroit Riverfront guide",
  fallback:"No Detroit sunset/photography window clears the current sky and weather gate.",
  context:"The sunset read combines deterministic solar timing, NWS sky cover and nearby Detroit weather. Cloud percentage cannot guarantee a colorful sunset.",
  editorialTitle:"The sunset read",
  nextTitle:"Treat the forecast as a window, not a promise",
  next:["Use the solar and sky-cover signal to decide whether the evening is worth positioning for.","Arrive with enough margin to choose a riverfront view before the window.","Expect the actual color to remain uncertain until the sky develops."]
 }
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
function renderMetrics(metrics){
 const el=$("#intent-metrics"); if(!el)return;
 if(!Array.isArray(metrics)||!metrics.length){el.innerHTML="";el.hidden=true;return;}
 el.hidden=false;
 el.innerHTML=metrics.map(m=>`<div class="metric"><span class="metric-label">${esc(m.label)}</span><strong>${esc(m.value)}</strong>${m.detail?`<small>${esc(m.detail)}</small>`:""}</div>`).join("");
}
function renderEvidence(candidate){
 const el=$("#intent-evidence");if(!el)return;
 const rows=Array.isArray(candidate&&candidate.verifiedEvidence)?candidate.verifiedEvidence.slice(0,3):[];
 if(!rows.length){
  el.innerHTML="<li>Live evidence is summarized in the decision card above.</li>";
  return;
 }
 el.innerHTML=rows.map(row=>{
  const label=esc(row.sourceLabel||row.source||"Verified source");
  const text=esc(row.text||"");
  const url=row.sourceUrl?esc(row.sourceUrl):"";
  return `<li><strong>${url?`<a href="${url}" rel="noopener">${label}</a>`:label}</strong><span>${text}</span></li>`;
 }).join("");
}
function renderWatch(candidate,signal){
 const el=$("#intent-watch");if(!el)return;
 const uncertainty=Array.isArray(candidate&&candidate.uncertainty)?candidate.uncertainty:[];
 const rejected=Array.isArray(signal&&signal.rejected)?signal.rejected.flatMap(r=>r.reasons||[]):[];
 const rows=(uncertainty.length?uncertainty:rejected).slice(0,3);
 el.innerHTML=(rows.length?rows:[candidate&&candidate.caveat||config.context]).map(x=>`<li>${esc(x)}</li>`).join("");
}
function renderNext(){
 const title=$("#intent-next-title"),list=$("#intent-next");
 if(title)title.textContent=config.nextTitle;
 if(list)list.innerHTML=config.next.map(x=>"<li>"+esc(x)+"</li>").join("");
}
function setEditorialLoading(candidate){
 const wrap=$("#intent-editorial"),title=$("#intent-editorial-title"),copy=$("#intent-editorial-copy"),meta=$("#intent-editorial-meta");
 if(!wrap)return;
 wrap.hidden=false;wrap.classList.add("is-loading");
 if(title)title.textContent=config.editorialTitle;
 if(copy)copy.textContent="Choosing the most useful read from today's verified evidence…";
 if(meta)meta.textContent=candidate&&candidate.place&&candidate.place.name?"Live evidence · "+candidate.place.name:"Live evidence";
}
function renderEditorial(enrichment,candidate){
 const wrap=$("#intent-editorial"),title=$("#intent-editorial-title"),copy=$("#intent-editorial-copy"),meta=$("#intent-editorial-meta"),sources=$("#intent-editorial-sources");
 if(!wrap)return;
 wrap.hidden=false;wrap.classList.remove("is-loading");
 const fallback=candidate&&candidate.story&&candidate.story.whyToday||candidate&&candidate.whyNow||config.context;
 if(title)title.textContent=enrichment&&enrichment.title||config.editorialTitle;
 if(copy)copy.textContent=enrichment&&enrichment.note||fallback;
 if(meta){
  const mode=enrichment&&enrichment.treatment?enrichment.treatment.replaceAll("_"," ").toLowerCase():"evidence read";
  meta.textContent="Today's editorial lens · "+mode;
 }
 if(sources){
  const rows=Array.isArray(enrichment&&enrichment.sources)?enrichment.sources.slice(0,3):[];
  sources.innerHTML=rows.map(s=>s.url?`<a href="${esc(s.url)}" rel="noopener">${esc(s.label||"Source")}</a>`:"").filter(Boolean).join("");
 }
}
async function loadEditorial(candidate){
 if(!candidate||!candidate.id)return;
 setEditorialLoading(candidate);
 try{
  const url="/api/detroit-outdoors?intent="+encodeURIComponent(intent)+"&mode=editorial&candidateId="+encodeURIComponent(candidate.id);
  const res=await fetch(url,{headers:{accept:"application/json"}});
  const data=await res.json();
  if(res.status===409){return load();}
  if(!res.ok||!data.ok)throw new Error(data.error||"Editorial unavailable");
  renderEditorial(data.enrichment,candidate);
 }catch{
  renderEditorial(null,candidate);
 }
}
async function load(){
 const status=$("#intent-status"),title=$("#intent-headline"),copy=$("#intent-copy"),list=$("#intent-reasons"),updated=$("#intent-updated"),primary=$("#intent-primary"),context=$("#intent-context"),editorial=$("#intent-editorial");
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
  renderMetrics(signal.metrics);
  renderEvidence(c);
  renderWatch(c,signal);
  renderNext();
  if(c){
    loadEditorial(c);
  }else if(editorial){
    editorial.hidden=true;
  }
 }catch(err){
  status.textContent="Live refresh unavailable";status.className="signal-status source-unavailable";
  title.textContent=config.fallback;copy.textContent=config.context;list.innerHTML="<li>Open the deeper specialist tool for the latest source data.</li>";
  primary.href="/detroit-outdoors/";primary.textContent="Open Detroit Outdoors Today →";
  updated.textContent="Live signal temporarily unavailable";
  renderMetrics([]);renderNext();
  if(editorial)editorial.hidden=true;
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