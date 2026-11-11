/* B85: bounded GA4 navigation and itinerary signals for existing U.P. waterfall tools.
 * No network endpoint, cookie, local/session storage, IDs, full URLs, dates or coordinates.
 * Existing production Google tag owns consent/transport; this file emits ONLY if gtag exists.
 * Metric events describe user actions and source-gated planning, NOT confirmed park visits.
 */
(function(){
  'use strict';
  const VERSION='1';
  const REGIONS=Object.freeze({
    'munising-day':'munising',
    'presque-isle-outing':'presque_isle',
    'keweenaw-waterfall-day':'keweenaw',
    'black-river-waterfall-day':'black_river'
  });
  const GROUPS=Object.freeze({
    munising:Object.freeze(['wagner-falls','miners-falls','elliot-falls','chapel-falls']),
    presque_isle:Object.freeze(['nawadaha-falls','manido-falls','manabezho-falls']),
    keweenaw:Object.freeze(['eagle-river-falls','haven-falls','manganese-falls']),
    black_river:Object.freeze(['great-conglomerate-falls','potawatomi-falls','gorge-falls','rainbow-falls','sandstone-falls'])
  });
  const FROM_FALL=new Map(Object.entries(GROUPS).flatMap(([region,ids])=>ids.map(id=>[id,region])));
  const PRESETS=Object.freeze({
    shoreline:'munising',forest:'munising',
    overlook:'presque_isle',circuit:'presque_isle',
    'keweenaw-parks':'keweenaw','keweenaw-gorge':'keweenaw',
    'black-river-one':'black_river','black-river-corridor':'black_river'
  });
  const OUTCOMES=new Set(['blocked','added','already_saved']);
  const ACTIONS=new Set(['sheet_open','copy_notes_click','copy_link_click','print_click']);
  function classifyLink(kind,href) {
    if(typeof href!=='string')return null;
    const [url,hash]=href.split('#',2);
    if(kind==='regional' && !url && Object.hasOwn(REGIONS,hash||''))return REGIONS[hash];
    if(kind==='regional' && url==='/upper-peninsula-waterfalls/'&&Object.hasOwn(REGIONS,hash||''))return REGIONS[hash];
    if(kind==='guide'){
      const m=/^\/upper-peninsula-waterfalls\/([a-z0-9-]+)\/$/.exec(url);
      return m ? FROM_FALL.get(m[1])||null : null;
    }
    if(kind==='focus'){
      const m=/^\/upper-peninsula-waterfalls\/\?focus=([a-z0-9-]+)$/.exec(url);
      return hash==='falls-map'&&m ? FROM_FALL.get(m[1])||null : null;
    }
    return null;
  }
  function eventPayload(region,extra) {
    if(!Object.values(REGIONS).includes(region))return null;
    const data={wf_region:region,wf_version:VERSION,...extra};
    return data;
  }
  function emit(name,payload) {
    if(!payload)return false;
    if(typeof window==='undefined'||typeof window.gtag!=='function')return false;
    try{window.gtag('event',name,{...payload,transport_type:'beacon'});return true;}
    catch(_){return false;}
  }
  function plan(preset,outcome,added) {
    const region=PRESETS[preset];
    if(!region||!OUTCOMES.has(outcome))return false;
    const count=Number.isInteger(added)&&added>=0&&added<=6?added:0;
    return emit('waterfall_plan_apply',eventPayload(region,{
      wf_variant:preset.replace(/-/g,'_'),
      wf_outcome:outcome,
      wf_stops_added:outcome==='added'?count:0
    }));
  }
  function mapFocus(id,success) {
    const region=FROM_FALL.get(id);
    return emit('waterfall_map_focus',eventPayload(region,{
      wf_surface:'map_deep_link',wf_outcome:success===true?'selected':'unavailable'
    }));
  }
  if(typeof module!=='undefined'&&module.exports)
    module.exports={VERSION,REGIONS,GROUPS,PRESETS,classifyLink,eventPayload,plan,mapFocus};
  if(typeof document==='undefined'||typeof window==='undefined')return;
  window.UPWaterfallMetrics=Object.freeze({plan,mapFocus});
  document.addEventListener('click',event=>{
    const target=event.target;
    if(!target||typeof target.closest!=='function')return;
    const link=target.closest('a[href]');
    if(link){
      const href=link.getAttribute('href')||'';
      let surface='';
      if(link.matches('.fall-cluster-jump'))surface='hub_jump';
      else if(link.matches('.fall-card-region-link'))surface='waterfall_card';
      else if(link.matches('.fall-guide-region-primary'))surface='guide_bridge';
      else if(link.matches('.waterfall-popup-cluster-link'))surface='map_popup';
      if(surface){
        const region=classifyLink('regional',href);
        emit('waterfall_region_open',eventPayload(region,{wf_surface:surface}));
        return;
      }
      if(link.closest('.fall-guide-region-actions')&&href.includes('?focus=')){
        const region=classifyLink('focus',href);
        emit('waterfall_map_request',eventPayload(region,{wf_surface:'guide_bridge'}));
        return;
      }
      if(link.closest('.waterfall-card')&&link.closest('.card-aux')){
        const region=classifyLink('guide',href);
        emit('waterfall_guide_open',eventPayload(region,{wf_surface:'waterfall_card'}));
        return;
      }
      if(link.closest('.leaflet-popup-content')&&link.textContent?.trim()==='Read visit guide'){
        const region=classifyLink('guide',href);
        emit('waterfall_guide_open',eventPayload(region,{wf_surface:'map_popup'}));
      }
      return;
    }
    const button=target.closest('button');
    if(!button)return;
    const sheet=document.getElementById('upfall-day-sheet');
    if(!sheet)return;
    let action='';
    if(button.id==='open-day-sheet'&&!sheet.hidden)action='sheet_open';
    else if(button.closest('.day-sheet-actions')){
      const name=button.textContent?.trim();
      if(name==='Copy trip notes')action='copy_notes_click';
      else if(name==='Copy shareable link')action='copy_link_click';
      else if(name==='Print day sheet')action='print_click';
    }
    if(!ACTIONS.has(action))return;
    // Sheet actions may include falls from multiple regions. We deliberately emit
    // no region/stop identities rather than misleadingly attributing them.
    const count=Math.min(6,document.querySelectorAll('#selected-list .selected-stop').length);
    emit('waterfall_day_sheet_action',{wf_action:action,wf_stop_count:count,wf_version:VERSION});
  });
})();