(function(){
"use strict";
const app=window.SplitRockRiverEngine,form=document.getElementById("hike-form");
if(!app||!form)return;
const $=id=>document.getElementById(id);
let last=null;
const goals={loop:"Full loop by the official alternate",east:"East side out and back",west:"West side out and back",thru:"Through-hike on the SHT",ford:"Former upper bridge crossing"};
function present(track){
 const r=app.evaluate({goal:$("goal").value,time:$("time").value,date:$("date").value});last=r;
 $("state").textContent=r.code.replace(/_/g," ");
 $("heading").textContent=r.heading;
 $("summary").textContent=r.summary;
 $("decision-note").textContent=r.code==="UNBRIDGED_CROSSING"?"NO BRIDGE at the former crossing. No ford clearance is available.":r.code==="RECHECK_BULLETIN"?"SOURCE RECHECK NEEDED: your date is well after the notice used by this planner.":$("goal").value==="loop"?"Follow the signed Highway 61 underpass alternate; do not improvise a river ford.":$("goal").value==="east"||$("goal").value==="west"?"Return on the same side, turning around before the former bridge crossing.":"Confirm each junction against the official SHTA route map.";
 const list=$("steps");list.replaceChildren();
 r.steps.forEach((step)=>{const li=document.createElement("li");li.textContent=step;list.appendChild(li)});
 if(track&&typeof window.gtag==="function")window.gtag("event","split_rock_route_evaluated",{event_category:"decision_tool",decision_state:r.code,route_goal:$("goal").value});
}
document.querySelectorAll("[data-goal]").forEach(btn=>btn.addEventListener("click",()=>{
 $("goal").value=btn.dataset.goal;
 document.querySelectorAll("[data-goal]").forEach(b=>b.setAttribute("aria-pressed",String(b===btn)));
 present(true);
}));
form.addEventListener("submit",e=>{e.preventDefault();present(true);$("result").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"})});
$("time").addEventListener("change",()=>present(false));
$("date").addEventListener("change",()=>present(false));
$("copy-route").addEventListener("click",async()=>{const msg=$("copy-status");if(!last){msg.textContent="Select a route first.";return}
 const text=["Split Rock River Loop — field plan","Choice: "+goals[$("goal").value],last.heading,last.summary,...last.steps.map((x,i)=>(i+1)+". "+x),"Official conditions: https://superiorhiking.org/trail-conditions/","Official route map: https://superiorhiking.org/trail-section/two-harbors-to-silver-bay/","Source reviewed October 12, 2026; not live or navigable instructions."].join("\n");
 try{await navigator.clipboard.writeText(text);msg.textContent="Route summary copied. Check SHTA before hiking."}catch(e){msg.textContent="Copy unavailable in this browser. Use the official source links above."}
});
try{const s=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());if(/^\d{4}-\d{2}-\d{2}$/.test(s))$("date").value=s}catch(e){}
present(false);
})();