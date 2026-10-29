/**
 * CHRISIZWORSKI.COM — Interactive Great Lakes Living Atlas & Command Desk
 * Real Leaflet + CARTO Voyager / OpenStreetMap cartography + progressive enhancement
 * over 100% static semantic HTML. Preserves 100% DOM crawlability for Googlebot.
 */
(function () {
  'use strict';

  var ATLAS_REGIONS = {
    'keweenaw-western-up': {
      kicker: 'Lake Superior Snowbelt · Western U.P.',
      title: 'Keweenaw, Houghton & Porcupine Mountains',
      desc: '200+ inch Lake Superior snowbelt, Copper Harbor dark-sky aurora horizons, Bond Falls rim ice, and Western U.P. backcountry trails.',
      center: [47.12, -88.65],
      zoom: 7,
      links: [
        { label: 'Winter Weekends ↗', href: '/michigan-winter-weekends/' },
        { label: 'First Snow Guide ↗', href: '/michigan-first-snow-adventures/' },
        { label: 'Northern Lights Live ↗', href: '/northern-lights-michigan/' },
        { label: 'Snow Depth Map ↗', href: '/michigan-snow-depth/' }
      ]
    },
    'pictured-rocks-central-up': {
      kicker: 'Sandstone Ice Curtains & Boreal Falls · Central/East U.P.',
      title: 'Munising, Pictured Rocks, Marquette & Tahquamenon',
      desc: 'Sandstone ice curtains in Munising, Marquette ore dock freighters, Eben Ice Caves, and cedar-amber winter flow at Upper Tahquamenon Falls.',
      center: [46.48, -86.35],
      zoom: 7,
      links: [
        { label: 'Frozen Michigan ↗', href: '/frozen-michigan/' },
        { label: 'Pictured Rocks Planner ↗', href: 'https://picturedrocks.chrisizworski.com' },
        { label: 'Ice Caves Tool ↗', href: '/michigan-ice-caves/' },
        { label: 'Winter Trails ↗', href: '/michigan-winter-trails/' }
      ]
    },
    'straits-mackinac-soo': {
      kicker: 'Maritime Chokepoints & Crossings · The Straits & St. Marys River',
      title: 'Mackinac Bridge, Soo Locks & Headlands Dark Sky',
      desc: 'Live Mackinac Bridge wind & escort status, 1,000-footers transiting the Poe Lock at Sault Ste. Marie, and Straits ice & dark skies.',
      center: [46.15, -84.55],
      zoom: 8,
      links: [
        { label: 'Mackinac Bridge Live ↗', href: '/mackinac-bridge-live/' },
        { label: 'Soo Locks Live Map ↗', href: '/soo-locks/' },
        { label: 'Winter Freighter Guide ↗', href: '/great-lakes-winter-freighter-guide/' },
        { label: 'White Christmas Escapes ↗', href: '/michigan-white-christmas-escapes/' }
      ]
    },
    'traverse-leelanau-nw': {
      kicker: '45th Parallel Coastal Bluffs & Vineyards · Northwest Lower',
      title: 'Traverse City, Sleeping Bear, Petoskey & Leelanau',
      desc: 'Sleeping Bear winter bluffs, Vasa Nordic trails, Little Traverse ski valleys, and 27 winery, cidery & distillery tasting rooms.',
      center: [45.02, -85.52],
      zoom: 8,
      links: [
        { label: 'Wine, Cider & Spirits ↗', href: '/michigan-wine-cider-spirits/' },
        { label: 'Winter Activities ↗', href: '/michigan-winter-activities/' },
        { label: 'Late Fall Adventures ↗', href: '/michigan-late-fall-adventures/' },
        { label: 'Lake-Effect Snow ↗', href: '/lake-effect-snow/' }
      ]
    },
    'high-country-ausable': {
      kicker: 'Coldwater Rivers & Old-Growth Pines · Northern Interior',
      title: 'Au Sable, Manistee, Pere Marquette & Grayling',
      desc: '91 live USGS trout stream gauges, Hartwick Pines old-growth snowshoe loops, Hanson Hills XC grooming, and Houghton Lake ice.',
      center: [44.52, -84.95],
      zoom: 8,
      links: [
        { label: 'Michigan Trout Report ↗', href: 'https://michigantroutreport.com' },
        { label: 'Cross-Country Skiing ↗', href: '/michigan-cross-country-skiing/' },
        { label: 'Michigan Ice Report ↗', href: '/michigan-ice/' },
        { label: 'Snowmobile Corridors ↗', href: '/snowmobile/' }
      ]
    },
    'saginaw-detroit-shore': {
      kicker: 'Bay City Home Desk · Saginaw Bay, Port Huron & Detroit River',
      title: 'Saginaw Bay, Freighter View Farms & Border Crossings',
      desc: 'Home of Freighter View Farms in Bay City, Saginaw Bay birding flyways, Detroit/Windsor & Blue Water bridge waits, and Lake Huron freighters.',
      center: [43.15, -83.35],
      zoom: 7,
      links: [
        { label: 'Border Wait Times Live ↗', href: '/michigan-border-wait-times/' },
        { label: 'Michigan Birding Report ↗', href: 'https://michiganbirdingreport.com' },
        { label: 'Freighter View Farms ↗', href: 'https://freighterviewfarms.com' },
        { label: 'Great Lakes Ship Tracker ↗', href: '/great-lakes-freighter-tracking/' }
      ]
    }
  };

  var ATLAS_PINS = [
    {
      id: 'copper-harbor',
      region: 'keweenaw-western-up',
      lat: 47.468,
      lng: -87.890,
      name: 'Keweenaw & Copper Harbor',
      summary: 'Deepest Lake Superior snowbelt (200+ in/yr) & northern horizon aurora viewing.',
      links: [
        { label: 'Northern Lights Live', href: '/northern-lights-michigan/' },
        { label: 'First Snow Guide', href: '/michigan-first-snow-adventures/' }
      ]
    },
    {
      id: 'porcupine-mountains',
      region: 'keweenaw-western-up',
      lat: 46.772,
      lng: -89.754,
      name: 'Porcupine Mountains & Bond Falls',
      summary: 'Wilderness snowshoe trails, natural-snow ski hill & Western U.P. rim-iced cascades.',
      links: [
        { label: 'Winter Weekends', href: '/michigan-winter-weekends/' },
        { label: 'Snow Depth Map', href: '/michigan-snow-depth/' }
      ]
    },
    {
      id: 'marquette-harbor',
      region: 'pictured-rocks-central-up',
      lat: 46.547,
      lng: -87.395,
      name: 'Marquette & Presque Isle',
      summary: 'Upper Harbor ore dock freighters, Noquemanon Nordic trails & Superior gales.',
      links: [
        { label: 'Winter Freighter Guide', href: '/great-lakes-winter-freighter-guide/' },
        { label: 'Winter Trails Guide', href: '/michigan-winter-trails/' }
      ]
    },
    {
      id: 'munising-pictured-rocks',
      region: 'pictured-rocks-central-up',
      lat: 46.418,
      lng: -86.647,
      name: 'Munising & Pictured Rocks',
      summary: 'Sandstone ice curtains, Eben Ice Caves, Valley Spur XC & hemlock snowshoe loops.',
      links: [
        { label: 'Frozen Michigan', href: '/frozen-michigan/' },
        { label: 'Pictured Rocks Planner', href: 'https://picturedrocks.chrisizworski.com' }
      ]
    },
    {
      id: 'tahquamenon-whitefish',
      region: 'pictured-rocks-central-up',
      lat: 46.577,
      lng: -85.255,
      name: 'Tahquamenon Falls & Whitefish Point',
      summary: 'Cedar-amber winter waterfall flow, boreal snowbelt & Lake Superior shipwreck coast.',
      links: [
        { label: 'Winter Weekends', href: '/michigan-winter-weekends/' },
        { label: 'Late Fall Adventures', href: '/michigan-late-fall-adventures/' }
      ]
    },
    {
      id: 'soo-locks',
      region: 'straits-mackinac-soo',
      lat: 46.503,
      lng: -84.355,
      name: 'Sault Ste. Marie & Soo Locks',
      summary: 'Live AIS vessel passages at the Poe Lock, winter fleet rush & Jan 15 closure.',
      links: [
        { label: 'Soo Locks Live Map', href: '/soo-locks/' },
        { label: 'Winter Freighters', href: '/great-lakes-winter-freighter-guide/' }
      ]
    },
    {
      id: 'mackinac-straits',
      region: 'straits-mackinac-soo',
      lat: 45.817,
      lng: -84.728,
      name: 'Mackinac Bridge & Headlands Dark Sky',
      summary: 'Official bridge wind & escort alerts, Straits ice formations & International Dark Sky Park.',
      links: [
        { label: 'Mackinac Bridge Live', href: '/mackinac-bridge-live/' },
        { label: 'Northern Lights Live', href: '/northern-lights-michigan/' }
      ]
    },
    {
      id: 'petoskey-charlevoix',
      region: 'traverse-leelanau-nw',
      lat: 45.373,
      lng: -84.955,
      name: 'Petoskey, Harbor Springs & Charlevoix',
      summary: 'Little Traverse ski valleys, Lake Michigan pier ice & Tip of the Mitt wineries.',
      links: [
        { label: 'Wine, Cider & Spirits', href: '/michigan-wine-cider-spirits/' },
        { label: 'White Christmas Escapes', href: '/michigan-white-christmas-escapes/' }
      ]
    },
    {
      id: 'traverse-sleeping-bear',
      region: 'traverse-leelanau-nw',
      lat: 44.763,
      lng: -85.621,
      name: 'Traverse City, Old Mission & Sleeping Bear',
      summary: 'Old Mission & Leelanau tasting loops, Vasa Nordic trails & Sleeping Bear winter bluffs.',
      links: [
        { label: 'Wine, Cider & Spirits', href: '/michigan-wine-cider-spirits/' },
        { label: 'Winter Activities', href: '/michigan-winter-activities/' }
      ]
    },
    {
      id: 'grayling-ausable',
      region: 'high-country-ausable',
      lat: 44.661,
      lng: -84.715,
      name: 'Grayling, Au Sable River & Hartwick Pines',
      summary: '8 USGS Au Sable gauges, old-growth white pines, Hanson Hills XC & Houghton Lake ice.',
      links: [
        { label: 'Michigan Trout Report', href: 'https://michigantroutreport.com' },
        { label: 'Cross-Country Skiing', href: '/michigan-cross-country-skiing/' }
      ]
    },
    {
      id: 'manistee-pere-marquette',
      region: 'high-country-ausable',
      lat: 44.244,
      lng: -85.922,
      name: 'Manistee & Pere Marquette Rivers',
      summary: 'Year-round coldwater trout streams, North Country Trail bluffs & paddling access.',
      links: [
        { label: 'Michigan Paddling', href: '/michigan-paddling/' },
        { label: 'Michigan Trout Daily', href: 'https://daily.michigantroutreport.com' }
      ]
    },
    {
      id: 'bay-city-saginaw-bay',
      region: 'saginaw-detroit-shore',
      lat: 43.626,
      lng: -83.887,
      isHome: true,
      name: 'Bay City & Saginaw Bay (Home Desk)',
      summary: 'Home of Chris Izworski & Freighter View Farms, Saginaw Bay birding flyways & ice report.',
      links: [
        { label: 'Freighter View Farms', href: 'https://freighterviewfarms.com' },
        { label: 'Michigan Birding Report', href: 'https://michiganbirdingreport.com' }
      ]
    },
    {
      id: 'port-huron-blue-water',
      region: 'saginaw-detroit-shore',
      lat: 42.998,
      lng: -82.424,
      name: 'Port Huron & Blue Water Bridge',
      summary: 'Live Canada–U.S. Blue Water Bridge wait times & Lake Huron–St. Clair River ship channel.',
      links: [
        { label: 'Border Wait Times', href: '/michigan-border-wait-times/' },
        { label: 'Ship Tracker Live', href: '/great-lakes-freighter-tracking/' }
      ]
    },
    {
      id: 'detroit-river-borders',
      region: 'saginaw-detroit-shore',
      lat: 42.336,
      lng: -82.985,
      name: 'Detroit Riverfront, Belle Isle & Crossings',
      summary: 'Ambassador Bridge, Gordie Howe Bridge & Windsor Tunnel waits plus Detroit River AIS traffic.',
      links: [
        { label: 'Border Wait Times', href: '/michigan-border-wait-times/' },
        { label: 'Great Lakes Gazette', href: 'https://gazette.chrisizworski.com' }
      ]
    }
  ];

  var DEFAULT_ATLAS = {
    kicker: 'Interactive Great Lakes & Michigan Living Atlas',
    title: 'Click any map pin or corridor pill below',
    desc: 'Explore 14 Michigan & Great Lakes field stations on the interactive map—or select a corridor below to fly to that region and spotlight its live tools and field guides.',
    links: [
      { label: 'All 45+ Free Tools ↗', href: '/tools/' },
      { label: 'Michigan Adventure Finder ↗', href: '/michigan-destinations/' },
      { label: 'U.S. National Tools ↗', href: '/national-tools/' },
      { label: 'Great Lakes Gazette ↗', href: 'https://gazette.chrisizworski.com' }
    ]
  };

  function updateReadout(data) {
    var kickerEl = document.getElementById('atlas-readout-kicker');
    var titleEl = document.getElementById('atlas-readout-title');
    var descEl = document.getElementById('atlas-readout-desc');
    var linksEl = document.getElementById('atlas-readout-links');
    if (!kickerEl || !titleEl || !descEl || !linksEl) return;

    kickerEl.textContent = data.kicker;
    titleEl.textContent = data.title;
    descEl.textContent = data.desc;

    while (linksEl.firstChild) {
      linksEl.removeChild(linksEl.firstChild);
    }
    for (var i = 0; i < data.links.length; i++) {
      var item = data.links[i];
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      if (item.href.indexOf('http') === 0) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
      linksEl.appendChild(a);
    }
  }

  function announceStatus(message) {
    var statusEl = document.getElementById('atlas-live-status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  function applyCardSpotlight(predicate, statusLabel) {
    var cards = document.querySelectorAll('[data-filter-item]');
    var matchCount = 0;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (!predicate) {
        card.removeAttribute('data-dimmed');
        card.removeAttribute('data-highlighted');
        matchCount++;
      } else if (predicate(card)) {
        card.removeAttribute('data-dimmed');
        card.setAttribute('data-highlighted', 'true');
        matchCount++;
      } else {
        card.removeAttribute('data-highlighted');
        card.setAttribute('data-dimmed', 'true');
      }
    }
    if (statusLabel) {
      announceStatus(statusLabel + ' (' + matchCount + ' highlighted across page)');
    }
  }

  function buildPopupNode(pin) {
    var wrap = document.createElement('div');
    wrap.className = 'hm-map-popup';
    var h4 = document.createElement('h4');
    h4.textContent = pin.name;
    var p = document.createElement('p');
    p.textContent = pin.summary;
    var linksWrap = document.createElement('div');
    linksWrap.className = 'hm-map-popup__links';
    for (var i = 0; i < pin.links.length; i++) {
      var lnk = pin.links[i];
      var a = document.createElement('a');
      a.href = lnk.href;
      a.textContent = lnk.label + ' →';
      if (lnk.href.indexOf('http') === 0) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
      linksWrap.appendChild(a);
    }
    wrap.appendChild(h4);
    wrap.appendChild(p);
    wrap.appendChild(linksWrap);
    return wrap;
  }

  function initLivingAtlas() {
    var mapEl = document.getElementById('living-atlas-map');
    var mapMsg = document.getElementById('atlas-map-status');
    var regionPills = document.querySelectorAll('[data-atlas-pill]');
    var resetBtn = document.getElementById('atlas-reset-btn');
    var activeRegion = null;
    var leafletMap = null;
    var markerByRegion = {};

    function setMapMessage(msg) {
      if (mapMsg) mapMsg.textContent = msg;
    }

    function addTiles(url, isFallback) {
      if (!leafletMap) return;
      if (leafletMap._atlasTileLayer) leafletMap.removeLayer(leafletMap._atlasTileLayer);
      var layer = window.L.tileLayer(url, {
        attribution: isFallback
          ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          : '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18,
        subdomains: 'abcd'
      });
      leafletMap._atlasTileLayer = layer;
      var errCount = 0;
      var loaded = false;
      layer.on('tileload', function () {
        if (loaded || leafletMap._atlasTileLayer !== layer) return;
        loaded = true;
        setMapMessage(isFallback
          ? 'Interactive OpenStreetMap loaded · Click any Michigan or Great Lakes pin'
          : 'Interactive CARTO map loaded · 14 Great Lakes & Michigan stations active');
      });
      layer.on('tileerror', function () {
        if (leafletMap._atlasTileLayer !== layer) return;
        if (++errCount >= 2 && !isFallback) {
          addTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png', true);
        }
      });
      layer.addTo(leafletMap);
    }

    function connectCartoTiles() {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (controller) controller.abort();
      }, 5000);
      fetch('/api/carto-basemap-config', {
        method: 'GET',
        credentials: 'same-origin',
        signal: controller ? controller.signal : undefined
      })
        .then(function (res) {
          if (!res.ok) throw new Error('CARTO config unavailable');
          return res.json();
        })
        .then(function (cfg) {
          if (!cfg || !cfg.key || !cfg.key.trim()) throw new Error('No key');
          var url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(cfg.key.trim());
          addTiles(url, false);
        })
        .catch(function () {
          addTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png', true);
        })
        .finally(function () {
          clearTimeout(timer);
        });
    }

    function selectRegion(regionId, shouldFly) {
      activeRegion = regionId;
      for (var j = 0; j < regionPills.length; j++) {
        var p = regionPills[j];
        var pillMatch = p.getAttribute('data-atlas-pill') === regionId;
        p.setAttribute('aria-pressed', pillMatch ? 'true' : 'false');
      }

      if (!regionId || !ATLAS_REGIONS[regionId]) {
        updateReadout(DEFAULT_ATLAS);
        applyCardSpotlight(null, 'Showing all Michigan, Great Lakes & U.S. tools and field guides');
        if (leafletMap && shouldFly !== false) {
          leafletMap.closePopup();
          leafletMap.setView([44.85, -85.45], 6);
        }
        return;
      }

      var info = ATLAS_REGIONS[regionId];
      updateReadout(info);
      applyCardSpotlight(function (card) {
        var regions = (card.getAttribute('data-regions') || '').split(/\s+/);
        return regions.indexOf(regionId) !== -1 || regions.indexOf('all-mi') !== -1;
      }, 'Spotlighted ' + info.title);

      if (leafletMap && shouldFly !== false && info.center) {
        leafletMap.setView(info.center, info.zoom || 7, { animate: true });
        if (markerByRegion[regionId]) {
          markerByRegion[regionId].openPopup();
        }
      }
    }

    if (window.L && mapEl) {
      try {
        mapEl.textContent = '';
        leafletMap = window.L.map(mapEl, {
          scrollWheelZoom: false,
          zoomControl: true
        }).setView([44.85, -85.45], 6);

        if (typeof ResizeObserver !== 'undefined') {
          var ro = new ResizeObserver(function () {
            if (leafletMap) leafletMap.invalidateSize({ pan: false });
          });
          ro.observe(mapEl);
        }

        connectCartoTiles();

        for (var i = 0; i < ATLAS_PINS.length; i++) {
          (function (pin) {
            var pinClass = pin.isHome ? 'hm-map-pin hm-map-pin--home' : 'hm-map-pin';
            var icon = window.L.divIcon({
              className: '',
              html: '<span class="' + pinClass + '" title="' + pin.name + '"></span>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            var marker = window.L.marker([pin.lat, pin.lng], {
              icon: icon,
              title: pin.name
            })
              .bindPopup(buildPopupNode(pin))
              .addTo(leafletMap);

            if (!markerByRegion[pin.region]) {
              markerByRegion[pin.region] = marker;
            }

            marker.on('click', function () {
              selectRegion(pin.region, false);
            });
          })(ATLAS_PINS[i]);
        }
      } catch (_err) {
        setMapMessage('Use the 6 regional corridor pills below to filter Michigan & Great Lakes tools.');
      }
    }

    for (var j = 0; j < regionPills.length; j++) {
      (function (btn) {
        var id = btn.getAttribute('data-atlas-pill');
        btn.addEventListener('click', function () {
          selectRegion(activeRegion === id ? null : id, true);
        });
      })(regionPills[j]);
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        selectRegion(null, true);
        var intentBtns = document.querySelectorAll('[data-intent-filter]');
        for (var k = 0; k < intentBtns.length; k++) {
          intentBtns[k].setAttribute('aria-pressed', intentBtns[k].getAttribute('data-intent-filter') === 'all' ? 'true' : 'false');
        }
      });
    }
  }

  function initIntentSwitcher() {
    var buttons = document.querySelectorAll('[data-intent-filter]');
    if (!buttons.length) return;

    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var intent = btn.getAttribute('data-intent-filter');
          for (var j = 0; j < buttons.length; j++) {
            buttons[j].setAttribute('aria-pressed', buttons[j] === btn ? 'true' : 'false');
          }
          if (!intent || intent === 'all') {
            applyCardSpotlight(null, 'Showing all flagship tools, field guides, and publications');
            return;
          }
          applyCardSpotlight(function (card) {
            var tags = (card.getAttribute('data-intents') || '').split(/\s+/);
            return tags.indexOf(intent) !== -1;
          }, 'Filtered by ' + btn.textContent.trim());
        });
      })(buttons[i]);
    }
  }

  function initDossierTabs() {
    var tabs = document.querySelectorAll('[data-dossier-tab]');
    var blocks = document.querySelectorAll('[data-dossier-chapter]');
    if (!tabs.length || !blocks.length) return;

    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener('click', function () {
          var target = tab.getAttribute('data-dossier-tab');
          for (var j = 0; j < tabs.length; j++) {
            tabs[j].setAttribute('aria-pressed', tabs[j] === tab ? 'true' : 'false');
          }
          for (var k = 0; k < blocks.length; k++) {
            var block = blocks[k];
            var chap = block.getAttribute('data-dossier-chapter');
            if (!target || target === 'all') {
              block.removeAttribute('data-dimmed');
              block.removeAttribute('data-highlighted');
            } else if (chap === target) {
              block.removeAttribute('data-dimmed');
              block.setAttribute('data-highlighted', 'true');
            } else {
              block.removeAttribute('data-highlighted');
              block.setAttribute('data-dimmed', 'true');
            }
          }
          announceStatus('Dossier focused on: ' + tab.textContent.trim());
        });
      })(tabs[i]);
    }
  }

  function initSeasonalPulse() {
    var badgeEl = document.getElementById('hm-seasonal-telemetry');
    if (!badgeEl) return;
    try {
      var now = new Date();
      var month = now.getMonth() + 1;
      var seasonLabel = 'Great Lakes Seasonal Desk · Bay City, MI';
      if (month >= 10 || month <= 3) {
        seasonLabel = 'Late Fall & Winter Snowbelt Desk · Soo Locks, Ice, Aurora & 9 Field Guides Active';
      } else if (month >= 4 && month <= 5) {
        seasonLabel = 'Spring Ice-Out, Trout Opener & Migration Desk · 91 USGS Gauges & eBird Live';
      } else {
        seasonLabel = 'Great Lakes Maritime, Beaches, Buoys & Paddling Desk · 100+ NOAA Stations Live';
      }
      badgeEl.textContent = seasonLabel;
    } catch (_e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initLivingAtlas();
      initIntentSwitcher();
      initDossierTabs();
      initSeasonalPulse();
    });
  } else {
    initLivingAtlas();
    initIntentSwitcher();
    initDossierTabs();
    initSeasonalPulse();
  }
})();
