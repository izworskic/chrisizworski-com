(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

function fmtTime(iso){
  try{
    return new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",hour:"numeric",minute:"2-digit",month:"short",day:"numeric"}).format(new Date(iso))+" ET";
  }catch{return "just now";}
}
function fmtDate(){
  try{
    return new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(new Date());
  }catch{return "Today";}
}
function activityLabel(a){
  return {hiking:"Hiking",scenic:"Walking + scenery",birding:"Birding",paddling:"Paddling","dark-sky":"Night sky"}[a]||"Outside";
}
function rowLabel(c,index){
  if(index===0)return"First choice";
  if(c.activity==="dark-sky")return"Tonight";
  if(c.place.driveClass==="far")return"Longer drive";
  if(c.place.driveClass==="near")return"Closer";
  return"Also worth considering";
}
function fact(label,value){
  if(value==null)return"";
  return `<span><b>${esc(label)}</b> ${esc(value)}</span>`;
}
function weatherLine(w){
  if(!w)return"";
  const bits=[
    w.high!=null?`${w.high}° high`:null,
    w.rainChance!=null?`${w.rainChance}% rain`:null,
    w.gust!=null?`gusts ${w.gust} mph`:null,
    w.aqi!=null?`AQI ${w.aqi}`:null
  ].filter(Boolean);
  return bits.map(x=>`<span>${esc(x)}</span>`).join("");
}
function renderPlace(c,index,note){
  return `<article class="place-row${index===0?" lead-row":""}">
    <div class="rank-col">
      <span class="rank">${index+1}</span>
      <span class="row-kicker">${esc(rowLabel(c,index))}</span>
    </div>
    <div class="place-copy">
      <h3>${esc(c.place.name)}</h3>
      <div class="place-meta">${esc(c.place.area)} · ${esc(c.place.drive)} from central Detroit · ${esc(activityLabel(c.activity))}</div>
      <p class="place-note">${esc(note||c.story?.move||"")}</p>
      <div class="conditions">${weatherLine(c.weather)}</div>
      <div class="row-links">
        <a href="${esc(c.verifyUrl)}">Live conditions →</a>
        <a href="${esc(c.place.officialUrl)}" rel="noopener">Official place page</a>
      </div>
    </div>
  </article>`;
}
function renderSource(name,state,total){
  const ok=state===total;
  return `<div class="source-pill"><strong>${esc(name)}</strong><span class="${ok?"ok":"partial"}">${esc(state)}/${esc(total)}</span></div>`;
}

async function load(){
  $("#edition-date").textContent=fmtDate();
  try{
    const res=await fetch("/api/detroit-outdoors?edition=journal-v3",{headers:{accept:"application/json"}});
    const data=await res.json();
    if(!res.ok||!data.ok)throw new Error(data.error||"Live edition unavailable");

    document.body.classList.remove("loading");
    const edition=data.edition||{};
    $("#read-title").textContent=edition.headline||"The day is taking shape.";
    $("#desk-note").textContent=edition.read||data.editorial||"";
    $("#updated").textContent="Updated "+fmtTime(data.generatedAt);
    $("#writer-status").textContent="";

    const lead=data.opportunities&&data.opportunities[0];
    if(lead){
      $("#lead-place").textContent=lead.place.name;
      $("#lead-drive").textContent=lead.place.drive;
      $("#lead-high").textContent=lead.weather?.high!=null?lead.weather.high+"°":"—";
      $("#lead-rain").textContent=lead.weather?.rainChance!=null?lead.weather.rainChance+"%":"—";
      $("#lead-wind").textContent=lead.weather?.gust!=null?lead.weather.gust+" mph":"—";
      $("#lead-facts").hidden=false;
    }else{
      $("#lead-facts").hidden=true;
    }

    const notes=edition.notes||{};
    const list=$("#opportunity-list");
    if(data.opportunities&&data.opportunities.length){
      list.innerHTML=data.opportunities.map((c,i)=>renderPlace(c,i,notes[c.id])).join("");
    }else{
      list.innerHTML='<div class="error">Nothing on the current board has enough evidence to justify a recommendation.</div>';
    }

    const fall=$("#fall-panel");
    if(data.fallColor){
      $("#fall-value").textContent=data.fallColor.label+" · about "+Math.round(data.fallColor.modeledPercent)+"%";
      $("#fall-copy").textContent="The Southeast Lower model puts the usual peak window at "+data.fallColor.peakWindow+". Treat the percentage as regional timing, not a claim about what any one tree looks like.";
      fall.hidden=false;
    }else fall.hidden=true;

    const sh=data.sourceHealth||{};
    $("#source-grid").innerHTML=[
      renderSource("Place conditions",sh.outdoorsNowPlaces?.ok||0,sh.outdoorsNowPlaces?.total||6),
      renderSource("NWS alert checks",sh.nwsAlerts?.ok||0,sh.nwsAlerts?.total||6),
      `<div class="source-pill"><strong>Statewide comparison</strong><span class="${sh.outdoorsNowOpportunityLayer?.ok?"ok":"partial"}">${sh.outdoorsNowOpportunityLayer?.ok?"live":"degraded"}</span></div>`,
      `<div class="source-pill"><strong>Daily writing</strong><span class="${/anthropic|cached-ai/.test(data.decision?.editorial?.mode||"")?"ok":"partial"}">${/anthropic|cached-ai/.test(data.decision?.editorial?.mode||"")?"live":"fallback"}</span></div>`
    ].join("");
    $("#suppressed").textContent=data.suppressed?.length
      ?data.suppressed.length+" place(s) were withheld because of active NWS hazard rules."
      :"No place was withheld by the hard NWS hazard rule on this update.";
  }catch(error){
    document.body.classList.remove("loading");
    $("#read-title").textContent="The live edition did not load.";
    $("#desk-note").textContent="The source feeds are temporarily unavailable. The page will try again on the next refresh.";
    $("#updated").textContent="Live refresh failed";
    $("#opportunity-list").innerHTML='<div class="error">Today’s place list is temporarily unavailable.</div>';
  }
}

document.addEventListener("click",function(event){
  const link=event.target.closest("a");
  if(!link)return;
  let url;try{url=new URL(link.href,location.href);}catch{return;}
  if(typeof window.gtag==="function" && (link.closest(".place-row")||/michiganoutdoorsnow|great-lakes-buoys|northern-lights|michiganbirdingreport|fall-color/.test(url.href))){
    window.gtag("event","detroit_outdoors_handoff",{
      destination:url.hostname.replace(/^www\./,""),
      surface:link.closest(".place-row")?"place-row":"context-link",
      transport_type:"beacon"
    });
  }
});
load();
setInterval(load,30*60*1000);
})();