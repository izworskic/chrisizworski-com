(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const fmtMile=value=>Number.isFinite(Number(value))?`MP ${Number(value).toFixed(Number(value)%1?1:0)}`:"";
  const safeUrl=value=>{try{const u=new URL(String(value),location.origin);return ["http:","https:"].includes(u.protocol)?u.href:"#";}catch{return"#";}};
  const track=(name,params={})=>{try{if(typeof window.gtag==="function")window.gtag("event",name,params);}catch{}};
  let map=null,corridorLayer=null,markerLayer=null,lastPayload=null,mapInteractionTracked=false;

  function ensureLeafletCss(){
    const expected='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    const current=[...document.querySelectorAll('link[rel="stylesheet"]')].find(link=>link.href===expected);
    if(current&&current.integrity==='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=')return;
    if(current)current.remove();
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=expected;
    link.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin='';
    link.dataset.blueRidgeLeaflet='true';
    document.head.appendChild(link);
  }

  function todayParkway(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
  function setDefaults(){if($("tripDate")&&!$("tripDate").value)$("tripDate").value=todayParkway();}
  function selectedInterests(){return [...document.querySelectorAll('input[name="interest"]:checked')].map(el=>el.value).slice(0,4);}
  function params(){return new URLSearchParams({gateway:$("gateway").value,hours:$("hours").value,date:$("tripDate").value||todayParkway(),start:$("startTime").value||"09:00",interests:selectedInterests().join(",")||"scenery"});}
  function setBusy(busy){const btn=$("buildDrive");if(btn){btn.disabled=busy;btn.textContent=busy?"Checking the Parkway…":"Build my drive";}$("plannerStatus").textContent=busy?"Reading current road status and mountain weather…":"";}
  function weatherLine(weather){if(!weather?.ok)return"Mountain forecast unavailable.";const bits=[];if(Number.isFinite(Number(weather.tempMin))&&Number.isFinite(Number(weather.tempMax)))bits.push(`${weather.tempMin}–${weather.tempMax}°F`);if(Number.isFinite(Number(weather.precipMax)))bits.push(`precipitation up to ${weather.precipMax}%`);if(Number.isFinite(Number(weather.windMax)))bits.push(`wind up to ${weather.windMax} mph`);if(weather.forecast?.length)bits.push(weather.forecast.slice(0,2).join(" / "));return bits.join(" · ")||"NWS hourly forecast loaded.";}
  function roadBadge(payload,plan){if(!payload.road?.ok)return`<span class="state warn">Verify NPS road status</span>`;if(plan?.cautions?.length)return`<span class="state warn">Road note on this stretch</span>`;return`<span class="state good">No hard closure on route</span>`;}
  function renderTop(payload){const plan=payload.selected,strip=$("liveStrip");strip.classList.toggle("warn",!payload.road?.ok||plan?.cautions?.length>0);$("roadUpdate").textContent=payload.road?.ok?`NPS road table: ${payload.road.updatedLabel||"current update loaded"}`:"NPS road table unavailable — verify before leaving";$("generatedAt").textContent=`Checked ${new Date(payload.generatedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`;}
  function bullets(items){return`<ul class="reason-list">${(items||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;}
  function renderDecision(payload){
    const plan=payload.selected;
    if(!plan){$("decision").innerHTML=`<div class="source-warning"><strong>No usable route was returned.</strong><p>Check the official NPS road table before traveling.</p></div>`;$("whyCard").innerHTML="";$("watchCard").innerHTML="";$("planB").innerHTML="";return;}
    const direction=plan.direction==="northbound"?"North on the Parkway":"South on the Parkway";
    $("decision").innerHTML=`
      <div class="decision-top"><div><div class="eyebrow">TODAY'S ANSWER</div><h2>${esc(plan.name)}</h2><p class="route-line">${esc(direction)} · turn around near ${fmtMile(plan.mileTurn)}</p></div></div>
      <div class="fit-badges">${roadBadge(payload,plan)}<span class="state">${esc(plan.fit)}</span><span class="state">View outlook: ${esc(plan.viewOutlook?.label||"unknown")}</span></div>
      <p class="editorial-read">${esc(plan.editorial?.text||plan.character)}</p>
      <div class="stat-grid"><div class="stat"><span>Modeled outing</span><strong>${esc(plan.durationHours)} hr</strong></div><div class="stat"><span>Parkway miles</span><strong>${esc(plan.routeMiles)}</strong></div><div class="stat"><span>Back about</span><strong>${esc(plan.timeline?.returnBy||"—")}</strong></div><div class="stat"><span>Turn point</span><strong>${fmtMile(plan.mileTurn)}</strong></div></div>
      <div class="decision-actions"><a class="primary-link" id="mapsHandoff" href="${esc(safeUrl(plan.directionsUrl))}" target="_blank" rel="noopener">Open route in Google Maps</a><button class="secondary-button" id="sharePlan" type="button">Share plan</button><button class="secondary-button" id="printPlan" type="button">Print</button></div>`;
    $("whyCard").innerHTML=`<div class="eyebrow">WHY THIS ROUTE</div><h3>It earns the time.</h3>${bullets(plan.why)}`;
    $("watchCard").innerHTML=`<div class="eyebrow">WHAT CHANGES THE PLAN</div><h3>Watch these before you commit.</h3>${bullets(plan.changeTriggers)}`;
    const b=payload.planB;
    $("planB").innerHTML=b?`<div class="eyebrow">PLAN B</div><h3>${esc(b.name)}</h3><p>${esc(b.fallbackReason||b.character)}</p><div class="planb-meta"><span>${esc(b.durationHours)} hr</span><span>${esc(b.routeMiles)} Parkway mi</span><span>${fmtMile(b.mileTurn)}</span></div>`:`<div class="eyebrow">PLAN B</div><h3>No clean fallback in this set.</h3><p>Rebuild with more time or a different gateway if the selected section becomes unusable.</p>`;
    $("mapsHandoff")?.addEventListener("click",()=>track("blue_ridge_maps_handoff",{route_id:plan.id,gateway:payload.input?.gateway||""}));
    $("sharePlan")?.addEventListener("click",sharePlan);
    $("printPlan")?.addEventListener("click",()=>{track("blue_ridge_print",{route_id:plan.id});window.print();});
  }
  async function sharePlan(){
    const plan=lastPayload?.selected;if(!plan)return;const text=`Blue Ridge Parkway: ${plan.name} — about ${plan.durationHours} hr / ${plan.routeMiles} Parkway miles, back about ${plan.timeline?.returnBy||""}.`;
    try{
      if(navigator.share){await navigator.share({title:"Blue Ridge Parkway drive",text,url:location.href});track("blue_ridge_share",{route_id:plan.id,method:"native"});return;}
      await navigator.clipboard.writeText(`${text}\n${location.href}`);track("blue_ridge_share",{route_id:plan.id,method:"clipboard"});
      const btn=$("sharePlan");if(btn){const old=btn.textContent;btn.textContent="Copied";setTimeout(()=>btn.textContent=old,1400);}
    }catch(_){/* sharing is optional */}
  }
  function renderTimeline(payload){const plan=payload.selected;if(!plan)return;$("timelineWindow").textContent=`${plan.timeline?.start||""} → ${plan.timeline?.returnBy||""}`;$("timeline").innerHTML=(plan.timeline?.items||[]).map((item,index)=>`<div class="timeline-item"><div class="timeline-time">${esc(item.arrival)}</div><div class="timeline-node"></div><div class="timeline-copy"><strong>${index+1}. ${esc(item.name)}</strong><div class="timeline-meta">${fmtMile(item.milepost)} · ${item.elevationFt?`${Number(item.elevationFt).toLocaleString()} ft · `:""}${esc(item.dwellMinutes)} min stop</div><p>${esc(item.practical)}</p></div></div>`).join("")||`<div class="source-warning"><strong>No timed stops returned.</strong></div>`;$("timelineReturn").innerHTML=`Leave near <strong>${esc(plan.timeline?.start||"")}</strong> · aim to be back around <strong>${esc(plan.timeline?.returnBy||"")}</strong>. The time is a planning model, not traffic navigation.`;}
  function renderConditions(payload){const p=payload.selected;if(!p)return;$("weatherCard").innerHTML=p.weather?.ok?`<div class="kicker">MOUNTAIN WEATHER</div><strong>${p.weather.tempMin!=null&&p.weather.tempMax!=null?`${esc(p.weather.tempMin)}–${esc(p.weather.tempMax)}°F`:"NWS loaded"}</strong><p>${esc(weatherLine(p.weather))}</p><div class="model-label">NWS hourly forecast near high terrain</div>`:`<div class="kicker">MOUNTAIN WEATHER</div><strong>Unavailable</strong><p>The tool is not substituting gateway-city weather for the ridge.</p><div class="model-label">Verify before leaving</div>`;
    $("viewCard").innerHTML=`<div class="kicker">VIEW OUTLOOK</div><strong>${esc(p.viewOutlook?.label||"Unavailable")}</strong><p>${esc(p.viewOutlook?.detail||"No view outlook available.")}</p><div class="model-label">Forecast-derived · not measured visibility</div>`;
    $("foliageCard").innerHTML=`<div class="kicker">FALL COLOR</div><strong>${esc(p.foliage?.label||"Not active")}</strong><p>${esc(p.foliage?.detail||"")}</p><div class="model-label">${p.foliage?.active?`Seasonal estimate · ${esc(p.foliage.basis||"")}`:"Seasonal model inactive"}</div>`;
  }
  function renderRoad(payload){const p=payload.selected;if(!p)return;const notes=[];(p.blocks||[]).forEach(x=>notes.push(`<div class="road-note blocked"><strong>Closed ${fmtMile(x.start)}–${fmtMile(x.end).replace("MP ","")}</strong><span>${esc(x.note)}</span></div>`));(p.cautions||[]).forEach(x=>notes.push(`<div class="road-note"><strong>${fmtMile(x.start)}–${fmtMile(x.end).replace("MP ","")}</strong><span>${esc(x.note)}</span></div>`));if(!notes.length)notes.push(payload.road?.ok?`<div class="road-note clear"><strong>No route-specific hard closure</strong><span>The current NPS road table did not return a hard closure or construction caution across this selected stretch when checked.</span></div>`:`<div class="road-note blocked"><strong>Road source unavailable</strong><span>Do not assume the section is open. Use the official NPS source below before leaving.</span></div>`);$("roadReality").innerHTML=notes.join("");}
  function renderAlternatives(payload){$("alternatives").innerHTML=(payload.alternatives||[]).map(p=>`<article class="alt-card ${p.blocked?"blocked":""}"><div class="alt-top"><div><div class="eyebrow">${esc(p.fit)}</div><h3>${esc(p.name)}</h3></div><span class="alt-state ${p.blocked?"blocked":p.cautions?.length?"caution":""}">${p.blocked?"Blocked":p.cautions?.length?"Road note":"Valid route"}</span></div><p>${esc(p.character)}</p><div class="alt-meta"><span>${esc(p.durationHours)} hr</span><span>${esc(p.routeMiles)} mi</span><span>turn ${fmtMile(p.mileTurn)}</span><span>view: ${esc(p.viewOutlook?.label||"unknown")}</span></div>${p.whyNotSelected?`<p class="alt-reason"><strong>${esc(p.whyNotSelected)}</strong></p>`:p.blocked?`<p style="margin-top:8px;color:#8a3f37">An official closure overlaps this drive, so it cannot be selected.</p>`:""}</article>`).join("")||`<div class="source-warning"><strong>No additional route candidates returned.</strong></div>`;}
  function renderFieldNotes(payload){$("fieldNotes").innerHTML=(payload.fieldNotes||[]).map(n=>`<article class="field-note"><strong>${esc(n.label)}</strong><p>${esc(n.text)} <a href="${esc(safeUrl(n.source))}" target="_blank" rel="noopener">NPS ↗</a></p></article>`).join("");}
  function renderSources(payload){$("sources").innerHTML=(payload.sources||[]).map(s=>`<article class="source-card"><div class="source-top"><strong>${esc(s.name)}</strong><span>${esc(s.status)}</span></div><p>${esc(s.note)}</p>${s.updated?`<small>${esc(s.updated)}</small>`:""}<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener" data-source-name="${esc(s.name)}">Open source ↗</a></article>`).join("");$("method").innerHTML=Object.values(payload.truth||{}).map(x=>`<p>${esc(x)}</p>`).join("");}
  function ensureMap(){
    if(map||!window.L)return;
    map=L.map("parkwayMap",{scrollWheelZoom:false,zoomControl:true}).setView([35.8,-81.8],6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:17,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
    markerLayer=L.layerGroup().addTo(map);
    const trackMap=()=>{if(mapInteractionTracked)return;mapInteractionTracked=true;track("blue_ridge_map_interaction",{route_id:lastPayload?.selected?.id||""});};
    map.on("dragstart",trackMap);map.on("zoomstart",trackMap);
  }
  function pin(label,kind="stop"){return L.divIcon({className:"leaflet-div-icon",html:`<div class="number-pin"${kind==="start"?' style="background:#163f50"':""}>${esc(label)}</div>`,iconSize:[28,28],iconAnchor:[14,14],popupAnchor:[0,-14]});}
  async function drawMap(payload){ensureMap();if(!map)return;markerLayer.clearLayers();const p=payload.selected;if(!p)return;if(!corridorLayer&&payload.parkwayGeoJsonUrl){try{const r=await fetch(payload.parkwayGeoJsonUrl,{headers:{accept:"application/geo+json,application/json"}});if(r.ok){const geo=await r.json();corridorLayer=L.geoJSON(geo,{style:{weight:4,opacity:.38,color:"#2e7251"}}).addTo(map);corridorLayer.bringToBack();}}catch(_){/* selected pins still provide useful orientation */}}
    const layers=[];const start=L.marker([payload.gateway.lat,payload.gateway.lon],{icon:pin("S","start")}).bindPopup(`<strong>${esc(payload.gateway.label)}</strong><br>Starting gateway`).addTo(markerLayer);layers.push(start);(p.stops||[]).forEach((s,i)=>{const m=L.marker([s.lat,s.lon],{icon:pin(String(i+1))}).bindPopup(`<strong>${esc(s.name)}</strong><br>${fmtMile(s.milepost)} · ${esc(s.dwellMinutes)} min`).addTo(markerLayer);layers.push(m);});if(layers.length){const group=L.featureGroup(layers);map.fitBounds(group.getBounds().pad(.24),{maxZoom:10});}setTimeout(()=>map.invalidateSize(),80);}
  function render(payload){
    lastPayload=payload;mapInteractionTracked=false;renderTop(payload);renderDecision(payload);renderTimeline(payload);renderConditions(payload);renderRoad(payload);renderAlternatives(payload);renderFieldNotes(payload);renderSources(payload);$("results").hidden=false;drawMap(payload);history.replaceState(null,"",`${location.pathname}?${params().toString()}`);
    track("blue_ridge_planner_complete",{gateway:payload.input?.gateway||"",route_id:payload.selected?.id||"",hours:payload.input?.hours||0,road_source:payload.road?.ok?"live":"unavailable",weather_source:payload.selected?.weather?.ok?"live":"unavailable",decision_mode:payload.decisionMeta?.mode||"deterministic"});
  }
  async function build(){setBusy(true);try{const response=await fetch(`/api/blue-ridge-parkway?${params().toString()}`,{headers:{accept:"application/json"}}),payload=await response.json().catch(()=>null);if(!response.ok||!payload?.ok)throw new Error(payload?.detail||payload?.error||`HTTP ${response.status}`);render(payload);$("plannerStatus").textContent="";}catch(error){track("blue_ridge_planner_error",{message:String(error?.message||error).slice(0,120)});$("plannerStatus").innerHTML=`<span class="error">Live refresh failed: ${esc(error.message||error)}.</span>`;$("results").hidden=false;$("decision").innerHTML=`<div class="source-warning"><strong>The live planner could not refresh.</strong><p>No road or weather fact has been guessed. Use the official NPS road-status source before leaving.</p></div>`;}finally{setBusy(false);}}
  function applyQuery(){const q=new URLSearchParams(location.search);for(const [id,key] of [["gateway","gateway"],["hours","hours"],["tripDate","date"],["startTime","start"]])if(q.get(key)&&$(id))$(id).value=q.get(key);if(q.get("interests")){const set=new Set(q.get("interests").split(","));document.querySelectorAll('input[name="interest"]').forEach(el=>el.checked=set.has(el.value));}}
  document.addEventListener("DOMContentLoaded",()=>{
    ensureLeafletCss();setDefaults();applyQuery();
    $("plannerForm")?.addEventListener("submit",e=>{e.preventDefault();build();});
    $("gateway")?.addEventListener("change",()=>track("blue_ridge_gateway_change",{gateway:$("gateway").value}));
    document.querySelectorAll(".quick-gateway").forEach(btn=>btn.addEventListener("click",()=>{$("gateway").value=btn.dataset.gateway;track("blue_ridge_gateway_change",{gateway:btn.dataset.gateway,method:"quick"});build();}));
    $("sources")?.addEventListener("click",event=>{const link=event.target.closest("a[data-source-name]");if(link)track("blue_ridge_source_click",{source_name:link.dataset.sourceName||""});});
    build();
  });
})();