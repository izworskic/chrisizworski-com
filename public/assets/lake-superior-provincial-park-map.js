/* Lake Superior Provincial Park: source-qualified place map, NOT a live access map.
 * Dated Ontario Parks / Ontario Geotour coordinates are location references only.
 * Never present an attraction coordinate as a verified parking stall or drive route.
 */
(() => {
  'use strict';
  const el = document.getElementById('access-map');
  const status = document.getElementById('access-map-status');
  const travel = document.getElementById('verified-drive-route');
  const list = document.getElementById('verified-location-list');
  if (!el || !status || !list) return;
  let map = null, layer = null, markers = [], catalog = null, lastPlan = [];
  let fallbackStarted = false;
  const SNAPSHOT_VALID_DAYS = 30;
  function sourceAgeDays() {
    if (!catalog?.researchedAt) return Infinity;
    const ts=Date.parse(catalog.researchedAt+'T12:00:00Z');
    return Number.isFinite(ts) ? Math.max(0,(Date.now()-ts)/86400000) : Infinity;
  }
  function accessEvidenceFresh(){return sourceAgeDays()<=SNAPSHOT_VALID_DAYS;}
  function showFreshnessWarning(){
    let warning=document.getElementById('source-expiry-warning');
    if(!warning)return;
    warning.hidden=accessEvidenceFresh();
    if(!warning.hidden)warning.textContent='A note before you travel: these park access notes are now more than 30 days old. The places and their stories are still here to explore, but driving links are paused until Ontario Parks alerts and operating dates are checked again. Please consult the official notices below.';
  }
  const officialLink = 'https://www.ontarioparks.ca/park/lakesuperior/maps';
  const text = (node, value) => { if (node) node.textContent = value; };
  const verified = item => Boolean(item.siteCoordinateVerified && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  const link = (url, label) => { const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';return a; };
  // Universal Google Maps links: no starting address is supplied, so Google Maps
  // can offer the visitor their own current location as a starting point.
  // Destination coordinates indicate an official site/area, NEVER a surveyed parking stall.
  const searchUrl = item => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(item.latitude+','+item.longitude);
  const directionsUrl = item => {
    const params=new URLSearchParams({api:'1',destination:item.latitude+','+item.longitude,travelmode:'driving'});
    return 'https://www.google.com/maps/dir/?'+params.toString();
  };
  const visible = item => !item.mapCardId || !document.querySelector('.card[data-id="'+item.mapCardId+'"]')?.hidden;
  const compact = id => catalog?.locations.find(item => item.id === id) || null;
  const allowedAsWaypoint = item => Boolean(accessEvidenceFresh() && document.getElementById('season')?.value==='future' && verified(item) && item.drivingWaypointConfidence==='official_destination' && !item.closed2026);
  function createPopup(item){
    const popup=document.createElement('div');popup.className='lspp-map-popup';
    const title=document.createElement('strong'); title.textContent=item.name;
    const evidence=document.createElement('p');
    evidence.textContent=item.coordinateClass==='official_geotour_stop_location_not_parking'
      ? 'This pin shows the Agawa Rock landmark, not a parking entrance. The pictograph trail is closed for the 2026 season. Please honour this sacred place and the closure; no driving directions are offered.'
      : 'This pin shows where the destination lies along the shore. It does not mark an independently verified parking stall or mean the road and facilities are open.';
    popup.append(title,evidence);
    const note=document.createElement('p');note.textContent=item.parkingInfrastructure;popup.append(note);
    // Every government-located map bubble has a Google Maps location link.
    // Driving directions are offered only for future-season, source-fresh, nonclosed
    // official destinations. Agawa Rock is intentionally a view-only sacred-site marker.
    if(verified(item)){
      const actions=document.createElement('div');actions.className='lspp-map-actions';
      if(allowedAsWaypoint(item)){
        const drive=link(directionsUrl(item),'Get driving directions in Google Maps');
        drive.className='lspp-google-directions';
        drive.setAttribute('aria-label','Get driving directions to '+item.name+' in Google Maps');
        actions.append(drive);
      }
      const place=link(searchUrl(item),item.closed2026?'View the closed site on Google Maps':'View location on Google Maps');
      place.className='lspp-google-place';
      place.setAttribute('aria-label','View '+item.name+' on Google Maps');
      actions.append(place);
      popup.append(actions);
      if(!allowedAsWaypoint(item)){
        const caution=document.createElement('p');caution.className='lspp-map-direction-note';
        caution.textContent=item.closed2026
          ? 'This place is closed for 2026. You can look at the location on the map, but directions to the site are not offered.'
          : !accessEvidenceFresh()
            ? 'Driving directions are paused until the park’s access notes are reviewed again.'
            : 'For driving directions, switch the planner above to a future operating season and check Ontario Parks before travelling.';
        popup.append(caution);
      }
    }
    const source=document.createElement('p');
    source.append(link(catalog.canonicalSources[item.sourceKeys[0]]||officialLink,'Read the official location notes'));popup.append(source);
    if(item.mapCardId) {
      const button=document.createElement('button');button.type='button';button.className='secondary-button';
      button.textContent='Explore this place';
      button.addEventListener('click',()=>{
        const card=document.querySelector('.card[data-id="'+item.mapCardId+'"]');
        if(!card)return;
        card.hidden=false;
        card.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
        card.querySelector('summary')?.focus({preventScroll:true});map?.closePopup();
      });
      popup.append(button);
    }
    return popup;
  }
  function makeMarker(item){
    const closed=item.closed2026;
    const icon=window.L.divIcon({
      className:'lspp-map-icon',html:'<span class="lspp-map-pin '+(closed?'is-closed':'')+'" aria-hidden="true"></span>',
      iconSize:[23,23],iconAnchor:[11,11],popupAnchor:[0,-8]
    });
    const marker=window.L.marker([item.latitude,item.longitude],{icon,title:item.name});
    marker.bindPopup(createPopup(item));
    return marker;
  }
  function showMarkers(){
    if(!map||!catalog)return;
    markers.forEach(m=>map.removeLayer(m));markers=[];
    const located=catalog.locations.filter(verified); // show closed sites in red as map evidence even when itinerary filters exclude them
    located.forEach(item=>{const marker=makeMarker(item).addTo(map);markers.push(marker);});
    text(document.getElementById('pin-count'),located.length+' places marked using Ontario government locations · parking entrances not individually verified');
  }
  function displaySources(){
    list.replaceChildren();
    catalog.locations.filter(verified).forEach(item=>{
      const li=document.createElement('li');
      const name=document.createElement('strong');name.textContent=item.name+' — ';
      li.append(name);
      const cls=document.createElement('span'); cls.textContent=item.id==='agawa'?'sacred site, closed; no driving pin':'official destination area; parking entrance not confirmed'; li.append(cls);
      li.append(document.createTextNode(' · '));
      li.append(link(catalog.canonicalSources[item.sourceKeys[0]]||officialLink,'official record'));
      if(allowedAsWaypoint(item)){li.append(document.createTextNode(' · '));li.append(link(searchUrl(item),'see on map')); }
      list.append(li);
    });
  }
  function buildRoute(){
    if(!travel)return;
    travel.replaceChildren();
    const note=document.createElement('p');
    const planned=lastPlan.map(compact).filter(Boolean);
    const eligible=planned.filter(allowedAsWaypoint);
    const rejected=planned.filter(x=>!allowedAsWaypoint(x));
    if(eligible.length<2){
      note.textContent='Once your future-season plan includes at least two places with verified destination locations, we can show how they line up along the highway. We will not guess at drive times or whether a road is open.';
      travel.append(note);return;
    }
    const north=document.getElementById('direction')?.value==='north';
    // Use official site latitudes for north/south ordering; missing highway-km labels must never be cast to zero.
    eligible.sort((a,b)=>(a.latitude-b.latitude)*(north?1:-1));
    const params=new URLSearchParams({api:'1',origin:eligible[0].latitude+','+eligible[0].longitude,destination:eligible[eligible.length-1].latitude+','+eligible[eligible.length-1].longitude,travelmode:'driving'});
    if(eligible.length>2)params.set('waypoints',eligible.slice(1,-1).map(x=>x.latitude+','+x.longitude).join('|'));
    const title=document.createElement('strong');title.textContent='A possible drive along the shore ('+eligible.length+' stops)';travel.append(title);
    const note2=document.createElement('p');note2.textContent='Explore this route in an external map before your trip. The points identify park destinations, not confirmed parking entrances. Please check seasonal road access with Ontario Parks before setting off.';travel.append(note2);
    if(rejected.length){const omitted=document.createElement('p');omitted.textContent='Not included in the driving preview: '+rejected.map(x=>x.name).join(', ')+'. These places are closed or lack sufficiently reliable routing coordinates.';travel.append(omitted);}
    const a=link('https://www.google.com/maps/dir/?'+params.toString(),'See the possible drive in Google Maps');a.className='primary lspp-route-link';travel.append(a);
    const switcher=document.getElementById('season');
    if(switcher?.value==='current'){
      const seasonal=document.createElement('p');seasonal.textContent='The 2026 park day-use season has ended. This is a future-trip idea, not a recommendation to enter the park now.';travel.append(seasonal);
    }
  }
  function tile(url,attribution,fallback){
    if(!map)return;
    if(layer)map.removeLayer(layer);
    const item=window.L.tileLayer(url,{attribution,maxZoom:18,subdomains:'abcd'});
    layer=item;
    let completed=0,failed=0;
    item.on('tileload',()=>{
      if(layer!==item)return;
      completed+=1;
      if(completed>=3)text(status,fallback?'OpenStreetMap fallback is showing the shoreline. Pins still represent official destination locations, not parking entrances.':'The shore map is coming into view. Destination pins come from Ontario Parks and Ontario’s government GeoTour.');
    });
    item.on('tileerror',()=>{
      if(layer!==item)return;
      failed+=1;
      if(failed>=2){
        if(!fallback)useFallback();
        else text(status,'The map image is unavailable just now. You can still find every documented place through the official park maps and location notes below.');
      }
    });
    item.addTo(map);
    setTimeout(()=>{if(layer===item && completed<2){if(!fallback)useFallback();else text(status,'Map imagery could not be confirmed. The park’s official location records remain available below.');}},8000);
  }
  function useFallback(){
    if(fallbackStarted)return;
    fallbackStarted=true;
    text(status,'The first map could not load; bringing up the OpenStreetMap fallback instead.');
    tile('https://tile.openstreetmap.org/{z}/{x}/{y}.png','&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',true);
  }
  async function tiles(){
    const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),6000);
    try{
      const response=await fetch('/api/carto-basemap-config',{signal:abort.signal,credentials:'same-origin',cache:'no-store'});
      if(!response.ok)throw Error('basemap config unavailable');
      const cfg=await response.json();
      if(cfg.provider!=='CARTO'||typeof cfg.key!=='string'||!cfg.key.trim())throw Error('CARTO config incomplete');
      const base='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key='+encodeURIComponent(cfg.key.trim());
      tile(base,'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',false);
    }catch{useFallback();}
    finally{clearTimeout(timeout);}
  }
  async function boot(){
    try{
      const response=await fetch('/assets/lake-superior-provincial-park-access.json',{cache:'no-store'});
      if(!response.ok)throw Error('access catalog unavailable');
      catalog=await response.json();
      if(!Array.isArray(catalog.locations))throw Error('invalid access catalog');
      showFreshnessWarning();
      displaySources();buildRoute();
      if(typeof window.L==='undefined'){
        text(status,'Map library unavailable. Official coordinates, sources and stop details remain usable below.');return;
      }
      map=window.L.map(el,{scrollWheelZoom:false}).setView([47.55,-84.76],9);
      window.L.control.scale({imperial:false}).addTo(map);
      showMarkers();
      map.fitBounds([[47.32,-84.94],[47.81,-84.58]],{padding:[18,18]});
      if('ResizeObserver'in window)new ResizeObserver(()=>map.invalidateSize()).observe(el);
      window.addEventListener('resize',()=>map.invalidateSize());
      await tiles();
      [document.getElementById('budget'),document.getElementById('effort'),document.getElementById('showClosed')].forEach(el=>el?.addEventListener('change',()=>setTimeout(showMarkers,0)));
      window.addEventListener('lspp:plan-updated',event=>{
        lastPlan=Array.isArray(event.detail?.ids)?event.detail.ids:[];
        buildRoute();showMarkers();
      });
      document.getElementById('direction')?.addEventListener('change',buildRoute);
      document.getElementById('season')?.addEventListener('change',()=>{buildRoute();showMarkers();});
    }catch{
      text(status,'Access evidence or map unavailable; follow Ontario Parks source links and do not assume any road or trail is open.');
    }
  }
  boot();
})();