/**
 * CHRISIZWORSKI.COM — Interactive Great Lakes Living Atlas & Command Desk
 * Progressive enhancement over 100% static semantic HTML.
 * Zero external framework dependencies; preserves 100% DOM crawlability for Googlebot.
 */
(function () {
  'use strict';

  var ATLAS_REGIONS = {
    'keweenaw-western-up': {
      kicker: 'Lake Superior Snowbelt · Western U.P.',
      title: 'Keweenaw, Houghton & Porcupine Mountains',
      desc: '200+ inch Lake Superior snowbelt, Copper Harbor dark-sky aurora horizons, Bond Falls rim ice, and Western U.P. backcountry trails.',
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
      links: [
        { label: 'Border Wait Times Live ↗', href: '/michigan-border-wait-times/' },
        { label: 'Michigan Birding Report ↗', href: 'https://michiganbirdingreport.com' },
        { label: 'Freighter View Farms ↗', href: 'https://freighterviewfarms.com' },
        { label: 'Great Lakes Ship Tracker ↗', href: '/great-lakes-freighter-tracking/' }
      ]
    }
  };

  var DEFAULT_ATLAS = {
    kicker: 'Interactive Great Lakes & Michigan Living Atlas',
    title: 'Select a region on the map or pills below',
    desc: 'Click or hover any of the 6 Michigan & Great Lakes corridors to spotlight matching live telemetry tools, seasonal field guides, and daily reports.',
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

  function initLivingAtlas() {
    var svgRegions = document.querySelectorAll('[data-atlas-region]');
    var regionPills = document.querySelectorAll('[data-atlas-pill]');
    var resetBtn = document.getElementById('atlas-reset-btn');
    var activeRegion = null;

    function selectRegion(regionId) {
      activeRegion = regionId;
      for (var i = 0; i < svgRegions.length; i++) {
        var r = svgRegions[i];
        var isMatch = r.getAttribute('data-atlas-region') === regionId;
        if (isMatch) r.classList.add('is-active');
        else r.classList.remove('is-active');
      }
      for (var j = 0; j < regionPills.length; j++) {
        var p = regionPills[j];
        var pillMatch = p.getAttribute('data-atlas-pill') === regionId;
        p.setAttribute('aria-pressed', pillMatch ? 'true' : 'false');
      }

      if (!regionId || !ATLAS_REGIONS[regionId]) {
        updateReadout(DEFAULT_ATLAS);
        applyCardSpotlight(null, 'Showing all Michigan, Great Lakes & U.S. tools and field guides');
        return;
      }

      var info = ATLAS_REGIONS[regionId];
      updateReadout(info);
      applyCardSpotlight(function (card) {
        var regions = (card.getAttribute('data-regions') || '').split(/\s+/);
        return regions.indexOf(regionId) !== -1 || regions.indexOf('all-mi') !== -1;
      }, 'Spotlighted ' + info.title);
    }

    for (var i = 0; i < svgRegions.length; i++) {
      (function (el) {
        var id = el.getAttribute('data-atlas-region');
        el.addEventListener('click', function () {
          selectRegion(activeRegion === id ? null : id);
        });
        el.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            selectRegion(activeRegion === id ? null : id);
          }
        });
      })(svgRegions[i]);
    }

    for (var j = 0; j < regionPills.length; j++) {
      (function (btn) {
        var id = btn.getAttribute('data-atlas-pill');
        btn.addEventListener('click', function () {
          selectRegion(activeRegion === id ? null : id);
        });
      })(regionPills[j]);
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        selectRegion(null);
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
