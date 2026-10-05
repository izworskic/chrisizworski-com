(function(){
'use strict';
const comparison=window.SnowmobileComparison;
let BUNDLE=null,ORIGIN=null,DRIVES={},requestId=0;
const $=id=>document.getElementById(id);
function track(name,params={}){try{window.gtag?.('event',name,params)}catch{}}
function context(){return {active:!!BUNDLE?.season?.active,fresh:comparison.bundleFresh(BUNDLE),closuresVerified:BUNDLE?.statewide?.closuresVerified===true};}
function maxHours(){return Number($('compare-max-drive')?.value||3);}
function detailUrl(region){return comparison.detailUrl(region.key,ORIGIN?.id,maxHours());}
function driveLine(region){
  if(!ORIGIN)return'Choose a starting city to compare road times.';
  const d=DRIVES[region.key];
  if(!d)return'Road time: waiting for comparison';
  if(d.pending)return'Road time: checking…';
  if(!Number.isFinite(d.driveMinutes))return'Road time unavailable; no estimate substituted.';
  const h=Math.floor(d.driveMinutes/60),m=d.driveMinutes%60;
  return `${ORIGIN.label} to ${region.hubTown}: ${h?h+'h ':''}${m}m${Number.isFinite(d.driveMiles)?' · '+d.driveMiles+' miles':''} · ${d.driveMinutes<=maxHours()*60?'within your drive limit':'beyond your drive limit'}`;
}
function reportLine(region){
  if(!region.reports?.length)return'Local trail surface: no automated report available';
  return region.reports.map(r=>`${r.name}: ${r.condition||'condition unstated'} · report ${r.reportedAt?ago(r.reportedAt):'date unknown'} (${r.freshness||'UNKNOWN'})`).join(' · ');
}
function renderComparison(){
  if(!BUNDLE)return;
  const ctx=context(),rows=comparison.compare(BUNDLE.regions||[],ctx,DRIVES,maxHours(),$('compare-sort')?.value||'evidence');
  $('region-list').innerHTML=rows.map(({region,decision})=>regionCard(region,ctx.active,decision)).join('');
  const candidates=rows.filter(x=>x.decision.tripCandidate);
  const pending=Object.values(DRIVES).some(d=>d.pending);
  const summary=$('trip-summary');
  if(summary){
    summary.classList.toggle('candidate-summary',candidates.length>0);
    summary.textContent=!ctx.fresh?'Current evidence is unavailable or too old. No riding recommendation.':!ctx.active?'Pre-season planning: compare travel and explore local reports. Riding verdicts begin Dec. 1.':!ctx.closuresVerified?'Official closure verification is incomplete. No riding recommendation.':pending?'Comparing road times. Trail evidence stays separate from travel distance.':!ORIGIN?'Choose your starting city and drive limit. A short drive does not establish rideable trails.':candidates.length?`${candidates.length} stronger trip candidate${candidates.length===1?'':'s'} within your drive limit: ${candidates.map(x=>x.region.shortLabel).join(', ')}. Verify the local report and exact route before leaving.`:'No verified stronger trip candidate within your drive limit. Check borderline areas or current local reports before committing to the drive.';
  }
}
async function compareFrom(origin){
  ORIGIN=origin;const run=++requestId;DRIVES={};
  if(!BUNDLE){$('trip-summary').textContent='Region evidence is still loading. Try the comparison when it finishes.';return;}
  const regions=BUNDLE.regions||[];regions.forEach(r=>DRIVES[r.key]={pending:true});renderComparison();
  track('snowmobile_compare_start',{origin:origin.id||'browser-location',max_hours:maxHours()});
  let next=0;
  // Three route requests at a time; an old origin response cannot overwrite a new choice.
  await Promise.all(Array.from({length:Math.min(3,regions.length)},async()=>{
    while(next<regions.length&&run===requestId){
      const region=regions[next++];let result;
      try{
        const response=await fetch(`/api/snowmobile-drive?region=${encodeURIComponent(region.key)}&from=${encodeURIComponent(origin.point)}`,{signal:AbortSignal.timeout(12000)});
        result=await response.json();
        if(!response.ok||result.region!==region.key||!Number.isFinite(result.driveMinutes)||result.driveMinutes<0)throw new Error('No usable route');
      }catch{result={error:true};}
      if(run!==requestId)return;
      DRIVES[region.key]=result;renderComparison();
    }
  }));
  if(run===requestId)track('snowmobile_compare_complete',{origin:origin.id||'browser-location',routes_available:Object.values(DRIVES).filter(d=>Number.isFinite(d.driveMinutes)).length});
}
function setupComparison(){
  $('compare-origin').innerHTML='<option value="">Choose starting city</option>'+comparison.ORIGINS.map(o=>`<option value="${o.id}">${o.label}</option>`).join('');
  $('compare-form').addEventListener('submit',e=>{e.preventDefault();const origin=comparison.ORIGINS.find(o=>o.id===$('compare-origin').value);if(origin)compareFrom(origin);else $('trip-summary').textContent='Choose a starting city or use your location.';});
  $('compare-origin').addEventListener('change',()=>{++requestId;ORIGIN=null;DRIVES={};renderComparison();});
  $('compare-max-drive').addEventListener('change',renderComparison);
  $('compare-sort').addEventListener('change',renderComparison);
  $('compare-location').addEventListener('click',()=>{
    if(!navigator.geolocation){$('trip-summary').textContent='Browser location is unavailable. Choose a city instead.';return;}
    const locationRequest=++requestId;
    $('trip-summary').textContent='Requesting your location…';
    navigator.geolocation.getCurrentPosition(pos=>{if(locationRequest!==requestId)return;compareFrom({label:'Your location',point:`${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`});},()=>{if(locationRequest!==requestId)return;$('trip-summary').textContent='Location was not shared. Choose a city instead.';},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  });
  $('region-list').addEventListener('click',e=>{const link=e.target.closest('[data-region-open]');if(link)track('snowmobile_region_open',{region:link.dataset.regionOpen,placement:'statewide-comparison'});const source=e.target.closest('[data-source-name]');if(source)track('snowmobile_source_verify',{source:source.dataset.sourceName,placement:'statewide-comparison'});});
  setInterval(()=>{if(BUNDLE&&!comparison.bundleFresh(BUNDLE))renderComparison();},60000);
}

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
function regionCard(region,active,decision){
  const r=region.route||{},cls=bandClass(r.band),badge=badgeClass(r.band);
  let label='UNKNOWN';
  if(region.error)label='DATA UNAVAILABLE';
  else if(!active||r.band==='OFF_SEASON')label='OFF SEASON';
  else if(r.routeState==='ROUTE_BROKEN')label='CLOSED / ROUTE BROKEN';
  else if(['UNAVAILABLE','UNVERIFIED'].includes(decision?.state))label=decision.state==='UNAVAILABLE'?'DATA UNAVAILABLE':'CLOSURE CHECK INCOMPLETE';
  else if(Number.isFinite(r.score))label=`${r.band} · ${r.score}/100`;
  const conf=r.confidence!=null?`${r.confidence}% confidence`:'confidence unavailable';
  const age=evidenceAge(region);
  const evidence=region.hasClubEvidence?'Local surface report configured':'No current local surface-report feed configured';
  return `<article class="region-card ${esc(cls)}" data-region="${esc(region.key)}">
    <div>
      <div class="rc-head"><h2>${esc(region.shortLabel||region.label)}</h2><span class="region-badge ${esc(badge)}">${esc(label)}</span></div>
      <p class="rc-decision"><strong>${esc(decision?.label||'Verify local conditions')}</strong></p>
      <p class="rc-drive">${esc(driveLine(region))}</p>
      <p class="rc-verdict">${decision?.state==='UNAVAILABLE'?'Current evidence is unavailable or too old. No riding recommendation.':decision?.state==='UNVERIFIED'?'Official closure verification is incomplete. Check the official source before a trip.':verdictLine(region,active)}</p>
      <p class="rc-meta"><strong>${esc(bestLine(region,active))}</strong></p>
      <p class="rc-meta">${esc(snowLine(region))} · ${esc(thawLine(region))}</p>
      <p class="rc-meta">${esc(reportLine(region))}</p>
      <p class="rc-meta">Grooming: ${esc(region.grooming?.label||'unverified')}</p>
      <p class="rc-meta">${esc(conf)} · ${esc(evidence)}${age?` · supporting evidence ${esc(age)}`:''}</p>
      <details class="rc-planning"><summary>Local reports and staging</summary><p>${esc(region.planning?.note||'Road time ends at the hub; trailhead travel is additional.')}</p>${(region.planning?.reports||[]).map(source=>`<p><a href="${esc(source.url)}" target="_blank" rel="noopener" data-source-name="${esc(source.name)}">${esc(source.name)}</a><br>${esc(source.scope)}</p>`).join('')}<p>Read the report date before relying on its condition. These links are manual checks, not automated evidence for every trail.</p></details>
      <p class="rc-meta">${esc(region.segmentCount||0)} designated trail segments</p>
    </div>
    <a class="rc-cta" href="${esc(detailUrl(region))}" data-region-open="${esc(region.key)}">Check ${esc(region.shortLabel||region.label)} before driving →</a>
  </article>`;
}
function dotClassFor(region){const d=comparison.evaluate(region,context());return ['UNAVAILABLE','UNVERIFIED','UNKNOWN'].includes(d.state)?'unknown':bandClass(region.route&&region.route.band);}
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
    const r=await fetch('/api/snowmobile',{signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error(`API returned ${r.status}`);
    const data=await r.json();if(data.error)throw new Error(data.error);
    BUNDLE=data;
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
    renderComparison();
    if(sourceEl)sourceEl.innerHTML=(data.sources||[]).map(s=>`<li><strong>${esc(s.name)}</strong> — ${esc(s.authority||'')}</li>`).join('');
    if(generatedEl)generatedEl.textContent=`Statewide bundle generated ${new Date(data.generatedAt).toLocaleString()}. ${data.operational?.modelBoundary||''}`;
    drawMap(regions,active);
    $('compare-submit').disabled=false;
    $('compare-location').disabled=false;
  }catch(error){
    if($('trip-summary'))$('trip-summary').textContent='Live conditions did not load. Explore the regional pages and local sources below; no riding recommendation.';
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
    const scoreTxt=comparison.evaluate(region,context()).label;
    marker.bindPopup(`<strong>${esc(region.label)}</strong><br>${esc(scoreTxt)}<br>${esc(snowLine(region))}<br><a href="/snowmobile/regions/${esc(region.key)}.html">Check region →</a>`);
  }
}
document.addEventListener('DOMContentLoaded',()=>{setupComparison();boot();});
})();