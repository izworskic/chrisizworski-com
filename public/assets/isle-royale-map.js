(() => {
  'use strict';

  const CONFIG = {
    primaryWebMap: '75e3ceba038a45f7b4d5a9d7c6a46ccf',
    fallbackWebMap: '57a5a514a8cd40f098b2f99029d118cf',
    visitorFeatureService: 'https://services1.arcgis.com/XBhYkoXKJCRHbe7M/arcgis/rest/services/Isle_Royale_WFL1/FeatureServer',
    islandBounds: [[47.79, -89.36], [48.33, -88.18]],
    arcgisRoot: 'https://www.arcgis.com/sharing/rest/content/items/',
    overpass: 'https://overpass-api.de/api/interpreter',
    operationsEndpoint: '/api/isle-royale',
    routeWeatherEndpoint: '/api/isle-royale-route-weather',
    waterIntelEndpoint: '/api/isle-royale-water-intelligence',
    currentConditionsUrl: 'https://www.nps.gov/isro/planyourvisit/current-conditions-at-isle-royale.htm',
    boatInUrl: 'https://www.nps.gov/isro/planyourvisit/boat-in-campgrounds.htm',
    campingUrl: 'https://www.nps.gov/isro/planyourvisit/camping.htm',
    dayHikingUrl: 'https://www.nps.gov/isro/planyourvisit/day-hiking.htm',
    directionsUrl: 'https://www.nps.gov/isro/planyourvisit/directions.htm',
    placesUrl: 'https://www.nps.gov/isro/planyourvisit/placestogo.htm',
    mapsUrl: 'https://www.nps.gov/isro/planyourvisit/mapsbrochures.htm',
    scubaUrl: 'https://www.nps.gov/isro/planyourvisit/scuba-diving.htm',
    offTrailUrl: 'https://www.nps.gov/isro/planyourvisit/off-trail-camping.htm',
    deepManifest: '/isle-royale-map/data/deep-layer-manifest.json',
    deepLayers: {
      geology: '/isle-royale-map/data/geology-units.geojson',
      'vegetation-overview': '/isle-royale-map/data/vegetation-overview-2000.geojson',
      'vegetation-baseline': '/isle-royale-map/data/vegetation-baseline-2000.geojson'
    },
    reliefTiles: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSShadedReliefOnly/MapServer/tile/{z}/{y}/{x}',
    contextManifest: '/isle-royale-map/data/context-layer-manifest.json',
    contextLayers: {
      'quiet-no-wake': '/isle-royale-map/data/quiet-no-wake-zones.geojson',
      'vegetation-change': '/isle-royale-map/data/vegetation-change-1996-2017.geojson',
      'horne-fire': '/isle-royale-map/data/horne-fire-burn-severity.geojson'
    }
  };

  const els = {
    status: document.getElementById('map-status'),
    sourceStatus: document.getElementById('source-status'),
    search: document.getElementById('feature-search'),
    list: document.getElementById('feature-list'),
    count: document.getElementById('feature-count'),
    filters: document.getElementById('layer-filters'),
    catalog: document.getElementById('catalog-body'),
    liveStatus: document.getElementById('park-live-status'),
    deepStatus: document.getElementById('deep-layer-status'),
    contextStatus: document.getElementById('context-layer-status'),
    routeModeButton: document.getElementById('route-mode'),
    routeAddButton: document.getElementById('route-add-mode'),
    routeReverse: document.getElementById('route-reverse'),
    routeUndo: document.getElementById('route-undo'),
    routeClear: document.getElementById('route-clear'),
    routeModeSelect: document.getElementById('route-mode-select'),
    routeSpeed: document.getElementById('route-speed'),
    routeDayHours: document.getElementById('route-day-hours'),
    routeDeparture: document.getElementById('route-departure'),
    routeSmartStatus: document.getElementById('route-smart-status'),
    routeSummary: document.getElementById('route-summary'),
    routeIntelligence: document.getElementById('route-intelligence'),
    routeWeatherButton: document.getElementById('route-weather-button'),
    routeWeather: document.getElementById('route-weather')
  };

  const coarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const vectorRenderer = L.canvas({padding:.5, tolerance:coarsePointer ? 14 : 9});
  const map = L.map('isle-map', {renderer:vectorRenderer, zoomControl:false, minZoom:6, maxZoom:18});
  L.control.zoom({position:'topright'}).addTo(map);
  map.fitBounds(CONFIG.islandBounds, {padding:[10,10]});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
  }).addTo(map);

  map.createPane('reliefPane');
  map.getPane('reliefPane').style.zIndex = '250';
  map.getPane('reliefPane').style.pointerEvents = 'none';
  const reliefLayer = L.tileLayer(CONFIG.reliefTiles, {
    pane:'reliefPane',
    maxZoom:18,
    maxNativeZoom:16,
    opacity:.48,
    attribution:'USGS The National Map · 3DEP / GMTED2010'
  });

  map.createPane('routePane');
  map.getPane('routePane').style.zIndex = '610';

  const osmContextGroup = L.layerGroup();
  const routeLayerGroup = L.layerGroup().addTo(map);

  const layerGroups = {
    relief: reliefLayer,
    trail: L.layerGroup().addTo(map),
    campground: L.layerGroup().addTo(map),
    'visitor-service': L.layerGroup().addTo(map),
    'water-route': L.layerGroup().addTo(map),
    'maritime-history': L.layerGroup().addTo(map),
    'quiet-no-wake': L.layerGroup(),
    geology: L.layerGroup(),
    'vegetation-overview': L.layerGroup(),
    'vegetation-baseline': L.layerGroup(),
    'vegetation-change': L.layerGroup(),
    'horne-fire': L.layerGroup(),
    'science-reference': L.layerGroup(),
    other: L.layerGroup()
  };

  const layerLabels = {
    trail: 'trail / portage',
    campground: 'campground / shelter',
    'visitor-service': 'visitor place',
    'water-route': 'water / transport route',
    'maritime-history': 'maritime / history',
    relief: 'USGS shaded relief',
    'quiet-no-wake': 'quiet / no-wake zone',
    geology: 'geologic unit',
    'vegetation-overview': 'vegetation overview (2000)',
    'vegetation-baseline': 'vegetation detailed baseline (2000)',
    'vegetation-change': 'vegetation change 1996–2017',
    'horne-fire': '2021 Horne Fire burn severity',
    'science-reference': 'science / reference',
    other: 'other public feature'
  };

  const featureIndex = [];
  let selectedLayer = null;
  let searchEventTimer = null;
  let osmContextLoaded = false;
  let osmContextVisible = false;
  let visitorGeometrySettled = false;
  const osmSeen = new Set();
  const route = {
    adding:false,
    points:[],
    resolvedPoints:[],
    line:null,
    markers:[],
    weather:null,
    mode:'paddle',
    smartState:'idle',
    trailNames:[],
    accessMiles:0,
    waterToken:0,
    waterStats:null,
    waterReason:'',
    waterAccessMiles:0
  };
  const waterIntel = {
    state:'idle',
    promise:null,
    source:null,
    lines:[],
    segments:[],
    buckets:new Map(),
    latBands:new Map(),
    quietPromise:null,
    quietZones:null,
    router:null,
    error:''
  };
  const trailGraph = {
    nodes:new Map(),
    adjacency:new Map(),
    edgeKeys:new Set(),
    segments:0
  };
  const sourceStatus = {arcgis:'starting', osm:'not loaded', fallback:false};
  const operational = {
    boaterByName: new Map(),
    alerts: [],
    shipwrecks: [],
    shipwrecksAdded: false,
    fetchedAt: null,
    sources: {},
    loaded: false
  };
  const deep = {
    manifest: null,
    manifestPromise: null,
    geology: {state:'available', count:0, error:''},
    'vegetation-overview': {state:'available', count:0, error:''},
    'vegetation-baseline': {state:'available', count:0, error:''}
  };
  const deepConfig = {
    geology: {
      manifestKey:'geology',
      label:'Geology',
      sourceLabel:'National Park Service Geologic Resources Inventory',
      sourceKind:'generated NPS GRI web derivative'
    },
    'vegetation-overview': {
      manifestKey:'vegetation_overview',
      label:'Vegetation overview (2000)',
      sourceLabel:'National Park Service vegetation inventory',
      sourceKind:'derived six-class historical NPS vegetation overview'
    },
    'vegetation-baseline': {
      manifestKey:'vegetation',
      label:'Vegetation detailed (2000)',
      sourceLabel:'National Park Service vegetation inventory',
      sourceKind:'generated historical NPS inventory derivative'
    }
  };
  const contextLayers = {
    manifest: null,
    manifestPromise: null,
    'quiet-no-wake': {state:'available', count:0, error:''},
    'vegetation-change': {state:'available', count:0, error:''},
    'horne-fire': {state:'available', count:0, error:''}
  };
  const contextConfig = {
    'quiet-no-wake': {
      manifestKey:'quiet_no_wake',
      label:'Quiet / No-Wake zones',
      sourceLabel:'National Park Service — IRMA DataStore Collection 9705',
      sourceKind:'official NPS regulatory polygons',
      timeout:30000
    },
    'vegetation-change': {
      manifestKey:'vegetation_change',
      label:'Vegetation change 1996–2017',
      sourceLabel:'U.S. Geological Survey',
      sourceKind:'USGS change-analysis polygons',
      timeout:45000
    },
    'horne-fire': {
      manifestKey:'horne_fire',
      label:'2021 Horne Fire burn severity',
      sourceLabel:'U.S. Geological Survey',
      sourceKind:'USGS historical burn-severity polygons',
      timeout:30000
    }
  };

  const categoryStyle = {
    trail: {color:'#9b512b', weight:3, opacity:.9},
    campground: {color:'#476a4f', fillColor:'#476a4f'},
    'visitor-service': {color:'#18352f', fillColor:'#18352f'},
    'water-route': {color:'#386b8d', weight:3, opacity:.78, dashArray:'7 6'},
    'maritime-history': {color:'#65547c', fillColor:'#65547c'},
    'quiet-no-wake': {color:'#7f4f78', fillColor:'#a86b9e', weight:2, opacity:.85, fillOpacity:.14},
    geology: {color:'#786a58', fillColor:'#9a8b76', weight:1.2, opacity:.72, fillOpacity:.16},
    'vegetation-overview': {color:'#445e4c', fillColor:'#6e826f', weight:1.1, opacity:.72, fillOpacity:.24},
    'vegetation-baseline': {color:'#586a58', fillColor:'#71806b', weight:.8, opacity:.58, fillOpacity:.20},
    'vegetation-change': {color:'#4f6b61', fillColor:'#729184', weight:1, opacity:.68, fillOpacity:.18},
    'horne-fire': {color:'#7b4f3e', fillColor:'#9d6952', weight:1.2, opacity:.78, fillOpacity:.22},
    'science-reference': {color:'#467778', weight:2, fillOpacity:.12},
    other: {color:'#59645f', fillColor:'#59645f'}
  };

  function status(message) { els.status.textContent = message; }

  function emitEvent(name, props={}) {
    const safe = {};
    for (const [key, value] of Object.entries(props)) {
      if (['string','number','boolean'].includes(typeof value)) safe[key] = value;
    }
    try {
      window.dispatchEvent(new CustomEvent('chrisizworski:tool-event', {detail:{event:name, ...safe}}));
    } catch (_) {}
    try {
      if (Array.isArray(window.dataLayer)) window.dataLayer.push({event:name, ...safe});
    } catch (_) {}
    try {
      if (typeof window.plausible === 'function') window.plausible(name, {props:safe});
    } catch (_) {}
  }

  function sourceFamily(record) {
    const label = String(record?.sourceLabel || '').toLowerCase();
    if (label.includes('openstreetmap')) return 'osm';
    if (label.includes('arcgis')) return 'nps-arcgis';
    if (label.includes('geologic')) return 'nps-gri';
    if (label.includes('u.s. geological survey') || label.includes('usgs')) return 'usgs';
    if (label.includes('vegetation')) return 'nps-vegetation';
    if (label.includes('national park service') || label.includes('nps')) return 'nps';
    if (label.includes('fallback') || label.includes('approximate')) return 'derived-fallback';
    return 'other-public';
  }

  function searchCategory(term='') {
    const q = String(term).toLowerCase();
    if (/camp|shelter/.test(q)) return 'camping';
    if (/trail|portage|ridge|minong|greenstone|feldtmann/.test(q)) return 'trail';
    if (/harbor|windigo|dock|visitor|ranger|store|lodge/.test(q)) return 'visitor-place';
    if (/light|wreck|historic/.test(q)) return 'history';
    if (/ferry|boat|water|seaplane|anchorage|wake/.test(q)) return 'boating';
    if (/fire|burn|geolog|vegetation|forest|rock/.test(q)) return 'science';
    return q.length < 3 ? 'short' : 'other';
  }

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

  function safeHttpUrl(value='') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const candidate = /^www\./i.test(raw) ? `https://${raw}` : raw;
    try {
      const url = new URL(candidate, window.location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function humanizeKey(key='') {
    return String(key)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, ch => ch.toUpperCase())
      .trim();
  }

  function featureUrls(props={}) {
    const links = [];
    const seen = new Set();
    for (const [key, value] of Object.entries(props)) {
      if (!/(^|_|:)(url|website|web|link|homepage|more_info|info_url)($|_|:)/i.test(key)) continue;
      const href = safeHttpUrl(value);
      if (!href || seen.has(href)) continue;
      seen.add(href);
      links.push({href, label:humanizeKey(key)});
    }
    return links.slice(0, 4);
  }

  function collectFeatureFacts(record) {
    const props = record?.properties || {};
    const facts = [];
    const seen = new Set();
    const ignored = /^(objectid|fid|globalid|shape|shape_length|shape_area|id|osm_id|name|title|label|maplabel|description|desc|descript|notes|details)$/i;
    const priority = /(type|kind|class|facility|site|trail|length|mile|distance|elev|depth|shelter|tent|dock|water|toilet|amenity|operator|access|season|status|historic|location|area|island|harbor|capacity|use)/i;
    for (const [key, value] of Object.entries(props)) {
      if (facts.length >= 8) break;
      if (ignored.test(key) || !priority.test(key)) continue;
      if (value == null || typeof value === 'object') continue;
      const text = cleanText(value);
      if (!text || text.length > 100 || safeHttpUrl(text)) continue;
      const fingerprint = text.toLowerCase();
      if (seen.has(fingerprint) || fingerprint === String(record.name || '').toLowerCase()) continue;
      seen.add(fingerprint);
      facts.push({label:humanizeKey(key), value:text});
    }
    return facts;
  }

  function relatedLinks(record) {
    const links = [];
    const seen = new Set();
    const add = (href, label, sourceId='related') => {
      const safe = safeHttpUrl(href);
      if (!safe || seen.has(safe)) return;
      seen.add(safe);
      links.push({href:safe, label, sourceId});
    };

    for (const item of featureUrls(record.properties)) add(item.href, item.label || 'Feature website', 'feature-attribute');

    if (record.category === 'campground') {
      add(CONFIG.campingUrl, 'NPS camping & campground guidance', 'nps-camping');
      if (record.boater) add(CONFIG.boatInUrl, 'NPS boat-in campground details', 'nps-boat-in');
    } else if (record.category === 'trail') {
      add(CONFIG.dayHikingUrl, 'NPS hiking guidance', 'nps-hiking');
    } else if (record.category === 'water-route') {
      add(CONFIG.directionsUrl, 'NPS ferry, seaplane & transportation', 'nps-transportation');
    } else if (record.category === 'visitor-service') {
      add(CONFIG.placesUrl, 'NPS places to go & visitor areas', 'nps-places');
    } else if (record.category === 'maritime-history') {
      if (/shipwreck|wreck|scuba|dive/i.test(`${record.name} ${record.sourceLabel}`)) add(CONFIG.scubaUrl, 'NPS shipwreck & diving guidance', 'nps-scuba');
      add(CONFIG.placesUrl, 'NPS lighthouses & places to go', 'nps-places');
    }

    if (record.sourceUrl) add(record.sourceUrl, /nps\.gov\/isro/i.test(record.sourceUrl) ? 'Open official source page' : 'Open map-data source', 'feature-source');

    const osmId = String(record.properties?.osm_id || '');
    if (/^(node|way|relation)\/\d+$/.test(osmId)) add(`https://www.openstreetmap.org/${osmId}`, 'Open this OpenStreetMap feature', 'osm-feature');

    if (record.latlng && Number.isFinite(record.latlng.lat) && Number.isFinite(record.latlng.lng)) {
      const lat = record.latlng.lat.toFixed(6);
      const lng = record.latlng.lng.toFixed(6);
      add(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`, 'Open this coordinate in OpenStreetMap', 'coordinate');
    }

    add(CONFIG.currentConditionsUrl, 'Verify current NPS conditions', 'nps-current-conditions');
    return links.slice(0, 6);
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
    return L.circleMarker(latlng, {
      radius:category === 'campground' ? 7.5 : 7,
      weight:2.5,
      color:style.color,
      fillColor:style.fillColor || style.color,
      fillOpacity:.9,
      renderer:vectorRenderer,
      bubblingMouseEvents:false
    });
  }
  function normalizePlaceName(value='') {
    return String(value)
      .toLowerCase()
      .replace(/\b(campground|camp ground|overnight dock|dock|campsite|camp site)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function placeAliases(value='') {
    const normalized = normalizePlaceName(value);
    const out = new Set([normalized]);
    if (normalized.includes('ozaagaateng')) out.add(normalized.replace(/ozaagaateng/g, 'windigo').trim());
    if (normalized.includes('windigo')) out.add(normalized.replace(/windigo/g, 'ozaagaateng').trim());
    return [...out].filter(Boolean);
  }

  function findBoaterRecord(name) {
    for (const alias of placeAliases(name)) {
      if (operational.boaterByName.has(alias)) return operational.boaterByName.get(alias);
    }
    return null;
  }

  function findOperationalAlert(name) {
    const aliases = placeAliases(name);
    for (const alert of operational.alerts) {
      for (const place of alert.places || []) {
        const placeNames = placeAliases(place);
        if (aliases.some(alias => placeNames.includes(alias))) return alert;
      }
    }
    return null;
  }

  function enrichRecord(record) {
    if (!record) return;
    record.boater = record.category === 'campground' ? findBoaterRecord(record.name) : null;
    record.liveAlert = findOperationalAlert(record.name);
    if (record.liveAlert && record.layer && record.layer.setStyle) {
      try { record.layer.setStyle({color:'#8c3e23', weight:4, fillColor:'#b25b35', fillOpacity:.9}); } catch (_) {}
    }
  }

  function addPopupFact(container, label, value) {
    if (value == null || String(value).trim() === '') return;
    const fact = document.createElement('div');
    fact.className = 'popup-fact';
    const strong = document.createElement('b');
    strong.textContent = String(value);
    const caption = document.createElement('span');
    caption.textContent = label;
    fact.append(strong, caption);
    container.appendChild(fact);
  }

  function addPopupLink(container, link) {
    const a = document.createElement('a');
    a.className = 'popup-action';
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = link.label;
    a.addEventListener('click', () => emitEvent('isle_royale_source_open', {source_id:link.sourceId || 'popup-related'}));
    container.appendChild(a);
  }

  function popupNode(record) {
    const wrap = document.createElement('div');
    wrap.className = 'popup-detail';

    const title = document.createElement('div');
    title.className = 'popup-title';
    title.textContent = record.name;
    wrap.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'popup-meta';
    meta.textContent = layerLabels[record.category] || record.category;
    wrap.appendChild(meta);

    if (record.liveAlert) {
      const alert = document.createElement('div');
      alert.className = 'popup-alert';
      const strong = document.createElement('strong');
      strong.textContent = 'Current NPS closure signal';
      const detail = document.createElement('span');
      detail.textContent = `${record.liveAlert.title}. ${record.liveAlert.detail || ''}`;
      alert.append(strong, detail);
      wrap.appendChild(alert);
    }

    if (record.description) {
      const desc = document.createElement('p');
      desc.className = 'popup-description';
      desc.textContent = record.description;
      wrap.appendChild(desc);
    }

    const facts = document.createElement('div');
    facts.className = 'popup-facts';
    if (record.latlng && Number.isFinite(record.latlng.lat) && Number.isFinite(record.latlng.lng)) {
      addPopupFact(facts, 'Coordinates', `${record.latlng.lat.toFixed(5)}, ${record.latlng.lng.toFixed(5)}`);
    }
    for (const fact of collectFeatureFacts(record)) addPopupFact(facts, fact.label, fact.value);

    if (record.boater) {
      addPopupFact(facts, 'Dock depth', record.boater.dock_depth);
      addPopupFact(facts, 'Shelters', record.boater.shelters);
      addPopupFact(facts, 'Tent sites', record.boater.tent_sites);
      addPopupFact(facts, 'Food lockers', record.boater.food_storage_lockers);
      addPopupFact(facts, 'Stay limit', record.boater.consecutive_night_limit);
      addPopupFact(facts, 'Generator use', record.boater.onboard_generator_use);
      addPopupFact(facts, 'Fire ring / grill', record.boater.fire_ring_grill);
    }
    if (facts.childElementCount) wrap.appendChild(facts);

    if (record.latlng && Number.isFinite(record.latlng.lat) && Number.isFinite(record.latlng.lng)) {
      const routeAction = document.createElement('button');
      routeAction.type = 'button';
      routeAction.className = 'popup-action popup-route-action';
      routeAction.textContent = route.points.length===0 ? 'Start route here' : route.points.length===1 ? 'Route to here' : 'Add as route stop';
      routeAction.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        addRoutePoint(record.latlng, record.name);
        map.closePopup();
      });
      wrap.appendChild(routeAction);
    }

    const links = relatedLinks(record);
    if (links.length) {
      const related = document.createElement('div');
      related.className = 'popup-related';
      const heading = document.createElement('div');
      heading.className = 'popup-related-title';
      heading.textContent = 'Related information';
      related.appendChild(heading);
      const actions = document.createElement('div');
      actions.className = 'popup-actions';
      for (const link of links) addPopupLink(actions, link);
      related.appendChild(actions);
      wrap.appendChild(related);
    }

    if (record.deepMeta) {
      const deepNote = document.createElement('div');
      deepNote.className = 'popup-source';
      const provenanceNote = record.deepMeta.accuracy_note || record.deepMeta.interpretation_note || record.deepMeta.regulation_note || '';
      deepNote.textContent = `Vintage: ${record.deepMeta.vintage || 'see source manifest'}. ${provenanceNote}`.trim();
      wrap.appendChild(deepNote);
    }

    const source = document.createElement('div');
    source.className = 'popup-source';
    source.textContent = `Map source: ${record.sourceLabel}. Geometry status: ${record.sourceKind}.`;
    if (record.boater) source.textContent += ' Campground facts: NPS Boat-In Campgrounds dataset, page updated June 23, 2026.';
    if (record.liveAlert) source.textContent += ' Closure signal: current NPS conditions feed fetched through this site.';
    wrap.appendChild(source);
    return wrap;
  }

  function trailNodeKey(lat,lng) {
    return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  }

  function ensureTrailNode(lat,lng) {
    const key=trailNodeKey(lat,lng);
    if(!trailGraph.nodes.has(key)) {
      trailGraph.nodes.set(key,{key,lat:Number(lat),lng:Number(lng)});
      trailGraph.adjacency.set(key,[]);
    }
    return key;
  }

  function addTrailEdge(a,b,name='Mapped trail') {
    if(a===b)return;
    const pair=a<b?`${a}|${b}`:`${b}|${a}`;
    const edgeKey=`${pair}|${cleanText(name).toLowerCase()}`;
    if(trailGraph.edgeKeys.has(edgeKey))return;
    const na=trailGraph.nodes.get(a),nb=trailGraph.nodes.get(b);
    if(!na||!nb)return;
    const distance=distanceMiles(na,nb);
    if(!Number.isFinite(distance)||distance<=0||distance>1.5)return;
    trailGraph.edgeKeys.add(edgeKey);
    trailGraph.adjacency.get(a).push({to:b,distance,name:cleanText(name)||'Mapped trail'});
    trailGraph.adjacency.get(b).push({to:a,distance,name:cleanText(name)||'Mapped trail'});
    trailGraph.segments++;
  }

  function registerTrailGeometry(feature,name='Mapped trail') {
    const geometry=feature?.geometry;
    if(!geometry)return;
    const lines=geometry.type==='LineString'
      ? [geometry.coordinates]
      : geometry.type==='MultiLineString'
        ? geometry.coordinates
        : [];
    for(const line of lines) {
      if(!Array.isArray(line)||line.length<2)continue;
      let previous=null;
      for(const coord of line) {
        const lng=Number(coord?.[0]),lat=Number(coord?.[1]);
        if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;
        const key=ensureTrailNode(lat,lng);
        if(previous)addTrailEdge(previous,key,name);
        previous=key;
      }
    }
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
        const latlng = layer.getLatLng ? layer.getLatLng() : null;
        record = {
          name,
          category,
          layer,
          sourceLabel,
          sourceKind,
          description,
          sourceUrl:context.sourceUrl || '',
          deepMeta:context.deepMeta || null,
          properties:{...props},
          geometryType:feature.geometry.type || '',
          geometry:feature.geometry,
          latlng
        };
        enrichRecord(record);
        layer.bindPopup(() => popupNode(record), {maxWidth:390, minWidth:280, autoPanPadding:[28,28], className:'isle-detail-popup'});
        layer.on('click', () => selectRecord(record));
      }
    });
    if(category==='trail' && /LineString/.test(feature.geometry.type || '')) registerTrailGeometry(feature,name);
    const target = context.targetGroup || layerGroups[category] || layerGroups.other;
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

  async function ingestOperationalLayer(op, parentSourceUrl='') {
    let added = 0;
    const title = op.title || 'NPS visitor layer';
    if (op.featureCollection && Array.isArray(op.featureCollection.layers)) {
      for (const fc of op.featureCollection.layers) {
        const layerTitle = (fc.layerDefinition && fc.layerDefinition.name) || title;
        const features = (fc.featureSet && fc.featureSet.features) || [];
        for (const ef of features) {
          const gj = esriFeatureToGeoJSON(ef);
          if (gj) added += addGeoJSONFeature(gj, {layerTitle, sourceLabel:`NPS / ArcGIS — ${layerTitle}`, sourceKind:'embedded public web-map vector', sourceUrl:op.url || parentSourceUrl});
        }
      }
    }
    if (op.url && /(?:FeatureServer|MapServer)/.test(op.url)) {
      try { added += await loadArcGISService(op.url, title, 'Public ArcGIS web-map source', 'public web-map service vector'); } catch (_) {}
    }
    if (Array.isArray(op.layers)) {
      for (const nested of op.layers) added += await ingestOperationalLayer(nested, op.url || parentSourceUrl);
    }
    return added;
  }

  async function loadWebMap(itemId) {
    const data = await fetchJSON(`${CONFIG.arcgisRoot}${itemId}/data?f=json`);
    const layers = data && Array.isArray(data.operationalLayers) ? data.operationalLayers : [];
    let added = 0;
    const itemUrl = `https://www.arcgis.com/home/item.html?id=${itemId}`;
    for (const op of layers) added += await ingestOperationalLayer(op, itemUrl);
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
      n += addGeoJSONFeature(f, {category:cat, layerTitle:f.properties.kind, sourceLabel:'Local fail-soft reference anchor', sourceKind:'approximate reference — not authoritative NPS GIS', sourceUrl:CONFIG.mapsUrl});
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
          els.sourceStatus.textContent = `Preferred NPS/ArcGIS visitor geometry loaded (${added} features). Verified NPS boating zones and federal science layers are available as independent opt-in overlays.`;
          status(`Loaded ${added} public visitor features. Search or filter the map; deep layers remain source-cataloged below.`);
          visitorGeometrySettled = true;
          addPendingShipwrecks();
          if(route.mode==='hike'&&route.points.length>=2){resolveRoute();renderRoute();}
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
        visitorGeometrySettled = true;
        addPendingShipwrecks();
        renderFeatureList();
        return;
      }
    } catch (_) {}

    added = loadFallbackAnchors();
    sourceStatus.arcgis = 'remote visitor geometry unavailable';
    els.sourceStatus.textContent = 'The public visitor web map could not be read in this browser, so only clearly labeled approximate reference anchors are shown. Official NPS map links remain available.';
    status(`Remote visitor geometry unavailable. Showing ${added} approximate reference anchors and the full source catalog instead.`);
    visitorGeometrySettled = true;
    addPendingShipwrecks();
    if(route.mode==='hike'&&route.points.length>=2){resolveRoute();renderRoute();}
    renderFeatureList();
  }

  function osmFeatureToGeoJSON(el) {
    const tags = el.tags || {};
    const lat = el.lat ?? (el.center && el.center.lat);
    const lon = el.lon ?? (el.center && el.center.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{...tags, osm_id:`${el.type}/${el.id}`}};
  }

  function setOsmContextVisible(visible) {
    osmContextVisible = Boolean(visible);
    const btn = document.getElementById('load-osm');
    if (osmContextVisible) {
      if (!map.hasLayer(osmContextGroup)) osmContextGroup.addTo(map);
      btn.textContent = 'Hide OSM context';
      btn.setAttribute('aria-pressed','true');
      sourceStatus.osm = osmContextLoaded ? 'visible' : sourceStatus.osm;
    } else {
      if (map.hasLayer(osmContextGroup)) map.removeLayer(osmContextGroup);
      btn.textContent = 'Show OSM context';
      btn.setAttribute('aria-pressed','false');
      sourceStatus.osm = osmContextLoaded ? 'hidden' : sourceStatus.osm;
    }
    renderFeatureList();
  }

  async function loadOsmContext() {
    const btn = document.getElementById('load-osm');
    if (osmContextLoaded) {
      setOsmContextVisible(!osmContextVisible);
      status(osmContextVisible ? 'OpenStreetMap visitor context shown.' : 'OpenStreetMap visitor context hidden.');
      emitEvent('isle_royale_osm_context', {result:osmContextVisible ? 'shown' : 'hidden'});
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Loading OSM context…';
    status('Adding supplementary OpenStreetMap visitor context…');
    const q = `[out:json][timeout:25];(nwr["tourism"~"camp_site|viewpoint|information|museum"](47.79,-89.36,48.33,-88.18);nwr["amenity"~"shelter|toilets|drinking_water"](47.79,-89.36,48.33,-88.18);nwr["man_made"="lighthouse"](47.79,-89.36,48.33,-88.18);nwr["man_made"="pier"](47.79,-89.36,48.33,-88.18););out center tags;`;
    try {
      const url = `${CONFIG.overpass}?data=${encodeURIComponent(q)}`;
      const data = await fetchJSON(url, 26000);
      let added = 0;
      for (const el of data.elements || []) {
        const f = osmFeatureToGeoJSON(el);
        if (!f) continue;
        const osmId = f.properties?.osm_id;
        if (osmId && osmSeen.has(osmId)) continue;
        if (osmId) osmSeen.add(osmId);
        added += addGeoJSONFeature(f, {
          layerTitle:'OpenStreetMap visitor context',
          sourceLabel:'OpenStreetMap contributors',
          sourceKind:'supplementary public OSM point',
          targetGroup:osmContextGroup
        });
      }
      osmContextLoaded = true;
      setOsmContextVisible(true);
      status(`Added ${added} supplementary OpenStreetMap visitor points. Use the same button to hide or show them.`);
      emitEvent('isle_royale_osm_context', {result:'success'});
    } catch (_) {
      sourceStatus.osm = 'unavailable';
      status('OpenStreetMap supplementary context could not be loaded. Core map and source catalog are unaffected.');
      emitEvent('isle_royale_osm_context', {result:'failure'});
      btn.textContent = 'Retry OSM context';
      btn.setAttribute('aria-pressed','false');
    } finally {
      btn.disabled = false;
    }
  }

  function renderOperationalStatus() {
    if (!els.liveStatus) return;
    els.liveStatus.replaceChildren();

    const conditionsAvailable = Boolean(operational.sources.current_conditions?.available);
    const boaterAvailable = Boolean(operational.sources.boater_campgrounds?.available);
    const shipwreckAvailable = Boolean(operational.sources.shipwreck_buoys?.available);
    const alertCount = operational.alerts.length;

    const state = document.createElement('div');
    state.className = conditionsAvailable && alertCount === 0 ? 'ops-ok' : alertCount ? 'ops-alert' : 'ops-ok';
    if (!operational.loaded) {
      state.textContent = 'Checking current NPS conditions and boat-in campground data…';
    } else if (!conditionsAvailable) {
      state.className = 'ops-alert';
      state.textContent = 'Current NPS conditions could not be reached. Do not infer that the park has no closures; verify NPS before acting.';
    } else if (alertCount) {
      state.textContent = `${alertCount} current NPS closure signal${alertCount === 1 ? '' : 's'} detected in the operational feed. Matching mapped places are flagged.`;
    } else {
      state.textContent = 'Current NPS conditions source reached; no closure pattern currently matched by this tool. This is not a declaration that the park has no alerts.';
    }
    els.liveStatus.appendChild(state);

    const closedZones = [...new Set(operational.alerts.flatMap(alert => Array.isArray(alert.zones) ? alert.zones : alert.id === 'off-trail-zone-9' ? [9] : []))]
      .filter(Number.isFinite)
      .sort((a,b) => a-b);
    if (closedZones.length) {
      const zones = document.createElement('div');
      zones.className = 'ops-alert';
      zones.innerHTML = '<strong></strong><span></span>';
      zones.querySelector('strong').textContent = `Off-trail camping zones currently flagged closed: ${closedZones.join(', ')}`;
      zones.querySelector('span').textContent = 'This is a current NPS operational signal, not mapped polygon geometry. Verify the permit map and current conditions before departure.';
      els.liveStatus.appendChild(zones);

      const zoneLink = document.createElement('a');
      zoneLink.className = 'popup-link';
      zoneLink.href = CONFIG.offTrailUrl;
      zoneLink.target = '_blank';
      zoneLink.rel = 'noopener';
      zoneLink.textContent = 'Open NPS off-trail camping guidance and zone map';
      els.liveStatus.appendChild(zoneLink);
    }

    const data = document.createElement('div');
    data.className = 'ops-source';
    const boaterCount = operational.boaterByName.size;
    const fetched = operational.fetchedAt ? new Date(operational.fetchedAt).toLocaleString([], {dateStyle:'medium', timeStyle:'short'}) : null;
    const wreckCount = operational.shipwrecks.length;
    data.textContent = boaterAvailable
      ? `${boaterCount} NPS boat-in campground records available for popup enrichment${fetched ? ` · checked ${fetched}` : ''}. Page data updated June 23, 2026.`
      : `Boat-in campground enrichment unavailable${fetched ? ` · checked ${fetched}` : ''}.`;
    if (shipwreckAvailable) data.textContent += ` ${wreckCount} NPS shipwreck/dive buoy record${wreckCount === 1 ? '' : 's'} available for the maritime layer.`;
    els.liveStatus.appendChild(data);

    const link = document.createElement('a');
    link.className = 'popup-link';
    link.href = CONFIG.currentConditionsUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open current NPS conditions';
    els.liveStatus.appendChild(link);
  }

  function enrichExistingRecords() {
    for (const record of featureIndex) enrichRecord(record);
    renderFeatureList();
  }

  function hasMappedNamedFeature(name, category) {
    const aliases = new Set(placeAliases(name));
    return featureIndex.some(record => {
      if (category && record.category !== category) return false;
      return placeAliases(record.name).some(alias => aliases.has(alias));
    });
  }

  function shipwreckDescription(wreck) {
    const facts = [];
    if (wreck.vessel_type) facts.push(wreck.vessel_type);
    if (wreck.depth) facts.push(`depth ${wreck.depth} ft`);
    if (wreck.buoy_on) facts.push(`buoy status ${wreck.buoy_on}`);
    if (wreck.buoy_attachment) facts.push(`buoy attachment ${wreck.buoy_attachment}`);
    return facts.length
      ? facts.join(' · ')
      : 'NPS shipwreck/dive buoy location. Verify current NPS diving guidance before use.';
  }

  function addPendingShipwrecks() {
    if (!operational.loaded || !visitorGeometrySettled || operational.shipwrecksAdded) return 0;
    let added = 0;
    for (const wreck of operational.shipwrecks || []) {
      const lat = Number(wreck.lat);
      const lon = Number(wreck.lon);
      if (!wreck.name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (hasMappedNamedFeature(wreck.name, 'maritime-history')) continue;
      added += addGeoJSONFeature({
        type:'Feature',
        geometry:{type:'Point', coordinates:[lon,lat]},
        properties:{
          name:wreck.name,
          description:shipwreckDescription(wreck),
          vessel_type:wreck.vessel_type || '',
          buoy_status:wreck.buoy_on || '',
          depth:wreck.depth || '',
          buoy_attachment:wreck.buoy_attachment || ''
        }
      }, {
        category:'maritime-history',
        layerTitle:'NPS shipwreck / dive buoy',
        sourceLabel:'National Park Service — Shipwreck Buoys',
        sourceKind:'current NPS dive-site / mooring reference point',
        sourceUrl:'https://www.nps.gov/isro/planyourvisit/scuba-diving.htm'
      });
    }
    operational.shipwrecksAdded = true;
    if (added) renderFeatureList();
    return added;
  }

  async function loadOperationalData() {
    renderOperationalStatus();
    try {
      const data = await fetchJSON(CONFIG.operationsEndpoint, 12000);
      operational.boaterByName.clear();
      for (const campground of data.boater_campgrounds || []) {
        for (const alias of placeAliases(campground.name)) operational.boaterByName.set(alias, campground);
      }
      operational.alerts = Array.isArray(data.current_alerts) ? data.current_alerts : [];
      operational.shipwrecks = Array.isArray(data.shipwrecks) ? data.shipwrecks : [];
      operational.fetchedAt = data.fetched_at || null;
      operational.sources = data.sources || {};
      operational.loaded = true;
      enrichExistingRecords();
      addPendingShipwrecks();
      renderOperationalStatus();
    } catch (_) {
      operational.loaded = true;
      operational.sources = {};
      operational.alerts = [];
      operational.shipwrecks = [];
      renderOperationalStatus();
    }
  }

  function formatBytes(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return 'size unavailable';
    return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.round(n / 1000)} KB`;
  }

  async function loadDeepManifest() {
    if (deep.manifest) return deep.manifest;
    if (deep.manifestPromise) return deep.manifestPromise;
    deep.manifestPromise = fetchJSON(CONFIG.deepManifest, 12000)
      .then(data => {
        deep.manifest = data;
        renderDeepStatus();
        return data;
      })
      .catch(error => {
        deep.manifestPromise = null;
        renderDeepStatus();
        throw error;
      });
    return deep.manifestPromise;
  }

  function renderDeepStatus() {
    if (!els.deepStatus) return;
    els.deepStatus.replaceChildren();
    const manifestSources = deep.manifest?.sources || {};

    for (const id of ['geology','vegetation-overview','vegetation-baseline']) {
      const cfg = deepConfig[id];
      const state = deep[id];
      const meta = manifestSources[cfg.manifestKey] || {};
      const row = document.createElement('div');
      row.className = state.state === 'error' ? 'ops-alert' : 'ops-ok';
      const size = formatBytes(meta.bytes);
      if (state.state === 'loading') {
        row.textContent = `${cfg.label}: loading ${size} generated layer…`;
      } else if (state.state === 'loaded') {
        row.textContent = `${cfg.label}: ${state.count.toLocaleString()} mapped feature${state.count === 1 ? '' : 's'} loaded · ${size}.`;
      } else if (state.state === 'error') {
        row.textContent = `${cfg.label}: could not load. ${state.error || 'Source file unavailable.'}`;
      } else {
        row.textContent = `${cfg.label}: off by default · ${size}${meta.vintage ? ` · ${meta.vintage}` : ''}.`;
      }
      els.deepStatus.appendChild(row);
    }

    const caveat = document.createElement('div');
    caveat.className = 'ops-source';
    caveat.textContent = 'Both vegetation views are historical 2000-inventory derivatives, not present-day forest condition. The 844 KB overview is intended for orientation; the 24.9 MB detailed view exposes all 38 mapped classes. Geology is interpretive mapping, not survey-grade.';
    els.deepStatus.appendChild(caveat);
  }

  async function loadDeepLayer(id) {
    const cfg = deepConfig[id];
    const state = deep[id];
    if (!cfg || !state || state.state === 'loading' || state.state === 'loaded') return;
    state.state = 'loading';
    state.error = '';
    renderDeepStatus();

    try {
      const manifest = await loadDeepManifest();
      const meta = manifest?.sources?.[cfg.manifestKey] || {};
      const data = await fetchJSON(CONFIG.deepLayers[id], id === 'vegetation-baseline' ? 60000 : 30000);
      if (!data || !Array.isArray(data.features) || !data.features.length) throw new Error('generated GeoJSON is empty');

      let added = 0;
      for (const feature of data.features) {
        added += addGeoJSONFeature(feature, {
          category:id,
          layerTitle:cfg.label,
          sourceLabel:cfg.sourceLabel,
          sourceKind:cfg.sourceKind,
          sourceUrl:meta.source || '',
          deepMeta:meta
        });
      }
      state.state = 'loaded';
      state.count = added;
      renderDeepStatus();
      renderFeatureList();
      status(`${cfg.label} loaded: ${added.toLocaleString()} mapped feature${added === 1 ? '' : 's'}.`);
    } catch (error) {
      state.state = 'error';
      state.error = cleanText(error?.message || 'load failed');
      const checkbox = els.filters.querySelector(`input[data-layer="${id}"]`);
      if (checkbox) checkbox.checked = false;
      const group = layerGroups[id];
      if (group && map.hasLayer(group)) map.removeLayer(group);
      renderDeepStatus();
      status(`${cfg.label} could not be loaded. Core visitor map remains available.`);
    }
  }

  async function loadContextManifest() {
    if (contextLayers.manifest) return contextLayers.manifest;
    if (contextLayers.manifestPromise) return contextLayers.manifestPromise;
    contextLayers.manifestPromise = fetchJSON(CONFIG.contextManifest, 12000)
      .then(data => {
        contextLayers.manifest = data;
        renderContextStatus();
        return data;
      })
      .catch(error => {
        contextLayers.manifestPromise = null;
        renderContextStatus();
        throw error;
      });
    return contextLayers.manifestPromise;
  }

  function renderContextStatus() {
    if (!els.contextStatus) return;
    els.contextStatus.replaceChildren();
    const layers = contextLayers.manifest?.layers || {};

    for (const id of ['quiet-no-wake','vegetation-change','horne-fire']) {
      const cfg = contextConfig[id];
      const state = contextLayers[id];
      const meta = layers[cfg.manifestKey] || {};
      const row = document.createElement('div');
      row.className = state.state === 'error' ? 'ops-alert' : 'ops-ok';
      const size = formatBytes(meta.bytes);

      if (state.state === 'loading') {
        row.textContent = `${cfg.label}: loading ${size} verified layer…`;
      } else if (state.state === 'loaded') {
        row.textContent = `${cfg.label}: ${state.count.toLocaleString()} mapped feature${state.count === 1 ? '' : 's'} loaded · ${size}.`;
      } else if (state.state === 'error') {
        row.textContent = `${cfg.label}: could not load. ${state.error || 'Source file unavailable.'}`;
      } else {
        const count = Number(meta.features);
        const countText = Number.isFinite(count) ? `${count.toLocaleString()} features · ` : '';
        row.textContent = `${cfg.label}: off by default · ${countText}${size}${meta.vintage ? ` · ${meta.vintage}` : ''}.`;
      }
      els.contextStatus.appendChild(row);
    }

    const caveat = document.createElement('div');
    caveat.className = 'ops-source';
    caveat.textContent = 'Quiet/No-Wake polygons are official NPS regulatory geometry. Vegetation change and Horne Fire are historical USGS context, not present-day operational conditions.';
    els.contextStatus.appendChild(caveat);
  }

  async function loadContextLayer(id) {
    const cfg = contextConfig[id];
    const state = contextLayers[id];
    if (!cfg || !state || state.state === 'loading' || state.state === 'loaded') return;
    state.state = 'loading';
    state.error = '';
    renderContextStatus();

    try {
      const manifest = await loadContextManifest();
      const meta = manifest?.layers?.[cfg.manifestKey] || {};
      if (meta.status && meta.status !== 'generated') throw new Error(`manifest state: ${meta.status}`);
      const data = await fetchJSON(CONFIG.contextLayers[id], cfg.timeout);
      if (!data || !Array.isArray(data.features) || !data.features.length) throw new Error('generated GeoJSON is empty');

      let added = 0;
      for (const feature of data.features) {
        added += addGeoJSONFeature(feature, {
          category:id,
          layerTitle:cfg.label,
          sourceLabel:cfg.sourceLabel,
          sourceKind:cfg.sourceKind,
          sourceUrl:meta.source || meta.regulatory_source || '',
          deepMeta:meta
        });
      }

      state.state = 'loaded';
      state.count = added;
      renderContextStatus();
      renderFeatureList();
      status(`${cfg.label} loaded: ${added.toLocaleString()} mapped feature${added === 1 ? '' : 's'}.`);
    } catch (error) {
      state.state = 'error';
      state.error = cleanText(error?.message || 'load failed');
      const checkbox = els.filters.querySelector(`input[data-layer="${id}"]`);
      if (checkbox) checkbox.checked = false;
      const group = layerGroups[id];
      if (group && map.hasLayer(group)) map.removeLayer(group);
      renderContextStatus();
      status(`${cfg.label} could not be loaded. Core visitor map remains available.`);
    }
  }

  function routeModeLabel() {
    const labels={paddle:'Paddle / small craft',hike:'Hike / backpack',powerboat:'Motorboat'};
    return labels[route.mode] || 'Route';
  }

  function toRadians(value) { return value * Math.PI / 180; }
  function toDegrees(value) { return value * 180 / Math.PI; }

  function distanceMiles(a,b) {
    const R=3958.7613;
    const dLat=toRadians(b.lat-a.lat);
    const dLon=toRadians(b.lng-a.lng);
    const lat1=toRadians(a.lat), lat2=toRadians(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
  }

  function bearingDegrees(a,b) {
    const lat1=toRadians(a.lat),lat2=toRadians(b.lat),dLon=toRadians(b.lng-a.lng);
    const y=Math.sin(dLon)*Math.cos(lat2);
    const x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
    return (toDegrees(Math.atan2(y,x))+360)%360;
  }

  function compassLabel(value) {
    const n=Number(value);
    if(!Number.isFinite(n)) return '';
    const dirs=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(((n%360)+360)%360/22.5)%16];
  }

  function routePathPoints() {
    return route.resolvedPoints.length ? route.resolvedPoints : route.points;
  }

  function cumulativeFor(points) {
    const out=[0];
    for(let i=1;i<points.length;i++) out.push(out[i-1]+distanceMiles(points[i-1],points[i]));
    return out;
  }

  function routeCumulative() {
    return cumulativeFor(routePathPoints());
  }

  function routeTotalMiles() {
    const c=routeCumulative();
    return c.length?c[c.length-1]:0;
  }

  function routeHours() {
    const speed=Math.max(.5,Number(els.routeSpeed.value)||3);
    return routeTotalMiles()/speed;
  }

  function formatDuration(hours) {
    if(!Number.isFinite(hours)||hours<=0)return '0 min';
    const whole=Math.floor(hours),mins=Math.round((hours-whole)*60);
    return whole?`${whole}h ${mins}m`:`${mins} min`;
  }

  function nearestTrailNode(point) {
    let best=null,bestDistance=Infinity;
    for(const node of trailGraph.nodes.values()) {
      const d=distanceMiles(point,node);
      if(d<bestDistance) {
        best=node;
        bestDistance=d;
      }
    }
    return best ? {...best,distance:bestDistance} : null;
  }

  function heapPush(heap,item) {
    heap.push(item);
    let i=heap.length-1;
    while(i>0) {
      const p=Math.floor((i-1)/2);
      if(heap[p].cost<=item.cost)break;
      heap[i]=heap[p];
      i=p;
    }
    heap[i]=item;
  }

  function heapPop(heap) {
    if(!heap.length)return null;
    const root=heap[0];
    const last=heap.pop();
    if(heap.length&&last) {
      let i=0;
      while(true) {
        const left=i*2+1,right=left+1;
        if(left>=heap.length)break;
        let child=right<heap.length&&heap[right].cost<heap[left].cost?right:left;
        if(heap[child].cost>=last.cost)break;
        heap[i]=heap[child];
        i=child;
      }
      heap[i]=last;
    }
    return root;
  }

  function shortestTrailPath(startKey,endKey) {
    if(startKey===endKey)return {keys:[startKey],names:[],distance:0};
    const distances=new Map([[startKey,0]]);
    const previous=new Map();
    const previousEdge=new Map();
    const heap=[];
    heapPush(heap,{key:startKey,cost:0});
    while(heap.length) {
      const current=heapPop(heap);
      if(!current)break;
      if(current.cost!==distances.get(current.key))continue;
      if(current.key===endKey)break;
      for(const edge of trailGraph.adjacency.get(current.key)||[]) {
        const next=current.cost+edge.distance;
        if(next<(distances.get(edge.to)??Infinity)) {
          distances.set(edge.to,next);
          previous.set(edge.to,current.key);
          previousEdge.set(edge.to,edge);
          heapPush(heap,{key:edge.to,cost:next});
        }
      }
    }
    if(!distances.has(endKey))return null;
    const keys=[];
    const names=[];
    let cursor=endKey;
    while(cursor) {
      keys.push(cursor);
      const edge=previousEdge.get(cursor);
      if(edge?.name)names.push(edge.name);
      if(cursor===startKey)break;
      cursor=previous.get(cursor);
    }
    keys.reverse();
    names.reverse();
    return {keys,names,distance:distances.get(endKey)};
  }

  function resolveHikingRoute() {
    if(route.points.length<2)return null;
    if(trailGraph.nodes.size<2)return {ok:false,reason:'Trail network is still loading. The route will snap automatically when mapped trails are ready.'};
    const resolved=[];
    const trailNames=[];
    let accessMiles=0;
    for(let i=1;i<route.points.length;i++) {
      const a=route.points[i-1],b=route.points[i];
      const snapA=nearestTrailNode(a),snapB=nearestTrailNode(b);
      if(!snapA||!snapB)return {ok:false,reason:'Mapped trail geometry is unavailable near this route.'};
      if(snapA.distance>.7||snapB.distance>.7) {
        return {ok:false,reason:'One of your route points is too far from the mapped trail network. Move it closer to a trail or campground.'};
      }
      const path=shortestTrailPath(snapA.key,snapB.key);
      if(!path)return {ok:false,reason:'Those points are not connected through the currently loaded trail network. Add a via point or adjust the endpoints.'};
      accessMiles+=snapA.distance+snapB.distance;
      if(!resolved.length)resolved.push({lat:a.lat,lng:a.lng,label:a.label});
      const segmentNodes=path.keys.map(key=>trailGraph.nodes.get(key)).filter(Boolean).map(node=>({lat:node.lat,lng:node.lng}));
      for(const p of segmentNodes) {
        const last=resolved[resolved.length-1];
        if(!last||distanceMiles(last,p)>.005)resolved.push(p);
      }
      resolved.push({lat:b.lat,lng:b.lng,label:b.label});
      for(const name of path.names)if(name&&!trailNames.includes(name))trailNames.push(name);
    }
    return {ok:true,points:resolved,trailNames,accessMiles};
  }

  async function ensureWaterRouter() {
    if(waterIntel.router)return waterIntel.router;
    if(waterIntel.promise)return waterIntel.promise;
    if(!window.IsleRoyaleWaterIntel?.create)throw new Error('water-routing engine is unavailable');
    waterIntel.state='loading';
    waterIntel.promise=fetchJSON(CONFIG.waterIntelEndpoint,48000)
      .then(data=>{
        if(!Array.isArray(data?.lines)||!data.lines.length)throw new Error('shoreline source returned no coastline geometry');
        waterIntel.router=window.IsleRoyaleWaterIntel.create(data.lines);
        if(!waterIntel.router?.segment_count)throw new Error('shoreline index is empty');
        waterIntel.source=data;
        waterIntel.state='loaded';
        return waterIntel.router;
      })
      .catch(error=>{waterIntel.state='error';waterIntel.error=cleanText(error?.message||error);throw error;})
      .finally(()=>{waterIntel.promise=null;});
    return waterIntel.promise;
  }

  async function ensureRouteQuietZones() {
    if(waterIntel.quietZones)return waterIntel.quietZones;
    if(waterIntel.quietPromise)return waterIntel.quietPromise;
    waterIntel.quietPromise=fetchJSON(CONFIG.contextLayers['quiet-no-wake'],30000)
      .then(data=>{waterIntel.quietZones=Array.isArray(data?.features)?data.features:[];return waterIntel.quietZones;})
      .catch(()=>[])
      .finally(()=>{waterIntel.quietPromise=null;});
    return waterIntel.quietPromise;
  }

  function recordRoutePoint(record) {
    if(record?.latlng&&Number.isFinite(record.latlng.lat)&&Number.isFinite(record.latlng.lng))return {lat:record.latlng.lat,lng:record.latlng.lng};
    try {
      const bounds=record?.layer?.getBounds?.();
      if(bounds?.isValid?.()){const c=bounds.getCenter();if(Number.isFinite(c.lat)&&Number.isFinite(c.lng))return {lat:c.lat,lng:c.lng};}
    } catch (_) {}
    return null;
  }

  function nearbyRouteRefuges(path) {
    const api=window.IsleRoyaleWaterIntel;
    if(!api?.pathDistance||!Array.isArray(path)||path.length<2)return [];
    const maxDistance=route.mode==='paddle'?2.0:4.0;
    const rows=[];
    for(const record of featureIndex){
      const hay=(record.name+' '+record.category+' '+record.description+' '+JSON.stringify(record.properties||{})).toLowerCase();
      const useful=record.category==='campground'||(record.category==='visitor-service'&&/dock|pier|harbor|ranger|visitor|lodge|shelter|camp/.test(hay));
      if(!useful)continue;
      const point=recordRoutePoint(record);
      if(!point)continue;
      const distance=api.pathDistance(point,path);
      if(Number.isFinite(distance)&&distance<=maxDistance)rows.push({name:record.name,distance,category:record.category});
    }
    rows.sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name));
    const seen=new Set();
    return rows.filter(row=>{const key=row.name.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).slice(0,5);
  }

  async function resolveWaterRouteAsync() {
    if(route.mode==='hike'||route.points.length<2)return;
    const token=++route.waterToken;
    route.smartState='water-loading';
    route.waterReason='';
    route.waterStats=null;
    route.waterAccessMiles=0;
    renderRoute();
    try {
      const [router,zones]=await Promise.all([ensureWaterRouter(),ensureRouteQuietZones()]);
      if(token!==route.waterToken||route.mode==='hike'||route.points.length<2)return;
      await new Promise(resolve=>setTimeout(resolve,0));
      const result=router.route(route.points,route.mode);
      if(token!==route.waterToken)return;
      route.resolvedPoints=result.points;
      route.waterAccessMiles=Number(result.access_miles)||0;
      const stats=router.analyze(route.resolvedPoints);
      stats.quiet_zones=window.IsleRoyaleWaterIntel.zonesAlongPath(route.resolvedPoints,zones);
      stats.refuges=nearbyRouteRefuges(route.resolvedPoints);
      route.waterStats=stats;
      route.smartState='water-aware';
      route.waterReason='';
      renderRoute();
      emitEvent('isle_royale_water_route',{mode:route.mode,quiet_zone_count:stats.quiet_zones.length,refuge_count:stats.refuges.length});
    } catch(error) {
      if(token!==route.waterToken)return;
      route.resolvedPoints=[...route.points];
      route.waterStats=null;
      route.smartState='water-fallback';
      route.waterReason=cleanText(error?.message||'shoreline intelligence unavailable');
      renderRoute();
    }
  }
  function resolveRoute() {
    route.trailNames=[];
    route.accessMiles=0;
    if(route.points.length<2) {
      route.waterToken++;
      route.waterStats=null;
      route.waterReason='';
      route.resolvedPoints=[...route.points];
      route.smartState=route.points.length?'need-destination':'idle';
      return;
    }
    if(route.mode==='hike') {
      route.waterToken++;
      route.waterStats=null;
      route.waterReason='';
      const smart=resolveHikingRoute();
      if(smart?.ok) {
        route.resolvedPoints=smart.points;
        route.trailNames=smart.trailNames;
        route.accessMiles=smart.accessMiles;
        route.smartState='trail-snapped';
      } else {
        route.resolvedPoints=[...route.points];
        route.smartState='trail-fallback';
        route.smartReason=smart?.reason||'Smart trail routing unavailable.';
      }
    } else {
      route.resolvedPoints=[...route.points];
      route.waterStats=null;
      route.waterReason='';
      route.smartState='water-pending';
    }
  }

  function routeWaypointIcon(index,total) {
    const cls=index===0?'is-start':index===total-1?'is-end':'';
    const label=index===0?'S':index===total-1?'D':String(index);
    return L.divIcon({
      className:'',
      html:`<span class="route-waypoint-icon ${cls}">${label}</span>`,
      iconSize:[32,32],
      iconAnchor:[16,16]
    });
  }

  function clearRouteWeather(message='') {
    route.weather=null;
    els.routeWeather.replaceChildren();
    if(message) {
      const note=document.createElement('div');
      note.className='ops-source';
      note.textContent=message;
      els.routeWeather.appendChild(note);
    }
  }

  function renderSmartStatus() {
    els.routeSmartStatus.classList.toggle('route-warning',route.smartState==='trail-fallback');
    if(!route.points.length) {
      els.routeSmartStatus.textContent='Choose a start. Tap a map point and use “Start route here,” or press Start on map.';
      return;
    }
    if(route.points.length===1) {
      els.routeSmartStatus.textContent=`Start: ${route.points[0].label||'selected point'}. Now choose a destination.`;
      return;
    }
    if(route.mode==='hike'&&route.smartState==='trail-snapped') {
      const names=route.trailNames.slice(0,4).join(' → ');
      const access=route.accessMiles>0.05?` · about ${route.accessMiles.toFixed(1)} mi total access from your selected points to mapped trail`:'';
      els.routeSmartStatus.innerHTML=`<strong>Smart hiking route:</strong> snapped to the mapped trail network${names?` · via ${cleanText(names)}`:''}${access}.`;
      return;
    }
    if(route.mode==='hike') {
      els.routeSmartStatus.textContent=route.smartReason||'Smart trail routing is unavailable for these points; showing a straight planning sketch.';
      return;
    }
    els.routeSmartStatus.innerHTML='<strong>Editable water route:</strong> drag S / D / numbered handles to reshape it. Tap the route line to add another shaping point.';
  }

  function nearestControlSegmentIndex(latlng) {
    if(route.points.length<2)return route.points.length;
    let bestIndex=1,best=Infinity;
    const px=latlng.lng,py=latlng.lat;
    for(let i=1;i<route.points.length;i++) {
      const a=route.points[i-1],b=route.points[i];
      const dx=b.lng-a.lng,dy=b.lat-a.lat;
      const denom=dx*dx+dy*dy||1;
      const t=Math.max(0,Math.min(1,((px-a.lng)*dx+(py-a.lat)*dy)/denom));
      const x=a.lng+t*dx,y=a.lat+t*dy;
      const d=(px-x)**2+(py-y)**2;
      if(d<best){best=d;bestIndex=i;}
    }
    return bestIndex;
  }

  function reroute(message='Route changed. Re-run the weather analysis for the updated path.') {
    resolveRoute();
    clearRouteWeather(message);
    renderRoute();
    if(route.mode!=='hike'&&route.points.length>=2)resolveWaterRouteAsync();
  }

  function renderRoute() {
    routeLayerGroup.clearLayers();
    route.markers=[];
    route.line=null;
    const path=routePathPoints();

    if(path.length) {
      route.line=L.polyline(path.map(p=>[p.lat,p.lng]),{
        pane:'routePane',
        color:route.mode==='hike'&&route.smartState==='trail-snapped'?'#8b4f2d':'#173d36',
        weight:route.mode==='hike'?5:4,
        opacity:.94,
        dashArray:route.mode==='hike'&&route.smartState==='trail-snapped'?null:'9 6',
        interactive:route.mode!=='hike'
      }).addTo(routeLayerGroup);
      if(route.mode!=='hike') {
        route.line.on('click',event=>{
          if(route.adding)return;
          if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);
          const index=nearestControlSegmentIndex(event.latlng);
          route.points.splice(index,0,{lat:event.latlng.lat,lng:event.latlng.lng,label:`Via ${index}`});
          reroute();
        });
      }
    }

    route.points.forEach((point,index)=>{
      const marker=L.marker([point.lat,point.lng],{
        pane:'routePane',
        icon:routeWaypointIcon(index,route.points.length),
        keyboard:true,
        draggable:true,
        autoPan:true,
        title:index===0?'Route start':index===route.points.length-1?'Route destination':`Route via point ${index}`
      }).addTo(routeLayerGroup);
      marker.on('dragend',()=>{
        const ll=marker.getLatLng();
        route.points[index]={...route.points[index],lat:ll.lat,lng:ll.lng};
        reroute();
      });
      marker.on('click',event=>{if(event.originalEvent)L.DomEvent.stopPropagation(event.originalEvent);});
      route.markers.push(marker);
    });

    renderSmartStatus();
    const miles=routeTotalMiles();
    const hours=routeHours();
    const speed=Math.max(.5,Number(els.routeSpeed.value)||3);
    if(route.points.length<2) {
      els.routeSummary.textContent=route.points.length
        ? 'Start selected. Pick a destination from a map point or tap the map.'
        : 'No route yet.';
      els.routeWeatherButton.disabled=true;
    } else {
      const start=path[0],end=path[path.length-1];
      const bearing=bearingDegrees(start,end);
      const method=route.mode==='hike'&&route.smartState==='trail-snapped'
        ? 'mapped-trail path'
        : route.mode==='hike'
          ? 'straight fallback sketch'
          : 'editable water sketch';
      els.routeSummary.innerHTML=`<strong>${miles.toFixed(1)} mi</strong> · ~${formatDuration(hours)} at ${speed.toFixed(1)} mph · overall ${compassLabel(bearing)} (${Math.round(bearing)}°) · ${method}.`;
      els.routeWeatherButton.disabled=false;
    }
  }

  function setRouteAdding(active) {
    route.adding=Boolean(active);
    document.body.classList.toggle('route-building',route.adding);
    els.routeAddButton.textContent=route.adding?'Stop map picking':route.points.length?'Add via point on map':'Start on map';
    els.routeModeButton.textContent=route.adding?'Finish picking':'Plan route';
    els.routeAddButton.setAttribute('aria-pressed',String(route.adding));
    els.routeModeButton.setAttribute('aria-pressed',String(route.adding));
    status(route.adding
      ? route.points.length?'Tap the map to add a via point.':'Tap the map for your route start.'
      : 'Map picking stopped.');
  }

  function addRoutePoint(latlng,label='') {
    if(!latlng||!Number.isFinite(latlng.lat)||!Number.isFinite(latlng.lng))return;
    route.points.push({
      lat:Number(latlng.lat),
      lng:Number(latlng.lng),
      label:cleanText(label)||`Waypoint ${route.points.length+1}`
    });
    reroute('Route changed. Re-run the weather analysis for the updated path.');
    emitEvent('isle_royale_route_point',{point_count:route.points.length,mode:route.mode});
    document.getElementById('route-planner')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    if(route.points.length===2)setRouteAdding(false);
  }

  function reverseRoute() {
    if(route.points.length<2)return;
    route.points.reverse();
    reroute();
    status('Route direction reversed.');
  }

  function undoRoutePoint() {
    if(!route.points.length)return;
    route.points.pop();
    reroute();
  }

  function clearRoute() {
    route.waterToken++;
    route.points=[];
    route.resolvedPoints=[];
    route.trailNames=[];
    route.waterStats=null;
    route.waterReason='';
    route.smartState='idle';
    setRouteAdding(false);
    clearRouteWeather();
    renderRoute();
    status('Route cleared.');
  }

  function interpolateRoutePoint(targetDistance,cumulative) {
    const points=routePathPoints();
    if(!points.length)return null;
    if(targetDistance<=0)return {...points[0],distance_miles:0,bearing_deg:points[1]?bearingDegrees(points[0],points[1]):null};
    const total=cumulative[cumulative.length-1];
    if(targetDistance>=total) {
      const last=points.length-1;
      return {...points[last],distance_miles:total,bearing_deg:last?bearingDegrees(points[last-1],points[last]):null};
    }
    let segment=1;
    while(segment<cumulative.length&&cumulative[segment]<targetDistance)segment++;
    const prev=segment-1;
    const span=cumulative[segment]-cumulative[prev]||1;
    const t=(targetDistance-cumulative[prev])/span;
    const a=points[prev],b=points[segment];
    return {
      lat:a.lat+(b.lat-a.lat)*t,
      lng:a.lng+(b.lng-a.lng)*t,
      label:`${Math.round(targetDistance/total*100)}% along route`,
      distance_miles:targetDistance,
      bearing_deg:bearingDegrees(a,b)
    };
  }

  function routeForecastSamples(max=5) {
    const points=routePathPoints();
    const cumulative=routeCumulative();
    const total=cumulative[cumulative.length-1]||0;
    const count=Math.min(max,Math.max(2,route.points.length));
    const samples=[];
    for(let i=0;i<count;i++) {
      const distance=count===1?0:total*i/(count-1);
      const p=interpolateRoutePoint(distance,cumulative);
      if(!p)continue;
      if(i===0)p.label=route.points[0]?.label||'Route start';
      if(i===count-1)p.label=route.points[route.points.length-1]?.label||'Route end';
      samples.push(p);
    }
    return samples;
  }

  function relativeWind(windFromDeg,travelBearing) {
    const wind=Number(windFromDeg),bearing=Number(travelBearing);
    if(!Number.isFinite(wind)||!Number.isFinite(bearing))return '';
    const diff=Math.abs(((wind-bearing+540)%360)-180);
    if(diff<=45)return 'headwind tendency';
    if(diff>=135)return 'tailwind tendency';
    return 'crosswind tendency';
  }

  function metric(container,label,value) {
    if(value==null||value==='')return;
    const div=document.createElement('div');
    div.className='route-weather-metric';
    div.innerHTML='<b></b><span></span>';
    div.querySelector('b').textContent=value;
    div.querySelector('span').textContent=label;
    container.appendChild(div);
  }

  function renderRouteWeather(data,samples) {
    els.routeWeather.replaceChildren();

    for(const item of data.alerts||[]) {
      const alert=document.createElement('div');
      alert.className='route-alert';
      alert.innerHTML='<strong></strong><div></div>';
      alert.querySelector('strong').textContent=item.event||'Active NWS alert';
      alert.querySelector('div').textContent=item.headline||item.description||'Open the NWS forecast for details.';
      els.routeWeather.appendChild(alert);
    }

    if(Array.isArray(data.observations)&&data.observations.length) {
      const heading=document.createElement('div');
      heading.className='popup-related-title';
      heading.textContent='Live wind reality check';
      els.routeWeather.appendChild(heading);
      const observations=document.createElement('div');
      observations.className='route-observations';
      for(const obs of data.observations) {
        const card=document.createElement('a');
        card.className='route-observation';
        card.href=obs.source_url;
        card.target='_blank';
        card.rel='noopener';
        const wind=Number.isFinite(Number(obs.wind_speed_kt))?`${obs.wind_direction||''} ${Math.round(obs.wind_speed_kt)} kt`:'wind unavailable';
        const gust=Number.isFinite(Number(obs.wind_gust_kt))?` · gust ${Math.round(obs.wind_gust_kt)} kt`:'';
        card.innerHTML='<strong></strong><span></span>';
        card.querySelector('strong').textContent=obs.name;
        card.querySelector('span').textContent=`${wind}${gust}`;
        observations.appendChild(card);
      }
      els.routeWeather.appendChild(observations);
    }

    const summary=document.createElement('div');
    summary.className='route-summary';
    const peakWind=Number(data.summary?.peak_forecast_wind_kt);
    const peakWave=Number(data.summary?.peak_forecast_wave_ft);
    const bits=[];
    if(Number.isFinite(peakWind))bits.push(`peak forecast wind/gust ${Math.round(peakWind)} kt`);
    if(Number.isFinite(peakWave))bits.push(`highest sampled wave ${peakWave.toFixed(1)} ft`);
    summary.textContent=bits.length?`Route forecast summary: ${bits.join(' · ')}.`:'Route forecast loaded; some marine fields are unavailable at these samples.';
    els.routeWeather.appendChild(summary);

    (data.forecasts||[]).forEach((forecast,index)=>{
      const card=document.createElement('div');
      card.className='route-weather-card';
      const head=document.createElement('div');
      head.className='route-weather-head';
      head.innerHTML='<strong></strong><span></span>';
      head.querySelector('strong').textContent=forecast.label||`Route sample ${index+1}`;
      head.querySelector('span').textContent=forecast.target_time
        ? new Date(forecast.target_time).toLocaleString([], {weekday:'short',hour:'numeric',minute:'2-digit'})
        : 'forecast unavailable';
      card.appendChild(head);

      if(forecast.error) {
        const err=document.createElement('div');
        err.className='ops-source';
        err.textContent=forecast.error;
        card.appendChild(err);
        els.routeWeather.appendChild(card);
        return;
      }

      const metrics=document.createElement('div');
      metrics.className='route-weather-metrics';
      const wind=Number(forecast.wind_speed_kt);
      const gust=Number(forecast.wind_gust_kt);
      const wave=Number(forecast.wave_height_ft);
      const period=Number(forecast.wave_period_sec);
      const sample=samples[index]||{};
      metric(metrics,'Wind',Number.isFinite(wind)?`${forecast.wind_direction||''} ${Math.round(wind)} kt`:null);
      metric(metrics,'Gust',Number.isFinite(gust)?`${Math.round(gust)} kt`:null);
      metric(metrics,'Wind vs route',relativeWind(forecast.wind_direction_deg,sample.bearing_deg));
      metric(metrics,'Waves',Number.isFinite(wave)?`${wave.toFixed(1)} ft${Number.isFinite(period)?` @ ${Math.round(period)}s`:''}`:null);
      metric(metrics,'Wave direction',forecast.wave_direction||null);
      metric(metrics,'Temperature',Number.isFinite(Number(forecast.temperature_f))?`${Math.round(forecast.temperature_f)}°F`:null);
      metric(metrics,'Precip chance',Number.isFinite(Number(forecast.precip_probability_pct))?`${Math.round(forecast.precip_probability_pct)}%`:null);
      metric(metrics,'Weather',forecast.weather||null);
      card.appendChild(metrics);

      if(forecast.forecast_url) {
        const source=document.createElement('div');
        source.className='route-weather-source';
        const a=document.createElement('a');
        a.href=forecast.forecast_url;a.target='_blank';a.rel='noopener';a.textContent='Open this NWS marine point forecast';
        source.appendChild(a);
        card.appendChild(source);
      }
      els.routeWeather.appendChild(card);
    });

    const caveat=document.createElement('div');
    caveat.className='ops-source';
    caveat.textContent=data.disclaimer||'Marine forecast is planning context; verify current NWS and NPS information before departure.';
    els.routeWeather.appendChild(caveat);
  }

  async function analyzeRouteWeather() {
    if(route.points.length<2)return;
    const departure=new Date(els.routeDeparture.value);
    if(!Number.isFinite(departure.getTime())) {
      status('Choose a valid departure time before analyzing route weather.');
      return;
    }
    const speed=Math.max(.5,Number(els.routeSpeed.value)||3);
    const samples=routeForecastSamples(5);
    els.routeWeatherButton.disabled=true;
    els.routeWeatherButton.textContent='Loading NWS marine forecast…';
    clearRouteWeather('Sampling NWS marine forecast conditions along your route and checking Passage Island / Rock of Ages winds…');
    try {
      const response=await fetch(CONFIG.routeWeatherEndpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({
          departure:departure.toISOString(),
          speed_mph:speed,
          waypoints:samples.map(p=>({lat:p.lat,lon:p.lng,label:p.label,distance_miles:p.distance_miles,bearing_deg:p.bearing_deg}))
        })
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data?.error||`${response.status} route forecast failed`);
      route.weather=data;
      renderRouteWeather(data,samples);
      emitEvent('isle_royale_route_weather',{sample_count:data.summary?.forecast_samples||0,mode:route.mode});
      status('Route weather loaded from NWS marine grid data with live NDBC wind observations.');
    } catch(error) {
      clearRouteWeather(`Route weather unavailable: ${cleanText(error?.message||error)}. Your route remains on the map.`);
      status('Route weather could not be loaded. Route geometry remains available.');
    } finally {
      els.routeWeatherButton.disabled=route.points.length<2;
      els.routeWeatherButton.textContent='Analyze route weather, wind & waves';
    }
  }

  function isCategoryVisible(category) {
    const checkbox = els.filters.querySelector(`input[data-layer="${category}"]`);
    return checkbox ? checkbox.checked : true;
  }

  function selectRecord(record) {
    if (!record || !record.layer) return;
    emitEvent('isle_royale_feature_open', {feature_class:record.category, source_family:sourceFamily(record)});
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
      if (r.sourceKind === 'supplementary public OSM point' && !osmContextVisible) continue;
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
      b.querySelector('span').textContent = r.liveAlert
        ? `Current NPS closure signal · ${layerLabels[r.category] || r.category}`
        : r.boater
          ? `${layerLabels[r.category] || r.category} · NPS campground details available`
          : `${layerLabels[r.category] || r.category} · ${r.sourceKind}`;
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
    return matches.length;
  }

  els.search.addEventListener('input', () => {
    const count = renderFeatureList();
    clearTimeout(searchEventTimer);
    searchEventTimer = setTimeout(() => {
      const term = els.search.value.trim();
      if (!term) return;
      emitEvent('isle_royale_search', {query_category:searchCategory(term), result_count:count});
    }, 400);
  });
  els.filters.addEventListener('change', (event) => {
    const input = event.target.closest('input[data-layer]');
    if (!input) return;
    const id = input.dataset.layer;
    emitEvent('isle_royale_layer_toggle', {layer_id:id, enabled:Boolean(input.checked)});
    const group = layerGroups[id];
    if (group) {
      if (input.checked && !map.hasLayer(group)) group.addTo(map);
      if (!input.checked && map.hasLayer(group)) map.removeLayer(group);
    }
    if (input.checked && deepConfig[id]) loadDeepLayer(id);
    if (input.checked && contextConfig[id]) loadContextLayer(id);
    renderFeatureList();
  });

  function setDefaultRouteDeparture() {
    if(els.routeDeparture.value)return;
    const d=new Date(Date.now()+60*60*1000);
    d.setMinutes(0,0,0);
    const local=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    els.routeDeparture.value=local;
    const max=new Date(Date.now()+7*24*60*60*1000);
    els.routeDeparture.min=new Date(Date.now()-60*60*1000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
    els.routeDeparture.max=new Date(max.getTime()-max.getTimezoneOffset()*60000).toISOString().slice(0,16);
  }

  const routeSpeedDefaults={paddle:3,hike:2,powerboat:15};
  els.routeModeSelect.addEventListener('change',()=>{
    route.mode=els.routeModeSelect.value;
    els.routeSpeed.value=routeSpeedDefaults[route.mode]||3;
    resolveRoute();
    clearRouteWeather('Travel mode changed. Re-run route weather after confirming speed and departure.');
    renderRoute();
  });
  els.routeSpeed.addEventListener('change',()=>{
    clearRouteWeather('Planning speed changed. Re-run route weather for updated arrival times.');
    renderRoute();
  });
  els.routeDeparture.addEventListener('change',()=>clearRouteWeather('Departure changed. Re-run route weather for the new time.'));
  els.routeAddButton.addEventListener('click',()=>setRouteAdding(!route.adding));
  els.routeModeButton.addEventListener('click',()=>{
    document.getElementById('route-planner')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    setRouteAdding(!route.adding);
  });
  els.routeReverse.addEventListener('click',reverseRoute);
  els.routeUndo.addEventListener('click',undoRoutePoint);
  els.routeClear.addEventListener('click',clearRoute);
  els.routeWeatherButton.addEventListener('click',analyzeRouteWeather);
  map.on('click',event=>{
    if(!route.adding)return;
    addRoutePoint(event.latlng,`Waypoint ${route.points.length+1}`);
  });

  document.getElementById('fit-island').addEventListener('click', () => map.fitBounds(CONFIG.islandBounds,{padding:[10,10]}));
  document.getElementById('load-osm').addEventListener('click', loadOsmContext);
  document.getElementById('clear-selection').addEventListener('click', () => {
    if (selectedLayer && selectedLayer.closePopup) selectedLayer.closePopup();
    selectedLayer = null;
    map.closePopup();
  });

  document.querySelectorAll('.map-shelf a[href]').forEach(link => {
    link.addEventListener('click', () => emitEvent('isle_royale_source_open', {source_id:'reference-shelf'}));
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
        const td3 = document.createElement('td'); const a=document.createElement('a'); a.href=item.source; a.target='_blank'; a.rel='noopener'; a.textContent=item.publisher; a.addEventListener('click', () => emitEvent('isle_royale_source_open', {source_id:item.id || 'catalog-source'})); td3.appendChild(a);
        const td4 = document.createElement('td'); td4.textContent = item.vintage ? `${item.vintage}. ${item.notes}` : item.notes;
        tr.append(td1,td2,td3,td4);
        els.catalog.appendChild(tr);
      }
    } catch (_) {
      els.catalog.innerHTML = '<tr><td>Source catalog could not be loaded.</td><td></td><td><a href="/isle-royale-map/catalog.json">Open raw catalog</a></td><td>The interactive map remains available.</td></tr>';
    }
  }

  setDefaultRouteDeparture();
  renderRoute();
  renderFeatureList();
  loadCatalog();
  loadOperationalData();
  renderDeepStatus();
  loadDeepManifest().catch(() => {});
  renderContextStatus();
  loadContextManifest().catch(() => {});
  loadVisitorGeometry();
})();
