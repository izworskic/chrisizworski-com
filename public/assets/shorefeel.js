/* ShoreFeel UI: data provenance first, no numeric "feels-like" invention. */
(()=>{'use strict';
const body=document.body,place=body.dataset.place||'',lake=body.dataset.lake||'michigan';
const root='/lake-michigan-water-temperature/';
const positions=[{label:'Grand Haven',lat:43.0631,lon:-86.2284,url:root+'grand-haven/'},{label:'Traverse City',lat:44.7631,lon:-85.6206,url:root+'traverse-city/'}];
const get=id=>document.getElementById(id);
const write=(id,value)=>{const n=get(id);if(n)n.textContent=value;};
const format=n=>Number.isFinite(n)?n.toFixed(1)+'°F':'Unavailable';
const time=s=>{if(!s)return 'time unavailable';const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Detroit',timeZoneName:'short'}):'time unavailable';};
let payload=null,activity='swim';

/* Water temperature is the product. A dated lakewide number is useful context,
   but must never masquerade as an in-bay or beach thermometer. */
function setTraverseLead(value,label,when,caveat,localText){
 if(place!=='traverse-city')return;
 write('lead-temp',value);write('lead-temp-label',label);
 write('lead-temp-when',when);write('lead-temp-caveat',caveat);
 write('lead-bay-status',localText);
}
function renderTraverseLead(){
 if(place!=='traverse-city'||!payload)return;
 const buoy=payload.local?.measurement,whole=payload.lakes?.michigan;
 const lakeCurrent=whole?.status==='recent'&&Number.isFinite(whole?.latest?.tempF);
 const buoyCurrent=Number.isFinite(buoy?.tempF);
 if(buoyCurrent){
  setTraverseLead(format(buoy.tempF),'GRAND TRAVERSE BAY · OFFSHORE BUOY 45020',
   'Measured '+time(buoy.observedAt)+' · buoy location, not the beach',
   'An in-bay buoy reading is more relevant than a whole-lake average but does not measure shallow beach water.',
   format(buoy.tempF)+' · '+time(buoy.observedAt));
 }else if(lakeCurrent){
  const fallback=payload.source?.mode==='dated-official-fallback';
  setTraverseLead(format(whole.latest.tempF),'LAKE MICHIGAN · DAILY SURFACE AVERAGE',
   'NOAA GLERL · '+whole.latest.date+(fallback?' · last independently verified report':' · latest published report'),
   'This is the average of all Lake Michigan, NOT the measured temperature at a Traverse City beach or inside Grand Traverse Bay.',
   'Not reporting · station 45020');
 }else{
  setTraverseLead('No current reading','WATER TEMPERATURE · NOT VERIFIED',
   'NOAA lakewide analysis unavailable or older than 3 days',
   'No recent in-bay buoy or current lakewide average. We will not substitute old or estimated beach water data.',
   'Not reporting · station 45020');
 }
}

function drawChart(points){
 const container=get('history');if(!container)return;
 if(!Array.isArray(points)||points.length<2){container.textContent='Not enough valid lakewide observations to show a trend.';return;}
 const p=points.filter(x=>Number.isFinite(x.tempF));if(p.length<2){container.textContent='Recent lakewide temperatures unavailable.';return;}
 const lo=Math.floor(Math.min(...p.map(x=>x.tempF))-2),hi=Math.ceil(Math.max(...p.map(x=>x.tempF))+2);
 const x=i=>48+i*(660/Math.max(1,p.length-1)),y=v=>200-((v-lo)/Math.max(1,hi-lo))*165;
 const d=p.map((o,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(o.tempF).toFixed(1)).join(' ');
 const first=p[0],last=p.at(-1);const labels=[lo,Math.round((lo+hi)/2),hi];
 const s='<svg class="chart" viewBox="0 0 735 250" role="img" aria-label="NOAA lakewide surface temperature trend from '+first.date+' through '+last.date+'">'
   +labels.map(t=>'<line x1="48" y1="'+y(t).toFixed(1)+'" x2="710" y2="'+y(t).toFixed(1)+'"/><text x="3" y="'+(y(t)+4).toFixed(1)+'">'+t+'°F</text>').join('')
   +'<path d="'+d+'"/><circle cx="'+x(p.length-1).toFixed(1)+'" cy="'+y(last.tempF).toFixed(1)+'" r="5" fill="#0b7c88"/><text x="47" y="239">'+first.date+'</text><text x="615" y="239">'+last.date+'</text></svg>';
 container.innerHTML=s;
}
function renderLakes(){
 if(!payload)return;
 const selected=payload.lakes[lake]||{},l=selected.latest;
 write('lake-temp',selected.status==='recent'?format(l?.tempF):'Unavailable');
 write('lake-observed',l?(l.date+' · '+(selected.status==='recent'?'recent':'stale; not used as current')):'No current lakewide report');
 write('lake-trend',selected.trend7===null||selected.trend7===undefined?'Seven-day comparison unavailable':(selected.trend7>0?'+':'')+selected.trend7.toFixed(1)+'°F over seven days');
 drawChart(selected.history||[]);
 const status=get('data-status');
 if(status)status.textContent='NOAA GLERL lakewide analysis: '+(l?l.date:'unavailable')+'. '+(selected.status==='recent'?'Recent surface average; not a beach measurement.':'Latest lakewide data is unavailable or stale; no current value shown.');
 for(const [name,v] of Object.entries(payload.lakes||{})){
  const el=get('lake-'+name);if(el)el.textContent=v.status==='recent'?format(v.latest?.tempF):'Unavailable';
 }
}
function applyActivity(a){
 activity=a;document.querySelectorAll('[data-activity]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.activity===a)));
 if(!payload?.assessments){write('feel-title','Choose what brings you to shore.');return;}
 const v=payload.assessments[a];if(!v)return;
 write('feel-title',v.heading);
 write('feel-beach',v.beach);
 write('feel-water',v.water);
 write('feel-after',v.after);
 write('feel-decision',v.decision);
}
function renderPlace(){
 const d=payload?.local;if(!d)return;
 const station=d.measurement;
 write('local-temp',station?format(station.tempF):'Not available');
 write('local-source',station?'Nearby offshore buoy '+d.stationId+' · '+time(station.observedAt):'No buoy observation from the past six hours');
 write('station-note',d.caveat);
 const w=d.periods?.find(p=>p.daylight)||d.periods?.[0]||null;
 write('air-temp',Number.isFinite(w?.tempF)?Math.round(w.tempF)+'°F':'Unavailable');
 write('wind-now',Number.isFinite(w?.windMph)?w.windMph+' mph':'Unavailable');
 write('weather-detail',w?'NWS forecast for '+time(w.startsAt)+' · '+w.summary:'NWS forecast currently unavailable');
 write('weather-window',payload.weatherWindow?'Relative air-and-wind comfort: '+time(payload.weatherWindow.startsAt)+'. This is not a water or swimming-safety prediction.':'No reliable hourly weather window can be selected.');
 applyActivity(activity);
}
function initMap(){
 const mapEl=get('shore-map');if(!mapEl)return;
 if(!window.L){mapEl.innerHTML='<div class="map-fallback"><strong>Explore the Lake Michigan shoreline</strong><p>The interactive map is unavailable, but the destination guides still work.</p><div class="fallback-places"><a href="/lake-michigan-water-temperature/grand-haven/">Grand Haven →</a><a href="/lake-michigan-water-temperature/traverse-city/">Traverse City →</a></div><small>For source locations, <a href="/great-lakes-buoys/">see NOAA buoy stations</a>.</small></div>';return;}
 const center=place==='grand-haven'?[43.07,-86.25]:place==='traverse-city'?[44.85,-85.63]:[44.5,-86.55];
 const map=L.map(mapEl,{scrollWheelZoom:false}).setView(center,place?9:6);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:17}).addTo(map);
 positions.forEach(pt=>L.circleMarker([pt.lat,pt.lon],{radius:9,color:'#093e52',fillColor:'#24a2ab',fillOpacity:1,weight:2}).addTo(map).bindPopup('<strong>'+pt.label+'</strong><div>Destination guide</div><a href="'+pt.url+'">Explore ShoreFeel</a>'));
 if(payload?.local){L.circleMarker([payload.local.lat,payload.local.lon],{radius:6,color:'#874f22',fillColor:'#ffcc87',fillOpacity:1,weight:2}).addTo(map).bindPopup('Buoy '+payload.local.stationId+' — offshore observation location, not the beach');}
}

// Avoid an empty first impression if NOAA upstream is momentarily unavailable.
// October 12 daily NOAA observation is bundled only while <=3 UTC days old;
// the API always takes priority when a newer verified observation appears.
if(place==='traverse-city'){
 const dt='2026-10-12';
 const age=(Date.parse(new Date().toISOString().slice(0,10)+'T00:00:00Z')-Date.parse(dt+'T00:00:00Z'))/86400000;
 if(age>=0&&age<=3){
  setTraverseLead('62.1°F','LAKE MICHIGAN · DAILY SURFACE AVERAGE',
   'NOAA GLERL · Oct 12, 2026 · last independently verified report; checking for updates',
   'Lake Michigan-wide average, NOT Grand Traverse Bay beach water.',
   'Not reporting · station 45020');
 }
}

document.querySelectorAll('[data-activity]').forEach(b=>b.addEventListener('click',()=>applyActivity(b.dataset.activity)));
(async()=>{
 try{
  const url='/api/shorefeel?lake='+encodeURIComponent(lake)+(place?'&place='+encodeURIComponent(place):'');
  const r=await fetch(url,{headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error('Data service unavailable');
  payload=await r.json();
  renderLakes();renderPlace();renderTraverseLead();
 }catch(e){
  renderTraverseLead();
  write('data-status','Live data is temporarily unavailable. The place guide and source links below are still useful; no readings have been estimated.');
  write('feel-title','Evidence unavailable — not an all-clear');
  write('feel-beach','We cannot assess current shoreline weather. Check the official forecast before traveling.');
  write('feel-water','No current location-specific water temperature is available.');
  write('feel-after','Wind and wet-skin exposure can produce cooling even on warm days.');
  write('feel-decision','Review official water and beach hazard reports before entering the lake.');
 }finally{initMap();}
})();})();

/* Wikimedia is source-backed but network access can fail. Fall back to existing
   first-party regional photography, never label it as a particular beach. */
document.querySelectorAll('img[data-shorefeel-fallback]').forEach(img=>{
 const fallback=img.getAttribute('data-shorefeel-fallback');
 if(!fallback||!fallback.startsWith('/assets/'))return;
 img.addEventListener('error',()=>{
  if(img.dataset.shorefeelFallbackUsed==='1')return;
  img.dataset.shorefeelFallbackUsed='1';
  img.src=fallback;
  img.alt='Regional Lake Michigan shoreline near Sleeping Bear Dunes, not the selected destination';
  const cap=img.closest('figure')?.querySelector('figcaption');
  if(cap)cap.textContent='Destination photograph unavailable. Showing an archival regional Lake Michigan shoreline image instead.';
 });
 // If an image failed before the deferred script executed, still recover.
 if(img.complete && img.naturalWidth===0) img.dispatchEvent(new Event('error'));
});
