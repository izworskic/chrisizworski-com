/* Mackinac Ice Bridge Watch · NOAA observations + NWS forecast (no crossing assessment). */
(function () {
  'use strict';
  var API = '/api/ice-now?region=mackinac-straits';
  var ICE = 'https://mapservices.weather.noaa.gov/vector/rest/services/obs/usnic_greatlakes_ice_chart/MapServer';
  var BOUNDS = [[45.76, -84.81], [45.96, -84.52]];
  var map = null, overlay = null, tiles = null, iceVisible = true, iceReady = false, overlayTimer = null;
  var tileErrors = 0, fallbackStarted = false, lastData = null, currentSignal = 'cold', photoIndex = 0;
  var PHOTOS = [
    {src:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Ice_forms_in_the_Straits_of_Mackinac%2C_underneath_the_Mackinac_Bridge%2C_near_St_120124-G-JL323-038.jpg/960px-Ice_forms_in_the_Straits_of_Mackinac%2C_underneath_the_Mackinac_Bridge%2C_near_St_120124-G-JL323-038.jpg", caption:'Ice forming beneath the Mackinac Bridge near St. Ignace, January 2012. Photograph by U.S. Coast Guard PA3 George Degener (public domain).'},
    {src:"https://eoimages.gsfc.nasa.gov/images/imagerecords/5000/5444/ISS010-E-23748_lrg.jpg", caption:'NASA astronaut photograph of spring thaw in the Straits, April 2005 (public domain).'},
    {src:"https://d1ldvf68ux039x.cloudfront.net/thumbs/photos/1312/1079859/2000w_q95.jpg", caption:'Coast Guard cutter Katmai Bay moving through ice. Archival Coast Guard photograph (public domain).'}
  ];
  function mapMessage(message,status) {
    var node = document.getElementById('mapStatus');
    if (node) { node.dataset.status = status || 'ready'; }
    var words = document.getElementById('mapStatusText');
    if (words) words.textContent = message;
  }
  function updateIceButton(){
    var btn=document.getElementById('toggleIce');
    if (!btn) return;
    btn.disabled=!iceReady;
    btn.setAttribute('aria-pressed',String(iceReady && iceVisible));
    btn.textContent=iceReady ? (iceVisible ? 'NOAA ice overlay on':'NOAA ice overlay off') : 'NOAA overlay unavailable';
  }
  // CARTO's 2026 key requirement is enforced even when a raster tile returns HTTP 200.
  // The site's CARTO_BASEMAP_PUBLIC_KEY is intended for browser tile requests; never
  // include private Vercel tokens or other map providers' secrets in this response.
  var OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  function addTiles(url, fallback) {
    if (!map || !window.L) return;
    if (tiles) map.removeLayer(tiles);
    tileErrors = 0;
    tiles = window.L.tileLayer(url, {
      maxZoom: 16, subdomains: 'abcd',
      attribution: fallback ? '&copy; OpenStreetMap contributors' : '&copy; OpenStreetMap contributors &copy; CARTO'
    });
    tiles.on('tileload', function () {
      if (!fallback) mapMessage('CARTO Voyager basemap loaded · licensed key configured','ready');
    });
    tiles.on('tileerror', function () {
      tileErrors += 1;
      if (tileErrors < 3) return;
      if (!fallback && !fallbackStarted) {
        fallbackStarted = true;
        mapMessage('CARTO tiles could not load. Using OpenStreetMap as a temporary fallback.','fallback');
        addTiles(OSM_TILES, true);
      } else if (fallback) {
        mapMessage('Basemap tiles are unavailable on this connection. Forecast and NOAA text remain accessible.','error');
      }
    });
    tiles.addTo(map);
  }
  async function loadCartoBasemap() {
    // Keep the published key in Vercel; fetch it from our own edge endpoint.
    // Do not hardcode a key in the source or attempt a keyless CARTO tile URL.
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 8000);
    try {
      mapMessage('Connecting to the CARTO basemap using the site’s configured key…','pending');
      var response = await fetch('/api/carto-basemap-config', {
        method: 'GET', credentials: 'same-origin', signal: controller.signal
      });
      if (!response.ok) throw new Error('CARTO map configuration unavailable');
      var config = await response.json();
      if (!config || typeof config.key !== 'string' || !config.key.trim()) {
        throw new Error('CARTO public basemap key is missing');
      }
      var tilesUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='
        + encodeURIComponent(config.key.trim());
      addTiles(tilesUrl, false);
    } catch (error) {
      fallbackStarted = true;
      mapMessage('CARTO configuration unavailable. Showing OpenStreetMap until it returns.','fallback');
      addTiles(OSM_TILES, true);
    } finally {
      clearTimeout(timer);
    }
  }
  function addLandmarks() {
    if(!map||!window.L)return;
    var places=[
      {lat:45.8756,lon:-84.7323,name:'St. Ignace',message:'Mainland town. This point is for orientation only; it is not a crossing start.'},
      {lat:45.8492,lon:-84.6179,name:'Mackinac Island',message:'Year-round island community. No travel route or safe ice is indicated.'},
      {lat:45.8174,lon:-84.7278,name:'Mackinac Bridge',message:'The highway bridge crosses the Straits farther west; it is not the Christmas-tree ice bridge.'}
    ];
    places.forEach(function(p){
      window.L.circleMarker([p.lat,p.lon],{radius:6,color:'#f6f9f5',fillColor:'#185b66',weight:2,fillOpacity:1})
        .bindPopup('<strong>'+p.name+'</strong>'+p.message,{autoPan:true,maxWidth:245}).addTo(map);
    });
  }
  var el = function (id) { return document.getElementById(id); };
  function text(id, value) { var node = el(id); if (node) node.textContent = value == null ? '—' : String(value); }
  function dateText(iso, opts) {
    if (!iso || !Number.isFinite(Date.parse(iso))) return 'Unavailable';
    return new Intl.DateTimeFormat('en-US', Object.assign({timeZone:'America/Detroit',month:'short',day:'numeric',year:'numeric'},opts || {})).format(new Date(iso));
  }
  function hourText(iso) {
    if (!iso || !Number.isFinite(Date.parse(iso))) return 'Unavailable';
    return new Intl.DateTimeFormat('en-US', {timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso));
  }
  function setMapFailure() {
    el('mapPanel').classList.add('map-fail');
    mapMessage('Interactive map unavailable. Use the official source links below.','error');
    text('iceContext', 'The interactive map is unavailable; no conditions are inferred from a missing layer.');
  }
  function drawIce() {
    if (!map || !iceReady || !iceVisible) {
      if (overlay && map) { map.removeLayer(overlay); overlay = null; }
      return;
    }
    var b = map.getBounds();
    var size = map.getSize();
    if (!size.x || !size.y) return;
    // Server-rendered NOAA polygons laid directly over a keyless basemap.
    // No proprietary tile/API key and no route line or markers.
    var url = ICE + '/export?f=image&format=png32&transparent=true&bboxSR=4326&imageSR=4326'
      + '&layers=show:0&bbox=' + [b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].map(function (n) { return n.toFixed(5); }).join(',')
      + '&size=' + Math.round(Math.min(1500,size.x*1.8)) + ',' + Math.round(Math.min(1200,size.y*1.8));
    if (overlay) map.removeLayer(overlay);
    overlay = window.L.imageOverlay(url, b, {opacity:0.75,interactive:false,alt:'NOAA analyzed Great Lakes ice concentration polygons'}).addTo(map);
    overlay.on('error',function(){ text('iceContext','The NOAA chart image did not load. See the official NOAA source; the map is not a crossing or safety assessment.'); });
  }
  function scheduleIce() { clearTimeout(overlayTimer); overlayTimer = setTimeout(drawIce,350); }
  function setupMap() {
    if (!window.L || !el('map')) { setMapFailure(); return; }
    try {
      map = window.L.map('map', {scrollWheelZoom:false, attributionControl:true, zoomControl:true});
      loadCartoBasemap();
      addLandmarks();
      map.fitBounds(BOUNDS,{padding:[20,20]});
      window.L.control.scale({imperial:true,metric:false}).addTo(map);
      map.on('moveend resize',scheduleIce);
    } catch (e) { setMapFailure(); }
  }
  function observation(data) {
    var o = data && data.observed && data.observed.regions && data.observed.regions['mackinac-straits'];
    iceReady = !!(o && o.available && !o.stale && o.validAt);
    el('dot').className='state-bullet' + (iceReady ? ' ready' : o && o.stale ? ' stale' : '');
    if (iceReady) {
      text('iceTitle', 'NOAA regional ice analysis available');
      text('iceDescription', (o.rangeLabel || o.dominantClass || 'Classifications available') + '. These are sample-based ice-cover classes, not crossing conditions.');
    } else if (o && o.stale) {
      text('iceTitle', 'Ice analysis is stale or undated');
      text('iceDescription', 'A current, usable chart for this area has not been confirmed. Old ice observations cannot describe today.');
    } else {
      text('iceTitle', 'Current local ice analysis unavailable');
      text('iceDescription', 'No usable recent NOAA concentration classification was found for the sampling area. This does not mean open water or safe ice.');
    }
    text('chartTime', o && o.validAt ? dateText(o.validAt,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : 'Unknown');
    text('coverage', o && o.samplesExpected ? String(o.samplesMatched || 0) + ' of ' + o.samplesExpected : 'Not available');
    text('observationSource', 'NOAA / U.S. National Ice Center · ' + (o && o.validAt ? 'analysis: ' + hourText(o.validAt) : 'no verified local chart timestamp') + (o && o.stale ? ' · STALE' : ''));
    text('iceContext', iceReady
      ? 'The map shows NOAA polygon shading across the Straits. Regional concentration describes surface coverage, never ice thickness or a travel route.'
      : 'The basemap is geographic context only. Without a recent NOAA analysis, no ice conditions are depicted.');
    updateIceButton();
    scheduleIce();
    renderSignal();
  }
  function selectDay(day, button) {
    Array.prototype.forEach.call(el('days').querySelectorAll('button'),function(b){b.setAttribute('aria-pressed',b === button ? 'true':'false');});
    var freeze = Number(day.freezeHours) || 0;
    var thaw = Number(day.thawHours) || 0;
    var range = (day.minTempF == null || day.maxTempF == null) ? 'temperature range unavailable'
      : day.minTempF + '°–' + day.maxTempF + '°F';
    text('dayTitle', dateText(day.date + 'T12:00:00Z',{weekday:'long',month:'long',day:'numeric'}) + ' · ' + range);
    var story = freeze > thaw * 2 ? 'Mostly below-freezing mainland air temperatures: favorable for cooling at the surface.'
      : thaw > freeze * 2 ? 'Mostly above-freezing mainland air temperatures: a thawing air-temperature signal.'
      : 'A mixed freeze/thaw day: the air alternates across the freezing point.';
    text('dayInsight', story + ' ' + freeze + ' forecast hour(s) at or below freezing; ' + thaw
      + ' above. Maximum indicated wind ' + (day.maxWindMph == null ? 'unavailable' : day.maxWindMph + ' mph')
      + '. This does not predict ice thickness, formation of a continuous ice sheet or suitability to cross.');
  }
  function forecast(data) {
    var f = data && data.forecast;
    if (!f || !f.next72h) {
      text('forcingTitle','NWS hourly forecast unavailable');
      text('forcingText','No forecast assessment is available. Recheck the National Weather Service; never substitute a seasonal guess.');
      text('forecastStamp','Source unavailable');
      text('days',''); var p = document.createElement('p');p.textContent='The seven-day chart cannot be drawn without current hourly forecast data.';el('days').appendChild(p);
      text('dayInsight','No weather trend can be stated from the missing forecast.');
      return;
    }
    var t = f.next72h;
    text('forcingTitle', t.forcing ? t.forcing.charAt(0).toUpperCase() + t.forcing.slice(1) : 'Mixed forecast');
    text('forcingText', 'NWS St. Ignace hourly grid · next 72 hours of forecast air temperatures. Wind and local water motion can change ice behavior independently.');
    text('forecastStamp', 'NWS · ' + (f.issuedAt ? dateText(f.issuedAt,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : 'forecast time unverified'));
    text('freezeHours', t.freezeHours == null ? '—' : t.freezeHours);
    text('thawHours', t.thawHours == null ? '—' : t.thawHours);
    text('windMax', t.maxWindMph == null ? '—' : t.maxWindMph + ' mph');
    var days = Array.isArray(f.next7Days) ? f.next7Days.slice(0,7) : [];
    var container=el('days');container.replaceChildren();
    if (!days.length) { var note=document.createElement('p');note.textContent='No usable daily forecast available.';container.appendChild(note);return; }
    days.forEach(function (day, i) {
      var b=document.createElement('button');b.type='button';b.className='day';b.setAttribute('aria-pressed',i===0?'true':'false');
      var date=new Date(day.date);if(!Number.isFinite(date.getTime())) date=new Date();
      var label=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(date);
      var title=document.createElement('strong');title.textContent=label;b.appendChild(title);
      var range=document.createElement('span');range.className='range';range.textContent=day.minTempF == null ? 'No temp' : day.minTempF + '–' + day.maxTempF + '°';b.appendChild(range);
      var bar=document.createElement('span');bar.className='bar';bar.setAttribute('aria-hidden','true');
      var count=Math.max(1,(day.freezeHours||0)+(day.thawHours||0));
      var cold=document.createElement('span');cold.className='freeze';cold.style.width=((day.freezeHours||0)*100/count)+'%';
      var warm=document.createElement('span');warm.className='thaw';warm.style.width=((day.thawHours||0)*100/count)+'%';bar.append(cold,warm);b.appendChild(bar);
      var label2=document.createElement('small');label2.textContent=(day.freezeHours||0)+'h freezing';b.appendChild(label2);
      b.addEventListener('click',function(){selectDay(day,b);});container.appendChild(b);
    });
    selectDay(days[0],container.querySelector('button'));
    renderSignal();
  }
  async function refresh() {
    var button=el('refresh');button.disabled=true;text('refresh','Refreshing…');
    var ctrl=new AbortController();var timer=setTimeout(function(){ctrl.abort();},16000);
    try {
      var response=await fetch(API,{signal:ctrl.signal,cache:'no-store',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('HTTP '+response.status);
      var data=await response.json();
      if (!data || !data.ok) throw new Error('Invalid response');
      lastData=data;
      observation(data);forecast(data);
      renderSignal();
    } catch(e) {
      lastData=null;
      observation(null);forecast(null);
      renderSignal();
      text('iceTitle','Unable to check NOAA right now');
      text('iceDescription','The official data request failed. No current ice conditions can be reported. Please open the source links below.');
      text('observationSource','Source fetch failed · current conditions unknown');
    } finally {clearTimeout(timer);button.disabled=false;text('refresh','Refresh observations');}
  }
  el('refresh').addEventListener('click',refresh);
  el('toggleIce').addEventListener('click',function(){
    if(!iceReady)return;
    iceVisible=!iceVisible;updateIceButton();scheduleIce();
  });
  el('fitMap').addEventListener('click',function(){if(map)map.fitBounds(BOUNDS,{padding:[20,20]});});

  // Three condition-driven explanations, not a fabricated prediction of ice integrity.
  function renderSignal() {
    var t=lastData && lastData.forecast && lastData.forecast.next72h;
    var ice=lastData && lastData.observed && lastData.observed.regions && lastData.observed.regions['mackinac-straits'];
    var title='',story='',value='—',unit='',pct=0,eyebrow='';
    if(currentSignal==='cold') {
      eyebrow='01 · Air-temperature signal';
      title='Does the cold last, or does the thaw interrupt?';
      unit='hours at or below 32°F';
      if(t) {
        value=t.freezeHours;
        pct=Math.min(100,100*(t.freezeHours||0)/Math.max(1,t.hours||72));
        story='The St. Ignace NWS grid expects '+t.freezeHours+' freezing hour(s) and '+t.thawHours+' thawing hour(s) over '+t.hours+' forecast hours. Repeated cold is a useful seasonal clue, not a measurement of ice thickness or continuity.';
      } else story='The hourly forecast is currently unavailable. The tracker does not infer a freeze-up from the calendar.';
    } else if(currentSignal==='wind') {
      eyebrow='02 · Wind-driven movement';
      title='Even solid-looking ice can move';
      unit='maximum forecast mph';
      if(t) {
        value=t.maxWindMph == null?'—':t.maxWindMph;
        pct=Math.min(100,100*(t.maxWindMph||0)/50);
        story='NWS forecasts a peak wind of '+(t.maxWindMph==null?'unknown speed':t.maxWindMph+' mph')+' in the coming '+t.hours+' hours. Shifting winds, currents and vessel traffic can break or rearrange ice. This wind number is context, not a pressure-ridge or route forecast.';
      } else story='No usable NWS wind forecast was returned. The Straits can have moving ice even during calm weather.';
    } else {
      eyebrow='03 · Observed NOAA analysis';
      title='A chart sees coverage, not a crossing';
      unit='water samples';
      if(ice && ice.available && !ice.stale && ice.validAt){
        value=(ice.samplesMatched||0)+'/'+(ice.samplesExpected||0);
        pct=100*(ice.samplesMatched||0)/Math.max(1,ice.samplesExpected||1);
        story='Fresh NOAA regional ice analysis is available, last valid '+dateText(ice.validAt)+'. Its polygons classify how much water surface is covered in broad areas, not thickness, cracks or safe travel.';
      } else {
        value='—';pct=0;
        story='No current, usable local NOAA ice chart is available'+(ice && ice.validAt?' (last chart: '+dateText(ice.validAt)+')':'')+'. No ice state is inferred and the map shows geography only.';
      }
    }
    text('signalEyebrow',eyebrow);text('signalTitle',title);text('signalValue',value);text('signalUnit',unit);text('signalStory',story);
    var fill=el('signalFill');if(fill)fill.style.width=Math.round(pct)+'%';
  }
  function setupSignals(){
    document.querySelectorAll('.signal-tab').forEach(function(b){
      b.addEventListener('click',function(){
        currentSignal=this.dataset.signal;
        document.querySelectorAll('.signal-tab').forEach(function(x){
          var active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));
        });
        renderSignal();
      });
    });
    renderSignal();
  }
  function openPhoto(index){
    var modal=el('photoDialog');if(!modal || typeof modal.showModal!=='function')return;
    photoIndex=(index+PHOTOS.length)%PHOTOS.length;
    var p=PHOTOS[photoIndex];
    el('photoLarge').src=p.src;el('photoLarge').alt=p.caption; text('photoCaption',p.caption);text('photoNumber',(photoIndex+1)+' of '+PHOTOS.length);
    if(!modal.open)modal.showModal();
  }
  function setupGallery(){
    document.querySelectorAll('button.photo-open').forEach(function(b){b.addEventListener('click',function(){openPhoto(Number(b.dataset.photo)||0);});});
    var close=el('closePhoto'),prev=el('photoPrev'),next=el('photoNext'),modal=el('photoDialog');
    if(close)close.addEventListener('click',function(){modal.close();});
    if(prev)prev.addEventListener('click',function(){openPhoto(photoIndex-1);});
    if(next)next.addEventListener('click',function(){openPhoto(photoIndex+1);});
    if(modal)modal.addEventListener('click',function(ev){if(ev.target===modal)modal.close();});
    document.querySelectorAll('.photo-card img').forEach(function(img){
      img.addEventListener('error',function(){
        var card=img.closest('.photo-card');
        if(!card)return;
        var b=card.querySelector('.photo-open');if(b){b.disabled=true;b.style.background='#e7f0f0';b.textContent='Photo unavailable — use credited source below';}
      });
    });
  }
  function initialize(){setupGallery();setupSignals();setupMap();refresh();}

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initialize);
  else initialize();
}());