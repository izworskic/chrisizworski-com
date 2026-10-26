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
  const officialLink = 'https://www.ontarioparks.ca/park/lakesuperior/maps';
  const text = (node, value) => { if (node) node.textContent = value; };
  const verified = item => Boolean(item.siteCoordinateVerified && Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  const link = (url, label) => { const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';return a; };
  const searchUrl = item => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(item.latitude+','+item.longitude);
  const visible = item => !item.mapCardId || !document.querySelector('.card[data-id="'+item.mapCardId+'"]')?.hidden;
  const compact = id => catalog?.locations.find(item => item.id === id) || null;
  const allowedAsWaypoint = item => Boolean(verified(item) && item.drivingWaypointConfidence==='official_destination' && !item.closed2026);
  function createPopup(item){
    const popup=document.createElement('div');popup.className='lspp-map-popup';
    const title=document.createElement('strong'); title.textContent=item.name;
    const evidence=document.createElement('p');
    evidence.textContent=item.coordinateClass==='official_geotour_stop_location_not_parking'
      ? 'Government GeoTour landmark coordinate. NOT a parking location. Agawa Rock Trail closed for 2026. No directions offered.'
      : 'Official park / geological survey destination coordinates. NOT a verified individual parking stall or proof of current access.';
    popup.append(title,evidence);
    const note=document.createElement('p');note.textContent=item.parkingInfrastructure;popup.append(note);
    const source=document.createElement('p');
    source.append(link(catalog.canonicalSources[item.sourceKeys[0]]||officialLink,'See authoritative source'));popup.append(source);
    if(allowedAsWaypoint(item)){
      const nav=document.createElement('p');nav.append(link(searchUrl(item),'View official destination point on Google Maps'));popup.append(nav);
    }
    if(item.mapCardId) {
      const button=document.createElement('button');button.type='button';button.className='secondary-button';
      button.textContent='Read stop access details';
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
    const located=catalog.locations.filter(item=>verified(item) && visible(item));
    located.forEach(item=>{const marker=makeMarker(item).addTo(map);markers.push(marker);});
    text(document.getElementById('pin-count'),located.length+' officially located destinations shown; zero exact parking-stall pins verified');
  }
  function displaySources(){
    list.replaceChildren();
    catalog.locations.filter(verified).forEach(item=>{
      const li=document.createElement('li');
      const name=document.createElement('strong');name.textContent=item.name+' — ';
      li.append(name);
      const cls=document.createElement('span'); cls.textContent=item.id==='agawa'?'government landmark, no navigation':'official destination location, not a parking stall'; li.append(cls);
      li.append(document.createTextNode(' · '));
      li.append(link(catalog.canonicalSources[item.sourceKeys[0]]||officialLink,'source'));
      if(allowedAsWaypoint(item)){li.append(document.createTextNode(' · '));li.append(link(searchUrl(item),'map point')); }
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
      note.textContent='A multi-stop route needs at least two planner stops with officially located destination coordinates. No estimated drive time or road-opening claim is provided.';
      travel.append(note);return;
    }
    const north=document.getElementById('direction')?.value==='north';
    // Use official site latitudes for north/south ordering; missing highway-km labels must never be cast to zero.
    eligible.sort((a,b)=>(a.latitude-b.latitude)*(north?1:-1));
    const params=new URLSearchParams({api:'1',origin:eligible[0].latitude+','+eligible[0].longitude,destination:eligible[eligible.length-1].latitude+','+eligible[eligible.length-1].longitude,travelmode:'driving'});
    if(eligible.length>2)params.set('waypoints',eligible.slice(1,-1).map(x=>x.latitude+','+x.longitude).join('|'));
    const title=document.createElement('strong');title.textContent='Official destination-coordinate route ('+eligible.length+' stops)';travel.append(title);
    const note2=document.createElement('p');note2.textContent='This opens an external driving-map preview. Coordinates identify day-use areas or facilities—not confirmed parking entrances. Seasonal access and road status are unverified.';travel.append(note2);
    if(rejected.length){const omitted=document.createElement('p');omitted.textContent='Not routed: '+rejected.map(x=>x.name).join(', ')+' (closed, unlocated or parking/route confidence insufficient).';travel.append(omitted);}
    const a=link('https://www.google.com/maps/dir/?'+params.toString(),'Inspect route in Google Maps');a.className='primary lspp-route-link';travel.append(a);
    const switcher=document.getElementById('season');
    if(switcher?.value==='current'){
      const seasonal=document.createElement('p');seasonal.textContent='Warning: the 2026 park day-use season has ended. This is not a recommendation to travel now.';travel.append(seasonal);
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
      if(completed>=3)text(status,fallback?'OpenStreetMap fallback displayed. All mapped points remain official destination references.':'CARTO basemap is loading. Pin locations come from Ontario Parks and the Ontario government GeoTour.');
    });
    item.on('tileerror',()=>{
      if(layer!==item)return;
      failed+=1;
      if(failed>=2){
        if(!fallback)useFallback();
        else text(status,'Map tiles unavailable. Use the location source list and official park maps below.');
      }
    });
    item.addTo(map);
    setTimeout(()=>{if(layer===item && completed<2){if(!fallback)useFallback();else text(status,'Basemap could not be verified. The primary-source list is still available.');}},8000);
  }
  function useFallback(){
    if(fallbackStarted)return;
    fallbackStarted=true;
    text(status,'CARTO unavailable; loading OpenStreetMap fallback.');
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
      document.getElementById('season')?.addEventListener('change',buildRoute);
    }catch{
      text(status,'Access evidence or map unavailable; follow Ontario Parks source links and do not assume any road or trail is open.');
    }
  }
  boot();
})();