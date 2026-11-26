/* Map-first station selection: geographic choice -> observed evidence -> source/compare.
 * No inferred routes, permissions or safety clearances; the buoy feed is the sole source. */
(function () {
  'use strict';
  const picker = document.getElementById('mapStationPicker');
  const panel = document.getElementById('mapDossier');
  if (!picker || !panel) return;

  const state = { stations: [], stationId: null, activity: 'all', source: 'unknown', fetchedAt: null };
  const byId = id => state.stations.find(st => String(st.id) === String(id));
  const put = (id, value) => { const node=document.getElementById(id);if(node)node.textContent=value; };
  const goodNumber = value => typeof value === 'number' && Number.isFinite(value);
  function observationAge(st) {
    if (!st || !st.obs_time || st.observation_source==='none') return 'unknown';
    if (st.observation_source==='snapshot') return 'older';
    const ts = Date.parse(st.obs_time);
    if (!Number.isFinite(ts) || ts > Date.now() + 600000) return 'unknown';
    return Date.now() - ts > 7200000 ? 'older' : 'recent';
  }
  function observedAt(st) {
    if (!st || !st.obs_time || !Number.isFinite(Date.parse(st.obs_time))) return 'Observation time unavailable';
    return 'Observed ' + new Date(st.obs_time).toLocaleString('en-US',{
      timeZone:'America/Detroit',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'
    });
  }
  function sourceLink(st) {
    return /^[a-z0-9]+$/i.test(String(st.id)) ?
      'https://www.ndbc.noaa.gov/station_page.php?station=' + encodeURIComponent(String(st.id).toLowerCase()) :
      'https://www.ndbc.noaa.gov/';
  }
  function verdict(st, age) {
    if (!st) return 'Choose a map marker or use the station picker to inspect an actual report.';
    if (state.source === 'snapshot') return 'Saved snapshot only. The current feed could not be reached, so these measurements are not a current outing check.';
    if (st.observation_source==='snapshot') return 'This station is absent from the recent feed. The displayed reading is from a saved historical report. Winter recovery is possible, but not confirmed by absence; check the official station.';
    if (age !== 'recent') return 'Observation is older than two hours or has no trustworthy time. Check the official station before making plans.';
    if (state.activity === 'all') return 'A point observation from this station, not a report for nearby beaches, harbors or an entire lake.';
    const result = typeof window.getBuoyActivityEvidence === 'function'
      ? window.getBuoyActivityEvidence(st,state.activity) : 'unknown';
    const label = state.activity;
    if (result === 'within') return 'Available measurements fall within the '+label+' screening thresholds here. Not a safety clearance; check local forecasts.';
    if (result === 'outside') return 'This station falls outside the '+label+' screening thresholds. Review local marine conditions before going out.';
    return 'Cannot evaluate the '+label+' screen: one or more required sensors are missing or older. No pass or fail is inferred.';
  }
  function render() {
    const st = byId(state.stationId);
    if (!st) {
      put('mapStationTitle','Choose a buoy on the map');
      put('mapStationMeta','Each marker is a reporting point, not a forecast for an entire lake.');
      put('mapStationAge','No station selected');
      document.getElementById('mapStationAge').dataset.state='unknown';
      put('mapStationVerdict',verdict(null,'unknown'));
      put('mapStationObserved','Observation time not yet selected');
      for(const k of ['Wave','Wind','Water'])put('mapStation'+k,'--');
      document.getElementById('mapStationHistory').disabled=true;
      document.getElementById('mapStationCompare').disabled=true;
      return;
    }
    const age = observationAge(st);
    put('mapStationTitle',st.name);
    put('mapStationMeta','Station '+st.id+' · Lake '+st.lake);
    const label = state.source === 'snapshot' || st.observation_source==='snapshot' ? 'Saved snapshot' : age === 'recent' ? 'Recent observation' : age === 'older' ? 'Older observation' : 'Time unknown';
    put('mapStationAge',label);
    document.getElementById('mapStationAge').dataset.state=state.source==='snapshot'?'older':age;
    put('mapStationWave',goodNumber(st.wave_ht_ft) ? st.wave_ht_ft.toFixed(1) : '--');
    put('mapStationWind',goodNumber(st.wind_spd_kt) ? st.wind_spd_kt.toFixed(0) : '--');
    put('mapStationWater',goodNumber(st.water_t_f) ? st.water_t_f.toFixed(0) : '--');
    put('mapStationObserved',observedAt(st));
    put('mapStationVerdict',verdict(st,age));
    const official = document.getElementById('mapStationSource');
    official.href=sourceLink(st);
    official.textContent='NOAA station '+st.id;
    document.getElementById('mapStationHistory').disabled=false;
    document.getElementById('mapStationCompare').disabled=false;
  }
  function selectStation(id, origin) {
    const st=byId(id);
    if (!st) return false;
    state.stationId=String(st.id);
    picker.value=state.stationId;
    if (typeof window.highlightBuoyOnMap === 'function') window.highlightBuoyOnMap(state.stationId,origin==='picker');
    render();
    if (origin==='map') {
      panel.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      document.getElementById('mapStationTitle').focus({preventScroll:true});
    }
    return true;
  }
  function populate(stations) {
    const options=document.createDocumentFragment();
    const first=document.createElement('option');
    first.value='';first.textContent='Select a buoy station';options.append(first);
    stations.slice().sort((a,b)=>String(a.lake).localeCompare(String(b.lake)) || String(a.name).localeCompare(String(b.name))).forEach(st=>{
      const el=document.createElement('option');
      el.value=String(st.id);
      el.textContent='Lake '+st.lake+' · '+st.name+' ('+st.id+')';
      options.append(el);
    });
    picker.replaceChildren(options);
    picker.disabled=stations.length===0;
    picker.value=state.stationId && byId(state.stationId) ? state.stationId : '';
  }

  picker.addEventListener('change',()=>selectStation(picker.value,'picker'));
  document.getElementById('mapStationHistory').addEventListener('click',()=>{
    const st=byId(state.stationId);
    if (st && typeof window.openDetail === 'function') window.openDetail(st);
  });
  document.getElementById('mapStationCompare').addEventListener('click',()=>{
    const st=byId(state.stationId);
    if (!st) return;
    if (window.buoyObservationBridge?.selectStation) window.buoyObservationBridge.selectStation(String(st.id),'A');
    const compare=document.getElementById('observationBridge');
    compare.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    document.getElementById('obStationA').focus({preventScroll:true});
  });
  window.addEventListener('buoy-map-station-selected',e=>{
    selectStation(e.detail && e.detail.id,'map');
  });
  window.addEventListener('buoy-activity-changed',e=>{
    state.activity=e.detail?.activity||'all';
    render();
  });
  window.addEventListener('buoy-map-station-cleared',()=>{
    state.stationId=null;
    picker.value='';
    render();
  });
  window.addEventListener('buoy-stations-ready',e=>{
    const data=e.detail||{};
    state.stations=Array.isArray(data.stations)?data.stations:[];
    state.source=data.source||'unknown';
    state.fetchedAt=data.fetchedAt||null;
    if (state.stationId && !byId(state.stationId)) state.stationId=null;
    populate(state.stations);
    render();
  });
  window.buoyMapFirst={ selectStation };
})();
