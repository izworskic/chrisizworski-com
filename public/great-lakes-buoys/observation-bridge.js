/* Great Lakes Observation Bridge
   Uses existing NDBC station observations. A report is not a forecast or trip clearance. */
(function (root) {
  'use strict';

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
  function observationState(station, now = Date.now()) {
    if (!station || !station.obs_time) return 'unknown';
    const instant = Date.parse(station.obs_time);
    if (!Number.isFinite(instant) || instant > now + 10 * 60 * 1000) return 'unknown';
    return now - instant <= TWO_HOURS_MS ? 'recent' : 'older';
  }
  function waveComparison(a, b, now = Date.now()) {
    if (!a || !b) return { state: 'unknown', text: 'Choose two reporting stations to inspect their observations side by side.' };
    if (a.id === b.id) return { state: 'same', text: 'These are the same station. Choose another buoy to compare two different locations.' };
    const as = observationState(a, now), bs = observationState(b, now);
    if (as !== 'recent' || bs !== 'recent') {
      return { state: 'older', text: 'At least one observation is older than two hours or has no reliable timestamp. Readings below are reference reports, not current conditions for departure.' };
    }
    if (!finite(a.wave_ht_ft) || !finite(b.wave_ht_ft)) {
      return { state: 'missing', text: 'A wave sensor is missing from one or both reports. No wave-height comparison is available; inspect the other measured fields and source links.' };
    }
    const difference = Math.abs(a.wave_ht_ft - b.wave_ht_ft);
    if (difference < 0.05) {
      return { state: 'compared', text: 'Both stations report about the same significant wave height. They measure separate locations, not the entire lake or a route.' };
    }
    const higher = a.wave_ht_ft > b.wave_ht_ft ? a : b;
    const lower = higher === a ? b : a;
    return { state: 'compared', text: 'Station ' + higher.id + ' reports waves ' + difference.toFixed(1) + ' ft higher than station ' + lower.id + '. These are point observations, not a route or nearshore forecast.' };
  }
  if (typeof module === 'object' && module.exports) module.exports = { observationState, waveComparison };
  if (typeof document === 'undefined') return;

  const panel = document.getElementById('observationBridge');
  if (!panel) return;
  const state = { stations: [], a: null, b: null, source: null, fetchedAt: null };
  const selectA = document.getElementById('obStationA');
  const selectB = document.getElementById('obStationB');
  const byId = id => state.stations.find(st => String(st.id) === String(id));
  const set = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
  const value = (v, digits) => finite(v) ? v.toFixed(digits) : '--';
  const observed = station => {
    if (!station || !station.obs_time || !Number.isFinite(Date.parse(station.obs_time))) return 'Observation time unavailable';
    return 'Observed ' + new Date(station.obs_time).toLocaleString('en-US', {month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Detroit',timeZoneName:'short'});
  };
  function populate(select, selected) {
    const fragment = document.createDocumentFragment();
    state.stations.forEach(st => {
      const option = document.createElement('option');
      option.value = String(st.id);
      option.textContent = String(st.id) + ' · Lake ' + st.lake + ' · ' + st.name;
      fragment.append(option);
    });
    select.replaceChildren(fragment);
    select.disabled = state.stations.length === 0;
    select.value = selected || '';
  }
  function renderStation(slot, station, other) {
    const id = slot === 'A' ? 'A' : 'B';
    set('obName' + id, station ? station.name : 'No station selected');
    set('obMeta' + id, station ? 'Station ' + station.id + ' · Lake ' + station.lake : 'Waiting for station data');
    const status = observationState(station);
    set('obAge' + id, status === 'recent' ? 'Recent report' : status === 'older' ? 'Older report' : 'Time unknown');
    const badge = document.getElementById('obAge' + id);
    badge.dataset.state = status;
    set('obWhen' + id, observed(station));
    set('obWave' + id, station ? value(station.wave_ht_ft, 1) : '--');
    set('obWind' + id, station ? value(station.wind_spd_kt, 0) : '--');
    set('obWater' + id, station ? value(station.water_t_f, 0) : '--');
    const wave = station && finite(station.wave_ht_ft) ? Math.max(0, station.wave_ht_ft) : null;
    const otherWave = other && finite(other.wave_ht_ft) ? Math.max(0, other.wave_ht_ft) : null;
    const max = Math.max(wave || 0, otherWave || 0);
    const bar = document.getElementById('obBar' + id);
    bar.style.width = wave === null || max === 0 ? '0%' : (wave / max * 100).toFixed(1) + '%';
    bar.parentElement.setAttribute('aria-label', wave === null ? 'No wave observation' : wave.toFixed(1) + ' feet observed; relative to the larger of the two readings');
    const link = document.getElementById('obSource' + id);
    link.href = station && /^[a-z0-9]+$/i.test(String(station.id)) ? 'https://www.ndbc.noaa.gov/station_page.php?station=' + encodeURIComponent(String(station.id).toLowerCase()) : 'https://www.ndbc.noaa.gov/';
    document.getElementById('obHistory' + id).disabled = !station;
  }
  function render() {
    const a = byId(state.a), b = byId(state.b);
    renderStation('A', a, b);
    renderStation('B', b, a);
    const verdict = waveComparison(a, b);
    set('obVerdict', verdict.text);
    document.getElementById('obVerdict').dataset.state = verdict.state;
    const origin = state.source === 'snapshot' ? 'Saved snapshot (live API unavailable)' : 'NDBC observations via site API';
    let stamp = '';
    if (state.fetchedAt && Number.isFinite(Date.parse(state.fetchedAt))) {
      stamp = ' · retrieved ' + new Date(state.fetchedAt).toLocaleString('en-US', {month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Detroit',timeZoneName:'short'});
    }
    set('obProvenance', origin + stamp + '. Retrieved time is not observed time.');
  }
  function update(stations, source, fetchedAt) {
    if (!Array.isArray(stations)) return;
    state.stations = stations.filter(st => st && st.id && st.name && st.lake).sort((a,b) =>
      String(a.lake).localeCompare(String(b.lake)) || String(a.name).localeCompare(String(b.name)));
    state.source = source;
    state.fetchedAt = fetchedAt;
    if (!byId(state.a)) {
      state.a = byId('45029') ? '45029' : (state.stations.find(st => finite(st.wave_ht_ft)) || state.stations[0])?.id || null;
    }
    if (!byId(state.b) || state.b === state.a) {
      state.b = (byId('45005') && state.a !== '45005' ? byId('45005') :
        state.stations.find(st => st.id !== state.a && st.lake !== byId(state.a)?.lake && finite(st.wave_ht_ft)) ||
        state.stations.find(st => st.id !== state.a))?.id || null;
    }
    populate(selectA, state.a);
    populate(selectB, state.b);
    render();
  }
  function selectStation(id, slot = 'A') {
    if (!byId(id)) return false;
    if (slot === 'B') state.b = String(id);
    else state.a = String(id);
    selectA.value = state.a;
    selectB.value = state.b;
    render();
    return true;
  }
  selectA.addEventListener('change', () => selectStation(selectA.value, 'A'));
  selectB.addEventListener('change', () => selectStation(selectB.value, 'B'));
  for (const slot of ['A','B']) {
    document.getElementById('obHistory' + slot).addEventListener('click', () => {
      const station = byId(state[slot.toLowerCase()]);
      if (station && typeof openDetail === 'function') openDetail(station);
    });
  }
  document.getElementById('stationList')?.addEventListener('click', event => {
    const button = event.target.closest('[data-bridge-station]');
    if (!button) return;
    event.stopPropagation();
    event.preventDefault();
    if (selectStation(button.dataset.bridgeStation)) {
      panel.scrollIntoView({block:'start',behavior:'auto'});
      selectA.focus({preventScroll:true});
    }
  }, true);
  root.buoyObservationBridge = { selectStation };
  root.addEventListener('buoy-stations-ready', event => {
    const detail = event.detail || {};
    update(detail.stations, detail.source, detail.fetchedAt);
  });
})(typeof window === 'undefined' ? globalThis : window);
