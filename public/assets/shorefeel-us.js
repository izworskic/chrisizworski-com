window.startLegacyShoreFeel=function(){
  'use strict';
  // The EPA BEACH Act source list is a local, pinned 2025 snapshot. Its mapped
  // lines are places, not proof of a current open beach or a safe swim.
  const EPA_MAP='https://beacon.epa.gov/ords/beacon2/r/beacon_apex/beacon2/map-page';
  const SOURCE_AUTHORITIES={
    MI:['Michigan BeachGuard','https://mienviro.michigan.gov/nsite/beach/map/results'],
    MN:['Minnesota Lake Superior Beach Monitoring Program','https://mnbeaches.org/'],
    WI:['Wisconsin Beach Health','https://apps.dnr.wi.gov/beachhealth/'],
    IL:['Illinois BeachGuard','https://idph.illinois.gov/envhealth/ilbeaches/public/'],
    IN:['Indiana IDEM BeachAlert','https://portal.idem.in.gov/beachalert/'],
    OH:['Ohio BeachGuard','https://odh.ohio.gov/know-our-programs/bathing-beach-monitoring/BeachGuard'],
    PA:['Erie County Beach Water Testing','https://eriecountypa.gov/departments/health/services-and-programs/health-and-wellness/beach-water-testing-results/'],
    NY:['New York Coastal Beach Water Quality','https://beachadvisory.health.ny.gov/']
  };
  const source=window.ShoreFeelEPACatalog;
  const sourceRows=Array.isArray(source?.records)&&source.records.length<=1500?source.records:[];
  const listRoot=document.getElementById('shore-list');
  const lakeLabel=lake=>lake==='Great Lakes'||!lake?'Great Lakes coastal site (lake not assigned)':'Lake '+lake;
  let sourceAdded=0;
  function addEpaRow(r){
    if(!listRoot||!r||!/^[A-Z]{2}[A-Z0-9]{4,14}$/.test(r.id||'')||
       !SOURCE_AUTHORITIES[r.state]||typeof r.name!=='string'||r.name.length>100||
       typeof r.county!=='string'||r.county.length>70||
       !Number.isFinite(r.lat)||!Number.isFinite(r.lon)||r.lat<40||r.lat>49||
       r.lon< -93||r.lon> -75|| (r.lake&&!['Superior','Michigan','Huron','Erie','Ontario'].includes(r.lake)))return;
    const slug='epa-'+r.id.toLowerCase();
    if(document.querySelector('[data-slug="'+slug+'"]'))return;
    const authority=SOURCE_AUTHORITIES[r.state];
    const li=document.createElement('li');
    li.className='shore-stop';
    Object.assign(li.dataset,{
      slug,lake:r.lake||'Great Lakes',lat:String(r.lat),lon:String(r.lon),
      state:r.state,city:r.county+' County',name:r.name,epaId:r.id,
      story:'This beach is in '+
        r.county+' County, '+r.state+'. Its mapped location is approximate. Check the nearby air forecast and wind before visiting, and follow local guidance on access and swimming.',
      accessAlert:'',coordinateNote:'Approximate beach location, not a verified parking entrance, beach thermometer or swimming boundary',
      safetyUrl:authority[1],safetyName:authority[0],parkUrl:EPA_MAP
    });
    const btn=document.createElement('button');
    btn.type='button';btn.dataset.select=slug;btn.setAttribute('aria-pressed','false');
    const title=document.createElement('span');title.className='shore-stop-name';title.textContent=r.name;
    const meta=document.createElement('span');meta.className='shore-stop-sub';
    meta.textContent=r.county+' County, '+r.state+' · '+lakeLabel(r.lake);
    btn.append(title,meta);
    const links=document.createElement('span');links.className='shore-stop-links';
    const detail=document.createElement('a');
    detail.href='/great-lakes-beaches/around-the-lakes/?beach='+encodeURIComponent(slug);
    detail.textContent='ShoreFeel';detail.setAttribute('aria-label','View ShoreFeel for '+r.name);
    const official=document.createElement('a');official.href=EPA_MAP;
    official.target='_blank';official.rel='noopener';
    official.textContent='Beach map';official.setAttribute('aria-label','Open EPA BEACON map for '+r.name+', ID '+r.id);
    links.append(detail,official);li.append(btn,links);listRoot.append(li);
    sourceAdded++;
  }
  for(const record of sourceRows)addEpaRow(record);
  const list=[...document.querySelectorAll('.shore-stop[data-slug]')];
  const filters=[...document.querySelectorAll('[data-lake-filter]')];
  const bySlug=new Map(list.map(li=>[li.dataset.slug,li]));
  const lakeInfo={
    All:'Explore Great Lakes beaches across eight states. Search by beach name, town or county, or choose a lake. The 16 detailed guides remain featured.',
    Superior:'From Duluth’s Park Point to the Apostle Islands, the open Lake Superior shore can feel very different from the forest behind it. Watch which way the breeze crosses the water before choosing your beach.',
    Michigan:'Lake Michigan connects quiet dunes with Chicago’s city beaches. Step out of shelter toward the open sand and notice whether the wind feels different from the forecast back in town.',
    Huron:'Lake Huron wraps Michigan’s eastern shore and Saginaw Bay. Choose a beach here or explore Michigan’s 50 detailed Beach Report guides.',
    Erie:'On Lake Erie, the marsh edges, sandy peninsulas and city beaches each meet the breeze differently. Watch the water, then check the local health authority for current algae and bacteria notices.',
    Ontario:'Dunes, bluffs and long beaches reveal different faces of Lake Ontario. Compare the wind on an exposed shore with sheltered paths, and consult the park’s own beach-health guidance.'
  };
  const $=id=>document.getElementById(id);
  let current=null,lake='All',query='',request=null,map=null,markers=new Map(),mapLive=false,loadedTile=false,tileFails=0;
  function put(id,text){const el=$(id);if(el)el.textContent=text;}
  function link(id,href,text){const el=$(id);if(!el)return;el.href=href;el.textContent=text;}
  function isoTime(value){
    const ms=Date.parse(value||'');
    return Number.isFinite(ms)?new Intl.DateTimeFormat('en-US',{
      timeZone:'UTC',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'
    }).format(new Date(ms)):'No verified forecast timestamp';
  }
  function setUnavailable(message){
    put('report-temp','No recent forecast');
    put('report-method','No measured beach-air temperature is available');
    put('report-wind','Wind unavailable');
    put('report-time','Source unavailable');
    put('report-heading','Check the official forecast');
    put('report-guide',message||'No recent local forecast could be confirmed. You can still explore the shore and open its official weather and beach notices.');
    put('report-lake-effect','Lake influence unavailable. No recent source-qualified wind and nearby NOAA water reading can establish a shoreline air correction.');
    put('report-scope','No temperature is being inferred from a distant weather station or offshore water buoy. Beach water quality and swimming flags have not been checked.');
  }
  function showPlace(li){
    if(!li)return;
    const d=li.dataset;
    $('field-report').hidden=false;
    current=d.slug;
    for(const el of list)el.querySelector('button[data-select]').setAttribute('aria-pressed',String(el===li));
    put('report-name',d.name);
    put('report-place',d.city+', '+d.state+' · '+lakeLabel(d.lake));
    put('report-story',d.story);
    put('report-heading','Get to know this shore');
    put('report-guide','Checking a nearby NWS air forecast. While it loads, look for the wind and waves described in this place’s field note.');
    put('report-lake-effect','Checking recent NOAA offshore water alongside the NWS area wind. No observed sand temperature is assumed.');
    put('report-temp','Checking forecast');
    put('report-method','National Weather Service hourly forecast, not a sand thermometer');
    put('report-wind','Checking wind');
    put('report-time','Checking NWS source timestamp');
    put('report-scope','Beach marker: '+d.coordinateNote+'. This is not an entrance or parking pin. Air values are nearby land-area forecasts, not a beach thermometer. Water safety has not been checked.');
    const alert=$('report-alert');
    alert.hidden=!d.accessAlert;
    alert.textContent=d.accessAlert||'';
    link('report-safety',d.safetyUrl,'Check '+d.safetyName);
    link('report-park',d.parkUrl,d.epaId?'Open official beach map (search '+d.epaId+')':'Official park page');
    link('report-maps','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(d.name+', '+d.city+', '+d.state),'Find on Google Maps');
    link('report-detail',d.epaId?'/great-lakes-beaches/around-the-lakes/?beach='+encodeURIComponent(d.slug):'/great-lakes-beaches/around-the-lakes/'+d.slug+'/',d.epaId?'Share this ShoreFeel report':'Read the complete field note');
    if(request)request.abort();
    const controller=new AbortController();request=controller;
    fetch('/api/shorefeel-us?beach='+encodeURIComponent(d.slug),{signal:controller.signal,headers:{Accept:'application/json'}})
      .then(res=>{if(!res.ok)throw Error('Forecast service unavailable');return res.json();})
      .then(a=>{
        if(current!==d.slug||controller.signal.aborted)return;
        if(a.status!=='forecast-based'||a.beach!==d.slug){
          setUnavailable(a.reason||'The forecast could not be verified. Check NWS before visiting.');
          return;
        }
        if(typeof a.feelsLikeF!=='number'||!Number.isFinite(a.feelsLikeF)){
          setUnavailable('The current NWS comfort calculation was not available.');return;
        }
        put('report-temp',Math.round(a.feelsLikeF)+'°F');
        put('report-method',a.method==='NWS forecast air'?'NWS forecast air temperature':a.method+' from the NWS area forecast');
        put('report-wind',typeof a.windMph==='number'&&Number.isFinite(a.windMph)
          ?Math.round(a.windMph)+' mph'+(a.windFrom?' from '+a.windFrom:''):'Wind unavailable');
        put('report-time','NWS hourly period '+isoTime(a.asOf)+' · issued '+isoTime(a.issuedAt));
        put('report-heading',a.heading||'At the beach');
        put('report-guide',a.guide||'Watch the wind and local beach conditions.');
        const influence=a.shorelineRealFeel?.lakeEffect;
        put('report-lake-effect',influence?.explanation
          ?influence.label+'. '+influence.explanation+' The temperature above remains NWS apparent air, not a measured sand temperature.'
          :'No verified nearshore NOAA water context is available. The shoreline air difference is unknown.');
        put('report-scope',(a.scope||'NWS area forecast, not an on-sand observation.')+' '+d.coordinateNote+'. Swimming status and water bacteria are not checked by this forecast.');
      })
      .catch(error=>{if(error.name!=='AbortError'&&current===d.slug)setUnavailable('The NWS forecast request did not succeed. Open the official NWS weather service and the park links.');});
    if(mapLive&&markers.has(d.slug)){
      const location=[Number(d.lat),Number(d.lon)];
      if(map.getZoom()<9||!map.getBounds().contains(location))map.setView(location,9,{animate:false});
      drawMap();
      const point=markers.get(d.slug);
      if(map.hasLayer(point))point.openPopup();
    }
    if(window.va)window.va('event',{name:'ShoreFeel US Beach Select',data:{beach:d.slug,lake:d.lake}});
    try{const u=new URL(location.href);u.searchParams.set('beach',d.slug);history.replaceState(null,'',u);}catch{}
  }
  function handoffToMichigan(){
    if(request)request.abort();
    current=null;
    put('report-name','Lake Huron: Michigan shorelines');
    put('report-place','Michigan · Lake Huron');
    put('report-temp','Explore Michigan');
    put('report-method','Lake Huron beach weather lives in the Michigan Beach Report');
    put('report-wind','No new forecast');
    put('report-time','Select an existing Michigan shoreline guide');
    put('report-heading','A different shore, the same Great Lake');
    put('report-story','From Saginaw Bay to the Straits, Michigan has public Lake Huron beaches with their own shoreline exposure. Use the existing 50-location Beach Report rather than a duplicate or incomplete new data source.');
    put('report-guide','Choose a Lake Huron shoreline in the Michigan report. It includes the state’s own BeachGuard and NWS safety context.');
    put('report-scope','This geographic handoff does not represent a current swimming status or a new beach observation.');
    $('report-alert').hidden=true;
    link('report-safety','/great-lakes-beaches/','Explore Michigan Beach Report');
    link('report-park','/lake-huron-water-temperature/saginaw-bay/','Saginaw Bay ShoreFeel');
    link('report-maps','/great-lakes-beaches/','Find Lake Huron beaches');
    link('report-detail','/great-lakes-beaches/','Explore Michigan’s Lake Huron beaches');
    try{const u=new URL(location.href);u.searchParams.delete('beach');history.replaceState(null,'',u);}catch{}
  }
  let displayLimit=48;
  let matching=[];
  function setLake(next,desired,extend=false){
    lake=next;
    if(!extend)displayLimit=48;
    filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lakeFilter===next)));
    $('lake-context').textContent=lakeInfo[next]||lakeInfo.All;
    // Keep the full EPA result set available. Render only the first 48 rows
    // until the visitor asks for more; map clustering uses every match.
    matching=[];
    for(const li of list){
      const d=li.dataset;
      const byLake=next==='All'||d.lake===next;
      const haystack=[d.name,d.city,d.state,d.lake,d.story,d.epaId||''].join(' ').toLowerCase();
      const matched=byLake&&(!query||haystack.includes(query));
      if(matched)matching.push(li);
      li.hidden=!matched||matching.length>displayLimit;
    }
    const more=$('shore-show-more');
    if(more){
      more.hidden=matching.length<=displayLimit;
      more.textContent='Show more beaches ('+Math.min(matching.length-displayLimit,48)+' more)';
    }
    const noMatch=$('shore-no-match');
    if(noMatch)noMatch.hidden=matching.length>0;
    put('result-count',matching.length+' matching · '+list.length+' beach listings');
    if(mapLive){
      const coordinates=matching.map(li=>[Number(li.dataset.lat),Number(li.dataset.lon)])
        .filter(a=>a.every(Number.isFinite));
      if(coordinates.length>1){
        const bounds=window.L.latLngBounds(coordinates);
        map.fitBounds(bounds.pad(.12),{maxZoom:9,animate:false});
      }else if(coordinates.length===1)map.setView(coordinates[0],9,{animate:false});
      else map.setView([44.2,-84.5],5,{animate:false});
      drawMap();
    }
    if(desired&&matching.includes(desired)){showPlace(desired);return;}
    const active=bySlug.get(current);
    if(active&&matching.includes(active)&&!$('field-report').hidden)return;
    if(request)request.abort();
    current=null;
    if(query||!matching.length){
      $('field-report').hidden=true;
      return;
    }
    if(matching.length)showPlace(matching[0]);
  }
  let displayedMapLayers=[];
  function drawMap(){
    if(!mapLive)return;
    for(const layer of displayedMapLayers){
      if(map.hasLayer(layer))map.removeLayer(layer);
    }
    displayedMapLayers=[];
    const visible=map.getBounds().pad(.20),zoom=map.getZoom();
    const putMarker=marker=>{marker.addTo(map);displayedMapLayers.push(marker)};
    if(zoom>=9){
      for(const li of matching){
        const marker=markers.get(li.dataset.slug);
        if(marker&&visible.contains(marker.getLatLng()))putMarker(marker);
      }
    }else{
      // Group nearby source points at lower zooms so 981 EPA beach segments
      // do not become a wall of dots or a slow mobile DOM.
      const step=zoom<=5?.90:zoom===6?.50:zoom===7?.27:.12;
      const groups=new Map();
      for(const li of matching){
        const lat=Number(li.dataset.lat),lon=Number(li.dataset.lon);
        if(!Number.isFinite(lat)||!Number.isFinite(lon)||!visible.contains([lat,lon]))continue;
        const key=Math.floor(lat/step)+':'+Math.floor(lon/step);
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push(li);
      }
      for(const batch of groups.values()){
        if(batch.length===1){
          const marker=markers.get(batch[0].dataset.slug);
          if(marker)putMarker(marker);
          continue;
        }
        const lat=batch.reduce((sum,li)=>sum+Number(li.dataset.lat),0)/batch.length;
        const lon=batch.reduce((sum,li)=>sum+Number(li.dataset.lon),0)/batch.length;
        const count=batch.length;
        const icon=window.L.divIcon({className:'shore-cluster-icon',
          html:'<span class="shore-cluster" aria-hidden="true">'+count+'</span>',
          iconSize:[38,38],iconAnchor:[19,19]});
        const marker=window.L.marker([lat,lon],{icon,title:count+' beach listings. Zoom in to choose.',keyboard:true});
        marker.on('click',()=>map.setView([lat,lon],Math.min(zoom+2,11),{animate:false}));
        putMarker(marker);
      }
    }
    const active=markers.get(current);
    if(active&&map.hasLayer(active)){
      const pin=active.getElement()?.querySelector('.shore-marker');
      if(pin)pin.classList.add('selected');
    }
  }
  function initMap(){
    if(typeof window.L!=='object')return mapError();
    try{
      map=window.L.map('shore-map',{scrollWheelZoom:false,zoomControl:true,
        touchZoom:false,dragging:!matchMedia('(pointer:coarse)').matches});
      map.setView([44.2,-84.5],5);
      const tiles=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:12,attribution:'© OpenStreetMap contributors',crossOrigin:true
      }).addTo(map);
      tiles.on('tileload',()=>{loadedTile=true;});
      tiles.on('tileerror',()=>{tileFails+=1;if(tileFails>=3&&!loadedTile)mapError();});
      for(const li of list){
        const d=li.dataset,lat=Number(d.lat),lon=Number(d.lon);
        if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
        const icon=window.L.divIcon({className:'shore-icon',
          html:'<span class="shore-marker" aria-hidden="true"></span>',
          iconSize:[19,19],iconAnchor:[9,9]});
        const popup=document.createElement('div');
        const strong=document.createElement('strong');strong.textContent=d.name;
        const place=document.createElement('div');place.textContent=d.city+', '+d.state;
        const source=document.createElement('div');
        source.textContent=d.epaId?'Approximate beach location':'Curated ShoreFeel guide';
        popup.append(strong,place,source);
        const marker=window.L.marker([lat,lon],{icon,title:d.name,keyboard:true}).bindPopup(popup);
        marker.on('click',()=>{
          const target=bySlug.get(d.slug);
          if(target)setLake(d.lake==='Great Lakes'?'All':d.lake,target);
        });
        markers.set(d.slug,marker);
      }
      mapLive=true;
      map.on('moveend zoomend',drawMap);
      const positions=matching.map(li=>[Number(li.dataset.lat),Number(li.dataset.lon)])
        .filter(v=>v.every(Number.isFinite));
      if(positions.length>1)map.fitBounds(window.L.latLngBounds(positions).pad(.12),{maxZoom:9,animate:false});
      else if(positions.length===1)map.setView(positions[0],9,{animate:false});
      drawMap();
      setTimeout(()=>{if(!loadedTile&&mapLive)mapError();},8000);
    }catch{mapError();}
  }
  function mapError(){
    if(map){try{map.remove();}catch{}}
    map=null;mapLive=false;$('map-fallback').hidden=false;
    $('shore-map').hidden=true;
  }
  const moreButton=$('shore-show-more');
  if(moreButton)moreButton.addEventListener('click',()=>{
    displayLimit+=48;
    setLake(lake,null,true);
  });
  const search=$('shore-search');
  if(search)search.addEventListener('input',()=>{
    query=search.value.trim().toLowerCase();
    setLake('All');
  });
  filters.forEach(b=>b.addEventListener('click',()=>{
    query='';if(search)search.value='';
    setLake(b.dataset.lakeFilter);
  }));
  list.forEach(li=>li.querySelector('button[data-select]').addEventListener('click',()=>setLake(li.dataset.lake,li)));
  const initial=new URLSearchParams(location.search).get('beach');
  const target=initial&&bySlug.has(initial)?bySlug.get(initial):list[0];
  setLake(initial&&bySlug.has(initial)?target.dataset.lake:'All',target);
  initMap();
};
if(!document.getElementById('gl-explorer'))window.startLegacyShoreFeel();
