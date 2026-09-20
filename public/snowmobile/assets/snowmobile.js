"use strict";

const state = { data: null, map: null, mapLoaded: false, drive: null };

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function ga(name, params={}){
  try { if (typeof gtag === "function") gtag("event", name, params); } catch {}
}

function ageLabel(iso){
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "unknown age";
  const m = Math.max(0, Math.round((Date.now()-t)/60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m/60);
  if (h < 48) return `${h} hr ago`;
  return `${Math.round(h/24)} days ago`;
}

function durationLabel(minutes){
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(m/60);
  const rem = m%60;
  return h ? `${h} hr ${rem ? `${rem} min` : ""}`.trim() : `${rem} min`;
}

function timeLabel(date){
  try {
    return new Intl.DateTimeFormat("en-US",{
      timeZone:"America/Detroit",hour:"numeric",minute:"2-digit"
    }).format(date);
  } catch { return ""; }
}

function decisionCopy(d){
  if (d.season?.state === "PRESEASON"){
    return {
      verdict:"NO — not for snowmobiling yet.",
      explanation:"State-designated snowmobile trails are outside the Dec. 1–Mar. 31 season. Use this page now to watch corridor readiness and source coverage."
    };
  }
  if (d.routeStatus?.state === "ROUTE_BROKEN"){
    return { verdict:"NO — the required corridor is broken.", explanation:d.routeStatus.reason || "An official required segment is closed." };
  }
  if (d.routeStatus?.state === "UNKNOWN"){
    return { verdict:"WAIT — official route status is incomplete.", explanation:"The tool could not verify the required Trail 7 geometry/status, so it will not infer that the corridor is open." };
  }
  if (d.condition?.score >= 75 && d.confidence?.score >= 60){
    return { verdict:"YES — conditions currently support the trip.", explanation:"The route clears the official-status gate and fresh local condition evidence is favorable enough for a drive recommendation." };
  }
  if (d.condition?.score != null){
    return { verdict:"MAYBE — verify the weak link before leaving.", explanation:"The route is open in the loaded official data, but the trail-quality signal is not strong enough for a clean drive verdict." };
  }
  return { verdict:"NOT ENOUGH VERIFIED EVIDENCE.", explanation:"Fresh operator or grooming evidence is missing. Weather alone is not converted into a favorable trail condition." };
}

function renderDecision(d){
  const label = d.condition?.label || "UNKNOWN";
  $("conditionLabel").textContent = label;
  $("conditionLabel").className = "status-label " + (
    label === "PRESEASON" ? "status-preseason" :
    /GOOD|EXCELLENT/.test(label) ? "status-good" :
    /POOR|BROKEN/.test(label) ? "status-poor" : ""
  );
  $("conditionScore").textContent = d.condition?.score == null
    ? (d.season?.state === "PRESEASON" ? "No ride score while trails are out of season" : "No defensible numeric ride score")
    : `${d.condition.score}/100`;
  $("confidenceValue").textContent = d.confidence?.score != null ? d.confidence.score : "—";
  $("confidenceLabel").textContent = d.confidence?.label || "Unknown";
  $("bestWindow").textContent = d.bestWindow?.label || "Not available";
  $("routeStatus").textContent = d.routeStatus?.state?.replaceAll("_"," ") || "Unknown";
  $("thawRisk").textContent = d.season?.state === "PRESEASON" ? "Not a riding factor yet" : (d.weather?.thawRisk || "Unknown");
  $("evidenceAge").textContent = d.newestEvidence ? ageLabel(d.newestEvidence) : "Unknown";

  const copy = decisionCopy(d);
  $("driveVerdict").textContent = copy.verdict;
  $("driveExplanation").textContent = copy.explanation;

  const reasons = Array.isArray(d.reasons) ? d.reasons : [];
  $("whyPanel").innerHTML = reasons.length
    ? `<ul>${reasons.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`
    : "<p>No additional explanation is available.</p>";

  ga("snowmobile_decision_view", {
    route_id: d.corridor?.id || "grayling-gaylord",
    condition_band: label,
    confidence_band: d.confidence?.label || "unknown",
    closure_state: d.routeStatus?.state || "unknown"
  });
  ga("snowmobile_route_open", {
    route_id: d.corridor?.id || "grayling-gaylord",
    condition_band: label,
    confidence_band: d.confidence?.label || "unknown"
  });
}

function renderSegments(d){
  const el = $("segmentList");
  const segments = Array.isArray(d.segments) ? d.segments : [];
  if (!segments.length){
    el.innerHTML = '<div class="loading-card">Required Trail 7 geometry could not be isolated from the official DNR response. Route openness remains unknown.</div>';
    return;
  }

  el.innerHTML = segments.slice(0, 18).map(s=>{
    const status = String(s.status || "Unspecified");
    const bad = /closed/i.test(status) && !/open/i.test(status);
    const road = s.onRoad && !/unspecified|-1/i.test(s.onRoad) ? s.onRoad : null;
    return `<article class="segment-card" data-segment="${esc(s.id)}" tabindex="0">
      <div>
        <strong>${esc(s.name)}</strong>
        <div class="segment-meta">
          ${s.county ? `<span>${esc(s.county)} County</span>` : ""}
          ${s.lengthMiles ? `<span>${esc(s.lengthMiles)} mi</span>` : ""}
          ${s.groomType ? `<span>${esc(s.groomType)}</span>` : ""}
          ${s.groomer ? `<span>Grooming sponsor: ${esc(s.groomer)}</span>` : ""}
          ${road ? `<span>Road segment: ${esc(road)}</span>` : ""}
        </div>
      </div>
      <div><span class="pill ${bad ? "bad" : ""}">${esc(status)}</span></div>
    </article>`;
  }).join("");

  el.querySelectorAll("[data-segment]").forEach(card=>{
    const fire=()=>ga("snowmobile_segment_open",{route_id:"grayling-gaylord",segment_id:card.dataset.segment});
    card.addEventListener("click",fire);
    card.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); fire(); } });
  });
}

