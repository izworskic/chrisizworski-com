'use strict';
/* A visitor-facing projection of the existing national and Florida engines.
   This layer makes no independent access, weather, parking or launch claims.
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
  // A single, mission-bound verdict is consumed by both national viewing sections.
  // The current NPS alert feed, not a static calendar assertion, controls the answer.
  // The compendium states the standing launch rule. The NPS does not publish
  // affirmative opening notices for each lot; absence of one is not a closure.
  // A NEW, explicit NPS closure of lots 4–7 still overrides this verdict.
  const VULCAN_LV01_VERDICT='Yes, Playalinda Beach lots 4-7 are open for viewing this launch. Park only in a beach parking lot. Vistas are closed during the launch, and the beach at parking area #1 is closed 1/4 mile south to the KSC boundary. Arrive before 12:02 PM ET: Playalinda closes to inbound traffic 30 minutes before launch.';
  function vulcanPlayalindaDecision(national,regional,matched){
    const m=national?.selectedLaunch;
    const net=Date.parse(m?.net||'');
    const missionText=[m?.name,m?.mission].filter(Boolean).join(' ');
    if(m?.locationId!==12||!/\bVulcan\b/i.test([m?.rocket,m?.name].join(' '))||
       !/\bLV[-\s]?01\b/i.test(missionText)||
       !/(?:SLC[\s-]*41|Space Launch Complex[\s-]*41)/i.test(m?.pad||'')||
       /hold|scrub|cancel|success|in flight/i.test(m?.status||'')||
       !['minute','second'].includes(m?.netPrecision)||
       !Number.isFinite(net)||
       // Do not show a fixed 12:02 cutoff after the scheduled T-0 changes.
       !new Date(net).toISOString().startsWith('2026-11-14T17:32:'))return null;
    const south=matched?regional?.viewpoints?.find(v=>v.id==='playalinda-south'):null;
    const north=matched?regional?.viewpoints?.find(v=>v.id==='playalinda-north'):null;
    const npsVerified=Boolean(matched&&regional?.accessSource?.verified===true&&
      regional.accessSource.checkedAt);
    const closed=Boolean(npsVerified&&south?.level==='closed');
    const northClosed=Boolean(npsVerified&&north?.level==='closed');
    const note=(northClosed?
      'A separate current NPS alert closes lots 8–13, the road north of Eddy Creek, and the northern beach. Do not use those areas. ':
      'Check NPS notices for any separate closures beyond lots 4–7. ')+
      'NASA or NPS can issue new restrictions; follow posted signs and park staff directions. '+
      'Jetty Park is the alternate; check its park pass and hours.';
    const headline=closed?
      'No — a new NPS alert explicitly closes Playalinda lots 4–7 for this launch.':
      VULCAN_LV01_VERDICT;
    return {state:closed?'closed':'open',headline,note,
      cutoffAt:new Date(net-30*60000).toISOString(),
      cutoffLabel:'12:02 PM ET',northClosed,
      checkedAt:npsVerified?regional.accessSource.checkedAt:null,
      source:COMPENDIUM};
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
    const playalinda=vulcanPlayalindaDecision(national,regional,match);
    // The NPS compendium sets the standing rule for this exact launch; the
    // live feed only overrides an explicit new closure, never demands an opening notice.
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
        ...card,state:playalinda.state==='open'?'candidate':playalinda.state==='closed'?'closed':'verify',
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
      'NPS reports a restriction affecting the referenced Playalinda viewing area. Follow the current notice and choose another public site.':
      npsChecked?
      'NPS alerts were checked for Playalinda, but no launch-specific gate opening has been certified. The park can fill or close for NASA operations.':
      'Playalinda may close for a launch, including parking lots and the entrance road. Check the National Park Service before driving.';
    note+=' '+(kscMatched?
      'KSC lists a mission-linked viewing event. Tickets, venue admission and availability still require confirmation.':
      'KSC viewing requires an exact-mission announcement; normal visitor admission is not a launch-viewing ticket.');
    if(regional&&!match)note+=' The Florida detail response was stale, missing or for another mission, so no access status was adopted.';
    const status=playalinda?.state==='open'?'Playalinda lots 4–7 available · check arrival cutoff':
      playalinda?.state==='closed'?'Playalinda lots 4–7 closed by NPS':
      npsClosed?'NPS restriction reported':
      match?'Public viewing spots found · check access':
      'Known viewing spots · check venue rules';
    return {
      missionId:id,matched:Boolean(match),padKind,chosen:chosenCards,cards,
      status,state:npsClosed?'closed':playalinda?.state==='open'?'candidate':'unknown',answer,note,
      playalinda,
      sourceCheckedAt:match?regional.accessSource?.checkedAt||null:null,
      npsClosed,kscMatched,
      kscUrl:kscMatched?regional.kscViewing.sourceUrl:null,
      detailUrl:'/national-tools/space-coast-launch/?launchId='+encodeURIComponent(id),
      next:'Choose a public place to watch, then check its hours, parking and any launch-specific ticket or closure rules.'
    };
  }
  return Object.freeze({assess});
});