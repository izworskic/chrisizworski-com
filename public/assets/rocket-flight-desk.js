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
    if(!date)return 'Launch time not announced yet';
    const p=m.netPrecision;
    if(p==='year')return new Intl.DateTimeFormat('en-US',{year:'numeric',timeZone:'UTC'}).format(date)+' · year announced, date to come';
    if(p==='month')return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(date)+' · date still to come';
    const opts={timeZone:TIMED.has(p)?zone||'UTC':'UTC',month:'short',day:'numeric',year:'numeric'};
    if(TIMED.has(p)){opts.hour='numeric';opts.minute='2-digit';opts.timeZoneName='short';}
    const label=new Intl.DateTimeFormat('en-US',opts).format(date);
    return label+(TIMED.has(p)?(p==='hour'?' · hour approximate':' · launch time may change'):' · liftoff time to come');
  }
  function age(iso) {
    const when=asDate(iso);
    return when?new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(when):'Not available';
  }
  // Never promote weather from another launch hour or an aged NWS grid.
  // The server’s existing NWS adapter matches each hourly interval to the
  // selected NET; recheck that contract when deciding the visitor’s next step.
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
      status='unavailable';headline='This coast’s launch calendar is unavailable';
      note='We can’t check this coast’s schedule right now. The range may still have launches planned; check its official updates.';
    }else if(!mission){
      status='unknown';headline='No upcoming launch listed for this coast';
      note='Smaller research flights and military launches don’t always appear on the public calendar.';
    }else if(snapshotStale){
      status='stale';headline='This launch time may have changed';
      note='The calendar hasn’t been refreshed recently. Check the operator’s latest launch announcement before you go.';
    }else if(sourceUnknown){
      status='stale';headline='We can’t confirm the latest launch time';
      note='The calendar update time isn’t available. Check the launch operator before making plans.';
    }else if(hold){
      status='hold';headline='Launch on hold or scrubbed';
      note='The last countdown is no longer a reliable time to show up. Watch for a new launch attempt.';
    }else if(closed){
      status='hold';headline='Starbase reports a beach closure';
      note='Boca Chica may be closed to spectators. Check the city’s dated notice and choose a legal public spot across the water.';
    }else if(uncertainAccess){
      status='access';headline='A launch is listed, but public viewing is uncertain';
      note='These ranges have restricted areas. The launch pad on a map isn’t a place you can drive to.';
    }else if(!hasUsefulTime){
      status='timing';headline='The launch time is still taking shape';
      note='The calendar may only show a day or month. Wait for a more precise target before planning when to arrive.';
    }else{
      status='review';headline='The launch is on the calendar. Now find your spot.';
      note='Find a public place with a good view, check its official access rules and hours, then keep an eye on the countdown and weather.';
    }
    const inRange=Number.isFinite(mission?.lat)&&Number.isFinite(mission?.lon)&&
      Boolean(root.RocketMapPins?.inRegion?.(region,mission.lat,mission.lon));
    const origin=mission?(inRange?
      (mission.pad||'Launch pad')+' · pad location on the map':
      'General launch area · exact pad not confirmed'):'Launch pad not listed';
    const weather=data.weather||{};
    // NWS can report a nominal "partial" envelope even when every individual
    // point lookup failed. Do not advertise an actual forecast without any
    // bounded mission-time location evidence.
    const usableWeather=usableSkySamples(data).length>0;
    const sky=hasUsefulTime&&!snapshotStale&&usableWeather&&weather.level==='assessed'?
      'Viewing-area forecast available · launch still subject to change':
      hasUsefulTime&&!snapshotStale&&usableWeather&&weather.level==='partial'?
        'Some local weather available · visibility still uncertain':
        'No forecast yet for the scheduled launch hour';
    const access=closed?'City reports a closure · check the latest notice':
      uncertainAccess?'No confirmed public launch viewing area':
      region==='florida'?'Check Kennedy tickets and Playalinda Beach closures':
      region==='virginia'?'NASA must announce if the Visitor Center opens for this launch':
      region==='california'?'Check Vandenberg beach hours and launch closures':
      'Beach access may change during launch operations';
    return {
      status,headline,note,launchId:mission?.id||null,
      region,regionName:REGION_NAMES[region],name:mission?.name||'No upcoming launch listed',
      when:mission?target(mission,data.region.timezone):'Launch date not listed',
      origin,access,sky,
      source:'Public launch calendar checked '+age(data.scheduleCheckedAt)+
        (data.coverage?.partial?' · some flights may be missing':'')+
        '. Launch dates and times can move.',
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
      gate:'source',headline:'We can’t confirm the next flight yet',
      detail:'Choose a coast to see upcoming missions. Some military and smaller research flights aren’t listed on national calendars.',
      label:'See NASA’s launch calendar',
      href:'https://www.nasa.gov/event-type/launch-schedule/',source:'nasa',destination:'official_access'
    };
    const rangeLink=authority||specialist;
    const official=(gate,headline,detail,label)=>({
      gate,headline,detail,label,href:rangeLink,
      source:authority?'authority':'specialist',
      destination:authority?'official_access':'regional_guide'
    });
    if(!d.launchId)return official('schedule','Find the latest official launch announcement',
      'The flight you were looking for is no longer on this calendar. It may have moved or disappeared from the feed; that does not mean the range has stopped launching. Check the range before choosing another date.',
      authority?'See the official range updates':'Read the regional source guidance');
    if(d.status==='stale'||d.status==='unavailable')return official('schedule',
      'Check whether the launch time has moved',
      'Our last calendar update may be old. Don’t plan around that time until the operator confirms it.',
      authority?'See the latest range updates':'See the regional launch guide');
    const closed=region==='texas'&&data?.access?.liveOfficialNotice?.state==='closed';
    if(d.status==='hold'){
      if(closed)return handoff('access','Check the latest Starbase road and beach closures',
        'The city has reported a closure. Don’t drive toward the pad; check the notice and consider a legal waterfront spot.',
        'See Starbase closures and viewing spots');
      return official('schedule','The countdown stopped. Watch for the next attempt.',
        'A scrub means the rocket isn’t lifting off at the earlier target time. Check for the next attempt before heading out.',
        authority?'See the range’s latest update':'Read the regional source guidance');
    }
    if(d.status==='timing')return official('schedule','Wait for a more precise liftoff time',
      'A rough date is enough to get excited, not enough to pick an arrival time. Look for a published launch window.',
      authority?'Check the operator’s updates':'See the local viewing guide');
    if(['alaska','hawaii'].includes(region))return handoff('access',
      'Can you watch this launch in person?',
      'This is an active restricted range, and we haven’t confirmed a public spectator area for this mission. Don’t follow the pad pin onto base property.',
      'Check public access at this range');
    const sites=Array.isArray(data?.access?.sites)?data.access.sites:[];
    const publicCandidates=sites.filter(s=>
      s?.state==='candidate'&&s.directionsAllowed!==false&&
      typeof s.source==='string'&&/^https:\/\//.test(s.source));
    const kscMatched=region==='florida'&&context.kscEvent==='matched'&&
      context.kscLaunchId===d.launchId;
    const venuesDocumented=publicCandidates.length>0||kscMatched;
    if(!venuesDocumented)return handoff('access','Find a public place to watch',
      'The rocket may be flying even if the usual park or beach is closed. Our local guide shows known public spots and what to check before you go.',
      'See public viewing options');
    if(region==='florida'&&publicCandidates.length){
      const names=data.selectedLaunch?.locationId===12?
        'Jetty Park in Port Canaveral and Space View Park in Titusville':
        data.selectedLaunch?.locationId===27?
          'Space View Park and Rotary Riverfront Park in Titusville':
          'Space View Park in Titusville and Jetty Park in Port Canaveral (pad identity not established)';
      return {
        gate:'viewing',headline:'Pick your place along the Florida coast',
        detail:'Places to consider include '+names+'. Check each location’s opening hours, parking and any launch-specific restrictions before setting out.',
        label:'Compare Florida viewing spots',href:'#rl-viewing',
        source:'in_page',destination:'viewing_options'
      };
    }
    const weather=data?.weather||{};
    const spectatorSamples=usableSkySamples(data);
    const weatherUsable=['assessed','partial'].includes(weather.level)&&
      spectatorSamples.length>0&&d.status!=='stale';
    if(weatherUsable&&publicCandidates.length>0)return {
      gate:'sky',headline:'Which viewing spot has a better sky?',
      detail:'With a published launch time and known public viewing areas, you can compare nearby cloud forecasts. Fog, the flight path and venue restrictions still matter; a weather forecast does not prove that a viewing site is open.',
      label:'Compare the viewing-area forecasts',href:'#rl-regional-sky',
      source:'in_page',destination:'spectator_weather'
    };
    if(kscMatched)return handoff('viewing','Kennedy has announced viewing for this launch',
      'Kennedy has a listing for this exact mission. Check ticket availability, entrance details, and any launch-day changes before buying or driving.',
      'See Kennedy tickets and Florida viewing spots');
    return handoff('viewing','Compare places to see the launch',
      'These places appear in published viewing guides, but we haven’t confirmed they’re open for this flight. See your options and check the local rules.',
      'See viewing spots and access notes');
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
        mapButton.setAttribute('aria-label',d.launchId?'Locate the selected launch '+d.name+' on the map':'No launch location selected');
      }
      if(official){
        official.hidden=!d.official;
        if(d.official)official.href=d.official;
      }
      if(specialist){
        // The Foundry’s contextual next action already links to this regional
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
          data?'No upcoming launch listed here':'Launch calendar unavailable';
        picker.appendChild(o);picker.disabled=true;return;
      }
      for(const l of launches){
        const o=doc.createElement('option');o.value=l.id;o.textContent=l.name||'Upcoming launch';
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
        set('rl-flight-headline','That mission is no longer on the calendar');
        set('rl-flight-note','That flight has disappeared from the latest listings. We haven’t switched you to a different rocket; check the operator for a new date.');
        set('rl-flight-next-title','Check the operator for an update');
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
