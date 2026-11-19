/* FIELD_GUIDE_V1 · Michigan Spring Awakening Field Guide Client Script */
(function () {
  'use strict';

  var LAT_ZONES = [
    {
      lat: 41.7,
      name: 'Southern Border & Irish Hills (41.7°N – 42.5°N)',
      soilTemp: '42°F – 52°F (Early April–Early May)',
      freezeThaw: 'Mid-February thaw; sap runs early March',
      window: 'Peak Awakening: Late Feb – Mid May',
      maple: 'Feb 20 – Mar 20 (Early tap window)',
      amphibians: 'First warm rain >45°F in late March (Big Night)',
      morels: 'April 20 – May 10 (Yellow & gray morels)',
      wildflowers: 'Late March bloodroot to mid-April trilliums'
    },
    {
      lat: 43.0,
      name: 'Mid-Michigan & Saginaw Basin (42.6°N – 43.8°N)',
      soilTemp: '40°F – 50°F (Mid April–Mid May)',
      freezeThaw: 'Late February thaw; prime March sap window',
      window: 'Peak Awakening: Early March – Late May',
      maple: 'Mar 1 – Mar 28 (Sugarhouse festival peak)',
      amphibians: 'Early April peeper & wood frog choruses',
      morels: 'May 1 – May 18 (Hardwood ridges & old orchards)',
      wildflowers: 'Mid-April Dutchmans breeches to early May trilliums'
    },
    {
      lat: 44.5,
      name: 'Northern Lower Peninsula & 45th Parallel (43.9°N – 45.4°N)',
      soilTemp: '38°F – 48°F (Late April–Late May)',
      freezeThaw: 'Mid-March snowmelt; lake-buffered microclimates',
      window: 'Peak Awakening: Mid March – Early June',
      maple: 'Mar 15 – Apr 10 (Highland & coastal sugarbushes)',
      amphibians: 'Mid-to-late April vernal pool choruses',
      morels: 'May 8 – May 25 (Black morels under aspen & burns)',
      wildflowers: 'Early to mid-May carpet trilliums'
    },
    {
      lat: 46.5,
      name: 'Upper Peninsula & Keweenaw Spine (45.5°N – 47.4°N)',
      soilTemp: '36°F – 46°F (Early May–Early June)',
      freezeThaw: 'Deep winter snowpack insulates soil; thaw mid-April',
      window: 'Peak Awakening: Early April – Mid June',
      maple: 'Mar 25 – Apr 25 (Late U.P. snowbelt runs)',
      amphibians: 'Late April to early May freeze-thaw wood frogs',
      morels: 'May 18 – June 10 (U.P. black & white morels)',
      wildflowers: 'Mid-May to early June late-thaw carpets'
    }
  ];

  var PHENOLOGY_EVENTS = [
    { id: 'sugar-maple-sap-run', cat: 'maple', name: 'Sugar Maple Sap Run', latMin: 41.7, latMax: 47.4, peakMonth: 'March' },
    { id: 'vernal-pool-wood-frog', cat: 'vernal', name: 'Wood Frog & Peeper Choruses', latMin: 41.7, latMax: 47.4, peakMonth: 'April' },
    { id: 'spotted-salamander-big-night', cat: 'vernal', name: 'Salamander Big Night Migration', latMin: 41.7, latMax: 46.5, peakMonth: 'March/April' },
    { id: 'american-woodcock-sky-dance', cat: 'avian', name: 'Woodcock Twilight Sky Dance', latMin: 41.7, latMax: 47.4, peakMonth: 'April' },
    { id: 'wild-leek-ramps-emergence', cat: 'forage', name: 'Wild Leek (Ramp) Emergence', latMin: 41.7, latMax: 47.4, peakMonth: 'April/May' },
    { id: 'bloodroot-and-hepatica', cat: 'wildflower', name: 'Bloodroot & Sharp-Lobed Hepatica', latMin: 41.7, latMax: 47.0, peakMonth: 'April' },
    { id: 'dutchmans-breeches-and-squirrel-corn', cat: 'wildflower', name: 'Dutchman’s Breeches & Trout Lily', latMin: 41.7, latMax: 47.4, peakMonth: 'April/May' },
    { id: 'white-trillium-blankets', cat: 'wildflower', name: 'Great White Trillium Blankets', latMin: 41.7, latMax: 47.4, peakMonth: 'May' },
    { id: 'black-morel-flushes', cat: 'forage', name: 'Black Morel (Morchella angusticeps)', latMin: 43.5, latMax: 47.4, peakMonth: 'May' },
    { id: 'yellow-and-white-morels', cat: 'forage', name: 'Yellow & White Morel Peak (Morchella esculenta)', latMin: 41.7, latMax: 47.4, peakMonth: 'May' },
    { id: 'ostrich-fern-fiddleheads', cat: 'forage', name: 'Ostrich Fern Fiddleheads', latMin: 42.0, latMax: 47.4, peakMonth: 'May' },
    { id: 'spring-wildflower-canopy-closing', cat: 'wildflower', name: 'Canopy Closure & Spring Ephemeral Senescence', latMin: 41.7, latMax: 47.4, peakMonth: 'Late May' }
  ];

  var state = {
    selectedLat: 43.5,
    selectedCategory: 'all',
    selectedMonth: 'april'
  };

  function getZoneForLat(lat) {
    if (lat <= 42.5) return LAT_ZONES[0];
    if (lat <= 43.8) return LAT_ZONES[1];
    if (lat <= 45.4) return LAT_ZONES[2];
    return LAT_ZONES[3];
  }

  function updateScrubberDisplay() {
    var zone = getZoneForLat(state.selectedLat);
    var latValEl = document.getElementById('sp-lat-value');
    var zoneNameEl = document.getElementById('sp-zone-name');
    var zoneMetricsEl = document.getElementById('sp-zone-metrics');
    var mapleEl = document.getElementById('sp-item-maple');
    var vernalEl = document.getElementById('sp-item-vernal');
    var morelEl = document.getElementById('sp-item-morel');
    var flowerEl = document.getElementById('sp-item-flower');

    if (latValEl) latValEl.textContent = state.selectedLat.toFixed(1) + '°N Latitude';
    if (zoneNameEl) zoneNameEl.textContent = zone.name;
    if (zoneMetricsEl) zoneMetricsEl.textContent = 'Soil: ' + zone.soilTemp + ' · ' + zone.window;
    if (mapleEl) mapleEl.textContent = zone.maple;
    if (vernalEl) vernalEl.textContent = zone.amphibians;
    if (morelEl) morelEl.textContent = zone.morels;
    if (flowerEl) flowerEl.textContent = zone.wildflowers;
  }

  function initScrubber() {
    var slider = document.getElementById('sp-lat-slider');
    if (!slider) return;

    slider.addEventListener('input', function () {
      state.selectedLat = parseFloat(slider.value);
      updateScrubberDisplay();
      renderNotebook();
    });

    updateScrubberDisplay();
  }


  // The notebook is a seasonal index over the guide's existing editorial data.
  // No date chosen here is a real-time observation, forecast or access verdict.
  function notebookEntries(month, lat) {
    return PHENOLOGY_EVENTS.filter(function (event) {
      return event.peakMonth.toLowerCase().indexOf(month) !== -1 &&
        lat >= event.latMin && lat <= event.latMax;
    }).slice(0, 4);
  }

  function renderNotebook() {
    var notebook = document.getElementById('spring-field-notebook');
    if (!notebook) return;
    var zone = getZoneForLat(state.selectedLat);
    var label = zone.name.split(' (')[0];
    var monthNames = { march: 'March', april: 'April', may: 'May' };
    var titles = {
      march: 'Read the thaw before tapping',
      april: 'Listen for the first chorus',
      may: 'Walk the woodland bloom wave'
    };
    var cues = {
      march: zone.maple,
      april: zone.amphibians,
      may: zone.wildflowers + '. ' + zone.morels
    };
    var trackers = {
      march: { href: '/michigan-maple-sap-run/', label: 'Check the Maple Sap weather tool' },
      april: { href: 'https://phenology.chrisizworski.com/frog-chorus', label: 'Check the Frog Chorus tracker' },
      may: { href: 'https://phenology.chrisizworski.com/bloom-tracker', label: 'Check the Michigan Bloom Tracker' }
    };
    var month = state.selectedMonth;
    var setText = function (id, value) {
      var node = document.getElementById(id);
      if (node) node.textContent = value;
    };
    setText('sp-notebook-window', monthNames[month] + ' field notes · ' + label);
    setText('sp-notebook-title', titles[month]);
    setText('sp-notebook-cue', 'Typical regional window: ' + cues[month] +
      '. These clues can arrive earlier or later with the weather.');
    var list = document.getElementById('sp-notebook-chapters');
    if (list) {
      list.replaceChildren();
      var matches = notebookEntries(month, state.selectedLat);
      matches.forEach(function (event) {
        var li = document.createElement('li');
        var anchor = document.createElement('a');
        anchor.href = '#' + event.id;
        anchor.textContent = event.name;
        li.appendChild(anchor);
        list.appendChild(li);
      });
      if (!matches.length) {
        var li = document.createElement('li');
        li.textContent = 'No chapters are assigned to this month and latitude in the guide. Check local observations instead.';
        list.appendChild(li);
      }
    }
    var next = document.getElementById('sp-notebook-next');
    if (next) {
      next.href = trackers[month].href;
      next.textContent = trackers[month].label;
      if (trackers[month].href.startsWith('https://')) {
        next.target = '_blank';
        next.rel = 'noopener';
      } else {
        next.removeAttribute('target');
        next.removeAttribute('rel');
      }
    }
    notebook.querySelectorAll('[data-sp-month]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-sp-month') === month));
    });
    var select = document.getElementById('sp-notebook-region');
    if (select) {
      var allZones = ['42.1', '43.5', '44.8', '46.4'];
      var zoneIndex = LAT_ZONES.indexOf(zone);
      select.value = allZones[zoneIndex];
    }
  }

  function initNotebook() {
    var notebook = document.getElementById('spring-field-notebook');
    if (!notebook) return;
    notebook.querySelectorAll('[data-sp-month]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.selectedMonth = button.getAttribute('data-sp-month');
        renderNotebook();
      });
    });
    var select = document.getElementById('sp-notebook-region');
    if (select) select.addEventListener('change', function () {
      state.selectedLat = Number(select.value);
      var slider = document.getElementById('sp-lat-slider');
      if (slider) slider.value = String(state.selectedLat);
      updateScrubberDisplay();
      renderNotebook();
    });
    var chapters = document.getElementById('sp-notebook-chapters');
    if (chapters) chapters.addEventListener('click', function (event) {
      if (!event.target.closest('a[href^="#"]')) return;
      // Links must not lead to a chapter hidden by the unrelated category filter.
      var all = document.querySelector('[data-pheno-filter="all"]');
      if (all && state.selectedCategory !== 'all') all.click();
    });
    renderNotebook();
  }

  function initCategoryFilters() {
    var buttons = document.querySelectorAll('[data-pheno-filter]');
    var cards = document.querySelectorAll('.wf-story[data-pheno-cat]');
    var countEl = document.getElementById('sp-visible-count');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        state.selectedCategory = btn.getAttribute('data-pheno-filter');

        var visibleCount = 0;
        cards.forEach(function (card) {
          var cat = card.getAttribute('data-pheno-cat');
          var isMatch = state.selectedCategory === 'all' || cat === state.selectedCategory;
          card.style.display = isMatch ? '' : 'none';
          if (isMatch) visibleCount++;
        });

        if (countEl) {
          countEl.textContent = 'Showing ' + visibleCount + ' of 12 spring phenological chapters';
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initScrubber();
    initCategoryFilters();
    initNotebook();
  });
})();
