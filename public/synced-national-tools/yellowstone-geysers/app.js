const API='/api/yellowstone-geysers';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=iso=>iso?new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Denver',timeZoneName:'short'}).format(new Date(iso)):'—';
function windowText(p){
  if(!p?.available)return 'No current prediction';
  if(p.windowOpen&&p.windowClose)return `${fmt(p.windowOpen)} to ${fmt(p.windowClose)}`;
  return p.prediction?`Around ${fmt(p.prediction)}`:'No current prediction';
}
function renderCard(p){
  if(!p.available)return `<article class="card status" data-level="unknown"><span class="kicker">${esc(p.geyserName)}</span><h3>No current prediction</h3><p>Check Yellowstone or GeyserTimes again closer to your visit.</p></article>`;
  return `<article class="card status" data-level="workable"><span class="kicker">${esc(p.geyserName)}</span><h3>${esc(windowText(p))}</h3><p><strong>Source:</strong> ${esc(p.source||'GeyserTimes contributor')}</p><p class="small">Prediction record ${p.timestamp?`updated ${esc(fmt(p.timestamp))}`:'has no update timestamp shown'}.</p></article>`;
}
async function load(){
  try{
    const r=await fetch(`${API}?v=${Date.now()}`,{cache:'no-store'});
    const d=await r.json();
    if(!r.ok||!d.ok)throw new Error(d.error||`HTTP ${r.status}`);
    const next=d.next;
    const card=$('next-card');
    if(next){
      card.dataset.level='workable';
      $('next-name').textContent=next.geyserName;
      $('next-window').textContent=windowText(next);
      $('next-source').textContent=next.source||'GeyserTimes contributor';
      $('next-source-note').textContent=next.sourcePriority>=2?'This record appears to be NPS/Yellowstone-attributed in the source metadata.':'Source is shown exactly as provided by the current prediction record.';
    }else{
      card.dataset.level='unknown';
      $('next-name').textContent='No current prediction available';
      $('next-window').textContent='Check again closer to your visit or use the official Yellowstone geyser page.';
      $('next-source').textContent='—';
      $('next-source-note').textContent='No active prediction record was available.';
    }
    $('updated').textContent=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Denver',timeZoneName:'short'}).format(new Date(d.generatedAt));
    $('predictions').innerHTML=(d.predictions||[]).map(renderCard).join('');
    $('loading').textContent='Current prediction feed loaded. Times shown in Mountain Time.';
  }catch(err){
    $('next-card').dataset.level='unknown';
    $('next-name').textContent='Prediction feed unavailable';
    $('next-window').textContent='Use the official Yellowstone geyser activity page before planning around an eruption.';
    $('predictions').innerHTML='<div class="card"><strong>Current prediction records are temporarily unavailable.</strong></div>';
    $('loading').textContent=`Live data error: ${err.message}`;
  }
}
load();
