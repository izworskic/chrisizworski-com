/* FIELD_GUIDE_V1 · Great Lakes Winter Freighter & Harbor Guide Flagship Logic */
(() => {
  'use strict';

  function revealPhotoFallback(im) {
    const fig = im.closest('.wf-photo, .wfg-door-photo');
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
        fig.closest('.wf-story, .wfg-door-card')?.querySelector('h3')?.textContent ||
        'Great Lakes winter harbor';
      const explanation = document.createElement('span');
      explanation.textContent =
        'The source photograph could not load. The public shore viewing notes, official sources, and live maritime tool links below remain available.';
      panel.append(label, title, explanation);
      fig.insertBefore(panel, fig.firstChild);
    }
    panel.hidden = false;
  }

  for (const im of document.querySelectorAll('.wf-photo img, .wfg-door-photo img')) {
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

  /* Interactive Winter Shipping Architecture Blueprint */
  const BLUEPRINTS = {
    closure: {
      kicker: 'FIELD LESSON 01 · THE JAN 15 – MAR 25 SOO LOCK CLOSURE',
      title: 'Why midnight on January 15 splits the Great Lakes winter in two',
      copy:
        'If you watch freighters on the Great Lakes, your winter calendar revolves around 11:59 PM on January 15. That is when the U.S. Army Corps of Engineers closes the 1,200-foot Poe Lock at Sault Ste. Marie under federal regulation (33 CFR 207.440) and pumps the chamber dry for ten weeks of winter steel and gate work until March 25. Before January 15, the 1,000-footers push day and night through St. Marys River brash ice to deliver their final Lake Superior taconite loads; the morning after January 15, Lake Superior is sealed off and the big ships settle into their winter berths.',
      rule:
        'How I use this: I chase active canal and lock passages from November through January 15 (and again after March 22), and spend late January through mid-March photographing the fleet in winter layup.',
      links: [
        { label: 'Soo Locks Live & Closure Tracker ↗', href: '/soo-locks/' },
        { label: 'Duluth Ship Canal Live Tracker ↗', href: '/duluth-ship-canal/' },
        { label: 'Welland Canal Tracker ↗', href: '/welland-canal/' },
      ],
    },
    overlooks: {
      kicker: 'FIELD LESSON 02 · PUBLIC SHORE OVERLOOKS VS. PRIVATE SHIPYARDS',
      title: 'Why municipal bridges and waterfront parks beat driving up to a shipyard gate',
      copy:
        'Every winter, someone drives all the way to Sturgeon Bay or Superior expecting to walk onto a shipyard pier—and runs straight into a locked Coast Guard MTSA security gate. Commercial graving docks and bulk terminals like Fraser Shipyards in Superior, Fincantieri Bay Shipbuilding in Sturgeon Bay, and Ironhead Marine in Toledo are active heavy-industrial yards. Fortunately, you do not need yard access: public bridges in Sturgeon Bay, Barker’s Island in Superior, and the harbour walls in Owen Sound look right across the channel at the bows of laid-up 1,000-footers.',
      rule:
        'How I use this: Never drive into shipyard gates or rail docks—use the public bridge sidewalks, riverfront parks, and museum towers mapped on every stop below.',
      links: [
        { label: 'Winter Layup Atlas & Sourced Roster ↗', href: '/great-lakes-freighter-winter-layup/' },
        { label: 'Great Lakes Ship-Watching Spots ↗', href: '/great-lakes-ship-watching-spots/' },
        { label: 'James R. Barker Sturgeon Bay Bio ↗', href: '/great-lakes-freighter-winter-layup/vessels/james-r-barker/' },
      ],
    },
    ais: {
      kicker: 'FIELD LESSON 03 · READING AIS VS. SOURCED LAYUP RECORDS',
      title: 'Why a 0.0-knot AIS dot is not proof of a winter layup berth',
      copy:
        'Boatwatchers learn early that winter AIS data has two quirks. First, a freighter sitting at 0.0 knots in December or early January might simply be anchored behind Keweenaw Point riding out a gale or waiting for a Coast Guard cutter in Whitefish Bay. Second, once a ship ties up for the winter in Sturgeon Bay or Superior and switches to shore power, the crew often turns the AIS transponder off until March fit-out. That is why I built the Winter Layup Tracker around verified port-authority and historical-society berth records rather than raw AIS speed.',
      rule:
        'How I use this: Check the Live Ship Map for vessels actively underway, and use the Winter Layup Tracker to see where each ship is berthed for the winter.',
      links: [
        { label: 'Freighter Winter Layup Tracker ↗', href: '/great-lakes-freighter-winter-layup/' },
        { label: 'Live Great Lakes Freighter Map ↗', href: '/great-lakes-freighter-tracking/' },
        { label: 'Stewart J. Cort Winter Biography ↗', href: '/great-lakes-freighter-winter-layup/vessels/stewart-j-cort/' },
      ],
    },
    breakout: {
      kicker: 'FIELD LESSON 04 · FIT-OUT STEAM & THE MARCH 25 BREAKOUT',
      title: 'How to watch Coast Guard icebreakers and spring fit-out from a warm car',
      copy:
        'Even in the dead of February when the Soo Locks are dry, winter shipping never completely stops: tug-barge units and river shuttles haul coal, salt, and fuel along the St. Clair River, Detroit River, and lower Lake Michigan behind U.S. and Canadian Coast Guard icebreakers. Then, around March 10–20, smoke rises from shipyard stacks as engineers light main engines for spring fit-out, and heavy icebreaker USCGC Mackinaw and the 140-foot Bay-class tugs carve tracks through the Straits and Whitefish Bay for the March 25 opener.',
      rule:
        'How I use this: Icebreaker wakes fracture river and shoreline ice miles away without warning—watch from paved riverfront pull-offs and never step onto harbor ice.',
      links: [
        { label: 'Great Lakes Ice Report & Cutters ↗', href: '/michigan-ice/' },
        { label: 'Detroit River Ship Tracker ↗', href: '/detroit-river-freighters/' },
        { label: 'Straits of Mackinac Ship Tracker ↗', href: '/mackinac-straits-freighters/' },
      ],
    },
  };

  const bpButtons = [...document.querySelectorAll('[data-blueprint]')];
  const bpKicker = document.getElementById('wfg-bp-kicker');
  const bpTitle = document.getElementById('wfg-bp-title');
  const bpCopy = document.getElementById('wfg-bp-copy');
  const bpRule = document.getElementById('wfg-bp-rule');
  const bpLinks = document.getElementById('wfg-bp-links');

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

  /* Synchronized 4 Doors + Experience Chips + Basin/Window/Exposure Filters + Leaflet Map */
  const stories = [...document.querySelectorAll('.wf-story')];
  if (!stories.length) return;

  const doorCards = [...document.querySelectorAll('.wfg-door-card')];
  const chips = [...document.querySelectorAll('.wf-chip')];
  const windowSel = document.getElementById('wf-window');
  const regionSel = document.getElementById('wf-region');
  const effortSel = document.getElementById('wf-effort');
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
      const btn = d.querySelector('.wfg-door-trigger');
      if (btn) {
        btn.setAttribute('aria-pressed', String(isSelected));
        const span = btn.querySelector('span');
        if (span) {
          span.textContent = isSelected ? 'Showing matching harbors ↓' : 'Filter harbor hubs ↓';
        }
      }
    }
  }

  function applyFilters() {
    syncDoorsAndChips();
    const winVal = windowSel ? windowSel.value : 'all';
    const regVal = regionSel ? regionSel.value : 'all';
    const effVal = effortSel ? effortSel.value : 'all';

    for (const card of stories) {
      const tags = (card.dataset.tag || '').split(/[\s,]+/).filter(Boolean);
      const windows = (card.dataset.window || '').split(/[\s,]+/).filter(Boolean);
      const matchTag = activeTag === 'all' || tags.includes(activeTag);
      const matchWin = winVal === 'all' || windows.includes(winVal);
      const matchReg = regVal === 'all' || card.dataset.region === regVal;
      const matchEff = effVal === 'all' || card.dataset.effort === effVal;
      card.hidden = !(matchTag && matchWin && matchReg && matchEff);
    }

    const n = shownStories().length;
    if (countNode) {
      countNode.textContent = n
        ? `${n} of ${stories.length} Great Lakes winter freighter & harbor viewing hubs match. Observe strictly from public shore overlooks; never enter private shipyards or step onto harbor ice.`
        : 'No winter harbor hubs match that exact combination. Reset filters or select a wider basin.';
    }
    if (emptyNode) emptyNode.hidden = n > 0;
    refreshPins(false);
  }

  function resetFilters() {
    activeTag = 'all';
    if (windowSel) windowSel.value = 'all';
    if (regionSel) regionSel.value = 'all';
    if (effortSel) effortSel.value = 'all';
    applyFilters();
  }

  chips.forEach((b) => {
    b.addEventListener('click', () => {
      activeTag = b.dataset.tag || 'all';
      applyFilters();
    });
  });

  doorCards.forEach((card) => {
    const trigger = card.querySelector('.wfg-door-trigger');
    const photo = card.querySelector('.wfg-door-photo');
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
  effortSel?.addEventListener('change', applyFilters);
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
      const firstName = group.cards[0].querySelector('h3')?.textContent || 'Winter harbor hub';
      const root = document.createElement('div');
      root.className = 'wf-map-popup';
      const heading = document.createElement('strong');
      heading.textContent = multi ? `${group.cards.length} harbor overlooks in this area` : firstName;
      root.append(heading);
      const note = document.createElement('p');
      note.textContent = 'Approximate public harbor reference only—never a private shipyard gate or commercial dock berth.';
      root.append(note);
      const items = document.createElement('ul');
      for (const card of group.cards) {
        const title = card.querySelector('h3')?.textContent || 'Open harbor note';
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
          title: multi ? `${group.cards.length} harbor hubs` : firstName,
          icon,
        })
          .bindPopup(root)
          .addTo(map)
      );
      points.push([group.lat, group.lng]);
    }
    if (initial || (!userZoomed && !fitOnce)) {
      if (points.length > 1) map.fitBounds(points, { padding: [24, 24], maxZoom: 6 });
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
            ? 'CARTO basemap loaded. Tap a public winter harbor reference pin.'
            : 'OpenStreetMap fallback loaded. Tap a public winter harbor reference pin.',
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
          setStatus('Map tiles unavailable. All 12 winter harbor hubs and tool links remain readable.', 'error');
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
      setStatus('Interactive map unavailable; browse all 12 winter harbor hubs below.', 'error');
      return;
    }
    try {
      mapNode.textContent = '';
      map = window.L.map(mapNode, { scrollWheelZoom: false }).setView([44.6, -84.8], 5);
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
      setStatus('Map could not start. Every winter harbor hub remains readable.', 'error');
    }
  }

  applyFilters();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap, { once: true });
  } else {
    initMap();
  }
})();
