"use strict";

const state = { data: null, map: null, mapLoaded: false };

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

function renderDecision(d){
  const label = d.condition?.label || "UNKNOWN";
  $("conditionLabel").textContent = label;
  $("conditionLabel").className = "status-label " + (
    label === "PRESEASON" ? "status-preseason" :
    /GOOD|EXCELLENT/.test(label) ? "status-good" :
    /POOR|BROKEN/.test(label) ? "status-poor" : ""
  );
  $("conditionScore").textContent = d.condition?.score == null
    ? (d.season?.state === "PRESEASON" ? "No ride score while trails are out of season" : "Score unavailable")
    : `${d.condition.score}/100`;
  $("confidenceValue").textContent = d.confidence?.score != null ? d.confidence.score : "—";
  $("confidenceLabel").textContent = d.confidence?.label || "Unknown";
  $("bestWindow").textContent = d.bestWindow?.label || "Not available";
  $("routeStatus").textContent = d.routeStatus?.state?.replaceAll("_"," ") || "Unknown";
  $("thawRisk").textContent = d.season?.state === "PRESEASON" ? "Not a riding factor yet" : (d.weather?.thawRisk || "Unknown");
  $("evidenceAge").textContent = d.newestEvidence ? ageLabel(d.newestEvidence) : "Unknown";

  if (d.season?.state === "PRESEASON"){
    $("driveVerdict").textContent = "NO — not for snowmobiling yet.";
    $("driveExplanation").textContent = "State-designated snowmobile trails are outside the Dec. 1–Mar. 31 season. Use this page now to watch corridor readiness and source coverage.";
  } else if (d.routeStatus?.state === "ROUTE_BROKEN"){
    $("driveVerdict").textContent = "NO — the required corridor is broken.";
    $("driveExplanation").textContent = d.routeStatus.reason || "An official required segment is closed.";
  } else if (d.condition?.score >= 75 && d.confidence?.score >= 60){
    $("driveVerdict").textContent = "YES — conditions currently support the trip.";
    $("driveExplanation").textContent = "The corridor clears the legal-status gate and has a favorable condition signal with usable evidence confidence.";
  } else if (d.condition?.score != null){
    $("driveVerdict").textContent = "MAYBE — verify the weak link before leaving.";
    $("driveExplanation").textContent = "The route is not currently strong enough for a clean drive verdict.";
  } else {
    $("driveVerdict").textContent = "NOT ENOUGH VERIFIED EVIDENCE.";
    $("driveExplanation").textContent = "Missing evidence is not converted into a favorable trail condition.";
  }

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
}

