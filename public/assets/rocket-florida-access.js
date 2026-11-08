'use strict';
/* A visitor-facing projection of the existing national and Florida engines.
   This layer makes no independent access, weather, parking or launch claims.
   Never import a different mission's forecast, park alert or KSC ticket. */
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
    const ids=[...new Set([...chosen,'jetty','space-view','playalinda-south','ksc-visitor'])].slice(0,6);
    const fine=match?new Map(regional.viewpoints.map(s=>[s.id,s])):new Map();
    const cards=ids.map(key=>{
      const s=byId.get(key),detail=fine.get(key);
      if(!s)return null;
      const current=match&&detail&&VALID.has(detail.level)?detail:null;
      const state=current?.level==='closed'||current?.level==='ineligible'?'closed':
        current?.level==='candidate'?'candidate':'verify';
      const reason=current?.reason||s.reason||
        'Published viewing location; launch-day access is not confirmed.';
      return {
        id:key,name:s.name,area:current?.area||'Florida Space Coast',
        role:key===chosen[0]?'Starting point':key===chosen[1]?'Public alternative':
          key.startsWith('playalinda')?'Conditional NPS beach':
          key==='ksc-visitor'?'Ticketed visitor venue':'Additional public viewing area',
        label:current?.label||s.label||'Launch-day access unconfirmed',
        state,reason,source:isOfficial(current?.source)?current.source:
          isOfficial(s.source)?s.source:null,
        address:nonEmpty(current?.address)||nonEmpty(s.address),
        directionsAllowed:state!=='closed'&&
          (key==='space-view'||key==='rotary'||key==='jetty')&&s.directionsAllowed!==false
      };
    }).filter(Boolean);
    const chosenCards=chosen.map(k=>cards.find(s=>s.id===k)).filter(Boolean);
    const named=chosenCards.map(s=>s.name).join(' and ');
    let answer=padKind==='cape'?
      'Cape Canaveral mission: start with public viewing locations near Port Canaveral.':
      padKind==='kennedy'?
      'Kennedy mission: start with public waterfront viewing in Titusville.':
      'Florida pad not established: compare published public shoreline locations before choosing a coast.';
    if(named)answer+=' '+named+(chosenCards.length>1?' are':' is')+' a published option'+(chosenCards.length>1?'s':'')+', not confirmed launch-day entry.';
    const beach=match?deck.playalinda:null;
    const npsChecked=match&&regional.accessSource?.verified===true&&beach?.npsVerified===true;
    const npsClosed=npsChecked&&beach.excluded===true;
    const kscMatched=match&&deck.ksc?.officialEventMatched===true&&
      regional.kscViewing?.state==='matched'&&isOfficial(regional.kscViewing.sourceUrl);
    let note=npsClosed?
      'NPS has reported a restriction affecting the referenced Playalinda viewing area. Do not use it without a new official opening notice.':
      npsChecked?
      'NPS alerts were checked for Playalinda, but no launch-specific gate opening has been certified. The park can fill or close for NASA operations.':
      'Playalinda opening is not verified for this mission; the NPS can close lots and inbound roads for launch security.';
    note+=' '+(kscMatched?
      'KSC lists a mission-linked viewing event. Tickets, venue admission and availability still require confirmation.':
      'KSC viewing requires an exact-mission announcement; normal visitor admission is not a launch-viewing ticket.');
    if(regional&&!match)note+=' The Florida detail response was stale, missing or for another mission, so no access status was adopted.';
    const status=npsClosed?'NPS restriction reported':
      match?'Viewing candidates checked · entry unverified':
      'Published viewing locations · live entry unknown';
    return {
      missionId:id,matched:Boolean(match),padKind,chosen:chosenCards,cards,
      status,state:npsClosed?'closed':'unknown',answer,note,
      sourceCheckedAt:match?regional.accessSource?.checkedAt||null:null,
      npsClosed,kscMatched,
      kscUrl:kscMatched?regional.kscViewing.sourceUrl:null,
      detailUrl:'/national-tools/space-coast-launch/?launchId='+encodeURIComponent(id),
      next:'Choose a public viewing location, then confirm its launch-day restrictions or ticket terms before departure.'
    };
  }
  return Object.freeze({assess});
});