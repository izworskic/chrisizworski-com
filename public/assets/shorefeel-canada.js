(function(){
'use strict';
const parks=[...document.querySelectorAll('.park-item[data-park]')],bySlug=new Map(parks.map(p=>[p.dataset.park,p]));
const tabs=[...document.querySelectorAll('.chapter-tabs [data-lake]')],$=id=>document.getElementById(id);
const chapters={
 Superior:'The open north shore of Lake Superior stretches from quiet bay beaches to rugged forest and headlands. Watch the weather change where the trees meet the sand.',
 Huron:'Lake Huron and Georgian Bay meet dunes, woods and broad open sand. Sheltered paths and exposed beaches can experience different winds.',
 Erie:'Lake Erie’s long, shallow shore meets marsh and dune country. Check the park’s official beach-water sampling and current alerts as well as the air forecast.',
 Ontario:'Lake Ontario is edged by dunes, peninsulas and shoreline parks. Open sand can bring a different wind exposure than inland streets or trails.'
};
let active=null,selectedLake='Superior',controller=null,map=null,markers=new Map(),mapReady=false,hadTile=false,failedTiles=0;
const set=(id,v)=>{const x=$(id);if(x)x.textContent=v;};
function setLink(id,url){const x=$(id);if(x)x.href=url;}
function fmtTime(v){
 const m=Date.parse(v||'');if(!Number.isFinite(m))return 'No verified forecast time';
 return new Intl.DateTimeFormat('en-CA',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'UTC',timeZoneName:'short'}).format(new Date(m));
}
function unavailable(note){
 set('forecast-air','Not available');
 set('forecast-units','Regional ECCC forecast not verified');
 set('forecast-wind','Unknown');
 set('forecast-time','No recent verified forecast time');
 set('weather-heading','The lake may have its own weather');
 set('weather-note',note||'We cannot verify a nearby recent city forecast. Check Environment and Climate Change Canada before heading out.');
 set('source-note','No air reading is inferred from a distant city or offshore buoy. Beach sampling and park alerts have not been checked.');
}
function show(p){
 if(!p)return;const d=p.dataset;active=d.park;
 for(const item of parks)item.querySelector('.park-choice').setAttribute('aria-pressed',String(item===p));
 set('selected-name',d.name);set('selected-city',d.city+' · Lake '+d.lake+' · Ontario, Canada');
 set('selected-story',d.story);
 set('forecast-air','Checking ECCC');
 set('forecast-units','Regional city forecast, not an on-sand thermometer');
 set('forecast-wind','Checking');
 set('forecast-time','Waiting for the official issue time');
 set('weather-heading','Weather along the shore');
 set('weather-note','The open lake and the shelter of the park may shape how the day feels.');
 set('source-note',d.coordinateNote+'. Current samples and swimming conditions have not been checked.');
 setLink('park-guide',d.parkUrl);setLink('park-alerts',d.alertsUrl);
 setLink('park-directions','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(d.name+', '+d.city+', Ontario, Canada'));
 if(controller)controller.abort();
 const c=new AbortController();controller=c;
 fetch('/api/shorefeel-canada?beach='+encodeURIComponent(d.park),{
   signal:c.signal,headers:{Accept:'application/json'}
 }).then(r=>{if(!r.ok)throw Error('Weather service unavailable');return r.json();})
 .then(info=>{
   if(active!==d.park||c.signal.aborted)return;
   if(info.beach!==d.park||info.status!=='regional-forecast'){
     unavailable(info.reason||'The official forecast is unavailable at this location.');return;
   }
   if(!Number.isFinite(info.temperatureC)||!Number.isFinite(info.temperatureF))return unavailable('No trustworthy ECCC hourly air temperature was available.');
   set('forecast-air',info.temperatureC+'°C');
   set('forecast-units',info.temperatureF+'°F · '+info.city+' city-area forecast, '+info.cityDistanceKm+' km from park');
   set('forecast-wind',Number.isFinite(info.windKmh)?info.windKmh+' km/h'+(info.windFrom?' from '+info.windFrom:''):'Not reported');
   set('forecast-time','Forecast '+fmtTime(info.forecastValidAt)+' · updated '+fmtTime(info.issuedAt));
   set('weather-heading',info.heading||'At the shore');
   set('weather-note',info.guide||'Check local wind and waves on arrival.');
   set('source-note',info.scope||'ECCC regional weather, not a beach thermometer. Safety information not checked.');
 }).catch(e=>{if(e.name!=='AbortError'&&active===d.park)unavailable('The ECCC weather request failed. The official park sources remain available.');});
 if(mapReady&&markers.has(d.park)){
   for(const [slug,marker] of markers){
     const dot=marker.getElement()?.querySelector('.map-pin');
     if(dot)dot.classList.toggle('active',slug===d.park);
   }
   markers.get(d.park).openPopup();
 }
 try{const u=new URL(location.href);u.searchParams.set('park',d.park);history.replaceState(null,'',u);}catch{}
}
function lakeTo(name,park){
 selectedLake=name;
 tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lake===name)));
 set('lake-copy',chapters[name]||'');
 const visible=parks.filter(p=>{p.hidden=p.dataset.lake!==name;return !p.hidden});
 set('park-count',visible.length+' parks');
 const choose=park&&visible.includes(park)?park:visible[0];
 if(choose)show(choose);
 if(mapReady){
   for(const [slug,marker] of markers){
     if(bySlug.get(slug).dataset.lake===name)marker.addTo(map);
     else map.removeLayer(marker);
   }
   if(visible.length>1){
     const bounds=window.L.latLngBounds(visible.map(p=>[Number(p.dataset.lat),Number(p.dataset.lon)]));
     map.fitBounds(bounds.pad(.3),{maxZoom:9,animate:false});
   }
 }
}
function mapUnavailable(){
 if(map){try{map.remove()}catch{}}
 map=null;mapReady=false;$('map-fallback').hidden=false;$('canada-map').hidden=true;
}
function createMap(){
 if(typeof window.L!=='object')return mapUnavailable();
 try{
   map=window.L.map('canada-map',{scrollWheelZoom:false,touchZoom:false,dragging:!matchMedia('(pointer:coarse)').matches,zoomControl:true});
   map.setView([45.5,-81.3],6);
   const tiles=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'© OpenStreetMap contributors'}).addTo(map);
   tiles.on('tileload',()=>hadTile=true);
   tiles.on('tileerror',()=>{if(++failedTiles>=3&&!hadTile)mapUnavailable()});
   for(const p of parks){
     const d=p.dataset;
     const icon=window.L.divIcon({className:'park-map-icon',html:'<span class="map-pin" aria-hidden="true"></span>',iconSize:[20,20],iconAnchor:[10,10]});
     const marker=window.L.marker([Number(d.lat),Number(d.lon)],{icon,title:d.name});
     const el=document.createElement('div');
     const st=document.createElement('strong');st.textContent=d.name;
     const detail=document.createElement('div');detail.textContent='Ontario Parks reference, not a beach entrance';
     el.append(st,detail);marker.bindPopup(el);
     marker.on('click',()=>lakeTo(d.lake,p));markers.set(d.park,marker);
   }
   mapReady=true;lakeTo(selectedLake,bySlug.get(active));
   setTimeout(()=>{if(!hadTile&&mapReady)mapUnavailable()},8500);
 }catch{mapUnavailable()}
}
tabs.forEach(b=>b.addEventListener('click',()=>lakeTo(b.dataset.lake)));
parks.forEach(p=>p.querySelector('[data-select]').addEventListener('click',()=>lakeTo(p.dataset.lake,p)));
const fromQuery=new URLSearchParams(location.search).get('park');
const first=fromQuery&&bySlug.has(fromQuery)?bySlug.get(fromQuery):parks[0];
lakeTo(first.dataset.lake,first);createMap();
})();
