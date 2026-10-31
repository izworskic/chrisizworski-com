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
      kicker: 'FIELD LESSON 01 · PUT YOUR HEADLINE GOAL ON SATURDAY MORNING',
      title: 'Why I always put my most weather-sensitive outdoor stop on Saturday at 9:30 AM',
      copy:
        'Great Lakes winter weather shifts fastest near the water. Whenever I drive north for a Friday-to-Sunday trip, I put my primary outdoor goal—walking to the Sand Point ice curtains in Munising, snowshoeing the 1.6-mile Green Loop at Lower Tahquamenon, or skiing the Vasa Pathway—first thing Saturday morning between 9:30 AM and 1:30 PM. If Saturday morning delivers calm air and good snow, you lock in the highlight of your trip right away; if a squall rolls in early, you still have Sunday morning in reserve.',
      rule:
        'How I use this: I check the primary condition tool on Friday night and again over Saturday breakfast before leaving town.',
      links: [
        { label: 'Michigan Snow Depth Map ↗', href: '/michigan-snow-depth/' },
        { label: 'Michigan Winter Trails ↗', href: '/michigan-winter-trails/' },
        { label: 'Frozen Michigan Atlas ↗', href: '/frozen-michigan/' },
      ],
    },
    backup: {
      kicker: 'FIELD LESSON 02 · NEVER BOOK A ONE-TRICK BASE TOWN',
      title: 'How a good base town saves the weekend when a thaw or gale hits',
      copy:
        'Everyone who travels Michigan in winter eventually gets caught by a 39°F January rain or a 35-knot Lake Superior whiteout. The difference between a ruined trip and a great memory is the base town you picked. Every town in this guide pairs an outdoor headline with a sheltered forest loop or an indoor town plan—whether that is heated vineyard igloos on Old Mission Peninsula, the Marquette Regional History Center and Third Street breweries, or watching river ice from inside Belle Isle’s Dossin Museum.',
      rule:
        'How I use this: Before I book a hotel, I make sure I have both a Saturday trail plan and a warm Sunday backup within 20 minutes of town.',
      links: [
        { label: 'MI Wine, Cider & Spirits Guide ↗', href: '/michigan-wine-cider-spirits/' },
        { label: 'Michigan Ski Hills Comparison ↗', href: '/michigan-ski-hills/' },
        { label: 'Michigan Winter Activities ↗', href: '/michigan-winter-activities/' },
      ],
    },
    daylight: {
      kicker: 'FIELD LESSON 03 · WINTER GATES & 4:45 PM DUSK',
      title: 'Which famous summer scenic drives become snowmobile corridors in winter',
      copy:
        'From November through February, northern Michigan dusk settles in between 4:45 PM and 5:30 PM, and several famous summer roads close to wheeled vehicles: M-107 out to Lake of the Clouds and South Boundary Road in the Porcupine Mountains, Pierce Stocking Scenic Drive at Sleeping Bear Dunes, and the unplowed seasonal roads beyond Copper Harbor. Never trust a summer GPS shortcut onto an unplowed two-track.',
      rule:
        'How I use this: Stick to state-plowed highways (MDOT MiDrive) and each park’s designated winter parking lot.',
      links: [
        { label: 'Lake-Effect Snow Engine ↗', href: '/lake-effect-snow/' },
        { label: 'Mackinac Bridge Live Conditions ↗', href: '/mackinac-bridge-live/' },
        { label: 'Official MDOT MiDrive Map ↗', href: 'https://mdotjboss.state.mi.us/MiDrive/map' },
      ],
    },
    tools: {
      kicker: 'FIELD LESSON 04 · THE THURSDAY NIGHT EVIDENCE CHECK',
      title: 'Let the photography inspire where you go; let live data decide what you pack',
      copy:
        'A snowy photograph shows what a place looks like when winter is firing on all cylinders—not whether snow is on the ground this Friday. Forty-eight hours before you leave home, check our NOHRSC ground snow-depth map, NWS lake-effect advisories, ice-curtain freeze reports, and dark-sky cloud cover so you know whether to throw snowshoes, microspikes, or binoculars in the trunk.',
      rule:
        'How I use this: I check live snow depth and road conditions on Thursday night so my gear matches the actual weekend.',
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
