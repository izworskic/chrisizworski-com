/* Michigan Adventure Finder — editorial seasons, not live condition ratings.
 * Progressive enhancement: every destination and link is rendered in HTML.
 * No third-party telemetry or precise location is sent to the site.
 */
(() => {
  'use strict';
  const form = document.getElementById('finder-form');
  const whenEl = document.getElementById('when');
  const activityEl = document.getElementById('activity');
  const regionEl = document.getElementById('region');
  const cards = [...document.querySelectorAll('.destination')];
  const resultTitle = document.getElementById('result-title');
  const resultContext = document.getElementById('result-context');
  const empty = document.getElementById('empty');
  const mapEl = document.getElementById('destination-map');
  const moodButtons = [...document.querySelectorAll('[data-activity]')];
  let map = null;
  let markers = [];
  let userPin = null;
  let location = null;

  function michiganToday() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Detroit', year: 'numeric', month: 'numeric', day: 'numeric'
    }).formatToParts(new Date());
    const value = type => Number(parts.find(p => p.type === type)?.value);
    return new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
  }
  const addDays = (d, count) => new Date(d.getTime() + count * 86400000);
  function targetMonths(value) {
    if (value === 'any') return null;
    const seasons = {winter: [12, 1, 2], spring: [3, 4, 5], summer: [6, 7, 8], autumn: [9, 10, 11]};
    if (seasons[value]) return seasons[value];
    const today = michiganToday();
    let start;
    let end;
    if (value === 'month') {
      start = today; end = addDays(today, 30);
    } else {
      // On Saturday or Sunday include the current weekend; otherwise the next.
      const weekday = today.getUTCDay();
      const untilSat = weekday === 0 ? -1 : (6 - weekday + 7) % 7;
      start = addDays(today, untilSat);
      end = addDays(start, 1);
    }
    const result = new Set();
    for (let t = start; t <= end; t = addDays(t, 1)) result.add(t.getUTCMonth() + 1);
    return [...result];
  }
  function labelFor(value) {
    const options = [...whenEl.options];
    return options.find(x => x.value === value)?.textContent.toLowerCase() || 'your dates';
  }
  function visibleCards() {
    return cards.filter(card => !card.hidden);
  }
  function updateMap() {
    if (!map) return;
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    const positions = [];
    const icon = window.L.divIcon({className: '', html: '<span class="map-marker" aria-hidden="true"></span>', iconSize: [18,18], iconAnchor: [9,9]});
    visibleCards().forEach(card => {
      const lat = Number(card.dataset.lat), lng = Number(card.dataset.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const name = card.querySelector('h3').textContent.trim();
      const loc = card.querySelector('.place').textContent.trim();
      const popup = document.createElement('div');
      popup.className = 'map-popup';
      const title = document.createElement('h3');
      title.textContent = name;
      const caption = document.createElement('p');
      caption.textContent = loc;
      const jump = document.createElement('a');
      jump.href = '#' + card.id;
      jump.textContent = 'Read destination & trip links →';
      jump.addEventListener('click', event => {
        event.preventDefault();
        card.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
        card.querySelector('.primary-link')?.focus({preventScroll:true});
        map.closePopup();
      });
      popup.append(title, caption, jump);
      const marker = window.L.marker([lat,lng], {icon,title:name}).bindPopup(popup).addTo(map);
      markers.push(marker);
      positions.push([lat,lng]);
    });
    if (positions.length > 1) map.fitBounds(positions, {padding:[22,22], maxZoom:8});
    else if (positions.length === 1) map.setView(positions[0],8);
    else map.setView([44.6,-85.4],6);
    if (location) {
      if (userPin) map.removeLayer(userPin);
      userPin = window.L.circleMarker([location.lat, location.lng], {radius:7,color:'#155b67',fillColor:'#fefdf5',fillOpacity:1,weight:3}).addTo(map).bindPopup('Your approximate location — not stored by this page');
    }
  }
  const mapStatus = document.getElementById('map-status');
  function tellMap(message,state) {
    if (mapStatus) { mapStatus.textContent = message; mapStatus.dataset.state = state; }
  }
  function addMapTiles(url, isFallback) {
    if (!map) return;
    if (map._destinationTileLayer) map.removeLayer(map._destinationTileLayer);
    const layer = window.L.tileLayer(url, {
      attribution: isFallback
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 18, subdomains: 'abcd'
    });
    map._destinationTileLayer = layer;
    let errorCount = 0;
    let hasPainted = false;
    layer.on('tileload', () => {
      if (hasPainted || map._destinationTileLayer !== layer) return;
      hasPainted = true;
      tellMap(isFallback
        ? 'OpenStreetMap basemap is displayed because CARTO is unavailable. Destination locations are unchanged.'
        : 'CARTO map loaded with the configured Vercel public key. Select a pin to explore a place.',
        isFallback ? 'fallback' : 'ready');
    });
    layer.on('tileerror', () => {
      if (map._destinationTileLayer !== layer) return;
      if (++errorCount >= 2) {
        if (!isFallback) {
          tellMap('CARTO tiles failed to load; switching to OpenStreetMap.', 'fallback');
          addMapTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png', true);
        } else {
          tellMap('Map tiles are unavailable. All destination descriptions and direct links still work.', 'error');
        }
      }
    });
    layer.addTo(map);
  }
  async function connectCarto() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);
    try {
      tellMap('Connecting to CARTO using the public key configured in Vercel…', 'pending');
      const response = await fetch('/api/carto-basemap-config', {
        method: 'GET', credentials: 'same-origin', signal: controller.signal
      });
      if (!response.ok) throw new Error('CARTO configuration endpoint unavailable');
      const cfg = await response.json();
      if (!cfg || cfg.provider !== 'CARTO' || typeof cfg.key !== 'string' || !cfg.key.trim()) {
        throw new Error('CARTO public key unavailable');
      }
      const url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key='
        + encodeURIComponent(cfg.key.trim());
      addMapTiles(url, false);
    } catch (error) {
      tellMap('CARTO unavailable. Loading OpenStreetMap instead; you can still select destinations.', 'fallback');
      addMapTiles('https://tile.openstreetmap.org/{z}/{x}/{y}.png', true);
    } finally {
      clearTimeout(timeout);
    }
  }
  function initMap() {
    if (!window.L || !mapEl) {
      tellMap('Interactive map could not start. Browse all places using the photograph-led list.', 'error');
      return;
    }
    try {
      mapEl.textContent = '';
      map = window.L.map(mapEl, {scrollWheelZoom:false, zoomControl:true}).setView([44.6,-85.4],6);
      updateMap();
      connectCarto();
    } catch (error) {
      map = null;
      mapEl.textContent = 'Map unavailable. Explore any of the destination stories and official links beside it.';
      tellMap('Map could not start, but all destination links remain usable.', 'error');
    }
  }
  function applyFilters({focus=false,updateUrl=false}={}) {
    moodButtons.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.activity === activityEl.value)));
    const months = targetMonths(whenEl.value);
    const activity = activityEl.value, region = regionEl.value;
    let count = 0;
    cards.forEach(card => {
      const cardMonths = card.dataset.months.split(',').map(Number);
      const matchesSeason = !months || months.some(m => cardMonths.includes(m));
      const matchesActivity = activity === 'all' || card.dataset.tags.split(',').includes(activity);
      const matchesRegion = region === 'all' || card.dataset.region === region;
      card.hidden = !(matchesSeason && matchesActivity && matchesRegion);
      if (!card.hidden) count++;
    });
    resultTitle.textContent = count + ' Michigan ' + (count === 1 ? 'destination' : 'destinations') + ' to explore';
    const parts = [labelFor(whenEl.value)];
    if(activity !== 'all') parts.push(activityEl.options[activityEl.selectedIndex].textContent.toLowerCase());
    if(region !== 'all') parts.push(regionEl.options[regionEl.selectedIndex].textContent);
    resultContext.textContent = count ? 'Showing places with typical seasonal fit for ' + parts.join(' · ') + '. Verify actual weather, access and conditions using the linked tools.' : 'No matching places in this curated set. Choose another season, region or activity.';
    empty.hidden = count !== 0;
    updateMap();
    if(updateUrl){
      const params = new URLSearchParams();
      if(whenEl.value !== 'any') params.set('when',whenEl.value);
      if(activity !== 'all') params.set('activity',activity);
      if(region !== 'all') params.set('region',region);
      const query = params.toString();
      window.history.replaceState(null,'',window.location.pathname + (query?'?'+query:'') + window.location.hash);
    }
    if(focus) document.getElementById('result-title').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  function restoreQuery() {
    const p = new URLSearchParams(window.location.search);
    [[whenEl,'when'],[activityEl,'activity'],[regionEl,'region']].forEach(([el,key]) => {
      const value = p.get(key);
      if(value && [...el.options].some(o => o.value === value)) el.value = value;
    });
  }
  function reset() {
    whenEl.value='any';activityEl.value='all';regionEl.value='all';
    applyFilters({updateUrl:true});
  }
  moodButtons.forEach(btn => btn.addEventListener('click', () => {activityEl.value = btn.dataset.activity;applyFilters({updateUrl:true});}));
  form.addEventListener('submit',e=>{e.preventDefault();applyFilters({focus:true,updateUrl:true});});
  [whenEl,activityEl,regionEl].forEach(el=>el.addEventListener('change',()=>applyFilters({updateUrl:true})));
  document.getElementById('reset').addEventListener('click',reset);
  document.getElementById('clear-empty').addEventListener('click',reset);
  // A location request is initiated only by an explicit button click, never on load.
  if (navigator.geolocation) {
    const useLocation = document.createElement('button');
    useLocation.type = 'button';
    useLocation.className = 'reset-button';
    useLocation.textContent = 'Use my location';
    useLocation.title = 'Optional map location: browser permission required';
    useLocation.addEventListener('click', () => {
      useLocation.disabled = true;
      useLocation.textContent = 'Finding location…';
      navigator.geolocation.getCurrentPosition(
        pos => {
          location = {lat:pos.coords.latitude,lng:pos.coords.longitude};
          useLocation.disabled = false;
          useLocation.textContent='Center map on me';
          if(map){
            updateMap();
            map.setView([location.lat,location.lng],8);
          }
          document.getElementById('map-section').scrollIntoView({behavior:'smooth'});
          resultContext.textContent='Map centered on your approximate location; destination results have not been reranked. This page does not store your location.';
        },
        () => {useLocation.disabled=false;useLocation.textContent='Use my location';resultContext.textContent='Location unavailable or permission denied. Filters and destination links continue to work.';},
        {enableHighAccuracy:false,timeout:9000,maximumAge:300000}
      );
    });
    document.querySelector('.control-actions').append(useLocation);
  }
  restoreQuery();
  applyFilters();
  // Photos and ad resources can delay window.load significantly. Start the map at DOM readiness.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initMap,{once:true});
  else initMap();
})();