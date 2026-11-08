'use strict';
/*
 * Foundry cross-guide receipt. A query string is an intent, never proof that
 * the destination restored the mission. Only an exact ID match against the
 * destination's successfully loaded response records restoration. All analytics
 * fields are fixed-category values; no mission identifiers or URLs are sent.
 */
(function(win,doc){
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ROUTES=Object.freeze({
    '/vandenberg-rocket-launch-viewing/':'california',
    '/national-tools/space-coast-launch/':'florida',
    '/starbase-rocket-launch-viewing/':'texas',
    '/wallops-rocket-launch-viewing/':'virginia',
    '/kodiak-rocket-launch-viewing/':'alaska',
    '/barking-sands-rocket-launch-viewing/':'hawaii'
  });
  const STAGES=new Set(['source','schedule','access','viewing','sky']);
  const url=new URL(win.location.href);
  const region=ROUTES[url.pathname];
  const requested=url.searchParams.get('launchId');
  const stage=url.searchParams.get('stage');
  const enabled=Boolean(region&&url.searchParams.get('via')==='rocket-foundry'&&
    UUID.test(requested||'')&&STAGES.has(stage));
  let completed=false,receipt=null;
  // Match national tool-engagement's privacy-safe Vercel queue: a restored
  // mission must not vanish from telemetry because the optional analytics
  // library has not loaded yet. Queue initialization has no navigation effect.
  if(enabled&&typeof win.va!=='function')
    win.va=function(){(win.vaq=win.vaq||[]).push(arguments);};
  function measure(name,outcome){
    const properties={region,stage,destination:'regional_guide',outcome};
    if(typeof win.gtag==='function'){
      try{win.gtag('event',name,{page_family:'rocket_launch_live',
        feature:'foundry_mission_handoff',...properties});}catch(_){}
    }
    if(typeof win.va==='function'){
      try{win.va('event',{name:name==='rocket_foundry_mission_restored'?
        'Rocket Foundry Mission Restored':'Rocket Foundry Mission Unavailable',data:properties});}catch(_){}
    }
  }
  function show(ok,name){
    if(!enabled||completed)return;
    completed=true;
    const main=doc.querySelector('main')||doc.body;
    receipt=doc.createElement('aside');
    receipt.id='rocket-foundry-receipt';
    receipt.setAttribute('role','status');
    receipt.setAttribute('aria-live','polite');
    receipt.dataset.restoration=ok?'restored':'unavailable';
    receipt.style.cssText='box-sizing:border-box;margin:12px auto;padding:14px 16px;max-width:960px;border:2px solid '+(ok?'#528a84':'#aa7040')+';border-radius:10px;background:#f7f7ed;color:#18353b;font:500 15px/1.5 system-ui,sans-serif;';
    const head=doc.createElement('strong');
    head.style.display='block';
    head.textContent=ok?'Selected launch restored':'Linked mission is no longer available';
    const detail=doc.createElement('p');
    detail.style.margin='4px 0 0';
    detail.textContent=ok?
      'The loaded regional schedule confirms this exact mission'+
        (name?' ('+String(name).slice(0,140)+')':'')+
        '. Access, admission and spectator weather require their own evidence.':
      'The linked mission could not be verified in this region’s current bounded schedule. Any different mission shown by the guide is a NEW selection; it is not the linked launch.';
    receipt.append(head,detail);
    main.insertBefore(receipt,main.firstChild);
    measure(ok?'rocket_foundry_mission_restored':'rocket_foundry_mission_unavailable',
      ok?'restored':'unavailable');
  }
  function loaded(givenRegion,id,name){
    if(!enabled||givenRegion!==region)return false;
    if(completed){
      // A regional picker can change after the original link arrived.
      // Keep the receipt honest during A → B → A without double-counting.
      if(receipt){
        const exact=id===requested;
        receipt.dataset.restoration=exact?'restored':'changed';
        receipt.firstChild.textContent=exact?
          'Original linked mission reselected':'You selected a different regional mission';
        receipt.lastChild.textContent=exact?
          'The loaded regional data again matches the originally linked launch. Recheck its current access, timing and spectator forecast.':
          'The currently selected regional mission is different from the linked launch. Its weather, access and return link must follow this new selection.';
      }
      return id===requested;
    }
    if(id===requested){show(true,name);return true;}
    show(false);return false;
  }
  function unavailable(){
    if(enabled&&!completed)show(false);
  }
  win.RocketFoundryHandoff=Object.freeze({loaded,unavailable});
  if(!enabled)return;
  // Florida's existing same-source load event carries the full loaded roster.
  if(region==='florida'){
    doc.addEventListener('space-coast:launch-loaded',e=>{
      const d=e.detail||{};
      const valid=Array.isArray(d.launches)&&
        d.launches.some(m=>m?.id===requested);
      loaded('florida',valid?d.selectedLaunchId:null,
        d.launches?.find(m=>m?.id===requested)?.name);
    });
  }
  // Vandenberg is intentionally a static place guide: unlike other five
  // specialist apps, verify the chosen mission explicitly against the existing
  // national cached source before offering its mission-specific return link.
  if(region==='california'){
    const query=new URLSearchParams({region:'california',launchId:requested});
    fetch('/api/rocket-launch-usa?'+query.toString(),{
      headers:{Accept:'application/json'}}).then(r=>r.ok?r.json():null).then(d=>{
      const exact=d?.ok===true&&d.selectedRegion==='california'&&
        d.selectedLaunchId===requested&&d.selectedLaunch?.id===requested&&
        d.regions?.some(r=>r.id==='california'&&r.launches?.some(l=>l.id===requested));
      if(!exact){unavailable();return;}
      doc.querySelectorAll('a[data-vg-planner]').forEach(a=>{
        const target=new URL(a.href,win.location.origin);
        if(target.origin===win.location.origin&&
          target.pathname==='/national-tools/rocket-launch-live/'){
          target.searchParams.set('region','california');
          target.searchParams.set('launchId',requested);
          a.href=target.pathname+target.search+target.hash;
        }
      });
      loaded('california',d.selectedLaunchId,d.selectedLaunch.name);
    }).catch(unavailable);
  }
})(window,document);