function renderReports(d){
  const el = $("reportList");
  const reports = Array.isArray(d.reports) ? d.reports : [];
  const freshStates = new Set(["LIVE","VERY_RECENT","RECENT"]);
  el.innerHTML = reports.map(r=>{
    const usable = freshStates.has(r.freshnessState);
    const jev = r.jev?.mode === "shared-harness-jev" ? "bounded JEV classification" : "deterministic fallback";
    return `<article class="report-card">
      <div class="report-head">
        <a href="${esc(r.url)}" target="_blank" rel="noopener" data-source-provider="${esc(r.id)}">${esc(r.name)}</a>
        <span class="pill ${usable ? "" : "warn"}">${esc(r.freshnessState || "UNKNOWN")}</span>
      </div>
      <p><strong>Condition language:</strong> ${esc(r.condition || "UNKNOWN")} · <strong>grooming language:</strong> ${esc(r.grooming || "UNKNOWN")}</p>
      <p><strong>Report time:</strong> ${r.reportedAt ? esc(ageLabel(r.reportedAt)) : "not reliably parsed"} · ${esc(jev)}</p>
      ${usable ? "" : "<p><strong>Not used as fresh condition/grooming evidence.</strong></p>"}
    </article>`;
  }).join("") || '<div class="loading-card">No local report sources were available.</div>';

  el.querySelectorAll("[data-source-provider]").forEach(a=>{
    a.addEventListener("click",()=>ga("snowmobile_source_verify",{route_id:"grayling-gaylord",source_provider:a.dataset.sourceProvider}));
  });
}

function renderWeather(d){
  const summary = d.weather || {};
  $("outlookGrid").innerHTML = `<article class="weather-card"><strong>Corridor weather</strong><div class="temp">${summary.currentTempF ?? "—"}°</div><p>Next 24h: ${summary.next24MinF ?? "—"}° to ${summary.next24MaxF ?? "—"}°F</p><p>Thaw risk: ${esc(summary.thawRisk || "UNKNOWN")}</p></article>`;
}

function addWeatherCardsFromApiPayload(d){
  const raw = Array.isArray(d.weatherLocations) ? d.weatherLocations : [];
  if (!raw.length) return renderWeather(d);
  $("outlookGrid").innerHTML = raw.map(w => {
    const periods = Array.isArray(w.hourly) ? w.hourly.slice(0,24) : [];
    const temps = periods.map(p => Number(p.temperature)).filter(Number.isFinite);
    const min = temps.length ? Math.min(...temps) : null;
    const max = temps.length ? Math.max(...temps) : null;
    const first = periods[0] || {};
    return `<article class="weather-card">
      <strong>${esc(w.name)}</strong>
      <div class="temp">${first.temperature ?? "—"}°F</div>
      <p>24h range: ${min ?? "—"}°–${max ?? "—"}°F</p>
      <p>${esc(first.shortForecast || w.error || "Hourly forecast unavailable")}</p>
      <p>Updated ${esc(ageLabel(w.retrievedAt))}</p>
    </article>`;
  }).join("");
}

function renderSourceStatus(d){
  const op = d.operational || {};
  const reportOk = (op.reportSources || []).filter(x=>x.available).length;
  $("sourceNote").textContent = `Data state: ${op.dataState || "unknown"} · JEV: ${op.jevMode || "deterministic"} · ${reportOk}/${(op.reportSources||[]).length} local report sources reachable · natural snow point feed not yet connected.`;
}

