/* Great Lakes freeze-up explorer for the existing Michigan Ice Report.
 * Geographic map: latest USNIC chart only. Historical slider: GLERL whole-lake
 * time series only. NEVER imply the slider changes the map or evaluates safety.
 * Progressive enhancement: the existing report works with no JS/library/data. */
(function () {
  'use strict';
  var REGIONS = {
    'lake-superior': {name:'Lake Superior', lake:'superior', lakeName:'Lake Superior', scope:'lake-overview',
      bounds:[[46.33,-92.18],[48.95,-84.38]],
      context:'Explore Lake Superior from the map. NOAA GLERL supplies the whole-lake chart; a reference sector is used only to check the USNIC map date, never to estimate ice across the basin.'},
    'lake-michigan': {name:'Lake Michigan', lake:'michigan', lakeName:'Lake Michigan', scope:'lake-overview',
      bounds:[[41.60,-88.16],[46.12,-84.02]],
      context:'Explore the Michigan and Wisconsin shorelines. A lake-wide map cannot resolve protected harbors and coves; the chart is the separately measured whole-lake ice percentage.'},
    'lake-huron': {name:'Lake Huron', lake:'huron', lakeName:'Lake Huron', scope:'lake-overview',
      bounds:[[43.00,-84.75],[46.42,-79.85]],
      context:'Compare the open lake with protected bays. Choose Tawas Bay or Saginaw Bay for a closer view; neither should inherit the overall Lake Huron ice percentage.'},
    'lake-erie': {name:'Lake Erie', lake:'erie', lakeName:'Lake Erie', scope:'lake-overview',
      bounds:[[41.30,-83.56],[42.91,-78.75]],
      context:'Lake Erie has western and eastern basins with different ice behavior. Map categories are dated observations, not conditions at a specific pier or launch.'},
    'lake-ontario': {name:'Lake Ontario', lake:'ontario', lakeName:'Lake Ontario', scope:'lake-overview',
      bounds:[[43.08,-79.96],[44.37,-76.30]],
      context:'Deep Lake Ontario can retain open water while sheltered shorelines develop ice. Use the map for geographic pattern, not ice thickness or a prediction for one harbor.'},
    'tawas-bay': {name:'Tawas Bay', lake:'huron', lakeName:'Lake Huron', scope:'local-bay',
      bounds:[[44.14,-83.64],[44.34,-83.36]],
      context:'The Tawas Point sand spit shelters Tawas Bay from open Lake Huron. NOAA chart classifications, when available, are sampled at a few water points; small coves, cracks and current are not resolved.'},
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
  var regionPath = (location.pathname.match(/\/regions\/([a-z-]+)\.html$/) || [])[1];
  if (regionPath && !REGIONS[regionPath]) return; // inland lakes lack mapped NOAA data
  var requestedView = !regionPath ? new URLSearchParams(location.search).get('ice-region') : null;
  var currentSlug = regionPath || (requestedView && REGIONS[requestedView] ? requestedView : 'saginaw-bay');
  var root, select, map, overlay, loadingLeaflet, activeData = null, datasets = {}, layerStamp = null;
  var playTimer = null, chartSeries = [], currentIndex = 0, mapRequest = 0;
  var mapReady = false;
  var basemap = null, basemapFailed = false, apiFailed = false;
  var pendingMapUpdate = null, resizeObserver = null;
  var dailyFrameRequest = 0, frameMode = 'focus';
  var dailyFrameCache = new Map(); // bounded client-only NOAA image load outcomes

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
  // NOAA GLERL publishes a true daily concentration map across the entire
  // basin, not a historical version of the current CARTO/USNIC overlay.
  // Ice seasons are archived by their END year: Dec 2025 and Feb 2026 = 2026.
  function glMultiLakeFrameUrl(day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    var d = new Date(day + 'T12:00:00Z');
    if (Number.isNaN(d.valueOf()) || d.toISOString().slice(0, 10) !== day) return null;
    var month = d.getUTCMonth() + 1;
    var endYear = d.getUTCFullYear() + (month >= 11 ? 1 : 0);
    if (month >= 6 && month <= 10) return null; // outside published Nov–May ice charts
    return 'https://www.glerl.noaa.gov/data/ice/glicd/jpgs/' + endYear +
      '/' + day.replace(/-/g,'') + '.jpg';
  }
  var PHOTO_FOCUS = {
    superior: {x:0.31,y:0.27,scale:2.10},
    michigan: {x:0.40,y:0.65,scale:2.05},
    huron: {x:0.61,y:0.57,scale:2.10},
    erie: {x:0.69,y:0.81,scale:2.25},
    ontario: {x:0.83,y:0.67,scale:2.20}
  };
  function dailyChartPerspective() {
    var lake = REGIONS[currentSlug].lake;
    var focus = PHOTO_FOCUS[lake];
    // NOAA basin chart cannot resolve Lake St. Clair or a particular bay.
    if (frameMode === 'all' || !focus) return {scale:1,x:0,y:0};
    return {scale:focus.scale,
      x:50 - focus.x*focus.scale*100,
      y:50 - focus.y*focus.scale*100};
  }
  function styleDailyFrame() {
    if (!root) return;
    var picture = root.querySelector('#ice-ex-daily-image');
    var view = root.querySelector('#ice-ex-daily-mode');
    var lake = REGIONS[currentSlug].lakeName || REGIONS[currentSlug].name;
    if (view) {
      view.disabled = !PHOTO_FOCUS[REGIONS[currentSlug].lake];
      view.textContent = frameMode === 'focus' && !view.disabled
        ? 'Show all five lakes' : 'Focus on ' + lake;
    }
    if (!picture) return;
    var p = dailyChartPerspective();
    picture.style.transformOrigin = 'top left';
    picture.style.transform = 'translate('+p.x.toFixed(1)+'%,'+p.y.toFixed(1)+'%) scale('+p.scale+')';
  }
  function syncDailyFrame() {
    var img = root && root.querySelector('#ice-ex-daily-image');
    if (!img) return;
    var status = root.querySelector('#ice-ex-daily-status');
    var source = root.querySelector('#ice-ex-daily-source');
    var placeholder = root.querySelector('#ice-ex-daily-placeholder');
    var item = chartSeries[currentIndex];
    var ticket = ++dailyFrameRequest;
    styleDailyFrame();
    if (!item) {
      img.removeAttribute('src'); img.hidden = true; placeholder.hidden = false;
      placeholder.textContent = 'The NOAA ice series is unavailable.';
      status.textContent = 'No dated NOAA ice analysis available to display.';
      source.hidden = true;
      return;
    }
    var url = glMultiLakeFrameUrl(item.date);
    var name = REGIONS[currentSlug].lakeName || REGIONS[currentSlug].name;
    if (!url) {
      img.removeAttribute('src'); img.hidden = true; placeholder.hidden = false;
      placeholder.textContent = 'No archived chart for this date.';
      status.textContent = 'No NOAA geographic chart is expected for '+dateOnly(item.date)+'. The measured whole-lake percentage remains in the graph.';
      source.hidden = true;
      return;
    }
    // Clear the previous day immediately: never display yesterday's map
    // underneath today's date if the new NOAA image is missing or slow.
    img.hidden = true;
    img.removeAttribute('src');
    placeholder.hidden = false;
    placeholder.textContent = 'Loading the dated NOAA chart…';
    status.textContent = 'Loading NOAA geographic ice chart for '+dateOnly(item.date)+'…';
    source.hidden = true;
    var cached = dailyFrameCache.get(url);
    if (cached === false) {
      placeholder.textContent = 'NOAA image not available for this date.';
      status.textContent = 'NOAA did not provide a geographic image for '+dateOnly(item.date)+'. No ice map has been invented.';
      return;
    }
    function applySuccess() {
      if (ticket !== dailyFrameRequest || !root.isConnected) return;
      img.alt = 'NOAA GLERL daily Great Lakes ice concentration map dated '+dateOnly(item.date)+
        '. '+name+' is highlighted when focus is active. This is not ice thickness or safety data.';
      img.src = url;
      img.hidden = false;
      placeholder.hidden = true;
      styleDailyFrame();
      source.href = url;
      source.hidden = false;
      status.textContent = dateOnly(item.date)+' · actual NOAA GLERL daily mapped ice concentration. '+
        (REGIONS[currentSlug].scope === 'lake-overview'
          ? name+' is selected. '
          : 'This basin-wide source does not measure '+REGIONS[currentSlug].name+' separately. ')+
        'The CARTO location map above remains a different, current-only product.';
    }
    if (cached === true) { applySuccess(); return; }
    var probe = new Image();
    probe.onload = function() {
      dailyFrameCache.set(url,true);
      if (dailyFrameCache.size > 20) dailyFrameCache.delete(dailyFrameCache.keys().next().value);
      applySuccess();
    };
    probe.onerror = function() {
      dailyFrameCache.set(url,false);
      if (dailyFrameCache.size > 20) dailyFrameCache.delete(dailyFrameCache.keys().next().value);
      if (ticket !== dailyFrameRequest || !root.isConnected) return;
      img.removeAttribute('src'); img.hidden = true;
      source.hidden = true; placeholder.hidden = false;
      placeholder.textContent = 'NOAA image unavailable. Select another date.';
      status.textContent = 'NOAA daily ice-map image unavailable for '+dateOnly(item.date)+
        '. The measured GLERL whole-lake chart is still available. No substitute map is shown.';
    };
    probe.src = url;
  }
  function stopPlayback() {
    if (playTimer !== null) { clearInterval(playTimer); playTimer = null; }
    var b = root && root.querySelector('#ice-ex-play');
    if (b) b.textContent = 'Play ice maps day by day';
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
      syncDailyFrame();
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
      '. Use the date slider to inspect daily observations and matching NOAA basin ice maps. The CARTO geographic map remains latest-only.');
    slider.oninput=function () {
      currentIndex=Math.max(0,Math.min(chartSeries.length-1,Number(slider.value)||0));
      focus.setAttribute('cx',x(currentIndex));
      focus.setAttribute('cy',y(val(currentIndex)));
      text('ice-ex-chart-value',dateOnly(chartSeries[currentIndex].date)+': '+percent(val(currentIndex))+
        ' of '+lakeName+' covered by ice (whole-lake mean).');
      syncDailyFrame();
    };
    slider.oninput();
  }
  function mercX(lon) {return lon*20037508.342789244/180;}
  function mercY(lat) {
    var bounded=Math.max(-85,Math.min(85,lat));
    return Math.log(Math.tan(Math.PI/4+bounded*Math.PI/360))*20037508.342789244/Math.PI;
  }
  function updateMap() {
    if (!map) return;
    if (!activeData) {
      text('ice-ex-map-stamp',apiFailed
        ? 'NOAA ice data unavailable. Basemap remains usable for shoreline orientation; no ice safety rating.'
        : 'Basemap available for orientation. Waiting for NOAA ice observations.');
      text('ice-ex-map-hud',apiFailed ? 'NOAA data unavailable · basemap only' : 'Map for orientation · NOAA data loading');
      return;
    }
    var r=regionData(currentSlug);
    text('ice-ex-observation', !activeData.iceSeason
      ? 'Off season: no current local ice claim. The lake-wide chart below shows the previous winter.'
      : !r || !r.available
        ? 'No usable NOAA polygon intersects the selected samples; this does not establish open water.'
        : r.stale ? 'NOAA chart older than 48 hours; the live ice layer is withheld.'
          : 'NOAA mapped ice chart valid '+dateOnly(r.validAt)+'. '+
            (r.scope === 'lake-overview' ? 'The reference sector checks chart freshness only, not the whole lake’s ice percentage.' :
              'A few regional chart samples cannot resolve the entire bay.'));
    if (!isFreshRegion(r)) {
      ++mapRequest; // invalidate any NOAA image still loading
      if (overlay) {map.removeLayer(overlay);overlay=null;}
      text('ice-ex-map-hud',activeData.iceSeason
        ? 'No recent NOAA regional ice image' : 'Off season · map for orientation only');
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
    text('ice-ex-map-hud','Loading NOAA regional ice analysis…');
    var next=window.L.imageOverlay(MAP_SERVICE+'?'+args.toString(),bounds,{opacity:.79});
    next.on('load',function(){
      if(request!==mapRequest){map.removeLayer(next);return;}
      if(overlay) map.removeLayer(overlay);
      overlay=next;
      text('ice-ex-map-hud','NOAA ice concentration · not thickness');
      text('ice-ex-map-stamp','NOAA/NWS USNIC regional chart valid ' +dateOnly(r.validAt)+
        '. Coverage categories, not local thickness. Zoom/pan to inspect geographic patterns.');
    });
    next.on('error',function(){
      map.removeLayer(next);
      if(request===mapRequest) {
        text('ice-ex-map-hud','NOAA map image unavailable');
        text('ice-ex-map-stamp','NOAA map image unavailable. The basemap and regional observations remain accessible.');
      }
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
  // Map and NOAA data are independent: the basemap must work even if /api/ice-now fails.
  // Keyless CARTO URLs return a watermarked image with HTTP 200; never request them.
  function installBasemap(L) {
    var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
    }).addTo(map);
    basemap = osm;
    var osmFailures = 0;
    osm.on('tileerror',function() {
      if (++osmFailures >= 3 && basemap === osm)
        text('ice-ex-basemap-status','Basemap tiles unavailable on this connection. Map controls still work; try again later.');
    });
    text('ice-ex-basemap-status','Map ready (OpenStreetMap). Connecting to CARTO…');
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 6000);
    fetch('/api/carto-basemap-config', {method:'GET',credentials:'same-origin',signal:controller.signal})
      .then(function(response) {
        if (!response.ok) throw new Error('Public CARTO basemap configuration unavailable');
        return response.json();
      }).then(function(config) {
        if (!config || typeof config.key !== 'string' || !config.key.trim())
          throw new Error('CARTO public basemap key missing');
        var url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='
          + encodeURIComponent(config.key.trim());
        var preferred = L.tileLayer(url, {maxZoom:19,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'});
        var failed = 0, activated = false;
        preferred.on('tileload',function() {
          if (basemapFailed || activated) return;
          activated = true;
          // Keep OSM visible until at least one authenticated CARTO tile loads.
          basemap = preferred;
          map.removeLayer(osm);
          text('ice-ex-basemap-status','Map baselayer: CARTO Voyager.');
        });
        preferred.on('tileerror',function() {
          if (++failed >= 3 && !basemapFailed) {
            basemapFailed = true;
            map.removeLayer(preferred);
            basemap = osm;
            if (!map.hasLayer(osm)) osm.addTo(map);
            text('ice-ex-basemap-status','CARTO tile service unavailable; showing OpenStreetMap.');
          }
        });
        preferred.addTo(map);
      }).catch(function() {
        text('ice-ex-basemap-status','CARTO configuration unavailable; OpenStreetMap is ready.');
      }).finally(function() { clearTimeout(timeout); });
  }
  function scheduleMapUpdate() {
    if (pendingMapUpdate !== null) clearTimeout(pendingMapUpdate);
    pendingMapUpdate = setTimeout(function() {
      pendingMapUpdate = null;
      updateMap();
    }, 180);
  }
  function initMap() {
    if (mapReady) return;
    mapReady = true;
    loadLeaflet().then(function(L) {
      map = L.map('ice-ex-map', {scrollWheelZoom:false,maxZoom:12,minZoom:3});
      // The map must be useful even while CARTO credentials or NOAA data load.
      installBasemap(L);
      map.on('moveend',scheduleMapUpdate);
      setRegionMap();
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(function() {
          if (!map || !root || !root.isConnected) return;
          map.invalidateSize({pan:false,debounceMoveend:true});
        });
        resizeObserver.observe(root.querySelector('#ice-ex-map'));
      }
      window.addEventListener('resize',function() {
        if (map) map.invalidateSize({pan:false,debounceMoveend:true});
      },{passive:true});
      // Delayed layout shifts (including advertisements) must not leave blank tiles.
      requestAnimationFrame(function() {
        if (map) map.invalidateSize({pan:false,debounceMoveend:true});
      });
    }).catch(function() {
      text('ice-ex-map-hud','Map controls unavailable');
      text('ice-ex-map-stamp','Map library unavailable. See the NOAA data and dated chart below.');
      text('ice-ex-basemap-status','Map controls unavailable; the ice report below still works.');
    });
  }
  function setRegionMap() {
    if (!map) return;
    text('ice-ex-map-hud',!activeData || !activeData.iceSeason ? 'Off season · map for orientation only' : 'Regional NOAA data pending');
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
    var share='/michigan-ice/?ice-region='+encodeURIComponent(slug)+'#ice-freeze-explorer';
    link.href=REGIONS[slug].link || share;
    link.textContent=REGIONS[slug].link ? 'Explore '+REGIONS[slug].name+' conditions' : 'Share '+REGIONS[slug].name+' map';
    text('ice-ex-map-type',REGIONS[slug].scope === 'lake-overview'
      ? 'Whole-lake map extent. NOAA GLERL is the separate source for whole-lake ice percentages.'
      : 'Bay map: NOAA concentrations may not resolve shelter, current or shoreline ice.');
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
      apiFailed = true;
      text('ice-ex-map-stamp','NOAA ice data unavailable. The map remains usable for viewing shorelines; it does not rate ice safety.');
      text('ice-ex-map-hud','NOAA ice data unavailable · basemap only');
      text('ice-ex-chart-value','NOAA time series unavailable.');
      return;
    }
    apiFailed = false;
    activeData=data;
    datasets[currentSlug]=data;
    drawChart();
    if (!regionData(currentSlug)) onRegionChange(currentSlug);
    else if (map) updateMap();
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
      '#ice-ex-map-shell{position:relative}',
      '#ice-ex-fullscreen{position:absolute;z-index:1100;top:9px;right:9px;min-height:40px;background:rgba(255,255,255,.96);color:#153845;border:1px solid #97b7c0;border-radius:8px;padding:8px 11px;font:600 12px/1.3 ui-sans-serif,system-ui,sans-serif;box-shadow:0 1px 7px rgba(0,0,0,.13)}',
      '#ice-ex-map-shell:fullscreen{height:100dvh;width:100vw;min-height:100vh;background:#dce8e7}',
      '#ice-ex-map-shell:fullscreen #ice-ex-map{height:100%;max-height:none;border:0;border-radius:0}',
      '#ice-ex-map-shell:fullscreen #ice-ex-map-hud{bottom:30px}',
      '#ice-ex-map-hud{position:absolute;bottom:24px;right:8px;z-index:750;max-width:65%;font-size:11px;font-weight:650;color:#153845;background:rgba(255,255,255,.94);border:1px solid #cbdfe2;border-radius:7px;padding:6px 8px;pointer-events:none;line-height:1.3}',
      '#ice-ex-map .leaflet-control-container{font-size:12px}',
      '#ice-freeze-explorer .ice-ex-caption{font-size:12px;line-height:1.5;color:#375965;margin:8px 0}',
      '#ice-freeze-explorer .ice-ex-legend{display:flex;flex-wrap:wrap;gap:7px 13px;font-size:12px;margin-top:10px}',
      '#ice-freeze-explorer .ice-ex-legend span{display:inline-flex;align-items:center;gap:6px}',
      '#ice-freeze-explorer .ice-ex-legend i{width:12px;height:12px;border-radius:3px;display:inline-block;border:1px solid #9bb}',
      '#ice-freeze-explorer .ice-ex-chartbox{margin-top:15px;border-top:1px solid #cbdfe2;padding-top:12px}',
      '#ice-ex-chart{display:block;width:100%;max-height:230px;background:#fff;border:1px solid #dae5e8;border-radius:10px}',
      '#ice-ex-chart-heading{font-size:17px;margin:4px 0}',
      '#ice-ex-daily-panel{margin:13px 0 14px}',
      '#ice-ex-daily-header{display:flex;justify-content:space-between;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:8px}',
      '#ice-ex-daily-header h4{margin:0;font-size:16px;line-height:1.3}',
      '#ice-ex-daily-mode{min-height:38px!important;padding:6px 10px!important}',
      '#ice-ex-daily-frame{position:relative;aspect-ratio:1.30;max-width:720px;overflow:hidden;background:#eaf2f4;border:1px solid #c5dce0;border-radius:10px}',
      '#ice-ex-daily-image{width:100%;height:100%;object-fit:fill;display:block;transform-origin:top left;transition:transform .2s ease}',
      '#ice-ex-daily-image[hidden]{display:none}',
      '#ice-ex-daily-placeholder{display:flex;align-items:center;justify-content:center;min-height:130px;padding:20px;text-align:center;color:#486772;font-size:14px}',
      '#ice-ex-daily-source[hidden],#ice-ex-daily-placeholder[hidden]{display:none}',
      '@media(prefers-reduced-motion:reduce){#ice-ex-daily-image{transition:none}}',
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
      '<optgroup label="All five Great Lakes">',
      '<option value="lake-superior">Lake Superior — whole lake</option>',
      '<option value="lake-michigan">Lake Michigan — whole lake</option>',
      '<option value="lake-huron">Lake Huron — whole lake</option>',
      '<option value="lake-erie">Lake Erie — whole lake</option>',
      '<option value="lake-ontario">Lake Ontario — whole lake</option></optgroup>',
      '<optgroup label="Lake Huron bays"><option value="saginaw-bay">Saginaw Bay</option>',
      '<option value="tawas-bay">Tawas Bay and Tawas Point</option></optgroup>',
      '<optgroup label="Lake Michigan bays"><option value="little-bay-de-noc">Little Bay de Noc</option>',
      '<option value="grand-traverse-bay">Grand Traverse Bay</option></optgroup>',
      '<optgroup label="Other interconnected waters"><option value="lake-st-clair">Lake St. Clair</option></optgroup>',
      '</select></div>',
      '<p class="ice-ex-caption" id="ice-ex-map-type">Choose a lake or supported bay to explore.</p>',
      '<p class="ice-ex-caption" id="ice-ex-context"></p>',
      '<div id="ice-ex-map-shell"><div id="ice-ex-map" role="region" aria-label="Interactive shoreline map with NOAA regional ice concentration when current data are available"></div>',
      '<span id="ice-ex-map-hud" role="status">Loading map · NOAA data separate</span>',
      '<button type="button" id="ice-ex-fullscreen" aria-label="Expand map to full screen" aria-expanded="false">Expand map</button></div>',
      '<button type="button" id="ice-ex-reset">Reset map to selected water</button>',
      '<p class="ice-ex-caption" id="ice-ex-basemap-status" aria-live="polite">Connecting to the public CARTO basemap…</p>',
      '<p class="ice-ex-caption">Use Expand map for a larger interactive map without page overlays. NOAA ice is overlaid only when recent regional observations are available.</p>',
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
      '<p class="ice-ex-caption" id="ice-ex-observation" aria-live="polite">NOAA geographic observation freshness is reported separately from the lake-wide chart.</p>',
      '<div class="ice-ex-chartbox">',
      '<div class="ice-ex-kicker">Daily progression · distinct from the map</div>',
      '<h3 id="ice-ex-chart-heading">Whole-lake ice cover</h3>',
      '<p id="ice-ex-timeline-note" class="ice-ex-caption">Loading the dated NOAA GLERL series…</p>',
      '<div id="ice-ex-daily-panel" aria-label="NOAA historical daily ice map playback">',
      '<div id="ice-ex-daily-header"><h4>Watch the ice spread and retreat</h4>',
      '<button type="button" id="ice-ex-daily-mode" aria-label="Toggle NOAA basin chart focus">Show all five lakes</button></div>',
      '<div id="ice-ex-daily-frame"><img id="ice-ex-daily-image" alt="" hidden decoding="async" referrerpolicy="no-referrer">',
      '<span id="ice-ex-daily-placeholder">Select a day in the timeline below to display its original NOAA ice map.</span></div>',
      '<p id="ice-ex-daily-status" class="ice-ex-caption" role="status">Waiting for NOAA daily ice records.</p>',
      '<p class="ice-ex-caption"><a id="ice-ex-daily-source" href="https://www.glerl.noaa.gov/data/ice/glicd.php" target="_blank" rel="noopener" hidden>Open original dated NOAA ice map</a></p>',
      '<p class="ice-ex-caption">Genuine NOAA GLERL archived ice-concentration maps, not a forecast or simulated freeze-up. The focus is a zoom of the same Great Lakes-wide source; bays are not independently resolved.</p>',
      '</div>',
      '<svg id="ice-ex-chart" viewBox="0 0 680 220"></svg>',
      '<label for="ice-ex-slider"><strong>Inspect a day</strong></label>',
      '<input id="ice-ex-slider" type="range" min="0" max="0" step="1" value="0" disabled>',
      '<p id="ice-ex-chart-value" aria-live="polite">Loading historic ice coverage…</p>',
      '<button type="button" id="ice-ex-play" disabled>Play ice maps day by day</button>',
      '<p class="ice-ex-caption">The date slider synchronizes the GLERL whole-lake percentage and a genuine archived GLERL daily ice map. It does not change the current-only CARTO/USNIC chart above. A lake-wide percentage is never a local bay observation.</p>',
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
    root.querySelector('#ice-ex-reset').addEventListener('click',function() {
      if (map) { setRegionMap(); map.invalidateSize({pan:false}); }
    });
    // Native fullscreen places the map above viewport-anchored page overlays on mobile.
    // No advertising configuration or AdSense behavior is modified.
    var shell = root.querySelector('#ice-ex-map-shell');
    var expand = root.querySelector('#ice-ex-fullscreen');
    expand.addEventListener('click',function() {
      if (document.fullscreenElement === shell) {
        if (document.exitFullscreen) document.exitFullscreen().catch(function() {});
      } else if (shell.requestFullscreen) {
        shell.requestFullscreen().catch(function() {
          text('ice-ex-basemap-status','Full-screen map is unavailable in this browser. Map zoom and reset remain available.');
        });
      } else {
        text('ice-ex-basemap-status','Full-screen map is unavailable in this browser. Map zoom and reset remain available.');
      }
    });
    document.addEventListener('fullscreenchange',function() {
      var full = document.fullscreenElement === shell;
      expand.textContent = full ? 'Close map' : 'Expand map';
      expand.setAttribute('aria-expanded',String(full));
      expand.setAttribute('aria-label',full ? 'Close full-screen map' : 'Expand map to full screen');
      requestAnimationFrame(function() {
        if (map) map.invalidateSize({pan:false,debounceMoveend:true});
      });
    });
    root.querySelector('#ice-ex-play').addEventListener('click',function(){
      if(playTimer!==null) {stopPlayback();return;}
      if(chartSeries.length<2) return;
      if(currentIndex>=chartSeries.length-1) currentIndex=-1;
      root.querySelector('#ice-ex-play').textContent='Pause daily maps';
      playTimer=setInterval(function(){
        if(!root || !root.isConnected){stopPlayback();return;}
        currentIndex+=1;
        var slider=root.querySelector('#ice-ex-slider');
        slider.value=String(currentIndex);slider.oninput();
        if(currentIndex>=chartSeries.length-1) stopPlayback();
      },800);
    });
    root.querySelector('#ice-ex-slider').addEventListener('pointerdown',stopPlayback);
    root.querySelector('#ice-ex-daily-mode').addEventListener('click',function(){
      frameMode = frameMode === 'all' ? 'focus' : 'all';
      styleDailyFrame();
    });
    document.addEventListener('visibilitychange',function(){if(document.hidden)stopPlayback();});
    onRegionChange(currentSlug);
    initMap(); // Never wait for /api/ice-now to start CARTO or OSM.
    window.addEventListener('michigan-ice-data',function(evt){render(evt.detail);},{once:true});
    if (window.__michiganIceNow) render(window.__michiganIceNow);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();
