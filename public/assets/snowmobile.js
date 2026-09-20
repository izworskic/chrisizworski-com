const $=s=>document.querySelector(s);let DATA=null,MAP=null,LAYER=null;
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
 const segs=(d.segments||[]).sort((a,b)=>(a.score??999)-(b.score??999)).slice(0,10);
 $('#segments').innerHTML=segs.length?segs.map(s=>`<div class="segment"><div><span class="badge ${bandClass(s.band)}">${esc(s.band)}</span> <strong>${esc(s.trailNetwork||s.id)}</strong></div><div class="small">${esc(s.groomingSponsor||'Grooming sponsor not stated')} · ${s.miles?esc(s.miles.toFixed(1))+' mi':'length not stated'} · ${esc(s.surface||'surface unknown')}</div><div>${esc((s.reasons||[])[0]||'No condition explanation available.')}</div></div>`).join(''):'<p>No corridor segments returned.</p>';
 $('#reports').innerHTML=['grayling','gaylord'].map(k=>{const x=d.reports?.[k]; if(!x)return''; return `<div class="segment"><strong>${esc(x.name)}</strong><div>${esc(x.condition||'Condition not stated')}</div><div class="small">Report: ${esc(x.reportedRaw||'unknown')} · Grooming field: ${esc(x.lastGroomedRaw||'not verified')}</div><a href="${esc(x.url)}" target="_blank" rel="noopener">Verify source ↗</a></div>`}).join('');
 $('#sources').innerHTML=(d.sources||[]).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a> — ${esc(s.authority)}</li>`).join('');
 drawMap(d.geometry);
}
function bestWindow(d){const w=d.weather||{};const temps=[w.grayling?.maxTempF,w.gaylord?.maxTempF].filter(Number.isFinite);if(!temps.length)return'Weather window not verified';const hi=Math.max(...temps);return hi<=32?'Cold holds through near-term forecast':hi<38?'Earlier/colder periods favored':'Thaw risk present';}
function risk(d){const c=d.route?.critical; if(c?.band==='CLOSED')return'Official closure on required segment'; if(c?.score<40)return'Weak required segment'; const wx=[d.weather?.grayling,d.weather?.gaylord].filter(Boolean); if(wx.some(x=>x.maxTempF>=40))return'Thaw'; if(wx.some(x=>x.rainIn>=.1))return'Rain-on-snow'; return'No dominant weather risk found';}
function driveVerdict(d){const s=d.route?.score,c=d.route?.confidence;if(d.route?.routeState==='ROUTE_BROKEN')return'<strong>NO.</strong> A required segment is officially closed.';if(!Number.isFinite(s))return'<strong>UNKNOWN.</strong> There is not enough verified evidence to call the trip.';if(c<50)return `<strong>UNCERTAIN.</strong> Conditions score ${s}, but evidence confidence is only ${c}. Verify club reports before leaving.`;if(s>=72)return `<strong>LIKELY WORTH IT.</strong> The corridor currently scores ${s}, with confidence ${c}. Check the weakest segment below before committing.`;if(s>=58)return `<strong>BORDERLINE.</strong> The route is usable on paper, but the weakest segment keeps this from being an easy long-drive recommendation.`;return '<strong>NOT YET.</strong> Current evidence does not support a long drive for this corridor.';}
function drawMap(fc){if(!window.L||!fc)return;if(!MAP){MAP=L.map('map',{scrollWheelZoom:false}).setView([44.84,-84.68],9);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(MAP)}if(LAYER)LAYER.remove();LAYER=L.geoJSON(fc,{style:f=>({weight:4,opacity:.85}),onEachFeature:(f,l)=>{const p=f.properties||{};l.bindPopup(`<strong>${esc(p.Trail_Netw||p.Unique_ID||'DNR trail segment')}</strong><br>${esc(p.Groom_Spon||'Sponsor not stated')}<br>${esc(p.Status||'Official status field not stated')}`)}}).addTo(MAP);try{MAP.fitBounds(LAYER.getBounds(),{padding:[15,15]})}catch{}}
async function load(){try{const r=await fetch('/api/snowmobile');const d=await r.json();if(!r.ok)throw new Error(d.detail||d.error||r.status);render(d)}catch(e){$('#status').textContent='DATA UNAVAILABLE';$('#drive').innerHTML='<strong>No ride recommendation.</strong> Live source verification failed, so the page is not substituting guessed conditions.';$('#segments').innerHTML='<p>'+esc(e.message)+'</p>';}}
load();