function nearestArrivalWeather(d, arrival){
  const grayling = (d.weatherLocations || []).find(w=>w.id==="grayling") || (d.weatherLocations || [])[0];
  const rows = grayling?.hourly || [];
  if (!rows.length) return null;
  let best=null, gap=Infinity;
  for(const row of rows){
    const t=Date.parse(row.startTime || "");
    if(!Number.isFinite(t)) continue;
    const g=Math.abs(t-arrival.getTime());
    if(g<gap){gap=g;best=row;}
  }
  return best ? {location:grayling.name,row:best} : null;
}

function driveTimeBand(minutes){
  const m=Number(minutes);
  if (m < 120) return "under_2h";
  if (m < 180) return "2_3h";
  if (m < 240) return "3_4h";
  if (m < 360) return "4_6h";
  return "6h_plus";
}

function applyDrive(route){
  if (!state.data || !route?.ok) return;
  state.drive=route;
  const shortName = String(route.origin?.displayName || route.origin?.query || "your origin").split(",")[0];
  const arrival = new Date(Date.now() + Number(route.durationMinutes || 0) * 60000);
  const wx = nearestArrivalWeather(state.data, arrival);
  $("driveKicker").textContent = `Worth the drive from ${shortName}?`;
  const pieces = [
    `${durationLabel(route.durationMinutes)} to Grayling`,
    `${Math.round(route.distanceMiles)} mi`,
    `arrival about ${timeLabel(arrival)}`
  ];
  if (wx?.row) pieces.push(`${wx.location}: ${wx.row.temperature}°F · ${wx.row.shortForecast || "forecast available"}`);
  $("driveMeta").textContent = pieces.join(" · ");

  const copy=decisionCopy(state.data);
  $("driveVerdict").textContent=copy.verdict;
  $("driveExplanation").textContent = `${copy.explanation} Road routing is current; trail condition at your arrival is not invented from travel time.`;

  ga("snowmobile_origin_set",{origin_region:"michigan",drive_time_band:driveTimeBand(route.durationMinutes)});
  ga("snowmobile_drive_verdict_view",{
    route_id:"grayling-gaylord",
    drive_time_band:driveTimeBand(route.durationMinutes),
    condition_band:state.data.condition?.label || "unknown",
    confidence_band:state.data.confidence?.label || "unknown"
  });
}

async function checkDrive(origin,{silent=false}={}){
  const q=String(origin||"").trim();
  if(q.length<2) return;
  const button=$("originForm").querySelector("button[type=submit]");
  button.disabled=true;
  if(!silent) $("driveMeta").textContent="Calculating road time to Grayling…";
  try{
    const res=await fetch(`/api/snowmobile-drive?origin=${encodeURIComponent(q)}`,{headers:{accept:"application/json"}});
    const route=await res.json();
    if(!res.ok||!route.ok) throw new Error(route.error||"Drive-time lookup failed");
    try{localStorage.setItem("snowmobile_origin",q);}catch{}
    applyDrive(route);
  }catch(e){
    $("driveMeta").textContent=`Drive-time lookup unavailable: ${String(e.message||e)}. The trail decision above is unchanged.`;
  }finally{
    button.disabled=false;
  }
}

function loadLeaflet(){
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve,reject)=>{
    if (!document.querySelector('link[data-leaflet]')){
      const css=document.createElement("link");
      css.rel="stylesheet"; css.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; css.dataset.leaflet="1";
      document.head.appendChild(css);
    }
    const s=document.createElement("script");
    s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload=()=>resolve(window.L); s.onerror=reject;
    document.head.appendChild(s);
  });
}

