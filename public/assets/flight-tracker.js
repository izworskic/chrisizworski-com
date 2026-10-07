(() => {
  'use strict';

  const form = document.getElementById('flight-form');
  const input = document.getElementById('flight-number');
  const submit = document.getElementById('track-flight');
  const message = document.getElementById('tracker-message');
  const flightLabel = document.getElementById('flight-label');
  const routeLabel = document.getElementById('route-label');
  const detailLabel = document.getElementById('detail-label');
  const freshness = document.getElementById('freshness-label');

  const map = new maplibregl.Map({
    container:'flight-map',
    style:'https://tiles.openfreemap.org/styles/liberty',
    center:[-98.5,39.5],
    zoom:3.2,
    attributionControl:false
  });
  map.addControl(new maplibregl.AttributionControl({compact:true}), 'bottom-right');

  let planeMarker = null;
  let originMarker = null;
  let destinationMarker = null;
  let activeFlight = null;
  let refreshTimer = null;
  let routeKey = '';

  const $ = value => value == null || value === '' ? null : value;

  function clean(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g,'');
  }

  function airportCode(ap) {
    return ap?.iata || ap?.icao || '';
  }

  function formatAltitude(value) {
    return Number.isFinite(value) ? Math.round(value).toLocaleString() + ' ft' : null;
  }

  function formatSpeed(value) {
    return Number.isFinite(value) ? Math.round(value).toLocaleString() + ' kt' : null;
  }

  function formatAge(value) {
    if (!Number.isFinite(value)) return 'Position age unavailable';
    if (value < 10) return 'Updated just now';
    if (value < 60) return 'Updated ' + Math.round(value) + ' sec ago';
    const mins = Math.max(1, Math.round(value / 60));
    return 'Last position ' + mins + ' min ago';
  }

  function setMessage(text, kind='neutral') {
    message.textContent = text || '';
    message.dataset.kind = kind;
    message.hidden = !text;
  }

  function clearMarker(marker) {
    if (marker) marker.remove();
    return null;
  }

  function airportMarker(className, ap, label) {
    const el = document.createElement('div');
    el.className = 'airport-marker ' + className;
    el.setAttribute('aria-label', label);
    el.title = label;
    return new maplibregl.Marker({element:el, anchor:'center'})
      .setLngLat([ap.lon, ap.lat])
      .addTo(map);
  }

  function planeElement() {
    const el = document.createElement('div');
    el.className = 'plane-marker';
    el.setAttribute('aria-label','Current aircraft position');
    el.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M30.8 3.5c2.4 0 4.2 1.8 4.2 4.3v16.5l20.7 12.1c1 .6 1.6 1.7 1.6 2.9v3.8L35 36.8v12.6l7.1 5v3L32.9 55l-9.2 2.4v-3l7.1-5V36.8L8.5 43.1v-3.8c0-1.2.6-2.3 1.6-2.9l20.7-12.1V7.8c0-2.5 1.8-4.3 4.2-4.3Z"/></svg>';
    return el;
  }

  function greatCircle(a, b, steps=80) {
    const toRad = d => d * Math.PI / 180;
    const toDeg = r => r * 180 / Math.PI;
    const v = p => {
      const lat = toRad(p[1]), lon = toRad(p[0]);
      return [Math.cos(lat)*Math.cos(lon), Math.cos(lat)*Math.sin(lon), Math.sin(lat)];
    };
    const va = v(a), vb = v(b);
    const dot = Math.max(-1, Math.min(1, va[0]*vb[0]+va[1]*vb[1]+va[2]*vb[2]));
    const omega = Math.acos(dot);
    if (omega < 1e-9) return [a,b];
    const sinOmega = Math.sin(omega);
    const points = [];
    for (let i=0;i<=steps;i++) {
      const t = i/steps;
      const s0 = Math.sin((1-t)*omega)/sinOmega;
      const s1 = Math.sin(t*omega)/sinOmega;
      const x = s0*va[0]+s1*vb[0];
      const y = s0*va[1]+s1*vb[1];
      const z = s0*va[2]+s1*vb[2];
      points.push([toDeg(Math.atan2(y,x)), toDeg(Math.atan2(z,Math.hypot(x,y)))]);
    }
    return points;
  }

  function drawRoute(route) {
    if (!route?.origin || !route?.destination) return;
    const from = route.origin;
    const to = route.destination;
    const nextKey = [from.icao,from.lat,from.lon,to.icao,to.lat,to.lon].join('|');
    if (nextKey === routeKey) return;
    routeKey = nextKey;

    originMarker = clearMarker(originMarker);
    destinationMarker = clearMarker(destinationMarker);
    originMarker = airportMarker('origin', from, airportCode(from) + ' origin');
    destinationMarker = airportMarker('destination', to, airportCode(to) + ' destination');

    const data = {
      type:'Feature',
      geometry:{type:'LineString',coordinates:greatCircle([from.lon,from.lat],[to.lon,to.lat])},
      properties:{}
    };

    if (map.getSource('flight-route')) {
      map.getSource('flight-route').setData(data);
    } else {
      map.addSource('flight-route',{type:'geojson',data});
      map.addLayer({
        id:'flight-route',
        type:'line',
        source:'flight-route',
        paint:{
          'line-color':'#18344a',
          'line-width':3,
          'line-opacity':0.72,
          'line-dasharray':[2,1.5]
        }
      });
    }

    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([from.lon,from.lat]);
    bounds.extend([to.lon,to.lat]);
    map.fitBounds(bounds,{padding:{top:76,bottom:90,left:36,right:36},maxZoom:6.5,duration:700});
  }

  function renderLive(data) {
    const ac = data.aircraft;
    flightLabel.textContent = data.flightNumber || ac.callsign || 'Flight';
    if (data.route?.origin && data.route?.destination) {
      routeLabel.textContent = airportCode(data.route.origin) + ' → ' + airportCode(data.route.destination);
    } else {
      routeLabel.textContent = ac.callsign ? 'Live aircraft · ' + ac.callsign : 'Live aircraft';
    }

    const details = [formatAltitude(ac.altitudeFeet), formatSpeed(ac.speedKnots), $(ac.registration)].filter(Boolean);
    detailLabel.textContent = details.join(' · ');
    freshness.textContent = formatAge(ac.positionAgeSeconds);
    freshness.dataset.stale = data.positionFresh ? 'false' : 'true';

    setMessage('', 'neutral');
    submit.disabled = false;
    submit.textContent = 'TRACK';

    if (!planeMarker) {
      planeMarker = new maplibregl.Marker({
        element:planeElement(),
        anchor:'center',
        rotationAlignment:'map',
        pitchAlignment:'map'
      }).setLngLat([ac.lon, ac.lat]).addTo(map);
    } else {
      planeMarker.setLngLat([ac.lon,ac.lat]);
    }
    if (Number.isFinite(ac.trackDegrees)) planeMarker.setRotation(ac.trackDegrees);

    if (data.route) {
      if (map.isStyleLoaded()) drawRoute(data.route);
      else map.once('load', () => drawRoute(data.route));
    } else {
      routeKey = '';
      originMarker = clearMarker(originMarker);
      destinationMarker = clearMarker(destinationMarker);
      if (map.getSource('flight-route')) map.getSource('flight-route').setData({type:'FeatureCollection',features:[]});
      map.easeTo({center:[ac.lon,ac.lat],zoom:7,duration:500});
    }
  }

  function renderUnavailable(data) {
    submit.disabled = false;
    submit.textContent = 'TRACK';
    flightLabel.textContent = data.flightNumber || activeFlight || 'Flight';
    routeLabel.textContent = 'No live position';
    detailLabel.textContent = '';
    freshness.textContent = '';
    setMessage(data.message || 'No live aircraft position found.', data.status === 'ambiguous' ? 'warning' : 'neutral');
    planeMarker = clearMarker(planeMarker);
    originMarker = clearMarker(originMarker);
    destinationMarker = clearMarker(destinationMarker);
    routeKey = '';
    if (map.getSource('flight-route')) map.getSource('flight-route').setData({type:'FeatureCollection',features:[]});
    map.easeTo({center:[-98.5,39.5],zoom:3.2,duration:500});
  }

  async function loadFlight(flight, {silent=false}={}) {
    const normalized = clean(flight);
    if (!normalized) return;
    activeFlight = normalized;
    if (!silent) {
      submit.disabled = true;
      submit.textContent = 'FINDING…';
      setMessage('Finding the live aircraft…');
    }

    try {
      const response = await fetch('/api/flight-tracker?flight=' + encodeURIComponent(normalized), {
        headers:{accept:'application/json'},
        cache:'no-store'
      });
      const data = await response.json();
      if (data.status === 'live') renderLive(data);
      else renderUnavailable(data);
    } catch {
      submit.disabled = false;
      submit.textContent = 'TRACK';
      setMessage('Live aircraft data is temporarily unavailable.', 'error');
    }
  }

  function beginRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      if (!activeFlight || document.hidden) return;
      loadFlight(activeFlight,{silent:true});
    }, 10000);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const value = clean(input.value);
    if (!value) {
      input.focus();
      setMessage('Enter a flight number like DL1234.');
      return;
    }
    input.value = value;
    const url = new URL(location.href);
    url.searchParams.set('flight',value);
    history.replaceState({},'',url);
    loadFlight(value);
    beginRefresh();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && activeFlight) loadFlight(activeFlight,{silent:true});
  });

  const initial = clean(new URLSearchParams(location.search).get('flight'));
  if (initial) {
    input.value = initial;
    loadFlight(initial);
    beginRefresh();
  }
})();
