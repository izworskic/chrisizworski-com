/* FIELD_GUIDE_V1 · Michigan First Snow Adventures Flagship Logic */
(() => {
  'use strict';

  function revealPhotoFallback(im) {
    const fig = im.closest('.wf-photo, .fsa-door-photo');
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
        fig.closest('.wf-story, .fsa-door-card')?.querySelector('h3')?.textContent ||
        'Michigan first-snow destination';
      const explanation = document.createElement('span');
      explanation.textContent =
        'The source photograph could not load. The snowbelt trail notes, official sources, and live snow-depth tool links below remain available.';
      panel.append(label, title, explanation);
      fig.insertBefore(panel, fig.firstChild);
    }
    panel.hidden = false;
  }

  for (const im of document.querySelectorAll('.wf-photo img, .fsa-door-photo img')) {
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

  /* Interactive First-Snow Meteorology & Trail Physics Blueprint */
  const BLUEPRINTS = {
    lakeeffect: {
      kicker: 'FIELD LESSON 01 · LAKE SUPERIOR FETCH + 1,400–1,950 FT LIFT',
      title: 'How a 600-foot climb inland turns 35°F shoreline rain into knee-deep powder',
      copy:
        'If you only check the weather station at a shoreline harbor in November, you will miss half of Michigan’s early ski season. When cold Canadian air pours across 42°F Lake Superior, the shoreline in Marquette or Houghton might sit at 34°F in wet sleet. Drive ten minutes inland up into the Negaunee highlands, Calumet, the Gogebic Range around Ironwood, or the Porcupine Mountains—climbing 600 to 1,200 feet—and adiabatic cooling drops the air temperature 4 to 6°F while squeezing dense lake-effect powder right onto the ridges.',
      rule:
        'How I use this: Early lake-effect bands are narrow and elevation-driven—always check the inland highland stations on our Michigan Snow Depth Finder before loading the car.',
      links: [
        { label: 'Michigan Snow Depth Finder ↗', href: '/michigan-snow-depth/' },
        { label: 'Lake-Effect Snow Engine ↗', href: '/lake-effect-snow/' },
        { label: '72-Hour Snowfall Totals ↗', href: '/michigan-snow-totals/' },
      ],
    },
    nordic: {
      kicker: 'FIELD LESSON 02 · WHY GRASS-BED TRAILS SKI ON 4–6 INCHES',
      title: 'Why mowed Nordic corridors open weeks before rocky backcountry trails',
      copy:
        'A rugged root-and-rock hiking trail needs a foot or more of compacted snow before you can ski or snowshoe without gouging your bases on granite. Dedicated Nordic centers and state forest pathways solve that before the first flake falls: crews spend October mowing smooth turf and picking rocks along the corridors at ABR in Ironwood, Swedetown in Calumet, Michigan Tech in Houghton, Forbush Corner and Hanson Hills near Grayling, and the Vasa Pathway. When the first 4 to 6 inches of wet lake-effect snow hits that grass, a rubber-tired roller packs it into a clean, fast early-winter deck.',
      rule:
        'How I use this: I bring my older "rock skis" or snowshoes for November tracks, and always keep microspikes in my pack for wind-scoured boardwalks.',
      links: [
        { label: 'XC Ski Conditions Tool ↗', href: '/michigan-cross-country-skiing/' },
        { label: 'Michigan Winter Trails Guide ↗', href: '/michigan-winter-trails/' },
        { label: 'Snowshoe Conditions Tool ↗', href: '/michigan-snowshoe-conditions/' },
      ],
    },
    rules: {
      kicker: 'FIELD LESSON 03 · NOVEMBER BLAZE ORANGE & DEC 1 SNOWMOBILES',
      title: 'Sharing the November woods safely and knowing when winter gates close',
      copy:
        'Chasing early snow in November overlaps two critical dates on the Michigan outdoor calendar. First, firearm deer season runs November 15–30 (with muzzleloader and late seasons continuing in December)—so whenever you hike, snowshoe, or ski outside dedicated fee-area tracks on state or national forest land, wear a blaze-orange hat and vest. Second, state-designated snowmobile trails and seasonal roads (like M-107 in the Porkies) do not open to sleds until December 1, and groomers only roll once the ground freezes solid.',
      rule:
        'How I use this: In November, stick to non-motorized Nordic, snowshoe, and waterfall trails, and keep a high-visibility orange outer layer in the truck.',
      links: [
        { label: 'Michigan Snowmobile Trail Tool ↗', href: '/snowmobile/' },
        { label: 'Michigan Winter Activities Guide ↗', href: '/michigan-winter-activities/' },
        { label: 'Official Michigan DNR Winter Page ↗', href: 'https://www.michigan.gov/dnr/things-to-do/winter' },
      ],
    },
    plateau: {
      kicker: 'FIELD LESSON 04 · THE 1,350-FT LOWER PENINSULA PLATEAU & SNOWMAKING',
      title: 'How Gaylord, Boyne, and Caberfae beat the coast by three weeks',
      copy:
        'You do not have to cross the Mackinac Bridge to get on snow before Christmas. The high interior glacial moraine running from Cadillac and Caberfae Peaks (1,500+ ft) north through Grayling, Hartwick Pines, Gaylord (1,350 ft), and Boyne Falls catches northwest Lake Michigan fetch while dropping cold enough at night (below 26°F wet-bulb) for commercial fan guns to blow deep machine-made snow by Thanksgiving weekend.',
      rule:
        'How I use this: Pair a morning on the early snowmaking runs or high-plateau pines with an afternoon in a heated vineyard igloo in Petoskey or Traverse City.',
      links: [
        { label: 'Michigan Ski Hills Finder ↗', href: '/michigan-ski-hills/' },
        { label: 'MI Wine, Cider & Spirits Guide ↗', href: '/michigan-wine-cider-spirits/' },
        { label: 'Michigan Winter Weekends ↗', href: '/michigan-winter-weekends/' },
      ],
    },
  };

  const bpButtons = [...document.querySelectorAll('[data-blueprint]')];
  const bpKicker = document.getElementById('fsa-bp-kicker');
  const bpTitle = document.getElementById('fsa-bp-title');
  const bpCopy = document.getElementById('fsa-bp-copy');
  const bpRule = document.getElementById('fsa-bp-rule');
  const bpLinks = document.getElementById('fsa-bp-links');

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

  /* Synchronized 4 Doors + Experience Chips + Region/Window/Effort Filters + Leaflet Map */
  const stories = [...document.querySelectorAll('.wf-story')];
  if (!stories.length) return;

  const doorCards = [...document.querySelectorAll('.fsa-door-card')];
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
      const btn = d.querySelector('.fsa-door-trigger');
      if (btn) {
        btn.setAttribute('aria-pressed', String(isSelected));
        const span = btn.querySelector('span');
        if (span) {
          span.textContent = isSelected ? 'Showing matching snowbelts ↓' : 'Filter snowbelt stops ↓';
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
        ? `${n} of ${stories.length} Michigan first-snow & early-winter destinations match. Always verify real-time snow depth and seasonal road gates before driving.`
        : 'No first-snow destinations match that exact combination. Reset filters or choose a wider region.';
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
    const trigger = card.querySelector('.fsa-door-trigger');
    const photo = card.querySelector('.fsa-door-photo');
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
      const firstName = group.cards[0].querySelector('h3')?.textContent || 'First-snow destination';
      const root = document.createElement('div');
      root.className = 'wf-map-popup';
      const heading = document.createElement('strong');
      heading.textContent = multi ? `${group.cards.length} snowbelt stops in this area` : firstName;
      root.append(heading);
      const note = document.createElement('p');
      note.textContent = 'Regional snowbelt orientation only—not verified winter parking or live snow depth.';
      root.append(note);
      const items = document.createElement('ul');
      for (const card of group.cards) {
        const title = card.querySelector('h3')?.textContent || 'Open snowbelt note';
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
          title: multi ? `${group.cards.length} snowbelt stops` : firstName,
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
            ? 'CARTO basemap loaded. Tap a regional snowbelt pin.'
            : 'OpenStreetMap fallback loaded. Tap a regional snowbelt pin.',
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
          setStatus('Map tiles unavailable. All 12 first-snow destinations and tool links remain readable.', 'error');
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
      setStatus('Interactive map unavailable; browse all 12 first-snow destinations below.', 'error');
      return;
    }
    try {
      mapNode.textContent = '';
      map = window.L.map(mapNode, { scrollWheelZoom: false }).setView([45.3, -86.2], 6);
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
      setStatus('Map could not start. Every first-snow destination remains readable.', 'error');
    }
  }

  applyFilters();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap, { once: true });
  } else {
    initMap();
  }
})();
