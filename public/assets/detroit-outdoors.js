(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const OBS_PREFIX="detroit-observation:";
function observe(event,params={},dedupeKey=""){
 if(typeof window.gtag!=="function")return;
 if(dedupeKey){
  const key=OBS_PREFIX+event+":"+dedupeKey;
  try{if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,"1");}catch{}
 }
 window.gtag("event",event,{...params,transport_type:"beacon"});
}
function boardSignature(opportunities){
 return (Array.isArray(opportunities)?opportunities:[]).map(c=>c&&c.id).filter(Boolean).slice(0,4).join("|")||"empty";
}
function degradedSourceCount(sourceHealth){
 const sh=sourceHealth||{};
 let count=0;
 if(Number(sh.outdoorsNowPlaces?.ok||0)<Number(sh.outdoorsNowPlaces?.total||6))count++;
 if(Number(sh.nwsAlerts?.ok||0)<Number(sh.nwsAlerts?.total||6))count++;
 if(!sh.outdoorsNowOpportunityLayer?.ok)count++;
 return count;
}
function heroRepeat(imageId){
 if(!imageId)return false;
 try{
  const key="detroit-outdoors:last-hero-id";
  const previous=localStorage.getItem(key)||"";
  localStorage.setItem(key,imageId);
  return previous===imageId;
 }catch{return false;}
}
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
 const bundle=Array.isArray(c.bundleSignals)?c.bundleSignals:[];
 const engine=String(c.sourceEngine||"");
 const place=String(c.place?.name||"Southeast Michigan");
 if(bundle.length>1)return place+": "+bundle.map(signal=>cleanOpportunityTitle(signal.title||signal.opportunityType||signal.activity)).filter(Boolean).join(" + ");
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
 const bundle=Array.isArray(c.bundleSignals)?c.bundleSignals:[];
 const engine=String(c.sourceEngine||"");
 const place=String(c.place?.name||"Southeast Michigan");
 if(bundle.length>1)return place+" has "+bundle.length+" live reasons to go today.";
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
function windowLabel(c){
 const value=String(c&&c.timeWindow&&c.timeWindow.label||"Today").trim();
 return value||"Today";
}
function confidenceLabel(c){
 const value=String(c&&c.confidence&&c.confidence.level||"medium").trim();
 return value?value.charAt(0).toUpperCase()+value.slice(1):"Medium";
}
function driveLabel(c){
 return String(c&&c.travel&&c.travel.driveBand||c&&c.place&&c.place.drive||"Local").trim()||"Local";
}
function renderDecisionFacts(c){
 const setting=String(c&&c.place&&c.place.setting||"").trim();
 return `<div class="decision-facts">
   <div class="decision-fact"><span>BEST WINDOW</span><strong>${esc(windowLabel(c))}</strong><small>Current usable timing</small></div>
   <div class="decision-fact"><span>DRIVE</span><strong>${esc(driveLabel(c))}</strong><small>From central Detroit</small></div>
   <div class="decision-fact"><span>CONFIDENCE</span><strong>${esc(confidenceLabel(c))}</strong><small>${esc(setting||"Evidence-backed local lead")}</small></div>
 </div>`;
}
function renderSummary(opportunities){
 const lead=Array.isArray(opportunities)?opportunities.find(Boolean):null;
 const best=$("#summary-best"),windowEl=$("#summary-window"),drive=$("#summary-drive"),confidence=$("#summary-confidence");
 if(!lead){
   if(best)best.textContent="No lead yet";
   if(windowEl)windowEl.textContent="No strong window";
   if(drive)drive.textContent="—";
   if(confidence)confidence.textContent="Holding";
   return;
 }
 if(best)best.textContent=lead.place?.name||"Southeast Michigan";
 if(windowEl)windowEl.textContent=windowLabel(lead);
 if(drive)drive.textContent=driveLabel(lead);
 if(confidence)confidence.textContent=confidenceLabel(lead);
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
function signalAction(signal){
 const intent=intentPageFor(signal);
 if(intent)return{url:intent.url,label:intent.label};
 const url=signal&&signal.specialistHandoff&&signal.specialistHandoff.url||signal&&signal.verifyUrl||"";
 if(!url)return null;
 return{url,label:deeperLabel(signal)};
}
function cardActions(c){
 const bundle=Array.isArray(c&&c.bundleSignals)?c.bundleSignals:[];
 if(bundle.length>1){
   const seen=new Set(),actions=[];
   for(const signal of bundle){
     const action=signalAction(signal);
     if(!action||!action.url||seen.has(action.url))continue;
     seen.add(action.url);actions.push(action);
   }
   const official=c&&c.place&&c.place.officialUrl||"";
   if(official&&!seen.has(official))actions.push({url:official,label:"Official place info",official:true});
   return actions.slice(0,3).map((action,index)=>`<a class="btn${index?" secondary":""}" href="${esc(action.url)}"${action.official?' rel="noopener"':""}>${esc(action.label)}</a>`).join("");
 }
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
function renderBundleSignals(c){
 const bundle=Array.isArray(c&&c.bundleSignals)?c.bundleSignals:[];
 if(bundle.length<=1)return"";
 return `<div class="signal-stack"><span>Why this place made the board</span>${bundle.map(signal=>{
   const label=signal.title||signal.opportunityType||signal.activity||"Live signal";
   const detail=signal.whyNow||(Array.isArray(signal.reasons)&&signal.reasons[0])||"Live evidence cleared the current gate.";
   return `<div class="signal-row"><strong>${esc(label)}</strong><p>${esc(detail)}</p></div>`;
 }).join("")}</div>`;
}
function renderCard(c,note,sources,index){
 const bundle=Array.isArray(c&&c.bundleSignals)?c.bundleSignals:[];
 const specialist=bundle.length>1?"":c.specialist?`<div class="specialist"><strong>${esc(c.specialist.label)}:</strong> ${esc(c.specialist.headline)}</div>`:"";
 const reasons=bundle.length>1?"":((c.story&&c.story.whyToday)||c.reasons||[]).slice(0,3).map(r=>`<li>${esc(r)}</li>`).join("");
 const sourceLine=note&&Array.isArray(sources)&&sources.length?`<div class="card-source">Context: ${sources.map(s=>`<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`).join(" · ")}</div>`:"";
 const metaTitle=bundle.length>1?bundle.length+" live reasons today":c.title;
 return `<article class="card${index===0?" lead-card":""}" data-candidate-id="${esc(c.id)}" data-source-engine="${esc(c.sourceEngine||"")}" data-place-id="${esc(c.place&&c.place.id||"")}">
   <div class="slot">${esc(c.slot)}</div>
   <h3>${esc(c.place.name)}</h3>
   <div class="meta">${esc(c.place.area)} · ${esc(metaTitle)}</div>
   <div class="scoreline"><span class="score">${esc(c.score)}/100</span><span class="quality">${esc(c.quality)}</span></div>
   ${renderDecisionFacts(c)}
   <div class="weather">${renderWeather(c.weather)}</div>
   ${renderBundleSignals(c)}
   ${note?`<div class="card-read"><span>Why this matters</span><p>${esc(note)}</p>${sourceLine}</div>`:""}
   ${reasons?`<ul class="reasons">${reasons}</ul>`:""}
   ${specialist}
   <p class="caveat">${esc(c.caveat)}</p>
   <div class="actions">${cardActions(c)}</div>
 </article>`;
}
function renderSource(name,state,total){
 const cls=state===total?"ok":"partial";
 return `<div class="source-pill"><strong>${esc(name)}</strong><br><span class="${cls}">${esc(state)}/${esc(total)} sources responding</span></div>`;
}
function renderPayload(data,enriched){
 document.body.classList.remove("loading");
 const verdict=$("#verdict");
 if(verdict){
   verdict.textContent=data.verdict?.label||"LIVE";
   verdict.classList.toggle("quiet",data.verdict?.label==="QUIET");
 }
 if($("#verdict-detail")) $("#verdict-detail").textContent=data.verdict?.detail||"Live board loaded.";
 if($("#updated")) $("#updated").textContent="Updated "+fmtTime(data.generatedAt)+(enriched?"":" · live board");
 renderTopline(data.opportunities||[]);
 renderSummary(data.opportunities||[]);
 if($("#desk-note")) $("#desk-note").textContent=enriched
   ?(data.editorial||data.edition?.read||data.frontPage?.subhead||"")
   :(data.frontPage?.subhead||data.editorial||"Live opportunities loaded. Editorial detail is still being prepared.");
 const cards=$("#opportunity-grid");
 if(cards){
   if(data.opportunities&&data.opportunities.length){
     cards.innerHTML=data.opportunities.map((c,index)=>renderCard(c,data.edition?.notes?.[c.id],data.edition?.noteSources?.[c.id],index)).join("");
   }else{
     cards.innerHTML='<div class="error">The desk is holding because live source coverage is too thin to make a useful recommendation.</div>';
   }
 }
 const media=$("#hero-media");
 if(media){
   if(data.image){
     if($("#hero-img")){$("#hero-img").src=data.image.src;$("#hero-img").alt=data.image.alt||"Southeast Michigan outdoors";}
     if($("#hero-credit")) $("#hero-credit").innerHTML='File photo: <a href="'+esc(data.image.creditUrl)+'" rel="noopener">'+esc(data.image.credit)+'</a> · <a href="'+esc(data.image.licenseUrl||data.image.creditUrl)+'" rel="noopener">'+esc(data.image.license)+'</a>';
     media.hidden=false;
   }else if(enriched && media.dataset.independentImage!=="1") media.hidden=true;
 }
 const fall=$("#fall-panel");
 if(fall){
   if(data.fallColor){
     if($("#fall-value")) $("#fall-value").textContent=data.fallColor.label+" · ~"+Math.round(Number(data.fallColor.modeledPercent)||0)+"%";
     if($("#fall-copy")) $("#fall-copy").textContent="Model estimate for the Southeast Lower. Climatological peak window: "+(data.fallColor.peakWindow||"seasonal window")+". Drivers: "+(data.fallColor.drivers||[]).join(", ")+".";
     fall.hidden=false;
   }else fall.hidden=true;
 }
 const sh=data.sourceHealth||{};
 if($("#source-grid")) $("#source-grid").innerHTML=[
   renderSource("Michigan Outdoors Now place conditions",sh.outdoorsNowPlaces?.ok||0,sh.outdoorsNowPlaces?.total||6),
   renderSource("NWS point alerts",sh.nwsAlerts?.ok||0,sh.nwsAlerts?.total||6),
   `<div class="source-pill"><strong>Opportunity comparison</strong><br><span class="${sh.outdoorsNowOpportunityLayer?.ok?"ok":"partial"}">${sh.outdoorsNowOpportunityLayer?.ok?"live":"degraded"}</span></div>`,
   `<div class="source-pill"><strong>JEV board judgment</strong><br><span class="${data.decision?.boardEditor?.mode&&data.decision.boardEditor.mode!=="deterministic"?"ok":"partial"}">${esc(data.decision?.boardEditor?.mode||data.decision?.lead?.mode||"deterministic")}</span></div>`
 ].join("");
 if($("#writer-mode")) $("#writer-mode").textContent=enriched?(data.decision?.editorial?.mode||"deterministic"):"board live · editorial loading";
 if($("#suppressed")) $("#suppressed").textContent=data.suppressed?.length
   ?data.suppressed.length+" place(s) suppressed by active NWS hazard rules."
   :"No place was suppressed by the hard NWS hazard veto on this update.";
}

async function requestBoard(url){
 const res=await fetch(url,{headers:{accept:"application/json"},cache:"no-store"});
 const text=await res.text();
 let data=null;
 try{data=JSON.parse(text);}catch{}
 if(!res.ok||!data||!data.ok) throw new Error(data&&data.error||("Detroit board "+res.status));
 return data;
}

async function enrichEditorial(core){
 const boardIds=(Array.isArray(core&&core.opportunities)?core.opportunities:[]).map(x=>x&&x.id).filter(Boolean).slice(0,4);
 try{
   if(!boardIds.length)return;
   const hold=core&&core.decision&&core.decision.boardEditor&&core.decision.boardEditor.posture&&core.decision.boardEditor.posture.choiceId==="QUIET";
   const data=await requestBoard("/api/detroit-outdoors?mode=editorial&boardIds="+encodeURIComponent(boardIds.join(","))+"&hold="+(hold?"1":"0"));
   if(JSON.stringify(data.boardIds||[])!==JSON.stringify(boardIds)) throw new Error("editorial board changed");
   const merged={
     ...core,
     generatedAt:data.generatedAt||core.generatedAt,
     editorial:data.editorial||core.editorial,
     edition:data.edition||core.edition,
     decision:{...(core.decision||{}),editorial:data.decision&&data.decision.editorial||core.decision&&core.decision.editorial}
   };
   renderPayload(merged,true);
   const writers=Array.isArray(data.decision?.editorial?.cardWriters)?data.decision.editorial.cardWriters:[];
   observe("detroit_editorial_observation",{
     board_signature:boardIds.join("|"),
     editorial_mode:data.decision?.editorial?.mode||"unknown",
     writer_count:writers.length,
     accepted_count:writers.filter(w=>w&&w.accepted).length,
     rejected_count:writers.filter(w=>w&&!w.accepted).length,
     retry_count:writers.filter(w=>Number(w&&w.attempt||0)>1).length,
     reassigned_count:writers.filter(w=>w&&w.reassignedFrom).length,
     note_count:Object.keys(data.edition?.notes||{}).length
   },String(data.generatedAt||core.generatedAt||"")+":"+boardIds.join("|"));
 }catch(error){
   if($("#writer-mode")) $("#writer-mode").textContent="editorial unavailable · live board remains current";
   observe("detroit_live_failure",{layer:"editorial",reason:String(error&&error.message||"editorial unavailable").slice(0,100)},boardIds.join("|")+":editorial");
 }
}

async function loadHeroImage(opportunities){
 const boardIds=(Array.isArray(opportunities)?opportunities:[]).map(x=>x&&x.id).filter(Boolean).slice(0,4);
 try{
   if(!boardIds.length)return;
   const data=await requestBoard("/api/detroit-outdoors?mode=image&boardIds="+encodeURIComponent(boardIds.join(",")));
   const media=$("#hero-media");
   if(!media)return;
   if(data.image){
     if($("#hero-img")){$("#hero-img").src=data.image.src;$("#hero-img").alt=data.image.alt||"Southeast Michigan outdoors";}
     if($("#hero-credit")) $("#hero-credit").innerHTML='File photo: <a href="'+esc(data.image.creditUrl)+'" rel="noopener">'+esc(data.image.credit)+'</a> · <a href="'+esc(data.image.licenseUrl||data.image.creditUrl)+'" rel="noopener">'+esc(data.image.license)+'</a>';
     media.dataset.independentImage="1";
     media.hidden=false;
     const imageId=String(data.image.id||data.image.src||"unknown");
     observe("detroit_hero_observation",{
       board_signature:boardIds.join("|"),
       image_id:imageId.slice(0,100),
       selection_mode:data.decision?.image?.mode||"unknown",
       pool_size:Array.isArray(data.decision?.image?.pool)?data.decision.image.pool.length:null,
       repeated_previous:heroRepeat(imageId)?1:0
     },String(data.generatedAt||"")+":"+boardIds.join("|")+":"+imageId);
   }
 }catch(error){
   observe("detroit_live_failure",{layer:"hero",reason:String(error&&error.message||"hero unavailable").slice(0,100)},boardIds.join("|")+":hero");
   // The board and editorial remain usable if the hero image selector is unavailable.
 }
}

async function load(){
 try{
   const core=await requestBoard("/api/detroit-outdoors?edition=cards-v1&mode=core");
   renderPayload(core,false);
   const opportunities=Array.isArray(core.opportunities)?core.opportunities:[];
   const lead=opportunities[0]||null;
   const signature=boardSignature(opportunities);
   observe("detroit_board_observation",{
     board_signature:signature,
     opportunity_count:opportunities.length,
     lead_candidate:lead&&lead.id||"none",
     lead_engine:lead&&lead.sourceEngine||"none",
     lead_place:lead&&lead.place&&lead.place.id||"none",
     board_mode:core.decision?.boardEditor?.mode||core.decision?.lead?.mode||"deterministic",
     verdict:core.verdict?.label||"unknown",
     suppressed_count:Array.isArray(core.suppressed)?core.suppressed.length:0,
     degraded_source_count:degradedSourceCount(core.sourceHealth)
   },String(core.generatedAt||"")+":"+signature);
   loadHeroImage(core.opportunities);
   enrichEditorial(core);
 }catch(error){
   document.body.classList.remove("loading");
   if($("#opportunity-grid")) $("#opportunity-grid").innerHTML='<div class="error">Live opportunity data is temporarily unavailable. Use the specialist tools below while the desk recovers.</div>';
   if($("#updated")) $("#updated").textContent="Live board unavailable";
   if($("#writer-mode")) $("#writer-mode").textContent="unavailable";
   renderSummary([]);
   observe("detroit_live_failure",{layer:"core",reason:String(error&&error.message||"core unavailable").slice(0,100)},"core:"+Math.floor(Date.now()/(30*60*1000)));
 }
}
document.addEventListener("click",function(event){
  const link=event.target.closest("a");
  if(!link)return;
  let url;try{url=new URL(link.href,location.href);}catch{return;}
  const card=link.closest(".card");
  const route=link.closest(".route-card");
  if(typeof window.gtag==="function" && (card || route || /michiganoutdoorsnow|great-lakes-buoys|northern-lights|michiganbirdingreport|fall-color/.test(url.href))){
    window.gtag("event","detroit_outdoors_handoff",{
      destination:url.hostname.replace(/^www\./,""),
      destination_path:url.pathname,
      surface:card?"opportunity-card":route?"question-route":"context-link",
      candidate_id:card&&card.dataset.candidateId||"",
      source_engine:card&&card.dataset.sourceEngine||"",
      place_id:card&&card.dataset.placeId||"",
      transport_type:"beacon"
    });
  }
});
load();
setInterval(load,30*60*1000);
})();