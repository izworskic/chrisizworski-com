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
  function decide(data) {
    const region=data?.region?.id;
    const mission=data?.selectedLaunch&&data.selectedLaunch.region===region?data.selectedLaunch:null;
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
    const usableWeather=Array.isArray(weather.places)&&weather.places.some(p=>
      p?.status==='ok'&&Boolean(p.period?.startTime||p.period?.shortForecast||
        (p.cloudStatus==='ok'&&Number.isInteger(p.cloudCoverPercent))));
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
  function mount(doc) {
    if(!doc?.getElementById)return null;
    const $=id=>doc.getElementById(id),box=$('rl-flight-desk');
    if(!box)return null;
    const picker=$('rl-flight-mission-select');
    const mapButton=$('rl-flight-locate');
    const official=$('rl-flight-official');
    const specialist=$('rl-flight-specialist');
    let current=null;
    const set=(id,v)=>{const el=$(id);if(el)el.textContent=String(v??'—');};
    function render(data) {
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
      if(mapButton){
        mapButton.disabled=!d.launchId;
        mapButton.setAttribute('aria-label',d.launchId?'Locate the selected launch '+d.name+' on the map':'No selected rocket location available');
      }
      if(official){
        official.hidden=!d.official;
        if(d.official)official.href=d.official;
      }
      if(specialist){
        specialist.hidden=!d.specialist;
        if(d.specialist)specialist.href=d.specialist+
          (d.launchId&&d.region!=='california'?'?launchId='+encodeURIComponent(d.launchId):'');
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
    render(null);
    return {render,decision:()=>decide(current)};
  }
  const api=Object.freeze({decide,target,mount});
  root.RocketFlightDesk=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')
      document.addEventListener('DOMContentLoaded',()=>mount(document),{once:true});
    else mount(document);
  }
})(typeof window!=='undefined'?window:globalThis);
