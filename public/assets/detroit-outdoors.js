(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function fmtTime(iso){
  try{
    return new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",hour:"numeric",minute:"2-digit",month:"short",day:"numeric"}).format(new Date(iso))+" ET";
  }catch{return "just now";}
}
function fmtEditionDate(){
  try{
    return new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",weekday:"long",month:"long",day:"numeric"}).format(new Date());
  }catch{return "Today";}
}
function chip(label,value,suffix=""){
  if(value==null)return"";
  return `<span><small>${esc(label)}</small><strong>${esc(value)}${suffix}</strong></span>`;
}
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
function renderWhy(items){
  if(!items||!items.length)return"";
  return `<div class="why"><div class="decision-label">Why today</div>${items.map(x=>`<p>${esc(x)}</p>`).join("")}</div>`;
}
function renderCard(c){
  const s=c.story||{};
  const specialist=s.specialistNote?`<p class="specialist-note">${esc(s.specialistNote)}</p>`:"";
  return `<article class="card">
    <div class="card-top">
      <span class="story-label">${esc(s.label||c.slot||"TODAY")}</span>
      <span class="call">${esc(s.call||c.quality||"CHECK")}</span>
    </div>
    <h3>${esc(s.headline||c.place.name)}</h3>
    <div class="place-line"><strong>${esc(c.place.name)}</strong> · ${esc(c.place.area)} · ${esc(c.place.drive)} from central Detroit</div>
    <div class="move"><span class="decision-label">The move</span><p>${esc(s.move||c.title)}</p></div>
    <div class="worth"><span class="decision-label">Worth the drive?</span><p>${esc(s.worthIt||"Check the conditions and your schedule.")}</p></div>
    ${renderWhy(s.whyToday)}
    ${specialist}
    <div class="weather">${renderWeather(c.weather)}</div>
    <div class="card-score">Decision score ${esc(c.score)}/100 · ${esc(c.quality)}</div>
    <div class="actions">
      <a class="btn" href="${esc(c.verifyUrl)}">Open the live check</a>
      <a class="btn secondary" href="${esc(c.place.officialUrl)}" rel="noopener">Place details</a>
    </div>
  </article>`;
}
function renderSource(name,state,total){
  const cls=state===total?"ok":"partial";
  return `<div class="source-pill"><strong>${esc(name)}</strong><br><span class="${cls}">${esc(state)}/${esc(total)} sources responding</span></div>`;
}
function renderLead(data){
  const lead=data.opportunities&&data.opportunities[0];
  const fp=data.frontPage||{};
  $("#lead-headline").textContent=fp.headline||(lead&&lead.story&&lead.story.headline)||"Today’s outdoor call";
  $("#lead-subhead").textContent=fp.subhead||data.verdict.detail||"";
  $("#quick-take").textContent=fp.quickTake||"The rest of today’s board is below.";

  if(!lead){
    $("#lead-decision").hidden=true;
    $("#lead-actions").hidden=true;
    $("#lead-weather").innerHTML="";
    return;
  }
  const s=lead.story||{};
  $("#lead-move").textContent=s.move||lead.title||"";
  $("#lead-worth").textContent=s.worthIt||"";
  $("#lead-decision").hidden=false;
  $("#lead-weather").innerHTML=renderWeather(lead.weather);
  $("#lead-primary").href=lead.verifyUrl;
  $("#lead-primary").textContent=lead.activity==="dark-sky"?"Check tonight’s sky":lead.activity==="paddling"?"Check water conditions":"Open the live check";
  $("#lead-official").href=lead.place.officialUrl;
  $("#lead-actions").hidden=false;
}
async function load(){
  $("#edition-date").textContent=fmtEditionDate();
  try{
    const res=await fetch("/api/detroit-outdoors",{headers:{accept:"application/json"}});
    const data=await res.json();
    if(!res.ok||!data.ok)throw new Error(data.error||"Live front page unavailable");

    document.body.classList.remove("loading");
    const verdict=$("#verdict");
    verdict.textContent=data.verdict.label;
    verdict.className="verdict";
    if(data.verdict.label==="QUIET"||data.verdict.label==="HOLD")verdict.classList.add("quiet");
    $("#verdict-detail").textContent=data.verdict.detail;
    $("#updated").textContent="Updated "+fmtTime(data.generatedAt);
    $("#desk-note").textContent=data.editorial;
    renderLead(data);

    const cards=$("#opportunity-grid");
    const rest=(data.opportunities||[]).slice(1);
    if(rest.length){
      cards.innerHTML=rest.map(renderCard).join("");
    }else{
      cards.innerHTML='<div class="error">No second-tier destination earned a spot on today’s board. That is useful information too.</div>';
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
      $("#fall-value").textContent=data.fallColor.label+" · ~"+Math.round(data.fallColor.modeledPercent)+"%";
      $("#fall-copy").textContent="Southeast Lower model. Typical peak window: "+data.fallColor.peakWindow+".";
      fall.hidden=false;
    }else fall.hidden=true;

    const sh=data.sourceHealth||{};
    $("#source-grid").innerHTML=[
      renderSource("Michigan Outdoors Now place conditions",sh.outdoorsNowPlaces?.ok||0,sh.outdoorsNowPlaces?.total||6),
      renderSource("NWS point alerts",sh.nwsAlerts?.ok||0,sh.nwsAlerts?.total||6),
      `<div class="source-pill"><strong>Statewide opportunity comparison</strong><br><span class="${sh.outdoorsNowOpportunityLayer?.ok?"ok":"partial"}">${sh.outdoorsNowOpportunityLayer?.ok?"live":"degraded"}</span></div>`,
      `<div class="source-pill"><strong>JEV lead decision</strong><br><span class="${data.decision?.lead?.mode==="shared-harness-jev"?"ok":"partial"}">${esc(data.decision?.lead?.mode||"deterministic")}</span></div>`
    ].join("");
    $("#writer-mode").textContent=data.decision?.editorial?.mode||"deterministic";
    $("#suppressed").textContent=data.suppressed?.length
      ?data.suppressed.length+" place(s) were removed by active NWS hazard rules."
      :"No place was removed by the hard NWS hazard rule on this update.";
  }catch(error){
    document.body.classList.remove("loading");
    $("#lead-headline").textContent="Today’s live edition did not load.";
    $("#lead-subhead").textContent="The page will retry automatically; use the specialist links below in the meantime.";
    $("#desk-note").textContent="The current Detroit outdoor brief is temporarily unavailable.";
    $("#opportunity-grid").innerHTML='<div class="error">Live opportunity data is temporarily unavailable.</div>';
    $("#updated").textContent="Live refresh failed";
  }
}
document.addEventListener("click",function(event){
  const link=event.target.closest("a");
  if(!link)return;
  let url;try{url=new URL(link.href,location.href);}catch{return;}
  if(typeof window.gtag==="function" && (link.closest(".card")||link.closest(".lead")||/michiganoutdoorsnow|great-lakes-buoys|northern-lights|michiganbirdingreport|fall-color/.test(url.href))){
    window.gtag("event","detroit_outdoors_handoff",{
      destination:url.hostname.replace(/^www\./,""),
      surface:link.closest(".lead")?"lead":link.closest(".card")?"opportunity-card":"context-link",
      transport_type:"beacon"
    });
  }
});
load();
setInterval(load,30*60*1000);
})();