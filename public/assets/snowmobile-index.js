(function(){
'use strict';
const esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bandClass=(band)=>{
  if(!band)return 'unknown';
  const b=String(band).toUpperCase();
  if(b==='EXCELLENT')return 'good';
  if(b==='GOOD')return 'good';
  if(b==='FAIR')return 'fair';
  if(b==='MARGINAL'||b==='POOR')return 'marginal';
  if(b==='CLOSED')return 'closed';
  return 'off-season';
};
const badgeClass=(band)=>{
  const c=bandClass(band);
  if(c==='good')return 'good';
  if(c==='fair'||c==='marginal')return 'warn';
  if(c==='closed')return 'bad';
  return '';
};
function verdictLine(region){
  if(region.error)return `Live data is unavailable for this region right now (${esc(region.error)}).`;
  if(!region.route||region.route.band==='OFF_SEASON'||region.route.score==null)return 'Off-season: outside the Dec 1 \u2013 Mar 31 window, so no ride score is generated yet. Trail and closure status below still reflect current DNR data.';
  const r=region.route;
  const critical=r.critical?`The limiting factor is ${esc(r.critical.trailNetwork||'an unnamed segment')} (${esc((r.critical.reasons||[]).join('; ')||'lowest-scoring segment on the route')}).`:'No single segment is dragging the route down right now.';
  const state={GO:'Ride it.',CAUTION:'Rideable with caution.',NO_GO:'Hold off.',CLOSED:'A required segment is officially closed.'}[r.routeState]||'';
  return `${state} Route score ${r.score}/100 (${esc(r.band)}). ${critical}`;
}
function regionCard(region){
  const cls=bandClass(region.route&&region.route.band);
  const badge=badgeClass(region.route&&region.route.band);
  const label=region.error?'DATA UNAVAILABLE':region.route&&region.route.score!=null?`${region.route.band} \u00b7 ${region.route.score}/100`:'OFF SEASON';
  const conf=region.route&&region.route.confidence!=null?`${region.route.confidence}% confidence`:null;
  const evidence=region.hasClubEvidence?'DNR + club reports + weather':'DNR trail status + weather (no local club source yet)';
  return `<div class="region-card" data-region="${esc(region.key)}">
    <div>
      <div class="rc-head"><h2>${esc(region.shortLabel||region.label)}</h2><span class="region-badge ${esc(badge)}">${esc(label)}</span></div>
      <p class="rc-verdict">${verdictLine(region)}</p>
      <p class="rc-meta">${esc(region.segmentCount||0)} designated segments &middot; ${conf?esc(conf)+' &middot; ':''}${esc(evidence)}</p>
    </div>
    <a class="rc-cta" href="/snowmobile/regions/${esc(region.key)}.html">View ${esc(region.shortLabel||region.label)} \u2192</a>
  </div>`;
}
function dotClassFor(region){return bandClass(region.route&&region.route.band);}
async function boot(){
  const statusEl=document.getElementById('load-status');
  const listEl=document.getElementById('region-list');
  const bannerEl=document.getElementById('season-banner');
  const scopeEl=document.getElementById('out-of-scope');
  const totalEl=document.getElementById('total-segments');
  try{
    const r=await fetch('/api/snowmobile');
    if(!r.ok)throw new Error(`API returned ${r.status}`);
    const data=await r.json();
    if(data.error)throw new Error(data.error);
    if(statusEl)statusEl.remove();
    if(bannerEl){
      bannerEl.classList.toggle('active',!!(data.season&&data.season.active));
      bannerEl.textContent=data.season&&data.season.active
        ?'In season (Dec 1 \u2013 Mar 31). Region cards below show a live ride score where DNR and weather data support one.'
        :'Off-season. DNR designated-trail status and closures are shown for planning, but no ride score is generated outside Dec 1 \u2013 Mar 31.';
    }
    if(scopeEl&&data.statewide)scopeEl.textContent=data.statewide.outOfScopeNote||'';
    if(totalEl&&data.statewide)totalEl.textContent=`${data.statewide.totalSegments.toLocaleString()} designated trail segments across ${data.statewide.regionCount} regions`;
    const regions=data.regions||[];
    if(listEl)listEl.innerHTML=regions.map(regionCard).join('')||'<p class="small">No region data returned.</p>';
    drawMap(regions);
  }catch(error){
    if(statusEl)statusEl.textContent=`Live data is unavailable right now (${error.message}). Please refresh in a moment.`;
    if(listEl)listEl.innerHTML='';
  }
}
function drawMap(regions){
  const el=document.getElementById('state-map');
  if(!el||typeof L==='undefined')return;
  const map=L.map(el,{scrollWheelZoom:false}).setView([44.9,-85.6],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  for(const region of regions){
    if(!region.hubLat||!region.hubLon)continue;
    const cls=dotClassFor(region);
    const color={good:'#1f6b46',fair:'#93641d',marginal:'#a45b20',closed:'#5f2c2a','off-season':'#9aa6a0',unknown:'#9aa6a0'}[cls]||'#9aa6a0';
    const marker=L.circleMarker([region.hubLat,region.hubLon],{radius:11,color,fillColor:color,fillOpacity:.85,weight:2}).addTo(map);
    const scoreTxt=region.route&&region.route.score!=null?`${region.route.band} \u00b7 ${region.route.score}/100`:region.error?'Data unavailable':'Off-season';
    marker.bindPopup(`<strong>${esc(region.label)}</strong><br>${esc(scoreTxt)}<br><a href="/snowmobile/regions/${esc(region.key)}.html">Open region \u2192</a>`);
  }
}
document.addEventListener('DOMContentLoaded',boot);
})();
