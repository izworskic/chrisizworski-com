const API='/api/trail-ridge-road';
const $=id=>document.getElementById(id);
const fmtHour=iso=>new Intl.DateTimeFormat('en-US',{weekday:'short',hour:'numeric',timeZoneName:'short'}).format(new Date(iso));
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function setStatus(card,labelEl,detailEl,level,label,detail){
  card.dataset.level=level||'unknown';
  labelEl.textContent=label||'Unavailable';
  detailEl.textContent=detail||'';
}
function wind(period){return [period.windSpeed,period.windDirection].filter(Boolean).join(' ')}
function renderHours(periods=[]){
  const root=$('hours');
  if(!periods.length){root.innerHTML='<div class="row"><div><strong>Hourly alpine forecast unavailable</strong><div class="small">Use NPS road status and NWS Boulder before travel.</div></div></div>';return;}
  root.innerHTML=periods.map(p=>`<div class="row"><div><strong>${esc(fmtHour(p.startTime))}</strong><div class="small">${esc(p.shortForecast||'')}</div></div><div><span class="small">Temperature</span><strong>${esc(p.temperature)}°${esc(p.temperatureUnit||'F')}</strong></div><div><span class="small">Wind</span><strong>${esc(wind(p)||'—')}</strong></div><div><span class="small">Precip.</span><strong>${Number.isFinite(Number(p?.probabilityOfPrecipitation?.value))?`${Number(p.probabilityOfPrecipitation.value)}%`:'—'}</strong></div></div>`).join('');
}
async function load(){
  try{
    const r=await fetch(`${API}?v=${Date.now()}`,{cache:'no-store'});
    const d=await r.json();
    if(!r.ok||!d.ok)throw new Error(d.error||`HTTP ${r.status}`);
    setStatus($('road-card'),$('road-label'),$('road-detail'),d.road?.level,d.road?.label,d.road?.sourceTextMatched?'Parsed from the current Rocky Mountain National Park road-status page.':'The current NPS page loaded, but the Trail Ridge status sentence did not match the known status patterns. Confirm directly with NPS.');
    const wa=d.alpine?.weather?.assessment||{};
    setStatus($('weather-card'),$('weather-label'),$('weather-detail'),wa.level,wa.label,wa.detail);
    renderHours(d.alpine?.weather?.periods||[]);
    $('timed-entry').textContent=d.road?.timedEntry||'No timed-entry sentence was parsed from the current NPS road-status page. Check the official park page before arrival.';
    $('loading').textContent=`Updated ${new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(d.generatedAt))}.`;
  }catch(err){
    setStatus($('road-card'),$('road-label'),$('road-detail'),'unknown','Live road status unavailable','Use the official RMNP road-status page or recorded road-status line before driving up.');
    setStatus($('weather-card'),$('weather-label'),$('weather-detail'),'unknown','Alpine weather unavailable','Use NWS Boulder for the current high-elevation forecast.');
    renderHours([]);
    $('loading').textContent=`Live data error: ${err.message}`;
  }
}
load();
