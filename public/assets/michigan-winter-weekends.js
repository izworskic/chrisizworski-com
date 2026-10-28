/* FIELD_GUIDE_V1 · Michigan Winter Weekend Getaways Flagship Logic */
(() => {
  'use strict';

  function revealPhotoFallback(im) {
    const fig = im.closest('.wf-photo, .wkd-door-photo');
    if (!fig || fig.dataset.mediaStatus === 'fallback') return;
    fig.dataset.mediaStatus = 'fallback';
    im.hidden = true;
    im.setAttribute('aria-hidden', 'true');
    let panel = fig.querySelector('.wf-photo-unavailable');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'wf-photo-unavailable';
      const label = document.createElement('span');
      label.className = 'wf-photo-unavailable-kicker';
      label.textContent = 'FIELD NOTE / IMAGE UNAVAILABLE';
      const title = document.createElement('strong');
      title.textContent =
        fig.closest('.wf-story, .wkd-door-card')?.querySelector('h3')?.textContent ||
        'Michigan winter weekend';
      const explanation = document.createElement('span');
      explanation.textContent =
        'The source photograph could not load. The weekend routing notes, official sources and live tool links below remain available.';
      panel.append(label, title, explanation);
      fig.insertBefore(panel, fig.firstChild);
    }
    panel.hidden = false;
  }

  for (const im of document.querySelectorAll('.wf-photo img, .wkd-door-photo img')) {
    let fallbackAttempted = false;
    const fail = () => {
      if (!fallbackAttempted && im.dataset.fallbackSrc) {
        fallbackAttempted = true;
        im.dataset.fallbackUsed = 'yes';
        im.src = im.dataset.fallbackSrc;
        return;
      }
      revealPhotoFallback(im);
    };
    im.addEventListener('error', fail);
    if (im.complete && im.naturalWidth === 0) fail();
  }

  /* Interactive Weekend Architecture Blueprint */
  const BLUEPRINTS = {
    anchor: {
      kicker: 'PRINCIPLE 01 · THE SATURDAY HEADLINE',
      title: 'Anchor Saturday morning on your most weather-sensitive outdoor goal',
      copy:
        'Great Lakes winter weather changes fastest near the shoreline. Schedule your primary outdoor objective—walking to the Sand Point ice curtains in Munising, snowshoeing the 1.6-mile Green Loop at Lower Tahquamenon, or skiing the Vasa Pathway—for Saturday morning between 9:30 AM and 1:30 PM when wind and visibility are easiest to judge.',
      rule:
        'Field rule: Check the destination’s primary condition tool on Friday evening and again Saturday at breakfast before leaving your base town.',
      links: [
        { label: 'Michigan Snow Depth Map ↗', href: '/michigan-snow-depth/' },
        { label: 'Michigan Winter Trails ↗', href: '/michigan-winter-trails/' },
        { label: 'Frozen Michigan Atlas ↗', href: '/frozen-michigan/' },
      ],
    },
    backup: {
      kicker: 'PRINCIPLE 02 · THE THAW & GALE BACKUP',
      title: 'Never book a winter base town that only works in one kind of weather',
      copy:
        'If a 38°F rain-snow mix softens ski tracks or a 35-knot Lake Superior gale closes exposed shore overlooks, your weekend shouldn’t collapse. Every base town in this guide pairs an exposed outdoor headline with an inland forest fallback or an indoor cultural/tasting route—such as Old Mission heated vineyard igloos, Marquette’s Lower Harbor & museums, or the Soo Locks observation platform.',
      rule:
        'Field rule: Before booking lodging, confirm both your outdoor Saturday route and a sheltered Sunday backup within 20 minutes of town.',
      links: [
        { label: 'MI Wine, Cider & Spirits Guide ↗', href: '/michigan-wine-cider-spirits/' },
        { label: 'Michigan Ski Hills Comparison ↗', href: '/michigan-ski-hills/' },
        { label: 'Michigan Winter Activities ↗', href: '/michigan-winter-activities/' },
      ],
    },
    daylight: {
      kicker: 'PRINCIPLE 03 · WINTER ROADS & 4:45 PM DUSK',
      title: 'Summer scenic drives become unplowed snowmobile corridors in winter',
      copy:
        'From November through February, northern Michigan sunset arrives between 4:45 PM and 5:30 PM, and several famous summer roads close to wheeled vehicles: M-107 to Lake of the Clouds and South Boundary Road in the Porcupine Mountains, Pierce Stocking Scenic Drive at Sleeping Bear, and the unmaintained 4–5 mile River Trail between Upper and Lower Tahquamenon Falls.',
      rule:
        'Field rule: Never follow a summer GPS shortcut onto seasonal forest roads; use MDOT MiDrive and each park’s official winter access page.',
      links: [
        { label: 'Lake-Effect Snow Engine ↗', href: '/lake-effect-snow/' },
        { label: 'Mackinac Bridge Live Conditions ↗', href: '/mackinac-bridge-live/' },
        { label: 'Official MDOT MiDrive Map ↗', href: 'https://mdotjboss.state.mi.us/MiDrive/map' },
      ],
    },
    tools: {
      kicker: 'PRINCIPLE 04 · THE 48-HOUR EVIDENCE CHECK',
      title: 'Let inspirations guide where you book; let live data guide where you drive',
      copy:
        'Photographs show what a landscape can look like in a strong winter, never what is formed or open today. Forty-eight hours before departure, pair our NOHRSC ground snow-depth map with NWS hourly lake-effect advisories, ice-formation reports, and dark-sky cloud cover so your gear—snowshoes, microspikes, or binoculars—matches the actual weekend.',
      rule:
        'Field rule: Historical odds and archival photos are for trip inspiration. Never walk on lake or river ice or assume a trailhead lot is plowed.',
      links: [
        { label: 'Michigan Ice Caves Tool ↗', href: '/michigan-ice-caves/' },
        { label: 'Northern Lights Michigan ↗', href: '/northern-lights-michigan/' },
        { label: 'Winter Freighter Layup Tracker ↗', href: '/great-lakes-freighter-winter-layup/' },
      ],
    },
  };

  const bpButtons = [...document.querySelectorAll('[data-blueprint]')];
  const bpKicker = document.getElementById('wkd-bp-kicker');
  const bpTitle = document.getElementById('wkd-bp-title');
  const bpCopy = document.getElementById('wkd-bp-copy');
  const bpRule = document.getElementById('wkd-bp-rule');
  const bpLinks = document.getElementById('wkd-bp-links');

  bpButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.blueprint;
      const data = BLUEPRINTS[key];
      if (!data) return;
      bpButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      if (bpKicker) bpKicker.textContent = data.kicker;
      if (bpTitle) bpTitle.textContent = data.title;
      if (bpCopy) bpCopy.textContent = data.copy;
      if (bpRule) bpRule.textContent = data.rule;
      if (bpLinks) {
        bpLinks.innerHTML = data.links
          .map(
            (l) =>
              `<a href="${l.href}"${l.href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''}>${l.label}</a>`
          )
          .join('');
      }
    });
  });

  /* Synchronized 4 Doors + Experience Chips + Region/Window/Drive Filters + Leaflet Map */
  const stories = [...document.querySelectorAll('.wf-story')];
  if (!stories.length) return;

  const doorCards = [...document.querySelectorAll('.wkd-door-card')];
  const chips = [...document.querySelectorAll('.wf-chip')];
  const windowSel = document.getElementById('wf-window');
  const regionSel = document.getElementById('wf-region');
  const driveSel = document.getElementById('wf-drive');
  const countNode = document.getElementById('wf-count');
  const emptyNode = document.getElementById('wf-empty');
  const mapNode = document.getElementById('wf-map');
  const statusNode = document.getElementById('wf-map-message');

  let activeTag = 'all';
  let map = null;
  let markers = [];
  let tiles = null;
  let userZoomed = false;
  let fitOnce = false;

  const setStatus = (msg, state) => {
    if (!statusNode) return;
    statusNode.textContent = msg;
    statusNode.dataset.state = state || '';
  };

  const shownStories = () => stories.filter((c) => !c.hidden);

  function syncDoorsAndChips() {
    for (const b of chips) {
      b.setAttribute('aria-pressed', String(b.dataset.tag === activeTag));
    }
    for (const d of doorCards) {
      const isSelected = d.dataset.door === activeTag;
      d.dataset.active = String(isSelected);
      const btn = d.querySelector('.wkd-door-trigger');
      if (btn) {
        btn.setAttribute('aria-pressed', String(isSelected));
        const span = btn.querySelector('span');
        if (span) {
          span.textContent = isSelected ? 'Showing matching weekends ↓' : 'Filter weekend bases ↓';
        }
      }
    }
  }

  function applyFilters() {
    syncDoorsAndChips();
    const winVal = windowSel ? windowSel.value : 'all';
    const regVal = regionSel ? regionSel.value : 'all';
    const drvVal = driveSel ? driveSel.value : 'all';

    for (const card of stories) {
      const tags = (card.dataset.tag || '').split(',').map((s) => s.trim());
      const windows = (card.dataset.window || '').split(',').map((s) => s.trim());
      const matchTag = activeTag === 'all' || tags.includes(activeTag);
      const matchWin = winVal === 'all' || windows.includes(winVal);
      const matchReg = regVal === 'all' || card.dataset.region === regVal;
      const matchDrv = drvVal === 'all' || card.dataset.drive === drvVal;
      card.hidden = !(matchTag && matchWin && matchReg && matchDrv);
    }

    const n = shownStories().length;
    if (countNode) {
      countNode.textContent = n
        ? `${n} of ${stories.length} Michigan winter weekend base towns match. Each pairs a Saturday outdoor headline with a Sunday weather backup and live tool links.`
        : 'No weekend base towns match that exact combination. Reset filters or choose a wider drive window.';
    }
    if (emptyNode) emptyNode.hidden = n > 0;
    refreshPins(false);
  }

  function resetFilters() {
    activeTag = 'all';
    if (windowSel) windowSel.value = 'all';
    if (regionSel) regionSel.value = 'all';
    if (driveSel) driveSel.value = 'all';
    applyFilters();
  }

  chips.forEach((b) => {
    b.addEventListener('click', () => {
      activeTag = b.dataset.tag || 'all';
      applyFilters();
    });
  });

  doorCards.forEach((card) => {
    const trigger = card.querySelector('.wkd-door-trigger');
    const photo = card.querySelector('.wkd-door-photo');
    const handleDoorSelect = (ev) => {
      if (ev.target.closest('a')) return;
      const doorTag = card.dataset.door || 'all';
      activeTag = activeTag === doorTag ? 'all' : doorTag;
      applyFilters();
      const exploreEl = document.getElementById('explore');
      if (exploreEl && activeTag !== 'all') {
        exploreEl.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          block: 'start',
        });
      }
    };
    if (trigger) trigger.addEventListener('click', handleDoorSelect);
    if (photo) {
      photo.style.cursor = 'pointer';
      photo.addEventListener('click', handleDoorSelect);
    }
  });

  windowSel?.addEventListener('change', applyFilters);
  regionSel?.addEventListener('change', applyFilters);
  driveSel?.addEventListener('change', applyFilters);
  document.getElementById('wf-reset')?.addEventListener('click', resetFilters);
  document.getElementById('wf-show-all')?.addEventListener('click', resetFilters);

  function refreshPins(initial) {
    if (!map || !window.L) return;
    markers.forEach((m) => map.removeLayer(m));
    markers = [];
    const groups = new Map();
    for (const card of shownStories()) {
      const lat = Number(card.dataset.lat);
      const lng = Number(card.dataset.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const key = lat.toFixed(4) + ',' + lng.toFixed(4);
      if (!groups.has(key)) groups.set(key, { lat, lng, cards: [] });
      groups.get(key).cards.push(card);
    }
    const points = [];
    for (const group of groups.values()) {
      const multi = group.cards.length > 1;
      const firstName = group.cards[0].querySelector('h3')?.textContent || 'Weekend base';
      const root = document.createElement('div');
      root.className = 'wf-map-popup';
      const heading = document.createElement('strong');
      heading.textContent = multi ? `${group.cards.length} weekend bases in this area` : firstName;
      root.append(heading);
      const note = document.createElement('p');
      note.textContent = 'Regional base town orientation only—not verified winter parking or plowed trailheads.';
      root.append(note);
      const items = document.createElement('ul');
      for (const card of group.cards) {
        const title = card.querySelector('h3')?.textContent || 'Open weekend note';
        const item = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + card.id;
        a.textContent = title;
        a.addEventListener('click', (ev) => {
          ev.preventDefault();
          card.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start',
          });
          const h = card.querySelector('h3');
          if (h) {
            h.tabIndex = -1;
            h.focus({ preventScroll: true });
          }
          map.closePopup();
        });
        item.append(a);
        items.append(item);
      }
      root.append(items);
      const markerClass = multi ? 'wf-pin wf-pin-multi' : 'wf-pin';
      const icon = window.L.divIcon({
        className: '',
        html: `<span class="${markerClass}" aria-hidden="true">${multi ? group.cards.length : ''}</span>`,
        iconSize: multi ? [24, 24] : [17, 17],
        iconAnchor: multi ? [12, 12] : [8, 8],
      });
      markers.push(
        window.L.marker([group.lat, group.lng], {
          title: multi ? `${group.cards.length} weekend bases` : firstName,
          icon,
        })
          .bindPopup(root)
          .addTo(map)
      );
      points.push([group.lat, group.lng]);
    }
    if (initial || (!userZoomed && !fitOnce)) {
      if (points.length > 1) map.fitBounds(points, { padding: [24, 24], maxZoom: 7 });
      else if (points.length) map.setView(points[0], 7);
      fitOnce = true;
    }
  }

  function showTiles(url, provider) {
    if (!map) return;
    if (tiles) map.removeLayer(tiles);
    const layer = window.L.tileLayer(url, {
      subdomains: provider === 'CARTO' ? 'abcd' : 'abc',
      maxZoom: 18,
      attribution:
        provider === 'CARTO'
          ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    tiles = layer;
    let failed = 0;
    let loaded = 0;
    layer.on('tileload', () => {
      if (tiles !== layer) return;
      loaded++;
      if (loaded >= 2) {
        setStatus(
          provider === 'CARTO'
            ? 'CARTO basemap loaded. Tap a regional weekend base pin.'
            : 'OpenStreetMap fallback loaded. Tap a regional weekend base pin.',
          provider === 'CARTO' ? 'ready' : 'fallback'
        );
      }
    });
    layer.on('tileerror', () => {
      if (tiles !== layer) return;
      if (++failed >= 2) {
        if (provider === 'CARTO') {
          setStatus('CARTO unavailable; switching to OpenStreetMap.', 'fallback');
          showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png', 'OSM');
        } else {
          setStatus('Map tiles unavailable. All 12 weekend base towns and tool links remain readable.', 'error');
        }
      }
    });
    layer.addTo(map);
  }

  async function connectTiles() {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 6500);
    try {
      const r = await fetch('/api/carto-basemap-config', { credentials: 'same-origin', signal: ac.signal });
      if (!r.ok) throw Error('config');
      const c = await r.json();
      if (c?.provider !== 'CARTO' || typeof c.key !== 'string' || !c.key.trim()) throw Error('config');
      showTiles(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=' +
          encodeURIComponent(c.key.trim()),
        'CARTO'
      );
    } catch {
      setStatus('Public CARTO map configuration unavailable. OpenStreetMap fallback active.', 'fallback');
      showTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png', 'OSM');
    } finally {
      clearTimeout(timer);
    }
  }

  function initMap() {
    if (!window.L || !mapNode) {
      setStatus('Interactive map unavailable; browse all 12 weekend bases below.', 'error');
      return;
    }
    try {
      mapNode.textContent = '';
      map = window.L.map(mapNode, { scrollWheelZoom: false }).setView([44.8, -85.5], 6);
      map.on('dragstart zoomstart', () => {
        userZoomed = true;
      });
      refreshPins(true);
      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => map?.invalidateSize({ pan: false })).observe(mapNode);
      }
      requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
      connectTiles();
    } catch {
      setStatus('Map could not start. Every weekend base remains readable.', 'error');
    }
  }

  applyFilters();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap, { once: true });
  } else {
    initMap();
  }
})();
