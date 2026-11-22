(function(){
 'use strict';
 const list=[...document.querySelectorAll('.shore-stop[data-slug]')];
 const filters=[...document.querySelectorAll('[data-lake-filter]')];
 const bySlug=new Map(list.map(li=>[li.dataset.slug,li]));
 const $=id=>document.getElementById(id);
 const tell=(id,v)=>{const x=$(id);if(x)x.textContent=v;};
 const link=(id,url,label)=>{const x=$(id);if(x){x.href=url;x.textContent=label;}};
 const notes={
  Superior:'On Superior, the trees may shelter you until the forest gives way to a rocky point or sandy bay. Notice when the wind reaches you, and read the park’s latest guidance.',
  Huron:'Georgian Bay coves, Lake Huron points and long strands face the wind in different directions. Compare the water’s surface with the air you feel behind trees or town buildings.',
  Erie:'Across Lake Erie’s sandy peninsulas, even a sunny afternoon can bring shifting wind and waves. Check the official park notices before choosing a place at the water.',
  Ontario:'From Toronto’s streets to Prince Edward County dunes, the Lake Ontario shoreline changes character. See whether the breeze comes across open water or from shelter on land.',
  Michigan:'Lake Michigan lies entirely along the United States. Explore its beaches in the U.S. ShoreFeel guide.'
 };
 let current=null,lake='Superior',controller=null,map=null,mapReady=false,markers=new Map(),tilesLoaded=false,tileErrors=0;
 function time(s){const t=Date.parse(s||'');return Number.isFinite(t)?new Intl.DateTimeFormat('en-CA',
  {timeZone:'America/Toronto',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(t)):'Time unavailable';}
 function unavailable(reason){
  tell('report-temp','Forecast unavailable');
  tell('report-method','No recent, sufficiently close ECCC hourly forecast');
  tell('report-wind','Wind unavailable');
  tell('report-time','Source timestamp unavailable');
  tell('report-heading','Check the official forecast');
  tell('report-guide',reason||'The nearby forecast is not available right now. Explore the shoreline notes, then check current Environment Canada and park guidance before leaving.');
  tell('report-scope','No nearest-town air value, lake temperature, wave safety or swimming status has been inferred. Read the official beach and park notices.');
 }
 function show(li){
  if(!li)return;
  const d=li.dataset;current=d.slug;
  for(const x of list)x.querySelector('button[data-select]').setAttribute('aria-pressed',String(x===li));
  tell('report-name',d.name);tell('report-place','Ontario · Lake '+d.lake);
  tell('report-story',d.story);tell('report-heading','Get to know this shore');
  tell('report-guide','Checking the nearby Environment Canada forecast. While it loads, explore what makes this particular shore different.');
  tell('report-temp','Checking weather');tell('report-method','Nearby ECCC forecast, not a beach thermometer');
  tell('report-wind','Checking wind');tell('report-time','Checking official timestamp');
  tell('report-scope','Approximate park or beach vicinity pin, not a parking location. Forecasts and official beach advisories are separate.');
  link('report-park',d.official,'Official park or town');
  link('report-advisory',d.advisory,'Check '+d.source);
  link('report-maps','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(d.name+', '+d.nearby+', Ontario, Canada'),'View on Google Maps');
  if(controller)controller.abort();
  const signal=new AbortController();controller=signal;
  fetch('/api/shorefeel-ca?beach='+encodeURIComponent(d.slug),{signal:signal.signal,headers:{Accept:'application/json'}})
   .then(r=>{if(!r.ok)throw new Error('ECCC proxy unavailable');return r.json();})
   .then(a=>{
    if(signal.signal.aborted||current!==d.slug)return;
    if(a.status!=='forecast-based'||a.beach!==d.slug){unavailable(a.reason);return;}
    if(typeof a.apparentC!=='number'||!Number.isFinite(a.apparentC)){unavailable('No valid ECCC temperature value.');return;}
    tell('report-temp',Math.round(a.apparentC)+'°C');
    tell('report-method',a.method+' · '+Math.round(a.apparentC*9/5+32)+'°F');
    tell('report-wind',typeof a.windKmh==='number'&&Number.isFinite(a.windKmh)
       ?Math.round(a.windKmh)+' km/h'+(a.windDirection?' from '+a.windDirection:''):'Wind unavailable');
    tell('report-time',(a.isUpcoming?'Upcoming ECCC hour ':'ECCC hour ')+time(a.validAt));
    tell('report-heading',a.heading||'On the shore');tell('report-guide',a.note||'The wind is worth watching at the waterline.');
    tell('report-scope','ECCC forecast for '+a.forecastPlace+' about '+a.forecastDistanceKm+
      ' km from this shoreline. This is not an on-sand air measurement or calibrated coastal correction. Beach water test results and safety flags have not been checked.');
   })
   .catch(e=>{if(e.name!=='AbortError'&&current===d.slug)unavailable('ECCC weather could not be reached. Use the official park and beach health links.');});
  if(mapReady&&markers.has(d.slug)){
    for(const [slug,p]of markers){const e=p.getElement()?.querySelector('.shore-marker');if(e)e.classList.toggle('selected',slug===d.slug);}
    markers.get(d.slug).openPopup();
  }
  try{const u=new URL(location.href);u.searchParams.set('beach',d.slug);history.replaceState(null,'',u);}catch{}
  if(window.va)window.va('event',{name:'ShoreFeel Canada Beach Select',data:{beach:d.slug,lake:d.lake}});
 }
 function handoff(){
  if(controller)controller.abort();
  current=null;
  tell('report-name','Lake Michigan: the U.S. shoreline');
  tell('report-place','Illinois · Indiana · Wisconsin · Michigan');
  tell('report-temp','Explore the U.S.');
  tell('report-method','No Canadian Lake Michigan shoreline');
  tell('report-wind','Choose a U.S. beach');
  tell('report-time','Official U.S. NWS weather');
  tell('report-heading','The fifth lake');
  tell('report-story','All of Lake Michigan borders the United States. Find its sandy parks and city beaches in the U.S. ShoreFeel atlas.');
  tell('report-guide','Select a U.S. public beach for a nearby forecast and the right local swim advisories.');
  tell('report-scope','This navigation handoff does not represent a real-time beach weather or swimming status.');
  link('report-park','/great-lakes-beaches/around-the-lakes/','U.S. shoreline explorer');
  link('report-advisory','/great-lakes-beaches/','Michigan Beach Report');
  link('report-maps','/great-lakes-beaches/around-the-lakes/','Explore Lake Michigan beaches');
  try{const u=new URL(location.href);u.searchParams.delete('beach');history.replaceState(null,'',u);}catch{}
 }
 function selectLake(next,wanted){
  lake=next;
  for(const b of filters)b.setAttribute('aria-pressed',String(b.dataset.lakeFilter===lake));
  const p=$('lake-context');p.textContent=notes[lake];
  if(lake==='Michigan'){const a=document.createElement('a');a.href='/great-lakes-beaches/around-the-lakes/';a.textContent=' View the U.S. Lake Michigan beaches.';p.appendChild(a);}
  const visible=list.filter(li=>{li.hidden=li.dataset.lake!==lake;return !li.hidden;});
  tell('result-count',lake==='Michigan'?'U.S. guide available':visible.length+' locations');
  if(mapReady){
   for(const [slug,m]of markers){const li=bySlug.get(slug);if(li.dataset.lake===lake)m.addTo(map);else map.removeLayer(m);}
   if(visible.length){const bounds=window.L.latLngBounds(visible.map(li=>[Number(li.dataset.lat),Number(li.dataset.lon)]));map.fitBounds(bounds.pad(.15),{maxZoom:9,animate:false});}
   else map.setView([44.5,-85.5],6,{animate:false});
  }
  if(lake==='Michigan')handoff();
  else show(wanted&&visible.includes(wanted)?wanted:visible[0]);
 }
 function mapFailed(){
  if(map){try{map.remove();}catch{}}
  map=null;mapReady=false;
  $('map-fallback').hidden=false;$('shore-map').hidden=true;
 }
 function startMap(){
  if(typeof window.L!=='object')return mapFailed();
  try{
   map=window.L.map('shore-map',{scrollWheelZoom:false,touchZoom:false,dragging:!matchMedia('(pointer:coarse)').matches});
   map.setView([44.4,-83.9],6);
   const layer=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'© OpenStreetMap contributors'}).addTo(map);
   layer.on('tileload',()=>{tilesLoaded=true;});layer.on('tileerror',()=>{tileErrors++;if(tileErrors>=3&&!tilesLoaded)mapFailed();});
   for(const li of list){
    const d=li.dataset;
    const icon=window.L.divIcon({className:'shore-icon',html:'<span class="shore-marker" aria-hidden="true"></span>',iconSize:[19,19],iconAnchor:[9,9]});
    const mark=window.L.marker([Number(d.lat),Number(d.lon)],{icon,title:d.name}).bindPopup('<strong>'+d.name.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</strong><div>Ontario · Lake '+d.lake+'</div>');
    mark.on('click',()=>selectLake(d.lake,li));markers.set(d.slug,mark);
   }
   mapReady=true;selectLake(lake,bySlug.get(current));
   setTimeout(()=>{if(!tilesLoaded&&mapReady)mapFailed();},8000);
  }catch{mapFailed();}
 }
 filters.forEach(b=>b.addEventListener('click',()=>selectLake(b.dataset.lakeFilter)));
 list.forEach(li=>li.querySelector('button[data-select]').addEventListener('click',()=>selectLake(li.dataset.lake,li)));
 const requested=new URLSearchParams(location.search).get('beach'),target=bySlug.get(requested)||list[0];
 selectLake(target.dataset.lake,target);startMap();
})();
