(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function fmtTime(iso){try{return new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",hour:"numeric",minute:"2-digit",month:"short",day:"numeric"}).format(new Date(iso))+" ET";}catch{return "just now";}}
function chip(label,value,suffix=""){if(value==null)return"";return `<span>${esc(label)} ${esc(value)}${suffix}</span>`;}
function renderWeather(w){
 if(!w)return"";
 return [
  chip("High",w.high,"°"),
  chip("Rain",w.rainChance,"%"),
  chip("Gusts",w.gust," mph"),
  chip("Clouds",w.cloudCover,"%"),
  chip("AQI",w.aqi)
 ].join("");
}
function renderCard(c){
 const specialist=c.specialist?`<div class="specialist"><strong>${esc(c.specialist.label)}:</strong> ${esc(c.specialist.headline)}</div>`:"";
 const reasons=(c.reasons||[]).map(r=>`<li>${esc(r)}</li>`).join("");
 return `<article class="card">
   <div class="slot">${esc(c.slot)}</div>
   <h3>${esc(c.place.name)}</h3>
   <div class="meta">${esc(c.place.area)} · ${esc(c.place.drive)} from central Detroit · ${esc(c.title)}</div>
   <div class="scoreline"><span class="score">${esc(c.score)}/100</span><span class="quality">${esc(c.quality)}</span></div>
   <div class="weather">${renderWeather(c.weather)}</div>
   <ul class="reasons">${reasons}</ul>
   ${specialist}
   <p class="caveat">${esc(c.caveat)}</p>
   <div class="actions">
     <a class="btn" href="${esc(c.verifyUrl)}">Open the deeper check</a>
     <a class="btn secondary" href="${esc(c.place.officialUrl)}" rel="noopener">Official place info</a>
   </div>
 </article>`;
}
function renderSource(name,state,total){
 const cls=state===total?"ok":"partial";
 return `<div class="source-pill"><strong>${esc(name)}</strong><br><span class="${cls}">${esc(state)}/${esc(total)} sources responding</span></div>`;
}
async function load(){
 try{
  const res=await fetch("/api/detroit-outdoors",{headers:{accept:"application/json"}});
  const data=await res.json();
  if(!res.ok||!data.ok)throw new Error(data.error||"Live desk unavailable");
  document.body.classList.remove("loading");
  const verdict=$("#verdict");
  verdict.textContent=data.verdict.label;
  if(data.verdict.label==="QUIET")verdict.classList.add("quiet");
  $("#verdict-detail").textContent=data.verdict.detail;
  $("#updated").textContent="Updated "+fmtTime(data.generatedAt);
  $("#desk-note").textContent=data.editorial;
  const cards=$("#opportunity-grid");
  if(data.opportunities&&data.opportunities.length){
    cards.innerHTML=data.opportunities.map(renderCard).join("");
  }else{
    cards.innerHTML='<div class="error">The desk is holding because live source coverage is too thin to make a useful recommendation.</div>';
  }
  const media=$("#hero-media");
  if(data.image){
    $("#hero-img").src=data.image.src;
    $("#hero-img").alt=data.image.alt||"Southeast Michigan outdoors";
    $("#hero-credit").innerHTML='File photo: <a href="'+esc(data.image.creditUrl)+'" rel="noopener">'+esc(data.image.credit)+'</a> · <a href="'+esc(data.image.licenseUrl||data.image.creditUrl)+'" rel="noopener">'+esc(data.image.license)+'</a>';
    media.hidden=false;
  }else media.hidden=true;
  const fall=$("#fall-panel");
  if(data.fallColor){
    $("#fall-value").textContent=data.fallColor.label+" · ~"+data.fallColor.modeledPercent+"%";
    $("#fall-copy").textContent="Model estimate for the Southeast Lower. Climatological peak window: "+data.fallColor.peakWindow+". Drivers: "+(data.fallColor.drivers||[]).join(", ")+".";
    fall.hidden=false;
  }else fall.hidden=true;
  const sh=data.sourceHealth||{};
  $("#source-grid").innerHTML=[
    renderSource("Michigan Outdoors Now place conditions",sh.outdoorsNowPlaces?.ok||0,sh.outdoorsNowPlaces?.total||6),
    renderSource("NWS point alerts",sh.nwsAlerts?.ok||0,sh.nwsAlerts?.total||6),
    `<div class="source-pill"><strong>Opportunity comparison</strong><br><span class="${sh.outdoorsNowOpportunityLayer?.ok?"ok":"partial"}">${sh.outdoorsNowOpportunityLayer?.ok?"live":"degraded"}</span></div>`,
    `<div class="source-pill"><strong>JEV lead judgment</strong><br><span class="${data.decision?.lead?.mode==="shared-harness-jev"?"ok":"partial"}">${esc(data.decision?.lead?.mode||"deterministic")}</span></div>`
  ].join("");
  $("#writer-mode").textContent=data.decision?.editorial?.mode||"deterministic";
  $("#suppressed").textContent=data.suppressed?.length?data.suppressed.length+" place(s) suppressed by active NWS hazard rules.":"No place was suppressed by the hard NWS hazard veto on this update.";
 }catch(error){
   document.body.classList.remove("loading");
   $("#opportunity-grid").innerHTML='<div class="error">Live opportunity data is temporarily unavailable. Use the specialist tools below while the desk recovers.</div>';
   $("#updated").textContent="Live refresh failed";
 }
}
document.addEventListener("click",function(event){
  const link=event.target.closest("a");
  if(!link)return;
  let url;try{url=new URL(link.href,location.href);}catch{return;}
  if(typeof window.gtag==="function" && (link.closest(".card") || /michiganoutdoorsnow|great-lakes-buoys|northern-lights|michiganbirdingreport|fall-color/.test(url.href))){
    window.gtag("event","detroit_outdoors_handoff",{
      destination:url.hostname.replace(/^www\./,""),
      surface:link.closest(".card")?"opportunity-card":"context-link",
      transport_type:"beacon"
    });
  }
});
load();
setInterval(load,30*60*1000);
})();