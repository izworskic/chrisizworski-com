const $=s=>document.querySelector(s);const ORIGIN_NAMES={'43.5945,-83.8889':'Bay City','43.4195,-83.9508':'Saginaw','43.6156,-84.2472':'Midland','42.7325,-84.5555':'Lansing','42.9634,-85.6681':'Grand Rapids','42.3314,-83.0458':'Detroit','44.7631,-85.6206':'Traverse City'};let DATA=null,MAP=null,LAYER=null,CLOSURE_LAYER=null,SNOW_LAYER=null;
function track(name,params={}){try{if(typeof window.gtag==='function')window.gtag('event',name,params)}catch{}}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function bandClass(b){return b==='CLOSED'||b==='POOR'?'danger':b==='MARGINAL'||b==='OFF_SEASON'?'warning':''}
function render(d){
 DATA=d; const r=d.route||{}; const active=d.season?.active;
 $('#status').textContent=active?(r.routeState==='ROUTE_BROKEN'?'ROUTE BROKEN':r.band||'UNKNOWN'):'OFF-SEASON';
 $('#status').className='status '+bandClass(active?r.band:'OFF_SEASON');
 $('#score').textContent=Number.isFinite(r.score)?`· ${r.score}/100`:'';
 $('#best').textContent=active?bestWindow(d):'Season opens Dec. 1';
 $('#risk').textContent=active?risk(d):'No current riding score';
 $('#confidence').textContent=`${r.confidence??'—'}/100`;
 $('#grooming').textContent=d.grooming?.label||'Not verified';
 $('#forecastSnow').textContent=forecastSnowLabel(d);
 $('#routeStatus').textContent=routeStatusLabel(d);
 $('#sourceAge').textContent=new Date(d.generatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
 $('#sourceLine').textContent=sourceLine(d);
 $('#drive').innerHTML=active?driveVerdict(d):'<strong>Not a riding verdict yet.</strong> This page is live now so Google and riders can discover it before winter; in-season condition scoring activates Dec. 1.';
 $('#seasonNote').hidden=active;
 renderSections(d);
 renderOutlook(d);
 renderWhy(d);
 renderContradictions(d);
 const segs=(d.segments||[]).sort((a,b)=>(a.score??999)-(b.score??999)).slice(0,10);
 $('#segments').innerHTML=segs.length?segs.map(s=>`<div class="segment"><div><span class="badge ${bandClass(s.band)}">${esc(s.band)}</span> <strong>${esc(s.trailNetwork||s.id)}</strong></div><div class="small">${esc(s.groomingSponsor||'Grooming sponsor not stated')} · ${s.miles?esc(s.miles.toFixed(1))+' mi':'length not stated'} · ${esc(s.surface||'surface unknown')}</div><div>${esc((s.reasons||[])[0]||'No condition explanation available.')}</div></div>`).join(''):'<p>No corridor segments returned.</p>';
 $('#reports').innerHTML=['grayling','gaylord'].map(k=>{const x=d.reports?.[k];if(!x)return'';const hazards=(x.hazards||[]).length?`<div class="hazard-line"><strong>Report hazards:</strong> ${esc(x.hazards.join(', '))}</div>`:'';const j=d.operational?.jev?.[k];const cross=j?.accepted&&j?.condition?`<div class="small">JEV narrative cross-check: ${esc(j.condition)} · confidence ${Math.round((Number(j.confidence)||0)*100)}%. Supplemental only; structured club fields control.</div>`:'';return `<div class="segment"><strong>${esc(x.name)}</strong><div>${esc(x.condition||'Condition not stated')}</div><div class="small">Report: ${esc(x.reportedRaw||'unknown')} · Grooming field: ${esc(x.lastGroomedRaw||'not verified')}</div>${hazards}${cross}<a href="${esc(x.url)}" target="_blank" rel="noopener" data-source-name="${esc(x.name)}">Verify source ↗</a></div>`}).join('');
 $('#sources').innerHTML=(d.sources||[]).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener" data-source-name="${esc(s.name)}">${esc(s.name)}</a> — ${esc(s.authority)}</li>`).join('');
 drawMap(d.scoredGeometry||d.geometry,d.closures);
 track('snowmobile_decision_rendered',{season_active:Boolean(active),condition:r.band||'unknown',route_state:r.routeState||'unknown',confidence:r.confidence??null});
}
function formatDuration(min){const h=Math.floor(min/60),m=Math.round(min%60);return h?`${h}h ${m}m`:`${m}m`}
function departureFor(best,driveMinutes){
  if(!best?.startTime||!Number.isFinite(Number(driveMinutes)))return null;
  const d=new Date(new Date(best.startTime).getTime()-(Number(driveMinutes)+30)*60000);
  return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',weekday:'short',hour:'numeric',minute:'2-digit'}).format(d):null;
}
function personalizedVerdict(d,route,maxHours,label){
  const min=Number(route?.driveMinutes),miles=Number(route?.driveMiles);if(!Number.isFinite(min))return'<strong>Drive time unavailable.</strong> No trip verdict was generated.';
  const drive=`${formatDuration(min)} · ${Number.isFinite(miles)?miles.toFixed(0)+' mi':'distance unavailable'} to Grayling`;
  if(!d.season?.active)return `<strong>${esc(label)} → Grayling: ${drive}.</strong> Riding conditions are off-season, so there is no ride recommendation yet.`;
  if(min>Number(maxHours)*60)return `<strong>NO for your ${esc(maxHours)}-hour limit.</strong> ${esc(label)} → Grayling is about ${drive}. This limit decision is independent of trail quality.`;
  if(d.route?.routeState==='ROUTE_BROKEN')return `<strong>NO.</strong> The drive is within your limit, but an official closure match breaks the required corridor.`;
  const s=Number(d.route?.score),conf=Number(d.route?.confidence);
  const depart=departureFor(d.timing?.best,min);
  const timing=depart?` To reach Grayling about 30 minutes before ${esc(d.timing.best.name)} begins, leave around <strong>${esc(depart)}</strong>.`:'';
  if(conf<50)return `<strong>UNCERTAIN.</strong> ${esc(label)} → Grayling is ${drive}, but evidence confidence is only ${Number.isFinite(conf)?conf:'unknown'}/100.${timing}`;
  if(s>=72)return `<strong>YES, within your drive limit.</strong> ${esc(label)} → Grayling is ${drive}, and the corridor currently scores ${s}/100.${timing}`;
  if(s>=58)return `<strong>BORDERLINE.</strong> The drive is within your limit (${drive}), but corridor quality is only ${s}/100.${timing}`;
  return `<strong>NO for now.</strong> The drive is within your limit (${drive}), but current corridor evidence scores only ${Number.isFinite(s)?s:'unknown'}/100.`;
}
async function checkOrigin(point,label){
  const host=$('#personalDrive'),max=$('#maxDrive')?.value||'3';if(!host)return;
  host.textContent='Checking road time to Grayling…';
  track('snowmobile_origin_check',{origin:label||'location',max_hours:Number(max)});
  try{
    const r=await fetch('/api/snowmobile-drive?from='+encodeURIComponent(point));const j=await r.json();if(!r.ok)throw new Error(j.detail||j.error||String(r.status));
    host.innerHTML=personalizedVerdict(DATA,j,max,label||'Your location')+` <span class="route-source">${esc(j.source)}. ${esc(j.boundary)}</span>`;
  }catch(e){host.innerHTML='<strong>Drive time unavailable.</strong> The routing service did not return a usable result, so no travel time was guessed.'}
}
function agoTime(iso){
 if(!iso)return'no dated source timestamp';
 const min=Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/60000));
 if(!Number.isFinite(min))return'timestamp unknown';
 if(min<2)return'just now';if(min<60)return`${min}m ago`;const h=Math.round(min/60);if(h<48)return`${h}h ago`;return`${Math.round(h/24)}d ago`;
}
function sourceLine(d){const s=d.sourceSummary;if(!s)return'Source freshness unavailable';return `${s.label||((s.decisionFeedCount||0)+' decision feeds')} · newest dated evidence ${agoTime(s.newestDatedSource)}`}
function routeStatusLabel(d){
 if(!d.season?.active)return'Off season';
 if(d.route?.routeState==='ROUTE_BROKEN')return'Official closure matched';
 if(d.route?.legalVerification==='CURRENT_LAYER_CHECKED')return'No matched DNR closure';
 return'Closure status unverified';
}
function forecastSnowLabel(d){
 const rows=[['Grayling',d.weather?.grayling],['Gaylord',d.weather?.gaylord]].filter(([,w])=>w&&!w.error);
 const amounts=rows.filter(([,w])=>Number.isFinite(w.snowHighIn??w.snowIn)).map(([n,w])=>{const lo=Number(w.snowLowIn),hi=Number(w.snowHighIn??w.snowIn);const fmt=x=>x.toFixed(1).replace(/\.0$/,'');return `${n} ${Number.isFinite(lo)&&lo!==hi?fmt(lo)+'–'+fmt(hi):fmt(hi)}″`});
 if(amounts.length)return amounts.join(' · ');
 if(rows.some(([,w])=>w.snowSignal===true))return'Snow forecast; amount unstated';
 return rows.length?'No snow mentioned in current NWS periods':'Not verified';
}
function renderContradictions(d){
 const host=$('#conflictNotice');if(!host)return;const rows=d.contradictions||[];
 if(!rows.length){host.hidden=true;host.innerHTML='';return}
 host.hidden=false;host.innerHTML='<strong>Evidence conflict detected</strong>'+rows.map(x=>`<p>${esc(x.message)}</p>`).join('');
}
function renderWhy(d){
 const host=$('#whyList');if(!host)return;
 const reasons=[];
 if(!d.season?.active)reasons.push('No riding score is issued outside Michigan’s designated Dec. 1–Mar. 31 snowmobile season.');
 else{
   if(d.route?.critical?.reasons?.[0])reasons.push(`Weakest required segment: ${d.route.critical.reasons[0]}`);
   if(d.grooming?.label)reasons.push(`Grooming evidence: ${d.grooming.label}.`);
   if(d.timing?.best)reasons.push(`Best forecast period: ${d.timing.best.name}; weather-period score ${d.timing.best.score}/100. This timing score cannot override trail condition.`);
   if(d.route?.legalVerification==='CURRENT_LAYER_CHECKED')reasons.push('The current DNR temporary-closure layer was checked. No closure match is not the same thing as a guarantee that every segment is legally rideable.');
 }
 for(const x of (d.contradictions||[]))reasons.push(`Conflict: ${x.message}`);
 if(d.trailSource?.provider)reasons.push(`Official trail geometry/status source: ${d.trailSource.provider}${d.trailSource.fallbackReason?' (primary open-data feed fell back)':''}.`);
 if(d.sourceSummary?.newestDatedSource)reasons.push(`Newest dated source evidence: ${agoTime(d.sourceSummary.newestDatedSource)}.`);
 host.innerHTML=reasons.map(x=>`<li>${esc(x)}</li>`).join('')||'<li>No explanation is available.</li>';
}
function renderOutlook(d){
 const host=$('#outlookCards');if(!host)return;
 if(!d.season?.active){host.innerHTML='<article class="outlook-card"><strong>Pre-season</strong><p>The 72-hour riding-window rank activates Dec. 1. Weather can still be viewed below without turning September conditions into a snowmobile recommendation.</p></article>';return}
 const rows=(d.timing?.windows||[]).slice(0,6);
 host.innerHTML=rows.length?rows.map((w)=>{const isBest=Boolean(d.timing?.best?.startTime&&w.startTime===d.timing.best.startTime);return `<article class="outlook-card ${isBest?'best-period':''}"><span>${esc(w.name||'Forecast period')}</span><strong>${w.score}/100 weather window</strong><p>${Number.isFinite(w.maxTempF)?'High '+Math.round(w.maxTempF)+'°F · ':''}${Number.isFinite(w.maxWindMph)?'wind to '+Math.round(w.maxWindMph)+' mph · ':''}${esc((w.reasons||[]).join(', ')||'No major weather penalty identified')}</p>${isBest?'<b>Best forecast timing</b>':''}</article>`}).join(''):'<article class="outlook-card">NWS forecast timing is unavailable.</article>';
}
function bestWindow(d){const b=d.timing?.best;if(!b)return'Weather window not verified';const when=b.name||new Date(b.startTime).toLocaleString();const t=Number.isFinite(b.maxTempF)?` · high ${Math.round(b.maxTempF)}°F`:'';return when+t}
function renderSections(d){
 const host=$('#corridorSections');if(!host)return;
 host.innerHTML=(d.sections||[]).map(s=>{const score=Number.isFinite(s.score)?`${s.score}/100`:'—';const state=s.band||s.routeState||'UNKNOWN';const critical=s.critical?.reasons?.[0]||(!d.season?.active?'Scoring activates Dec. 1.':'No dominant weakness found.');return `<article class="corridor-section"><span>${esc(s.label)}</span><strong class="${bandClass(state)}">${esc(state)}</strong><b>${score}</b><small>${esc(critical)}</small></article>`}).join('')||'<div class="corridor-section">No corridor summary available.</div>';
}
function risk(d){const c=d.route?.critical; if(c?.band==='CLOSED')return'Official closure on required segment'; if(c?.score<40)return'Weak required segment'; const wx=[d.weather?.grayling,d.weather?.gaylord].filter(Boolean); if(wx.some(x=>x.maxTempF>=40))return'Thaw'; if(wx.some(x=>x.rainIn>=.1))return'Rain-on-snow'; return'No dominant weather risk found';}
function driveVerdict(d){const s=d.route?.score,c=d.route?.confidence;if(d.route?.routeState==='ROUTE_BROKEN')return'<strong>NO.</strong> A required segment is officially closed.';if(!Number.isFinite(s))return'<strong>UNKNOWN.</strong> There is not enough verified evidence to call the trip.';if(c<50)return `<strong>UNCERTAIN.</strong> Conditions score ${s}, but evidence confidence is only ${c}. Verify club reports before leaving.`;if(s>=72)return `<strong>GOOD TARGET.</strong> The corridor currently scores ${s}, with confidence ${c}. Check the weakest segment below before committing.`;if(s>=58)return `<strong>BORDERLINE CORRIDOR.</strong> The route is usable on paper, but the weakest segment keeps this from being an easy long-drive recommendation.`;return '<strong>NOT YET.</strong> Current corridor evidence is not strong enough to target this ride.';}
function mapBandColor(b){return b==='CLOSED'?'#8a3028':b==='POOR'?'#a33b32':b==='MARGINAL'?'#b76b1c':b==='FAIR'?'#9b852f':b==='GOOD'?'#397a55':b==='EXCELLENT'?'#135f3a':'#7a847e'}
function drawMap(fc,closureState){
 if(!window.L||!fc)return;
 if(!MAP){MAP=L.map('map',{scrollWheelZoom:false}).setView([44.84,-84.68],9);MAP.once('movestart',()=>track('snowmobile_map_interaction',{action:'move'}));L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(MAP)}
 if(LAYER)LAYER.remove(); if(CLOSURE_LAYER)CLOSURE_LAYER.remove();
 LAYER=L.geoJSON(fc,{
   style:f=>{const p=f.properties||{};return {weight:p.band==='CLOSED'?7:5,opacity:.9,color:mapBandColor(p.band)}},
   onEachFeature:(f,l)=>{const p=f.properties||{};const title=p.trailNetwork||p.Trail_Netw||p.id||p.Unique_ID||'DNR trail segment';const band=p.band||'DNR DESIGNATED';const score=Number.isFinite(p.score)?` · ${p.score}/100`:'';const why=Array.isArray(p.reasons)&&p.reasons.length?`<br>${esc(p.reasons[0])}`:'';const status=p.officialStatus?`<br>DNR snowmobile status: ${esc(p.officialStatus)}`:'';const groom=p.groomType?`<br>Grooming type: ${esc(p.groomType)} · ${esc(p.groomingSponsor||'sponsor not stated')}`:`<br>${esc(p.groomingSponsor||p.Groom_Spon||'Grooming sponsor not stated')}`;l.bindPopup(`<strong>${esc(title)}</strong><br>${esc(band)}${score}${status}${groom}${why}`);l.on('click',()=>track('snowmobile_segment_open',{segment:String(p.id||p.Unique_ID||title),band:String(p.band||'unknown')}))}
 }).addTo(MAP);
 const closures=closureState?.features||[];
 if(closures.length){
   CLOSURE_LAYER=L.geoJSON({type:'FeatureCollection',features:closures},{style:{weight:7,opacity:1,color:'#8a3028',dashArray:'7 5'},onEachFeature:(f,l)=>{const p=f.properties||{};l.bindPopup(`<strong>Official DNR closure / detour layer</strong><br>${esc(p.TrailNameP||p.DNRTrail||'Trail segment')}<br>${esc(p.PublicComm||p.OpenClosed||'Closure detail available from DNR')}`)}}).addTo(MAP);
 }
 const cv=$('#closureVerify'); if(cv)cv.textContent=closureState?.verified?`Official DNR closure feed checked · ${closures.length} corridor record${closures.length===1?'':'s'} returned`:'Official closure feed unavailable — legal status is not confirmed';
 try{MAP.fitBounds(LAYER.getBounds(),{padding:[15,15]})}catch{}
}
function toggleSnowDepth(){
 const btn=$('#toggleSnowDepth'); if(!MAP||!btn)return;
 if(SNOW_LAYER&&MAP.hasLayer(SNOW_LAYER)){MAP.removeLayer(SNOW_LAYER);btn.textContent='Show NOAA snow depth';btn.setAttribute('aria-pressed','false');track('snowmobile_snow_depth_toggle',{state:'off'});return}
 if(!SNOW_LAYER){
   const base='https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer/export';
   const q=new URLSearchParams({bbox:'-84.86,44.55,-84.48,45.12',bboxSR:'4326',imageSR:'4326',size:'900,1100',format:'png32',transparent:'true',layers:'show:0',f:'image'});
   SNOW_LAYER=L.imageOverlay(base+'?'+q.toString(),[[44.55,-84.86],[45.12,-84.48]],{opacity:.48,interactive:false});
 }
 SNOW_LAYER.addTo(MAP);btn.textContent='Hide NOAA snow depth';btn.setAttribute('aria-pressed','true');SNOW_LAYER.bringToBack();track('snowmobile_snow_depth_toggle',{state:'on'});
}
document.addEventListener('click',e=>{
 if(e.target?.id==='toggleSnowDepth')toggleSnowDepth();
 if(e.target?.id==='checkDrive'){const v=$('#originPreset')?.value;if(v)checkOrigin(v,ORIGIN_NAMES[v]||'Selected origin')}
 if(e.target?.id==='useMyLocation'){
   const host=$('#personalDrive');if(!navigator.geolocation){if(host)host.textContent='Browser location is unavailable.'}
   else{if(host)host.textContent='Requesting your location…';navigator.geolocation.getCurrentPosition(pos=>checkOrigin(`${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`,'Your location'),()=>{if(host)host.textContent='Location was not shared. Choose a city instead.'},{enableHighAccuracy:false,timeout:10000,maximumAge:300000})}
 }
 const a=e.target?.closest?.('[data-source-name]');if(a)track('snowmobile_source_verify',{source:a.getAttribute('data-source-name')||'unknown'});
});
async function load(){try{const r=await fetch('/api/snowmobile');const d=await r.json();if(!r.ok)throw new Error(d.detail||d.error||r.status);render(d)}catch(e){$('#status').textContent='DATA UNAVAILABLE';$('#drive').innerHTML='<strong>No ride recommendation.</strong> Live source verification failed, so the page is not substituting guessed conditions.';$('#segments').innerHTML='<p>'+esc(e.message)+'</p>';}}
load();