(async () => {
  'use strict';

  const form = document.getElementById('flight-form');
  const input = document.getElementById('flight-number');
  const submit = document.getElementById('track-flight');
  const message = document.getElementById('tracker-message');
  const flightLabel = document.getElementById('flight-label');
  const routeLabel = document.getElementById('route-label');
  const detailLabel = document.getElementById('detail-label');
  const freshness = document.getElementById('freshness-label');
  const glance = document.getElementById('flight-glance');
  const glanceNote = document.getElementById('flight-glance-note');
  const phaseLabel = document.getElementById('flight-phase');
  const distanceLabel = document.getElementById('flight-distance');
  const landingLabel = document.getElementById('landing-window');
  const mapShell = document.querySelector('.map-shell');
  const routeCodes = document.getElementById('route-codes');
  const progressBar = document.getElementById('direct-progress');
  const progressFill = document.getElementById('direct-progress-fill');
  const progressOrigin = document.getElementById('direct-progress-origin');
  const progressDestination = document.getElementById('direct-progress-destination');
  const progressPercent = document.getElementById('direct-progress-percent');
  const dateInput = document.getElementById('flight-date');
  const answerCard = document.getElementById('answer-card');
  const answerKicker = document.getElementById('answer-kicker');
  const answerHeadline = document.getElementById('answer-headline');
  const answerSummary = document.getElementById('answer-summary');
  const answerMeta = document.getElementById('answer-meta');
  const answerSource = document.getElementById('answer-source');
  const answerNext = document.getElementById('answer-next');
  const routeChoices = document.getElementById('route-choices');

  let maplibregl;
  try {
    const maplibreModule = await import('https://cdn.jsdelivr.net/npm/maplibre-gl@6.3.0/dist/maplibre-gl.mjs');
    maplibregl = maplibreModule.default || maplibreModule;
  } catch (error) {
    message.hidden = false;
    message.dataset.kind = 'error';
    message.textContent = 'The flight map could not load. Refresh the page and try again.';
    submit.disabled = true;
    console.error('Flight tracker map failed to load', error);
    return;
  }

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
  let activeDate = null;
  let activeFlightId = null;
  let assignedTail = null;
  let assignmentData = null;
  let assignmentChangedFrom = null;
  let assignmentTimer = null;
  let assignmentInFlight = false;
  let refreshTimer = null;
  let routeKey = '';
  let refreshInFlight = false;
  let requestSequence = 0;
  let activeLiveKey = null;
  let lastLiveFlight = null;
  let lastLiveSuccessAt = 0;
  let lastReportedAgeSeconds = null;
  const HOLD_LAST_LIVE_MS = 5 * 60 * 1000;

  const $ = value => value == null || value === '' ? null : value;

  function clean(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g,'');
  }

  function localDateString(date=new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2,'0');
    const day = String(date.getDate()).padStart(2,'0');
    return year + '-' + month + '-' + day;
  }

  function airportCodeAny(ap) {
    return ap?.iata || ap?.icao || ap?.code || '';
  }

  function scheduledTimeLabel(ap) {
    const t = ap?.estimatedTime || ap?.scheduledTime;
    if (!t?.time) return null;
    return [t.time, t.ampm, t.timezone].filter(Boolean).join(' ');
  }

  function delayLabel(assignment) {
    if (assignment?.flightStatus?.canceled) return 'Canceled';
    const mins = assignment?.flightStatus?.departureDelayMinutes;
    if (Number.isFinite(mins) && mins > 0) return 'Delayed ' + mins + ' min';
    return assignment?.flightStatus?.description || assignment?.flightStatus?.label || 'Scheduled';
  }

  function clearAnswerMeta() {
    while (answerMeta.firstChild) answerMeta.removeChild(answerMeta.firstChild);
  }

  function addAnswerPill(text) {
    if (!text) return;
    const pill = document.createElement('span');
    pill.className = 'answer-pill';
    pill.textContent = text;
    answerMeta.appendChild(pill);
  }

  function setAnswer({kicker='INBOUND AIRCRAFT',headline,summary='',pills=[],next='',source=''}) {
    answerCard.hidden = false;
    answerKicker.textContent = kicker;
    answerHeadline.textContent = headline || 'Checking your aircraft…';
    answerSummary.textContent = summary || '';
    clearAnswerMeta();
    pills.filter(Boolean).forEach(addAnswerPill);
    answerNext.textContent = next || '';
    answerNext.hidden = !next;
    answerSource.textContent = source || '';
  }

  function hideAnswer() {
    answerCard.hidden = true;
    answerNext.hidden = true;
    routeChoices.hidden = true;
    routeChoices.replaceChildren();
  }

  function assignmentRoute(assignment) {
    if (!assignment?.origin || !assignment?.destination) return null;
    const from = airportCodeAny(assignment.origin);
    const to = airportCodeAny(assignment.destination);
    return from && to ? from + ' → ' + to : null;
  }

  function assignmentSourceText() {
    return 'Aircraft assignment/status: FlightStats public tracker. Live aircraft position: ADSB.lol. Airline aircraft assignments can change before departure.';
  }

  function syncUrl() {
    const url = new URL(location.href);
    if (activeFlight) url.searchParams.set('flight',activeFlight);
    if (activeDate) url.searchParams.set('date',activeDate);
    if (activeFlightId) url.searchParams.set('flightId',activeFlightId);
    else url.searchParams.delete('flightId');
    history.replaceState({},'',url);
  }

  function airportCode(ap) {
    return ap?.iata || ap?.icao || '';
  }

  function airportPlace(ap) {
    return ap?.city || ap?.name || airportCode(ap) || 'Airport';
  }

  function airportChoiceText(ap) {
    const city = String(ap?.city || '').trim();
    const code = String(airportCodeAny(ap) || '').trim();
    if (city && code) return city + ' (' + code + ')';
    return city || code || String(ap?.name || '').trim() || 'Airport';
  }

  function aircraftIdentity(ac) {
    return [$(ac?.aircraftTypeName || ac?.aircraftType), $(ac?.registration)].filter(Boolean).join(' · ');
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

  function durationLabel(minutes) {
    if (!Number.isFinite(minutes) || minutes < 0) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours ? hours + 'h' + (mins ? ' ' + mins + 'm' : '') : mins + ' min';
  }

  function renderProgress(data) {
    const progress = data.progress;
    glance.hidden = false;
    mapShell.classList.add('with-progress');
    phaseLabel.textContent = progress?.phase?.label || 'Phase unavailable';
    distanceLabel.textContent = Number.isFinite(progress?.remainingMiles)
      ? progress.remainingMiles.toLocaleString() + ' mi' : '—';
    const eta = progress?.landingEstimate;
    landingLabel.textContent = eta
      ? durationLabel(eta.minMinutes) + '–' + durationLabel(eta.maxMinutes)
      : 'Unavailable';

    const route = data.route;
    const percent = progress?.directProgressPercent;
    const showProgress = Number.isFinite(percent) && route?.origin && route?.destination;
    progressBar.hidden = !showProgress;
    if (showProgress) {
      progressOrigin.textContent = airportCode(route.origin) || 'ORG';
      progressDestination.textContent = airportCode(route.destination) || 'DST';
      progressPercent.textContent = '~' + percent + '%';
      progressFill.style.width = Math.max(0, Math.min(100, percent)) + '%';
      progressBar.setAttribute('aria-label', 'About ' + percent + '% of direct airport-to-airport distance covered');
    }

    glanceNote.hidden = !eta && !showProgress;
    const notes = [];
    if (eta?.note) notes.push(eta.note);
    if (showProgress) notes.push('Progress and miles use direct airport-to-airport distance.');
    glanceNote.textContent = notes.join(' ');
  }

  function resetHeldLive() {
    lastLiveFlight = null;
    lastLiveSuccessAt = 0;
    lastReportedAgeSeconds = null;
  }

  function holdLastLiveOnRefreshMiss(data) {
    if (!activeLiveKey || lastLiveFlight !== activeLiveKey || !lastLiveSuccessAt) return false;
    const elapsedMs = Date.now() - lastLiveSuccessAt;
    if (elapsedMs < 0 || elapsedMs > HOLD_LAST_LIVE_MS) return false;

    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const baseAge = Number.isFinite(lastReportedAgeSeconds) ? lastReportedAgeSeconds : 0;
    const apparentAge = baseAge + elapsedSeconds;
    const meaningfullyStale = apparentAge > 90;

    freshness.textContent = formatAge(apparentAge) + (meaningfullyStale ? ' · refresh retrying' : '');
    freshness.dataset.stale = meaningfullyStale ? 'true' : 'false';

    if (meaningfullyStale) {
      phaseLabel.textContent = 'Last reported';
      landingLabel.textContent = 'Refresh pending';
      const reason = data?.status === 'ambiguous'
        ? 'Live position is temporarily stale. Showing the last confirmed aircraft report while retrying.'
        : 'Live position is temporarily stale. Showing the last confirmed aircraft report while retrying.';
      setMessage(reason, 'warning');
    } else {
      setMessage('', 'neutral');
    }

    submit.disabled = false;
    submit.textContent = 'FIND MY PLANE';
    return true;
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
    lastLiveFlight = activeLiveKey || activeFlight;
    lastLiveSuccessAt = Date.now();
    lastReportedAgeSeconds = Number.isFinite(ac.positionAgeSeconds) ? ac.positionAgeSeconds : null;
    flightLabel.textContent = data.flightNumber || ac.callsign || 'Flight';
    if (data.route?.origin && data.route?.destination) {
      routeLabel.textContent = airportPlace(data.route.origin) + ' → ' + airportPlace(data.route.destination);
      routeCodes.textContent = airportCode(data.route.origin) + ' → ' + airportCode(data.route.destination);
    } else {
      routeLabel.textContent = ac.callsign ? 'Live aircraft · ' + ac.callsign : 'Live aircraft';
      routeCodes.textContent = '';
    }

    const details = [
      aircraftIdentity(ac),
      formatAltitude(ac.altitudeFeet),
      formatSpeed(ac.speedKnots)
    ].filter(Boolean);
    detailLabel.textContent = details.join(' · ');
    freshness.textContent = formatAge(ac.positionAgeSeconds);
    freshness.dataset.stale = data.positionFresh ? 'false' : 'true';
    renderProgress(data);

    setMessage('', 'neutral');
    submit.disabled = false;
    submit.textContent = 'FIND MY PLANE';

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
    glance.hidden = true;
    glanceNote.hidden = true;
    progressBar.hidden = true;
    progressFill.style.width = '0%';
    routeCodes.textContent = '';
    mapShell.classList.remove('with-progress');
    submit.disabled = false;
    submit.textContent = 'FIND MY PLANE';
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

  function clearLiveMap() {
    glance.hidden = true;
    glanceNote.hidden = true;
    progressBar.hidden = true;
    progressFill.style.width = '0%';
    routeCodes.textContent = '';
    mapShell.classList.remove('with-progress');
    planeMarker = clearMarker(planeMarker);
    originMarker = clearMarker(originMarker);
    destinationMarker = clearMarker(destinationMarker);
    routeKey = '';
    if (map.getSource('flight-route')) map.getSource('flight-route').setData({type:'FeatureCollection',features:[]});
    map.easeTo({center:[-98.5,39.5],zoom:3.2,duration:500});
  }

  function sameAirport(a, b) {
    const left = String(airportCodeAny(a) || '').toUpperCase();
    const right = String(airportCodeAny(b) || '').toUpperCase();
    return Boolean(left && right && left === right);
  }

  function renderAssignmentBase(assignment) {
    const route = assignmentRoute(assignment);
    const tail = assignment.tailNumber;
    const equipment = assignment?.equipment?.name || assignment?.equipment?.code;
    const dep = scheduledTimeLabel(assignment.origin);
    const gate = assignment?.origin?.gate ? 'Gate ' + assignment.origin.gate : null;
    const delay = delayLabel(assignment);
    const pills = [route, delay, dep ? 'Departure ' + dep : null, gate, tail ? 'Assigned ' + tail : null, equipment].filter(Boolean);

    if (assignment.flightStatus?.canceled) {
      setAnswer({
        kicker:'FLIGHT STATUS',
        headline:'Your flight is canceled.',
        summary:'The airline status source currently marks ' + assignment.flightNumber + ' as canceled.',
        pills,
        source:assignmentSourceText()
      });
      return;
    }

    if (!tail) {
      setAnswer({
        kicker:delay.toLowerCase().includes('delay') ? 'DELAYED FLIGHT · AIRCRAFT ASSIGNMENT' : 'AIRCRAFT ASSIGNMENT',
        headline:'The airline has not published an aircraft assignment yet.',
        summary:'We found your scheduled flight, but the airline has not published a tail number for us to follow yet.',
        pills,
        next:'What happens next: we’ll recheck the aircraft assignment every minute while this page is open.',
        source:assignmentSourceText()
      });
      return;
    }

    const changed = assignmentChangedFrom ? ' The assignment changed from ' + assignmentChangedFrom + ' to ' + tail + '.' : '';
    setAnswer({
      kicker:delay.toLowerCase().includes('delay') ? 'DELAYED FLIGHT · INBOUND AIRCRAFT' : 'INBOUND AIRCRAFT',
      headline:'Your assigned aircraft is ' + tail + '.',
      summary:'Now finding where that exact airplane is and what leg it is operating.' + changed,
      pills,
      next:'What happens next: we’ll follow this exact aircraft and keep checking for an assignment change.',
      source:assignmentSourceText()
    });
  }

  function liveLegText(live) {
    if (!live?.route?.origin || !live?.route?.destination) return null;
    return airportPlace(live.route.origin) + ' → ' + airportPlace(live.route.destination);
  }

  function renderInboundAnswer(assignment, live) {
    const tail = assignment?.tailNumber || live?.aircraft?.registration;
    const route = assignmentRoute(assignment);
    const delay = delayLabel(assignment);
    const identity = aircraftIdentity(live?.aircraft) || assignment?.equipment?.name || tail;
    const pills = [route, delay, tail, identity].filter(Boolean);
    const currentLeg = liveLegText(live);
    const eta = live?.progress?.landingEstimate;
    const userOrigin = assignment?.origin;
    const inboundToOrigin = live?.route?.destination && userOrigin && sameAirport(live.route.destination,userOrigin);
    const userFlightAirborne = assignment?.flightStatus?.airborne === true;

    if (userFlightAirborne) {
      setAnswer({
        kicker:'YOUR FLIGHT IS AIRBORNE',
        headline:'This is your aircraft in flight.',
        summary:currentLeg ? 'It is currently operating ' + currentLeg + '.' : 'The assigned aircraft is airborne and reporting a live position.',
        pills,
        next:'What happens next: this page will keep following your flight to its destination.',
        source:assignmentSourceText()
      });
      return;
    }

    if (inboundToOrigin) {
      const originName = airportPlace(userOrigin);
      let summary = currentLeg ? 'It is currently flying ' + currentLeg + '.' : 'The aircraft is currently inbound to ' + originName + '.';
      if (eta) summary += ' From the latest live report, it is roughly ' + durationLabel(eta.minMinutes) + '–' + durationLabel(eta.maxMinutes) + ' from landing there.';
      if (assignmentChangedFrom) summary += ' The airline recently changed the assigned aircraft from ' + assignmentChangedFrom + ' to ' + tail + '.';
      setAnswer({
        kicker:'THIS IS THE PLANE FOR YOUR FLIGHT',
        headline:'Your plane is on the way to ' + originName + '.',
        summary,
        pills:[...pills,currentLeg],
        next:'What happens next: ' + tail + ' lands at ' + originName + ' → taxis to a gate → turns for your ' + (route || 'next') + ' flight.',
        source:assignmentSourceText()
      });
      return;
    }

    if (currentLeg) {
      setAnswer({
        kicker:'YOUR ASSIGNED AIRCRAFT',
        headline:'Your plane is currently flying ' + currentLeg + '.',
        summary:'That is the aircraft currently assigned to your flight. It is not yet on a leg that ends at ' + airportPlace(userOrigin) + ', so another leg or an aircraft swap may happen before your departure.',
        pills:[...pills,currentLeg],
        next:'What happens next: keep watching the assignment. This aircraft may operate another leg first, or the airline may swap aircraft before departure.',
        source:assignmentSourceText()
      });
      return;
    }

    setAnswer({
      kicker:'YOUR ASSIGNED AIRCRAFT',
      headline:'We found your airplane: ' + tail + '.',
      summary:'It is reporting a live position, but its current airport-to-airport leg is not available yet.',
      pills,
      next:'What happens next: we’ll keep checking this aircraft’s route and the airline assignment.',
      source:assignmentSourceText()
    });
  }

  function renderAssignedNoPosition(assignment, data) {
    const tail = assignment?.tailNumber;
    const route = assignmentRoute(assignment);
    const delay = delayLabel(assignment);
    const seen = data?.status === 'seen-no-position';
    const onGround = data?.aircraft?.onGround === true;
    setAnswer({
      kicker:'YOUR ASSIGNED AIRCRAFT',
      headline:onGround
        ? 'Your plane is assigned and on the ground.'
        : 'Your plane is assigned, but we can’t map it live right now.',
      summary:onGround
        ? 'The assigned aircraft is ' + tail + '. It is currently reported on the ground, so there is no airborne route to show yet.'
        : seen
          ? 'The ADS-B network is seeing ' + tail + ', but it does not currently have a usable position to put on the map.'
          : 'The assigned aircraft is ' + tail + '. It may be parked at a gate, outside coverage, or between usable position reports.',
      pills:[route,delay,tail,assignment?.equipment?.name].filter(Boolean),
      next:'What happens next: we’ll keep checking ' + tail + '. If it starts reporting a usable position, this page will update automatically.',
      source:assignmentSourceText()
    });
    clearLiveMap();
    flightLabel.textContent = tail || assignment?.flightNumber || 'Assigned aircraft';
    routeLabel.textContent = seen && data?.aircraft?.onGround ? 'Aircraft seen · on ground' : 'No current position';
    detailLabel.textContent = [data?.aircraft?.aircraftTypeName,tail].filter(Boolean).join(' · ');
    freshness.textContent = data?.aircraft?.lastSeenSeconds != null ? formatAge(data.aircraft.lastSeenSeconds) : '';
  }

  function renderRouteChoices(data) {
    routeChoices.replaceChildren();
    routeChoices.hidden = false;
    setAnswer({
      kicker:'WHICH FLIGHT IS YOURS?',
      headline:'Choose the city pair and departure time on your ticket.',
      summary:'This flight number is used for more than one leg today. We need the exact leg so we follow the right airplane.',
      pills:[],
      source:'Flight occurrence data: FlightStats public tracker.'
    });

    for (const option of data.options || []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'route-choice';

      const kicker = document.createElement('span');
      kicker.className = 'route-choice-kicker';
      kicker.textContent = 'YOUR FLIGHT';

      const time = document.createElement('strong');
      time.className = 'route-choice-time';
      const dep = [option.departureTime,option.departureAmPm,option.departureTimezone].filter(Boolean).join(' ');
      time.textContent = dep || option.sortTime || 'Departure time unavailable';

      const cities = document.createElement('span');
      cities.className = 'route-choice-cities';
      cities.textContent = airportChoiceText(option.origin) + ' → ' + airportChoiceText(option.destination);

      const codes = document.createElement('span');
      codes.className = 'route-choice-codes';
      codes.textContent = [airportCodeAny(option.origin),airportCodeAny(option.destination)].filter(Boolean).join(' → ');

      button.append(kicker,time,cities,codes);
      button.addEventListener('click',() => {
        activeFlightId = option.flightId;
        routeChoices.hidden = true;
        syncUrl();
        loadAssignment(activeFlight,activeDate,activeFlightId,{silent:false});
      });
      routeChoices.appendChild(button);
    }
  }

  async function loadRegistration(registration, {silent=false}={}) {
    if (!registration) return;
    if (silent && refreshInFlight) return;
    activeLiveKey = 'registration:' + registration;
    if (silent) refreshInFlight = true;
    const sequence = ++requestSequence;

    try {
      const response = await fetch('/api/flight-tracker?registration=' + encodeURIComponent(registration), {headers:{accept:'application/json'}});
      const data = await response.json();
      if (sequence !== requestSequence || assignedTail !== registration) return;
      if (data.status === 'live') {
        renderLive(data);
        if (assignmentData) renderInboundAnswer(assignmentData,data);
      } else if (!(silent && holdLastLiveOnRefreshMiss(data))) {
        if (assignmentData) renderAssignedNoPosition(assignmentData,data);
      }
    } catch {
      if (sequence !== requestSequence || assignedTail !== registration) return;
      if (!(silent && holdLastLiveOnRefreshMiss({status:'error'})) && assignmentData) {
        renderAssignedNoPosition(assignmentData,{status:'not-found'});
      }
    } finally {
      if (silent) refreshInFlight = false;
    }
  }

  async function loadAssignment(flight, date, flightId=null, {silent=false}={}) {
    if (!flight || !date) return;
    if (silent && assignmentInFlight) return;
    if (silent) assignmentInFlight = true;
    if (!silent) {
      submit.disabled = true;
      submit.textContent = 'FINDING…';
      setMessage('Finding the aircraft assigned to your flight…');
      routeChoices.hidden = true;
    }

    const params = new URLSearchParams({flight,date});
    if (flightId) params.set('flightId',flightId);

    try {
      const response = await fetch('/api/flight-assignment?' + params.toString(), {headers:{accept:'application/json'}});
      const data = await response.json();
      if (activeFlight !== flight || activeDate !== date) return;

      if (data.status === 'choose-flight') {
        renderRouteChoices(data);
        submit.disabled = false;
        submit.textContent = 'FIND MY PLANE';
        return;
      }

      if (data.status !== 'found') {
        if (!silent) {
          setAnswer({
            kicker:'AIRCRAFT ASSIGNMENT UNAVAILABLE',
            headline:'We could not identify the aircraft assigned to this scheduled flight yet.',
            summary:data.message || 'Live tracking will still work once the flight itself is airborne.',
            pills:[activeFlight,activeDate],
            source:'Live-flight fallback: ADSB.lol.'
          });
          loadFlight(activeFlight,{silent:false});
        }
        return;
      }

      const priorTail = assignedTail;
      assignmentData = data;
      activeFlightId = data.flightId || activeFlightId;
      assignedTail = data.tailNumber || null;
      assignmentChangedFrom = priorTail && assignedTail && priorTail !== assignedTail ? priorTail : null;
      syncUrl();
      renderAssignmentBase(data);
      submit.disabled = false;
      submit.textContent = 'FIND MY PLANE';
      setMessage('', 'neutral');

      if (assignmentChangedFrom) {
        resetHeldLive();
        clearLiveMap();
      }

      if (assignedTail) {
        await loadRegistration(assignedTail,{silent});
      } else if (data.flightStatus?.airborne) {
        await loadFlight(activeFlight,{silent});
      } else if (!silent) {
        clearLiveMap();
      }
    } catch {
      if (!silent) {
        setAnswer({
          kicker:'AIRCRAFT ASSIGNMENT UNAVAILABLE',
          headline:'The assignment source is temporarily unavailable.',
          summary:'We can still look for your flight itself if it is already airborne.',
          pills:[activeFlight,activeDate],
          source:'Live-flight fallback: ADSB.lol.'
        });
        await loadFlight(activeFlight,{silent:false});
      }
    } finally {
      if (silent) assignmentInFlight = false;
      submit.disabled = false;
      submit.textContent = 'FIND MY PLANE';
    }
  }

  async function loadFlight(flight, {silent=false}={}) {
    const normalized = clean(flight);
    if (!normalized) return;
    if (silent && refreshInFlight) return;

    activeFlight = normalized;
    activeLiveKey = 'flight:' + normalized;
    if (!silent) {
      resetHeldLive();
      submit.disabled = true;
      submit.textContent = 'FINDING…';
      setMessage('Finding the live aircraft…');
    }

    const sequence = ++requestSequence;
    if (silent) refreshInFlight = true;

    try {
      const response = await fetch('/api/flight-tracker?flight=' + encodeURIComponent(normalized), {
        headers:{accept:'application/json'}
      });
      const data = await response.json();

      if (sequence !== requestSequence || activeFlight !== normalized) return;
      if (data.status === 'live') {
        renderLive(data);
      } else if (!(silent && holdLastLiveOnRefreshMiss(data))) {
        renderUnavailable(data);
        if (!silent) resetHeldLive();
      }
    } catch {
      if (sequence !== requestSequence || activeFlight !== normalized) return;
      if (!(silent && holdLastLiveOnRefreshMiss({status:'error'}))) {
        submit.disabled = false;
        submit.textContent = 'FIND MY PLANE';
        setMessage('Live aircraft data is temporarily unavailable.', 'error');
      }
    } finally {
      if (silent) refreshInFlight = false;
    }
  }

  function refreshCurrentAircraft() {
    if (document.hidden) return;
    if (assignedTail) loadRegistration(assignedTail,{silent:true});
    else if (activeFlight) loadFlight(activeFlight,{silent:true});
  }

  function beginRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(refreshCurrentAircraft,10000);

    if (assignmentTimer) clearInterval(assignmentTimer);
    assignmentTimer = setInterval(() => {
      if (!document.hidden && activeFlight && activeDate) {
        loadAssignment(activeFlight,activeDate,activeFlightId,{silent:true});
      }
    },60000);
  }

  async function startJourney(flight,date,flightId=null) {
    if (refreshTimer) clearInterval(refreshTimer);
    if (assignmentTimer) clearInterval(assignmentTimer);
    resetHeldLive();
    requestSequence++;
    refreshInFlight = false;
    assignmentInFlight = false;
    assignmentData = null;
    assignedTail = null;
    assignmentChangedFrom = null;
    activeFlight = clean(flight);
    activeDate = date || localDateString();
    activeFlightId = flightId || null;
    activeLiveKey = null;
    input.value = activeFlight;
    dateInput.value = activeDate;
    syncUrl();
    hideAnswer();
    clearLiveMap();
    await loadAssignment(activeFlight,activeDate,activeFlightId,{silent:false});
    beginRefresh();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const value = clean(input.value);
    const date = dateInput.value || localDateString();
    if (!value) {
      input.focus();
      setMessage('Enter a flight number like DL1234.');
      return;
    }
    startJourney(value,date,null);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !activeFlight) return;
    if (activeDate) loadAssignment(activeFlight,activeDate,activeFlightId,{silent:true});
    refreshCurrentAircraft();
  });

  const params = new URLSearchParams(location.search);
  const initial = clean(params.get('flight'));
  const initialDate = params.get('date') || localDateString();
  const initialFlightId = params.get('flightId');
  dateInput.value = initialDate;
  if (initial) {
    startJourney(initial,initialDate,initialFlightId);
  }
})();
