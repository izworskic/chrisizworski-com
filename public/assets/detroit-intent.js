(()=>{"use strict";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const intent=document.body.dataset.detroitIntent;
let loadGeneration=0;
let lastLoadAt=0;
let lastEditorialSignature="";
const refreshMs=intent==="freighter"?5*60*1000:10*60*1000;
const editorialSessionTtlMs=30*60*1000;
const liveUrl=extra=>"/api/detroit-outdoors?intent="+encodeURIComponent(intent)+(extra||"");
const configs={
 freighter:{
  cta:"Open live Great Lakes ship map",
  fallback:"No fresh moving commercial-vessel passage is close enough to Detroit right now.",
  context:"The Detroit signal requires a fresh named commercial-vessel AIS report with active movement. Nearby stopped or crawling vessels do not keep this page pinned after the passage opportunity is gone. The live ship map is still the last check before leaving.",
  editorialTitle:"The ship-watcher read",
  nextTitle:"Use this like a spotter, not a schedule",
  next:["Read the current moving-vessel signal.","Open the live ship map immediately before leaving.","Use the Riverwalk as the viewing corridor only after the live position still makes sense."]
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
 if(state==="live-window")return intent==="freighter"?"Passing signal":"Live window";
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
 if(!rows.length){el.innerHTML="<li>Live evidence is summarized in the decision card above.</li>";return;}
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
function timeLabel(iso){
 const date=new Date(iso||"");
 return Number.isFinite(date.getTime())?date.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):null;
}
function fnv1a(value){
 let hash=2166136261;
 for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return (hash>>>0).toString(36);
}
function numberFrom(text,pattern){
 const match=String(text||"").match(pattern);
 return match?Number(match[1]):null;
}
function editorialSignature(candidate){
 if(!candidate)return"none";
 const specialist=String(candidate.specialist&&candidate.specialist.headline||"");
 const normalized=specialist.replace(/\d+(?:\.\d+)?/g,"#");
 const score=Number.isFinite(Number(candidate.score))?Math.round(Number(candidate.score)/10)*10:null;
 let movement="";
 if(intent==="freighter"){
  const distance=numberFrom(specialist,/([0-9]+(?:\.[0-9]+)?)\s*(?:mi|miles?)/i);
  const speed=numberFrom(specialist,/([0-9]+(?:\.[0-9]+)?)\s*(?:kn|knots?)/i);
  const distanceBand=distance===null?"u":distance<=2?"0-2":distance<=5?"2-5":distance<=8?"5-8":"8+";
  const speedBand=speed===null?"u":speed<3?"slow":speed<5?"moving":"passage";
  movement=distanceBand+":"+speedBand;
 }
 return fnv1a(JSON.stringify({
  intent,id:candidate.id,place:candidate.place&&candidate.place.id||null,
  source:candidate.sourceEngine||null,opportunity:candidate.opportunityType||null,
  specialist:normalized,movement,score,
  window:candidate.timeWindow&&candidate.timeWindow.label||null,
  confidence:candidate.confidence&&candidate.confidence.level||null
 }));
}
function editorialStorageKey(signature){return"detroit-intent-editorial:"+intent+":"+signature;}
function readEditorialSession(signature){
 try{
  const raw=sessionStorage.getItem(editorialStorageKey(signature));
  const parsed=JSON.parse(raw||"null");
  if(!parsed||!parsed.enrichment||Date.now()-Number(parsed.at||0)>editorialSessionTtlMs)return null;
  return parsed.enrichment;
 }catch{return null;}
}
function writeEditorialSession(signature,enrichment){
 try{sessionStorage.setItem(editorialStorageKey(signature),JSON.stringify({at:Date.now(),enrichment}));}catch{}
}
async function loadEditorial(candidate,generation,signature){
 if(!candidate||!candidate.id)return;
 const cached=readEditorialSession(signature);
 if(cached){renderEditorial(cached,candidate);return;}
 setEditorialLoading(candidate);
 try{
  const url=liveUrl("&mode=editorial&candidateId="+encodeURIComponent(candidate.id)+"&editorialSig="+encodeURIComponent(signature));
  const res=await fetch(url,{headers:{accept:"application/json"}});
  const data=await res.json();
  if(generation!==loadGeneration)return;
  if(res.status===409){lastLoadAt=0;return load(true);}
  if(!res.ok||!data.ok)throw new Error(data.error||"Editorial unavailable");
  writeEditorialSession(signature,data.enrichment);
  renderEditorial(data.enrichment,candidate);
 }catch{
  if(generation===loadGeneration)renderEditorial(null,candidate);
 }
}
async function load(force=false){
 if(!force&&lastLoadAt&&Date.now()-lastLoadAt<refreshMs)return;
 const generation=++loadGeneration;
 const status=$("#intent-status"),title=$("#intent-headline"),copy=$("#intent-copy"),list=$("#intent-reasons"),updated=$("#intent-updated"),primary=$("#intent-primary"),context=$("#intent-context"),editorial=$("#intent-editorial");
 try{
  const res=await fetch(liveUrl(""),{headers:{accept:"application/json"}});
  const data=await res.json();
  if(generation!==loadGeneration)return;
  if(!res.ok||!data.ok||!data.intent)throw new Error(data.error||"Intent signal unavailable");
  lastLoadAt=Date.now();
  const signal=data.intent,c=signal.candidate;
  status.textContent=statusLabel(signal.status);status.className="signal-status "+signal.status;
  title.textContent=headline(c);
  copy.textContent=c?(c.whyNow||config.context):(signal.noSignal||config.fallback);
  const reasons=c?reasonText(c):((signal.rejected||[]).flatMap(r=>r.reasons||[]).slice(0,4));
  list.innerHTML=reasons.length?reasons.map(r=>"<li>"+esc(r)+"</li>").join(""):"<li>"+esc(config.context)+"</li>";
  const refreshed=timeLabel(data.generatedAt);
  const sourceTime=intent==="freighter"&&c&&c.timeWindow?timeLabel(c.timeWindow.start):null;
  updated.textContent=sourceTime?"AIS report "+sourceTime+(refreshed?" · page refreshed "+refreshed:""):(refreshed?"Updated "+refreshed:"Updated now");
  context.textContent=config.context;
  primary.href=c&&c.specialistHandoff&&c.specialistHandoff.url||signal.deeperUrl||"/detroit-outdoors/";
  primary.textContent=config.cta+" →";
  renderMetrics(signal.metrics);
  renderEvidence(c);
  renderWatch(c,signal);
  renderNext();
  if(c){
    const signature=editorialSignature(c);
    if(signature!==lastEditorialSignature){
      lastEditorialSignature=signature;
      loadEditorial(c,generation,signature);
    }
  }else if(editorial){
    lastEditorialSignature="";
    editorial.hidden=true;
  }
 }catch(err){
  if(generation!==loadGeneration)return;
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
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&Date.now()-lastLoadAt>=refreshMs)load();});
load(true);setInterval(()=>load(),refreshMs);
})();