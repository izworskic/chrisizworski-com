/* ShoreFeel 2.0 Saginaw Bay pilot.
 * Three independently identified evidence positions, not interpolated beach readings.
 * All inputs come from the whitelisted /api/shorefeel place; map is a display.
 */
(()=>{'use strict';
const id=x=>document.getElementById(x);
const put=(x,v)=>{const el=id(x);if(el)el.textContent=v;};
const date=s=>{const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}):'Time unavailable';};
const temp=n=>Number.isFinite(n)?n.toFixed(1)+'°F':'Not available';
const points=[
 {key:'inner-bay',name:'Near Bay City State Park',kind:'satellite',lat:43.702,lon:-83.858,detail:'NOAA analyzed satellite surface pixel, in the inner bay. Not a reading in the swimming area.'},
 {key:'west-bay',name:'Off Nayanquing Point',kind:'satellite',lat:43.799,lon:-83.861,detail:'NOAA analyzed satellite surface pixel off the western bay shoreline. Not a shoreline thermometer.'},
 {key:'buoy',name:'Saginaw Bay buoy 45163',kind:'buoy',lat:43.983,lon:-83.600,detail:'Seasonal NOAA GLERL offshore buoy. Many miles from the Bay City State Park beach.'}
];
let payload=null,selected='inner-bay',map=null,markers={};
const evidence=key=>{
 const p=points.find(x=>x.key===key);
 if(!p||!payload)return null;
 if(key==='buoy'){const m=payload.local?.measurement;return m?{kind:'Measured offshore',tempF:m.tempF,observedAt:m.observedAt,lat:p.lat,lon:p.lon,detail:p.detail}:null;}
 const cell=payload.regionalSatellite?.cells?.find(c=>c.key===key);
 const m=cell?.measurement;
 return m?{kind:'Satellite surface analysis',tempF:m.tempF,observedAt:m.observedAt,lat:m.sampleLat,lon:m.sampleLon,detail:p.detail,distanceKm:m.distanceKm}:null;
};
function band(t){
 if(!Number.isFinite(t))return {key:'none',name:'Unverified',note:'No nearby recent water analysis can be verified.'};
 if(t<60)return {key:'shock',name:'Cold-water exposure',note:'Water this cold can trigger involuntary gasping and rapid breathing. Avoid unexpected immersion.'};
 if(t<70)return {key:'cold',name:'Cold water',note:'Immersion can cool the body quickly, particularly when you stop moving.'};
 if(t<77)return {key:'cool',name:'Cool water',note:'Thermal exposure still depends on duration, activity and individual factors.'};
 return {key:'warm',name:'Warmer water',note:'Temperature alone never establishes swimming safety or water quality.'};
}
function renderLead(){
 const m=payload?.water,ok=Number.isFinite(m?.tempF),b=band(m?.tempF);
 const hero=id('bay-hero');if(hero)hero.dataset.band=b.key;
 put('lead-temp',ok?temp(m.tempF):'Not verified');
 put('lead-band',b.name);put('lead-band-note',b.note);
 put('lead-source',ok?(m.kind==='satellite'?'NOAA satellite surface analysis':'NOAA observed buoy')+' · '+date(m.observedAt):'No recent verified surface pixel at the Bay City reference');
 put('lead-caveat',ok?m.caveat:'We do not use the whole Lake Huron average or a distant seasonal buoy as the temperature at Bay City State Park.');
 put('hero-scope','Bay City State Park shoreline reference · '+(ok?'offshore, not at the beach':'local reading unavailable'));
 put('last-updated',payload?.generatedAt?'Checked '+date(payload.generatedAt):'Unable to verify latest source');
 const h=payload?.lakes?.huron;put('huron-context',h?.status==='recent'?'Lake Huron whole-lake average: '+temp(h.latest.tempF)+' ('+h.latest.date+'). Not the bay temperature.':'Lake Huron whole-lake surface analysis unavailable.');
}
function renderSelected(){
 const p=points.find(x=>x.key===selected),e=evidence(selected);
 put('selected-heading',p.name);
 put('selected-reading',e?temp(e.tempF):'No recent reading');
 put('selected-source',e?e.kind+' · '+date(e.observedAt):'There is no current valid observation at this location.');
 put('selected-note',p.detail+(e?.distanceKm!==undefined?' Nearest valid grid pixel is '+e.distanceKm+' km from the reference coordinate.':''));
 const b=band(e?.tempF);put('selected-band',e?b.name:'Evidence unavailable');
 document.querySelectorAll('[data-point]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.point===selected)));
 if(map&&markers[selected]){map.panTo(markers[selected].getLatLng());markers[selected].openPopup();}
}
function renderEvidence(){
 points.forEach(p=>{
  const e=evidence(p.key);
  put('value-'+p.key,e?temp(e.tempF):'Unavailable');
  put('date-'+p.key,e?date(e.observedAt):p.kind==='buoy'?'Not currently reporting (seasonal)':'No recent valid NOAA pixel');
 });
 const local=payload?.local;
 put('buoy-status',local?.measurement?'Fresh offshore buoy observation · '+date(local.measurement.observedAt):'NOAA buoy 45163: no recent valid report; seasonal station.');
 put('shore-air',Number.isFinite(payload?.weatherNow?.tempF)?Math.round(payload.weatherNow.tempF)+'°F':'Unavailable');
 put('shore-wind',Number.isFinite(payload?.weatherNow?.windMph)?payload.weatherNow.windMph+' mph':'Unavailable');
 put('shore-forecast-time',payload?.weatherNow?.startsAt?'NWS hourly forecast for the Bay City State Park area · '+date(payload.weatherNow.startsAt):'NWS hourly forecast unavailable.');
 renderSelected();
}
function renderActivity(a){
 document.querySelectorAll('[data-activity]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.activity===a)));
 const v=payload?.assessments?.[a];
 if(!v){put('activity-heading','Not enough verified evidence');put('on-sand','Local shoreline forecast unavailable.');put('in-water','No site-specific water reading is available.');put('after-water','Wind and wet clothing can increase cooling.');put('activity-decision','Check official forecasts and beach hazards separately.');return;}
 put('activity-heading',v.heading);put('on-sand',v.beach);put('in-water',v.water);put('after-water',v.after);
 put('activity-decision',v.decision);
 const win=payload?.weatherWindows?.[a];put('window',win?'NWS daylight weather-only window: '+date(win.startsAt)+'. This is not a swimming or paddling safety determination.':'No suitable forecast weather window can be established.');
}
function buildMap(){
 const host=id('bay-map');if(!host||!window.L)return;
 map=window.L.map(host,{scrollWheelZoom:false}).setView([43.81,-83.76],9);
 window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
  subdomains:'abcd',maxZoom:18,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'
 }).addTo(map);
 window.L.circleMarker([43.6714,-83.9068],{radius:7,weight:2,color:'#153e4e',fillColor:'#ffffff',fillOpacity:1})
 .addTo(map).bindPopup('<strong>Bay City State Park beach</strong><p>Public shoreline location; not a water-temperature instrument.</p><a href="https://www.michigan.gov/recsearch/parks/baycity" target="_blank" rel="noopener noreferrer">Park information</a>');
 points.forEach(p=>{
  const e=evidence(p.key),loc=e?[e.lat,e.lon]:[p.lat,p.lon],fill=e?'#007b8b':'#677980';
  const marker=window.L.marker(loc,{icon:window.L.divIcon({className:'bay-marker',html:'<span class="marker-inner '+(p.kind==='buoy'?'is-buoy':'is-sat')+(e?'':' no-reading')+'">'+(p.kind==='buoy'?'⚓':'◈')+'</span>',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(map);
  const text='<strong>'+p.name+'</strong><p>'+(e?temp(e.tempF)+' · '+e.kind+' · '+date(e.observedAt):'No current observation')+'</p><small>'+(p.kind==='buoy'?'Offshore buoy':'Satellite reference area')+'; not a beach thermometer.</small>';
  marker.bindPopup(text);markers[p.key]=marker;
  marker.on('click',()=>{selected=p.key;renderSelected();});
 });
 const all=[[43.6714,-83.9068],...points.map(p=>[p.lat,p.lon])];
 map.fitBounds(all,{padding:[28,28],maxZoom:10});
}
async function load(){
 try{
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),18000);
  let response;try{response=await fetch('/api/shorefeel?lake=huron&place=saginaw-bay',{headers:{Accept:'application/json'},signal:ctrl.signal});}finally{clearTimeout(timer);}
  if(!response.ok)throw Error('Live source failed');
  payload=await response.json();
  renderLead();renderEvidence();renderActivity('relax');
 }catch(e){
  put('lead-temp','Not verified');put('lead-source','Official data temporarily unavailable.');
  put('lead-caveat','No water temperature has been substituted or inferred.');
  put('last-updated','Latest data not verified');put('selected-source','Source unavailable');
  put('buoy-status','No verified buoy observation');
  renderActivity('relax');
 }finally{buildMap();}
}
document.querySelectorAll('[data-point]').forEach(el=>el.addEventListener('click',()=>{selected=el.dataset.point;renderSelected();}));
document.querySelectorAll('[data-activity]').forEach(el=>el.addEventListener('click',()=>renderActivity(el.dataset.activity)));
load();
})();