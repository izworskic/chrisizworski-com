/* FIELD_GUIDE_V1 · Great Lakes Shipwreck Viewing Field Guide Client Script */
(function () {
  'use strict';

  var WRECKS_DATA = [
    {
      id: 'bermuda-schooner',
      name: 'The Bermuda (1860 Wooden Schooner)',
      preserve: 'alger',
      preserveName: 'Alger Underwater Preserve',
      depth: '10–25 ft',
      depthCat: 'shallow',
      methods: ['glass-bottom', 'kayak', 'snorkel'],
      lat: 46.4633,
      lon: -86.6433,
      lake: 'Superior'
    },
    {
      id: 'herman-hettler',
      name: 'The Herman H. Hettler (1910 Wooden Steamer)',
      preserve: 'alger',
      preserveName: 'Alger Underwater Preserve',
      depth: '10–25 ft',
      depthCat: 'shallow',
      methods: ['glass-bottom', 'kayak', 'snorkel'],
      lat: 46.4839,
      lon: -86.6083,
      lake: 'Superior'
    },
    {
      id: 'au-sable-point-shipwrecks',
      name: 'Au Sable Point Shipwreck Trail (Sitka & Gale Staples)',
      preserve: 'alger',
      preserveName: 'Pictured Rocks / Alger Preserve',
      depth: '0–10 ft',
      depthCat: 'beach-wash',
      methods: ['shore', 'snorkel'],
      lat: 46.6721,
      lon: -86.1455,
      lake: 'Superior'
    },
    {
      id: 'francisco-morazan',
      name: 'The Francisco Morazan (1922 Ocean Freighter)',
      preserve: 'manitou',
      preserveName: 'Manitou Passage Underwater Preserve',
      depth: '0–15 ft',
      depthCat: 'shallow',
      methods: ['shore', 'kayak', 'snorkel'],
      lat: 45.0194,
      lon: -86.1361,
      lake: 'Michigan'
    },
    {
      id: 'three-brothers',
      name: 'The Three Brothers (1888 Wooden Steam Barge)',
      preserve: 'manitou',
      preserveName: 'Manitou Passage Underwater Preserve',
      depth: '5–45 ft',
      depthCat: 'shallow',
      methods: ['shore', 'kayak', 'snorkel'],
      lat: 45.0133,
      lon: -86.1033,
      lake: 'Michigan'
    },
    {
      id: 'joseph-s-fay',
      name: 'The Joseph S. Fay (1871 Wooden Steam Barge)',
      preserve: 'thunder-bay',
      preserveName: '40 Mile Point / Presque Isle',
      depth: '0–12 ft',
      depthCat: 'beach-wash',
      methods: ['shore', 'kayak', 'snorkel'],
      lat: 45.4856,
      lon: -83.9142,
      lake: 'Huron'
    },
    {
      id: 'portland-schooner',
      name: 'The Portland (1863 Wooden Schooner)',
      preserve: 'thunder-bay',
      preserveName: 'Thunder Bay National Marine Sanctuary',
      depth: '6–10 ft',
      depthCat: 'shallow',
      methods: ['shore', 'kayak', 'snorkel'],
      lat: 45.2417,
      lon: -83.4350,
      lake: 'Huron'
    },
    {
      id: 'monohansett-steam-barge',
      name: 'The Monohansett (1872 Wooden Steam Barge)',
      preserve: 'thunder-bay',
      preserveName: 'Thunder Bay National Marine Sanctuary',
      depth: '18 ft',
      depthCat: 'deep',
      methods: ['glass-bottom', 'kayak', 'snorkel'],
      lat: 45.0317,
      lon: -83.3308,
      lake: 'Huron'
    },
    {
      id: 'shamrock-steamer',
      name: 'The Shamrock (1875 Wooden Steam Barge)',
      preserve: 'thunder-bay',
      preserveName: 'Thunder Bay National Marine Sanctuary',
      depth: '11 ft',
      depthCat: 'shallow',
      methods: ['kayak', 'snorkel'],
      lat: 45.0483,
      lon: -83.4283,
      lake: 'Huron'
    },
    {
      id: 'lb-coates-schooner',
      name: 'The L.B. Coates (1874 Wooden Schooner)',
      preserve: 'straits',
      preserveName: 'Straits of Mackinac Underwater Preserve',
      depth: '8–10 ft',
      depthCat: 'shallow',
      methods: ['kayak', 'snorkel'],
      lat: 45.8678,
      lon: -84.7214,
      lake: 'Huron'
    },
    {
      id: 'troy-silver-spray',
      name: 'The Troy & Silver Spray (1872 Schooner & 1894 Tug)',
      preserve: 'straits',
      preserveName: 'Drummond Island Underwater Network',
      depth: '5–12 ft',
      depthCat: 'shallow',
      methods: ['kayak', 'snorkel'],
      lat: 45.9689,
      lon: -83.8967,
      lake: 'Huron'
    },
    {
      id: 'whitefish-point-shallows',
      name: 'Whitefish Point & Vermilion Shallows (Comet & Saturn)',
      preserve: 'whitefish',
      preserveName: 'Whitefish Point Underwater Preserve',
      depth: '0–25 ft',
      depthCat: 'deep',
      methods: ['shore', 'kayak', 'snorkel'],
      lat: 46.7711,
      lon: -84.9544,
      lake: 'Superior'
    }
  ];

  var state = {
    method: 'all',
    preserve: 'all',
    depth: 'all'
  };

  var map = null;
  var markers = {};
  var tiles = null;

  function initFilters() {
    var methodButtons = document.querySelectorAll('[data-viewing-filter]');
    var preserveSelect = document.getElementById('preserve-filter');
    var depthSelect = document.getElementById('depth-filter');
    var resetLink = document.getElementById('sw-reset-filters');

    methodButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        methodButtons.forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        state.method = btn.getAttribute('data-viewing-filter');
        applyFilters();
      });
    });

    if (preserveSelect) {
      preserveSelect.addEventListener('change', function () {
        state.preserve = this.value;
        applyFilters();
      });
    }

    if (depthSelect) {
      depthSelect.addEventListener('change', function () {
        state.depth = this.value;
        applyFilters();
      });
    }

    if (resetLink) {
      resetLink.addEventListener('click', function (e) {
        e.preventDefault();
        methodButtons.forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        var allBtn = document.querySelector('[data-viewing-filter="all"]');
        if (allBtn) {
          allBtn.classList.add('is-active');
          allBtn.setAttribute('aria-pressed', 'true');
        }
        if (preserveSelect) preserveSelect.value = 'all';
        if (depthSelect) depthSelect.value = 'all';

        state.method = 'all';
        state.preserve = 'all';
        state.depth = 'all';
        applyFilters();
      });
    }
  }

  function applyFilters() {
    var cards = document.querySelectorAll('.wf-story');
    var visibleCount = 0;

    cards.forEach(function (card) {
      var cardMethods = (card.getAttribute('data-methods') || '').split(' ');
      var cardPreserve = card.getAttribute('data-preserve') || '';
      var cardDepth = card.getAttribute('data-depth-cat') || '';

      var matchMethod = state.method === 'all' || cardMethods.indexOf(state.method) !== -1;
      var matchPreserve = state.preserve === 'all' || cardPreserve === state.preserve;
      var matchDepth = state.depth === 'all' || cardDepth === state.depth;

      var isVisible = matchMethod && matchPreserve && matchDepth;
      card.style.display = isVisible ? '' : 'none';

      var wreckId = card.getAttribute('data-wreck-id');
      if (markers[wreckId]) {
        if (isVisible) {
          if (!map.hasLayer(markers[wreckId])) {
            markers[wreckId].addTo(map);
          }
        } else {
          if (map.hasLayer(markers[wreckId])) {
            map.removeLayer(markers[wreckId]);
          }
        }
      }

      if (isVisible) visibleCount++;
    });

    var countDisplay = document.getElementById('sw-visible-count');
    if (countDisplay) {
      countDisplay.textContent = 'Showing ' + visibleCount + ' of 12 underwater preserve stops';
    }
  }

  function showTiles(url, provider) {
    if (!map) return;
    if (tiles) map.removeLayer(tiles);

    var layer = L.tileLayer(url, {
      subdomains: provider === 'CARTO' ? 'abcd' : 'abc',
      maxZoom: 18,
      attribution: provider === 'CARTO'
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    tiles = layer;
    var failed = 0;

    layer.on('tileerror', function () {
      if (tiles !== layer) return;
      if (++failed >= 2 && provider === 'CARTO') {
        showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png', 'OSM');
      }
    });

    layer.addTo(map);
  }

  function connectTiles() {
    var ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ac ? setTimeout(function () { ac.abort(); }, 6500) : null;
    fetch('/api/carto-basemap-config', { credentials: 'same-origin', signal: ac ? ac.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error('config');
        return r.json();
      })
      .then(function (c) {
        if (!c || c.provider !== 'CARTO' || typeof c.key !== 'string' || !c.key.trim()) throw new Error('config');
        showTiles('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(c.key.trim()), 'CARTO');
      })
      .catch(function () {
        showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png', 'OSM');
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  function initMap() {
    var mapEl = document.getElementById('shipwreck-map');
    if (!mapEl || typeof L === 'undefined') return;

    map = L.map('shipwreck-map', {
      center: [45.7, -85.1],
      zoom: 6,
      minZoom: 5,
      maxZoom: 13,
      scrollWheelZoom: false
    });

    connectTiles();

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () {
        if (map) map.invalidateSize({ pan: false });
      }).observe(mapEl);
    }
    requestAnimationFrame(function () {
      if (map) map.invalidateSize({ pan: false });
    });

    WRECKS_DATA.forEach(function (wreck) {
      var icon = L.divIcon({
        className: 'sw-map-marker',
        html: '<div style="background:#0c2340;color:#38bdf8;border:2px solid #ffffff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);font-size:13px;font-weight:bold;">⚓</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      var marker = L.marker([wreck.lat, wreck.lon], { icon: icon });
      marker.bindPopup(
        '<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.4;">' +
        '<strong style="color:#0c2340;font-size:14px;">' + wreck.name + '</strong><br>' +
        '<span style="color:#0284c7;font-weight:700;font-size:11px;">' + wreck.preserveName + '</span><br>' +
        '<span style="color:#64748b;font-size:11px;">Depth: ' + wreck.depth + ' · Lake ' + wreck.lake + '</span><br>' +
        '<a href="#' + wreck.id + '" style="color:#0c2340;font-weight:bold;margin-top:6px;display:inline-block;text-decoration:underline;">View Shipwreck Dossier &rarr;</a>' +
        '</div>'
      );

      marker.addTo(map);
      markers[wreck.id] = marker;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFilters();
    initMap();
  });
})();
