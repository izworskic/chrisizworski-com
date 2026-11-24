(function(){
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
      story:'This shoreline appears in the EPA 2025 public-access Great Lakes BEACH Act inventory for '+
        r.county+' County, '+r.state+'. Its recorded shoreline location is approximate. Look at the nearby official air forecast and wind, and check the responsible beach authority for current access, water testing and swimming restrictions.',
      accessAlert:'',coordinateNote:'EPA reported shoreline center, not a verified parking entrance, beach thermometer or swimming boundary',
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
    official.textContent='EPA map';official.setAttribute('aria-label','Open EPA BEACON map for '+r.name+', ID '+r.id);
    links.append(detail,official);li.append(btn,links);listRoot.append(li);
    sourceAdded++;
  }
  for(const record of sourceRows)addEpaRow(record);
  const list=[...document.querySelectorAll('.shore-stop[data-slug]')];
  const filters=[...document.querySelectorAll('[data-lake-filter]')];
  const bySlug=new Map(list.map(li=>[li.dataset.slug,li]));
  const lakeInfo={
    All:'Browse the source-vetted EPA 2025 U.S. Great Lakes beach inventory across eight states. Search a named beach, county or EPA beach ID, or choose a lake. The 16 original guides remain featured.',
    Superior:'From Duluth’s Park Point to the Apostle Islands, the open Lake Superior shore can feel very different from the forest behind it. Watch which way the breeze crosses the water before choosing your beach.',
    Michigan:'Lake Michigan connects quiet dunes with Chicago’s city beaches. Step out of shelter toward the open sand and notice whether the wind feels different from the forecast back in town.',
    Huron:'Lake Huron wraps Michigan’s eastern shore and Saginaw Bay. Select an EPA-listed shoreline here or explore Michigan’s 50 detailed Beach Report guides.',
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
    put('report-place',d.city+', '+d.state+' · Lake '+d.lake);
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
    link('report-park',d.parkUrl,'Official park page');
    link('report-maps','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(d.name+', '+d.city+', '+d.state),'Find on Google Maps');
    link('report-detail','/great-lakes-beaches/around-the-lakes/'+d.slug+'/','Read the complete field note');
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
      for(const [slug,marker] of markers){
        const icon=marker.getElement()?.querySelector('.shore-marker');
        if(icon)icon.classList.toggle('selected',slug===d.slug);
      }
      const point=markers.get(d.slug);
      point.openPopup();
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
  function setLake(next,desired){
    lake=next;
    filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lakeFilter===next)));
    $('lake-context').textContent=lakeInfo[next];
    // A visible, usable first-party handoff is better than pretending Lake Huron
    // lacks beaches simply because this expansion excludes Michigan.
    if(next==='Huron'){
      $('lake-context').innerHTML=lakeInfo.Huron+' <a href="/great-lakes-beaches/">See Michigan’s Lake Huron beaches</a>.';
    }
    const visible=list.filter(li=>{
      const d=li.dataset;
      const byLake=next==='All'||d.lake===next;
      const text=[d.name,d.city,d.state,d.lake,d.story].join(' ').toLowerCase();
      const yes=byLake&&(!query||text.includes(query));
      li.hidden=!yes;return yes;
    });
    const noMatch=$('shore-no-match');
    if(noMatch)noMatch.hidden=visible.length>0||next==='Huron';
    put('result-count',next==='Huron'?'Michigan guide available':visible.length+' of '+list.length+' locations');
    if(mapLive){
      for(const [slug,marker] of markers){
        const item=bySlug.get(slug);
        if(!item.hidden)marker.addTo(map);
        else map.removeLayer(marker);
      }
      if(visible.length>1){
        const bounds=window.L.latLngBounds(visible.map(li=>[Number(li.dataset.lat),Number(li.dataset.lon)]));
        map.fitBounds(bounds.pad(.26),{maxZoom:9,animate:false});
      }else if(visible.length===1){
        map.setView([Number(visible[0].dataset.lat),Number(visible[0].dataset.lon)],9,{animate:false});
      }else map.setView([44.2,-83.9],7,{animate:false});
    }
    if(next==='Huron'){$('field-report').hidden=false;handoffToMichigan();}
    else if(visible.length)showPlace(desired&&visible.includes(desired)?desired:visible[0]);
    else{
      if(request)request.abort();
      current=null;$('field-report').hidden=true;
      try{const u=new URL(location.href);u.searchParams.delete('beach');history.replaceState(null,'',u);}catch{}
    }
  }
  function initMap(){
    if(typeof window.L!=='object')return mapError();
    try{
      map=window.L.map('shore-map',{scrollWheelZoom:false,zoomControl:true,touchZoom:false,dragging:!matchMedia('(pointer:coarse)').matches});
      map.setView([44.2,-84.5],5);
      const tiles=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:12,attribution:'© OpenStreetMap contributors',crossOrigin:true
      }).addTo(map);
      tiles.on('tileload',()=>{loadedTile=true;});
      tiles.on('tileerror',()=>{tileFails+=1;if(tileFails>=3&&!loadedTile)mapError();});
      for(const li of list){
        const d=li.dataset;
        const div=window.L.divIcon({className:'shore-icon',html:'<span class="shore-marker" aria-hidden="true"></span>',iconSize:[19,19],iconAnchor:[9,9]});
        const marker=window.L.marker([Number(d.lat),Number(d.lon)],{icon:div,title:d.name})
          .bindPopup('<strong>'+d.name.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</strong><div>'+d.city+', '+d.state+'</div>');
        marker.on('click',()=>{const t=bySlug.get(d.slug);if(t)setLake(d.lake,t);});
        markers.set(d.slug,marker);
      }
      // The selected report already requested its forecast before map creation.
      // Sync only markers, avoiding a second API request and loading-state flicker.
      mapLive=true;
      const visible=list.filter(li=>!li.hidden);
      for(const [slug,marker] of markers){
        const entry=bySlug.get(slug);
        if(entry&&!entry.hidden)marker.addTo(map);
      }
      if(visible.length>1){
        const bounds=window.L.latLngBounds(visible.map(li=>[Number(li.dataset.lat),Number(li.dataset.lon)]));
        map.fitBounds(bounds.pad(.26),{maxZoom:9,animate:false});
      }else if(visible.length===1)map.setView([Number(visible[0].dataset.lat),Number(visible[0].dataset.lon)],9,{animate:false});
      else map.setView([44.2,-83.9],7,{animate:false});
      if(current&&markers.has(current)){
        const selected=markers.get(current);
        selected.openPopup();
        const icon=selected.getElement()?.querySelector('.shore-marker');
        if(icon)icon.classList.add('selected');
      }
      setTimeout(()=>{if(!loadedTile&&mapLive)mapError();},8000);
    }catch{mapError();}
  }
  function mapError(){
    if(map){try{map.remove();}catch{}}
    map=null;mapLive=false;$('map-fallback').hidden=false;
    $('shore-map').hidden=true;
  }
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
})();
