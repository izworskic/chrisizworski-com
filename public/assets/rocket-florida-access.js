'use strict';
/* A visitor-facing projection of the existing national and Florida engines.
   Apart from the standing NPS Playalinda launch rule below, this layer makes
   no independent access, weather, parking or launch claims.
   Never import a different mission’s forecast, park alert or KSC ticket. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.RocketFloridaAccess=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const PUBLIC=new Set(['space-view','rotary','parrish','jetty']);
  const VALID=new Set(['candidate','verify','unknown','closed','ineligible']);
  const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
  const isOfficial=url=>typeof url==='string'&&/^https:\/\/(?:www\.)?(?:brevardfl\.gov|nps\.gov|portcanaveral\.com|kennedyspacecenter\.com)(?:\/|$)/i.test(url);
  const nonEmpty=t=>typeof t==='string'&&t.trim()?t:null;

  const COMPENDIUM='https://www.nps.gov/cana/learn/management/superintendent-s-compendium.htm';
  // Standing rule, NPS Superintendent's Compendium 2026, section 1.5(a)(n).
  // During a launch the closed Playalinda District areas are the park vistas
  // and the beach at parking area #1 (closed 1/4 mile south to the KSC
  // boundary). Beach parking lots 4-7 are not closed, so they are open for
  // viewing, and Playalinda closes to inbound traffic 30 minutes before launch.
  // NPS publishes only closures, never per-launch openings, so this verdict is
  // fixed text and is not gated on any live alert or notice check.
  const PLAYALINDA_PAD=/(?:\bSLC[\s-]*41\b|Space Launch Complex[\s-]*41\b|\bLC[\s-]*39A\b|Launch Complex[\s-]*39A\b)/i;
  const INBOUND_CUTOFF_MS=30*60000;
  const playalindaVerdict=cutoff=>'Yes, Playalinda Beach lots 4-7 are open for viewing this launch. '+
    'Park only in a beach parking lot. Vistas are closed during the launch, and the beach at '+
    'parking area #1 is closed 1/4 mile south to the KSC boundary. '+
    (cutoff?'Arrive before '+cutoff+':':'Arrive before the inbound cutoff:')+
    ' Playalinda closes to inbound traffic 30 minutes before launch.';
  // Same formatter as the page's displayed launch time (formattedTime in app.js).
  function cutoffLabel(net,precision,zone){
    if(!Number.isFinite(net)||!['minute','second'].includes(precision))return null;
    try{
      return new Intl.DateTimeFormat('en-US',{timeZone:zone||'America/New_York',
        hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(net-INBOUND_CUTOFF_MS));
    }catch{return null;}
  }
  function playalindaDecision(national){
    const m=national?.selectedLaunch;
    if(!PLAYALINDA_PAD.test(m?.pad||''))return null;
    const net=Date.parse(m?.net||'');
    const label=cutoffLabel(net,m?.netPrecision,national?.region?.timezone);
    return {state:'open',headline:playalindaVerdict(label),
      note:'Jetty Park is the alternate; check its park pass and hours.',
      cutoffAt:label?new Date(net-INBOUND_CUTOFF_MS).toISOString():null,
      cutoffLabel:label,source:COMPENDIUM};
  }
  function assess(national,regional) {
    const mission=national?.selectedLaunch;
    const id=mission?.id;
    if(national?.ok!==true||national?.region?.id!=='florida'||
       national?.selectedRegion!=='florida'||!UUID.test(id||'')||
       national.selectedLaunchId!==id||mission.region!=='florida')return null;
    const sites=Array.isArray(national.access?.sites)?national.access.sites:[];
    const byId=new Map(sites.filter(s=>s&&nonEmpty(s.id)).map(s=>[s.id,s]));
    const deck=regional?.floridaViewingDeck;
    const padKind=mission.locationId===12?'cape':mission.locationId===27?'kennedy':null;
    const regionalPad=regional?.next?.locationId===12?'cape':
      regional?.next?.locationId===27?'kennedy':null;
    const match=national.scheduleFreshness==='recent'&&regional?.ok===true&&
      regional?.selectedLaunchId===id&&regional?.next?.id===id&&
      regional?.scheduleFreshness==='recent'&&deck?.missionId===id&&
      Array.isArray(regional?.viewpoints)&&
      (!padKind||deck.facility===padKind)&&
      (!padKind||!regionalPad||regionalPad===padKind);
    // Fallback is published public viewing inventory, NOT mission-verified access.
    const fallback=padKind==='cape'?['jetty','space-view']:padKind==='kennedy'?
      ['space-view','rotary']:['space-view','jetty'];
    const chosen=match&&['cape','kennedy'].includes(deck.facility)&&
      Array.isArray(deck.cards)&&deck.cards.length?
      deck.cards.filter(s=>PUBLIC.has(s.id)).slice(0,2).map(s=>s.id):fallback;
    const playalinda=playalindaDecision(national);
    const priority=playalinda?.state==='open'?['playalinda-south','jetty']:[];
    const ids=[...new Set([...priority,...chosen,'jetty','space-view','playalinda-south','ksc-visitor'])].slice(0,6);
    const fine=match?new Map(regional.viewpoints.map(s=>[s.id,s])):new Map();
    const cards=ids.map(key=>{
      const s=byId.get(key),detail=fine.get(key);
      if(!s)return null;
      const current=match&&detail&&VALID.has(detail.level)?detail:null;
      const state=current?.level==='closed'||current?.level==='ineligible'?'closed':
        current?.level==='candidate'?'candidate':'verify';
      const reason=current?.reason||s.reason||
        'A public place to consider; check its hours and launch-day rules.';
      const card={
        id:key,name:s.name,area:current?.area||'Florida Space Coast',
        role:playalinda?.state==='open'&&key==='playalinda-south'?'NPS viewing choice':
          playalinda?.state==='open'&&key==='jetty'?'Alternate · check park pass and hours':
          key===chosen[0]?'Good place to start':key===chosen[1]?'Another viewing option':
          key.startsWith('playalinda')?'Beach with launch-day restrictions':
          key==='ksc-visitor'?'Ticketed viewing area':'Another public viewing area',
        label:current?.label||s.label||'Check if open for this launch',
        state,reason,source:isOfficial(current?.source)?current.source:
          isOfficial(s.source)?s.source:null,
        address:nonEmpty(current?.address)||nonEmpty(s.address),
        directionsAllowed:state!=='closed'&&
          (key==='space-view'||key==='rotary'||key==='jetty')&&s.directionsAllowed!==false
      };
      return key==='playalinda-south'&&playalinda?{
        ...card,state:'candidate',
        label:playalinda.headline,reason:playalinda.note,
        source:playalinda.source,directionsAllowed:false
      }:card;
    }).filter(Boolean);
    const chosenCards=chosen.map(k=>cards.find(s=>s.id===k)).filter(Boolean);
    const named=chosenCards.map(s=>s.name).join(' and ');
    let answer=padKind==='cape'?
      'For Cape Canaveral launches, start with public waterfront spots near Port Canaveral.':
      padKind==='kennedy'?
      'For Kennedy launches, the Titusville waterfront is a good place to start looking.':
      'The launch pad isn’t confirmed yet. Compare public viewing spots on both sides of the Space Coast.';
    if(named)answer+=' '+named+(chosenCards.length>1?
      ' are published options':' is a published option')+', not confirmed launch-day entry.';
    if(playalinda)answer=playalinda.headline+' Jetty Park is the alternate; check its pass and hours.';
    const beach=match?deck.playalinda:null;
    const npsChecked=match&&regional.accessSource?.verified===true&&beach?.npsVerified===true;
    // The old summary used Lot 8 as a proxy: its closure must not close lots 4–7.
    const npsClosed=npsChecked&&regional.viewpoints?.find(v=>v.id==='playalinda-south')?.level==='closed';
    const kscMatched=match&&deck.ksc?.officialEventMatched===true&&
      regional.kscViewing?.state==='matched'&&isOfficial(regional.kscViewing.sourceUrl);
    let note=playalinda?playalinda.note:npsClosed?
      'NPS reports a restriction affecting the referenced Playalinda viewing area. Do not use it. Follow the current notice and choose another public site.':
      npsChecked?
      'NPS alerts were checked for Playalinda, but no launch-specific gate opening has been certified. The park can fill or close for NASA operations.':
      'Playalinda may close for a launch, including parking lots and the entrance road. Check the National Park Service before driving.';
    note+=' '+(kscMatched?
      'KSC lists a mission-linked viewing event. Tickets, venue admission and availability still require confirmation.':
      'KSC viewing requires an exact-mission announcement; normal visitor admission is not a launch-viewing ticket.');
    if(regional&&!match&&!playalinda)note+=' The Florida detail response was stale, missing or for another mission, so no access status was adopted.';
    const status=playalinda?(playalinda.cutoffLabel?
        'Playalinda lots 4-7 open · arrive before '+playalinda.cutoffLabel:
        'Playalinda lots 4-7 open for viewing'):
      npsClosed?'NPS restriction reported':
      match?'Public viewing spots found · check access':
      'Known viewing spots · check venue rules';
    return {
      missionId:id,matched:Boolean(match),padKind,chosen:chosenCards,cards,
      status,state:playalinda?'candidate':npsClosed?'closed':'unknown',answer,note,
      playalinda,
      sourceCheckedAt:match?regional.accessSource?.checkedAt||null:null,
      npsClosed:playalinda?false:npsClosed,kscMatched,
      kscUrl:kscMatched?regional.kscViewing.sourceUrl:null,
      detailUrl:'/national-tools/space-coast-launch/?launchId='+encodeURIComponent(id),
      next:'Choose a public place to watch, then check its hours, parking and any launch-specific ticket or closure rules.'
    };
  }
  return Object.freeze({assess});
});