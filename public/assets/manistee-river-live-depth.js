(()=>{
'use strict';
const DATA=window.MANISTEE_FIELD_DATA;if(!DATA)return;
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt',"'":'&#39;','"':'&quot;'}[c]));
const fmt=(v,d=1)=>Number.isFinite(Number(v))?Number(v).toFixed(d):'—';
const conditionCache={promise:null};
const weatherCache=new Map();

function hav(a,b){const R=3958.7613,k=Math.PI/180,p1=a[0]*k,p2=b[0]*k,dp=(b[0]-a[0])*k,dl=(b[1]-a[1])*k;const q=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(q));}
function reach(id){return DATA.reaches.find(r=>r.id===id)||null;}
function waterway(id){return DATA.waterways.find(w=>w.id===id)||null;}
function sourceTrust(p){return {agency:'Agency coordinate','mapped-agency-site':'Agency facility · mapped coordinate','community-verified':'Identified community coordinate'}[p.confidence]||p.confidence;}
function typeLabel(type){return String(type||'access').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());}
function getConditions(){
  if(!conditionCache.promise)conditionCache.promise=fetch('/api/manistee-river-conditions').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).catch(e=>({error:e.message,gauges:[]}));
  return conditionCache.promise;
}
function getWeather(p){
  if(!weatherCache.has(p.id))weatherCache.set(p.id,fetch(`/api/manistee-river-weather?lat=${p.lat}&lon=${p.lon}`).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}).catch(e=>({error:e.message,hourly:[],forecast:[],alerts:[]})));
  return weatherCache.get(p.id);
}
function nearestGauge(p,gauges){
  const meta=DATA.gauges.filter(g=>!g.historic&&g.waterway===p.waterway);
  let best=null,bestD=Infinity;
  for(const m of meta){const d=hav([p.lat,p.lon],[m.lat,m.lon]);if(d<bestD){bestD=d;best=m;}}
  if(!best)return null;
  return {meta:best,reading:(gauges||[]).find(g=>g.id===best.id)||null,distance:bestD};
}
function freshness(g){
  if(!g?.measured_at)return 'No recent timestamp returned';
  if(g.fresh)return `Current · measured ${new Date(g.measured_at).toLocaleString()}`;
  return `Stale / verify · measured ${new Date(g.measured_at).toLocaleString()}`;
}
function metric(label,value,sub=''){return `<div class="mi-metric"><span>${esc(label)}</span><b>${esc(value)}</b>${sub?`<small>${esc(sub)}</small>`:''}</div>`;}
function currentGaugeHtml(match){
  if(!match)return '<p class="mi-muted">No active gauge is mapped to this waterway.</p>';
  const g=match.reading,s=g?.seasonal_stats||{},fc=g?.flow_context||{};
  if(!g)return `<p class="mi-muted">${esc(match.meta.name)} is the nearest mapped gauge (${match.distance.toFixed(1)} mi straight-line), but its live reading is unavailable.</p>`;
  const median=s.p50!=null?`${fmt(s.p50,0)} cfs`:null;
  const pct=fc.percent_of_median!=null?`${fc.percent_of_median}% of median`:fc.label||'Seasonal comparison unavailable';
  return `<div class="mi-gauge-head"><strong>${esc(match.meta.name)}</strong><span class="mi-fresh ${g.fresh?'yes':'no'}">${g.fresh?'Live':'Stale / unavailable'}</span></div>
    <p class="mi-source-line">Nearest mapped gauge on this waterway · ${match.distance.toFixed(1)} mi straight-line from the access. A gauge describes its own location, not the entire reach.</p>
    <div class="mi-metrics">
      ${metric('Flow',g.discharge_cfs!=null?`${fmt(g.discharge_cfs,0)} cfs`:'Not reported',pct)}
      ${metric('Seasonal median',median||'Unavailable','USGS daily p50 for this calendar date')}
      ${metric('Water',g.water_temp_f!=null?`${fmt(g.water_temp_f,1)}°F`:'Not reported',g.temperature_context?.label||'')}
      ${metric('Gage height',g.gage_height_ft!=null?`${fmt(g.gage_height_ft,2)} ft`:'Not reported')}
      ${metric('Turbidity',g.turbidity_fnu!=null?`${fmt(g.turbidity_fnu,1)} FNU`:'Not reported','Only shown when this USGS station reports it')}
      ${metric('Dissolved oxygen',g.dissolved_oxygen_mgl!=null?`${fmt(g.dissolved_oxygen_mgl,1)} mg/L`:'Not reported','Only shown when this USGS station reports it')}
    </div><p class="mi-source-line">${esc(freshness(g))} · <a href="${esc(match.meta.sourceUrl)}" target="_blank" rel="noopener">USGS station</a></p>`;
}
function weatherHtml(wx){
  if(wx?.error)return `<p class="mi-muted">NWS weather is unavailable right now. River and access information remain usable.</p>`;
  const now=wx?.hourly?.[0]||wx?.forecast?.[0]||null;
  const next=wx?.hourly?.slice(1,4)||[];
  const alertHtml=(wx?.alerts||[]).length?`<div class="mi-alerts"><strong>Active NWS alerts near this access</strong>${wx.alerts.slice(0,3).map(a=>`<div>${esc(a.event||'Weather alert')}${a.headline?` · ${esc(a.headline)}`:''}</div>`).join('')}</div>`:'<p class="mi-source-line">No active NWS alerts were returned for this point.</p>';
  if(!now)return '<p class="mi-muted">No NWS forecast period was returned.</p>';
  return `<div class="mi-metrics">
      ${metric('Air',now.temperature!=null?`${now.temperature}°${esc(now.temperatureUnit||'F')}`:'Not reported',now.shortForecast||'')}
      ${metric('Wind',`${now.windDirection||''} ${now.windSpeed||'Not reported'}`.trim())}
      ${metric('Precipitation',wx.precipitation_context?.max_probability!=null?`${wx.precipitation_context.max_probability}% max`:'Not reported',wx.precipitation_context?.label||'')}
    </div>
    ${next.length?`<div class="mi-hourly">${next.map(h=>`<span><b>${new Date(h.startTime).toLocaleTimeString([],{hour:'numeric'})}</b>${h.temperature!=null?` ${h.temperature}°${esc(h.temperatureUnit||'F')}`:''}<small>${esc(h.shortForecast||'')}</small></span>`).join('')}</div>`:''}
    ${alertHtml}<p class="mi-source-line">Nearby land-weather context from the National Weather Service. It does not measure river conditions or determine whether wading, paddling, boating or fishing is safe.</p>`;
}
function checklist(p){
  const out=[];
  if(p.activities.includes('fish'))out.push(`<a href="${esc(DATA.sources.regulationMap.url)}" target="_blank" rel="noopener">Verify the exact DNR fishing regulation for the reach</a>`);
  if(p.activities.includes('paddle'))out.push('Inspect the takeout before committing to a shuttle and use the river-network planner for channel mileage');
  if(p.activities.includes('camp'))out.push(`<a href="${esc(p.source.url)}" target="_blank" rel="noopener">Confirm current campground / site status with the managing source</a>`);
  if(p.waterway==='pine')out.push(`<a href="${esc(DATA.sources.forest.url)}" target="_blank" rel="noopener">Check current Forest Service Pine River permit and site requirements</a>`);
  if(p.type.includes('camp')||p.type.includes('access'))out.push('Expect local road, parking and carry conditions to change; the source link is authoritative for facility details');
  return [...new Set(out)].slice(0,5);
}
function baseFacts(p){
  const r=reach(p.reach),w=waterway(p.waterway);
  return `<div class="mi-metrics">
    ${metric('Access type',typeLabel(p.type))}
    ${metric('Water',w?.name||p.waterway,r?.name||'')}
    ${metric('Best for',p.activities.map(a=>a.replace(/\b\w/g,c=>c.toUpperCase())).join(' · '))}
    ${metric('Location trust',sourceTrust(p),p.locationSource||'')}
  </div>
  <p class="mi-reach"><strong>Reach context:</strong> ${esc(r?.summary||'No reach summary available.')}</p>`;
}
async function enrichSelected(){
  const id=decodeURIComponent(location.hash.slice(1));
  const p=DATA.places.find(x=>x.id===id),detail=$('#place-detail');
  if(!p||!detail||detail.querySelector(`[data-depth-for="${CSS.escape(id)}"]`))return;
  const section=document.createElement('section');section.className='manistee-intel';section.dataset.depthFor=id;
  section.innerHTML=`<div class="mi-eyebrow">Field intelligence</div><h3>Plan from this exact access</h3>${baseFacts(p)}
    <div class="mi-block"><h4>River right now</h4><div class="mi-loading">Loading USGS context…</div></div>
    <div class="mi-block"><h4>Weather near this access</h4><div class="mi-weather mi-loading">Loading NWS forecast and alerts…</div></div>
    <div class="mi-block"><h4>Before you go</h4><ul>${checklist(p).map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
  detail.appendChild(section);
  const [conditions,wx]=await Promise.all([getConditions(),getWeather(p)]);
  if(!section.isConnected)return;
  const blocks=section.querySelectorAll('.mi-block');
  blocks[0].querySelector('div').outerHTML=`<div>${conditions.error?'<p class="mi-muted">USGS context unavailable right now.</p>':currentGaugeHtml(nearestGauge(p,conditions.gauges))}</div>`;
  section.querySelector('.mi-weather').outerHTML=`<div class="mi-weather">${weatherHtml(wx)}</div>`;
}
function systemDepth(){
  const anchor=$('#conditions-source');if(!anchor||$('#manistee-system-depth'))return;
  const section=document.createElement('section');section.id='manistee-system-depth';section.className='manistee-system-depth';
  section.innerHTML='<div class="mi-eyebrow">Au Sable-depth context</div><h3>Seasonal flow + extra sensors</h3><p class="mi-muted">Loading approved USGS daily statistics and any extra sensors each station actually reports…</p>';
  anchor.insertAdjacentElement('afterend',section);
  getConditions().then(payload=>{
    if(payload.error){section.innerHTML='<div class="mi-eyebrow">Deeper context</div><p class="mi-muted">Seasonal USGS context is unavailable right now.</p>';return;}
    section.innerHTML=`<div class="mi-eyebrow">Deeper river context</div><h3>How today compares with this date historically</h3><p class="mi-source-line">Seasonal comparisons use approved USGS daily statistics. Turbidity and dissolved oxygen appear only at stations reporting those sensors.</p><div class="mi-system-grid">${payload.gauges.map(g=>{
      const meta=DATA.gauges.find(x=>x.id===g.id);const fc=g.flow_context||{};
      return `<article><strong>${esc(meta?.name||g.name)}</strong><span>${g.discharge_cfs!=null?`${fmt(g.discharge_cfs,0)} cfs`:'Flow not reported'}${fc.percent_of_median!=null?` · ${fc.percent_of_median}% median`:''}</span><small>${esc(fc.label||'Seasonal comparison unavailable')}</small><small>${g.turbidity_fnu!=null?`Turbidity ${fmt(g.turbidity_fnu,1)} FNU`:'Turbidity not reported'} · ${g.dissolved_oxygen_mgl!=null?`O₂ ${fmt(g.dissolved_oxygen_mgl,1)} mg/L`:'O₂ not reported'}</small></article>`;
    }).join('')}</div>`;
  });
}
function addLegend(){
  const wrap=$('.map-wrap');if(!wrap||$('#manistee-river-key'))return;
  const key=document.createElement('div');key.id='manistee-river-key';key.className='manistee-river-key';key.setAttribute('aria-label','Map key');
  key.innerHTML=`<strong>River key</strong>
    <span><i class="mi-line main"></i>Manistee mainstem</span>
    <span><i class="mi-line pine"></i>Pine / tributaries</span>
    <span><i class="mi-line companion"></i>Little Manistee companion</span>
    <span><i class="mi-dot access"></i>River access</span>
    <span><i class="mi-dot camp"></i>Camp / trail access</span>
    <span><i class="mi-dot gauge"></i>USGS gauge</span>
    <small>Lines: USGS NHD · points retain source confidence in their detail card</small>`;
  wrap.appendChild(key);
}
function addStyles(){
  if($('#manistee-depth-styles'))return;const s=document.createElement('style');s.id='manistee-depth-styles';
  s.textContent=`.manistee-river-key{position:absolute;z-index:690;left:14px;bottom:58px;background:rgba(255,255,255,.96);border:1px solid #cfd5d0;border-radius:10px;padding:10px 11px;width:190px;box-shadow:0 3px 12px rgba(0,0,0,.14);font:11px/1.25 Inter,system-ui,sans-serif;color:#35423d}.manistee-river-key strong{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px}.manistee-river-key span{display:flex;align-items:center;gap:7px;margin:5px 0}.manistee-river-key small{display:block;color:#79817d;border-top:1px solid #e8e8e4;margin-top:7px;padding-top:6px}.mi-line{display:inline-block;width:24px;height:0;border-top:4px solid #0d5c63}.mi-line.pine{border-color:#2f7d32}.mi-line.companion{border-color:#76558f;border-top-style:dashed}.mi-dot{width:10px;height:10px;border-radius:50%;display:inline-block;border:1px solid #fff;box-shadow:0 0 0 1px #aaa}.mi-dot.access{background:#c56b28}.mi-dot.camp{background:#5d7046}.mi-dot.gauge{background:#2764a8}.manistee-intel{margin-top:18px;padding-top:17px;border-top:2px solid #d6dfda}.manistee-intel h3,.manistee-system-depth h3{font-family:Georgia,serif;font-size:20px;font-weight:500;margin:4px 0 11px}.mi-eyebrow{font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:#a94f25;font-weight:800}.mi-block{border-top:1px solid #e8e4dc;padding-top:12px;margin-top:13px}.mi-block h4{font-size:12px;margin:0 0 8px;color:#25352e}.mi-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.mi-metric{background:#f3f5f2;border-radius:7px;padding:8px;min-width:0}.mi-metric span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#7a837f}.mi-metric b{display:block;font-size:13px;margin-top:2px;color:#23332c;overflow-wrap:anywhere}.mi-metric small,.mi-source-line,.mi-muted{display:block;font-size:9px;color:#737d78;line-height:1.45;margin-top:3px}.mi-reach{font-size:11px!important;background:#faf6eb;border-left:3px solid #a94f25;padding:8px 9px;color:#56615c!important}.mi-gauge-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px}.mi-fresh{font-size:8px;text-transform:uppercase;border-radius:999px;padding:3px 6px}.mi-fresh.yes{background:#e2f1e4;color:#236335}.mi-fresh.no{background:#eeeae4;color:#73675a}.mi-hourly{display:flex;gap:5px;overflow:auto;margin:8px 0}.mi-hourly span{min-width:82px;background:#f3f5f2;border-radius:6px;padding:6px;font-size:9px}.mi-hourly b,.mi-hourly small{display:block}.mi-alerts{background:#fff4dc;border:1px solid #e7d39e;border-radius:7px;padding:8px;font-size:9px;line-height:1.45;margin-top:7px}.mi-alerts strong{display:block;margin-bottom:4px}.mi-block ul{padding-left:17px;margin:5px 0}.mi-block li{font-size:10px;line-height:1.45;margin:5px 0}.manistee-system-depth{margin-top:14px;padding:13px;background:#f7f5ef;border:1px solid #dedbd1;border-radius:10px}.mi-system-grid{display:grid;gap:7px;margin-top:9px}.mi-system-grid article{background:#fff;border:1px solid #e2dfd6;border-radius:7px;padding:8px}.mi-system-grid strong,.mi-system-grid span,.mi-system-grid small{display:block}.mi-system-grid strong{font-size:11px}.mi-system-grid span{font-size:10px;margin-top:3px}.mi-system-grid small{font-size:9px;color:#737d78;margin-top:2px}@media(max-width:900px){.manistee-river-key{left:10px;bottom:48px;width:176px;max-height:178px;overflow:auto}.mi-metrics{grid-template-columns:1fr 1fr}}@media(max-width:480px){.manistee-river-key{font-size:10px;width:162px;bottom:44px}.manistee-river-key small{display:none}.mi-metrics{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}
function observeDetails(){const detail=$('#place-detail');if(!detail)return;const observer=new MutationObserver(()=>queueMicrotask(enrichSelected));observer.observe(detail,{childList:true,subtree:true});enrichSelected();}
function init(){addStyles();addLegend();observeDetails();systemDepth();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.ManisteeDepthTest={hav,nearestGauge};
})();
