'use strict';
/*
 * Rocket Flight Desk: Experience OS 1.2.1, national pilot.
 * A progressive, source-bound presentation of /api/rocket-launch-usa only.
 * Never infer launch GO, public admission, trajectory or local weather safety.
 * The existing selected UUID remains the single source of truth across:
 * national picker, launch marker, mission details, visual story and this desk.
 */
(function (root) {
  const PRECISE=new Set(['minute','second']);
  const TIMED=new Set(['minute','second','hour']);
  const REGION_NAMES=Object.freeze({
    california:'Vandenberg · California',florida:'Florida Space Coast',
    texas:'Starbase · Texas',virginia:'Wallops · Virginia',
    alaska:'Kodiak · Alaska',hawaii:'Barking Sands · Hawaiʻi'
  });
  const SPECIALISTS=Object.freeze({
    california:'/vandenberg-rocket-launch-viewing/',
    florida:'/national-tools/space-coast-launch/',
    texas:'/starbase-rocket-launch-viewing/',
    virginia:'/wallops-rocket-launch-viewing/',
    alaska:'/kodiak-rocket-launch-viewing/',
    hawaii:'/barking-sands-rocket-launch-viewing/'
  });
  const asDate=iso=>{
    const d=new Date(iso||'');
    return Number.isFinite(+d)?d:null;
  };
  function target(m,zone) {
    const date=asDate(m?.net);
    if(!date)return 'Launch target not published';
    const p=m.netPrecision;
    if(p==='year')return new Intl.DateTimeFormat('en-US',{year:'numeric',timeZone:'UTC'}).format(date)+' · year only';
    if(p==='month')return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(date)+' · month only';
    const opts={timeZone:TIMED.has(p)?zone||'UTC':'UTC',month:'short',day:'numeric',year:'numeric'};
    if(TIMED.has(p)){opts.hour='numeric';opts.minute='2-digit';opts.timeZoneName='short';}
    const label=new Intl.DateTimeFormat('en-US',opts).format(date);
    return label+(TIMED.has(p)?(p==='hour'?' · hour approximate':' · listed target, not launch GO'):' · time TBD');
  }
  function age(iso) {
    const when=asDate(iso);
    return when?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(when):'Not available';
  }
  // Never promote weather from another launch hour or an aged NWS grid.
  // The server's existing NWS adapter matches each hourly interval to the
  // selected NET; recheck that contract when deciding the visitor's next step.
  function usableSkySamples(data) {
    const selected=data?.selectedLaunch;
    const t=Date.parse(selected?.net||'');
    const checked=Date.parse(data?.generatedAt||data?.scheduleCheckedAt||'');
    if(!selected||selected.id!==data?.selectedLaunchId||
       !PRECISE.has(selected.netPrecision)||!Number.isFinite(t)||
       !Number.isFinite(checked)||t<checked-15*60000||
       t>checked+7*86400000)return [];
    return (Array.isArray(data?.weather?.places)?data.weather.places:[]).filter(p=>{
      const start=Date.parse(p?.period?.startTime||'');
      const end=Date.parse(p?.period?.endTime||'');
      const issued=Date.parse(p?.updatedAt||'');
      return p?.status==='ok'&&p.cloudStatus==='ok'&&
        Number.isInteger(p.cloudCoverPercent)&&
        !['unknown','poor'].includes(p?.assessment?.level)&&
        Number.isFinite(start)&&Number.isFinite(end)&&
        start<=t&&t<end&&Number.isFinite(issued)&&
        issued<=checked+15*60000&&checked-issued<=36*3600000;
    });
  }
  function decide(data) {
    const region=data?.region?.id;
    const mission=data?.selectedLaunch&&data.selectedLaunch.region===region&&
      data.selectedLaunchId===data.selectedLaunch.id&&
      data.regions?.some(r=>r.id===region&&r.launches?.some(l=>l.id===data.selectedLaunch.id))?
      data.selectedLaunch:null;
    const unavailable=!data||data.ok===false||!REGION_NAMES[region];
    if(unavailable)return {
      status:'unavailable',headline:'Launch schedule is unavailable',
      note:'The last known launch is not a verified current target. Use the official range schedule before traveling.',
      name:'No current mission selected',regionName:'Six U.S. launch coasts',
      when:'Launch time not verified',origin:'Pad not verified',
      access:'No launch-day access confirmed',sky:'No current sky evidence',
      source:'No dated schedule response',launchId:null,region:null,
      official:null,specialist:null,limited:true
    };
    const feed=data.regions?.find(r=>r.id===region);
    const reported=(data.access||{}).liveOfficialNotice;
    const snapshotStale=data.scheduleFreshness==='stale'||mission?.sourceStale===true;
    const sourceUnknown=!['stale','recent'].includes(data.scheduleFreshness);
    const feedUnavailable=feed?.feedState==='unavailable';
    const precision=mission?.netPrecision;
    const hold=Boolean(mission&&/hold|scrub/i.test(mission.status||''));
    const closed=region==='texas'&&reported?.state==='closed';
    const uncertainAccess=['alaska','hawaii'].includes(region);
    const hasUsefulTime=Boolean(mission&&PRECISE.has(precision)&&asDate(mission.net));
    let status,headline,note;
    if(feedUnavailable){
      status='unavailable';headline='Regional launch feed unavailable';
      note='The schedule does not establish whether range operations are taking place. Consult the official range.';
    }else if(!mission){
      status='unknown';headline='No scheduled mission in this bounded feed';
      note='An empty public schedule is not proof that the range is inactive or a launch was cancelled.';
    }else if(snapshotStale){
      status='stale';headline='Schedule check overdue';
      note='This target may have changed. Recheck an official operator or range notice before making plans.';
    }else if(sourceUnknown){
      status='stale';headline='Schedule observation not verified';
      note='The latest source age cannot be established. Confirm the current official mission target before a trip.';
    }else if(hold){
      status='hold';headline='Launch held or scrubbed';
      note='Do not travel based on the previous target. Await a new official attempt window.';
    }else if(closed){
      status='hold';headline='Beach closure reported by the official city source';
      note='Boca Chica access is not confirmed for this launch. Read the dated city notice and find a legal alternative.';
    }else if(uncertainAccess){
      status='access';headline='A mission is listed; public launch viewing is not verified';
      note='This is a restricted range. A rocket pin is not a route, permit or advertised spectator area.';
    }else if(!hasUsefulTime){
      status='timing';headline='The launch time is too uncertain for a travel plan';
      note='A date-only, month-only or approximate-hour entry is not an arrival window.';
    }else{
      status='review';headline='Target published; the viewing trip is not cleared';
      note='Confirm official access, the latest operator target and the spectator sky before traveling.';
    }
    const inRange=Number.isFinite(mission?.lat)&&Number.isFinite(mission?.lon)&&
      Boolean(root.RocketMapPins?.inRegion?.(region,mission.lat,mission.lon));
    const origin=mission?(inRange?
      (mission.pad||'Published launch pad')+' · source-listed pad coordinate':
      'Approximate launch region · exact pad GPS not confirmed'):'Launch origin not verified';
    const weather=data.weather||{};
    // NWS can report a nominal "partial" envelope even when every individual
    // point lookup failed. Do not advertise an actual forecast without any
    // bounded mission-time location evidence.
    const usableWeather=usableSkySamples(data).length>0;
    const sky=hasUsefulTime&&!snapshotStale&&usableWeather&&weather.level==='assessed'?
      'NWS spectator forecast available · not rocket GO':
      hasUsefulTime&&!snapshotStale&&usableWeather&&weather.level==='partial'?
        'Partial NWS forecast · visibility unverified':
        'No verified mission-time viewing forecast';
    const access=closed?'City reported beach closed · recheck dated notice':
      uncertainAccess?'No public launch viewing venue verified':
      region==='florida'?'Check mission-specific KSC tickets and NPS closures':
      region==='virginia'?'NASA must announce the event-specific opening':
      region==='california'?'Check base beach hours and launch exclusions':
      'Official closures can override general beach access';
    return {
      status,headline,note,launchId:mission?.id||null,
      region,regionName:REGION_NAMES[region],name:mission?.name||'No future launch in this feed',
      when:mission?target(mission,data.region.timezone):'No mission target returned',
      origin,access,sky,
      source:'Third-party schedule last checked '+age(data.scheduleCheckedAt)+
        (data.coverage?.partial?' · coverage incomplete':'')+
        '. Not a launch authorization.',
      official:typeof data.region.access==='string'&&/^https:\/\/[a-z0-9.-]+\//i.test(data.region.access)?
        data.region.access:null,
      specialist:SPECIALISTS[region],
      limited:!mission||snapshotStale||feedUnavailable,
      padExact:inRange
    };
  }
  /*
   * Foundry pilot: one purpose-built, consequence-aware next verification.
   * This is not a second readiness score and never declares a visitor GO.
   * It uses only the same region/mission snapshot as the existing Flight Desk.
   * The links go to official authority or the existing regional access owner.
   */
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // A linked guide receives both the selected mission and a bounded journey tag.
  // The destination must independently restore the mission before reporting success.
  function regionalHref(region,id,stage) {
    const base=SPECIALISTS[region];
    if(!base||!UUID.test(id||''))return base||null;
    return base+'?launchId='+encodeURIComponent(id)+'&via=rocket-foundry&stage='+encodeURIComponent(stage);
  }
  function nextCheck(data,context={}) {
    const d=decide(data),region=d.region;
    const authority=typeof data?.region?.authority==='string'&&
      /^https:\/\/[a-z0-9.-]+\//i.test(data.region.authority)?
      data.region.authority:null;
    const specialist=SPECIALISTS[region];
    const handoff=(gate,headline,detail,label,source='specialist')=>({
      gate,headline,detail,label,
      href:regionalHref(region,d.launchId,gate),source,
      destination:'regional_guide'
    });
    if(!region)return {
      gate:'source',headline:'The schedule cannot establish a current launch',
      detail:'No verified mission or range selection is available. NASA’s public list does not include every commercial or military range operation.',
      label:'Open NASA’s public launch schedule',
      href:'https://www.nasa.gov/event-type/launch-schedule/',source:'nasa',destination:'official_access'
    };
    const rangeLink=authority||specialist;
    const official=(gate,headline,detail,label)=>({
      gate,headline,detail,label,href:rangeLink,
      source:authority?'authority':'specialist',
      destination:authority?'official_access':'regional_guide'
    });
    if(!d.launchId)return official('schedule','Check the range for an unlisted or removed mission',
      'No current selected mission is verified in this bounded feed. An absent, removed or mismatched mission must not silently become a different launch. This is not evidence the range is inactive.',
      authority?'Check the official range authority':'Read the regional source guidance');
    if(d.status==='stale'||d.status==='unavailable')return official('schedule',
      'Reconfirm the published mission target',
      'The schedule is stale or unavailable. An old target, viewing notice or forecast is not current.',
      authority?'Check the range authority':'Review regional source guidance');
    const closed=region==='texas'&&data?.access?.liveOfficialNotice?.state==='closed';
    if(d.status==='hold'){
      if(closed)return handoff('access','Check the dated Starbase beach and road closure',
        'An official city closure is reported. It does not identify a legal replacement viewing site; read the notice and respect restrictions.',
        'Read Starbase closure and alternative-place guidance');
      return official('schedule','Wait for an updated launch attempt',
        'A hold or scrub invalidates the earlier arrival window. Verify a new official target before departure.',
        authority?'Check official range updates':'Read the regional source guidance');
    }
    if(d.status==='timing')return official('schedule','Confirm an exact launch hour first',
      'A date-only, monthly or approximate-hour target cannot support a departure plan or a mission-time sky forecast.',
      authority?'Check official mission notices':'Read the regional launch guide');
    if(['alaska','hawaii'].includes(region))return handoff('access',
      'Establish whether public viewing is allowed',
      'This restricted range has no verified public spectator venue for this specific operation. A pad pin is not a public entrance.',
      'Read restricted-range access guidance');
    const sites=Array.isArray(data?.access?.sites)?data.access.sites:[];
    const publicCandidates=sites.filter(s=>
      s?.state==='candidate'&&s.directionsAllowed!==false&&
      typeof s.source==='string'&&/^https:\/\//.test(s.source));
    const kscMatched=region==='florida'&&context.kscEvent==='matched'&&
      context.kscLaunchId===d.launchId;
    const venuesDocumented=publicCandidates.length>0||kscMatched;
    if(!venuesDocumented)return handoff('access','Establish a source-backed spectator option',
      'A listed launch and ordinary venue hours do not establish public mission viewing. The existing regional guide distinguishes access restrictions, closures and candidate viewpoints.',
      'Compare documented regional access');
    if(region==='florida'&&publicCandidates.length){
      const names=publicCandidates.slice(0,2).map(s=>s.name).join(' and ');
      return {
        gate:'viewing',headline:'Choose a public shoreline, not the launch pad',
        detail:'Published Florida options include '+names+'. Your exact mission still needs launch-day access and parking checks. The page below compares places and reports available NPS/KSC evidence without assuming entry.',
        label:'Compare Florida public viewing options',href:'#rl-viewing',
        source:'in_page',destination:'viewing_options'
      };
    }
    const weather=data?.weather||{};
    const spectatorSamples=usableSkySamples(data);
    const weatherUsable=['assessed','partial'].includes(weather.level)&&
      spectatorSamples.length>0&&d.status!=='stale';
    if(weatherUsable&&publicCandidates.length>0)return {
      gate:'sky',headline:'Compare the mission-time spectator sky',
      detail:'The schedule is precise and documented public viewing candidates exist. NWS forecast samples now inform the next choice, but do not prove event admission, pad sightlines or visibility along the rocket’s flight path.',
      label:'Compare NWS reference forecasts below',href:'#rl-regional-sky',
      source:'in_page',destination:'spectator_weather'
    };
    if(kscMatched)return handoff('viewing','KSC has published a mission-linked viewing event',
      'An independently matched KSC event listing is supported. Tickets, actual admission, available viewing locations and any launch-specific closure remain unverified. Compare the options rather than assuming an open gate.',
      'Compare Florida event and public viewing options');
    return handoff('viewing','Compare documented public viewing candidates',
      'Published places are mapped candidates, not confirmed open for this launch. No usable mission-time spectator forecast is established; inspect the local alternatives and their official restrictions.',
      'Compare public viewpoints and access rules');
  }

  function mount(doc) {
    if(!doc?.getElementById)return null;
    const $=id=>doc.getElementById(id),box=$('rl-flight-desk');
    if(!box)return null;
    const picker=$('rl-flight-mission-select');
    const mapButton=$('rl-flight-locate');
    const official=$('rl-flight-official');
    const specialist=$('rl-flight-specialist');
    const nextLink=$('rl-flight-next-link');
    let current=null,kscEvent='unknown',kscLaunchId=null;
    // The government-source hero photo is historical context. It must never
    // leave a giant broken panel or cover the actual mission decision.
    const photo=doc.querySelector?.('.rl-hero-photo img');
    const photoPanel=photo?.closest?.('.rl-hero-photo');
    const hero=photo?.closest?.('.rl-hero');
    const imageUnavailable=()=>{
      if(photoPanel)photoPanel.hidden=true;
      if(hero)hero.dataset.photoUnavailable='true';
    };
    if(photo){
      photo.addEventListener('error',imageUnavailable);
      if(photo.complete&&photo.naturalWidth===0)imageUnavailable();
    }
    const set=(id,v)=>{const el=$(id);if(el)el.textContent=String(v??'—');};
    function render(data) {
      if(current?.selectedLaunchId!==data?.selectedLaunchId){kscEvent='unknown';kscLaunchId=null;}
      current=data;
      const d=decide(data);
      box.dataset.status=d.status;
      box.dataset.launchId=d.launchId||'';
      box.dataset.region=d.region||'';
      set('rl-flight-region',d.regionName);
      set('rl-flight-mission',d.name);
      set('rl-flight-headline',d.headline);
      set('rl-flight-note',d.note);
      set('rl-flight-time',d.when);
      set('rl-flight-origin',d.origin);
      set('rl-flight-access',d.access);
      set('rl-flight-sky',d.sky);
      set('rl-flight-source',d.source);
      const next=nextCheck(data,{kscEvent,kscLaunchId});
      box.dataset.nextGate=next.gate;
      set('rl-flight-next-title',next.headline);
      set('rl-flight-next-detail',next.detail);
      if(nextLink){
        nextLink.textContent=next.label;
        nextLink.setAttribute('href',next.href);
        nextLink.dataset.nextSource=next.source;
        nextLink.dataset.evidenceStage=next.gate;
        nextLink.dataset.destinationCategory=next.destination;
        if(next.source==='authority'||next.source==='nasa'){
          nextLink.setAttribute('target','_blank');
          nextLink.setAttribute('rel','noopener noreferrer');
        }else{
          nextLink.removeAttribute('target');
          nextLink.removeAttribute('rel');
        }
      }
      if(mapButton){
        mapButton.disabled=!d.launchId;
        mapButton.setAttribute('aria-label',d.launchId?'Locate the selected launch '+d.name+' on the map':'No selected rocket location available');
      }
      if(official){
        official.hidden=!d.official;
        if(d.official)official.href=d.official;
      }
      if(specialist){
        // The Foundry's contextual next action already links to this regional
        // guide in access-gated states. Do not repeat the same destination
        // immediately underneath it as a second ambiguous call to action.
        specialist.hidden=!d.specialist||next.source==='specialist';
        if(d.specialist)specialist.href=d.launchId?
          d.specialist+'?launchId='+encodeURIComponent(d.launchId):d.specialist;
      }
      if(!picker)return;
      const region=data?.regions?.find(r=>r.id===d.region);
      const launches=(region?.launches||[]).filter(l=>typeof l.id==='string'&&
        /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(l.id));
      picker.replaceChildren();
      if(!launches.length){
        const o=doc.createElement('option');o.value='';o.textContent=
          data?'No mission in this region’s bounded feed':'Schedule unavailable';
        picker.appendChild(o);picker.disabled=true;return;
      }
      for(const l of launches){
        const o=doc.createElement('option');o.value=l.id;o.textContent=l.name||'Scheduled mission';
        picker.appendChild(o);
      }
      picker.disabled=false;
      if(d.launchId&&launches.some(l=>l.id===d.launchId))picker.value=d.launchId;
    }
    picker?.addEventListener('change',()=>{
      const id=picker.value;
      const region=current?.selectedRegion;
      const valid=current?.regions?.find(r=>r.id===region)?.launches?.some(l=>l.id===id);
      if(valid)doc.dispatchEvent(new CustomEvent('rocket-experience:choose',{detail:{launchId:id,region}}));
    });
    mapButton?.addEventListener('click',()=>{
      const d=decide(current);
      if(!d.launchId)return;
      doc.dispatchEvent(new CustomEvent('rocket-experience:locate',{detail:{launchId:d.launchId,region:d.region}}));
    });
    doc.addEventListener('rocket-viewing:data',event=>render(event.detail));
    doc.addEventListener('rocket-viewing:ksc-evidence',event=>{
      if(event.detail?.region!=='florida'||!current||
         event.detail.launchId!==current.selectedLaunchId)return;
      kscEvent=event.detail.status;
      kscLaunchId=event.detail.launchId;
      render(current);
    });
    doc.addEventListener('rocket-viewing:failure',event=>{
      render(null);
      if(event.detail?.removed===true){
        set('rl-flight-headline','The selected mission is no longer listed');
        set('rl-flight-note','This exact mission could not be restored. No different launch has been substituted. Check the official range for updates.');
        set('rl-flight-next-title','Recheck this removed mission with the range');
      }
    });
    render(null);
    return {render,decision:()=>decide(current)};
  }
  const api=Object.freeze({decide,target,nextCheck,regionalHref,mount});
  root.RocketFlightDesk=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')
      document.addEventListener('DOMContentLoaded',()=>mount(document),{once:true});
    else mount(document);
  }
})(typeof window!=='undefined'?window:globalThis);
