/**
 * Michigan After Dark: The Northern Lights, Dark-Sky Preserves & Meteor Shower Field Guide
 * Interactive Client Engine: Filters, Horizon Compass Dials & CARTO Dark Basemap
 */

(function () {
  'use strict';

  // State
  const state = {
    target: 'all',
    region: 'all',
    bortle: 'all',
    map: null,
    markers: {}
  };

  // Stops Data for Map Integration
  const STOPS = [
    {
      id: 'headlands-dark-sky-park',
      name: 'Headlands International Dark Sky Park',
      lat: 45.7766,
      lng: -84.7865,
      bortle: 2,
      azimuth: 340,
      direction: '340° NNW',
      target: 'aurora,meteor,certified',
      region: 'lower-west'
    },
    {
      id: 'brockway-mountain-keweenaw',
      name: 'Brockway Mountain Overlook & Keweenaw Dark Sky Park',
      lat: 47.4665,
      lng: -87.9048,
      bortle: 1,
      azimuth: 0,
      direction: '000° True North',
      target: 'aurora,meteor,certified',
      region: 'up'
    },
    {
      id: 'great-sand-bay-eagle-harbor',
      name: 'Great Sand Bay & Eagle Harbor M-26 Shoreline',
      lat: 47.4332,
      lng: -88.2435,
      bortle: 1,
      azimuth: 330,
      direction: '330° NNW',
      target: 'aurora,meteor',
      region: 'up'
    },
    {
      id: 'pictured-rocks-miners-beach',
      name: 'Miners Beach & Sand Point (Pictured Rocks National Lakeshore)',
      lat: 46.4962,
      lng: -86.5368,
      bortle: 2,
      azimuth: 10,
      direction: '010° NNE',
      target: 'aurora,meteor',
      region: 'up'
    },
    {
      id: 'whitefish-point-beach',
      name: 'Whitefish Point & Great Lakes Shipwreck Museum Beach',
      lat: 46.7705,
      lng: -84.9542,
      bortle: 2,
      azimuth: 350,
      direction: '350° N',
      target: 'aurora,meteor',
      region: 'up'
    },
    {
      id: 'porcupine-mountains-union-bay',
      name: 'Porcupine Mountains: Union Bay & Summit Peak Overlook',
      lat: 46.8202,
      lng: -89.6277,
      bortle: 1,
      azimuth: 355,
      direction: '355° N',
      target: 'aurora,milkyway,meteor',
      region: 'up'
    },
    {
      id: 'sleeping-bear-dune-climb',
      name: 'Sleeping Bear Dunes: Dune Climb & Lake Michigan Overlook',
      lat: 44.8728,
      lng: -86.0422,
      bortle: 3,
      azimuth: 300,
      direction: '300° WNW',
      target: 'meteor,milkyway',
      region: 'lower-west'
    },
    {
      id: 'wilderness-state-park-preserve',
      name: 'Wilderness State Park Dark Sky Preserve',
      lat: 45.7483,
      lng: -84.9125,
      bortle: 2,
      azimuth: 325,
      direction: '325° NW',
      target: 'aurora,meteor,certified',
      region: 'lower-west'
    },
    {
      id: 'port-crescent-state-park-preserve',
      name: 'Port Crescent State Park Dark Sky Preserve',
      lat: 44.0048,
      lng: -83.0722,
      bortle: 3,
      azimuth: 335,
      direction: '335° NNW',
      target: 'aurora,meteor,certified',
      region: 'sunrise'
    },
    {
      id: 'negwegon-state-park-preserve',
      name: 'Negwegon State Park Dark Sky Preserve',
      lat: 44.8562,
      lng: -83.3327,
      bortle: 2,
      azimuth: 160,
      direction: '160° SSE',
      target: 'milkyway,meteor,certified',
      region: 'sunrise'
    },
    {
      id: 'thompsons-harbor-state-park-preserve',
      name: 'Thompson\'s Harbor State Park Dark Sky Preserve',
      lat: 45.3375,
      lng: -83.6012,
      bortle: 2,
      azimuth: 30,
      direction: '030° NNE',
      target: 'aurora,meteor,certified',
      region: 'sunrise'
    },
    {
      id: 'rockport-recreation-area-preserve',
      name: 'Rockport State Recreation Area Dark Sky Preserve',
      lat: 45.2038,
      lng: -83.3855,
      bortle: 2,
      azimuth: 45,
      direction: '045° NE',
      target: 'aurora,meteor,certified',
      region: 'sunrise'
    }
  ];

  function initFilters() {
    const filterButtons = document.querySelectorAll('.ds-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const group = this.dataset.filterGroup;
        const value = this.dataset.filterValue;

        // Update active class within group
        document.querySelectorAll(`.ds-filter-btn[data-filter-group="${group}"]`).forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        state[group] = value;
        applyFilters();
      });
    });
  }

  function applyFilters() {
    const stories = document.querySelectorAll('.wf-story');
    let visibleCount = 0;

    stories.forEach(story => {
      const storyTarget = story.dataset.target || '';
      const storyRegion = story.dataset.region || '';
      const storyBortle = story.dataset.bortle || '';
      const storyId = story.id;

      const targetMatch = state.target === 'all' || storyTarget.includes(state.target);
      const regionMatch = state.region === 'all' || storyRegion === state.region;
      const bortleMatch = state.bortle === 'all' || storyBortle === state.bortle;

      const visible = targetMatch && regionMatch && bortleMatch;

      if (visible) {
        story.style.display = 'grid';
        visibleCount++;
        if (state.markers[storyId] && state.map) {
          state.markers[storyId].addTo(state.map);
        }
      } else {
        story.style.display = 'none';
        if (state.markers[storyId] && state.map) {
          state.markers[storyId].remove();
        }
      }
    });

    const countElem = document.getElementById('ds-results-count');
    if (countElem) {
      countElem.textContent = `Showing ${visibleCount} of ${stories.length} audited night-sky bases`;
    }
  }

  function initCompassNeedles() {
    document.querySelectorAll('.ds-azimuth-box').forEach(box => {
      const bearing = parseInt(box.dataset.azimuth, 10);
      const needle = box.querySelector('.ds-compass-needle');
      if (needle && !isNaN(bearing)) {
        needle.style.transform = `rotate(${bearing}deg)`;
      }
    });
  }

  function initMap() {
    const mapContainer = document.getElementById('dark-sky-map');
    if (!mapContainer || typeof window.L === 'undefined') return;

    // Michigan Center
    const map = window.L.map('dark-sky-map', {
      center: [45.8, -85.2],
      zoom: 6,
      minZoom: 5,
      maxZoom: 14,
      scrollWheelZoom: false
    });
    state.map = map;

    // Fetch CARTO basemap via sanctioned API route with OpenStreetMap fallback
    fetch('/api/carto-basemap-config')
      .then(res => {
        if (!res.ok) throw new Error('CARTO API response not ok');
        return res.json();
      })
      .then(cfg => {
        if (!cfg || !cfg.apiKey) throw new Error('Invalid CARTO basemap config');
        const key = encodeURIComponent(cfg.apiKey);
        window.L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?api_key=${key}`, {
          subdomains: 'abcd',
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19
        }).addTo(map);
      })
      .catch(() => {
        // Fallback to standard OpenStreetMap
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18
        }).addTo(map);
      });

    // Add markers for all stops
    STOPS.forEach(stop => {
      // Color-code by Bortle class: Bortle 1 = emerald, Bortle 2 = indigo/purple, Bortle 3 = sky blue
      let color = '#38ef7d'; // Bortle 1
      if (stop.bortle === 2) color = '#a5b4fc';
      if (stop.bortle === 3) color = '#38bdf8';

      const customIcon = window.L.divIcon({
        className: 'ds-map-marker',
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px ${color};"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = window.L.marker([stop.lat, stop.lng], { icon: customIcon }).addTo(map);

      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.4;color:#0e1a2b;">
          <strong style="display:block;font-size:14px;margin-bottom:4px;">${stop.name}</strong>
          <div style="font-weight:600;color:#059669;margin-bottom:4px;">Bortle ${stop.bortle} · Primary Horizon: ${stop.direction}</div>
          <a href="#${stop.id}" style="color:#2563eb;font-weight:700;text-decoration:none;">Jump to Field Guide Card &darr;</a>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        const targetCard = document.getElementById(stop.id);
        if (targetCard) {
          document.querySelectorAll('.wf-story').forEach(c => c.classList.remove('highlighted'));
          targetCard.classList.add('highlighted');
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      state.markers[stop.id] = marker;
    });

    // Wire "Find on Map" buttons on cards
    document.querySelectorAll('[data-pan-to]').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const id = this.dataset.panTo;
        const stop = STOPS.find(s => s.id === id);
        if (stop && state.map) {
          state.map.setView([stop.lat, stop.lng], 9, { animate: true });
          if (state.markers[id]) {
            state.markers[id].openPopup();
          }
          mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initFilters();
      initCompassNeedles();
      initMap();
    });
  } else {
    initFilters();
    initCompassNeedles();
    initMap();
  }
})();
