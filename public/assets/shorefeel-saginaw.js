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
 const feel=payload?.beachFeel,weather=feel?.status==='forecast-based';
 const water=payload?.water,validWater=Number.isFinite(water?.tempF);
 const hero=id('bay-hero');
 if(hero)hero.dataset.band=!weather?'none':feel.apparentF<50?'cold':feel.apparentF>=85?'warm':'cool';
 put('lead-temp',weather?Math.round(feel.apparentF)+'°F':'Beach feel unavailable');
 put('lead-band',weather?feel.label:'Beach conditions unverified');
 put('lead-band-note',weather?feel.note:'A current NWS shoreline-area forecast is not available. We cannot infer beach air from water alone.');
 put('lead-source',weather?feel.apparentMethod+' · National Weather Service park-area forecast · '+date(feel.startsAt):'No current verified forecast at the beach');
 put('lead-wind',weather&&Number.isFinite(feel.windMph)?Math.round(feel.windMph)+' mph'+(feel.windFrom?' from '+feel.windFrom:''):'Unavailable');
 put('lead-water',validWater?temp(water.tempF)+' · analyzed offshore':'Not verified');
 put('lead-humidity',weather&&Number.isFinite(feel.humidity)?Math.round(feel.humidity)+'%':'Unavailable');
 put('lake-influence-detail',weather?feel.note:'The bay has a say in the weather here. Once the NWS forecast arrives, compare the wind with nearby water temperature before heading to the sand.');
 put('lead-caveat',weather?feel.limitation:'NWS area air, nearby analyzed water and wind direction are different observations. There is no directly measured beach-air temperature here.');
 put('hero-scope',weather?'At the beach · Bay City State Park · '+feel.apparentMethod:'At the beach · Bay City State Park · Forecast unavailable');
 put('last-updated',payload?.generatedAt?'Sources checked '+date(payload.generatedAt):'Unable to verify latest source');
 const physics=payload?.shorelinePhysics;
 const paired=physics?.paired,grid=physics?.gridRelationship;
 put('physics-grid-info',grid?.description||'NWS grid source identities not available.');
 const marine=physics?.independentMarineAir;
 put('physics-marine-reference',marine&&Number.isFinite(marine.tempF)
   ?marine.source+' · '+marine.tempF.toFixed(1)+'°F at '+date(marine.observedAt)+'. '+marine.location+'. This is offshore evidence, not an observation on the beach.'
   :'No recent verified air thermometer report from Saginaw Bay Light #1 or seasonal NOAA buoy 45163. These offshore instruments are not beach thermometers.');
 put('physics-forecast-contrast',paired
   ?(paired.nwsDifferenceF>0?'+':'')+paired.nwsDifferenceF.toFixed(1)+'°F (shore vs inland)'
   :'Comparison unavailable');
 put('physics-forecast-note',paired
   ?'NWS shore '+Math.round(paired.beachNwsF)+'°F · west Bay County '+Math.round(paired.inlandF)+'°F. Different gridded forecast cells, not independent thermometer measurements.'
   :grid?.status==='same-grid'?'Both sites use the same NWS forecast cell. We will not present that as an observed shoreline difference.'
   :'Two current NWS hourly forecasts with verified distinct cells are required; no inland difference is inferred.');
 const modeled=physics?.status==='research-only';
 put('physics-model-range',modeled
   ?physics.lowF.toFixed(1)+'–'+physics.highF.toFixed(1)+'°F (scenarios)'
   :'Research scenarios unavailable');
 put('physics-model-note',modeled
   ?physics.scenarioCount+' mathematical scenarios with NOAA inner-bay water '+physics.waterF.toFixed(1)+'°F, NWS inland air and onshore wind.'
   :(physics?.reason||'The physics scenarios are only evaluated when source requirements are met.'));
 put('physics-model-limits',modeled
   ?'Not an actual beach forecast or statistical confidence interval. Hypothetical over-water travel 2, 5, 10 km; mixed-layer depth 20, 60, 150 m; heat transfer coefficient 0.0008, 0.0012, 0.002. These parameters are not locally measured. NOAA offshore air observations, when available, are a separate reference and do not calibrate this model.'
   :'This model does not fill missing NOAA observations with guessed values. A beach-specific numeric correction needs actual shoreline measurements for calibration; no such validation is asserted.');
 const h=payload?.lakes?.huron;
 put('huron-context',h?.status==='recent'?'Lake Huron whole-lake water average: '+temp(h.latest.tempF)+' ('+h.latest.date+'). Not the beach air or local water.':'Lake Huron whole-lake surface analysis unavailable.');
}


