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
  function vulcanPlayalindaDecision(national,regional,matched){
    const m=national?.selectedLaunch;
    const net=Date.parse(m?.net||'');
    const missionText=[m?.name,m?.mission].filter(Boolean).join(' ');
    if(m?.locationId!==12||!/\bVulcan\b/i.test([m?.rocket,m?.name].join(' '))||
       !/\bLV[-\s]?01\b/i.test(missionText)||
       !/(?:SLC[\s-]*41|Space Launch Complex[\s-]*41)/i.test(m?.pad||'')||
       /hold|scrub|cancel|success|in flight/i.test(m?.status||'')||
       !['minute','second'].includes(m?.netPrecision)||
       !Number.isFinite(net)||new Date(net).toISOString().slice(0,10)!=='2026-11-13')return null;
    const south=matched?regional?.viewpoints?.find(v=>v.id==='playalinda-south'):null;
    const north=matched?regional?.viewpoints?.find(v=>v.id==='playalinda-north'):null;
    const npsVerified=matched&&regional?.accessSource?.verified===true&&
      Boolean(regional.accessSource.checkedAt);
    const closed=npsVerified&&south?.level==='closed';
    // This is a conditional allowance under NPS policy, not a live gate report.
    // Do not promote absent, stale, out-of-hours or conflicting evidence to YES.
    const allowed=npsVerified&&south?.level==='verify'&&
      /Security access not yet confirmed/i.test(south.label||'');
    const state=closed?'closed':allowed?'open':'verify';
    const cutoffAt=new Date(net-30*60000).toISOString();
    const cutoffLabel=new Intl.DateTimeFormat('en-US',{
      timeZone:'America/New_York',hour:'numeric',minute:'2-digit',
      timeZoneName:'short'
    }).format(new Date(cutoffAt));
    const northClosed=npsVerified&&north?.level==='closed';
    const headline=state==='open'?'Yes — Playalinda Beach lots 4–7 are available for viewing':
      state==='closed'?'No — NPS reports a closure affecting Playalinda lots 4–7':
      'Playalinda lots 4–7: check current NPS access before going';
    const northNote=northClosed?
      'The current NPS closure covers lots 8–13, the road north of Eddy Creek, and the northern beach. Do not go to those areas.':
      'Do not use lots 8–13 or the northern Eddy Creek road unless current NPS alerts explicitly show they have reopened.';
    const note='Use a designated beach parking lot only. Park vistas are closed during launches. '+
      'The beach from parking area #1 south for one-quarter mile to the Kennedy Space Center boundary is closed. '+
      'Inbound Playalinda traffic closes 30 minutes before liftoff: '+cutoffLabel+
      ' for the selected target; arrive well earlier because lots can fill. '+
      northNote+' NASA or NPS can impose additional restrictions without notice. '+
      'Jetty Park is the alternate; check its park pass and hours.';
    return {state,headline,note,cutoffAt,cutoffLabel,northClosed,
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
    // When NPS supports lots 4–7, show that destination first and Jetty as
    // the backup. Unverified/closed beach access never gets promoted.
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
    if(playalinda)answer=playalinda.headline+'. '+
      (playalinda.state==='open'?'Use a designated beach parking lot and enter before '+
      playalinda.cutoffLabel+'. ':'Check current NPS restrictions before entering the park. ')+
      'Jetty Park is the alternate; check its pass and hours.';
    const beach=match?deck.playalinda:null;
    const npsChecked=match&&regional.accessSource?.verified===true&&beach?.npsVerified===true;
    // The old summary used Lot 8 as a proxy: its closure must not close lots 4–7.
    const npsClosed=npsChecked&&regional.viewpoints?.find(v=>v.id==='playalinda-south')?.level==='closed';
    const kscMatched=match&&deck.ksc?.officialEventMatched===true&&
      regional.kscViewing?.state==='matched'&&isOfficial(regional.kscViewing.sourceUrl);
    let note=playalinda?playalinda.note:npsClosed?
      'NPS has reported a restriction affecting the referenced Playalinda viewing area. Do not use it without a new official opening notice.':
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
      'Known viewing spots · opening not confirmed';
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