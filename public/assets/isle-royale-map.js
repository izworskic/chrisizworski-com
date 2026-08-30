(() => {
  'use strict';

  const CONFIG = {
    primaryWebMap: '75e3ceba038a45f7b4d5a9d7c6a46ccf',
    fallbackWebMap: '57a5a514a8cd40f098b2f99029d118cf',
    visitorFeatureService: 'https://services1.arcgis.com/XBhYkoXKJCRHbe7M/arcgis/rest/services/Isle_Royale_WFL1/FeatureServer',
    islandBounds: [[47.79, -89.36], [48.33, -88.18]],
    arcgisRoot: 'https://www.arcgis.com/sharing/rest/content/items/',
    overpass: 'https://overpass-api.de/api/interpreter'
  };

  const els = {
    status: document.getElementById('map-status'),
    sourceStatus: document.getElementById('source-status'),
    search: document.getElementById('feature-search'),
    list: document.getElementById('feature-list'),
    count: document.getElementById('feature-count'),
    filters: document.getElementById('layer-filters'),
    catalog: document.getElementById('catalog-body')
  };

  const map = L.map('isle-map', {preferCanvas:true, zoomControl:true, minZoom:6, maxZoom:18});
  map.fitBounds(CONFIG.islandBounds, {padding:[10,10]});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(map);

  const layerGroups = {
    trail: L.layerGroup().addTo(map),
    campground: L.layerGroup().addTo(map),
    'visitor-service': L.layerGroup().addTo(map),
    'water-route': L.layerGroup().addTo(map),
    'maritime-history': L.layerGroup().addTo(map),
    'science-reference': L.layerGroup(),
    other: L.layerGroup()
  };

  const layerLabels = {
    trail: 'trail / portage',
    campground: 'campground / shelter',
    'visitor-service': 'visitor place',
    'water-route': 'water / transport route',
    'maritime-history': 'maritime / history',
    'science-reference': 'science / reference',
    other: 'other public feature'
  };

  const featureIndex = [];
  let selectedLayer = null;
  const sourceStatus = {arcgis:'starting', osm:'not loaded', fallback:false};

  const categoryStyle = {
    trail: {color:'#9b512b', weight:3, opacity:.9},
    campground: {color:'#476a4f', fillColor:'#476a4f'},
    'visitor-service': {color:'#18352f', fillColor:'#18352f'},
    'water-route': {color:'#386b8d', weight:3, opacity:.78, dashArray:'7 6'},
    'maritime-history': {color:'#65547c', fillColor:'#65547c'},
    'science-reference': {color:'#467778', weight:2, fillOpacity:.12},
    other: {color:'#59645f', fillColor:'#59645f'}
  };

  function status(message) { els.status.textContent = message; }

  function cleanText(value, fallback='') {
    const text = value == null ? fallback : String(value);
    return text.replace(/[<>]/g, '').trim();
  }

  function firstProp(props, keys) {
    for (const k of keys) {
      if (props && props[k] != null && String(props[k]).trim()) return String(props[k]).trim();
    }
    return '';
  }

  function featureName(feature, layerTitle='Isle Royale feature') {
    const p = feature.properties || {};
    return firstProp(p, ['name','Name','NAME','title','Title','MAPLABEL','LABEL','label','TRLALTNAME','TRLNAME','TRAILNAME','TRAIL_NAME','POINAME','FACILITY','SITE_NAME','UNIT_NAME']) || layerTitle || 'Isle Royale feature';
  }

  function classify(feature, layerTitle='') {
    const p = feature.properties || {};
    const hay = `${layerTitle} ${featureName(feature,'')} ${Object.values(p).slice(0,16).join(' ')}`.toLowerCase();
    if (/vegetation|geolog|bedrock|surficial|relief|ecolog|science/.test(hay)) return 'science-reference';
    if (/lighthouse|light station|shipwreck|ship wreck|wreck|fishery|historic|historic site|cemeter/.test(hay)) return 'maritime-history';
    if (/ferry|seaplane|water taxi|boat route|transport.*route|shipping route/.test(hay)) return 'water-route';
    if (/campground|camp ground|campsite|camp site|shelter|group site/.test(hay)) return 'campground';
    if (/trail|portage|greenstone|minong|feldtmann|ishpeming|ridge route|footpath/.test(hay)) return 'trail';
    if (/visitor|ranger|dock|pier|marina|store|lodge|lodging|shower|toilet|restroom|information|headquarters|lookout|viewpoint|station/.test(hay)) return 'visitor-service';
    return 'other';
  }

  function geometryStyle(category, feature) {
    const base = categoryStyle[category] || categoryStyle.other;
    const isPolygon = feature.geometry && /Polygon/.test(feature.geometry.type);
    return {...base, fillOpacity:isPolygon ? (category === 'science-reference' ? .12 : .18) : .8};
  }

  function pointMarker(category, latlng) {
    const style = categoryStyle[category] || categoryStyle.other;
    return L.circleMarker(latlng, {radius:category === 'campground' ? 5.5 : 5, weight:2, color:style.color, fillColor:style.fillColor || style.color, fillOpacity:.86});
  }

  function popupNode(record) {
    const wrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'popup-title';
    title.textContent = record.name;
    wrap.appendChild(title);
    const meta = document.createElement('div');
    meta.className = 'popup-meta';
    meta.textContent = layerLabels[record.category] || record.category;
    wrap.appendChild(meta);
    if (record.description) {
      const desc = document.createElement('p');
      desc.textContent = record.description;
      wrap.appendChild(desc);
    }
    const source = document.createElement('div');
    source.className = 'popup-source';
    source.textContent = `Source: ${record.sourceLabel}. Status: ${record.sourceKind}.`;
    wrap.appendChild(source);
    return wrap;
  }

  function addGeoJSONFeature(feature, context={}) {
    if (!feature || !feature.geometry) return 0;
    const name = cleanText(featureName(feature, context.layerTitle));
    const category = context.category || classify(feature, context.layerTitle);
    const sourceLabel = cleanText(context.sourceLabel || 'Public map source');
    const sourceKind = cleanText(context.sourceKind || 'source vector');
    const props = feature.properties || {};
    const description = cleanText(firstProp(props, ['description','Description','DESC','DESCRIPT','notes','NOTES','DETAILS']));
    let record;
    const geo = L.geoJSON(feature, {
      style: () => geometryStyle(category, feature),
      pointToLayer: (_f, latlng) => pointMarker(category, latlng),
      onEachFeature: (_f, layer) => {
        record = {name, category, layer, sourceLabel, sourceKind, description, sourceUrl:context.sourceUrl || ''};
        layer.bindPopup(() => popupNode(record));
        layer.on('click', () => selectRecord(record));
      }
    });
    const target = layerGroups[category] || layerGroups.other;
    geo.eachLayer(layer => target.addLayer(layer));
    if (record) featureIndex.push(record);
    return record ? 1 : 0;
  }

  function esriGeometryToGeoJSON(g) {
    if (!g) return null;
    if (Number.isFinite(g.x) && Number.isFinite(g.y)) return {type:'Point', coordinates:[g.x,g.y]};
    if (Array.isArray(g.paths)) return {type:g.paths.length === 1 ? 'LineString' : 'MultiLineString', coordinates:g.paths.length === 1 ? g.paths[0] : g.paths};
    if (Array.isArray(g.rings)) return {type:'Polygon', coordinates:g.rings};
    if (Array.isArray(g.points)) return {type:'MultiPoint', coordinates:g.points};
    return null;
  }

  function esriFeatureToGeoJSON(f) {
    const geometry = esriGeometryToGeoJSON(f.geometry);
    return geometry ? {type:'Feature', geometry, properties:f.attributes || {}} : null;
  }

  async function fetchJSON(url, timeoutMs=14000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {signal:controller.signal, headers:{'Accept':'application/json'}});
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function serviceLayerUrl(url, id) { return `${url.replace(/\/$/,'')}/${id}`; }

  async function queryArcGISLayer(url, layerTitle, sourceLabel='Public ArcGIS visitor data', sourceKind='public service vector') {
    const query = new URL(`${url.replace(/\/$/,'')}/query`);
    query.searchParams.set('where','1=1');
    query.searchParams.set('outFields','*');
    query.searchParams.set('returnGeometry','true');
    query.searchParams.set('outSR','4326');
    query.searchParams.set('f','geojson');
    query.searchParams.set('resultRecordCount','2000');
    const data = await fetchJSON(query.toString());
    if (!data || !Array.isArray(data.features)) return 0;
    let added = 0;
    for (const feature of data.features) {
      added += addGeoJSONFeature(feature, {layerTitle, sourceLabel:`${sourceLabel} — ${layerTitle}`, sourceKind, sourceUrl:url});
    }
    return added;
  }

  async function loadArcGISService(url, title='Isle Royale map layer', sourceLabel='Public ArcGIS visitor data', sourceKind='public service vector') {
    const clean = url.replace(/\/$/,'');
    let meta;
    try { meta = await fetchJSON(`${clean}?f=json`); } catch { meta = null; }
    const isSublayer = /\/(?:FeatureServer|MapServer)\/\d+$/.test(clean);
    if (!isSublayer && meta && Array.isArray(meta.layers) && meta.layers.length) {
      let total = 0;
      for (const layer of meta.layers) {
        try { total += await queryArcGISLayer(serviceLayerUrl(clean, layer.id), layer.name || title, sourceLabel, sourceKind); } catch (_) {}
      }
      return total;
    }
    return queryArcGISLayer(clean, title, sourceLabel, sourceKind);
  }

  async function ingestOperationalLayer(op) {
    let added = 0;
    const title = op.title || 'NPS visitor layer';
    if (op.featureCollection && Array.isArray(op.featureCollection.layers)) {
      for (const fc of op.featureCollection.layers) {
        const layerTitle = (fc.layerDefinition && fc.layerDefinition.name) || title;
        const features = (fc.featureSet && fc.featureSet.features) || [];
        for (const ef of features) {
          const gj = esriFeatureToGeoJSON(ef);
          if (gj) added += addGeoJSONFeature(gj, {layerTitle, sourceLabel:`NPS / ArcGIS — ${layerTitle}`, sourceKind:'embedded public web-map vector'});
        }
      }
    }
    if (op.url && /(?:FeatureServer|MapServer)/.test(op.url)) {
      try { added += await loadArcGISService(op.url, title, 'Public ArcGIS web-map source', 'public web-map service vector'); } catch (_) {}
    }
    if (Array.isArray(op.layers)) {
      for (const nested of op.layers) added += await ingestOperationalLayer(nested);
    }
    return added;
  }

  async function loadWebMap(itemId) {
    const data = await fetchJSON(`${CONFIG.arcgisRoot}${itemId}/data?f=json`);
    const layers = data && Array.isArray(data.operationalLayers) ? data.operationalLayers : [];
    let added = 0;
    for (const op of layers) added += await ingestOperationalLayer(op);
    return added;
  }

  function loadFallbackAnchors() {
    const fallback = {
      type:'FeatureCollection',
      features:[
        {type:'Feature',properties:{name:'Rock Harbor',kind:'visitor service',note:'Approximate reference anchor; public NPS/ArcGIS geometry is preferred.'},geometry:{type:'Point',coordinates:[-88.553,48.145]}},
        {type:'Feature',properties:{name:'Windigo',kind:'visitor service',note:'Approximate reference anchor; public NPS/ArcGIS geometry is preferred.'},geometry:{type:'Point',coordinates:[-89.151,47.911]}},
        {type:'Feature',properties:{name:'Mott Island',kind:'ranger station',note:'Approximate reference anchor; public NPS/ArcGIS geometry is preferred.'},geometry:{type:'Point',coordinates:[-88.527,48.107]}},
        {type:'Feature',properties:{name:'Passage Island',kind:'lighthouse area',note:'Approximate reference anchor; verify official NPS maps.'},geometry:{type:'Point',coordinates:[-88.248,48.222]}}
      ]
    };
    let n = 0;
    for (const f of fallback.features) {
      const cat = /lighthouse/i.test(f.properties.kind) ? 'maritime-history' : 'visitor-service';
      n += addGeoJSONFeature(f, {category:cat, layerTitle:f.properties.kind, sourceLabel:'Local fail-soft reference anchor', sourceKind:'approximate reference — not authoritative NPS GIS'});
    }
    sourceStatus.fallback = true;
    return n;
  }

  async function loadVisitorGeometry() {
    status('Loading public Isle Royale visitor-map geometry…');
    let added = 0;
    for (const itemId of [CONFIG.primaryWebMap, CONFIG.fallbackWebMap]) {
      try {
        added = await loadWebMap(itemId);
        if (added > 0) {
          sourceStatus.arcgis = `loaded ${added} public visitor features`;
          els.sourceStatus.textContent = `Preferred NPS/ArcGIS visitor geometry loaded (${added} features). Deep science and regulation-sensitive polygon layers remain separately cataloged until normalized.`;
          status(`Loaded ${added} public visitor features. Search or filter the map; deep layers remain source-cataloged below.`);
          renderFeatureList();
          return;
        }
      } catch (_) {}
    }
    try {
      added = await loadArcGISService(
        CONFIG.visitorFeatureService,
        'Isle Royale visitor dataset',
        'Public ArcGIS Isle Royale visitor dataset (2021 snapshot)',
        'public service vector — 2021 snapshot'
      );
      if (added > 0) {
        sourceStatus.arcgis = `loaded ${added} visitor features from 2021 public fallback service`;
        els.sourceStatus.textContent = `The preferred visitor web-map source was unavailable, so ${added} features were loaded from a public 2021 Isle Royale ArcGIS fallback dataset. Use current NPS pages for closures, regulations, campground status, transportation and other operational decisions.`;
        status(`Loaded ${added} public visitor features from the 2021 fallback dataset. Current operational decisions still hand off to NPS.`);
        renderFeatureList();
        return;
      }
    } catch (_) {}

    added = loadFallbackAnchors();
    sourceStatus.arcgis = 'remote visitor geometry unavailable';
    els.sourceStatus.textContent = 'The public visitor web map could not be read in this browser, so only clearly labeled approximate reference anchors are shown. Official NPS map links remain available.';
    status(`Remote visitor geometry unavailable. Showing ${added} approximate reference anchors and the full source catalog instead.`);
    renderFeatureList();
  }

  function osmFeatureToGeoJSON(el) {
    const tags = el.tags || {};
    const lat = el.lat ?? (el.center && el.center.lat);
    const lon = el.lon ?? (el.center && el.center.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{...tags, osm_id:`${el.type}/${el.id}`}};
  }

  async function loadOsmContext() {
    const btn = document.getElementById('load-osm');
    btn.disabled = true;
    status('Adding supplementary OpenStreetMap visitor context…');
    const q = `[out:json][timeout:25];(nwr["tourism"~"camp_site|viewpoint|information|museum"](47.79,-89.36,48.33,-88.18);nwr["amenity"~"shelter|toilets|drinking_water"](47.79,-89.36,48.33,-88.18);nwr["man_made"="lighthouse"](47.79,-89.36,48.33,-88.18);nwr["man_made"="pier"](47.79,-89.36,48.33,-88.18););out center tags;`;
    try {
      const url = `${CONFIG.overpass}?data=${encodeURIComponent(q)}`;
      const data = await fetchJSON(url, 26000);
      let added = 0;
      for (const el of data.elements || []) {
        const f = osmFeatureToGeoJSON(el);
        if (!f) continue;
        added += addGeoJSONFeature(f, {layerTitle:'OpenStreetMap visitor context', sourceLabel:'OpenStreetMap contributors', sourceKind:'supplementary public OSM point'});
      }
      sourceStatus.osm = `loaded ${added}`;
      status(`Added ${added} supplementary OpenStreetMap visitor points.`);
      renderFeatureList();
    } catch (_) {
      sourceStatus.osm = 'unavailable';
      status('OpenStreetMap supplementary context could not be loaded. Core map and source catalog are unaffected.');
    } finally {
      btn.disabled = false;
    }
  }

  function isCategoryVisible(category) {
    const checkbox = els.filters.querySelector(`input[data-layer="${category}"]`);
    return checkbox ? checkbox.checked : true;
  }

  function selectRecord(record) {
    if (!record || !record.layer) return;
    selectedLayer = record.layer;
    try {
      const bounds = record.layer.getBounds && record.layer.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) map.fitBounds(bounds.pad(.6), {maxZoom:14});
      else if (record.layer.getLatLng) map.flyTo(record.layer.getLatLng(), Math.max(map.getZoom(), 13));
      record.layer.openPopup();
    } catch (_) {}
  }

  function flyToFeature(index) {
    const record = featureIndex[index];
    if (record) selectRecord(record);
  }
  window.flyToFeature = flyToFeature;

  function renderFeatureList() {
    const term = els.search.value.trim().toLowerCase();
    const matches = [];
    for (let i=0;i<featureIndex.length;i++) {
      const r = featureIndex[i];
      const hay = `${r.name} ${r.category} ${r.sourceLabel} ${r.description}`.toLowerCase();
      if (!isCategoryVisible(r.category)) continue;
      if (term && !hay.includes(term)) continue;
      matches.push({r,i});
    }
    matches.sort((a,b) => a.r.name.localeCompare(b.r.name));
    els.list.replaceChildren();
    for (const {r,i} of matches.slice(0,160)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'feature-row';
      b.innerHTML = '<strong></strong><span></span>';
      b.querySelector('strong').textContent = r.name;
      b.querySelector('span').textContent = `${layerLabels[r.category] || r.category} · ${r.sourceKind}`;
      b.addEventListener('click', () => flyToFeature(i));
      els.list.appendChild(b);
    }
    els.count.textContent = `${matches.length} matching feature${matches.length === 1 ? '' : 's'} · ${featureIndex.length} loaded`;
    if (!matches.length) {
      const p = document.createElement('p');
      p.className = 'small';
      p.textContent = featureIndex.length ? 'No loaded features match those filters.' : 'Visitor geometry is still loading. The source catalog below is available immediately.';
      els.list.appendChild(p);
    }
  }

  els.search.addEventListener('input', renderFeatureList);
  els.filters.addEventListener('change', (event) => {
    const input = event.target.closest('input[data-layer]');
    if (!input) return;
    const id = input.dataset.layer;
    const group = layerGroups[id];
    if (group) {
      if (input.checked && !map.hasLayer(group)) group.addTo(map);
      if (!input.checked && map.hasLayer(group)) map.removeLayer(group);
    }
    renderFeatureList();
  });

  document.getElementById('fit-island').addEventListener('click', () => map.fitBounds(CONFIG.islandBounds,{padding:[10,10]}));
  document.getElementById('load-osm').addEventListener('click', loadOsmContext);
  document.getElementById('clear-selection').addEventListener('click', () => {
    if (selectedLayer && selectedLayer.closePopup) selectedLayer.closePopup();
    selectedLayer = null;
    map.closePopup();
  });

  async function loadCatalog() {
    try {
      const res = await fetch('/isle-royale-map/catalog.json');
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      els.catalog.replaceChildren();
      for (const item of data.items || []) {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td'); td1.textContent = item.label;
        const td2 = document.createElement('td'); const pill = document.createElement('span'); pill.className='status-pill'; pill.textContent=item.state; td2.appendChild(pill);
        const td3 = document.createElement('td'); const a=document.createElement('a'); a.href=item.source; a.target='_blank'; a.rel='noopener'; a.textContent=item.publisher; td3.appendChild(a);
        const td4 = document.createElement('td'); td4.textContent = item.vintage ? `${item.vintage}. ${item.notes}` : item.notes;
        tr.append(td1,td2,td3,td4);
        els.catalog.appendChild(tr);
      }
    } catch (_) {
      els.catalog.innerHTML = '<tr><td>Source catalog could not be loaded.</td><td></td><td><a href="/isle-royale-map/catalog.json">Open raw catalog</a></td><td>The interactive map remains available.</td></tr>';
    }
  }

  renderFeatureList();
  loadCatalog();
  loadVisitorGeometry();
})();
