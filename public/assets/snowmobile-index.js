(function(){
'use strict';
const esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bandClass=(band)=>{
  if(!band)return 'unknown';
  const b=String(band).toUpperCase();
  if(b==='EXCELLENT'||b==='GOOD')return 'good';
  if(b==='FAIR')return 'fair';
  if(b==='MARGINAL'||b==='POOR')return 'marginal';
  if(b==='CLOSED')return 'closed';
  return 'off-season';
};
const badgeClass=(band)=>{const c=bandClass(band);if(c==='good')return'good';if(c==='fair'||c==='marginal')return'warn';if(c==='closed')return'bad';return'';};
function ago(iso){
  if(!iso)return null;const ms=Date.now()-Date.parse(iso);if(!Number.isFinite(ms))return null;
  const min=Math.max(0,Math.round(ms/60000));if(min<2)return'just now';if(min<60)return`${min}m ago`;const h=Math.round(min/60);if(h<48)return`${h}h ago`;return`${Math.round(h/24)}d ago`;
}
function evidenceAge(region){
  const a=region.surfaceEvidence?.recentWeather?.latestAt,b=region.surfaceEvidence?.observedSnow?.latestAt;
  const vals=[a,b].filter(Boolean).sort((x,y)=>Date.parse(y)-Date.parse(x));return vals.length?ago(vals[0]):null;
}
function snowLine(region){
  const s=region.surfaceEvidence?.observedSnow;
  if(!s?.available)return'Observed snowfall: unavailable';
  if(Number.isFinite(s.largest48hInches))return`Fresh snow report: up to ${s.largest48hInches.toFixed(1).replace(/\.0$/,'')}″ in a report timestamped within 48h`;
  if(Number.isFinite(s.largest168hInches))return`Recent snow report: up to ${s.largest168hInches.toFixed(1).replace(/\.0$/,'')}″ in a report timestamped within 7d`;
  return'No NWS snowfall report timestamped in this region in the last 7 days';
}
function thawLine(region){
  const w=region.surfaceEvidence?.recentWeather;
  if(!w?.available)return'Recent thaw/rain: unverified';
  if(w.rainObserved)return'Recent thaw/rain: rain or icing observed';
  if(w.thawRisk==='HIGH')return'Recent thaw risk: high';
  if(w.thawRisk==='MODERATE')return'Recent thaw risk: moderate';
  if(w.thawRisk==='LOW')return'Recent thaw risk: low';
  return'Recent thaw/rain: unknown';
}
function bestLine(region,active){
  if(!active)return'Best time: riding verdicts activate Dec. 1';
  const b=region.bestWeatherWindow;if(!b)return'Best time: forecast window unavailable';
  const suffix=Number.isFinite(region.route?.score)?'':' (weather only; trail surface unverified)';
  return `Best weather window: ${esc(b.name||'next favorable period')}${suffix}`;
}
function verdictLine(region,active){
  if(region.error)return `Live data is unavailable for this region right now (${esc(region.error)}).`;
  const r=region.route;
  if(!active||r?.band==='OFF_SEASON')return'Off-season: no ride-quality recommendation is generated outside Dec. 1–Mar. 31.';
  if(r?.routeState==='ROUTE_BROKEN')return'A required trail segment matches an official DNR closure. Do not treat the rest of the region as a usable through-route.';
  if(!r||!Number.isFinite(r.score))return'CONDITION UNKNOWN. Legal trail status, snow and weather are context only; a current local trail-surface report is missing or too old to justify a long-drive recommendation.';
  const critical=r.critical?` Limiting factor: ${esc(r.critical.trailNetwork||'a required segment')} — ${esc((r.critical.reasons||[])[0]||'lowest-scoring segment')}.`:'';
  if(r.score>=72)return`Conditions are strong enough to investigate as a trip target, with ${r.confidence}% evidence confidence.${critical}`;
  if(r.score>=58)return`Borderline for a long drive. Current evidence supports riding, but not an easy weekend recommendation.${critical}`;
  return`Current evidence does not support targeting this region for a long drive.${critical}`;
}
function regionCard(region,active){
  const r=region.route||{},cls=bandClass(r.band),badge=badgeClass(r.band);
  let label='UNKNOWN';
  if(region.error)label='DATA UNAVAILABLE';
  else if(!active||r.band==='OFF_SEASON')label='OFF SEASON';
  else if(r.routeState==='ROUTE_BROKEN')label='CLOSED / ROUTE BROKEN';
  else if(Number.isFinite(r.score))label=`${r.band} · ${r.score}/100`;
  const conf=r.confidence!=null?`${r.confidence}% confidence`:'confidence unavailable';
  const age=evidenceAge(region);
  const evidence=region.hasClubEvidence?'Local surface report configured':'No current local surface-report feed configured';
  return `<article class="region-card ${esc(cls)}" data-region="${esc(region.key)}">
    <div>
      <div class="rc-head"><h2>${esc(region.shortLabel||region.label)}</h2><span class="region-badge ${esc(badge)}">${esc(label)}</span></div>
      <p class="rc-verdict">${verdictLine(region,active)}</p>
      <p class="rc-meta"><strong>${esc(bestLine(region,active))}</strong></p>
      <p class="rc-meta">${esc(snowLine(region))} · ${esc(thawLine(region))}</p>
      <p class="rc-meta">${esc(conf)} · ${esc(evidence)}${age?` · supporting evidence ${esc(age)}`:''}</p>
      <p class="rc-meta">${esc(region.segmentCount||0)} designated trail segments</p>
    </div>
    <a class="rc-cta" href="/snowmobile/regions/${esc(region.key)}.html">Check ${esc(region.shortLabel||region.label)} before driving →</a>
  </article>`;
}
function dotClassFor(region){return bandClass(region.route&&region.route.band);}
function sortRegions(regions,active){
  if(!active)return regions;
  return [...regions].sort((a,b)=>{
    const as=Number.isFinite(a.route?.score)?a.route.score:-1,bs=Number.isFinite(b.route?.score)?b.route.score:-1;
    if(bs!==as)return bs-as;
    return (b.route?.confidence||0)-(a.route?.confidence||0);
  });
}
async function boot(){
  const statusEl=document.getElementById('load-status');
  const listEl=document.getElementById('region-list');
  const bannerEl=document.getElementById('season-banner');
  const scopeEl=document.getElementById('out-of-scope-note');
  const totalEl=document.getElementById('total-segments');
  const sourceEl=document.getElementById('source-list');
  const generatedEl=document.getElementById('generated-at');
  try{
    const r=await fetch('/api/snowmobile');if(!r.ok)throw new Error(`API returned ${r.status}`);
    const data=await r.json();if(data.error)throw new Error(data.error);
    if(statusEl)statusEl.remove();
    const active=!!data.season?.active;
    if(bannerEl){
      bannerEl.classList.toggle('active',active);
      const rankable=Number(data.statewide?.rankableRegionCount||0);
      bannerEl.textContent=active
        ?`${rankable} of ${data.statewide?.regionCount||7} regions currently have enough verified surface evidence to be ranked for a long-drive decision. UNKNOWN regions stay unranked until better evidence arrives.`
        :'Pre-season mode. Trail/closure, snow and weather feeds remain connected, but no ride-quality score is generated before Dec. 1.';
    }
    if(scopeEl&&data.statewide)scopeEl.textContent=data.statewide.outOfScopeNote||'';
    if(totalEl&&data.statewide)totalEl.textContent=`${Number(data.statewide.totalSegments||0).toLocaleString()} designated trail segments across ${data.statewide.regionCount} regions`;
    const regions=sortRegions(data.regions||[],active);
    if(listEl)listEl.innerHTML=regions.map(x=>regionCard(x,active)).join('')||'<p class="small">No region data returned.</p>';
    if(sourceEl)sourceEl.innerHTML=(data.sources||[]).map(s=>`<li><strong>${esc(s.name)}</strong> — ${esc(s.authority||'')}</li>`).join('');
    if(generatedEl)generatedEl.textContent=`Statewide bundle generated ${new Date(data.generatedAt).toLocaleString()}. ${data.operational?.modelBoundary||''}`;
    drawMap(regions,active);
  }catch(error){
    if(statusEl)statusEl.textContent=`Live data is unavailable right now (${error.message}). Please refresh in a moment.`;
    if(listEl)listEl.innerHTML='<div class="panel"><strong>No trip recommendation.</strong><p class="small">The statewide evidence bundle did not load, so conditions were not guessed.</p></div>';
  }
}
function drawMap(regions,active){
  const el=document.getElementById('state-map');if(!el||typeof L==='undefined')return;
  const map=L.map(el,{scrollWheelZoom:false}).setView([44.9,-85.6],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  for(const region of regions){
    if(!region.hubLat||!region.hubLon)continue;
    const cls=dotClassFor(region);
    const color={good:'#1f6b46',fair:'#93641d',marginal:'#a45b20',closed:'#5f2c2a','off-season':'#9aa6a0',unknown:'#9aa6a0'}[cls]||'#9aa6a0';
    const marker=L.circleMarker([region.hubLat,region.hubLon],{radius:11,color,fillColor:color,fillOpacity:.85,weight:2}).addTo(map);
    const scoreTxt=!active?'Off-season':region.route?.routeState==='ROUTE_BROKEN'?'Official closure matched':Number.isFinite(region.route?.score)?`${region.route.band} · ${region.route.score}/100`:'Condition unknown';
    marker.bindPopup(`<strong>${esc(region.label)}</strong><br>${esc(scoreTxt)}<br>${esc(snowLine(region))}<br><a href="/snowmobile/regions/${esc(region.key)}.html">Check region →</a>`);
  }
}
document.addEventListener('DOMContentLoaded',boot);
})();