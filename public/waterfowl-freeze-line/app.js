/* Regional forecast exposure explorer. Does NOT present measured wetland ice, snow depth or bird flocks. */
(function(){
'use strict';
var ENDPOINT='/api/waterfowl-freeze-line';
var LOCATIONS=[
 ['upper-peninsula','Central Upper Peninsula','MI',46.25,-87.05,'Interior marshes and sheltered bays'],
 ['northern-lower','Northern Lower Michigan','MI',45.08,-84.72,'Inland marshes and protected lake coves'],
 ['saginaw-bay','Saginaw Bay & Shiawassee Flats','MI',43.55,-83.87,'Open bay, river mouths and refuge wetlands'],
 ['detroit-river','Detroit River & Lake St. Clair','MI',42.40,-82.98,'Big water, river channels and coastal marshes'],
 ['western-lake-erie','Western Lake Erie Marshes','OH',41.60,-83.22,'Coastal wetlands and shallow western basin'],
 ['green-bay','Green Bay & Door Peninsula','WI',44.73,-87.85,'Coastal marshes and large sheltered bays'],
 ['horicon-marsh','Horicon Marsh','WI',43.48,-88.62,'Managed wetland complex and surrounding fields'],
 ['upper-mississippi','Upper Mississippi Pools','WI',43.87,-91.24,'River backwaters, sloughs and open channels'],
 ['minnesota-valley','Minnesota River Valley','MN',44.67,-93.63,'Refuge wetlands and river backwaters'],
 ['iowa-mississippi','Iowa Mississippi Corridor','IA',41.97,-90.36,'Backwater pools and agricultural feeding areas'],
 ['illinois-river','Illinois River Valley','IL',40.25,-90.24,'Floodplain lakes and seasonally flooded wetlands'],
 ['kankakee','Kankakee Marsh Region','IN',41.18,-86.85,'Wetland remnants, rivers and farm fields'],
 ['swan-lake','Swan Lake & Grand River','MO',39.53,-93.23,'Refuges, river corridors and agricultural fields'],
 ['reelfoot','Reelfoot Lake','TN',36.37,-89.36,'Large shallow lake and flooded timber']
].map(function(a){return {id:a[0],name:a[1],state:a[2],lat:a[3],lon:a[4],habitat:a[5],weather:{status:'unavailable'},surface:{status:'unavailable'},lakeIce:{status:'unavailable'}};});
var byId=new Map(LOCATIONS.map(function(r){return [r.id,r]}));
var selected='saginaw-bay',overviewDone=false,request=0;
var $=function(id){return document.getElementById(id)};
function label(r){return r.weather.status!=='forecast'?'Unverified':r.weather.pressure==='strong'?'Strong freeze pressure':r.weather.pressure==='building'?'Building freeze pressure':'Limited forecast freezing';}
function pressure(r){return r.weather.status==='forecast'?r.weather.pressure:'unknown';}
function visible(r){
 var q=$('region-search').value.trim().toLowerCase(),state=$('state').value;
 return (state==='all'||r.state===state)&&(!q||(r.name+' '+r.state+' '+r.habitat).toLowerCase().includes(q));
}
function sortRegions(a,b){
 var s=$('sort').value;
 if(s==='north')return b.lat-a.lat;
 if(s==='south')return a.lat-b.lat;
 var aa=a.weather.status==='forecast'?a.weather.freezingHours72:-1,bb=b.weather.status==='forecast'?b.weather.freezingHours72:-1;
 return bb-aa||b.lat-a.lat;
}
function DOM(tag,cls,text){
 var e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined)e.textContent=text;
 return e;
}
function renderPins(){
 var holder=$('map-pins');
 holder.replaceChildren();
 LOCATIONS.forEach(function(r,i){
  var b=DOM('button','map-pin '+pressure(r)+(selected===r.id?' selected':''),String(i+1));
  b.type='button';b.style.left=((r.lon+101)/24*100)+'%';b.style.top=((50-r.lat)/16.5*100)+'%';
  b.title=r.name+' — '+label(r)+' | NOAA: '+(r.surface?.status==='observed_analysis'?r.surface.description:'not verified');
  b.setAttribute('aria-label','View '+r.name+'. '+label(r));
  b.setAttribute('aria-pressed',selected===r.id?'true':'false');
  b.hidden=!visible(r);
  b.addEventListener('click',function(){selectRegion(r.id)});
  holder.appendChild(b);
 });
}
function renderBoard(){
 var arr=LOCATIONS.filter(visible).sort(sortRegions);
 var holder=$('region-board');
 holder.replaceChildren();
 $('board-count').textContent=arr.length+' of '+LOCATIONS.length+' regions';
 if(!arr.length){holder.appendChild(DOM('p','explain','No regions match. Clear your filters.'));return;}
 arr.forEach(function(r){
  var b=DOM('button','region-item');b.type='button';b.setAttribute('aria-pressed',r.id===selected?'true':'false');
  var left=DOM('div');left.appendChild(DOM('strong','',r.name));left.appendChild(DOM('small','',r.state+' · '+label(r)));if(r.surface?.status==='observed_analysis')left.appendChild(DOM('small','satellite-line','NOAA cell: '+r.surface.description));
  var right=DOM('div','hours');right.appendChild(DOM('strong','',r.weather.status==='forecast'?String(r.weather.freezingHours72)+'h':'—'));
  right.appendChild(DOM('span','', 'next 72h'));
  b.append(left,right);b.addEventListener('click',function(){selectRegion(r.id)});holder.appendChild(b);
 });
}
function renderOverview(){renderPins();renderBoard();}
function setText(id,txt){$(id).textContent=txt;}
function renderWeather(w){
 $('pressure-badge').className='tag '+(w.status==='forecast'?w.pressure:'');
 setText('pressure-badge',w.status==='forecast'?label({weather:w}):'Forecast unavailable');
 setText('freeze24',w.status==='forecast'?w.freezingHours24+'h':'—');
 setText('freeze72',w.status==='forecast'?w.freezingHours72+'h':'—');
 setText('low-temp',w.status==='forecast'?w.lowestTemperatureF+'°F':'—');
 setText('front-trend',w.status==='forecast'?(w.temperatureDropF>=6?w.temperatureDropF+'°F drop':'No marked drop'):'—');
 setText('front-note',w.status==='forecast'?w.trend:'No valid forecast available');
 setText('cold-hours',w.status==='forecast'&&Number.isFinite(w.forecastColdDegreeHours)?w.forecastColdDegreeHours+'°F·h':'—');
 setText('north-wind',w.status==='forecast'&&Number.isFinite(w.northWindHours)?w.northWindHours+'h':'—');
 setText('wind-note',w.status==='forecast'?(w.windSignal||'Wind direction unavailable'):'N/NE/NW at least 10 mph');
 setText('freeze-run',w.status==='forecast'&&Number.isFinite(w.longestFreezingRunHours)?'Longest freeze run '+w.longestFreezingRunHours+'h':'At or below 32°F');
 setText('forecast-date',w.status==='forecast'?'Starting '+new Date(w.issuedAt).toLocaleString([], {month:'short',day:'numeric',hour:'numeric'}):'Unavailable');
 renderChart(w);
}
function renderChart(w){
 var holder=$('temp-chart');holder.replaceChildren();
 if(w.status!=='forecast'||!Array.isArray(w.series)||w.series.length<2){holder.appendChild(DOM('p','explain','No current NWS hourly series available for this reference point.'));return;}
 var pts=w.series,temps=pts.map(function(o){return o.tempF}),max=Math.max(42,Math.max.apply(null,temps)+6),min=Math.min(22,Math.min.apply(null,temps)-6),W=560,H=204,L=34,R=17,T=16,B=36;
 function y(t){return T+(max-t)/(max-min)*(H-T-B)}
 function x(i){return L+i/(pts.length-1)*(W-L-R)}
 var curve=pts.map(function(p,i){return x(i).toFixed(1)+','+y(p.tempF).toFixed(1)}).join(' ');
 var markup='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 204" aria-hidden="true">';
 [min,32,max].forEach(function(v){markup+='<line x1="'+L+'" y1="'+y(v).toFixed(1)+'" x2="'+(W-R)+'" y2="'+y(v).toFixed(1)+'" stroke="#dbe5dc" stroke-width="1"/><text x="1" y="'+(y(v)+4).toFixed(1)+'">'+Math.round(v)+'°</text>';});
 markup+='<line class="threshold" x1="'+L+'" y1="'+y(32).toFixed(1)+'" x2="'+(W-R)+'" y2="'+y(32).toFixed(1)+'"/>';
 markup+='<polyline class="line" points="'+curve+'"/>';
 pts.forEach(function(p,i){
  if(i%2===0||i===pts.length-1){markup+='<text text-anchor="middle" x="'+x(i).toFixed(1)+'" y="196">'+new Date(p.time).toLocaleDateString([],{weekday:'short'})+'</text>';}
 });
 markup+='</svg>';
 holder.innerHTML=markup;
 holder.setAttribute('aria-label','NWS temperatures every six hours from '+pts[0].tempF+' to '+pts[pts.length-1].tempF+' Fahrenheit. '+w.freezingHours72+' of '+w.validHours+' forecast hours at or below 32 degrees.');
}
function textDate(value){if(!value)return 'Dated analysis unavailable';const d=new Date(value);return isNaN(d.getTime())?'Dated analysis unavailable':'Analysis file '+d.toLocaleString([],{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});}
function renderNOAA(r){
 var surface=r.surface||{},lake=r.lakeIce||{};
 if(surface.status==='observed_analysis'){
  setText('noaa-surface',surface.description);
  setText('surface-valid',textDate(surface.validAt)+' · NOAA ~1 km reference cell');
  setText('surface-explain','NOAA mapped '+surface.description.toLowerCase()+' at one regional reference-grid cell. This does not establish percent snow cover, how deep snow is, whether the refuge is accessible, or whether local wetlands have frozen.');
 }else{
  setText('noaa-surface',surface.status==='stale'?'Stale NOAA analysis — not used':'NOAA coverage unavailable');
  setText('surface-valid',surface.validAt?textDate(surface.validAt):'No recent verified file date');
  setText('surface-explain','No current valid 1-km class is available. This is NOT snow-free or ice-free evidence.');
 }
 if(lake.status==='observed_chart'){
  setText('noaa-lake-ice',lake.description);
  setText('ice-valid',textDate(lake.validAt)+' · '+(lake.reference||'official chart polygon'));
 }else if(lake.status==='not_applicable'){
  setText('noaa-lake-ice','Not a Great Lakes reference point');
  setText('ice-valid','Great Lakes chart is not used for inland marshes.');
 }else{
  setText('noaa-lake-ice',lake.status==='stale'?'Latest ice chart is stale':'No current ice chart at this point');
  setText('ice-valid',lake.validAt?textDate(lake.validAt):'No recent official chart polygon');
 }
}
function renderSightings(s){
 var holder=$('sightings');holder.replaceChildren();
 if(!s||s.status!=='reported'){
  setText('sighting-status','The observation feed is unavailable. That does not mean there are no birds.');
  return;
 }
 var n=s.reportsInQuery;
 setText('sighting-status',n===0?'No research-grade public records found in the selected area for this period. This is not evidence of absence.':(n===null?'Recent research-grade records':'Research-grade observations in query: '+n+' records (not individual birds)')+'.');
 if(s.sampleMayBeIncomplete)holder.appendChild(DOM('p','explain','The source has more than 100 records; this is a recent sample, not a complete count.'));
 (s.sample||[]).forEach(function(o){
  var line=DOM('div','sighting');var left=DOM('div');left.appendChild(DOM('strong','',o.species));left.appendChild(DOM('small','',o.date+' · '+o.quality));line.appendChild(left);
  if(/^https:\/\/www\.inaturalist\.org\/observations\/\d+$/.test(o.sourceUrl)){
   var a=DOM('a','', 'View record ↗');a.href=o.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';line.appendChild(a);
  }
  holder.appendChild(line);
 });
 if(n!==0&&!(s.sample||[]).length)holder.appendChild(DOM('p','explain','No individual observation details were returned.'));
}
async function getJson(path){var c=new AbortController(),t=setTimeout(function(){c.abort()},27000);try{var resp=await fetch(path,{headers:{accept:'application/json'},signal:c.signal});if(!resp.ok)throw Error('HTTP '+resp.status);return await resp.json()}finally{clearTimeout(t)}}
async function selectRegion(id){
 if(!byId.has(id))return;
 selected=id;
 var r=byId.get(id),token=++request;
 setText('detail-title',r.name);setText('region-habitat',r.habitat);
 renderOverview();
 renderWeather(r.weather);renderNOAA(r);
 setText('sighting-status','Loading dated public waterfowl observations for '+r.name+'…');
 $('sightings').replaceChildren();
 if(typeof gtag==='function')gtag('event','waterfowl_region_select',{region:id});
 try{
  var data=await getJson(ENDPOINT+'?mode=region&region='+encodeURIComponent(id));
  if(token!==request)return;
  if(data.weather)r.weather=data.weather;
  if(data.surface)r.surface=data.surface;
  if(data.lakeIce)r.lakeIce=data.lakeIce;
  renderWeather(r.weather);renderNOAA(r);renderOverview();
  renderSightings(data.sightings);
 }catch(e){if(token===request)setText('sighting-status','The selected region could not be loaded. Other locations remain available; no sighting inference can be made.');}
}
async function loadOverview(){
 setText('overview-status','Checking up to 14 NWS regional hourly forecasts. Some locations may be unavailable.');
 $('refresh').disabled=true;
 try{
  var data=await getJson(ENDPOINT+'?mode=overview');
  var records=Array.isArray(data.regions)?data.regions:[];
  records.forEach(function(r){
   if(!byId.has(r.id))return;var local=byId.get(r.id);
   if(r.weather)local.weather=r.weather;
   if(r.surface)local.surface=r.surface;
   if(r.lakeIce)local.lakeIce=r.lakeIce;
  });
  var usable=LOCATIONS.filter(function(r){return r.weather.status==='forecast'}).length;
  setText('overview-status',usable+' of '+LOCATIONS.length+' regional NWS forecasts available · Updated '+new Date(data.generatedAt).toLocaleString()+'. All colors reflect forecast freezing exposure, not observed bird movement.');
 }catch(e){setText('overview-status','Regional forecast feed unavailable. Select a place for a separate check. A missing forecast is not evidence of open water or birds.');}
 finally{overviewDone=true;$('refresh').disabled=false;renderOverview();renderWeather(byId.get(selected).weather);renderNOAA(byId.get(selected));}
}
['region-search','state','sort'].forEach(function(id){$(id).addEventListener(id==='region-search'?'input':'change',renderOverview)});
$('refresh').addEventListener('click',loadOverview);
renderOverview();
selectRegion(selected);
loadOverview();
})();
