(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const fmtMile=value=>Number.isFinite(Number(value))?`MP ${Number(value).toFixed(Number(value)%1?1:0)}`:"";
  let map=null,corridorLayer=null,routeLayer=null,markerLayer=null,lastPayload=null;

  function todayParkway(){
    return new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  }
  function setDefaults(){
    if($("tripDate")&&!$("tripDate").value)$("tripDate").value=todayParkway();
  }
  function selectedInterests(){
    return [...document.querySelectorAll('input[name="interest"]:checked')].map(el=>el.value).slice(0,4);
  }
  function params(){
    const p=new URLSearchParams({
      gateway:$("gateway").value,
      hours:$("hours").value,
      date:$("tripDate").value||todayParkway(),
      start:$("startTime").value||"09:00",
      interests:selectedInterests().join(",")||"scenery"
    });
    return p;
  }
  function setBusy(busy){
    const btn=$("buildDrive");
    if(btn){btn.disabled=busy;btn.textContent=busy?"Checking the Parkway…":"Build my drive";}
    $("plannerStatus").textContent=busy?"Reading the current NPS road table and mountain forecast…":"";
  }
  function weatherLine(weather){
    if(!weather?.ok)return "Mountain forecast unavailable for this route.";
    const bits=[];
    if(Number.isFinite(Number(weather.tempMin))&&Number.isFinite(Number(weather.tempMax)))bits.push(`${weather.tempMin}–${weather.tempMax}°F`);
    if(Number.isFinite(Number(weather.precipMax)))bits.push(`precipitation up to ${weather.precipMax}%`);
    if(Number.isFinite(Number(weather.windMax)))bits.push(`wind up to ${weather.windMax} mph`);
    if(weather.forecast?.length)bits.push(weather.forecast.slice(0,2).join(" / "));
    return bits.join(" · ")||"NWS hourly forecast loaded.";
  }
  function roadBadge(payload,selected){
    if(!payload.road?.ok)return `<span class="state state-warn">NPS road feed unavailable</span>`;
    if(selected?.cautions?.length)return `<span class="state state-warn">Road note on this stretch</span>`;
    return `<span class="state state-good">No hard closure on this route</span>`;
  }
  function renderTop(payload){
    const selected=payload.selected;
    const strip=$("liveStrip");
    strip.classList.toggle("warn",!payload.road?.ok||selected?.cautions?.length>0);
    $("roadUpdate").textContent=payload.road?.ok
      ? `NPS road table: ${payload.road.updatedLabel||"current update loaded"}`
      : "NPS road table could not be read — verify before leaving";
    $("generatedAt").textContent=`Checked ${new Date(payload.generatedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`;
  }
  function stopCards(stops){
    return (stops||[]).map((stop,index)=>`<article class="stop-card">
      <div class="stop-number">${index+1}</div>
      <div><div class="stop-kicker">${fmtMile(stop.milepost)}${stop.elevationFt?` · ${Number(stop.elevationFt).toLocaleString()} ft`:""}</div>
      <h3>${esc(stop.name)}</h3><p>${esc(stop.practical)}</p>
      <div class="stop-time">Plan about ${esc(stop.dwellMinutes)} minutes here.</div></div>
    </article>`).join("");
  }
  function roadNotes(plan){
    const notes=[];
    (plan.blocks||[]).forEach(item=>notes.push(`<div class="road-note blocked"><strong>Closed ${fmtMile(item.start)}–${fmtMile(item.end).replace("MP ","")}</strong><span>${esc(item.note)}</span></div>`));
    (plan.cautions||[]).forEach(item=>notes.push(`<div class="road-note"><strong>${fmtMile(item.start)}–${fmtMile(item.end).replace("MP ","")}</strong><span>${esc(item.note)}</span></div>`));
    return notes.join("")||`<div class="road-note clear"><strong>No route-specific road note</strong><span>The official NPS road table did not return a hard closure or construction caution across this selected stretch when checked.</span></div>`;
  }
  function renderSelected(payload){
    const plan=payload.selected;
    if(!plan){
      $("decision").innerHTML=`<div class="empty-state"><h2>No route available</h2><p>The planner could not form a usable route from the current inputs. Check the official NPS road status before traveling.</p></div>`;
      return;
    }
    const margin=Math.max(0,Number(payload.input.hours)-Number(plan.durationHours)).toFixed(1).replace(".0","");
    const direction=plan.direction==="northbound"?"North on the Parkway":"South on the Parkway";
    $("decision").innerHTML=`
      <div class="decision-head">
        <div>
          <div class="eyebrow">YOUR DRIVE</div>
          <h2>${esc(plan.name)}</h2>
          <p class="decision-route">${esc(direction)} · turn around near ${fmtMile(plan.mileTurn)}</p>
        </div>
        <div class="time-box"><strong>${esc(plan.durationHours)} hr</strong><span>modeled outing</span></div>
      </div>
      <div class="decision-states">${roadBadge(payload,plan)}<span class="state">${esc(plan.fit)}</span></div>
      <p class="editorial-read">${esc(plan.editorial?.text||plan.character)}</p>
      <div class="decision-grid">
        <div><span class="mini-label">TIME MARGIN</span><strong>${margin} hr</strong><small>inside your ${esc(payload.input.hours)}-hour window</small></div>
        <div><span class="mini-label">MOUNTAIN WEATHER</span><strong>${plan.weather?.ok?"NWS loaded":"Unavailable"}</strong><small>${esc(weatherLine(plan.weather))}</small></div>
        <div><span class="mini-label">FALL COLOR</span><strong>${esc(plan.foliage?.label||"Not active")}</strong><small>${esc(plan.foliage?.detail||"")}</small></div>
      </div>
      <div class="decision-actions">
        <a class="primary-action" href="${esc(plan.directionsUrl)}" target="_blank" rel="noopener">Open this drive in Google Maps</a>
        <a href="#route-map">See route map</a><a href="#stops">See the stops</a>
      </div>`;

    $("roadReality").innerHTML=roadNotes(plan);
    $("weatherDetail").innerHTML=plan.weather?.ok?`
      <div class="weather-read"><strong>${esc(weatherLine(plan.weather))}</strong>
      <p>This is an hourly NWS forecast sampled near a high point on the selected route. It is more useful than using Asheville, Boone or Cherokee weather as a stand-in for the ridge.</p></div>`:
      `<div class="source-warning"><strong>Route weather is unavailable.</strong><p>The planner is not substituting city weather. Check NPS/NWS conditions before committing to a high-elevation drive.</p></div>`;

    $("foliageDetail").innerHTML=plan.foliage?.active?`
      <div class="foliage-read"><strong>${esc(plan.foliage.label)}</strong><p>${esc(plan.foliage.detail)}</p>
      <div class="model-label">Seasonal estimate · ${esc(plan.foliage.basis||"")}</div></div>`:
      `<div class="foliage-read quiet"><strong>${esc(plan.foliage?.label||"No fall-color estimate")}</strong><p>${esc(plan.foliage?.detail||"Fall color is only modeled during the planning season.")}</p></div>`;

    $("stopsList").innerHTML=stopCards(plan.stops);
  }
  function renderAlternatives(payload){
    const items=(payload.alternatives||[]).map(plan=>{
      const road=plan.blocked?`<span class="alt-state blocked">Blocked</span>`:plan.cautions?.length?`<span class="alt-state caution">Road note</span>`:`<span class="alt-state">Open route</span>`;
      return `<article class="alt-card ${plan.blocked?"is-blocked":""}">
        <div class="alt-top"><div><div class="alt-fit">${esc(plan.fit)}</div><h3>${esc(plan.name)}</h3></div>${road}</div>
        <p>${esc(plan.character)}</p>
        <div class="alt-meta"><span>${esc(plan.durationHours)} hr</span><span>turn ${fmtMile(plan.mileTurn)}</span><span>${esc(plan.foliage?.active?plan.foliage.label:"seasonal route")}</span></div>
        ${plan.blocked?`<p class="blocked-explain">An official closure overlaps this drive. It stays visible so you can see why it was not recommended.</p>`:""}
      </article>`;
    }).join("");
    $("alternatives").innerHTML=items||"<p>No additional route candidates were returned.</p>";
  }
  function renderSources(payload){
    $("sources").innerHTML=(payload.sources||[]).map(source=>`<article class="source-card">
      <div class="source-top"><strong>${esc(source.name)}</strong><span>${esc(source.status)}</span></div>
      <p>${esc(source.note)}</p>${source.updated?`<small>${esc(source.updated)}</small>`:""}
      <a href="${esc(source.url)}" target="_blank" rel="noopener">Open source ↗</a>
    </article>`).join("");
    const truth=payload.truth||{};
    $("method").innerHTML=Object.values(truth).map(text=>`<p>${esc(text)}</p>`).join("");
  }
  function ensureMap(){
    if(map||!window.L)return;
    map=L.map("parkwayMap",{scrollWheelZoom:false}).setView([35.8,-81.8],6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:17,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
    markerLayer=L.layerGroup().addTo(map);
  }
  async function drawMap(payload){
    ensureMap();if(!map)return;
    markerLayer.clearLayers();if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}
    const plan=payload.selected;if(!plan)return;
    if(!corridorLayer&&payload.parkwayGeoJsonUrl){
      try{
        const res=await fetch(payload.parkwayGeoJsonUrl,{headers:{accept:"application/geo+json,application/json"}});
        if(res.ok){
          const geo=await res.json();
          corridorLayer=L.geoJSON(geo,{style:{weight:4,opacity:.45}}).addTo(map);
        }
      }catch(_){/* markers remain useful if corridor source fails */}
    }
    const points=[[payload.gateway.lat,payload.gateway.lon],...(plan.stops||[]).map(s=>[s.lat,s.lon])];
    const labels=[payload.gateway.label,...(plan.stops||[]).map(s=>s.name)];
    points.forEach((point,i)=>L.circleMarker(point,{radius:i===0?7:6,weight:2,fillOpacity:.85}).bindPopup(`<strong>${esc(labels[i])}</strong>`).addTo(markerLayer));
    if(points.length>1){routeLayer=L.polyline(points,{weight:3,dashArray:"7 7",opacity:.75}).addTo(map);}
    const group=L.featureGroup([...markerLayer.getLayers(),...(routeLayer?[routeLayer]:[])]);
    if(group.getLayers().length)map.fitBounds(group.getBounds().pad(.18));
    setTimeout(()=>map.invalidateSize(),60);
  }
  function render(payload){
    lastPayload=payload;renderTop(payload);renderSelected(payload);renderAlternatives(payload);renderSources(payload);drawMap(payload);
    $("results").hidden=false;
    history.replaceState(null,"",`${location.pathname}?${params().toString()}`);
  }
  async function build(){
    setBusy(true);
    try{
      const response=await fetch(`/api/blue-ridge-parkway?${params().toString()}`,{headers:{accept:"application/json"}});
      const payload=await response.json().catch(()=>null);
      if(!response.ok||!payload?.ok)throw new Error(payload?.detail||payload?.error||`HTTP ${response.status}`);
      render(payload);$("plannerStatus").textContent="";
    }catch(error){
      $("plannerStatus").innerHTML=`<span class="error">Live refresh failed: ${esc(error.message||error)}. Use the official NPS road-status link below before leaving.</span>`;
      $("results").hidden=false;
      $("decision").innerHTML=`<div class="source-warning"><strong>The live planner could not refresh.</strong><p>No road or weather fact has been guessed. The official source links below remain available.</p></div>`;
    }finally{setBusy(false);}
  }
  function applyQuery(){
    const q=new URLSearchParams(location.search);
    for(const [id,key] of [["gateway","gateway"],["hours","hours"],["tripDate","date"],["startTime","start"]])if(q.get(key)&&$(id))$(id).value=q.get(key);
    if(q.get("interests")){
      const set=new Set(q.get("interests").split(","));
      document.querySelectorAll('input[name="interest"]').forEach(el=>el.checked=set.has(el.value));
    }
  }
  document.addEventListener("DOMContentLoaded",()=>{
    setDefaults();applyQuery();
    $("plannerForm")?.addEventListener("submit",event=>{event.preventDefault();build();});
    document.querySelectorAll(".quick-gateway").forEach(btn=>btn.addEventListener("click",()=>{$("gateway").value=btn.dataset.gateway;build();}));
    build();
  });
})();
