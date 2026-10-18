/* Mackinac Ice Bridge Watch · NOAA observations + NWS forecast (no crossing assessment). */
(function () {
  'use strict';
  var API = '/api/ice-now?region=mackinac-straits';
  var ICE = 'https://mapservices.weather.noaa.gov/vector/rest/services/obs/usnic_greatlakes_ice_chart/MapServer';
  var BOUNDS = [[45.76, -84.81], [45.96, -84.52]];
  var map = null, overlay = null, iceVisible = true, iceReady = false, overlayTimer = null;
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
    text('iceContext', 'If the map is unavailable, use the direct NOAA ice analysis source below. No conditions are inferred from the missing map.');
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
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains:'abcd',maxZoom:16,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(map);
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
    scheduleIce();
  }
  function selectDay(day, button) {
    Array.prototype.forEach.call(el('days').querySelectorAll('button'),function(b){b.setAttribute('aria-pressed',b === button ? 'true':'false');});
    var freeze = Number(day.freezeHours) || 0;
    var thaw = Number(day.thawHours) || 0;
    var range = (day.minTempF == null || day.maxTempF == null) ? 'temperature range unavailable'
      : day.minTempF + '°–' + day.maxTempF + '°F';
    text('dayTitle', dateText(day.date,{weekday:'long',month:'long',day:'numeric',year:undefined}) + ' · ' + range);
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
  }
  async function refresh() {
    var button=el('refresh');button.disabled=true;text('refresh','Refreshing…');
    var ctrl=new AbortController();var timer=setTimeout(function(){ctrl.abort();},16000);
    try {
      var response=await fetch(API,{signal:ctrl.signal,cache:'no-store',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('HTTP '+response.status);
      var data=await response.json();
      if (!data || !data.ok) throw new Error('Invalid response');
      observation(data);forecast(data);
    } catch(e) {
      observation(null);forecast(null);
      text('iceTitle','Unable to check NOAA right now');
      text('iceDescription','The official data request failed. No current ice conditions can be reported. Please open the source links below.');
      text('observationSource','Source fetch failed · current conditions unknown');
    } finally {clearTimeout(timer);button.disabled=false;text('refresh','Refresh observations');}
  }
  el('refresh').addEventListener('click',refresh);
  el('toggleIce').addEventListener('click',function(){
    iceVisible=!iceVisible;this.setAttribute('aria-pressed',iceVisible?'true':'false');
    this.textContent=iceVisible?'NOAA ice layer on':'NOAA ice layer off';scheduleIce();
  });
  el('fitMap').addEventListener('click',function(){if(map)map.fitBounds(BOUNDS,{padding:[20,20]});});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setupMap();refresh();});
  else {setupMap();refresh();}
}());