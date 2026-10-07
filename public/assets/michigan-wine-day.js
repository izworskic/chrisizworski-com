(()=>{"use strict";
const form=document.getElementById("wineDecisionForm");
const result=document.getElementById("decisionResult");
const dateInput=document.getElementById("tripDate");
const windowSelect=document.getElementById("window");
const custom=document.getElementById("customWindow");
let lastWinner=null;
function track(name,params={}){try{if(typeof window.gtag==="function")window.gtag("event",name,params)}catch{}}
function localISO(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day}
function defaultDate(){const d=new Date();const add=(6-d.getDay()+7)%7;d.setDate(d.getDate()+add);return localISO(d)}
dateInput.value=defaultDate();
dateInput.min=localISO(new Date());
windowSelect.addEventListener("change",()=>{custom.hidden=windowSelect.value!=="custom"});
function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function minutesLabel(n){if(!Number.isFinite(n))return"Unavailable";if(n<60)return Math.round(n)+" min";const h=Math.floor(n/60),m=Math.round(n%60);return h+" hr"+(m?" "+m+" min":"")}
function confidenceClass(value){return value==="High confidence"?"high":value==="Medium confidence"?"medium":"limited"}
function loading(){result.innerHTML='<div class="loading"><span class="spinner" aria-hidden="true"></span><strong>Comparing travel, time, wine fit and evidence…</strong></div>'}
function errorBox(message){result.innerHTML='<div class="error"><strong>Could not make the comparison.</strong><br>'+esc(message)+'</div>'}
function renderAlternative(row,intent){
 const reason=(row.why||[])[0]||((row.gateReasons||[])[0]?"Why it lost: "+row.gateReasons[0]:"A viable alternative with a different tradeoff.");
 const cluster=row.selectedCluster?'<span class="chip">'+esc(row.selectedCluster.label)+'</span>':"";
 return '<details class="alt-card" data-alt="'+esc(row.regionId)+'"><summary>'+esc(row.publicLabel)+(row.feasible?"":" · not practical for this window")+'</summary><div class="alt-facts"><span class="chip">'+esc(minutesLabel(row.travelMin))+' each way</span><span class="chip">'+esc(minutesLabel(row.usableMinutes))+' usable</span>'+cluster+'<span class="chip">'+esc(row.confidence?.class||"")+'</span></div><p>'+esc(reason)+'</p>'+(row.handoff?'<a class="handoff alt-handoff" href="'+esc(row.handoff.url)+'" data-region="'+esc(row.regionId)+'">Build this day instead</a>':"")+'</details>';
}
function systemText(data){
 const bits=[];
 if(data.system?.routingMode==="estimated")bits.push("road routing was unavailable, so travel uses a labeled fallback estimate");
 const adapters=data.system?.adapterStatus||{};
 const fallback=Object.entries(adapters).filter(([,v])=>v==="snapshot-fallback").map(([k])=>k);
 if(fallback.length)bits.push("dated regional adapter snapshot used for "+fallback.join(", "));
 return bits.length?'<p class="system-note"><strong>Degraded evidence:</strong> '+esc(bits.join("; "))+'.</p>':"";
}
function renderDecision(data){
 const d=data.decision;
 if(d.state!=="RECOMMENDATION"){
   const alts=(d.alternatives||[]).map(r=>renderAlternative(r,d.intent)).join("");
   result.innerHTML='<div class="no-fit"><p class="eyebrow">No worthwhile region fits this window</p><h2>Do not spend the day chasing wine country.</h2><p>'+esc(d.message)+'</p>'+systemText(data)+'</div>'+(alts?'<div class="alternatives">'+alts+'</div>':"");
   track("wine_region_failure",{failure_state:"no_worthwhile_region",origin_class:data.origin?.class||"unknown",time_window:d.window?.id||"unknown",intent:d.intent});
   lastWinner=null;return;
 }
 const w=d.winner;
 const reasons=(w.why||[]).slice(0,4).map(x=>'<li>'+esc(x)+'</li>').join("");
 const weather=w.weather?.state==="forecast"?'<div class="fact"><strong>'+esc(w.weather.summary||"Forecast available")+'</strong><span>NWS conditions modifier</span></div>':"";
 const op=w.operating||{};
 const confidenceNotes=(w.confidence?.reasons||[]).slice(0,2).join("; ");
 result.innerHTML='<article class="result-card"><div class="result-head"><div class="result-title"><p class="eyebrow">Best wine region for your day</p><h2>'+esc(w.publicLabel)+'</h2>'+(w.selectedCluster?'<p class="cluster">Start with the '+esc(w.selectedCluster.label)+' cluster</p>':"")+'</div><span class="confidence-badge '+confidenceClass(w.confidence?.class)+'">'+esc(w.confidence?.class||"Evidence confidence")+'</span></div><ul class="reason-list">'+reasons+'</ul><div class="facts"><div class="fact"><strong>'+esc(minutesLabel(w.travelMin))+'</strong><span>estimated each way from '+esc(data.origin?.label||"origin")+'</span></div><div class="fact"><strong>'+esc(minutesLabel(w.usableMinutes))+'</strong><span>usable wine-country time after travel + local driving allowance</span></div><div class="fact"><strong>'+esc(op.knownOpen||0)+' verified / '+esc(op.unknown||0)+' unknown</strong><span>modeled operating evidence for '+esc(op.day||"selected day")+'</span></div><div class="fact"><strong>'+esc(w.intentEvidence)+'</strong><span>positive '+esc(document.getElementById("intent").selectedOptions[0].text.toLowerCase())+' evidence signals; missing is not negative</span></div>'+weather+'</div>'+(confidenceNotes?'<p class="system-note"><strong>Confidence:</strong> '+esc(confidenceNotes)+'.</p>':"")+(w.tradeoff?'<div class="tradeoff"><strong>Why not the obvious alternative?</strong><br>'+esc(w.tradeoff)+'</div>':"")+'<div class="handoff-row"><a id="winnerHandoff" class="handoff" href="'+esc(w.handoff?.url||"#")+'" data-region="'+esc(w.regionId)+'">'+esc(w.handoff?.label||"Build the day")+'</a><span class="handoff-meta">Carries '+esc((w.handoff?.preserves||[]).join(", "))+' into the regional planner.</span></div>'+systemText(data)+'</article><div class="alternatives">'+(d.alternatives||[]).map(r=>renderAlternative(r,d.intent)).join("")+(d.excluded||[]).slice(0,2).map(r=>renderAlternative(r,d.intent)).join("")+'</div>';
 const changed=lastWinner&&lastWinner!==w.regionId;
 track("wine_region_recommendation",{origin_class:data.origin?.class||"unknown",time_window:d.window?.id||"unknown",intent:d.intent,winning_region:w.regionId,confidence_class:(w.confidence?.class||"unknown").toLowerCase().replace(/ /g,"_"),recommendation_changed:changed?"yes":"no"});
 lastWinner=w.regionId;
}
async function run(){
 const origin=document.getElementById("origin").value.trim();
 const date=dateInput.value;
 const intent=document.getElementById("intent").value;
 const windowValue=windowSelect.value;
 if(!origin||!date)return;
 loading();
 const q=new URLSearchParams({origin,date,intent,window:windowValue});
 if(windowValue==="custom"){q.set("start",document.getElementById("customStart").value);q.set("end",document.getElementById("customEnd").value)}
 try{
  const r=await fetch("/api/michigan-wine-day?"+q.toString(),{headers:{"accept":"application/json"}});
  const data=await r.json();
  if(!r.ok||!data.ok)throw new Error(data.message||"The decision service did not return a result.");
  renderDecision(data);
 }catch(err){errorBox(err.message||"Try again.");track("wine_region_failure",{failure_state:"request_failed",time_window:windowValue,intent})}
}
form.addEventListener("submit",e=>{e.preventDefault();run()});
result.addEventListener("click",e=>{const link=e.target.closest("a.handoff");if(!link)return;track("wine_region_planner_handoff",{winning_region:link.dataset.region||"unknown",intent:document.getElementById("intent").value,time_window:windowSelect.value})});
result.addEventListener("toggle",e=>{if(e.target?.matches?.("details.alt-card")&&e.target.open)track("wine_region_alternative_opened",{alternative_region:e.target.dataset.alt||"unknown"})},true);
track("wine_region_engine_loaded",{surface:"michigan_wine_day"});
})();