async function renderMap(d){
  if (state.mapLoaded) return;
  state.mapLoaded = true;
  try{
    const L = await loadLeaflet();
    const map = L.map("trailMap",{scrollWheelZoom:false}).setView([44.84,-84.70],9);
    state.map = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
      maxZoom:18, attribution:'&copy; OpenStreetMap contributors'
    }).addTo(map);

    const features = (d.segments || []).filter(s=>s.geometry).map(s=>({
      type:"Feature", properties:{name:s.name,status:s.status,groomer:s.groomer}, geometry:s.geometry
    }));
    if (features.length){
      const layer=L.geoJSON({type:"FeatureCollection",features},{
        style:()=>({color:"#235740",weight:5,opacity:.9}),
        onEachFeature:(f,l)=>l.bindPopup(`<strong>${esc(f.properties.name)}</strong><br>Status: ${esc(f.properties.status)}${f.properties.groomer ? `<br>Grooming sponsor: ${esc(f.properties.groomer)}`:""}`)
      }).addTo(map);
      try{ map.fitBounds(layer.getBounds(),{padding:[18,18]}); }catch{}
    } else {
      L.marker([44.6614,-84.7148]).addTo(map).bindPopup("Grayling");
      L.marker([45.0275,-84.6748]).addTo(map).bindPopup("Gaylord");
    }

    const closureFeatures=(d.closures||[]).filter(f=>f?.geometry);
    if(closureFeatures.length){
      L.geoJSON({type:"FeatureCollection",features:closureFeatures},{
        style:()=>({color:"#8c2f2f",weight:7,opacity:.9}),
        onEachFeature:(_,l)=>l.bindPopup("<strong>Official DNR Trail 7 closure record</strong>")
      }).addTo(map);
    }
    const rerouteFeatures=(d.reroutes||[]).filter(f=>f?.geometry);
    if(rerouteFeatures.length){
      L.geoJSON({type:"FeatureCollection",features:rerouteFeatures},{
        style:()=>({color:"#a96519",weight:6,opacity:.9,dashArray:"8 6"}),
        onEachFeature:(_,l)=>l.bindPopup("<strong>Official DNR Trail 7 reroute record</strong>")
      }).addTo(map);
    }

    let tracked=false;
    const trackMap=()=>{
      if(tracked) return;
      tracked=true;
      ga("snowmobile_map_interact",{route_id:"grayling-gaylord",placement:"route-map"});
    };
    map.once("click",trackMap);
    map.once("movestart",trackMap);
  }catch{
    $("trailMap").innerHTML='<div class="map-placeholder">Map unavailable. The trail decision above remains usable without it.</div>';
  }
}

function installMapObserver(d){
  const target=$("mapSection");
  if (!("IntersectionObserver" in window)){ renderMap(d); return; }
  const io=new IntersectionObserver(entries=>{
    if (entries.some(e=>e.isIntersecting)){ io.disconnect(); renderMap(d); }
  },{rootMargin:"350px"});
  io.observe(target);
}

function installStaticTracking(){
  document.querySelectorAll('[data-track="webcam"]').forEach(a=>a.addEventListener("click",()=>ga("snowmobile_webcam_open",{route_id:"grayling-gaylord",placement:"field-checks"})));
  document.querySelectorAll('[data-track="service"]').forEach(a=>a.addEventListener("click",()=>ga("snowmobile_service_open",{route_id:"grayling-gaylord",placement:"field-checks"})));
  document.querySelectorAll('[data-track="source"]').forEach(a=>a.addEventListener("click",()=>ga("snowmobile_source_verify",{route_id:"grayling-gaylord",source_provider:"NOHRSC"})));
}

async function load(){
  $("refreshButton").disabled=true;
  try{
    const res=await fetch("/api/snowmobile-conditions",{headers:{accept:"application/json"}});
    const d=await res.json();
    if (!res.ok) throw new Error(d.detail || d.error || `HTTP ${res.status}`);
    state.data=d;
    renderDecision(d);
    renderSegments(d);
    renderReports(d);
    renderSourceStatus(d);
    addWeatherCardsFromApiPayload(d);
    installMapObserver(d);

    let saved="";
    try{ saved=localStorage.getItem("snowmobile_origin")||""; }catch{}
    if(saved){
      $("originInput").value=saved;
      checkDrive(saved,{silent:true});
    }
  }catch(e){
    $("conditionLabel").textContent="LIVE SOURCES UNAVAILABLE";
    $("conditionScore").textContent="No favorable condition is inferred";
    $("driveVerdict").textContent="VERIFY OFFICIAL SOURCES BEFORE RIDING.";
    $("driveExplanation").textContent="The live bundle could not be verified. Cached or missing data is never promoted into a ride recommendation.";
    $("segmentList").innerHTML='<div class="loading-card">Official trail data could not be loaded.</div>';
    $("reportList").innerHTML='<div class="loading-card">Local reports could not be loaded.</div>';
    $("outlookGrid").innerHTML='<div class="loading-card">Weather could not be loaded.</div>';
    $("sourceNote").textContent=String(e.message || e);
  }finally{
    $("refreshButton").disabled=false;
  }
}

$("whyToggle").addEventListener("click",()=>{
  const panel=$("whyPanel");
  const expanded=$("whyToggle").getAttribute("aria-expanded")==="true";
  $("whyToggle").setAttribute("aria-expanded",String(!expanded));
  panel.hidden=expanded;
});
$("refreshButton").addEventListener("click",()=>{
  state.mapLoaded=false;
  state.drive=null;
  if (state.map){ try{state.map.remove();}catch{} state.map=null; }
  $("trailMap").innerHTML='<div class="map-placeholder">Refreshing official Trail 7 geometry…</div>';
  ga("snowmobile_filter_use",{active_filter:"refresh"});
  load();
});
$("originForm").addEventListener("submit",e=>{
  e.preventDefault();
  checkDrive($("originInput").value);
});

installStaticTracking();
load();
