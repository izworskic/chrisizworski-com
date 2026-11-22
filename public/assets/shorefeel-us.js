(function(){
  'use strict';
  const list=[...document.querySelectorAll('.shore-stop[data-slug]')];
  const filters=[...document.querySelectorAll('[data-lake-filter]')];
  const bySlug=new Map(list.map(li=>[li.dataset.slug,li]));
  const lakeInfo={
    Superior:'From Duluth's Park Point to the Apostle Islands, the open Lake Superior shore can feel very different from the forest behind it. Watch which way the breeze crosses the water before choosing your beach.',
    Michigan:'Lake Michigan connects quiet dunes with Chicago's city beaches. Step out of shelter toward the open sand and notice whether the wind feels different from the forecast back in town.',
    Huron:'The United States shore of Lake Huron is in Michigan. Open the existing Michigan Beach Report to explore its public beaches and official advisories.',
    Erie:'On Lake Erie, the marsh edges, sandy peninsulas and city beaches each meet the breeze differently. Watch the water, then check the local health authority for current algae and bacteria notices.',
    Ontario:'Dunes, bluffs and long beaches reveal different faces of Lake Ontario. Compare the wind on an exposed shore with sheltered paths, and consult the park's own beach-health guidance.'
  };
  const $=id=>document.getElementById(id);
  let current=null,lake='Superior',request=null,map=null,markers=new Map(),mapLive=false,loadedTile=false,tileFails=0;
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
    put('report-scope','No temperature is being inferred from a distant weather station or offshore water buoy. Beach water quality and swimming flags have not been checked.');
  }
  function showPlace(li){
    if(!li)return;
    const d=li.dataset;
    current=d.slug;
    for(const el of list)el.querySelector('button[data-select]').setAttribute('aria-pressed',String(el===li));
    put('report-name',d.name);
    put('report-place',d.city+', '+d.state+' · Lake '+d.lake);
    put('report-story',d.story);
    put('report-heading','Get to know this shore');
    put('report-guide','Checking a nearby NWS air forecast. While it loads, look for the wind and waves described in this place's field note.');
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
      const yes=li.dataset.lake===next;li.hidden=!yes;return yes;
    });
    put('result-count',next==='Huron'?'Michigan guide available':visible.length+' locations');
    if(mapLive){
      for(const [slug,marker] of markers){
        const item=bySlug.get(slug);
        if(item.dataset.lake===next)marker.addTo(map);
        else map.removeLayer(marker);
      }
      if(visible.length>1){
        const bounds=window.L.latLngBounds(visible.map(li=>[Number(li.dataset.lat),Number(li.dataset.lon)]));
        map.fitBounds(bounds.pad(.26),{maxZoom:9,animate:false});
      }else if(visible.length===1){
        map.setView([Number(visible[0].dataset.lat),Number(visible[0].dataset.lon)],9,{animate:false});
      }else map.setView([44.2,-83.9],7,{animate:false});
    }
    if(next==='Huron')handoffToMichigan();
    else showPlace(desired&&visible.includes(desired)?desired:visible[0]);
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
      mapLive=true;
      setLake(lake,bySlug.get(current));
      setTimeout(()=>{if(!loadedTile&&mapLive)mapError();},8000);
    }catch{mapError();}
  }
  function mapError(){
    if(map){try{map.remove();}catch{}}
    map=null;mapLive=false;$('map-fallback').hidden=false;
    $('shore-map').hidden=true;
  }
  filters.forEach(b=>b.addEventListener('click',()=>setLake(b.dataset.lakeFilter)));
  list.forEach(li=>li.querySelector('button[data-select]').addEventListener('click',()=>setLake(li.dataset.lake,li)));
  const initial=new URLSearchParams(location.search).get('beach');
  const target=initial&&bySlug.has(initial)?bySlug.get(initial):list[0];
  setLake(target.dataset.lake,target);
  initMap();
})();
