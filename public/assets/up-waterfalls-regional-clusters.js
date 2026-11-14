/* U.P. waterfall regional day planners, one fail-closed adapter for two distinct access situations.
   Dates and source records DO NOT certify live trail openings. This file never builds routes to GIS points. */
(function () {
  'use strict';
  const PRESETS = Object.freeze({
    'keweenaw-parks': Object.freeze(['eagle-river-falls','haven-falls']),
    'keweenaw-gorge': Object.freeze(['eagle-river-falls','haven-falls','manganese-falls']),
    'black-river-one': Object.freeze(['great-conglomerate-falls']),
    'black-river-corridor': Object.freeze(['great-conglomerate-falls','potawatomi-falls','gorge-falls','rainbow-falls'])
  });
  const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const RESTRICTED = new Set(['potawatomi-falls','gorge-falls','rainbow-falls']);
  function datePolicy(value) {
    if (!value) return { valid:true, dated:false, snow:false, message:'Choose your travel date to see the seasonal planning caution. This is not an open-now report.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { valid:false, dated:false, snow:false, message:'Enter a real travel date in the waterfall planner.' };
    const [y,m,d] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(y,m-1,d));
    if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m-1 || parsed.getUTCDate() !== d)
      return { valid:false, dated:false, snow:false, message:'Enter a real travel date in the waterfall planner.' };
    return { valid:true, dated:true, snow:m===12||m<=3, message:'Road maintenance, parking availability, construction and trail conditions are not checked in real time.' };
  }
  function legacyAssess(key,cards,selected,date) {
    const ids=PRESETS[key],policy=datePolicy(date);
    if (!ids) return {ok:false,reason:'Unknown regional day plan.',missing:[]};
    if (!policy.valid) return {ok:false,reason:policy.message,missing:[]};
    if ((key==='keweenaw-gorge'||key==='black-river-corridor')&&!policy.dated)
      return {ok:false,reason:'Set a visit date in the planner before saving the more demanding trip.',missing:[]};
    if (policy.snow&&(key==='keweenaw-gorge'||key==='black-river-corridor'))
      return {ok:false,reason:'Winter precaution: the roadside approach or waterfall trails are not confirmed safe or drivable for this extended plan. The area is not being declared legally closed.',missing:[]};
    if (!cards||typeof cards.get!=='function') return {ok:false,reason:'Visitor-guide cards are unavailable.',missing:[]};
    const chosen=new Set(selected||[]),missing=ids.filter(id=>!chosen.has(id));
    if (chosen.size+missing.length>6) return {ok:false,reason:'Your day sheet already has too many stops. Nothing was changed.',missing:[]};
    for (const id of ids) {
      const card=cards.get(id);
      if (!ID.test(id)||!card||card.dataset.arrivalVerified!=='verified'||
          !['verify','seasonal','restricted'].includes(card.dataset.status)||!card.querySelector?.('.save')) {
        return {ok:false,reason:'A stop no longer has a source-verified visitor approach. Nothing was saved.',missing:[]};
      }
      // Construction-affected overlooks may only enter the explicitly conditional corridor research sheet.
      if (RESTRICTED.has(id)&&key!=='black-river-corridor')
        return {ok:false,reason:'Construction-affected falls require the byway research sheet.',missing:[]};
    }
    return {ok:true,missing,reason:policy.message,
      researchOnly:key==='black-river-corridor'||key==='keweenaw-gorge'};
  }
  // Native Rust makes the final add-to-day-sheet decision, but the existing
  // source-verified JS decision remains an independent safety oracle.
  // Any disagreement fails closed instead of authorizing a new visitor route.
  function assess(key,cards,selected,date){
    const baseline=legacyAssess(key,cards,selected,date);
    const native=typeof window!=='undefined'?window.UPWaterfallEvidenceRust?.region?.():null;
    if(!native)return (typeof window!=='undefined'?window.SharedItineraryEngine?.vetoApproved?.(baseline,{ids:PRESETS[key],cards,selected,date,season:(key==='keweenaw-gorge'||key==='black-river-corridor')?1:0}):null)||baseline;
    const code=native.decide(key,cards,selected,date);
    if((code===1)!==baseline.ok)
      return {ok:false,reason:'The regional access rules could not be reconciled. No stops were added; use the original land-manager guides.',missing:[]};
    return {...(window.SharedItineraryEngine?.vetoApproved?.(baseline,{ids:PRESETS[key],cards,selected,date,season:(key==='keweenaw-gorge'||key==='black-river-corridor')?1:0})||baseline),decisionEngine:'rust-wasm'};
  }
  if (typeof module!=='undefined'&&module.exports) module.exports={PRESETS,RESTRICTED,datePolicy,assess};
  if (typeof document==='undefined') return;
  const cards=new Map([...document.querySelectorAll('[data-fall][data-id]')].map(c=>[c.dataset.id,c]));
  window.UPWaterfallEvidenceRust?.loadRegion?.(PRESETS,RESTRICTED,datePolicy,legacyAssess,cards)?.then(()=>{});
  const date=document.getElementById('visit-date');
  const chosen=()=>[...cards.entries()].filter(([,c])=>c.querySelector('.save')?.getAttribute('aria-pressed')==='true').map(([id])=>id);
  function updateAdvisory() {
    const policy=datePolicy(date?.value||'');
    for (const id of ['keweenaw-day-advisory','black-river-day-advisory']) {
      const note=document.getElementById(id); if (!note) continue;
      note.textContent=policy.snow
        ? id==='keweenaw-day-advisory'
          ? 'Winter: the developed park and roadside views are conditional. The Manganese gorge extension is not offered without verified safe footing and legal parking.'
          : 'Winter: the Forest Service warns that plowing and services can be limited. The longer construction-affected byway plan is not offered.'
        : policy.message;
    }
  }
  document.querySelectorAll('[data-regional-preset]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.regionalPreset;
    const panel=button.closest('[data-regional-cluster]');
    const status=panel?.querySelector('[data-regional-feedback]');
    const result=assess(key,cards,chosen(),date?.value||'');
    if (!result.ok) {window.UPWaterfallMetrics?.plan(key,'blocked',0);if(status){status.textContent=result.reason;status.focus();}return;}
    for (const id of result.missing) cards.get(id).querySelector('.save').click();
    window.UPWaterfallMetrics?.plan(key,result.missing.length?'added':'already_saved',result.missing.length);
    const sheet=document.getElementById('upfall-day-sheet'),reveal=document.getElementById('open-day-sheet');
    if (sheet?.hidden&&reveal) reveal.click();
    const description=key==='keweenaw-parks'
      ? 'Two official park stops added. They are separate destinations along a scenic outing, not a verified driving route.'
      : key==='keweenaw-gorge'
        ? 'Three Keweenaw stops saved as a conditional research itinerary. Manganese requires safe legal off-road stopping and a gorge walk; this is not a guaranteed third parking location.'
        : key==='black-river-one'
          ? 'The Great Conglomerate stop is saved as a conditional visit. The Forest Service warns about stair/tread hazards and the byway may have winter-plowing limits.'
          : 'Four named byway falls are saved for RESEARCH, not a guaranteed four-stop itinerary. Potawatomi, Gorge and Rainbow have construction restrictions. Sandstone Falls is CLOSED and omitted.';
    if (status) status.textContent=description+' '+result.reason;
    document.getElementById('shortlist')?.scrollIntoView({block:'start',behavior:'smooth'});
  }));
  date?.addEventListener('change',updateAdvisory);
  updateAdvisory();
})();