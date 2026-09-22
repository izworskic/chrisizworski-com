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
function cleanOpportunityTitle(value){
 return String(value||"").replace(/\s+window$/i,"").replace(/\s+/g," ").trim();
}
function vesselName(c){
 const headline=String(c?.specialist?.headline||"");
 const name=headline.split("·")[0].trim();
 return name&&!/fresh great lakes ais|water check/i.test(name)?name:"A freighter";
}
function compactOpportunity(c){
 if(!c)return"";
 const engine=String(c.sourceEngine||"");
 const place=String(c.place?.name||"Southeast Michigan");
 if(engine==="great-lakes-ais")return vesselName(c)+" on the Detroit River";
 if(engine==="sunset-photography")return"Detroit River sunset";
 if(engine==="great-lakes-water")return"Lake St. Clair calm water";
 if(engine==="night-sky-aurora")return place+" night sky";
 if(engine==="fall-color-phenology")return place+" fall color";
 const title=cleanOpportunityTitle(c.title);
 return title?place+" "+title.toLowerCase():place;
}
function leadHeadline(c){
 if(!c)return"Nothing clears the bar right now.";
 const engine=String(c.sourceEngine||"");
 const place=String(c.place?.name||"Southeast Michigan");
 if(engine==="great-lakes-ais")return vesselName(c)+" is on the Detroit River right now.";
 if(engine==="sunset-photography")return"Detroit River sunset conditions are lining up tonight.";
 if(engine==="great-lakes-water")return"Lake St. Clair has a calm-water window.";
 if(engine==="night-sky-aurora")return place+" has a night-sky window tonight.";
 if(engine==="fall-color-phenology")return place+" has a fall-color window today.";
 const story=String(c.story?.headline||"").trim();
 if(story)return story;
 const title=cleanOpportunityTitle(c.title).toLowerCase();
 return title?place+" leads today for "+title+".":place+" leads today.";
}
function renderTopline(opportunities){
 const items=Array.isArray(opportunities)?opportunities.filter(Boolean):[];
 const h=$("#live-headline"),dek=$("#live-dek");
 if(!h||!dek)return;
 if(!items.length){
  h.textContent="Nothing clears the bar right now.";
  dek.textContent="No strong outdoor window has made the short list yet.";
  return;
 }
 h.textContent=leadHeadline(items[0]);
 const rest=items.slice(1,4).map(compactOpportunity).filter(Boolean);
 dek.textContent=rest.length?rest.join(" · "):compactOpportunity(items[0]);
}
function intentPageFor(c){
 const engine=String(c&&c.sourceEngine||"");
 if(engine==="great-lakes-ais")return{url:"/detroit-river-freighters/",label:"Open Detroit River freighter read"};
 if(engine==="great-lakes-water")return{url:"/lake-st-clair-outdoors/",label:"Check Lake St. Clair window"};
 if(engine==="sunset-photography")return{url:"/detroit-sunset-tonight/",label:"Check Detroit sunset tonight"};
 if(c&&c.activity==="birding")return{url:"/detroit-birding-today/",label:"Open Detroit birding today"};
 return null;
}
function deeperLabel(c){
 const engine=String(c&&c.sourceEngine||"");
 if(engine==="great-lakes-ais")return"Open live ship map";
 if(engine==="great-lakes-water")return"Open Great Lakes buoys";
 if(engine==="night-sky-aurora")return"Check Northern Lights Michigan";
 if(engine==="fall-color-phenology")return"Open fall color report";
 if(c&&c.activity==="birding")return"Open live bird sightings";
 return"Open the deeper check";
}
function cardActions(c){
 const intent=intentPageFor(c);
 const deeper=c&&c.specialistHandoff&&c.specialistHandoff.url||c&&c.verifyUrl||"";
 const official=c&&c.place&&c.place.officialUrl||"";
 if(intent){
  const secondary=deeper&&deeper!==intent.url
    ?`<a class="btn secondary" href="${esc(deeper)}" rel="noopener">${esc(deeperLabel(c))}</a>`
    :official?`<a class="btn secondary" href="${esc(official)}" rel="noopener">Official place info</a>`:"";
  return `<a class="btn" href="${esc(intent.url)}">${esc(intent.label)}</a>${secondary}`;
 }
 const primary=deeper?`<a class="btn" href="${esc(deeper)}">${esc(deeperLabel(c))}</a>`:"";
 const secondary=official&&official!==deeper?`<a class="btn secondary" href="${esc(official)}" rel="noopener">Official place info</a>`:"";
 return primary+secondary;
}
function renderCard(c,note,sources){
 const specialist=c.specialist?`<div class="specialist"><strong>${esc(c.specialist.label)}:</strong> ${esc(c.specialist.headline)}</div>`:"";
 const reasons=((c.story&&c.story.whyToday)||c.reasons||[]).slice(0,3).map(r=>`<li>${esc(r)}</li>`).join("");
 const sourceLine=note&&Array.isArray(sources)&&sources.length?`<div class="card-source">Context: ${sources.map(s=>`<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`).join(" · ")}</div>`:"";
 return `<article class="card">
   <div class="slot">${esc(c.slot)}</div>
   <h3>${esc(c.place.name)}</h3>
   <div class="meta">${esc(c.place.area)} · ${esc(c.place.drive)} from central Detroit · ${esc(c.title)}</div>
   <div class="scoreline"><span class="score">${esc(c.score)}/100</span><span class="quality">${esc(c.quality)}</span></div>
   <div class="weather">${renderWeather(c.weather)}</div>
   ${note?`<div class="card-read"><span>Why this matters</span><p>${esc(note)}</p>${sourceLine}</div>`:""}
   <ul class="reasons">${reasons}</ul>
   ${specialist}
   <p class="caveat">${esc(c.caveat)}</p>
   <div class="actions">${cardActions(c)}</div>
 </article>`;
}
function renderSource(name,state,total){
 const cls=state===total?"ok":"partial";
 return `<div class="source-pill"><strong>${esc(name)}</strong><br><span class="${cls}">${esc(state)}/${esc(total)} sources responding</span></div>`;
}
async function load(){
 try{
  const res=await fetch("/api/detroit-outdoors?edition=cards-v1",{headers:{accept:"application/json"}});
  const data=await res.json();
  if(!res.ok||!data.ok)throw new Error(data.error||"Live desk unavailable");
  document.body.classList.remove("loading");
  const verdict=$("#verdict");
  verdict.textContent=data.verdict.label;
  if(data.verdict.label==="QUIET")verdict.classList.add("quiet");
  $("#verdict-detail").textContent=data.verdict.detail;
  $("#updated").textContent="Updated "+fmtTime(data.generatedAt);
  renderTopline(data.opportunities);
  $("#desk-note").textContent=data.editorial;
  const cards=$("#opportunity-grid");
  if(data.opportunities&&data.opportunities.length){
    cards.innerHTML=data.opportunities.map(c=>renderCard(c,data.edition?.notes?.[c.id],data.edition?.noteSources?.[c.id])).join("");
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