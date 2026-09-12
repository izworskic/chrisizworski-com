const API='/api/yosemite-firefall';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prettyDate=value=>{if(!value)return '—';const d=new Date(`${value}T12:00:00-08:00`);return new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',weekday:'short',month:'short',day:'numeric'}).format(d)};
const pct=value=>value==null?'—':`${Math.round(value)}%`;
const title=value=>value?String(value).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'—';
const daysUntil=value=>{if(!value)return null;const target=new Date(`${value}T00:00:00-08:00`);const diff=Math.ceil((target-Date.now())/86400000);return diff>0?diff:null};
let snapshot=null;
function renderDecision(day){if(!day)return;document.querySelectorAll('.day').forEach(el=>el.classList.toggle('active',el.dataset.date===day.date));$('best-date').textContent=prettyDate(day.date);$('peak-time').textContent=day.peakStart&&day.peakEnd?`${day.peakStart}–${day.peakEnd}`:'—';$('arrival-time').textContent=day.arrivalBy||'—';$('sunset-time').textContent=day.sunset||'—';$('confidence').textContent=`Confidence ${title(day.confidence)}`;$('why').textContent=day.why||'Signal explanation unavailable.';$('water').textContent=title(day.flowIndex);$('water-detail').textContent=day.flowScore==null?'Source-water confidence unavailable':`${day.flowScore}% modeled source-water signal`;$('sky').textContent=pct(day.cloudOpen);$('sky-detail').textContent=day.cloudBasis==='goes-nowcast'?`GOES nowcast${day.cloudTrend&&day.cloudTrend!=='unknown'?` · ${day.cloudTrend}`:''}`:title(day.cloudBasis);$('geometry').textContent=pct(day.geometry);$('clarity').textContent=pct(day.clarity)}
function renderHeadline(data){
  const day=data.headline||data.bestDay||data.days?.[0];
  const decision=$('decision');
  const badge=$('mode-badge');
  const currentEyebrow=$('current-eyebrow');
  const currentTitle=$('current-title');
  const weekEyebrow=$('week-eyebrow');
  const weekTitle=$('week-title');
  const weekNote=$('week-note');
  if(data.mode==='season'&&day?.probability!=null){
    decision.innerHTML=`<div class="decision-label">${esc(prettyDate(day.date))} FIREFALL CHANCE</div><div class="decision-value">${esc(day.probability)}%</div><div class="decision-sub">${esc(title(day.confidence))} confidence · peak ${esc(day.peakStart||'—')}–${esc(day.peakEnd||'—')}</div>`;
    if(badge){badge.textContent='IN SEASON — LIVE';badge.className='mode-badge live'}
    if(currentEyebrow)currentEyebrow.textContent='THE DECISION';
    if(currentTitle)currentTitle.textContent='Best current Firefall attempt';
    if(weekEyebrow)weekEyebrow.textContent='COMPARE BEFORE YOU DRIVE';
    if(weekTitle)weekTitle.textContent='Compare upcoming evenings';
    if(weekNote)weekNote.textContent='';
  }else{
    const opensIn=daysUntil(data.days?.[0]?.date);
    const closed=data.mode==='postseason';
    decision.innerHTML=`<div class="decision-label">${esc(data.seasonYear)} SEASON</div><div class="decision-value">OFF SEASON</div><div class="decision-sub">${closed?'This year\u2019s window has closed.':'Firefall only happens in a short mid-to-late February window.'}${opensIn?` The next window opens in about ${opensIn} day${opensIn===1?'':'s'}.`:''} Solar geometry for that week is fixed years in advance and shown below now; live water and sky readings phase in as the date gets close.</div>`;
    if(badge){badge.textContent='OFF SEASON';badge.className='mode-badge off'}
    if(currentEyebrow)currentEyebrow.textContent='OPENING NIGHT PREVIEW';
    if(currentTitle)currentTitle.textContent=`Best case for the ${esc(data.seasonYear)} opening week`;
    if(weekEyebrow)weekEyebrow.textContent='GEOMETRY ONLY, FOR NOW';
    if(weekTitle)weekTitle.textContent=`First look at ${esc(data.seasonYear)} geometry`;
    if(weekNote)weekNote.textContent='These cards use fixed solar geometry, known years in advance. Cloud and water-flow figures are seasonal placeholders and will start reflecting live forecasts as the window approaches.';
  }
  $('generated').textContent=`Engine updated ${new Date(data.generatedAt).toLocaleString()} · ${data.methodologyVersion}`
}
function renderDays(data){const days=data.days||[];$('days').innerHTML=days.map((day,i)=>`<button class="day ${i===0?'active':''}" type="button" data-date="${esc(day.date)}"><b>${esc(day.label)} · ${esc(prettyDate(day.date).replace(/^\w+,?\s*/,''))}</b><span class="pct">${day.probability==null?(day.geometry?`${esc(day.geometry)}% geom.`:'—'):`${esc(day.probability)}%`}</span><small>${esc(title(day.flowIndex))} water · ${day.cloudOpen==null?'sky —':`${esc(day.cloudOpen)}% sky`}</small></button>`).join('');document.querySelectorAll('.day').forEach(el=>el.addEventListener('click',()=>{const day=days.find(d=>d.date===el.dataset.date);if(day)renderDecision(day)}));renderDecision(data.headline||data.bestDay||days[0])}
function renderTrips(data){const windows=data.tripWindows||[];const section=$('trip-section');if(!windows.length){if(data.mode!=='season'){section.hidden=false;$('trip-windows').innerHTML=`<p class="section-copy">Multi-night trip odds need a live forecast and will appear once the ${esc(data.seasonYear)} window opens.</p>`}else{section.hidden=true}return}section.hidden=false;$('trip-windows').innerHTML=windows.map(w=>`<article><span>${esc(w.nights)} night${w.nights===1?'':'s'} · ${esc(prettyDate(w.startDate))}${w.endDate!==w.startDate?`–${esc(prettyDate(w.endDate))}`:''}</span><strong>${esc(w.probability)}%</strong><small>chance of at least one modeled success · best ${esc(prettyDate(w.bestDate))}</small></article>`).join('')}
function renderSources(data){$('sources').innerHTML=(data.sources||[]).map(source=>`<article class="source"><div class="source-top"><b>${esc(source.source)}</b><span class="freshness ${esc(source.freshness)}">${esc(source.freshness)}</span></div><small>${source.observedAt?`Observed ${esc(new Date(source.observedAt).toLocaleString())}`:`Fetched ${esc(new Date(source.fetchedAt).toLocaleString())}`}${source.note?` · ${esc(source.note)}`:''}</small></article>`).join('')}
function renderAccess(data){$('access-status').textContent=data.accessStatus||'Verify current National Park Service guidance before travel.';$('alerts').innerHTML=(data.alerts||[]).map(a=>`<div class="alert">${esc(a)}</div>`).join('');$('method-version').textContent=`Independent experimental decision support · ${data.methodologyVersion}. Probabilities are not guarantees; missing critical data reduces confidence rather than becoming a fake zero.`}
async function load(){try{const response=await fetch(API,{headers:{accept:'application/json'}});if(!response.ok)throw new Error(`Engine returned ${response.status}`);snapshot=await response.json();renderHeadline(snapshot);renderDays(snapshot);renderTrips(snapshot);renderSources(snapshot);renderAccess(snapshot)}catch(error){$('generated').innerHTML=`<span class="error">Live engine unavailable: ${esc(error.message)}</span>`;$('decision').innerHTML='<div class="decision-label">DATA STATUS</div><div class="decision-value">—</div><div class="decision-sub">The page will not invent a Firefall probability while upstream data are unavailable.</div>';$('why').textContent='Live decision data could not be loaded. Use the official NPS guidance below for access planning and check back for the modeled outlook.'}}
load();