function renderSegments(d){
  const el = $("segmentList");
  const segments = Array.isArray(d.segments) ? d.segments : [];
  if (!segments.length){
    el.innerHTML = '<div class="loading-card">Official DNR trail geometry is unavailable. The tool will not infer route openness.</div>';
    return;
  }

  const likely = segments.filter(s => /(?:trail\s*#?\s*7\b|\blp\s*7\b|snowmobile trail #7)/i.test(`${s.name} ${s.comments||""}`));
  const shown = (likely.length ? likely : segments).slice(0, 14);
  el.innerHTML = shown.map((s,i)=>{
    const status = String(s.status || "Unspecified");
    const bad = /closed/i.test(status) && !/open/i.test(status);
    const road = s.onRoad && !/unspecified|-1/i.test(s.onRoad) ? s.onRoad : null;
    return `<article class="segment-card" data-segment="${esc(s.id)}">
      <div>
        <strong>${esc(s.name)}</strong>
        <div class="segment-meta">
          ${s.county ? `<span>${esc(s.county)} County</span>` : ""}
          ${s.lengthMiles ? `<span>${esc(s.lengthMiles)} mi</span>` : ""}
          ${s.groomType ? `<span>${esc(s.groomType)}</span>` : ""}
          ${s.groomer ? `<span>Groomer: ${esc(s.groomer)}</span>` : ""}
          ${road ? `<span>Road segment: ${esc(road)}</span>` : ""}
        </div>
      </div>
      <div><span class="pill ${bad ? "bad" : ""}">${esc(status)}</span></div>
    </article>`;
  }).join("");
}

function renderReports(d){
  const el = $("reportList");
  const reports = Array.isArray(d.reports) ? d.reports : [];
  el.innerHTML = reports.map(r=>{
    const stale = r.freshnessState === "STALE";
    const jev = r.jev?.mode === "shared-harness-jev" ? "bounded JEV classification" : "deterministic fallback";
    return `<article class="report-card">
      <div class="report-head">
        <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>
        <span class="pill ${stale ? "warn" : ""}">${esc(r.freshnessState || "UNKNOWN")}</span>
      </div>
      <p><strong>Condition signal:</strong> ${esc(r.condition || "UNKNOWN")} · <strong>grooming:</strong> ${esc(r.grooming || "UNKNOWN")}</p>
      <p><strong>Report time:</strong> ${r.reportedAt ? esc(ageLabel(r.reportedAt)) : "not reliably parsed"} · ${esc(jev)}</p>
      ${stale ? "<p><strong>Not used as current grooming evidence.</strong></p>" : ""}
    </article>`;
  }).join("") || '<div class="loading-card">No local report sources were available.</div>';
}

function renderWeather(d){
  const el = $("outlookGrid");
  const points = Array.isArray(d.operational?.weatherSource) ? d.operational.weatherSource : null;
  const weather = Array.isArray(d._rawWeather) ? d._rawWeather : [];
  const source = Array.isArray(d.weatherPoints) ? d.weatherPoints : weather;
  const rows = Array.isArray(d.weatherLocations) ? d.weatherLocations : [];
  const cards = (d._weatherCards || []).length ? d._weatherCards : rows;
  if (!cards.length){
    const summary = d.weather || {};
    el.innerHTML = `<article class="weather-card"><strong>Corridor weather</strong><div class="temp">${summary.currentTempF ?? "—"}°</div><p>Next 24h: ${summary.next24MinF ?? "—"}° to ${summary.next24MaxF ?? "—"}°F</p><p>Thaw risk: ${esc(summary.thawRisk || "UNKNOWN")}</p></article>`;
    return;
  }
}

function addWeatherCardsFromApiPayload(d){
  const raw = Array.isArray(d.weatherLocations) ? d.weatherLocations : [];
  if (!raw.length) return;
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
      <p>${esc(first.shortForecast || "Hourly forecast unavailable")}</p>
      <p>Updated ${esc(ageLabel(w.retrievedAt))}</p>
    </article>`;
  }).join("");
}

function renderSourceStatus(d){
  const op = d.operational || {};
  const reportOk = (op.reportSources || []).filter(x=>x.available).length;
  $("sourceNote").textContent = `Data state: ${op.dataState || "unknown"} · JEV: ${op.jevMode || "deterministic"} · ${reportOk}/${(op.reportSources||[]).length} local report sources reachable.`;
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

    const likely = (d.segments || []).filter(s => /(?:trail\s*#?\s*7\b|\blp\s*7\b|snowmobile trail #7)/i.test(`${s.name} ${s.comments||""}`));
    const segs = likely.length ? likely : (d.segments || []);
    const features = segs.filter(s=>s.geometry).map(s=>({
      type:"Feature", properties:{name:s.name,status:s.status,groomer:s.groomer}, geometry:s.geometry
    }));
    if (features.length){
      const layer=L.geoJSON({type:"FeatureCollection",features},{
        style:f=>({weight:5,opacity:.85}),
        onEachFeature:(f,l)=>l.bindPopup(`<strong>${esc(f.properties.name)}</strong><br>Status: ${esc(f.properties.status)}${f.properties.groomer ? `<br>Groomer: ${esc(f.properties.groomer)}`:""}`)
      }).addTo(map);
      try{ map.fitBounds(layer.getBounds(),{padding:[18,18]}); }catch{}
    } else {
      L.marker([44.6614,-84.7148]).addTo(map).bindPopup("Grayling");
      L.marker([45.0275,-84.6748]).addTo(map).bindPopup("Gaylord");
    }
    ga("snowmobile_map_interact",{route_id:"grayling-gaylord",placement:"route-map"});
  }catch(e){
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
    if (Array.isArray(d.weatherLocations) && d.weatherLocations.length) addWeatherCardsFromApiPayload(d);
    else renderWeather(d);
    installMapObserver(d);
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
  if (state.map){ try{state.map.remove();}catch{} state.map=null; }
  $("trailMap").innerHTML='<div class="map-placeholder">Refreshing official trail geometry…</div>';
  ga("snowmobile_filter_use",{active_filter:"refresh"});
  load();
});

load();
