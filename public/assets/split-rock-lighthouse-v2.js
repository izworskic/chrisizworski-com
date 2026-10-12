(function(){
"use strict";const engine=window.SplitRockLighthouseEngine,form=document.getElementById("visit-form");if(!engine||!form)return;
const $=id=>document.getElementById(id),names={tower:"Inside the lighthouse",grounds:"Historic grounds only",park:"State park shoreline",memorial:"Edmund Fitzgerald memorial"};
let last=null;
function show(track){
 const val={date:$("date").value,experience:$("experience").value,adults:$("adults").value,seniors:$("seniors").value,children:$("children").value};const r=engine.evaluate(val);last=r;
 $("state").textContent=r.state.replace(/_/g," ");
 $("heading").textContent=r.headline;$("detail").textContent=r.detail;
 $("price").replaceChildren();if(r.price!==null){const big=document.createElement("span");big.textContent="$"+r.price.toFixed(2);const mini=document.createElement("small");mini.textContent="Published 2026 admission estimate for your party; excludes park permits and special tours."; $("price").append(big,mini)}else {const label=document.createElement("small");label.textContent="Cost not verified here — use official admission or park rules."; $("price").append(label)}
 $("operator").textContent=val.experience==="park"?"Minnesota DNR":"Minnesota Historical Society";
 $("parking").textContent=val.experience==="park"?"Park lot · vehicle permit":r.state==="MEMORIAL_EVENT"?"Special event · verify parking":r.state==="STANDARD_ADMISSION"||r.state==="GROUNDS_ONLY"?"Historic lot · during site hours":"Off-hours · park permit may apply";
 $("primary-source").href=val.experience==="park"?engine.SOURCE.statepark:val.experience==="memorial"?engine.SOURCE.memorial:engine.SOURCE.hours;
 $("primary-source").textContent=val.experience==="park"?"DNR permits and park ↗":val.experience==="memorial"?"MNHS memorial admission ↗":"Official admission and hours ↗";
 $("parking-link").href=val.experience==="park"?engine.SOURCE.statepark:"https://www.mnhs.org/splitrock/visit/directions";
 $("parking-link").textContent=val.experience==="park"?"State park information ↗":"Historic-site parking ↗";
 const ul=$("requirements");ul.replaceChildren();r.requirements.forEach(text=>{const li=document.createElement("li");li.textContent=text;ul.append(li)});
 if(r.requirements.length===0){const li=document.createElement("li");li.textContent="No admission price or ticket status can be confirmed from the published snapshot for this selection.";ul.append(li)}
 if(track&&typeof window.gtag==="function")window.gtag("event","lighthouse_access_evaluated",{event_category:"decision_tool",decision_state:r.state,experience:val.experience});
}
document.querySelectorAll("[data-experience]").forEach(btn=>btn.addEventListener("click",()=>{const chosen=btn.dataset.experience;$("experience").value=chosen;document.querySelectorAll("[data-experience]").forEach(b=>b.setAttribute("aria-pressed",String(b===btn)));if(chosen==="memorial"){const d=$("date");if(d.value.startsWith("2026-")&&d.value!=="2026-11-10")d.value="2026-11-10";$("date-help").textContent="The published 2026 memorial is November 10. Future memorial programs need official confirmation.";}else $("date-help").textContent="Regular 2026 MNHS hours were published for May 1–October 19. Dates outside that window need separate confirmation.";show(true)}));
form.addEventListener("submit",e=>{e.preventDefault();show(true);$("answer").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})});
["date","adults","seniors","children"].forEach(id=>$(id).addEventListener("change",()=>show(false)));
$("copy-visit").addEventListener("click",async()=>{const x=$("copy-status");if(!last){x.textContent="Choose a ticket first.";return}const text=["Split Rock Lighthouse visit plan",names[$("experience").value],"Date: "+$("date").value,"Decision: "+last.headline,last.detail,"Published 2026 party estimate: "+(last.price===null?"not confirmed":"$"+last.price.toFixed(2)),...last.requirements.map((s,i)=>(i+1)+". "+s),"Source: https://www.mnhs.org/splitrock","Source checked October 12, 2026. Not live ticket availability."].join("\n");try{await navigator.clipboard.writeText(text);x.textContent="Admission plan copied."}catch(e){x.textContent="Browser copy unavailable; use the official links."}});
try{const y=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());if(/^\d{4}-\d{2}-\d{2}$/.test(y))$("date").value=y}catch(e){}
show(false);
})();