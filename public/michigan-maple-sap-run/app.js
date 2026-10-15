'use strict';
(function(){
const $=function(id){return document.getElementById(id);};
const safe=function(s){return String(s??'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
const asDate=function(v){return new Date(v+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});};
const sites=new Map(), markers=new Map();
let current='bay-city', map=null, boardData=[], showAllVenues=false;
const places=[
 {name:'Maple Row Sugarhouse Festival',city:'Jones',region:'Southern Lower',address:'12646 Born Street, Jones, MI 49061',url:'https://www.michiganmaplefestival.com/plan-your-visit',date:'March 13–14 & 20–21, 2027',confirmed:true,description:'Four festival days with sugarhouse tours and maple demonstrations. Saturday 9–4, Sunday 10–3.',tags:['demonstration','family','pancakes'],fee:'Official festival details and food prices',rank:0},
 {name:'Shepherd Maple Syrup Festival',city:'Shepherd',region:'Central Lower',address:'Shepherd, MI 48883',url:'https://www.shepherdmaplesyrupfest.org/',date:'April 22–25, 2027',confirmed:true,description:'Village-wide maple celebration, pancake and sausage meals, crafts and events. Check the festival for individual venues.',tags:['family','pancakes'],fee:'Food and activity prices vary',rank:1},
 {name:'Chippewa Nature Center Maple Syrup Day',city:'Midland',region:'Central Lower',address:'400 S Badour Road, Midland, MI 48640',url:'https://www.chippewanaturecenter.org/',date:'2027 event date not announced',confirmed:false,description:'Historically offers sugarhouse boiling, tree-tapping demonstrations, sugarbush tours and family activities. Its March 21, 2026 event is past.',tags:['demonstration','family','pancakes'],fee:'Check 2027 admission; 2026 prices do not apply',rank:2},
 {name:'Blandford Nature Center Sugarbush',city:'Grand Rapids',region:'Southern Lower',address:'1715 Hillburn Ave NW, Grand Rapids, MI 49504',url:'https://blandfordnaturecenter.org/events/',date:'2027 public tour dates not announced',confirmed:false,description:'Previous spring Sugarbush tours explored tapping and boiling. Advance booking has been required for some tours; check the current event calendar.',tags:['demonstration','family'],fee:'Check current tour costs and booking',rank:3},
 {name:'MSU Tollgate Farm MapleFest',city:'Novi',region:'Southern Lower',address:'28115 Meadowbrook Road, Novi, MI 48377',url:'https://www.canr.msu.edu/tollgate/',date:'2027 MapleFest dates not announced',confirmed:false,description:'The 2026 MapleFest offered wagon rides, a sugarbush trail, a sugar shack visit, maple tasting and pancake meals. Program access requires event verification.',tags:['demonstration','family','pancakes'],fee:'Check current reservations and pricing',rank:4}
,
{"name":"Benedict Family Maple","city":"Vermontville","region":"Southern Lower","address":"Benedict Family Maple, Vermontville, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":5},
{"name":"Bryant Family Farm","city":"Shepherd","region":"Central Lower","address":"Bryant Family Farm, Shepherd, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":6},
{"name":"Butternut Creek Sugar Shack","city":"Mendon","region":"Southern Lower","address":"Butternut Creek Sugar Shack, Mendon, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":7},
{"name":"Klopfenstein Maple Farms","city":"Galien","region":"Southern Lower","address":"Klopfenstein Maple Farms, Galien, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":8},
{"name":"Law Family Farm","city":"North Branch","region":"Southern Lower","address":"Law Family Farm, North Branch, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":9},
{"name":"MapleWorxz","city":"Caro","region":"Central Lower","address":"MapleWorxz, Caro, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":10},
{"name":"Bonz Beach Farms","city":"Onaway","region":"Northern Lower","address":"Bonz Beach Farms, Onaway, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":11},
{"name":"Delaney’s Wood Fired Maple Syrup","city":"Rose City","region":"Northern Lower","address":"Delaney’s Wood Fired Maple Syrup, Rose City, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":12},
{"name":"Maple Dale Farm","city":"Atlanta","region":"Northern Lower","address":"Maple Dale Farm, Atlanta, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":13},
{"name":"Olds Brothers Maple Syrup","city":"Kingsley","region":"Northern Lower","address":"Olds Brothers Maple Syrup, Kingsley, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":14},
{"name":"Reetz Family Sugar Bush / Ron’s Pure Maple Syrup","city":"West Branch","region":"Northern Lower","address":"Reetz Family Sugar Bush / Ron’s Pure Maple Syrup, West Branch, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":15},
{"name":"Sweet Success Sugar Bush","city":"Mio","region":"Northern Lower","address":"Sweet Success Sugar Bush, Mio, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":16},
{"name":"Witt’s Maple","city":"Boyne Falls","region":"Northern Lower","address":"Witt’s Maple, Boyne Falls, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":17},
{"name":"Woods Farm","city":"Rapid City","region":"Northern Lower","address":"Woods Farm, Rapid City, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":18},
{"name":"Besteman Maple Products","city":"Rudyard","region":"Upper Peninsula","address":"Besteman Maple Products, Rudyard, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":19},
{"name":"Michigan Maple Farms","city":"Rudyard","region":"Upper Peninsula","address":"Michigan Maple Farms, Rudyard, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":20},
{"name":"Postma Brothers Maple Syrup","city":"Rudyard","region":"Upper Peninsula","address":"Postma Brothers Maple Syrup, Rudyard, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":21},
{"name":"Twisted Tap Sugar Shack","city":"Pickford","region":"Upper Peninsula","address":"Twisted Tap Sugar Shack, Pickford, MI","url":"https://michiganmaple.org/michigan-maple-weekend-2025/","date":"2027 public event schedule not yet announced","confirmed":false,"sourceYear":2026,"description":"Listed as a participating producer in the association's 2026 Michigan Maple Weekend. No public access, demonstration, or tour is confirmed for 2027; check the association or producer before traveling.","tags":[],"fee":"2027 hours, fees and access not verified","rank":22}
];
function status(value){return value==='FAVORABLE'?'Favorable freeze/thaw':value==='POSSIBLE'?'Possible run weather':value==='LOW'?'Low opportunity':value==='OFF_SEASON'?'Off season':value==='UNAVAILABLE'?'Weather unavailable':'Insufficient hours';}
function levelClass(value){return value==='FAVORABLE'?'good':value==='POSSIBLE'?'wait':value==='UNAVAILABLE'?'error':'off';}
function seasonNote(){
 const species=$('speciesPicker').value;
 $('speciesNote').textContent=species==='red'?'Red maple can bud earlier than sugar maple. Check buds and sap quality at your own trees; weather alone cannot confirm the end of the run.':
 species==='unknown'?'Identify the maple species and check bud development before collecting; the model only evaluates weather.':
 'Sugar maple: weather can identify suitable days, but tree dormancy, budding and site conditions determine actual collection.';
}
function renderSite(data){
 const phase=data.phase;const result=data.summary||{};
 $('seasonPhase').textContent=phase==='OFF_SEASON'?'Outside tapping season':phase==='UNAVAILABLE'?'NWS unavailable':'Seasonal forecast window';
 $('seasonPhase').className='tag '+(phase==='UNAVAILABLE'?'error':phase==='OFF_SEASON'?'off':'good');
 $('freshness').textContent=data.fetchedAt?'NWS checked '+new Date(data.fetchedAt).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'No current weather score';
 $('bestDate').textContent=result.bestDay?asDate(result.bestDay):'—';
 $('bestScore').textContent=Number.isFinite(result.bestScore)?result.bestScore+'/100':'—';
 $('coverage').textContent=result.evaluatedDays!=null?result.evaluatedDays+' days':'—';
 $('seasonLabel').textContent=phase==='OFF_SEASON'?'Closed':phase==='UNAVAILABLE'?'Unknown':'Monitoring';
 $('todayTag').textContent=phase==='OFF_SEASON'?'Off season':phase==='UNAVAILABLE'?'Source unavailable':status(result.bestLevel);
 $('todayTag').className='tag '+levelClass(phase==='OFF_SEASON'?'OFF_SEASON':phase==='UNAVAILABLE'?'UNAVAILABLE':result.bestLevel);
 if(phase==='OFF_SEASON'){
  $('statusHeading').textContent='The sugar season is not underway.';
  $('statusCopy').textContent='This is Michigan’s off-season. The forecast does not turn autumn thaws into fictitious sap runs. Return in late winter for daily freeze/thaw windows, and use the 2027 event listings below to plan a spring visit.';
  $('bestReason').textContent='Weather-based monitoring resumes in late winter';
  $('forecastDays').innerHTML='<p class="evidence">Off season: no daily sap-flow opportunities are being claimed. The visitor directory remains available year-round.</p>';
  $('daysSub').textContent='Daily weather scores resume during the traditional late-winter and spring monitoring period.';
 }else if(phase==='UNAVAILABLE'){
  $('statusHeading').textContent='Weather data temporarily unavailable';
  $('statusCopy').textContent='We could not retrieve a valid hourly NWS forecast. No stale or guessed sap-run score is shown. Try refreshing later.';
  $('bestReason').textContent='Source unavailable';
  $('forecastDays').innerHTML='<p class="evidence">Hourly forecast unavailable. No fallback scores are invented.</p>';
 }else{
  const has=Number.isFinite(result.bestScore);
  $('statusHeading').textContent=has?(result.bestScore>=75?'Promising sap weather ahead':result.bestScore>=50?'A possible sap-weather window':'Limited sap weather in this forecast'):'Not enough forecast hours';
  $('statusCopy').textContent=has?'The strongest modeled freeze/thaw day is '+asDate(result.bestDay)+'. This is a weather opportunity, not a measured sap run. Check your tree buds and sap quality.':'The hourly forecast did not provide enough complete nights and days to score a reliable window.';
  $('bestReason').textContent=has?status(result.bestLevel)+'; check individual days below':'No complete day scored';
  renderDays(data.daily||[]);
  $('daysSub').textContent='National Weather Service hourly forecast for '+data.site.name+', interpreted in local Michigan time.';
 }
 if(window.MapleSapCharts)window.MapleSapCharts.render(phase==='WEATHER_WINDOW'?(data.daily||[]):[],phase,data.site?.name||sites.get(current)?.name||'Michigan');
 seasonNote();
}
function renderDays(days){
 if(!days.length){$('forecastDays').innerHTML='<p>No complete hourly forecast is available.</p>';return;}
 $('forecastDays').innerHTML=days.map(function(d){
  const valid=Number.isFinite(d.score);
  const bar=valid?'<div class="bar '+(d.score<50?'low':'')+'"><i style="width:'+d.score+'%"></i></div>':'<div class="bar"></div>';
  return '<div class="day"><div><strong>'+safe(asDate(d.date))+'</strong><small>'+safe(d.low==null?'—':d.low+'°')+' / '+safe(d.high==null?'—':d.high+'°')+'</small></div>'+
   '<div>'+bar+'<small>'+safe(d.reason)+'</small></div><div class="score">'+(valid?d.score+'/100':'—')+'<small>'+safe(status(d.level))+'</small></div></div>';
 }).join('');
}
function renderBoard(){
 if(!boardData.length){$('regionalBoard').innerHTML='<p class="evidence">Regional board unavailable. Use the location selector above.</p>';return;}
 $('regionalBoard').innerHTML=boardData.map(function(row){
  const level=row.phase==='OFF_SEASON'?'OFF_SEASON':row.phase==='UNAVAILABLE'?'UNAVAILABLE':row.summary?.bestLevel||'INSUFFICIENT';
  return '<button type="button" data-location="'+safe(row.site.id)+'" class="'+(row.site.id===current?'selected':'')+'"><strong>'+safe(row.site.name)+'</strong><span>'+safe(status(level))+(row.summary?.bestDay?' · '+safe(asDate(row.summary.bestDay)):'')+'</span></button>';
 }).join('');
 $('regionalBoard').querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){selectSite(b.dataset.location);$('forecast-tool').scrollIntoView({behavior:'smooth'});});});
}
function selectSite(id){
 if(!sites.has(id))return;
 current=id;$('sitePicker').value=id;
 const url=new URL(window.location.href);url.searchParams.set('site',id);
 window.history.replaceState({},'',url.pathname+url.search+url.hash);
 renderBoard();markSites();loadSite();
}
async function loadSite(){
 $('refreshWeather').disabled=true;
 $('statusHeading').textContent='Checking local weather…';
 try{
  const r=await fetch('/api/maple-sap?mode=site&site='+encodeURIComponent(current));
  if(!r.ok)throw new Error('NWS unavailable');
  const data=await r.json();
  if(current!==data.site.id)return;
  renderSite(data);
 }catch(e){renderSite({phase:'UNAVAILABLE',summary:{},daily:[]});}
 finally{$('refreshWeather').disabled=false;}
}
function colorFor(row){
 if(!row)return '';
 if(row.phase==='OFF_SEASON')return '';
 if(row.phase==='UNAVAILABLE')return 'unavailable';
 const v=row.summary?.bestLevel;
 return v==='FAVORABLE'?'favorable':v==='POSSIBLE'?'possible':'low';
}
function markSites(){
 const reports=new Map(boardData.map(function(row){return [row.site.id,row];}));
 markers.forEach(function(marker,id){
  const level=colorFor(reports.get(id));
  marker.setIcon(window.L.divIcon({className:'',html:'<span class="leaf-marker '+level+(id===current?' selected':'')+'"></span>',iconSize:[22,22],iconAnchor:[11,11]}));
 });
}
// Normal viewport-only use of the OSM public raster tile server; no API key.
// Respect OSM tile policy: attribution, browser caching/Referer and no background prefetch.
function initMap(locations){
 const host=$('map'),fallback=$('mapFallback');
 function reportFailure(){
  fallback.hidden=false;
  fallback.textContent='Map tiles are unavailable right now. Use the Michigan location selector or statewide board to explore forecasts.';
 }
 if(typeof window.L==='undefined'){reportFailure();return;}
 let initialized=false;
 function mount(){
  if(initialized)return;
  initialized=true;
  try{
   map=window.L.map('map',{scrollWheelZoom:false,attributionControl:true,preferCanvas:true}).setView([44.78,-85.58],6);
   const tiles=window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
    minZoom:4,maxZoom:13,maxNativeZoom:13,updateWhenIdle:true,keepBuffer:1,
    detectRetina:false
   });
   let errors=0;
   tiles.on('tileerror',function(){if(++errors>=3)reportFailure();});
   tiles.on('tileload',function(){errors=0;fallback.hidden=true;});
   tiles.addTo(map);
   locations.forEach(function(x){
    const m=window.L.marker([x.lat,x.lon],{title:x.name});
    m.addTo(map).bindTooltip(x.name);
    m.on('click',function(){selectSite(x.id);});
    markers.set(x.id,m);
   });
   markSites();
   window.setTimeout(function(){if(map)map.invalidateSize();},60);
  }catch(e){reportFailure();}
 }
 if('IntersectionObserver' in window){
  const observer=new window.IntersectionObserver(function(entries){
   if(entries.some(function(entry){return entry.isIntersecting;})){
    observer.disconnect();
    mount();
   }
  },{rootMargin:'180px'});
  observer.observe(host);
 }else mount();
}
function renderVenues(){
 const region=$('venueRegion').value,type=$('venueType').value;
 const filtered=places.filter(function(x){return (region==='all'||x.region===region)&&(type==='all'||x.tags.includes(type));});
 const canExpand=region==='all'&&type==='all'&&filtered.length>8;
 const shown=canExpand&&!showAllVenues?filtered.slice(0,8):filtered;
 const imgByRank=[
 {src:'https://commons.wikimedia.org/wiki/Special:FilePath/Maple_syrup_evaporator_-_Beaver_Meadow_Audubon_Center.jpg?width=960',alt:'Reference photograph of a wood-fired maple syrup evaporator, not this Michigan venue'},
 {src:'https://commons.wikimedia.org/wiki/Special:FilePath/Maple_syrup_bucket.jpg?width=960',alt:'Historic photograph of tapped maple with collection bucket, not this Michigan festival'},
 {src:'https://commons.wikimedia.org/wiki/Special:FilePath/Maple_sap_buckets_-_Beaver_Meadow_Audubon_Center.jpg?width=960',alt:'Historic reference maple collection buckets; not Chippewa Nature Center'},
 {src:'https://commons.wikimedia.org/wiki/Special:FilePath/Maple_syrup_evaporator_-_Beaver_Meadow_Audubon_Center.jpg?width=960',alt:'Reference photograph of maple syrup production; not Blandford Nature Center'},
 {src:'https://commons.wikimedia.org/wiki/Special:FilePath/Maple_syrup_bucket.jpg?width=960',alt:'Reference photograph of a tapped maple; not MSU Tollgate Farm'}
 ];
 $('venues').innerHTML=shown.length?shown.map(function(v){
  const archive=!!v.sourceYear;
  // Archive producer search links use town and venue name, not an invented street address.
  const dir='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(v.address);
  const ref=archive?null:imgByRank[v.rank];
  const image=ref?'<div class="venue-visual"><img src="'+safe(ref.src)+'" alt="'+safe(ref.alt)+'" loading="lazy" decoding="async"><span class="ref-label">Reference photo · not this venue</span></div>':'';
  return '<article class="venue '+(archive?'venue-archive':'venue-featured')+'">'+image+'<div class="venue-body">'+
   '<div class="statusline"><span class="tag '+(v.confirmed?'good':'off')+'">'+(v.confirmed?'2027 dates confirmed':archive?'2026 participating producer':'2027 date not announced')+'</span></div>'+
   '<h3>'+safe(v.name)+'</h3><div class="place">'+safe(v.city+', '+v.region)+'</div>'+
   '<div class="date">'+safe(v.date)+'</div><p>'+safe(archive?'Participated in Michigan Maple Weekend 2026. Check the organizer for public access, visiting dates and demonstrations in 2027.':v.description)+'</p>'+
   '<div class="venue-meta">'+safe(v.fee)+'</div>'+
   '<div class="links"><a target="_blank" rel="noopener noreferrer" href="'+safe(v.url)+'">'+(v.confirmed?'2027 event details ↗':archive?'2026 producer source ↗':'Organizer & updates ↗')+'</a>'+
   '<a target="_blank" rel="noopener noreferrer" href="'+safe(dir)+'">Location map ↗</a></div></div></article>';
 }).join(''):'<p class="evidence">No listings match these filters. Try another region or experience type. Unverified 2027 tours are not offered as confirmed experiences.</p>';
 const toggle=$('toggleAllVenues');
 if(toggle){toggle.hidden=!canExpand;toggle.setAttribute('aria-expanded',String(showAllVenues));toggle.textContent=showAllVenues?'Show fewer sugarhouses':'See all '+filtered.length+' statewide listings';}
 if($('venueCount'))$('venueCount').textContent=shown.length+' of '+filtered.length+' locations shown';
}
async function start(){
 renderVenues();seasonNote();
 $('venueRegion').addEventListener('change',function(){showAllVenues=false;renderVenues();});
 $('venueType').addEventListener('change',function(){showAllVenues=false;renderVenues();});
 $('toggleAllVenues').addEventListener('click',function(){showAllVenues=!showAllVenues;renderVenues();});
 $('speciesPicker').addEventListener('change',seasonNote);
 $('sitePicker').addEventListener('change',function(){selectSite(this.value);});
 $('refreshWeather').addEventListener('click',loadSite);
 try{
  const r=await fetch('/api/maple-sap?mode=locations');
  if(!r.ok)throw new Error('Location catalog unavailable');
  const data=await r.json();
  if(!Array.isArray(data.locations)||!data.locations.length)throw new Error('Empty catalog');
  data.locations.forEach(function(x){sites.set(x.id,x);});
  $('sitePicker').innerHTML=data.locations.map(function(x){return '<option value="'+safe(x.id)+'">'+safe(x.name)+' · '+safe(x.region)+'</option>';}).join('');
  const param=new URL(window.location.href).searchParams.get('site');
  current=sites.has(param)?param:'bay-city';
  $('sitePicker').value=current;
  initMap(data.locations);
  await Promise.all([loadSite(),(async function(){
   try{
    const r=await fetch('/api/maple-sap?mode=board');
    if(!r.ok)throw new Error('Regional board unavailable');
    const body=await r.json();boardData=body.locations||[];
   }catch(e){boardData=[];$('boardNote').textContent='The regional weather board is unavailable; individual location forecasts may still work.';}
   renderBoard();markSites();
  })()]);
 }catch(e){
  $('statusHeading').textContent='Location service unavailable';
  $('statusCopy').textContent='The live service could not load. Refresh this page later. Sugarhouse dates and educational guidance remain available.';
  $('seasonPhase').textContent='Weather unavailable';$('mapFallback').hidden=false;
  $('regionalBoard').innerHTML='<p class="evidence">Could not load statewide locations.</p>';
  $('forecastDays').innerHTML='<p class="evidence">Live weather unavailable.</p>';
  if(window.MapleSapCharts)window.MapleSapCharts.render([], 'UNAVAILABLE', 'Michigan');
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();