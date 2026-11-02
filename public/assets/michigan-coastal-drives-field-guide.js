/**
 * Michigan Coastal Drives Field Guide Interactive Controller
 * Persona: Seasoned Great Lakes Highway Cartographer
 */

(function () {
  'use strict';

  const ROUTES_DATA = [
    { id: 1, slug: 'm22-leelanau', route: 'M-22', name: 'Leelanau Peninsula & Sleeping Bear Byway', water: 'lake-michigan', wave: 4, lat: 44.8970, lon: -85.9520, miles: '116 mi', peak: 'Oct 8 – Oct 18' },
    { id: 2, slug: 'm119-tunnel-of-trees', route: 'M-119', name: 'Tunnel of Trees & Lake Michigan Bluffs', water: 'lake-michigan', wave: 3, lat: 45.5240, lon: -85.0310, miles: '27.5 mi', peak: 'Oct 5 – Oct 15' },
    { id: 3, slug: 'm26-brockway-mountain', route: 'M-26', name: 'Copper Country Trail & Brockway Mountain', water: 'lake-superior', wave: 1, lat: 47.4660, lon: -87.8960, miles: '58 mi + 9.5 mi', peak: 'Sep 26 – Oct 6' },
    { id: 4, slug: 'us2-top-of-lake', route: 'US-2', name: 'Top of the Lake Scenic Byway', water: 'lake-michigan', wave: 3, lat: 46.0460, lon: -85.1950, miles: '143 mi', peak: 'Oct 1 – Oct 10' },
    { id: 5, slug: 'us23-sunrise-side', route: 'US-23', name: 'Huron Shores Sunrise Side Heritage Route', water: 'lake-huron', wave: 3, lat: 44.2540, lon: -83.4500, miles: '200 mi', peak: 'Oct 6 – Oct 16' },
    { id: 6, slug: 'm28-seney-stretch', route: 'M-28', name: 'Lake Superior Heartland & Seney Stretch', water: 'lake-superior', wave: 2, lat: 46.4120, lon: -86.5890, miles: '130 mi', peak: 'Sep 28 – Oct 8' },
    { id: 7, slug: 'm123-tahquamenon', route: 'M-123', name: 'Tahquamenon Scenic Byway & Whitefish Bay', water: 'lake-superior', wave: 2, lat: 46.5700, lon: -85.2550, miles: '92 mi', peak: 'Sep 27 – Oct 7' },
    { id: 8, slug: 'm134-les-cheneaux', route: 'M-134', name: 'Les Cheneaux Islands & DeTour Coastal Byway', water: 'lake-huron', wave: 2, lat: 45.9920, lon: -84.3590, miles: '50 mi', peak: 'Oct 3 – Oct 12' },
    { id: 9, slug: 'm107-porkies-escarpment', route: 'M-107', name: 'Porcupine Mountains Wilderness Escarpment', water: 'lake-superior', wave: 1, lat: 46.8040, lon: -89.7610, miles: '25 mi', peak: 'Sep 24 – Oct 4' },
    { id: 10, slug: 'm37-old-mission', route: 'M-37', name: 'Old Mission Peninsula Cherry & Riesling Ridge', water: 'scenic-ridge', wave: 4, lat: 44.9890, lon: -85.4790, miles: '19 mi (x2)', peak: 'Oct 12 – Oct 22' },
    { id: 11, slug: 'm64-black-river-harbor', route: 'M-64', name: 'Western Superior Shore & Black River Harbor', water: 'lake-superior', wave: 1, lat: 46.8520, lon: -89.3180, miles: '65 mi', peak: 'Sep 26 – Oct 6' },
    { id: 12, slug: 'us31-charlevoix-bays', route: 'US-31', name: 'Grand Traverse & Little Traverse Bays Shoreline', water: 'lake-michigan', wave: 4, lat: 45.3180, lon: -85.2600, miles: '110 mi', peak: 'Oct 8 – Oct 18' }
  ];

  let mapInstance = null;
  const markerMap = {};

  function initMap() {
    const mapEl = document.getElementById('coastal-drives-map');
    if (!mapEl || typeof L === 'undefined') return;

    mapInstance = L.map('coastal-drives-map', {
      center: [45.45, -85.6],
      zoom: 7,
      scrollWheelZoom: false
    });

    const cartoVoyager = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }
    );

    const osmFallback = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    });

    cartoVoyager.addTo(mapInstance);
    cartoVoyager.on('tileerror', function () {
      if (!mapInstance.hasLayer(osmFallback)) {
        osmFallback.addTo(mapInstance);
      }
    });

    ROUTES_DATA.forEach(r => {
      const icon = L.divIcon({
        className: 'custom-cd-marker',
        html: `<div style="background:#0f2942;color:#ffffff;font-size:11px;font-weight:800;border:2px solid #ffffff;border-radius:12px;padding:3px 7px;box-shadow:0 2px 6px rgba(0,0,0,0.35);white-space:nowrap;display:inline-block;cursor:pointer;">${r.route}</div>`,
        iconSize: [46, 24],
        iconAnchor: [23, 12]
      });

      const marker = L.marker([r.lat, r.lon], { icon: icon }).addTo(mapInstance);
      const popupHtml = `
        <div style="font-family:-apple-system,sans-serif;max-width:240px;padding:4px;">
          <strong style="color:#0f2942;font-size:13px;display:block;margin-bottom:3px;">${r.route}: ${r.name}</strong>
          <span style="font-size:11px;color:#64748b;display:block;">Distance: ${r.miles} | Peak: ${r.peak}</span>
          <a href="#stop-${r.slug}" style="display:inline-block;margin-top:6px;font-size:11px;font-weight:700;color:#c05621;text-decoration:none;">View Route Dossier &rarr;</a>
        </div>
      `;
      marker.bindPopup(popupHtml);
      markerMap[r.slug] = marker;
    });
  }

  function setupFilters() {
    const filterBtns = document.querySelectorAll('.cd-filter-btn');
    const cards = document.querySelectorAll('.wf-story');
    const countDisplay = document.getElementById('visible-route-count');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Deactivate wave pills if active
        document.querySelectorAll('.cd-wave-pill').forEach(wp => wp.classList.remove('active'));

        const category = btn.getAttribute('data-filter');
        let visibleCount = 0;

        cards.forEach(card => {
          const cardCategory = card.getAttribute('data-category');
          if (category === 'all' || cardCategory === category) {
            card.style.display = 'block';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });

        if (countDisplay) {
          countDisplay.textContent = visibleCount;
        }
      });
    });
  }

  function setupWavePills() {
    const wavePills = document.querySelectorAll('.cd-wave-pill');
    const cards = document.querySelectorAll('.wf-story');
    const countDisplay = document.getElementById('visible-route-count');

    wavePills.forEach(pill => {
      pill.addEventListener('click', () => {
        const isCurrentActive = pill.classList.contains('active');

        wavePills.forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.cd-filter-btn').forEach(b => b.classList.remove('active'));

        if (isCurrentActive) {
          // Reset to show all
          document.querySelector('.cd-filter-btn[data-filter="all"]')?.classList.add('active');
          cards.forEach(card => card.style.display = 'block');
          if (countDisplay) countDisplay.textContent = cards.length;
          return;
        }

        pill.classList.add('active');
        const targetWave = pill.getAttribute('data-wave');
        let visibleCount = 0;

        cards.forEach(card => {
          const cardWave = card.getAttribute('data-wave');
          if (cardWave === targetWave) {
            card.style.display = 'block';
            visibleCount++;
          } else {
            card.style.display = 'none';
          }
        });

        if (countDisplay) {
          countDisplay.textContent = visibleCount;
        }
      });
    });
  }

  function setupCenterButtons() {
    document.querySelectorAll('.cd-center-map-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const slug = btn.getAttribute('data-slug');
        const r = ROUTES_DATA.find(x => x.slug === slug);
        if (r && mapInstance) {
          mapInstance.flyTo([r.lat, r.lon], 9, { duration: 1.2 });
          const marker = markerMap[slug];
          if (marker) {
            setTimeout(() => marker.openPopup(), 1250);
          }
          const mapEl = document.getElementById('coastal-drives-map');
          if (mapEl) {
            mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    });
  }

  async function checkLiveFallConditions() {
    const statusPill = document.getElementById('live-fall-status');
    if (!statusPill) return;

    try {
      const res = await fetch('/api/fall-color-conditions');
      if (res.ok) {
        const data = await res.json();
        if (data && data.updated) {
          statusPill.textContent = 'Fall Color Engine: Active Feed Synchronized';
          statusPill.style.background = '#dcfce7';
          statusPill.style.color = '#166534';
          return;
        }
      }
    } catch (e) {
      // Fallback
    }

    // Default seasonal cartography status
    const now = new Date();
    const month = now.getMonth() + 1;
    if (month >= 9 && month <= 10) {
      statusPill.textContent = 'Fall Color Engine: Peak Wave Tracking Active';
      statusPill.style.background = '#ffedd5';
      statusPill.style.color = '#9a3412';
    } else {
      statusPill.textContent = 'Fall Color Engine: Microclimate Baseline Active';
      statusPill.style.background = '#e0f2fe';
      statusPill.style.color = '#0369a1';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupFilters();
    setupWavePills();
    setupCenterButtons();
    checkLiveFallConditions();
  });
})();
