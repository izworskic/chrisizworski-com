const $=s=>document.querySelector(s);let DATA=null,MAP=null,LAYER=null,CLOSURE_LAYER=null,SNOW_LAYER=null;
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
 $('#sourceAge').textContent=new Date(d.generatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
 $('#drive').innerHTML=active?driveVerdict(d):'<strong>Not a riding verdict yet.</strong> This page is live now so Google and riders can discover it before winter; in-season condition scoring activates Dec. 1.';
 $('#seasonNote').hidden=active;
 renderSections(d);
 const segs=(d.segments||[]).sort((a,b)=>(a.score??999)-(b.score??999)).slice(0,10);
 $('#segments').innerHTML=segs.length?segs.map(s=>`<div class="segment"><div><span class="badge ${bandClass(s.band)}">${esc(s.band)}</span> <strong>${esc(s.trailNetwork||s.id)}</strong></div><div class="small">${esc(s.groomingSponsor||'Grooming sponsor not stated')} · ${s.miles?esc(s.miles.toFixed(1))+' mi':'length not stated'} · ${esc(s.surface||'surface unknown')}</div><div>${esc((s.reasons||[])[0]||'No condition explanation available.')}</div></div>`).join(''):'<p>No corridor segments returned.</p>';
 $('#reports').innerHTML=['grayling','gaylord'].map(k=>{const x=d.reports?.[k]; if(!x)return''; return `<div class="segment"><strong>${esc(x.name)}</strong><div>${esc(x.condition||'Condition not stated')}</div><div class="small">Report: ${esc(x.reportedRaw||'unknown')} · Grooming field: ${esc(x.lastGroomedRaw||'not verified')}</div><a href="${esc(x.url)}" target="_blank" rel="noopener">Verify source ↗</a></div>`}).join('');
 $('#sources').innerHTML=(d.sources||[]).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a> — ${esc(s.authority)}</li>`).join('');
 drawMap(d.scoredGeometry||d.geometry,d.closures);
}
function bestWindow(d){const b=d.timing?.best;if(!b)return'Weather window not verified';const when=b.name||new Date(b.startTime).toLocaleString();const t=Number.isFinite(b.maxTempF)?` · high ${Math.round(b.maxTempF)}°F`:'';return when+t}
function renderSections(d){
 const host=$('#corridorSections');if(!host)return;
 host.innerHTML=(d.sections||[]).map(s=>{const score=Number.isFinite(s.score)?`${s.score}/100`:'—';const state=s.band||s.routeState||'UNKNOWN';const critical=s.critical?.reasons?.[0]||(!d.season?.active?'Scoring activates Dec. 1.':'No dominant weakness found.');return `<article class="corridor-section"><span>${esc(s.label)}</span><strong class="${bandClass(state)}">${esc(state)}</strong><b>${score}</b><small>${esc(critical)}</small></article>`}).join('')||'<div class="corridor-section">No corridor summary available.</div>';
}
function risk(d){const c=d.route?.critical; if(c?.band==='CLOSED')return'Official closure on required segment'; if(c?.score<40)return'Weak required segment'; const wx=[d.weather?.grayling,d.weather?.gaylord].filter(Boolean); if(wx.some(x=>x.maxTempF>=40))return'Thaw'; if(wx.some(x=>x.rainIn>=.1))return'Rain-on-snow'; return'No dominant weather risk found';}
function driveVerdict(d){const s=d.route?.score,c=d.route?.confidence;if(d.route?.routeState==='ROUTE_BROKEN')return'<strong>NO.</strong> A required segment is officially closed.';if(!Number.isFinite(s))return'<strong>UNKNOWN.</strong> There is not enough verified evidence to call the trip.';if(c<50)return `<strong>UNCERTAIN.</strong> Conditions score ${s}, but evidence confidence is only ${c}. Verify club reports before leaving.`;if(s>=72)return `<strong>LIKELY WORTH IT.</strong> The corridor currently scores ${s}, with confidence ${c}. Check the weakest segment below before committing.`;if(s>=58)return `<strong>BORDERLINE.</strong> The route is usable on paper, but the weakest segment keeps this from being an easy long-drive recommendation.`;return '<strong>NOT YET.</strong> Current evidence does not support a long drive for this corridor.';}
function mapBandColor(b){return b==='CLOSED'?'#8a3028':b==='POOR'?'#a33b32':b==='MARGINAL'?'#b76b1c':b==='FAIR'?'#9b852f':b==='GOOD'?'#397a55':b==='EXCELLENT'?'#135f3a':'#7a847e'}
function drawMap(fc,closureState){
 if(!window.L||!fc)return;
 if(!MAP){MAP=L.map('map',{scrollWheelZoom:false}).setView([44.84,-84.68],9);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(MAP)}
 if(LAYER)LAYER.remove(); if(CLOSURE_LAYER)CLOSURE_LAYER.remove();
 LAYER=L.geoJSON(fc,{
   style:f=>{const p=f.properties||{};return {weight:p.band==='CLOSED'?7:5,opacity:.9,color:mapBandColor(p.band)}},
   onEachFeature:(f,l)=>{const p=f.properties||{};const title=p.trailNetwork||p.Trail_Netw||p.id||p.Unique_ID||'DNR trail segment';const band=p.band||'DNR DESIGNATED';const score=Number.isFinite(p.score)?` · ${p.score}/100`:'';const why=Array.isArray(p.reasons)&&p.reasons.length?`<br>${esc(p.reasons[0])}`:'';l.bindPopup(`<strong>${esc(title)}</strong><br>${esc(band)}${score}<br>${esc(p.groomingSponsor||p.Groom_Spon||'Grooming sponsor not stated')}${why}`)}
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
 if(SNOW_LAYER&&MAP.hasLayer(SNOW_LAYER)){MAP.removeLayer(SNOW_LAYER);btn.textContent='Show NOAA snow depth';btn.setAttribute('aria-pressed','false');return}
 if(!SNOW_LAYER){
   const base='https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer/export';
   const q=new URLSearchParams({bbox:'-84.86,44.55,-84.48,45.12',bboxSR:'4326',imageSR:'4326',size:'900,1100',format:'png32',transparent:'true',layers:'show:0',f:'image'});
   SNOW_LAYER=L.imageOverlay(base+'?'+q.toString(),[[44.55,-84.86],[45.12,-84.48]],{opacity:.48,interactive:false});
 }
 SNOW_LAYER.addTo(MAP);btn.textContent='Hide NOAA snow depth';btn.setAttribute('aria-pressed','true');SNOW_LAYER.bringToBack();
}
document.addEventListener('click',e=>{if(e.target?.id==='toggleSnowDepth')toggleSnowDepth()});
async function load(){try{const r=await fetch('/api/snowmobile');const d=await r.json();if(!r.ok)throw new Error(d.detail||d.error||r.status);render(d)}catch(e){$('#status').textContent='DATA UNAVAILABLE';$('#drive').innerHTML='<strong>No ride recommendation.</strong> Live source verification failed, so the page is not substituting guessed conditions.';$('#segments').innerHTML='<p>'+esc(e.message)+'</p>';}}
load();