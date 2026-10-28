/* Live, independently source-checked Agawa status.
   Written by scheduled GitHub Actions from official Ontario Parks sources.
   Old/missing data never implies open. Historical 2026 closure remains in the HTML. */
(() => {
  'use strict';
  const MAX_AGE_DAYS=8;
  const output=document.getElementById('agawa-auto-status');
  const card=document.querySelector('.card[data-id="agawa"]');
  if(!card||!output)return;
  const ageDays=day=>{
    const n=Date.parse(day+'T12:00:00Z');
    return Number.isFinite(n)?Math.max(0,(Date.now()-n)/86400000):Infinity;
  };
  const official='https://www.ontarioparks.ca/park/lakesuperior/alerts';
  function show(data){
    const valid=data&&data.schemaVersion===1&&typeof data.checkedAt==='string'&&ageDays(data.checkedAt)<=MAX_AGE_DAYS
      &&['closed','seasonal-review','no-current-closure-posted','open-confirmed'].includes(data.status)
      &&data.source?.alerts===official&&data.dayUse?.year>=2026;
    if(!valid){
      output.textContent='Seasonal access status is awaiting a fresh Ontario Parks check. The 2026 closure was documented; do not assume the trail is open. Please consult the official park alerts.';
      return;
    }
    const active=Boolean(data.currentDayUseActive);
    const eligible=active&&['no-current-closure-posted','open-confirmed'].includes(data.status);
    window.LSPP_DAY_USE_ACTIVE=active;
    window.LSPP_AGAWA_STATE=data.status;
    window.LSPP_AGAWA_BADGE=data.status==='open-confirmed'?'Reopening confirmed by Ontario Parks':
      data.status==='no-current-closure-posted'?'No current closure posted · verify access':
      data.status==='closed'?'Closed · Ontario Parks notice':'Off-season · reopening not verified';
    card.dataset.status=eligible?'unknown':'closed';
    card.querySelector('.badge')?.classList.toggle('closed',!eligible);
    const label=document.querySelector('#season option[value="current"]');
    const future=document.querySelector('#season option[value="future"]');
    if(label)label.textContent=active?data.dayUse.year+' published day-use season (check trail notices)':'Outside published day-use dates';
    if(future)future.textContent='Future park season (plan only; recheck access)';
    const story=document.getElementById('agawa-access-story');
    if(story){
      story.textContent=data.status==='open-confirmed'
        ? 'Ontario Parks has published an explicit reopening notice for this operating season. This remains a sacred cultural site with a rugged exposed trail; check weather and all current instructions before visiting.'
        : data.status==='no-current-closure-posted'
          ? 'The park has published its new day-use season and no Agawa closure for that season is listed in its current alerts. This is not explicit confirmation that the trail is open; check Ontario Parks before going.'
          : data.status==='seasonal-review'
            ? 'The 2026 seasonal closure is historical. A new operating season or confirmed reopening has not yet been established. Do not enter on the strength of old information.'
            : 'Ontario Parks currently lists a closure of the Agawa Rock Pictographs Trail. Please respect this sacred site and do not enter.';
    }
    const note=data.status==='open-confirmed'?'Official reopening notice found':
      data.status==='no-current-closure-posted'?'No current-season closure posted; opening not independently confirmed':
      data.status==='closed'?'Official closure notice active':'Outside published dates or new season not yet confirmed';
    output.replaceChildren();
    const strong=document.createElement('strong');strong.textContent=note+'. ';
    output.append(strong,document.createTextNode('Ontario Parks checked '+data.checkedAt+'. '));
    const a=document.createElement('a');a.href=official;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Read current park notices';
    output.append(a);
    window.dispatchEvent(new CustomEvent('lspp:official-season-change',{detail:{state:data.status,dayUseActive:active}}));
  }
  fetch('/assets/lspp-agawa-status.json',{cache:'no-store',credentials:'same-origin'})
    .then(response=>{if(!response.ok)throw Error('status missing');return response.json();})
    .then(show)
    .catch(()=>show(null));
})();