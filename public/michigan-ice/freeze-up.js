/* Great Lakes freeze-up explorer for the existing Michigan Ice Report.
 * Geographic map: latest USNIC chart only. Historical slider: GLERL whole-lake
 * time series only. NEVER imply the slider changes the map or evaluates safety.
 * Progressive enhancement: the existing report works with no JS/library/data. */
(function () {
  'use strict';
  var REGIONS = {
    'saginaw-bay': {
      name: 'Saginaw Bay', lake: 'huron', lakeName: 'Lake Huron',
      bounds: [[43.48,-84.18],[44.61,-82.48]],
      context: 'Shallow inner-bay ice may behave differently from the exposed outer bay. Offshore wind can open leads even after extended cold.',
      link: '/michigan-ice/regions/saginaw-bay.html'
    },
    'lake-st-clair': {
      name: 'Lake St. Clair', lake: 'stclair', lakeName: 'Lake St. Clair',
      bounds: [[42.28,-83.13],[42.84,-82.42]],
      context: 'River currents, navigation channels and the shipping corridor can maintain open water within otherwise ice-covered areas.',
      link: '/michigan-ice/regions/lake-st-clair.html'
    },
    'little-bay-de-noc': {
      name: 'Little Bay de Noc', lake: 'michigan', lakeName: 'Lake Michigan',
      bounds: [[45.62,-87.31],[46.22,-86.71]],
      context: 'The Escanaba and Ford River mouths and the exposed outer bay do not behave like protected coves.',
      link: '/michigan-ice/regions/little-bay-de-noc.html'
    },
    'grand-traverse-bay': {
      name: 'Grand Traverse Bay', lake: 'michigan', lakeName: 'Lake Michigan',
      bounds: [[44.65,-85.78],[45.27,-85.28]],
      context: 'Deep open water can remain ice-free while small protected inlets ice over. Do not generalize a sheltered shoreline to the bay.',
      link: '/michigan-ice/regions/grand-traverse-bay.html'
    }
  };
  var MAP_SERVICE = 'https://mapservices.weather.noaa.gov/vector/rest/services/obs/usnic_greatlakes_ice_chart/MapServer/export';
  var LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  var LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  var currentSlug = (location.pathname.match(/\/regions\/([a-z-]+)\.html$/) || [])[1] || 'saginaw-bay';
  if (!REGIONS[currentSlug]) currentSlug = 'saginaw-bay';
  var root, select, map, overlay, loadingLeaflet, activeData = null, datasets = {}, layerStamp = null;
  var playTimer = null, chartSeries = [], currentIndex = 0, mapRequest = 0;
  var mapReady = false;

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function text(id, value) {
    var e = root && root.querySelector('#' + id);
    if (e) e.textContent = value;
  }
  function escNum(n) {
    return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : 'Unavailable';
  }
  function percent(n) {
    return Number.isFinite(n) && n >= 0 && n <= 100 ? escNum(n) + '%' : 'unavailable';
  }
  function dateOnly(s) {
    if (!s) return 'unavailable';
    var d = new Date(s);
    return Number.isNaN(d.valueOf()) ? 'unavailable' :
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }
  function isFreshRegion(r) {
    var valid = r && Date.parse(r.validAt);
    return !!(activeData && activeData.iceSeason && r && r.supported &&
      r.available && !r.stale && Number.isFinite(valid) &&
      Date.now() >= valid && Date.now() - valid <= 48 * 3600000);
  }
  function regionData(slug) {
    return activeData && activeData.observed && activeData.observed.regions &&
      activeData.observed.regions[slug] || null;
  }
  function seriesFor(lakeData) {
    return (lakeData && Array.isArray(lakeData.series) ? lakeData.series : []).filter(function (r) {
      return /^\d{4}-\d\d-\d\d$/.test(r.date) && Number.isFinite(r[REGIONS[currentSlug].lake]) &&
        r[REGIONS[currentSlug].lake] >= 0 && r[REGIONS[currentSlug].lake] <= 100;
    });
  }
  function stopPlayback() {
    if (playTimer !== null) { clearInterval(playTimer); playTimer = null; }
    var b = root && root.querySelector('#ice-ex-play');
    if (b) b.textContent = 'Play daily progression';
  }
  function svgNode(tag, attributes) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attributes || {}).forEach(function (key) { n.setAttribute(key, attributes[key]); });
    return n;
  }
  function drawChart() {
    var svg = root.querySelector('#ice-ex-chart'), slider = root.querySelector('#ice-ex-slider');
    svg.replaceChildren();
    var available = activeData && activeData.observed && activeData.observed.lakeWide;
    var historic = !activeData || !activeData.iceSeason;
    var source = historic ? activeData && activeData.historical : available;
    chartSeries = seriesFor(source);
    slider.max = String(Math.max(0, chartSeries.length - 1));
    slider.disabled = chartSeries.length < 2;
    root.querySelector('#ice-ex-play').disabled = chartSeries.length < 2;
    var lakeName = REGIONS[currentSlug].lakeName;
    text('ice-ex-chart-heading', lakeName + ' — whole-lake ice cover');
    text('ice-ex-timeline-note', historic
      ? 'Historical observations from the last completed winter. These are not current conditions.'
      : 'This season: observed whole-lake coverage, not a measurement of the selected bay.');
    if (!chartSeries.length) {
      text('ice-ex-chart-value', 'No NOAA daily series is available. No values have been estimated.');
      return;
    }
    currentIndex = chartSeries.length - 1;
    slider.value = String(currentIndex);
    var width=680, height=220, left=48, right=16, top=15, bottom=36;
    var plotW=width-left-right, plotH=height-top-bottom;
    var lakeKey=REGIONS[currentSlug].lake;
    var val=function(i){return Number(chartSeries[i][lakeKey]);};
    var x=function(i){return left + (chartSeries.length === 1 ? 0 : (i/(chartSeries.length-1))*plotW);};
    var y=function(v){return top + plotH - Math.max(0,Math.min(100,v))/100*plotH;};
    [0,25,50,75,100].forEach(function (tick) {
      var line=svgNode('line',{x1:left,y1:y(tick),x2:width-right,y2:y(tick),stroke:'#d8e6e9','stroke-width':1});
      svg.appendChild(line);
      var label=svgNode('text',{x:37,y:y(tick)+4,'text-anchor':'end',fill:'#44616b','font-size':11});
      label.textContent=tick+'%'; svg.appendChild(label);
    });
    var path=svgNode('path', { d: chartSeries.map(function(r,i) {
      return (i===0?'M':'L')+x(i).toFixed(1)+','+y(val(i)).toFixed(1);
    }).join(' '), fill:'none',stroke:'#087889','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round' });
    svg.appendChild(path);
    [0, chartSeries.length-1].forEach(function(i) {
      var tick=svgNode('text',{x:x(i),y:height-12,'text-anchor':i===0?'start':'end',fill:'#44616b','font-size':12});
      tick.textContent=dateOnly(chartSeries[i].date).replace(/, \d{4}/,'');svg.appendChild(tick);
    });
    var focus=svgNode('circle',{id:'ice-ex-focus',cx:x(currentIndex),cy:y(val(currentIndex)),r:6,fill:'#084b61',stroke:'#fff','stroke-width':2});
    svg.appendChild(focus);
    svg.setAttribute('viewBox','0 0 '+width+' '+height);
    svg.setAttribute('role','img');
    svg.setAttribute('aria-label','NOAA GLERL whole-lake daily ice coverage chart for '+lakeName+
      '. Use the date slider to inspect daily observations; the geographic map remains latest-only.');
    slider.oninput=function () {
      currentIndex=Math.max(0,Math.min(chartSeries.length-1,Number(slider.value)||0));
      focus.setAttribute('cx',x(currentIndex));
      focus.setAttribute('cy',y(val(currentIndex)));
      text('ice-ex-chart-value',dateOnly(chartSeries[currentIndex].date)+': '+percent(val(currentIndex))+
        ' of '+lakeName+' covered by ice (whole-lake mean).');
    };
    slider.oninput();
  }
  function mercX(lon) {return lon*20037508.342789244/180;}
  function mercY(lat) {
    var bounded=Math.max(-85,Math.min(85,lat));
    return Math.log(Math.tan(Math.PI/4+bounded*Math.PI/360))*20037508.342789244/Math.PI;
  }
  function updateMap() {
    if (!map || !activeData) return;
    var r=regionData(currentSlug);
    if (!isFreshRegion(r)) {
      if (overlay) {map.removeLayer(overlay);overlay=null;}
      text('ice-ex-map-stamp',activeData.iceSeason
        ? 'Regional chart unavailable or older than 48 hours. Ice overlay withheld.'
        : 'Off season. Current ice overlay withheld; use the historical chart below.');
      return;
    }
    var bounds=map.getBounds();
    if (!bounds.isValid()) return;
    var size=map.getSize();
    var w=Math.max(320,Math.min(1200,Math.round(size.x*1.5)));
    var h=Math.max(240,Math.min(900,Math.round(size.y*1.5)));
    var sw=bounds.getSouthWest(),ne=bounds.getNorthEast();
    var bbox=[mercX(sw.lng),mercY(sw.lat),mercX(ne.lng),mercY(ne.lat)];
    var args = new URLSearchParams({
      bbox: bbox.map(function(v){return v.toFixed(2);}).join(','),
      bboxSR: '3857', imageSR: '3857', size:w+','+h,
      format: 'png32', transparent: 'true', layers: 'show:0',
      f: 'image'
    });
    var request=++mapRequest;
    var next=window.L.imageOverlay(MAP_SERVICE+'?'+args.toString(),bounds,{opacity:.79});
    next.on('load',function(){
      if(request!==mapRequest){map.removeLayer(next);return;}
      if(overlay) map.removeLayer(overlay);
      overlay=next;
      text('ice-ex-map-stamp','NOAA/NWS USNIC regional chart valid ' +dateOnly(r.validAt)+
        '. Coverage categories, not local thickness. Zoom/pan to inspect geographic patterns.');
    });
    next.on('error',function(){
      map.removeLayer(next);
      if(request===mapRequest) text('ice-ex-map-stamp','NOAA map image unavailable. Regional observation and the separate timeline remain available.');
    });
    next.addTo(map);
  }
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (loadingLeaflet) return loadingLeaflet;
    var css=el('link');css.rel='stylesheet';css.href=LEAFLET_CSS;
    document.head.appendChild(css);
    loadingLeaflet=new Promise(function(resolve,reject){
      var script=el('script');script.src=LEAFLET_JS;script.defer=true;
      script.onload=function(){window.L?resolve(window.L):reject(new Error('Leaflet missing'));};
      script.onerror=function(){reject(new Error('Leaflet unavailable'));};
      document.head.appendChild(script);
    });
    return loadingLeaflet;
  }
  function initMap() {
    if (mapReady) return;
    mapReady=true;
    loadLeaflet().then(function(L) {
      map=L.map('ice-ex-map',{scrollWheelZoom:false,maxZoom:12,minZoom:5});
      L.tileLayer('https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',{
        maxZoom:19,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(map);
      map.on('moveend',updateMap);
      setRegionMap();
    }).catch(function () {
      text('ice-ex-map-stamp','Map library unavailable. See the dated NOAA chart source below.');
      root.querySelector('#ice-ex-map').textContent='Interactive map unavailable; the NOAA coverage chart and water-specific report remain accessible.';
    });
  }
  function setRegionMap() {
    if (!map) return;
    ++mapRequest;
    if(overlay){map.removeLayer(overlay);overlay=null;}
    map.fitBounds(REGIONS[currentSlug].bounds,{padding:[12,12],animate:false});
  }
  function onRegionChange(slug) {
    if(!REGIONS[slug]) return;
    stopPlayback();
    currentSlug=slug;
    select.value=slug;
    text('ice-ex-context',REGIONS[slug].context);
    var link=root.querySelector('#ice-ex-detail');
    link.href=REGIONS[slug].link;
    link.textContent='Explore '+REGIONS[slug].name+' conditions';
    drawChart();
    if(map) setRegionMap();
    // Reuse a previously fetched regional snapshot, with its own age checks.
    if (datasets[slug] && activeData && !regionData(slug)) {
      activeData = datasets[slug];
      drawChart();
      updateMap();
      return;
    }
    // One-water lookup when the parent page did not already fetch this water.
    if(activeData && !regionData(slug)){
      var requested=slug;
      text('ice-ex-map-stamp','Loading dated regional ice observations…');
      fetch('/api/ice-now?region='+encodeURIComponent(slug)).then(function(r){
        if(!r.ok) throw Error('regional ice request failed');
        return r.json();
      }).then(function(next){
        if(!next || !next.observed || !next.observed.regions) throw Error('no regional chart');
        datasets[requested]=next;
        if(currentSlug!==requested) return;
        activeData=next;
        drawChart(); updateMap();
      }).catch(function(){
        if(currentSlug===requested) text('ice-ex-map-stamp','Regional ice data unavailable. Never interpret missing coverage as open water.');
      });
    }
    // Map fitBounds fires moveend; do not request the same NOAA image twice.
  }
  function render(data) {
    if(!data || !data.observed || !data.ok) {
      text('ice-ex-map-stamp','No current NOAA data available. The map does not provide an ice assessment.');
      text('ice-ex-chart-value','NOAA time series unavailable.');
      return;
    }
    activeData=data;
    datasets[currentSlug]=data;
    drawChart();
    initMap();
    if (map) updateMap();
  }
  function setup() {
    if(document.getElementById('ice-freeze-explorer')) return;
    var anchor=document.getElementById('water-picker') ||
      document.getElementById('region-live') || document.getElementById('the-read-card');
    if(!anchor) return;
    var style=el('style');style.textContent=[
      '#ice-freeze-explorer{margin:22px 0;border:1px solid #a9c9d1;border-radius:16px;padding:18px;background:#f6fbfc;color:#153845;overflow:hidden}',
      '#ice-freeze-explorer *{box-sizing:border-box}',
      '#ice-freeze-explorer h2{margin:4px 0 8px;font-size:clamp(22px,3.4vw,30px);line-height:1.2}',
      '#ice-freeze-explorer .ice-ex-kicker{font:600 11px/1.3 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#446c78}',
      '#ice-freeze-explorer .ice-ex-lede{margin:0 0 14px;line-height:1.55}',
      '#ice-freeze-explorer .ice-ex-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}',
      '#ice-freeze-explorer select,#ice-freeze-explorer button{min-height:42px;border:1px solid #97b7c0;border-radius:8px;padding:9px 12px;background:white;color:#183e48;font:inherit}',
      '#ice-freeze-explorer button{cursor:pointer}',
      '#ice-freeze-explorer button:disabled{cursor:not-allowed;opacity:.6}',
      '#ice-freeze-explorer input[type=range]{width:100%;accent-color:#087889;min-height:35px}',
      '#ice-ex-map{width:100%;height:390px;max-height:50vh;background:#dce8e7;border:1px solid #a9c9d1;border-radius:11px;isolation:isolate}',
      '#ice-ex-map .leaflet-control-container{font-size:12px}',
      '#ice-freeze-explorer .ice-ex-caption{font-size:12px;line-height:1.5;color:#375965;margin:8px 0}',
      '#ice-freeze-explorer .ice-ex-legend{display:flex;flex-wrap:wrap;gap:7px 13px;font-size:12px;margin-top:10px}',
      '#ice-freeze-explorer .ice-ex-legend span{display:inline-flex;align-items:center;gap:6px}',
      '#ice-freeze-explorer .ice-ex-legend i{width:12px;height:12px;border-radius:3px;display:inline-block;border:1px solid #9bb}',
      '#ice-freeze-explorer .ice-ex-chartbox{margin-top:15px;border-top:1px solid #cbdfe2;padding-top:12px}',
      '#ice-ex-chart{display:block;width:100%;max-height:230px;background:#fff;border:1px solid #dae5e8;border-radius:10px}',
      '#ice-ex-chart-heading{font-size:17px;margin:4px 0}',
      '#ice-ex-chart-value{min-height:22px;font-weight:650;font-variant-numeric:tabular-nums}',
      '#ice-freeze-explorer .ice-ex-limit{margin-top:14px;padding:10px 12px;border-left:4px solid #a54a32;background:#fff5ef;font-size:13px;line-height:1.5}',
      '#ice-freeze-explorer a{color:#095c72;text-underline-offset:3px}',
      '@media(max-width:550px){#ice-freeze-explorer{padding:12px}#ice-ex-map{height:290px;max-height:none}#ice-freeze-explorer .ice-ex-controls{display:block}#ice-freeze-explorer select{display:block;width:100%;margin-top:6px}}',
      '@media(prefers-reduced-motion:reduce){#ice-freeze-explorer *{scroll-behavior:auto!important}}'
    ].join('');
    document.head.appendChild(style);
    root=el('section');
    root.id='ice-freeze-explorer';root.setAttribute('aria-labelledby','ice-ex-title');
    root.innerHTML=[
      '<div class="ice-ex-kicker">NOAA • Great Lakes ice explorer</div>',
      '<h2 id="ice-ex-title">Where is the lake freezing?</h2>',
      '<p class="ice-ex-lede">Follow the latest mapped ice concentrations and the daily whole-lake progression. The map and historical timeline describe different observations.</p>',
      '<div class="ice-ex-controls"><label for="ice-ex-region"><strong>Explore a waterbody</strong></label><select id="ice-ex-region">',
      '<option value="saginaw-bay">Saginaw Bay</option><option value="lake-st-clair">Lake St. Clair</option>',
      '<option value="little-bay-de-noc">Little Bay de Noc</option><option value="grand-traverse-bay">Grand Traverse Bay</option>',
      '</select></div>',
      '<p class="ice-ex-caption" id="ice-ex-context"></p>',
      '<div id="ice-ex-map" role="region" aria-label="Current NOAA ice concentration on interactive CARTO map"></div>',
      '<div class="ice-ex-legend" aria-label="NOAA concentration category colors">',
      '<span><i style="background:#0064ff"></i>Ice free</span>',
      '<span><i style="background:#96c8ff"></i>Less than 1 tenth</span>',
      '<span><i style="background:#8cffa0"></i>1–3 tenths</span>',
      '<span><i style="background:#ffff00"></i>4–6 tenths</span>',
      '<span><i style="background:#ff7d07"></i>7–8 tenths</span>',
      '<span><i style="background:#ff0000"></i>9–10 tenths</span>',
      '<span><i style="background:#969696"></i>Fast ice (anchored)</span>',
      '</div>',
      '<p class="ice-ex-caption" id="ice-ex-map-stamp" aria-live="polite">Awaiting NOAA data. Map colors are not ice thickness.</p>',
      '<div class="ice-ex-chartbox">',
      '<div class="ice-ex-kicker">Daily progression · distinct from the map</div>',
      '<h3 id="ice-ex-chart-heading">Whole-lake ice cover</h3>',
      '<p id="ice-ex-timeline-note" class="ice-ex-caption">Loading the dated NOAA GLERL series…</p>',
      '<svg id="ice-ex-chart" viewBox="0 0 680 220"></svg>',
      '<label for="ice-ex-slider"><strong>Inspect a day</strong></label>',
      '<input id="ice-ex-slider" type="range" min="0" max="0" step="1" value="0" disabled>',
      '<p id="ice-ex-chart-value" aria-live="polite">Loading historic ice coverage…</p>',
      '<button type="button" id="ice-ex-play" disabled>Play daily progression</button>',
      '<p class="ice-ex-caption">The slider changes only the whole-lake chart. NOAA’s current ice map has no historic date control. Bay conditions must not be inferred from a lake-wide percentage.</p>',
      '</div>',
      '<p class="ice-ex-limit"><strong>Not a safe-ice assessment.</strong> Ice concentration is the fraction of a mapped area covered by ice—not ice thickness, stability, quality, or a recommendation to walk, fish, snowmobile or drive on it. Wind, current and cracks can change locally without warning.</p>',
      '<p class="ice-ex-caption"><a href="https://mapservices.weather.noaa.gov/vector/rest/services/obs/usnic_greatlakes_ice_chart/MapServer" target="_blank" rel="noopener">NOAA/NWS USNIC mapped ice analysis</a> · ',
      '<a href="https://www.glerl.noaa.gov/data/ice/" target="_blank" rel="noopener">NOAA GLERL ice history</a> · ',
      '<a id="ice-ex-detail" href="/michigan-ice/regions/saginaw-bay.html">Explore Saginaw Bay conditions</a> · ',
      '<a href="/michigan-ice/ice-safety.html">Michigan ice safety guide</a></p>'
    ].join('');
    anchor.parentNode.insertBefore(root,anchor);
    select=root.querySelector('#ice-ex-region');
    select.value=currentSlug;
    select.addEventListener('change',function(){onRegionChange(select.value);});
    root.querySelector('#ice-ex-play').addEventListener('click',function(){
      if(playTimer!==null) {stopPlayback();return;}
      if(chartSeries.length<2) return;
      if(currentIndex>=chartSeries.length-1) currentIndex=-1;
      root.querySelector('#ice-ex-play').textContent='Pause daily progression';
      playTimer=setInterval(function(){
        if(!root || !root.isConnected){stopPlayback();return;}
        currentIndex+=1;
        var slider=root.querySelector('#ice-ex-slider');
        slider.value=String(currentIndex);slider.oninput();
        if(currentIndex>=chartSeries.length-1) stopPlayback();
      },800);
    });
    root.querySelector('#ice-ex-slider').addEventListener('pointerdown',stopPlayback);
    document.addEventListener('visibilitychange',function(){if(document.hidden)stopPlayback();});
    onRegionChange(currentSlug);
    window.addEventListener('michigan-ice-data',function(evt){render(evt.detail);},{once:true});
    if (window.__michiganIceNow) render(window.__michiganIceNow);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();
