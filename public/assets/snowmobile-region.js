const $=s=>document.querySelector(s);
const ORIGIN_NAMES={'43.5945,-83.8889':'Bay City','43.4195,-83.9508':'Saginaw','43.6156,-84.2472':'Midland','42.7325,-84.5555':'Lansing','42.9634,-85.6681':'Grand Rapids','42.3314,-83.0458':'Detroit','44.7631,-85.6206':'Traverse City'};
let DATA=null,MAP=null,LAYER=null,CLOSURE_LAYER=null,SNOW_LAYER=null,CLOSURES=null;
let ROUTE_MODE=false,ROUTE_POINTS=[],ROUTE_MARKERS=[],ROUTE_LINE=null;
const ROUTE_CLICK_EVENTS=new WeakSet();
let ROUTE_REQUEST_ID=0,ROUTE_ABORT=null;
function track(name,params={}){try{if(typeof window.gtag==='function')window.gtag('event',name,params)}catch{}}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function bandClass(b){return b==='CLOSED'||b==='POOR'?'bad':b==='MARGINAL'||b==='OFF_SEASON'||b==='UNKNOWN'?'warn':b==='EXCELLENT'||b==='GOOD'?'good':''}
function weatherPoints(d){
  if(d.legacyCorridor)return [d.weather?.grayling,d.weather?.gaylord].filter(w=>w&&!w.error);
  return d.weather&&!d.weather.error?[d.weather]:[];
}
function snowEvidenceLabel(d){
  const s=d.surfaceEvidence?.observedSnow;
  if(!s?.available)return'Observed snowfall unavailable';
  const fmt=x=>Number(x).toFixed(1).replace(/\.0$/,'');
  if(Number.isFinite(s.largest48hInches))return`Up to ${fmt(s.largest48hInches)}″ in an NWS snowfall report timestamped in this region within 48h (report duration varies; not trail base)`;
  if(Number.isFinite(s.largest168hInches))return`Up to ${fmt(s.largest168hInches)}″ in an NWS snowfall report timestamped within 7d (report duration varies; not trail base)`;
  return'No NWS snowfall report timestamped in this region in the last 7 days';
}
function recentWeatherLabel(d){
  const w=d.surfaceEvidence?.recentWeather;
  if(!w?.available)return'Recent thaw/rain history unavailable';
  if(w.rainObserved)return`Rain/icing observed near ${d.hubTown||'the region hub'} in the last 48h`; 
  if(w.thawRisk==='HIGH')return'High recent thaw/softening risk from NWS station observations';
  if(w.thawRisk==='MODERATE')return'Moderate recent thaw/softening risk from NWS station observations';
  if(w.thawRisk==='LOW')return'Low recent thaw/softening risk from available NWS station observations';
  return'Recent thaw/softening risk unknown';
}
function render(d){
  DATA=d; const r=d.route||{}; const active=d.season?.active;
  $('#status').textContent=!window.SnowmobileComparison.bundleFresh(d)?'DATA STALE':active?(r.routeState==='ROUTE_BROKEN'?'ROUTE BROKEN':r.band||'UNKNOWN'):'OFF-SEASON';
  $('#status').className='status '+bandClass(window.SnowmobileComparison.bundleFresh(d)&&active?r.band:'UNKNOWN');
  $('#score').textContent=window.SnowmobileComparison.bundleFresh(d)&&Number.isFinite(r.score)?`· ${r.score}/100`:'';
  $('#best').textContent=active?bestWindow(d):'Season opens Dec. 1';
  $('#risk').textContent=active?risk(d):'No current riding score';
  $('#confidence').textContent=`${r.confidence??'—'}/100`;
  $('#grooming').textContent=d.grooming?.label||'Not verified';
  $('#forecastSnow').textContent=forecastSnowLabel(d);
  $('#routeStatus').textContent=routeStatusLabel(d);
  $('#sourceAge').textContent=new Date(d.generatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  $('#sourceLine').textContent=sourceLine(d);
  $('#drive').innerHTML=active?driveVerdict(d):'<strong>Not a riding verdict yet.</strong> In-season condition scoring activates Dec. 1.';
  const sn=$('#seasonNote'); if(sn)sn.hidden=active;
  renderSections(d);renderOutlook(d);renderWhy(d);renderContradictions(d);
  const segs=(d.segments||[]).filter(s=>Number.isFinite(s.score)||s.veto||s.band==='UNKNOWN').sort((a,b)=>(a.score??999)-(b.score??999)).slice(0,10);
  const segHead=$('#segments');
  if(segHead)segHead.innerHTML=segs.length?segs.map(s=>`<div class="segment"><div><span class="badge ${bandClass(s.band)}">${esc(s.band)}</span> <strong>${esc(s.trailNetwork||s.id)}</strong></div><div class="small">${esc(s.groomingSponsor||'Grooming sponsor not stated')} · ${s.miles?esc(s.miles.toFixed(1))+' mi':'length not stated'} · ${esc(s.surface||'surface unknown')}</div><div>${esc((s.reasons||[])[0]||'No condition explanation available.')}</div></div>`).join(''):(active?'<p>No verified segment condition is available.</p>':'<p>Off-season: segments are listed by DNR status only.</p>');
  const evidence=$('#reports');
  if(evidence){
    if(d.legacyCorridor){
      evidence.innerHTML=['grayling','gaylord'].map(k=>{const x=d.reports?.[k];if(!x)return'';const hazards=(x.hazards||[]).length?`<div class="hazard-line"><strong>Report hazards:</strong> ${esc(x.hazards.join(', '))}</div>`:'';const j=d.jev?.[k];const cross=j?.accepted&&j?.condition?`<div class="small">JEV narrative cross-check: ${esc(j.condition)} · confidence ${Math.round((Number(j.confidence)||0)*100)}%. Supplemental only; structured club fields control.</div>`:'';return `<div class="segment"><strong>${esc(x.name)}</strong><div>${esc(x.condition||'Condition not stated')}</div><div class="small">Report: ${esc(x.reportedRaw||'unknown')} · Grooming field: ${esc(x.lastGroomedRaw||'not verified')}</div>${hazards}${cross}<a href="${esc(x.url)}" target="_blank" rel="noopener" data-source-name="${esc(x.name)}">Verify source ↗</a></div>`}).join('');
    }else{
      evidence.innerHTML=`<p class="no-evidence-note"><strong>No current local surface-report feed is configured for this region.</strong> The tool therefore withholds a ride-quality score instead of inferring conditions from an open DNR trail, snowfall or favorable weather.</p><div class="segment"><strong>Observed snow context</strong><div class="small">${esc(snowEvidenceLabel(d))}</div></div><div class="segment"><strong>Recent weather-damage context</strong><div class="small">${esc(recentWeatherLabel(d))}</div></div>`;
    }
  }
  $('#sources').innerHTML=(d.sources||[]).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener" data-source-name="${esc(s.name)}">${esc(s.name)}</a> — ${esc(s.authority)}</li>`).join('');
  const cv=$('#closureVerify');
  if(cv){const matched=d.closures?.matched?.features?.length||0;cv.textContent=d.closures?.verified?`Official DNR closure feed checked statewide · ${matched} record${matched===1?'':'s'} matched to this region's trails`:'Official closure feed unavailable — legal status is not confirmed';}
  CLOSURES=d.closures?.matched?.features||[];drawMap(d);updateRouteAvailability();
  track('snowmobile_region_decision_rendered',{region:d.key,season_active:Boolean(active),condition:r.band||'unknown',route_state:r.routeState||'unknown',confidence:r.confidence??null});
}
function formatDuration(min){const h=Math.floor(min/60),m=Math.round(min%60);return h?`${h}h ${m}m`:`${m}m`}
function departureFor(best,driveMinutes){
  if(!best?.startTime||!Number.isFinite(Number(driveMinutes)))return null;
  const d=new Date(new Date(best.startTime).getTime()-(Number(driveMinutes)+30)*60000);
  return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',weekday:'short',hour:'numeric',minute:'2-digit'}).format(d):null;
}
function personalizedVerdict(d,route,maxHours,label){
  if(!window.SnowmobileComparison.bundleFresh(d))return '<strong>Current evidence unavailable or too old.</strong> No riding recommendation.';
  if(d.season?.active&&(d.closures?.verified!==true||d.route?.legalVerification==='UNVERIFIED'))return '<strong>Official closure verification is incomplete.</strong> Check DNR before deciding to ride.';
  const min=route?.driveMinutes,miles=route?.driveMiles,destLabel=d.hubTown||route?.destination?.label?.split(',')[0]||'the region hub';
  if(!Number.isFinite(min))return'<strong>Drive time unavailable.</strong> No trip verdict was generated.';
  const drive=`${formatDuration(min)} · ${Number.isFinite(miles)?miles.toFixed(0)+' mi':'distance unavailable'} to ${esc(destLabel)}`;
  if(!d.season?.active)return `<strong>${esc(label)} → ${esc(destLabel)}: ${drive}.</strong> Riding conditions are off-season, so there is no ride recommendation yet.`;
  if(min>Number(maxHours)*60)return `<strong>NO for your ${esc(maxHours)}-hour limit.</strong> ${esc(label)} → ${esc(destLabel)} is about ${drive}. This limit decision is independent of trail quality.`;
  if(d.route?.routeState==='ROUTE_BROKEN')return `<strong>NO.</strong> The drive is within your limit, but an official closure match breaks a required corridor segment.`;
  const rawScore=d.route?.score,s=Number(rawScore),conf=Number(d.route?.confidence);
  const depart=departureFor(d.timing?.best,min);const timing=depart?` Best weather timing would require leaving around <strong>${esc(depart)}</strong>, but weather timing cannot substitute for trail evidence.`:'';
  if(!Number.isFinite(rawScore))return `<strong>UNKNOWN — do not make the trip decision from this page alone.</strong> ${esc(label)} → ${esc(destLabel)} is ${drive}, but current local trail-surface evidence is missing or too old.${timing}`;
  if(conf<50)return `<strong>UNCERTAIN.</strong> ${esc(label)} → ${esc(destLabel)} is ${drive}, but evidence confidence is only ${Number.isFinite(conf)?conf:'unknown'}/100.${timing}`;
  if(s>=72)return `<strong>STRONGER TARGET.</strong> ${esc(label)} → ${esc(destLabel)} is ${drive}, and verified route evidence currently scores ${s}/100.${timing}`;
  if(s>=58)return `<strong>BORDERLINE.</strong> The drive is within your limit (${drive}), but route quality is only ${s}/100.${timing}`;
  return `<strong>NO for now.</strong> The drive is within your limit (${drive}), but current verified route evidence scores only ${Number.isFinite(s)?s:'unknown'}/100.`;
}
async function checkOrigin(point,label){
  const host=$('#personalDrive'),max=$('#maxDrive')?.value||'3';if(!host||!DATA)return;
  const destLabel=DATA.hubTown||'the region hub';host.textContent=`Checking road time to ${destLabel}…`;
  track('snowmobile_origin_check',{origin:label||'location',region:DATA.key,max_hours:Number(max)});
  try{
    const r=await fetch(`/api/snowmobile-drive?region=${encodeURIComponent(DATA.key)}&from=`+encodeURIComponent(point));const j=await r.json();if(!r.ok)throw new Error(j.detail||j.error||String(r.status));
    host.innerHTML=personalizedVerdict(DATA,j,max,label||'Your location')+` <span class="route-source">${esc(j.source)}. ${esc(j.boundary)}</span>`;
  }catch(e){host.innerHTML='<strong>Drive time unavailable.</strong> The routing service did not return a usable result, so no travel time was guessed.'}
}
function agoTime(iso){
  if(!iso)return'no dated source timestamp';const min=Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/60000));
  if(!Number.isFinite(min))return'timestamp unknown';if(min<2)return'just now';if(min<60)return`${min}m ago`;const h=Math.round(min/60);if(h<48)return`${h}h ago`;return`${Math.round(h/24)}d ago`;
}
function sourceLine(d){const s=d.sourceSummary;if(!s)return'Source freshness unavailable';return `${s.label||((s.decisionFeedCount||0)+' decision feeds')} · newest dated evidence ${agoTime(s.newestDatedSource)}`}
function routeStatusLabel(d){
  if(!d.season?.active)return'Off season';
  if(d.route?.routeState==='ROUTE_BROKEN')return'Official closure matched';
  if(d.route?.legalVerification==='CURRENT_LAYER_CHECKED')return'No matched DNR closure';
  return'Closure status unverified';
}
function forecastSnowLabel(d){
  const points=d.legacyCorridor?[['Grayling',d.weather?.grayling],['Gaylord',d.weather?.gaylord]]:[[d.hubTown||'Region',d.weather]];
  const rows=points.filter(([,w])=>w&&!w.error);
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
  const host=$('#whyList');if(!host)return;const reasons=[];
  if(!d.season?.active)reasons.push('No riding score is issued outside Michigan’s designated Dec. 1–Mar. 31 snowmobile season.');
  else{
    if(d.route?.critical?.reasons?.[0])reasons.push(`Weakest required segment: ${d.route.critical.reasons[0]}`);
    if(!Number.isFinite(d.route?.score))reasons.push('Ride-quality score withheld: current local trail-surface evidence is missing or too old. DNR status, snowfall and weather do not fill that gap.');
    if(d.grooming?.label)reasons.push(`Grooming evidence: ${d.grooming.label}.`);
    reasons.push(`Observed snow context: ${snowEvidenceLabel(d)}.`);
    reasons.push(`Recent weather context: ${recentWeatherLabel(d)}.`);
    if(d.timing?.best)reasons.push(`Best forecast period: ${d.timing.best.name}; weather-period score ${d.timing.best.score}/100. This timing score cannot upgrade an unverified trail condition.`);
    if(d.route?.legalVerification==='CURRENT_LAYER_CHECKED')reasons.push('The current DNR temporary-closure layer was checked statewide. No closure match is not the same thing as a guarantee that every segment is legally rideable.');
  }
  for(const x of (d.contradictions||[]))reasons.push(`Conflict: ${x.message}`);
  if(d.trailSource?.provider)reasons.push(`Official trail geometry/status source: ${d.trailSource.provider}${d.trailSource.fallbackReason?' (primary open-data feed fell back)':''}.`);
  if(d.sourceSummary?.newestDatedSource)reasons.push(`Newest dated source evidence: ${agoTime(d.sourceSummary.newestDatedSource)}.`);
  if(!d.legacyCorridor)reasons.push('No current local club/operator condition feed is configured for this region, so the product withholds a ride-quality score rather than rating the surface from DNR status and weather alone.');
  host.innerHTML=reasons.map(x=>`<li>${esc(x)}</li>`).join('')||'<li>No explanation is available.</li>';
}
function renderOutlook(d){
  const host=$('#outlookCards');if(!host)return;
  if(!d.season?.active){host.innerHTML='<article class="outlook-card"><strong>Pre-season</strong><p>The 72-hour riding-window rank activates Dec. 1. Weather can still be viewed below without turning off-season conditions into a snowmobile recommendation.</p></article>';return}
  const rows=(d.timing?.windows||[]).slice(0,6);
  const caveat=!Number.isFinite(d.route?.score)?'<div class="small"><strong>Trail surface unverified:</strong> this ranks weather timing only.</div>':'';
  host.innerHTML=(rows.length?rows.map((w)=>{const isBest=Boolean(d.timing?.best?.startTime&&w.startTime===d.timing.best.startTime);return `<article class="outlook-card ${isBest?'best-period':''}"><span>${esc(w.name||'Forecast period')}</span><strong>${w.score}/100 weather window</strong><p>${Number.isFinite(w.maxTempF)?'High '+Math.round(w.maxTempF)+'°F · ':''}${Number.isFinite(w.maxWindMph)?'wind to '+Math.round(w.maxWindMph)+' mph · ':''}${esc((w.reasons||[]).join(', ')||'No major weather penalty identified')}</p>${isBest?'<b>Best forecast timing</b>':''}</article>`}).join(''):'<article class="outlook-card">NWS forecast timing is unavailable.</article>')+caveat;
}
function bestWindow(d){const b=d.timing?.best;if(!b)return'Weather window not verified';const when=b.name||new Date(b.startTime).toLocaleString();const t=Number.isFinite(b.maxTempF)?` · high ${Math.round(b.maxTempF)}°F`:'';return when+t+(Number.isFinite(d.route?.score)?'':' · weather only')}
function renderSections(d){
  const wrap=$('#corridor-sections-wrap');if(!d.legacyCorridor){if(wrap)wrap.hidden=true;return}if(wrap)wrap.hidden=false;
  const host=$('#corridorSections');if(!host)return;
  host.innerHTML=(d.sections||[]).map(s=>{const score=Number.isFinite(s.score)?`${s.score}/100`:'—';const state=s.band||s.routeState||'UNKNOWN';const critical=s.critical?.reasons?.[0]||(!d.season?.active?'Scoring activates Dec. 1.':'No verified surface condition available.');return `<article class="corridor-section"><span>${esc(s.label)}</span><strong class="${bandClass(state)}">${esc(state)}</strong><b>${score}</b><small>${esc(critical)}</small></article>`}).join('')||'<div class="corridor-section">No corridor summary available.</div>';
}
function risk(d){
  const c=d.route?.critical;if(c?.band==='CLOSED')return'Official closure on required segment';if(Number.isFinite(c?.score)&&c.score<40)return'Weak required segment';
  const recent=d.surfaceEvidence?.recentWeather;if(recent?.rainObserved)return'Recent rain/icing observed';if(recent?.thawRisk==='HIGH')return'High recent thaw risk';if(recent?.thawRisk==='MODERATE')return'Moderate recent thaw risk';
  const wx=weatherPoints(d);if(wx.some(x=>Number(x.maxTempF)>=40))return'Forecast thaw';if(wx.some(x=>x.rainSignal===true))return'Forecast rain-on-snow';
  if(!Number.isFinite(d.route?.score))return'Trail surface unverified';return'No dominant weather risk found';
}
function driveVerdict(d){
  if(!window.SnowmobileComparison.bundleFresh(d))return '<strong>Current evidence unavailable or too old.</strong> No riding recommendation.';
  if(d.season?.active&&d.closures?.verified!==true)return '<strong>Closure check incomplete.</strong> Verify DNR before deciding to ride.';
  const s=d.route?.score,c=d.route?.confidence;
  if(d.route?.routeState==='ROUTE_BROKEN')return'<strong>NO.</strong> A required segment is officially closed.';
  if(!Number.isFinite(s))return'<strong>UNKNOWN — not enough evidence to load the sleds.</strong> DNR trail/closure status, observed snow and weather are available as context, but a current local trail-surface report is missing or too old.';
  if(c<50)return `<strong>UNCERTAIN.</strong> Conditions score ${s}, but evidence confidence is only ${c}. Verify a current local source before committing to a long drive.`;
  if(s>=72)return `<strong>STRONGER TARGET.</strong> Verified route evidence currently scores ${s}, with confidence ${c}. Check the weakest segment and report age before committing.`;
  if(s>=58)return `<strong>BORDERLINE ROUTE.</strong> Current evidence supports riding, but the weakest segment keeps this from being an easy long-drive recommendation.`;
  return '<strong>NOT YET.</strong> Current verified route evidence is not strong enough to target this ride.';
}
function mapBandColor(b){return b==='CLOSED'?'#5f2c2a':b==='POOR'?'#a33b32':b==='MARGINAL'?'#b76b1c':b==='FAIR'?'#93641d':b==='GOOD'?'#1f6b46':b==='EXCELLENT'?'#135f3a':'#8a948e'}
function drawMap(d){
  const fc=d.scoredGeometry;if(!window.L||!fc)return;
  if(!MAP){const center=d.mapCenter||[44.9,-85.6];MAP=L.map('map',{scrollWheelZoom:false}).setView(center,d.legacyCorridor?9:8);MAP.once('movestart',()=>track('snowmobile_map_interaction',{action:'move'}));L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(MAP);MAP.on('click',onMapClick)}
  if(LAYER)LAYER.remove(); if(CLOSURE_LAYER)CLOSURE_LAYER.remove();
  LAYER=L.geoJSON(fc,{style:f=>{const p=f.properties||{};return {weight:p.band==='CLOSED'?7:5,opacity:.9,color:mapBandColor(p.band)}},onEachFeature:(f,l)=>{const p=f.properties||{};const title=p.trailNetwork||p.id||'DNR trail segment';const band=p.band||'DNR DESIGNATED';const score=Number.isFinite(p.score)?` · ${p.score}/100`:'';const why=Array.isArray(p.reasons)&&p.reasons.length?`<br>${esc(p.reasons[0])}`:'';const status=p.officialStatus?`<br>DNR snowmobile status: ${esc(p.officialStatus)}`:'';const groom=p.groomType?`<br>Grooming type: ${esc(p.groomType)} · ${esc(p.groomingSponsor||'sponsor not stated')}`:`<br>${esc(p.groomingSponsor||'Grooming sponsor not stated')}`;l.bindPopup(`<strong>${esc(title)}</strong><br>${esc(band)}${score}${status}${groom}${why}`);l.on('click',e=>{if(ROUTE_MODE)onMapClick(e);else track('snowmobile_segment_open',{segment:String(p.id||title),band:String(p.band||'unknown')});})}}).addTo(MAP);
  const closures=CLOSURES||[];if(closures.length)CLOSURE_LAYER=L.geoJSON({type:'FeatureCollection',features:closures},{style:{weight:7,opacity:1,color:'#5f2c2a',dashArray:'7 5'},onEachFeature:(f,l)=>{const p=f.properties||{};l.bindPopup(`<strong>Official DNR temporary closure</strong><br>${esc(p.TrailNameP||p.DNRTrail||'Trail segment')}<br>${esc(p.PublicComm||p.OpenClosed||'Closure detail available from DNR')}`)}}).addTo(MAP);
  try{MAP.fitBounds(LAYER.getBounds(),{padding:[15,15]})}catch{}
}
function toggleSnowDepth(){
  const btn=$('#toggleSnowDepth'); if(!MAP||!btn||!DATA)return;
  if(SNOW_LAYER&&MAP.hasLayer(SNOW_LAYER)){MAP.removeLayer(SNOW_LAYER);btn.textContent='Show NOAA snow depth';btn.setAttribute('aria-pressed','false');track('snowmobile_snow_depth_toggle',{state:'off'});return}
  if(!SNOW_LAYER){
    const b=DATA&&DATA.bbox;const box=b?{minLon:b.minLon,minLat:b.minLat,maxLon:b.maxLon,maxLat:b.maxLat}:(()=>{const c=DATA.mapCenter||[44.9,-85.6],half=0.6;return {minLon:c[1]-half,minLat:c[0]-half,maxLon:c[1]+half,maxLat:c[0]+half};})();
    const bbox=[box.minLon,box.minLat,box.maxLon,box.maxLat].join(','),base='https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer/export';
    const q=new URLSearchParams({bbox,bboxSR:'4326',imageSR:'4326',size:'900,1100',format:'png32',transparent:'true',layers:'show:0',f:'image'});
    SNOW_LAYER=L.imageOverlay(base+'?'+q.toString(),[[box.minLat,box.minLon],[box.maxLat,box.maxLon]],{opacity:.48,interactive:false});
  }
  SNOW_LAYER.addTo(MAP);btn.textContent='Hide NOAA snow depth';btn.setAttribute('aria-pressed','true');SNOW_LAYER.bringToBack();track('snowmobile_snow_depth_toggle',{state:'on'});
}
function routeModeButton(){return $('#routeModeToggle');}
function routeResultHost(){return $('#routeResult');}
const ROUTE_MARK_COLOR='#e8a33d';
let ROUTE_BUSY=false;
function invalidateRoute(){ROUTE_REQUEST_ID++;if(ROUTE_ABORT)ROUTE_ABORT.abort();ROUTE_ABORT=null;ROUTE_BUSY=false;if(ROUTE_LINE){ROUTE_LINE.remove();ROUTE_LINE=null;}const host=routeResultHost();if(host){host.hidden=true;host.innerHTML='';}}
function clearRoutePoints(){invalidateRoute();for(const m of ROUTE_MARKERS)m.remove();ROUTE_MARKERS=[];ROUTE_POINTS=[];}
function setRouteHint(text,on=true){for(const id of ['routeHint','mapRouteHint']){const el=$('#'+id);if(el){el.hidden=!on;el.textContent=text;}}}
function routeAvailable(){return !!(MAP&&DATA?.scoredGeometry?.features?.some(f=>['LineString','MultiLineString'].includes(f.geometry?.type)));}
function syncRouteControls(){
  const n=ROUTE_POINTS.length,available=routeAvailable();
  const btn=routeModeButton();if(btn){btn.disabled=!available;btn.textContent=ROUTE_MODE||n?'Start over':'Plan a route';btn.setAttribute('aria-pressed',String(ROUTE_MODE));}
  const build=$('#buildRoute');if(build){build.disabled=!available||n<2||ROUTE_BUSY||!ROUTE_MODE;build.textContent=ROUTE_BUSY?'Building…':'Build route';}
  const undo=$('#undoRoute');if(undo)undo.disabled=!n||ROUTE_BUSY;
  const edit=$('#editRoute');if(edit)edit.hidden=ROUTE_MODE||!n||ROUTE_BUSY;
  const clear=$('#clearRoute');if(clear)clear.hidden=!n&&!ROUTE_MODE;
  const list=$('#routeStops');if(list){list.hidden=!n;list.innerHTML=ROUTE_POINTS.map((p,i)=>`<li>${i===0?'Start':`Stop ${i+1}`} · ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</li>`).join('');}
  if(MAP)MAP.getContainer().style.cursor=ROUTE_MODE&&!ROUTE_BUSY?'crosshair':'';
}
function updateRouteAvailability(){syncRouteControls();if(!routeAvailable())setRouteHint(DATA?'Trail route planning is unavailable because the mapped trail data could not be loaded. Use the official DNR trail maps below.':'Loading trail map…');else if(!ROUTE_POINTS.length)setRouteHint(ROUTE_MODE?'Tap your starting point on a mapped trail.':'Choose Plan a route, then tap your stops in order.');}
function scrollRouteElement(el){el?.scrollIntoView?.({block:'nearest',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function setRouteMode(on){ROUTE_MODE=on;syncRouteControls();}
// The main button always starts a fresh draft. It never toggles ambiguously.
function toggleRouteMode(){if(!routeAvailable()){updateRouteAvailability();return;}clearRoutePoints();setRouteMode(true);setRouteHint('Tap your starting point on a mapped trail.');track('snowmobile_route_mode_start',{region:DATA?.key||'unknown'});}
function clearRoute(){clearRoutePoints();setRouteMode(false);updateRouteAvailability();track('snowmobile_route_cleared',{region:DATA?.key||'unknown'});}
function draftHint(){setRouteHint(ROUTE_POINTS.length<2?(ROUTE_POINTS.length?'Start selected. Tap your next stop or finish.':'Tap your starting point on a mapped trail.'):`${ROUTE_POINTS.length} stops selected. Add another stop or choose Build route.`);}
function undoRoute(){if(!ROUTE_POINTS.length||ROUTE_BUSY)return;invalidateRoute();ROUTE_POINTS.pop();ROUTE_MARKERS.pop()?.remove();setRouteMode(true);draftHint();}
function editRoute(){if(!ROUTE_POINTS.length)return;invalidateRoute();setRouteMode(true);draftHint();}
function onMapClick(e){
  if(!ROUTE_MODE||!MAP||ROUTE_BUSY)return;
  const original=e.originalEvent;if(original&&typeof original==='object'){if(ROUTE_CLICK_EVENTS.has(original))return;ROUTE_CLICK_EVENTS.add(original);}
  MAP.closePopup();if(ROUTE_POINTS.length>=12){setRouteHint('12 stops selected. Build route, or undo a stop to change it.');return;}
  invalidateRoute();const marker=L.circleMarker(e.latlng,{radius:9,color:'#2a1c0a',weight:2,fillColor:ROUTE_MARK_COLOR,fillOpacity:.95}).addTo(MAP);
  ROUTE_MARKERS.push(marker);ROUTE_POINTS.push(e.latlng);marker.bindTooltip?.(String(ROUTE_POINTS.length),{permanent:true,direction:'top',className:'route-stop-label'});syncRouteControls();draftHint();
}
function routeResultHtml(route){
  if(!route)return '<p><strong>Route unavailable.</strong> The routing service did not return a usable result.</p>';
  if(!route.routable)return `<p><strong>No complete route drawn.</strong> ${esc(route.reason||'Your stops are not connected by mapped, open trail.')}</p><p class="small">Use Edit stops or Undo last stop to adjust your route.</p>`;
  const worst=route.worstSegmentOnRoute;const worstLine=worst&&Number.isFinite(worst.score)?`<div class="small">Weakest scored segment: <span class="badge ${bandClass(worst.band)}">${esc(worst.band)}</span> ${esc(worst.trailNetwork||worst.segmentId)} · ${esc(worst.score)}/100. Unscored segments remain unverified.</div>`:'<div class="small">Trail conditions are unverified. Mapped distance does not establish ride quality.</div>';
  const closedNote=route.closedSegmentsExcludedFromRegion?`<div class="small">${route.closedSegmentsExcludedFromRegion} known closed segments excluded from routing.</div>`:'';
  const legs=(route.legs||[]).map(l=>`<li><strong>Stop ${l.fromStop} → ${l.toStop}:</strong> ${esc(l.distanceMiles)} mi · about ${esc(formatDuration(l.estimatedMinutes))}<br>${esc(l.trailsVia.join(' → '))}<br><span class="small">Junction snap: ${esc(l.startSnapMiles)} mi at start, ${esc(l.endSnapMiles)} mi at finish.</span></li>`).join('');
  const segments=(route.segments||[]).map(s=>`<li>${esc(s.trailNetwork||s.segmentId)} · ${esc(s.band||'UNKNOWN')}${Number.isFinite(s.score)?` · ${esc(s.score)}/100`:' · surface unverified'}</li>`).join('');
  return `<div class="route-headline"><strong>${esc(route.distanceMiles)} mi total</strong> · about ${esc(formatDuration(route.estimatedMinutes))}</div><div class="small">${esc(route.stopCount||2)} stops · ${esc(route.segmentsTraversed)} unique DNR segments · assumed ${esc(route.assumedAvgMph)} mph average</div>${worstLine}${closedNote}${legs?`<h3>Your route, leg by leg</h3><ol class="route-legs">${legs}</ol>`:''}${segments?`<details><summary>Trail condition evidence along the route</summary><ul>${segments}</ul></details>`:''}<div class="small route-truth-inline">${esc(route.truth||'')}</div>`;
}
async function computeRoute(){
  const host=routeResultHost();if(!host||!DATA||ROUTE_POINTS.length<2||ROUTE_BUSY||!ROUTE_MODE)return;
  invalidateRoute();ROUTE_BUSY=true;syncRouteControls();setRouteHint('Building your route through all selected stops…');host.hidden=false;host.innerHTML='<p>Building your route along official DNR trails…</p>';
  const requestId=++ROUTE_REQUEST_ID,controller=new AbortController();ROUTE_ABORT=controller;const timer=setTimeout(()=>controller.abort(),20000);
  const points=ROUTE_POINTS.map(p=>`${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');
  try{
    const r=await fetch(`/api/snowmobile-route?region=${encodeURIComponent(DATA.key)}&points=${encodeURIComponent(points)}`,{signal:controller.signal});const j=await r.json();if(requestId!==ROUTE_REQUEST_ID)return;if(!r.ok)throw new Error(j.error||j.detail||String(r.status));
    host.innerHTML=(j.closureVerification===true?'':'<p><strong>Distance planning only.</strong> Current closure verification is unavailable. Confirm access with DNR before riding.</p>')+(DATA.season?.active===false?'<p><strong>Off-season:</strong> this is a future-trip plan, not permission to ride now.</p>':'')+routeResultHtml(j.route);
    if(j.route?.routable&&j.route.geometry?.coordinates?.length>1){const latlngs=j.route.geometry.coordinates.map(([lon,lat])=>[lat,lon]);ROUTE_LINE=L.polyline(latlngs,{color:ROUTE_MARK_COLOR,weight:6,opacity:.95,dashArray:'1 8',lineCap:'round',interactive:false}).addTo(MAP);try{MAP.fitBounds(ROUTE_LINE.getBounds(),{padding:[25,25]});}catch{}}
    ROUTE_BUSY=false;setRouteMode(false);setRouteHint(j.route?.routable?'Route built. Edit stops to adjust it, or Start over for a new route.':'These stops could not form a complete route. Edit stops or undo the last stop.');scrollRouteElement(host);track('snowmobile_route_computed',{region:DATA.key,routable:Boolean(j.route?.routable),stop_count:ROUTE_POINTS.length,miles:j.route?.distanceMiles??null});
  }catch(e){if(requestId!==ROUTE_REQUEST_ID)return;host.innerHTML=`<p><strong>Route unavailable.</strong> ${esc(e.name==='AbortError'?'The request timed out. Your stops are saved; choose Build route to retry.':e.message||'Please try again.')}</p>`;ROUTE_BUSY=false;setRouteMode(true);setRouteHint('Your stops are saved. Choose Build route to retry, or edit your stops.');track('snowmobile_route_error',{region:DATA.key,message:String(e.message||e).slice(0,120)});}
  finally{clearTimeout(timer);if(requestId===ROUTE_REQUEST_ID){ROUTE_ABORT=null;ROUTE_BUSY=false;syncRouteControls();}}
}
document.addEventListener('click',e=>{
  if(e.target?.id==='toggleSnowDepth')toggleSnowDepth();if(e.target?.id==='routeModeToggle')toggleRouteMode();if(e.target?.id==='clearRoute')clearRoute();if(e.target?.id==='buildRoute')computeRoute();if(e.target?.id==='undoRoute')undoRoute();if(e.target?.id==='editRoute')editRoute();
  if(e.target?.id==='checkDrive'){const v=$('#originPreset')?.value;if(v)checkOrigin(v,ORIGIN_NAMES[v]||'Selected origin')}
  if(e.target?.id==='useMyLocation'){
    const host=$('#personalDrive');if(!navigator.geolocation){if(host)host.textContent='Browser location is unavailable.'}
    else{if(host)host.textContent='Requesting your location…';navigator.geolocation.getCurrentPosition(pos=>checkOrigin(`${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`,'Your location'),()=>{if(host)host.textContent='Location was not shared. Choose a city instead.'},{enableHighAccuracy:false,timeout:10000,maximumAge:300000})}
  }
  const a=e.target?.closest?.('[data-source-name]');if(a)track('snowmobile_source_verify',{source:a.getAttribute('data-source-name')||'unknown'});
});
function inheritTrip(){
  const params=new URLSearchParams(window.location.search),origin=window.SnowmobileComparison.ORIGINS.find(o=>o.id===params.get('origin'));
  const max=params.get('maxDrive'),allowed=['2','3','4','6','10'];
  if(!origin)return;
  $('#originPreset').value=origin.point;
  if(allowed.includes(max))$('#maxDrive').value=max;
  checkOrigin(origin.point,origin.label);
}
async function load(){
  const key=window.SNOWMOBILE_REGION;
  try{const r=await fetch(`/api/snowmobile?region=${encodeURIComponent(key)}`);const payload=await r.json();if(!r.ok)throw new Error(payload.detail||payload.error||r.status);const d={...payload.region,season:payload.season,sources:payload.sources,generatedAt:payload.generatedAt,truthBoundary:payload.truthBoundary,operational:payload.operational};render(d);inheritTrip();}
  catch(e){$('#status').textContent='DATA UNAVAILABLE';$('#drive').innerHTML='<strong>No ride recommendation.</strong> Live source verification failed, so the page is not substituting guessed conditions.';updateRouteAvailability();setRouteHint('Trail route planning is unavailable while the source data cannot be loaded. Use the official DNR trail maps below.');const segHead=$('#segments'); if(segHead)segHead.innerHTML='<p>'+esc(e.message)+'</p>';}
}
load();