function renderWindTurn(){
 const value=payload?.windTurn;
 const list=id('wind-turn-hours');
 if(list)list.replaceChildren();
 if(!value||value.status==='unavailable'){
  put('wind-turn-answer','Hourly wind outlook unavailable');
  put('wind-turn-explain','There is no verified current NWS hourly wind forecast. A change in the wind cannot be timed from missing information.');
  put('wind-turn-source','Use official NWS forecasts and beach hazard notices before visiting. No offshore sensor has been substituted for the land-area forecast.');
  return;
 }
 if(value.phase==='onshore-now'){
  put('wind-turn-answer','Wind from the bay is forecast now');
 }else if(value.phase==='forecast-turn'){
  put('wind-turn-answer','Forecast winds turn toward the bay around '+date(value.at));
 }else{
  put('wind-turn-answer','No sustained turn toward the bay shown in the available forecast');
 }
 let note=value.reason||'The wind information is regional forecast guidance, not a beach thermometer.';
 if(Number.isFinite(value.forecastAirWaterContrastF)&&value.water){
  if(value.contrastMeaning==='water-cooler-than-air'){
   note+=' NOAA analyzed water in the bay is cooler than the area air forecast for that hour. Cooling at the sand remains unmeasured.';
  }else if(value.contrastMeaning==='water-warmer-than-air'){
   note+=' NOAA analyzed water is warmer than the area air forecast for that hour. Shoreline moderation is possible but unmeasured.';
  }else{
   note+=' The forecast air and nearby NOAA surface-water temperatures are relatively close. A shoreline air correction is not established.';
  }
 }else{
  note+=' A suitable current inner-bay satellite water reference is not available for this wind period.';
 }
 put('wind-turn-explain',note);
 put('wind-turn-source','Source: NWS Bay City State Park land-area hourly forecast. Each hour is predicted wind FROM that direction, not a measured beach wind. The wind turn is not confirmed lake-breeze onset, an on-sand temperature or a swim-safety decision.');
 if(!list)return;
 const sectorName={onshore:'From the bay',offshore:'From land',alongshore:'Along shore',unknown:'Wind uncertain'};
 (Array.isArray(value.hours)?value.hours:[]).slice(0,8).forEach(hour=>{
  const li=document.createElement('li');
  li.dataset.sector=Object.hasOwn(sectorName,hour.sector)?hour.sector:'unknown';
  const time=document.createElement('time');
  time.dateTime=hour.startsAt;
  time.textContent=date(hour.startsAt);
  const direction=document.createElement('strong');
  direction.textContent=sectorName[li.dataset.sector];
  const details=document.createElement('span');
  const hasWind=Number.isFinite(hour.windMph)&&hour.windFrom;
  const hasTemp=Number.isFinite(hour.areaAirF);
  details.textContent=(hasWind?Math.round(hour.windMph)+' mph '+hour.windFrom:'Wind unavailable')+
   (hasTemp?' · '+Math.round(hour.areaAirF)+'°F area air':'');
  li.append(time,direction,details);
  list.append(li);
 });
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
 put('shore-wind',Number.isFinite(payload?.weatherNow?.windMph)?payload.weatherNow.windMph+' mph'+(payload.weatherNow.windDirection?' from '+payload.weatherNow.windDirection:''):'Unavailable');
 put('shore-forecast-time',payload?.weatherNow?.startsAt?'NWS land-side hourly forecast near Bay City State Park · '+date(payload.weatherNow.startsAt):'NWS hourly forecast unavailable.');
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
 // Start with a reliable, attributed map. Never request CARTO tiles without a public key.
 const osm=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
 }).addTo(map);
 host.dataset.basemap='openstreetmap';
 // A public browser basemap key is supplied only by the existing same-origin endpoint.
 // Leave OSM visible until the keyed CARTO tiles finish loading; on any tile error retain OSM.
 fetch('/api/carto-basemap-config',{credentials:'same-origin',signal:AbortSignal.timeout(6500)})
 .then(r=>r.ok?r.json():null).then(config=>{
  if(!map||!config||config.provider!=='CARTO'||typeof config.key!=='string'||!config.key.trim())return;
  const key=encodeURIComponent(config.key.trim());
  const carto=window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key='+key,{
   subdomains:'abcd',maxZoom:18,
   attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  });
  let failed=false;
  carto.on('tileerror',()=>{
   if(failed)return;
   failed=true;
   if(map.hasLayer(carto))map.removeLayer(carto);
   if(!map.hasLayer(osm))osm.addTo(map);
   host.dataset.basemap='openstreetmap';
  });
  carto.on('load',()=>{
   if(failed||!map.hasLayer(carto))return;
   if(map.hasLayer(osm))map.removeLayer(osm);
   host.dataset.basemap='carto';
  });
  carto.addTo(map);
 }).catch(()=>{host.dataset.basemap='openstreetmap';});
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
  renderLead();renderWindTurn();renderEvidence();renderActivity('relax');
 }catch(e){
  put('lead-temp','Beach feel unavailable');put('lead-band','Beach conditions unverified');
  put('lead-band-note','Current NWS beach-area weather could not be retrieved.');
  put('lead-source','Official forecast temporarily unavailable.');
  put('lead-wind','Unavailable');put('lead-water','Not verified');put('lead-humidity','Unavailable');
  put('lake-influence-detail','Without current weather, no beach temperature is inferred.');
  put('physics-forecast-contrast','Comparison unavailable');put('physics-model-range','Research scenarios unavailable');
  put('physics-forecast-note','NWS forecast data unavailable');put('physics-grid-info','NWS forecast grid metadata unavailable');
  put('physics-marine-reference','Offshore NOAA air temperature unavailable');put('physics-model-note','NOAA or NWS source unavailable');
  put('lead-caveat','No inland or water-temperature reading is substituted for a beach thermometer.');
  put('last-updated','Latest data not verified');put('selected-source','Source unavailable');
  put('buoy-status','No verified buoy observation');
  renderWindTurn();renderActivity('relax');
 }finally{buildMap();}
}
document.querySelectorAll('[data-point]').forEach(el=>el.addEventListener('click',()=>{selected=el.dataset.point;renderSelected();}));
document.querySelectorAll('[data-activity]').forEach(el=>el.addEventListener('click',()=>renderActivity(el.dataset.activity)));
load();
})();