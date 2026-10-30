/* FIELD_GUIDE_V1 · Great Lakes Island-Hopper Field Guide Client Script */
(function () {
  'use strict';

  var ISLANDS_DATA = [
    { id: 'mackinac-island', name: 'Mackinac Island', lake: 'huron', personality: 'car-free-historic', vehicle: 'passenger-only', dogs: 'dogs-allowed', lat: 45.8492, lon: -84.6189, distance: '4.5 nm', time: '16–18 min' },
    { id: 'isle-royale-national-park', name: 'Isle Royale National Park', lake: 'superior', personality: 'backcountry-wilderness', vehicle: 'passenger-only', dogs: 'no-pets', lat: 48.1460, lon: -88.4840, distance: '48–55 nm', time: '3.5–6h' },
    { id: 'beaver-island', name: 'Beaver Island', lake: 'michigan', personality: 'bring-car-camp', vehicle: 'vehicle-ferry', dogs: 'dogs-allowed', lat: 45.7447, lon: -85.5228, distance: '28 nm', time: '2h 15m' },
    { id: 'south-manitou-island', name: 'South Manitou Island', lake: 'michigan', personality: 'backcountry-wilderness', vehicle: 'passenger-only', dogs: 'no-pets', lat: 45.0211, lon: -86.1364, distance: '14 nm', time: '1.5h' },
    { id: 'north-manitou-island', name: 'North Manitou Island', lake: 'michigan', personality: 'backcountry-wilderness', vehicle: 'passenger-only', dogs: 'no-pets', lat: 45.1167, lon: -86.0167, distance: '10.5 nm', time: '1h 15m' },
    { id: 'madeline-island', name: 'Madeline Island', lake: 'superior', personality: 'bring-car-camp', vehicle: 'vehicle-ferry', dogs: 'dogs-allowed', lat: 46.7761, lon: -90.7844, distance: '2.3 nm', time: '25 min' },
    { id: 'washington-island', name: 'Washington Island', lake: 'michigan', personality: 'day-trip-bike', vehicle: 'vehicle-ferry', dogs: 'dogs-allowed', lat: 45.3622, lon: -86.9242, distance: '4.8 nm', time: '30 min' },
    { id: 'put-in-bay-south-bass', name: 'Put-in-Bay (South Bass)', lake: 'erie', personality: 'day-trip-bike', vehicle: 'vehicle-ferry', dogs: 'dogs-allowed', lat: 41.6528, lon: -82.8189, distance: '2.6–12 nm', time: '18–30 min' },
    { id: 'kelleys-island', name: 'Kelleys Island', lake: 'erie', personality: 'day-trip-bike', vehicle: 'vehicle-ferry', dogs: 'dogs-allowed', lat: 41.6033, lon: -82.7050, distance: '3.0 nm', time: '20 min' },
    { id: 'pelee-island', name: 'Pelee Island', lake: 'erie', personality: 'day-trip-bike', vehicle: 'vehicle-ferry', dogs: 'dogs-allowed', lat: 41.7719, lon: -82.6681, distance: '13–19 nm', time: '1.5–2h' },
    { id: 'drummond-island', name: 'Drummond Island', lake: 'huron', personality: 'bring-car-camp', vehicle: 'vehicle-ferry', dogs: 'dogs-allowed', lat: 45.9867, lon: -83.8964, distance: '0.8 nm', time: '10 min' },
    { id: 'manitoulin-island', name: 'Manitoulin Island', lake: 'huron', personality: 'bring-car-camp', vehicle: 'vehicle-ferry', dogs: 'dogs-allowed', lat: 45.5564, lon: -82.0167, distance: '24 nm', time: '1h 45m' }
  ];

  var state = {
    personality: 'all',
    lake: 'all',
    vehicle: 'all',
    dogs: 'all'
  };

  var map = null;
  var markers = {};
  var tiles = null;

  function initFilters() {
    var personalityButtons = document.querySelectorAll('[data-personality-filter]');
    var lakeSelect = document.getElementById('lake-filter');
    var vehicleSelect = document.getElementById('vehicle-filter');
    var dogsSelect = document.getElementById('dogs-filter');
    var resetLink = document.getElementById('ig-reset-filters');

    personalityButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        personalityButtons.forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        state.personality = btn.getAttribute('data-personality-filter');
        applyFilters();
      });
    });

    if (lakeSelect) {
      lakeSelect.addEventListener('change', function () {
        state.lake = lakeSelect.value;
        applyFilters();
      });
    }

    if (vehicleSelect) {
      vehicleSelect.addEventListener('change', function () {
        state.vehicle = vehicleSelect.value;
        applyFilters();
      });
    }

    if (dogsSelect) {
      dogsSelect.addEventListener('change', function () {
        state.dogs = dogsSelect.value;
        applyFilters();
      });
    }

    if (resetLink) {
      resetLink.addEventListener('click', function (e) {
        e.preventDefault();
        state.personality = 'all';
        state.lake = 'all';
        state.vehicle = 'all';
        state.dogs = 'all';

        personalityButtons.forEach(function (b) {
          var isAll = b.getAttribute('data-personality-filter') === 'all';
          b.classList.toggle('is-active', isAll);
          b.setAttribute('aria-pressed', isAll ? 'true' : 'false');
        });

        if (lakeSelect) lakeSelect.value = 'all';
        if (vehicleSelect) vehicleSelect.value = 'all';
        if (dogsSelect) dogsSelect.value = 'all';

        applyFilters();
      });
    }
  }

  function applyFilters() {
    var cards = document.querySelectorAll('.wf-story[data-island-id]');
    var visibleCount = 0;

    cards.forEach(function (card) {
      var cardPersonality = card.getAttribute('data-personality') || '';
      var cardLake = card.getAttribute('data-lake') || '';
      var cardVehicle = card.getAttribute('data-vehicle') || '';
      var cardDogs = card.getAttribute('data-dogs') || '';

      var matchPersonality = state.personality === 'all' || cardPersonality === state.personality;
      var matchLake = state.lake === 'all' || cardLake === state.lake;
      var matchVehicle = state.vehicle === 'all' || cardVehicle === state.vehicle;
      var matchDogs = state.dogs === 'all' || cardDogs === state.dogs;

      var isVisible = matchPersonality && matchLake && matchVehicle && matchDogs;
      card.style.display = isVisible ? '' : 'none';

      var islandId = card.getAttribute('data-island-id');
      if (markers[islandId]) {
        if (isVisible) {
          if (!map.hasLayer(markers[islandId])) {
            markers[islandId].addTo(map);
          }
        } else {
          if (map.hasLayer(markers[islandId])) {
            map.removeLayer(markers[islandId]);
          }
        }
      }

      if (isVisible) visibleCount++;
    });

    var countDisplay = document.getElementById('ig-visible-count');
    if (countDisplay) {
      countDisplay.textContent = 'Showing ' + visibleCount + ' of 12 ferry-access archipelagos';
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
    var mapEl = document.getElementById('island-map');
    if (!mapEl || typeof L === 'undefined') return;

    map = L.map('island-map', {
      center: [45.4, -85.5],
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

    ISLANDS_DATA.forEach(function (island) {
      var icon = L.divIcon({
        className: 'ig-map-marker',
        html: '<div style="background:#0c4a6e;color:#fff;border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px;font-weight:bold;">⚓</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      var marker = L.marker([island.lat, island.lon], { icon: icon });
      marker.bindPopup(
        '<div style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.4;">' +
        '<strong style="color:#0c4a6e;font-size:14px;">' + island.name + '</strong><br>' +
        '<span style="color:#64748b;font-size:11px;">Crossing: ' + island.distance + ' · ' + island.time + '</span><br>' +
        '<a href="#' + island.id + '" style="color:#0c4a6e;font-weight:bold;margin-top:6px;display:inline-block;text-decoration:underline;">View Island Dossier &rarr;</a>' +
        '</div>'
      );

      marker.addTo(map);
      markers[island.id] = marker;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFilters();
    initMap();
  });
})();
