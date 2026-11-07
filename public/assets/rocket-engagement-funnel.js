'use strict';
/* Rocket Launch Live: observable decision funnel, not visitor surveillance.
 *
 * Vercel Analytics + the pre-existing GA4 tag only. No new SDK/backend,
 * storage, persistent identifiers, location, pad coordinates, mission UUIDs,
 * mission names, raw destinations, or URL query parameters in event payloads.
 * Only explicit visitor choices count as steps, never auto-selected missions.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.RocketEngagementFunnel=api;
    const run=()=>api.mount(root.document,root);
    if(root.document.readyState==='loading')
      root.document.addEventListener('DOMContentLoaded',run,{once:true});
    else run();
  }
})(typeof window==='object'?window:globalThis,function(){
  const REGIONS=new Set(['california','florida','texas','virginia','alaska','hawaii']);
  const SURFACES=new Set(['flight_desk','native_picker','map_marker','national_board','coast_picker','region_map','national_header','region_links','viewing_card','other']);
  const STATES=new Set(['review','timing','stale','hold','access','unknown','unavailable']);
  const OUTCOMES=new Set(['pad_marker_focused','coast_fallback','mission_request','locate_request']);
  const DESTINATIONS=new Set(['regional_guide','official_access','viewing_options']);
  const PRECISION=new Set(['second','minute','hour','day','date-tbd','month','year']);
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const GUIDE_PATHS=Object.freeze({
    california:'/vandenberg-rocket-launch-viewing/',
    florida:'/national-tools/space-coast-launch/',
    texas:'/starbase-rocket-launch-viewing/',
    virginia:'/wallops-rocket-launch-viewing/',
    alaska:'/kodiak-rocket-launch-viewing/',
    hawaii:'/barking-sands-rocket-launch-viewing/'
  });
  const FIELDS=Object.freeze({
    region:REGIONS,surface:SURFACES,status:STATES,outcome:OUTCOMES,
    destination:DESTINATIONS,precision:PRECISION
  });
  const EVENTS=Object.freeze({
    exposed:['rocket_flight_desk_exposed','Rocket Flight Desk Exposed'],
    chosen:['rocket_mission_selected','Rocket Mission Selected'],
    map:['rocket_map_engaged','Rocket Map Engaged'],
    coast:['rocket_coast_selected','Rocket Coast Selected'],
    next:['rocket_viewing_next_step','Rocket Viewing Next Step'],
    unavailable:['rocket_schedule_unavailable','Rocket Schedule Unavailable']
  });
  function regionOf(v){return REGIONS.has(v)?v:'unknown';}
  function statusOf(v){return STATES.has(v)?v:'unknown';}
  function precisionOf(v){return PRECISION.has(v)?v:'unknown';}
  function safeData(data){
    const out={};
    for(const [key,allowed] of Object.entries(FIELDS)){
      if(allowed.has(data?.[key]))out[key]=data[key];
    }
    return out;
  }
  function emit(win,key,data={}){
    const names=EVENTS[key];
    if(!names)return false;
    const props=safeData(data);
    let sent=false;
    if(typeof win.gtag==='function'){
      try{
        win.gtag('event',names[0],{
          page_family:'rocket_launch_live',feature:'national_flight_desk',
          transport_type:'beacon',...props
        });
        sent=true;
      }catch(_){}
    }
    if(typeof win.va==='function'){
      try{win.va('event',{name:names[1],data:props});sent=true;}catch(_){}
    }
    return sent;
  }
  function guideRegion(url,base){
    try{
      const u=new URL(url,base),b=new URL(base);
      if(u.origin!==b.origin)return null;
      return Object.keys(GUIDE_PATHS).find(k=>u.pathname===GUIDE_PATHS[k])||null;
    }catch(_){return null;}
  }
  function mount(doc,win){
    const desk=doc?.getElementById?.('rl-flight-desk');
    if(!desk||desk.dataset.rocketFunnelMounted==='1')return false;
    desk.dataset.rocketFunnelMounted='1';
    // Use the same harmless Vercel queue contract as tool-engagement.js.
    // Blocked analytics never alters mission selection, scrolling or links.
    win.va=win.va||function(){(win.vaq=win.vaq||[]).push(arguments);};
    let current=null,pending=null,visible=false,exposed=false,errorRecorded=false;
    const pageBase=win.location?.href||'https://chrisizworski.com/national-tools/rocket-launch-live/';
    const state=()=>statusOf(desk.dataset.status);
    function expose(){
      if(exposed||!visible||!current)return;
      exposed=true;
      emit(win,'exposed',{
        region:regionOf(current.selectedRegion),status:state(),
        precision:precisionOf(current.selectedLaunch?.netPrecision)
      });
    }
    if(typeof win.IntersectionObserver==='function'){
      const observer=new win.IntersectionObserver(entries=>{
        if(entries.some(e=>e.isIntersecting&&e.intersectionRatio>=0.15)){
          visible=true;expose();observer.disconnect();
        }
      },{threshold:[0,0.15,0.5]});
      observer.observe(desk);
    }else{
      // Conservative browser fallback: a data-loaded desk with no observer
      // does not claim an exposure unless it is in the visible viewport.
      const check=()=>{
        if(exposed||!current)return;
        const rect=desk.getBoundingClientRect?.();
        if(rect&&rect.top<win.innerHeight&&rect.bottom>0){
          visible=true;expose();
        }
      };
      win.addEventListener?.('scroll',check,{passive:true});
      win.addEventListener?.('resize',check,{passive:true});
    }
    function intent(id,region,surface){
      if(!UUID.test(id||'')||!REGIONS.has(region)||!SURFACES.has(surface))return false;
      const list=current?.regions?.find(r=>r.id===region)?.launches||[];
      if(!list.some(l=>l.id===id))return false;
      if(id===current?.selectedLaunchId&&region===current?.selectedRegion)return false;
      pending={id,region,surface};return true;
    }
    doc.addEventListener('rocket-viewing:data',e=>{
      const data=e.detail;
      if(!data?.ok||!REGIONS.has(data.selectedRegion)){
        current=null;pending=null;
        if(!errorRecorded){errorRecorded=true;emit(win,'unavailable',{});}
        return;
      }
      current=data;
      expose();
      if(pending&&pending.id===data.selectedLaunchId&&pending.region===data.selectedRegion){
        emit(win,'chosen',{
          region:pending.region,surface:pending.surface,
          precision:precisionOf(data.selectedLaunch?.netPrecision)
        });
        pending=null;
      }
    });
    // Emitted ONLY by the native hero selector, not a programmatic mission
    // default, URL deep link, or live data refresh.
    doc.addEventListener('rocket-experience:choose',e=>{
      intent(e.detail?.launchId,e.detail?.region,'flight_desk');
    });
    // The national map's callback signals a real popup mission choice.
    doc.addEventListener('rocket-experience:map-choose',e=>{
      if(intent(e.detail?.launchId,e.detail?.region,'map_marker')){
        emit(win,'map',{region:regionOf(e.detail.region),surface:'map_marker',outcome:'mission_request'});
      }
    });
    doc.addEventListener('rocket-experience:region-selected',e=>{
      const region=e.detail?.region;
      if(REGIONS.has(region)&&region!==current?.selectedRegion)
        emit(win,'coast',{region,surface:SURFACES.has(e.detail?.surface)?e.detail.surface:'coast_picker'});
    });
    doc.addEventListener('rocket-experience:locate-result',e=>{
      if(!REGIONS.has(e.detail?.region))return;
      emit(win,'map',{
        region:e.detail.region,surface:'flight_desk',
        outcome:e.detail.focused===true?'pad_marker_focused':'coast_fallback'
      });
    });
    doc.addEventListener('change',e=>{
      if(e.target?.id!=='rl-launch-select')return;
      intent(e.target.value,current?.selectedRegion,'native_picker');
    },true);
    doc.addEventListener('click',e=>{
      const el=e.target?.closest?.('a[href],button');
      if(!el)return;
      if(el.matches?.('.rl-map-locate')){
        const region=el.dataset.region,id=el.dataset.launchId;
        if(intent(id,region,'national_board'))
          emit(win,'map',{region,surface:'national_board',outcome:'locate_request'});
        return;
      }
      if(el.tagName!=='A')return;
      const href=el.getAttribute('href')||'';
      let destination=null,surface='other';
      if(el.id==='rl-flight-specialist'&&guideRegion(href,pageBase)){
        destination='regional_guide';surface='flight_desk';
      }else if(el.id==='rl-flight-official'&&/^https:\/\//i.test(href)){
        destination='official_access';surface='flight_desk';
      }else if(desk.contains(el)&&href==='#rl-viewing'){
        destination='viewing_options';surface='flight_desk';
      }else if(el.closest('#rl-region-links')){
        destination=guideRegion(href,pageBase)?'regional_guide':'official_access';
        surface='region_links';
      }else if(el.closest('.rl-site-actions')&&el.classList.contains('rl-mainlink')){
        destination=guideRegion(href,pageBase)?'regional_guide':'official_access';
        surface='viewing_card';
      }else if(el.closest('.rl-topbar')&&guideRegion(href,pageBase)){
        destination='regional_guide';surface='national_header';
      }
      if(destination)emit(win,'next',{
        region:regionOf(current?.selectedRegion),surface,destination
      });
    },true);
    return true;
  }
  return Object.freeze({mount,emit,safeData,guideRegion,EVENTS,GUIDE_PATHS});
});