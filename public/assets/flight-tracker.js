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
  const answerJourney = document.getElementById('answer-journey');
  const answerMeta = document.getElementById('answer-meta');
  const answerSource = document.getElementById('answer-source');
  const answerNext = document.getElementById('answer-next');
  const answerDelay = document.getElementById('answer-delay');
  const tripTimeline = document.getElementById('trip-timeline');
  const flightActions = document.getElementById('flight-actions');
  const watchButton = document.getElementById('watch-flight');
  const shareButton = document.getElementById('share-flight');
  const addConnectionButton = document.getElementById('add-connection');
  const actionMessage = document.getElementById('flight-action-message');
  const connectionPanel = document.getElementById('connection-panel');
  const connectionForm = document.getElementById('connection-form');
  const connectionFlightInput = document.getElementById('connection-flight');
  const connectionDateInput = document.getElementById('connection-date');
  const connectionResult = document.getElementById('connection-result');
  const reliabilityPanel = document.getElementById('reliability-panel');
  const reliabilityOnTime = document.getElementById('reliability-ontime');
  const reliabilityDelay = document.getElementById('reliability-delay');
  const reliabilityCancel = document.getElementById('reliability-cancel');
  const reliabilityContext = document.getElementById('reliability-context');
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
  let operatingOccurrenceCacheKey = null;
  let operatingOccurrenceCacheValue = null;
  let operatingOccurrenceCacheAt = 0;
  let currentUnifiedPayload = null;
  let activeConnectionSpec = null;
  let connectionRequestSequence = 0;
  let reliabilityFetchKey = '';
  let reliabilityFetchAt = 0;
  const WATCH_STORAGE_PREFIX = 'flight-tracker:v3:watch:';
  const HOLD_LAST_LIVE_MS = 5 * 60 * 1000;
  const LIVE_POSITION_MAX_AGE_SECONDS = 15 * 60;
  const LAST_KNOWN_MAX_AGE_MS = 12 * 60 * 60 * 1000;
  const LAST_KNOWN_STORAGE_PREFIX = 'flight-tracker:last-known:';
  const OPERATING_OCCURRENCE_CACHE_MS = 45 * 1000;

  const $ = value => value == null || value === '' ? null : value;
  const PASSWORD_MANAGER_ARTIFACT = '1Password menu is available';

  function stripPasswordManagerArtifacts(root=document.body) {
    if (!root || typeof document.createTreeWalker !== 'function') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (String(node.nodeValue || '').includes(PASSWORD_MANAGER_ARTIFACT)) {
        node.nodeValue = String(node.nodeValue || '').replaceAll(PASSWORD_MANAGER_ARTIFACT,'').trim();
      }
    }
  }

  stripPasswordManagerArtifacts();
  const artifactObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (String(node.nodeValue || '').includes(PASSWORD_MANAGER_ARTIFACT)) {
            node.nodeValue = String(node.nodeValue || '').replaceAll(PASSWORD_MANAGER_ARTIFACT,'').trim();
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          stripPasswordManagerArtifacts(node);
        }
      }
    }
  });
  if (document.body) artifactObserver.observe(document.body,{childList:true,subtree:true,characterData:true});

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

  function formatClock(iso, timezone) {
    const date = new Date(iso || '');
    if (!Number.isFinite(date.getTime())) return null;
    try {
      return new Intl.DateTimeFormat('en-US',{
        hour:'numeric',
        minute:'2-digit',
        timeZone:timezone || undefined,
        timeZoneName:'short'
      }).format(date);
    } catch {
      return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(date);
    }
  }

  function scheduledDepartureClock(assignment) {
    const iso = assignment?.schedule?.estimatedDepartureUTC || assignment?.schedule?.scheduledDepartureUTC;
    return formatClock(iso, assignment?.origin?.timezone) || scheduledTimeLabel(assignment?.origin);
  }

  function completedArrivalClock(occurrence) {
    const iso = occurrence?.schedule?.actualArrivalUTC || occurrence?.schedule?.estimatedArrivalUTC;
    return formatClock(iso, occurrence?.destination?.timezone) || scheduledTimeLabel(occurrence?.destination);
  }

  function minutesBetween(startIso, endIso) {
    const start = Date.parse(startIso || '');
    const end = Date.parse(endIso || '');
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return Math.round((end - start) / 60000);
  }

  function scheduledTurnMinutes(assignment, inbound) {
    const minutes = minutesBetween(inbound?.schedule?.scheduledArrivalUTC, assignment?.schedule?.scheduledDepartureUTC);
    return Number.isFinite(minutes) && minutes >= 0 && minutes <= 360 ? minutes : null;
  }

  function inboundArrivalDelayMinutes(inbound) {
    const explicit = inbound?.flightStatus?.arrivalDelayMinutes;
    if (Number.isFinite(explicit)) return Math.max(0,Math.round(explicit));
    const minutes = minutesBetween(inbound?.schedule?.scheduledArrivalUTC, inbound?.schedule?.estimatedArrivalUTC);
    return Number.isFinite(minutes) ? Math.max(0,minutes) : null;
  }

  function previousLegStory(assignment, previous) {
    if (!previous?.origin) return null;
    const tail = assignment?.tailNumber || previous?.tailNumber || 'Your plane';
    const from = airportPlace(previous.origin);
    const flight = previous?.flightNumber ? ' (' + previous.flightNumber + ')' : '';
    const landedAt = completedArrivalClock(previous);
    return tail + ' arrived from ' + from + flight + (landedAt ? ' at ' + landedAt : '') + '.';
  }

  function departureDelayMinutes(assignment) {
    const explicit = assignment?.flightStatus?.departureDelayMinutes;
    if (Number.isFinite(explicit)) return Math.max(0,Math.round(explicit));
    const texts = [
      assignment?.flightStatus?.description,
      assignment?.flightStatus?.label
    ].filter(Boolean);
    for (const text of texts) {
      const match = String(text).match(/delay(?:ed)?(?:\s+by)?\s*(\d{1,3})\s*m(?:in(?:ute)?s?)?/i);
      if (match) return Number(match[1]);
    }
    return null;
  }

  function delayWhyText(assignment, inbound) {
    const departureDelay = departureDelayMinutes(assignment);
    if (!Number.isFinite(departureDelay) || departureDelay <= 0 || !inbound) return '';

    const late = inboundArrivalDelayMinutes(inbound);
    const turn = scheduledTurnMinutes(assignment,inbound);
    const from = inbound?.origin ? airportPlace(inbound.origin) : null;
    const flight = inbound?.flightNumber ? ' on ' + inbound.flightNumber : '';
    const landedAt = completedArrivalClock(inbound);
    const inboundLanded = inbound?.flightStatus?.landed === true;

    let first = '';
    if (Number.isFinite(late) && late > 0) {
      first = (inboundLanded ? 'Your plane arrived ' : 'Your inbound plane is running about ') +
        late + ' min late' + (from ? ' from ' + from : '') + flight + '.';
    } else if (Number.isFinite(late)) {
      first = (inboundLanded ? 'Your plane arrived' : 'Your inbound plane is coming') +
        (from ? ' from ' + from : '') + flight +
        (landedAt && inboundLanded ? ' at ' + landedAt : '') +
        ' with no recorded inbound arrival delay.';
    } else {
      first = 'Your flight is delayed ' + departureDelay + ' min. ' +
        (inboundLanded ? 'Your plane arrived' : 'Your inbound plane is coming') +
        (from ? ' from ' + from : '') + flight +
        (landedAt && inboundLanded ? ' at ' + landedAt : '') + '.';
    }

    if (Number.isFinite(turn)) {
      const second = 'Scheduled turn is ' + turn + ' min.';
      if (Number.isFinite(late) && late === 0) {
        return first + ' ' + second + ' The inbound arrival alone does not explain the full departure delay.';
      }
      return first + ' ' + second;
    }

    return first + ' The published flight data does not expose a reliable scheduled turn here, so we cannot prove how much of the delay came from the inbound aircraft.';
  }

  function inboundLandingClock(assignment, inbound, live) {
    const sourceIso = inbound?.schedule?.estimatedArrivalUTC;
    const sourceClock = formatClock(sourceIso, assignment?.origin?.timezone);
    if (sourceClock) return sourceClock;
    const eta = live?.progress?.landingEstimate;
    if (!eta || !Number.isFinite(eta.minMinutes) || !Number.isFinite(eta.maxMinutes)) return null;
    const midpoint = Math.max(0,(eta.minMinutes + eta.maxMinutes) / 2);
    return formatClock(Date.now() + midpoint * 60000, assignment?.origin?.timezone);
  }

  function inboundTimingText(assignment, inbound, live) {
    const arrival = inboundLandingClock(assignment,inbound,live);
    const departure = scheduledDepartureClock(assignment);
    if (arrival && departure) return 'Your plane lands about ' + arrival + '; your flight departs ' + departure + '.';
    if (arrival) return 'Your plane lands about ' + arrival + '.';
    if (departure) return 'Your flight departs ' + departure + '.';
    return '';
  }

  function statusCheckedClock(assignment) {
    return formatClock(assignment?.fetchedAt, assignment?.origin?.timezone);
  }

  function unresolvedStatusIsStale(assignment) {
    if (!assignment || assignment?.flightStatus?.canceled ||
        assignment?.flightStatus?.airborne || assignment?.flightStatus?.landed) return false;
    const departure = Date.parse(
      assignment?.schedule?.estimatedDepartureUTC ||
      assignment?.schedule?.scheduledDepartureUTC ||
      ''
    );
    return Number.isFinite(departure) && Date.now() > departure + 90 * 60 * 1000;
  }

  function delayLabel(assignment) {
    if (assignment?.flightStatus?.canceled) return 'Canceled';
    if (unresolvedStatusIsStale(assignment)) {
      const checked = statusCheckedClock(assignment);
      return 'Status may be stale' + (checked ? ' · checked ' + checked : '');
    }
    const mins = departureDelayMinutes(assignment);
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

  function compactRoute(origin, destination) {
    const from = airportCodeAny(origin);
    const to = airportCodeAny(destination);
    return from && to ? from + ' → ' + to : null;
  }

  function journeySecondary(parts) {
    return parts.filter(Boolean).join(' · ');
  }

  function renderAnswerJourney(journey) {
    answerJourney.replaceChildren();
    if (!journey?.now?.primary || !journey?.next?.primary) {
      answerJourney.hidden = true;
      return;
    }

    const makeStep = (label, step, className='') => {
      const wrap = document.createElement('div');
      wrap.className = 'journey-step' + (className ? ' ' + className : '');

      const kicker = document.createElement('span');
      kicker.className = 'journey-label';
      kicker.textContent = label;

      const primary = document.createElement('strong');
      primary.className = 'journey-primary';
      primary.textContent = step.primary;

      wrap.append(kicker,primary);

      if (step.secondary) {
        const secondary = document.createElement('span');
        secondary.className = 'journey-secondary';
        secondary.textContent = step.secondary;
        wrap.appendChild(secondary);
      }

      return wrap;
    };

    const arrow = document.createElement('span');
    arrow.className = 'journey-arrow';
    arrow.setAttribute('aria-hidden','true');
    arrow.textContent = '→';

    answerJourney.append(
      makeStep('NOW', journey.now),
      arrow,
      makeStep('YOUR FLIGHT', journey.next, 'is-next')
    );
    answerJourney.hidden = false;
  }

  function setAnswer({kicker='INBOUND AIRCRAFT',headline,summary='',journey=null,pills=[],next='',delayWhy='',source=''}) {
    answerCard.hidden = false;
    answerKicker.textContent = kicker;
    answerHeadline.textContent = headline || 'Checking your aircraft…';
    answerSummary.textContent = summary || '';
    renderAnswerJourney(journey);
    clearAnswerMeta();
    pills.filter(Boolean).forEach(addAnswerPill);
    answerNext.textContent = next || '';
    answerNext.hidden = !next;
    answerDelay.textContent = delayWhy ? 'Why is my flight delayed? ' + delayWhy : '';
    answerDelay.hidden = !delayWhy;
    answerSource.textContent = source || '';
  }

  function hideAnswer() {
    answerCard.hidden = true;
    answerJourney.hidden = true;
    tripTimeline.hidden = true;
    tripTimeline.replaceChildren();
    answerNext.hidden = true;
    answerDelay.hidden = true;
    flightActions.hidden = true;
    actionMessage.hidden = true;
    connectionPanel.hidden = true;
    connectionResult.hidden = true;
    reliabilityPanel.hidden = true;
    routeChoices.hidden = true;
    routeChoices.replaceChildren();
  }

  function assignmentRoute(assignment) {
    if (!assignment?.origin || !assignment?.destination) return null;
    const from = airportCodeAny(assignment.origin);
    const to = airportCodeAny(assignment.destination);
    return from && to ? from + ' → ' + to : null;
  }

  function assignmentArrivalConfirmed(assignment) {
    return assignment?.flightStatus?.landed === true ||
      Boolean(String(assignment?.schedule?.actualArrivalUTC || '').trim());
  }

  function assignmentSourceText(assignment=assignmentData) {
    if (assignment?.source?.kind === 'direct-live-callsign') {
      return 'Live aircraft position: ADSB.lol. This airborne flight is being tracked directly by its operating callsign.';
    }
    if (assignment?.codeshare?.operatingFlightNumber) {
      return 'Codeshare resolved: ' + assignment.codeshare.marketingFlightNumber + ' → ' +
        assignment.codeshare.operatingFlightNumber + '. Aircraft status/assignment: public flight sources. Live aircraft position: ADSB.lol.';
    }
    return 'Aircraft assignment/status: FlightStats public tracker. Live aircraft position: ADSB.lol. Airline aircraft assignments can change before departure.';
  }

  function codesharePill(assignment) {
    const marketing=clean(assignment?.marketingFlightNumber || assignment?.flightNumber);
    const operating=clean(assignment?.operatingFlightNumber);
    return operating && marketing && operating !== marketing ? 'Operated as ' + operating : null;
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
  function flightNumberSuffix(value) {
    const match = clean(value).match(/(\d{1,4}[A-Z]?)$/);
    return match ? match[1] : null;
  }

  function confirmedOccurrenceRoute(assignment, live) {
    const occurrence = assignment?.currentAircraftOccurrence;
    if (!occurrence?.origin || !occurrence?.destination) return null;
    if (occurrence?.flightStatus?.airborne !== true || occurrence?.flightStatus?.landed === true) return null;

    const assignmentTail = clean(assignment?.tailNumber);
    const occurrenceTail = clean(occurrence?.tailNumber);
    const liveTail = clean(live?.aircraft?.registration);
    if (!assignmentTail || occurrenceTail !== assignmentTail || liveTail !== assignmentTail) return null;

    const marketingNumber = flightNumberSuffix(assignment?.flightNumber);
    const callsignNumber = flightNumberSuffix(live?.aircraft?.callsign);
    if (!marketingNumber || !callsignNumber || marketingNumber !== callsignNumber) return null;

    return {
      origin:occurrence.origin,
      destination:occurrence.destination,
      confirmedBy:'same-day-same-flight-same-tail-airborne'
    };
  }

  function assignmentInboundOccurrence(assignment) {
    const occurrence = assignment?.recentInboundOccurrence;
    if (!occurrence?.origin || !occurrence?.destination) return null;
    if (occurrence?.flightStatus?.airborne !== true || occurrence?.flightStatus?.landed === true) return null;
    if (clean(occurrence?.tailNumber) !== clean(assignment?.tailNumber)) return null;
    if (!sameAirport(occurrence.destination, assignment?.origin)) return null;
    return occurrence;
  }

  function assignmentInboundOccurrenceRoute(assignment, live) {
    const occurrence = assignmentInboundOccurrence(assignment);
    if (!occurrence) return null;
    const liveTail = clean(live?.aircraft?.registration);
    if (liveTail && liveTail !== clean(assignment?.tailNumber)) return null;
    const operatingFlight = clean(live?.operatingFlightNumber);
    if (operatingFlight && clean(occurrence.flightNumber) !== operatingFlight) return null;
    return {
      origin:occurrence.origin,
      destination:occurrence.destination,
      confirmedBy:'recent-arrival-same-tail-at-origin'
    };
  }

  function resolvedCurrentRoute(assignment, live) {
    if (live?.route?.origin && live?.route?.destination) return live.route;
    return crossFlightOccurrenceRoute(live) ||
      assignmentInboundOccurrenceRoute(assignment, live) ||
      confirmedOccurrenceRoute(assignment, live);
  }


  function crossFlightOccurrenceRoute(live) {
    const occurrence = live?.confirmedOperatingOccurrence;
    if (!occurrence?.origin || !occurrence?.destination) return null;
    if (occurrence?.flightStatus?.airborne !== true || occurrence?.flightStatus?.landed === true) return null;
    return {
      origin:occurrence.origin,
      destination:occurrence.destination,
      confirmedBy:'live-callsign-same-tail-airborne-occurrence'
    };
  }

  function operatingOccurrenceMatches(detail, assignment, live) {
    if (detail?.status !== 'found') return false;
    if (clean(detail?.flightNumber) !== clean(live?.operatingFlightNumber)) return false;
    if (clean(detail?.tailNumber) !== clean(assignment?.tailNumber)) return false;
    if (clean(live?.aircraft?.registration) !== clean(assignment?.tailNumber)) return false;
    if (detail?.flightStatus?.airborne !== true || detail?.flightStatus?.landed === true) return false;
    if (!sameAirport(detail?.destination, assignment?.origin)) return false;
    return true;
  }

  async function resolveOperatingOccurrence(assignment, live) {
    const operatingFlight = clean(live?.operatingFlightNumber);
    const passengerFlight = clean(assignment?.flightNumber);
    if (!operatingFlight || operatingFlight === passengerFlight) return null;
    if (assignment?.flightStatus?.airborne === true || live?.aircraft?.onGround === true) return null;
    if (!activeDate || !assignment?.tailNumber || !assignment?.origin) return null;

    const key = [operatingFlight,clean(assignment.tailNumber),airportCodeAny(assignment.origin),activeDate].join('|');
    if (key === operatingOccurrenceCacheKey && Date.now() - operatingOccurrenceCacheAt < OPERATING_OCCURRENCE_CACHE_MS) {
      return operatingOccurrenceCacheValue;
    }

    let match = null;
    try {
      const baseParams = new URLSearchParams({flight:operatingFlight,date:activeDate});
      const baseResponse = await fetch('/api/flight-assignment?' + baseParams.toString(), {headers:{accept:'application/json'}});
      const base = await baseResponse.json();

      if (operatingOccurrenceMatches(base, assignment, live)) {
        match = base;
      } else if (base?.status === 'choose-flight') {
        const options = Array.isArray(base.options) ? base.options.slice(0,8) : [];
        const details = await Promise.all(options.map(async option => {
          try {
            const params = new URLSearchParams({flight:operatingFlight,date:activeDate,flightId:option.flightId});
            const response = await fetch('/api/flight-assignment?' + params.toString(), {headers:{accept:'application/json'}});
            return await response.json();
          } catch {
            return null;
          }
        }));
        const matches = details.filter(detail => operatingOccurrenceMatches(detail, assignment, live));
        if (matches.length === 1) match = matches[0];
      }
    } catch {
      match = null;
    }

    operatingOccurrenceCacheKey = key;
    operatingOccurrenceCacheValue = match;
    operatingOccurrenceCacheAt = Date.now();
    return match;
  }


  function carrierCodeFromFlight(value) {
    const compact = clean(value);
    return compact.length >= 2 ? compact.slice(0,2) : null;
  }

  function lastKnownStorageKey(registration) {
    const normalized = clean(registration);
    return normalized ? LAST_KNOWN_STORAGE_PREFIX + normalized : null;
  }

  function saveLastKnownSnapshot(data) {
    const registration = clean(data?.registration || data?.aircraft?.registration);
    if (!registration || !Number.isFinite(data?.aircraft?.lat) || !Number.isFinite(data?.aircraft?.lon)) return;
    const ageMs = Number.isFinite(data?.aircraft?.positionAgeSeconds)
      ? Math.max(0, data.aircraft.positionAgeSeconds * 1000)
      : 0;
    const snapshot = {
      version:1,
      registration,
      savedAt:Date.now(),
      reportedAt:Date.now() - ageMs,
      data:{
        registration,
        aircraft:data.aircraft,
        route:data.route || null,
        focusAirportRelationship:data.focusAirportRelationship || null,
        operatingFlightNumber:data.operatingFlightNumber || null,
        confirmedOperatingOccurrence:data.confirmedOperatingOccurrence || null,
        progress:data.progress || null,
        positionFresh:data.positionFresh === true
      }
    };
    try {
      localStorage.setItem(lastKnownStorageKey(registration), JSON.stringify(snapshot));
    } catch {}
  }

  function loadLastKnownSnapshot(registration) {
    const key = lastKnownStorageKey(registration);
    if (!key) return null;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      if (!parsed || parsed.version !== 1 || clean(parsed.registration) !== clean(registration)) return null;
      if (!Number.isFinite(parsed.reportedAt) || Date.now() - parsed.reportedAt > LAST_KNOWN_MAX_AGE_MS) return null;
      if (!Number.isFinite(parsed?.data?.aircraft?.lat) || !Number.isFinite(parsed?.data?.aircraft?.lon)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async function resolveRecentInboundOccurrence(assignment) {
    const existing = assignment?.recentInboundOccurrence;
    if (existing && clean(existing?.tailNumber) === clean(assignment?.tailNumber) &&
        sameAirport(existing?.destination, assignment?.origin)) return existing;
    if (!assignment?.tailNumber || !assignment?.origin || activeDate !== localDateString()) return null;
    const carrier = carrierCodeFromFlight(assignment.flightNumber);
    const airport = airportCodeAny(assignment.origin);
    if (!carrier || !airport) return null;
    try {
      const params = new URLSearchParams({
        tail:assignment.tailNumber,
        airport,
        carrier
      });
      const response = await fetch('/api/flight-assignment?' + params.toString(), {headers:{accept:'application/json'}});
      const result = await response.json();
      if (result?.status !== 'found-inbound-occurrence') return null;
      const occurrence = result.occurrence;
      if (clean(occurrence?.tailNumber) !== clean(assignment.tailNumber)) return null;
      if (!sameAirport(occurrence?.destination, assignment.origin)) return null;
      return occurrence;
    } catch {
      return null;
    }
  }

  function attachInboundOccurrence(assignment, occurrence) {
    if (!assignment || !occurrence) return assignment;
    const enriched = {...assignment,recentInboundOccurrence:occurrence};
    if (occurrence?.flightStatus?.landed === true) enriched.previousAircraftOccurrence = occurrence;
    return enriched;
  }

  function snapshotFromAircraftData(data) {
    const ac = data?.aircraft;
    if (!ac || !Number.isFinite(ac.lat) || !Number.isFinite(ac.lon)) return null;
    const ageMs = Number.isFinite(ac.positionAgeSeconds) ? Math.max(0, ac.positionAgeSeconds * 1000) : 0;
    return {
      version:1,
      registration:clean(data?.registration || ac.registration),
      savedAt:Date.now(),
      reportedAt:Date.now() - ageMs,
      data:{
        ...data,
        aircraft:{...ac}
      }
    };
  }

  function lastKnownAgeSeconds(snapshot) {
    return snapshot && Number.isFinite(snapshot.reportedAt)
      ? Math.max(0, Math.floor((Date.now() - snapshot.reportedAt) / 1000))
      : null;
  }

  function renderLastKnownPosition(assignment, snapshot) {
    const data = snapshot?.data;
    const ac = data?.aircraft;
    if (!ac || !Number.isFinite(ac.lat) || !Number.isFinite(ac.lon)) return false;

    const ageSeconds = lastKnownAgeSeconds(snapshot);
    if (Number.isFinite(ageSeconds) && ageSeconds <= LIVE_POSITION_MAX_AGE_SECONDS) {
      const recentData = {
        ...data,
        status:'live',
        registration:data?.registration || ac.registration,
        aircraft:{...ac,positionAgeSeconds:ageSeconds},
        positionFresh:true,
        progress:data?.progress || {
          phase:{code:'unknown',label:ac.onGround === true ? 'On ground' : 'Recent position'},
          remainingMiles:null,
          directDistanceMiles:null,
          directProgressPercent:null,
          remainingBasis:'straight-line',
          landingEstimate:null
        }
      };
      renderLive(recentData);
      renderInboundAnswer(assignment,recentData);
      setMessage('', 'neutral');
      return true;
    }
    const tail = assignment?.tailNumber || data.registration || ac.registration;
    const route = assignmentRoute(assignment);
    const delay = delayLabel(assignment);
    const focus = data?.focusAirportRelationship?.airport;
    const focusLabel = focusAirportLabel(data?.focusAirportRelationship);
    const currentRoute = data?.confirmedOperatingOccurrence?.origin && data?.confirmedOperatingOccurrence?.destination
      ? data.confirmedOperatingOccurrence
      : data?.route;
    const currentFlight = data?.confirmedOperatingOccurrence?.flightNumber || data?.operatingFlightNumber || null;
    const lastRoute = currentRoute?.origin && currentRoute?.destination
      ? compactRoute(currentRoute.origin,currentRoute.destination)
      : null;

    setAnswer({
      kicker:'LAST CONFIRMED AIRCRAFT POSITION',
      headline:'We still have the last confirmed position for ' + tail + '.',
      summary:'This is not a live location. The aircraft last reported ' +
        (Number.isFinite(ageSeconds) ? formatAge(ageSeconds).replace(/^Last position /,'') : 'earlier') +
        (focusLabel && Number.isFinite(data?.focusAirportRelationship?.distanceMiles)
          ? ', about ' + data.focusAirportRelationship.distanceMiles + ' miles from ' + focusLabel
          : '') + '.',
      journey:{
        now:{
          primary:[currentFlight || tail,lastRoute].filter(Boolean).join(' · '),
          secondary:'Last confirmed position · not live'
        },
        next:{
          primary:[assignment?.flightNumber,route].filter(Boolean).join(' · '),
          secondary:journeySecondary([scheduledTimeLabel(assignment?.origin),delay])
        }
      },
      pills:[delay,tail,assignment?.equipment?.name || assignment?.equipment?.code].filter(Boolean),
      next:'What happens next: we’ll keep checking for a new live report and for stronger airline evidence that the aircraft has arrived.',
      source:assignmentSourceText()
    });

    routeKey = '';
    originMarker = clearMarker(originMarker);
    destinationMarker = clearMarker(destinationMarker);
    if (map.getSource('flight-route')) map.getSource('flight-route').setData({type:'FeatureCollection',features:[]});

    if (!planeMarker) {
      planeMarker = new maplibregl.Marker({
        element:planeElement(),
        anchor:'center',
        rotationAlignment:'map',
        pitchAlignment:'map'
      }).setLngLat([ac.lon,ac.lat]).addTo(map);
    } else {
      planeMarker.setLngLat([ac.lon,ac.lat]);
    }
    planeMarker.getElement().classList.add('is-stale');
    if (Number.isFinite(ac.trackDegrees)) planeMarker.setRotation(ac.trackDegrees);

    if (focus && Number.isFinite(focus.lat) && Number.isFinite(focus.lon)) {
      destinationMarker = airportMarker('destination',focus,(airportCodeAny(focus) || 'Airport') + ' departure airport');
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([ac.lon,ac.lat]);
      bounds.extend([focus.lon,focus.lat]);
      map.fitBounds(bounds,{padding:{top:82,bottom:90,left:40,right:40},maxZoom:7,duration:500});
    } else {
      map.easeTo({center:[ac.lon,ac.lat],zoom:6,duration:500});
    }

    flightLabel.textContent = tail || 'Assigned aircraft';
    routeLabel.textContent = currentFlight && lastRoute ? currentFlight + ' · ' + lastRoute : 'Last confirmed position';
    routeCodes.textContent = '';
    detailLabel.textContent = [aircraftIdentity(ac),formatAltitude(ac.altitudeFeet)].filter(Boolean).join(' · ');
    freshness.textContent = Number.isFinite(ageSeconds) ? 'Last confirmed ' + formatAge(ageSeconds).replace(/^Last position /,'') : 'Last confirmed position';
    freshness.dataset.stale = 'true';
    glance.hidden = false;
    mapShell.classList.add('with-progress');
    phaseLabel.textContent = 'Last reported';
    distanceLabel.textContent = '—';
    landingLabel.textContent = 'Not current';
    glanceNote.hidden = false;
    glanceNote.textContent = 'The aircraft marker is the last confirmed position, not a live location.';
    progressBar.hidden = true;
    setMessage('Live position unavailable. Showing the last confirmed aircraft position.', 'warning');
    submit.disabled = false;
    submit.textContent = 'FIND MY PLANE';
    return true;
  }

  async function recoverNoPositionState(assignment, registration, data) {
    const occurrence = assignment?.recentInboundOccurrence || await resolveRecentInboundOccurrence(assignment);
    if (occurrence) {
      assignment = attachInboundOccurrence(assignment,occurrence);
      assignmentData = assignment;
    }
    if (occurrence?.flightStatus?.landed === true) {
      assignmentData = {...assignment,previousAircraftOccurrence:occurrence};
      return renderArrivedForTurn(assignmentData);
    }

    if (occurrence?.flightStatus?.airborne === true && occurrence?.flightStatus?.landed !== true) {
      const route = assignmentRoute(assignment);
      const currentRoute = compactRoute(occurrence.origin,occurrence.destination);
      const timing = inboundTimingText(assignment,occurrence,null);
      setAnswer({
        kicker:'THIS IS THE PLANE FOR YOUR FLIGHT',
        headline:'Your plane is still on the way to ' + airportPlace(assignment.origin) + '.',
        summary:registration + ' is operating ' + occurrence.flightNumber + ' ' + currentRoute +
          '. We can confirm the inbound flight, but we do not have a current live map position right now.' +
          (timing ? ' ' + timing : ''),
        journey:{
          now:{
            primary:[occurrence.flightNumber,currentRoute].filter(Boolean).join(' · '),
            secondary:journeySecondary([registration,inboundLandingClock(assignment,occurrence,null) ? 'Lands about ' + inboundLandingClock(assignment,occurrence,null) : 'inbound flight confirmed'])
          },
          next:{
            primary:[assignment.flightNumber,route].filter(Boolean).join(' · '),
            secondary:journeySecondary([scheduledDepartureClock(assignment),delayLabel(assignment)])
          }
        },
        pills:[delayLabel(assignment),registration,assignment?.equipment?.name || assignment?.equipment?.code].filter(Boolean),
        next:'What happens next: the inbound aircraft must land and complete its turn before your flight can leave.',
        delayWhy:delayWhyText(assignment,occurrence),
        source:assignmentSourceText()
      });
      clearLiveMap();
      flightLabel.textContent = registration;
      routeLabel.textContent = occurrence.flightNumber + ' · ' + currentRoute;
      detailLabel.textContent = 'Inbound flight confirmed · live position unavailable';
      freshness.textContent = occurrence?.flightStatus?.lastUpdatedText || '';
      freshness.dataset.stale = 'true';
      return true;
    }

    const responseSnapshot = snapshotFromAircraftData(data);
    if (responseSnapshot) return renderLastKnownPosition(assignment,responseSnapshot);

    const snapshot = loadLastKnownSnapshot(registration);
    if (snapshot) return renderLastKnownPosition(assignment,snapshot);

    renderAssignedNoPosition(assignment,data);
    return true;
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


  function reportAgeLead(value) {
    if (!Number.isFinite(value)) return 'Latest live report';
    if (value < 10) return 'Last reported just now';
    if (value < 60) return 'Last reported ' + Math.round(value) + ' seconds ago';
    const mins = Math.max(1, Math.round(value / 60));
    return 'Last reported ' + mins + (mins === 1 ? ' minute ago' : ' minutes ago');
  }

  function staleFixAgeText(observation) {
    const seconds = Number.isFinite(observation?.displayAgeSeconds)
      ? observation.displayAgeSeconds
      : observation?.fixAgeSeconds;
    if (!Number.isFinite(seconds)) return '';
    if (seconds < 60) return 'Last seen ' + Math.max(1,Math.round(seconds)) + ' sec ago';
    const minutes = Math.max(1,Math.round(seconds / 60));
    if (minutes < 90) return 'Last seen ' + minutes + (minutes === 1 ? ' min ago' : ' min ago');
    const hours = Math.max(1,Math.round(minutes / 60));
    return 'Last seen ' + hours + (hours === 1 ? 'h ago' : 'h ago');
  }

  function displayedPositionAge(live) {
    return Number.isFinite(live?.renderPositionAgeSeconds)
      ? live.renderPositionAgeSeconds
      : live?.aircraft?.positionAgeSeconds;
  }

  function focusAirportLabel(relationship) {
    const ap = relationship?.airport;
    if (!ap) return null;
    const place = airportPlace(ap);
    const code = airportCodeAny(ap);
    return code && place !== code ? place + ' (' + code + ')' : place;
  }


  function relationshipDistanceText(relationship, label) {
    if (!Number.isFinite(relationship?.distanceMiles) || !label) return null;
    const miles = relationship.distanceMiles;
    return 'about ' + miles + ' ' + (miles === 1 ? 'mile' : 'miles') + ' from ' + label;
  }

  function aircraftFactSentence(live) {
    const ac = live?.aircraft || {};
    const parts = [];
    const phase = live?.progress?.phase?.label;
    if (phase && !/unavailable|not current/i.test(phase)) parts.push(phase.toLowerCase());
    const altitude = formatAltitude(ac.altitudeFeet);
    if (altitude && ac.onGround !== true) parts.push('at ' + altitude);
    return parts.join(' ');
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
    phaseLabel.textContent = progress?.phase?.label || (data?.positionFresh ? 'Recent position' : 'Position not current');
    distanceLabel.textContent = Number.isFinite(progress?.remainingMiles)
      ? progress.remainingMiles.toLocaleString() + ' mi' : '—';
    const eta = progress?.landingEstimate;
    landingLabel.textContent = eta
      ? durationLabel(eta.minMinutes) + '–' + durationLabel(eta.maxMinutes)
      : (data?.positionFresh ? 'No useful estimate' : '—');

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
    if (assignmentData && renderArrivedForTurn(assignmentData)) {
      resetHeldLive();
      return true;
    }
    if (!activeLiveKey || lastLiveFlight !== activeLiveKey || !lastLiveSuccessAt) return false;
    const elapsedMs = Date.now() - lastLiveSuccessAt;
    if (elapsedMs < 0 || elapsedMs > HOLD_LAST_LIVE_MS) return false;

    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const baseAge = Number.isFinite(lastReportedAgeSeconds) ? lastReportedAgeSeconds : 0;
    const apparentAge = baseAge + elapsedSeconds;
    const meaningfullyStale = apparentAge > LIVE_POSITION_MAX_AGE_SECONDS;

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
    if (!data || data.positionFresh !== true) {
      const age = data?.aircraft?.positionAgeSeconds;
      renderUnavailable({
        flightNumber:data?.flightNumber || activeFlight,
        status:'stale-position',
        message:Number.isFinite(age)
          ? 'The newest aircraft position is stale (' + staleFixAgeText({fixAgeSeconds:age}) + '). It is not shown as live.'
          : 'No fresh aircraft position is available.'
      });
      return;
    }
    const ac = data.aircraft;
    lastLiveFlight = activeLiveKey || activeFlight;
    lastLiveSuccessAt = Date.now();
    lastReportedAgeSeconds = Number.isFinite(ac.positionAgeSeconds) ? ac.positionAgeSeconds : null;
    flightLabel.textContent = data.flightNumber || ac.callsign || 'Flight';
    if (data.route?.origin && data.route?.destination) {
      routeLabel.textContent = airportPlace(data.route.origin) + ' → ' + airportPlace(data.route.destination);
      routeCodes.textContent = airportCode(data.route.origin) + ' → ' + airportCode(data.route.destination);
    } else if (data.focusAirportRelationship?.airport) {
      const relationship = data.focusAirportRelationship;
      const focusLabel = focusAirportLabel(relationship);
      routeLabel.textContent = relationship.state === 'at-airport'
        ? 'At ' + focusLabel
        : (Number.isFinite(relationship.distanceMiles)
            ? 'About ' + relationship.distanceMiles + ' mi from ' + focusLabel
            : (ac.callsign ? 'Live aircraft · ' + ac.callsign : 'Live aircraft'));
      routeCodes.textContent = '';
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
    freshness.textContent = formatAge(displayedPositionAge(data));
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
    planeMarker.getElement().classList.remove('is-stale');
    if (Number.isFinite(ac.trackDegrees)) planeMarker.setRotation(ac.trackDegrees);
    saveLastKnownSnapshot(data);

    if (data.route) {
      if (map.isStyleLoaded()) drawRoute(data.route);
      else map.once('load', () => drawRoute(data.route));
    } else {
      routeKey = '';
      originMarker = clearMarker(originMarker);
      destinationMarker = clearMarker(destinationMarker);
      if (map.getSource('flight-route')) map.getSource('flight-route').setData({type:'FeatureCollection',features:[]});

      const focus = data.focusAirportRelationship?.airport;
      if (focus && Number.isFinite(focus.lat) && Number.isFinite(focus.lon)) {
        originMarker = airportMarker('origin', focus, (airportCodeAny(focus) || 'Departure airport') + ' departure airport');
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([ac.lon,ac.lat]);
        bounds.extend([focus.lon,focus.lat]);
        map.fitBounds(bounds,{padding:{top:76,bottom:90,left:36,right:36},maxZoom:8,duration:600});
      } else {
        map.easeTo({center:[ac.lon,ac.lat],zoom:7,duration:500});
      }
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

  function resetMapForLookup(flight) {
    clearLiveMap();
    flightLabel.textContent = clean(flight) || 'Flight';
    routeLabel.textContent = 'Checking current flight…';
    routeCodes.textContent = '';
    detailLabel.textContent = '';
    freshness.textContent = '';
    freshness.dataset.stale = 'false';
  }

  function resetMapForFailure(flight,label='No live position') {
    clearLiveMap();
    flightLabel.textContent = clean(flight) || 'Flight';
    routeLabel.textContent = label;
    routeCodes.textContent = '';
    detailLabel.textContent = '';
    freshness.textContent = '';
    freshness.dataset.stale = 'false';
  }

  function sameAirport(a, b) {
    const left = String(airportCodeAny(a) || '').toUpperCase();
    const right = String(airportCodeAny(b) || '').toUpperCase();
    return Boolean(left && right && left === right);
  }


  function landedPreviousAtOrigin(assignment) {
    const previous = assignment?.recentInboundOccurrence?.flightStatus?.landed === true
      ? assignment.recentInboundOccurrence
      : assignment?.previousAircraftOccurrence;
    if (!previous || previous?.flightStatus?.landed !== true) return null;
    if (!sameAirport(previous.destination, assignment?.origin)) return null;
    const assignedTail = clean(assignment?.tailNumber);
    const previousTail = clean(previous?.tailNumber);
    if (!assignedTail || assignedTail !== previousTail) return null;
    return previous;
  }

  function renderArrivedForTurn(assignment) {
    const previous = landedPreviousAtOrigin(assignment);
    if (!previous) return false;

    const tail = assignment?.tailNumber;
    const route = assignmentRoute(assignment);
    const delay = delayLabel(assignment);
    const originName = airportPlace(assignment?.origin);
    const originCode = airportCodeAny(assignment?.origin);
    const equipment = assignment?.equipment?.name || assignment?.equipment?.code;
    const dep = scheduledDepartureClock(assignment);
    const story = previousLegStory(assignment,previous);

    setAnswer({
      kicker:'THIS IS THE PLANE FOR YOUR FLIGHT',
      headline:(tail || 'Your plane') + ' is at the gate — live tracking starts at pushback.',
      summary:(story ? story + ' ' : '') +
        'It is still assigned to your ' + (route || 'next') + ' flight.',
      journey:{
        now:{
          primary:[tail,originCode ? 'at ' + originCode : 'at the gate'].filter(Boolean).join(' · '),
          secondary:journeySecondary([previous?.flightNumber ? 'Arrived on ' + previous.flightNumber : 'Previous flight landed',completedArrivalClock(previous)])
        },
        next:{
          primary:[assignment?.flightNumber,route].filter(Boolean).join(' · '),
          secondary:journeySecondary([dep,delay])
        }
      },
      pills:[delay,dep ? 'Departure ' + dep : null,tail,equipment].filter(Boolean),
      next:'The aircraft is parked at ' + originName + '. Live tracking starts again at pushback; the airline assignment can still change before departure.',
      delayWhy:delayWhyText(assignment,previous),
      source:assignmentSourceText()
    });

    clearLiveMap();
    flightLabel.textContent = tail || assignment?.flightNumber || 'Assigned aircraft';
    routeLabel.textContent = 'At ' + originName + (originCode ? ' (' + originCode + ')' : '');
    routeCodes.textContent = '';
    detailLabel.textContent = [equipment,tail].filter(Boolean).join(' · ');
    freshness.textContent = 'Previous flight confirmed landed';
    freshness.dataset.stale = 'false';
    glance.hidden = false;
    mapShell.classList.add('with-progress');
    phaseLabel.textContent = 'On ground · between flights';
    distanceLabel.textContent = '—';
    landingLabel.textContent = 'Already at departure airport';
    glanceNote.hidden = true;
    progressBar.hidden = true;
    setMessage('', 'neutral');
    return true;
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
    const identity = live?.aircraft?.aircraftTypeName || live?.aircraft?.aircraftType || assignment?.equipment?.name || assignment?.equipment?.code;
    const pills = [route, delay, codesharePill(assignment), tail, identity].filter(Boolean);
    const currentRoute = resolvedCurrentRoute(assignment, live);
    const currentLeg = currentRoute?.origin && currentRoute?.destination
      ? airportPlace(currentRoute.origin) + ' → ' + airportPlace(currentRoute.destination)
      : null;
    const recentInboundRoute = assignmentInboundOccurrenceRoute(assignment, live);
    const inboundOccurrence = live?.confirmedOperatingOccurrence ||
      (recentInboundRoute ? assignmentInboundOccurrence(assignment) : null) ||
      assignment?.currentAircraftOccurrence ||
      null;
    const currentOperatingFlight = inboundOccurrence?.flightNumber || null;
    const eta = live?.route ? live?.progress?.landingEstimate : null;
    const userOrigin = assignment?.origin;
    const inboundToOrigin = currentRoute?.destination && userOrigin && sameAirport(currentRoute.destination,userOrigin);
    const userFlightAirborne = assignment?.flightStatus?.airborne === true &&
      live?.reconciledState !== 'ground-live';

    if (!live?.route && currentRoute) {
      routeLabel.textContent = airportPlace(currentRoute.origin) + ' → ' + airportPlace(currentRoute.destination);
      routeCodes.textContent = airportCodeAny(currentRoute.origin) + ' → ' + airportCodeAny(currentRoute.destination);
    }

    if (userFlightAirborne) {
      setAnswer({
        kicker:'YOUR FLIGHT IS AIRBORNE',
        headline:'This is your aircraft in flight.',
        summary:currentLeg ? 'It is currently flying ' + currentLeg + '.' : 'Your aircraft is in the air, and we are tracking it.',
        pills,
        next:'What happens next: this page will keep following your flight to its destination.',
        source:assignmentSourceText()
      });
      return;
    }

    if (live?.aircraft?.onGround === true && !live?.reconciledState && landedPreviousAtOrigin(assignment)) {
      renderArrivedForTurn(assignment);
      return;
    }

    if (inboundToOrigin) {
      const originName = airportPlace(userOrigin);
      let summary = currentOperatingFlight && currentLeg
        ? tail + ' is currently operating ' + currentOperatingFlight + ' from ' + airportPlace(currentRoute.origin) + ' to ' + airportPlace(currentRoute.destination) + '.'
        : currentLeg
          ? 'It is currently flying ' + currentLeg + '.'
          : 'The aircraft is currently inbound to ' + originName + '.';
      const timing = inboundTimingText(assignment,inboundOccurrence,live);
      if (timing) summary += ' ' + timing;
      else if (eta) summary += ' From the latest live report, it is roughly ' + durationLabel(eta.minMinutes) + '–' + durationLabel(eta.maxMinutes) + ' from landing there.';
      if (assignmentChangedFrom) summary += ' The airline recently changed the assigned aircraft from ' + assignmentChangedFrom + ' to ' + tail + '.';
      const landingClock = inboundLandingClock(assignment,inboundOccurrence,live);
      setAnswer({
        kicker:'THIS IS THE PLANE FOR YOUR FLIGHT',
        headline:'Your plane is on the way to ' + originName + '.',
        summary,
        journey:{
          now:{
            primary:[currentOperatingFlight || tail,compactRoute(currentRoute?.origin,currentRoute?.destination)].filter(Boolean).join(' · '),
            secondary:journeySecondary([tail,landingClock ? 'Lands about ' + landingClock : (currentOperatingFlight ? 'airborne now' : 'inbound now')])
          },
          next:{
            primary:[assignment?.flightNumber,route].filter(Boolean).join(' · '),
            secondary:journeySecondary([scheduledDepartureClock(assignment),delay])
          }
        },
        pills,
        next:'What happens next: ' + tail + ' lands at ' + originName + ' → taxis to a gate → turns for your ' + (route || 'next') + ' flight.',
        delayWhy:delayWhyText(assignment,inboundOccurrence),
        source:assignmentSourceText()
      });
      return;
    }

    if (currentLeg) {
      setAnswer({
        kicker:'YOUR ASSIGNED AIRCRAFT',
        headline:'Your plane is currently flying ' + currentLeg + '.',
        summary:(currentOperatingFlight ? 'It is currently operating ' + currentOperatingFlight + '. ' : '') +
          'That is the aircraft currently assigned to your flight. It is not yet flying into ' + airportPlace(userOrigin) + ', so it may have another flight to make first, or the airline may swap aircraft before your departure.',
        journey:{
          now:{
            primary:[currentOperatingFlight || tail,compactRoute(currentRoute?.origin,currentRoute?.destination)].filter(Boolean).join(' · '),
            secondary:journeySecondary([tail,'airborne now'])
          },
          next:{
            primary:[assignment?.flightNumber,route].filter(Boolean).join(' · '),
            secondary:journeySecondary([scheduledTimeLabel(assignment?.origin),delay])
          }
        },
        pills,
        next:'What happens next: keep watching the assignment. This aircraft may make another flight first, or the airline may swap aircraft before departure.',
        source:assignmentSourceText()
      });
      return;
    }

    if (live?.aircraft?.onGround === true) {
      const relationship = live?.focusAirportRelationship;
      const focusLabel = focusAirportLabel(relationship);
      setAnswer({
        kicker:'YOUR ASSIGNED AIRCRAFT',
        headline:relationship?.state === 'at-airport' && focusLabel
          ? 'Your plane is on the ground at ' + focusLabel + '.'
          : 'Your assigned plane is on the ground.',
        summary:tail + ' is currently reporting on the ground and is assigned to your ' + (route || 'next') + ' flight.',
        journey:relationship?.state === 'at-airport'
          ? {
              now:{
                primary:[tail,'at ' + airportCodeAny(relationship.airport)].filter(Boolean).join(' · '),
                secondary:'On the ground'
              },
              next:{
                primary:[assignment?.flightNumber,route].filter(Boolean).join(' · '),
                secondary:journeySecondary([scheduledTimeLabel(assignment?.origin),delay])
              }
            }
          : null,
        pills,
        next:'What happens next: we’ll keep checking the aircraft assignment and watch for your flight to depart.',
        source:assignmentSourceText()
      });
      return;
    }

    const relationship = live?.focusAirportRelationship;
    const focusLabel = focusAirportLabel(relationship);
    const reportLead = reportAgeLead(displayedPositionAge(live));
    const fact = aircraftFactSentence(live);
    const distanceText = relationshipDistanceText(relationship, focusLabel);
    const reportDetails = [distanceText, fact].filter(Boolean).join(', ');

    if (relationship?.state === 'at-airport') {
      setAnswer({
        kicker:'THIS IS THE PLANE FOR YOUR FLIGHT',
        headline:'Your plane is on the ground at ' + focusLabel + '.',
        journey:{
          now:{
            primary:[tail,'at ' + airportCodeAny(relationship.airport)].filter(Boolean).join(' · '),
            secondary:'On the ground'
          },
          next:{
            primary:[assignment?.flightNumber,route].filter(Boolean).join(' · '),
            secondary:journeySecondary([scheduledTimeLabel(assignment?.origin),delay])
          }
        },
        summary:reportLead +
          (Number.isFinite(relationship.distanceMiles)
            ? ', about ' + relationship.distanceMiles + ' ' + (relationship.distanceMiles === 1 ? 'mile' : 'miles') + ' from the center of ' + (airportCodeAny(relationship.airport) || 'the airport')
            : '') + '. ' + tail + ' is on the ground at your departure airport.',
        pills,
        next:'What happens next: the aircraft is already at your departure airport. We’ll keep checking the airline assignment in case it changes before your flight.',
        source:assignmentSourceText()
      });
      return;
    }

    if (relationship?.state === 'approaching') {
      setAnswer({
        kicker:'THIS IS THE PLANE FOR YOUR FLIGHT',
        headline:'Your plane appears to be approaching ' + focusLabel + '.',
        summary:reportLead + (reportDetails ? ', ' + reportDetails : '') +
          '. Its latest movement is generally toward your departure airport, but we have not yet confirmed the origin of its current flight.',
        pills,
        next:'What happens next: keep this page open. We’ll keep tracking the aircraft and replace this position-based read with the confirmed current trip as soon as we can verify it.',
        source:assignmentSourceText()
      });
      return;
    }

    if (relationship?.state === 'moving-toward') {
      setAnswer({
        kicker:'YOUR ASSIGNED AIRCRAFT',
        headline:'Your plane is moving generally toward ' + focusLabel + '.',
        summary:reportLead + (reportDetails ? ', ' + reportDetails : '') +
          '. We can see the aircraft moving toward your departure airport, but we have not yet confirmed its current flight route.',
        pills,
        next:'What happens next: keep this page open. We’ll keep checking the route while following the aircraft’s actual position.',
        source:assignmentSourceText()
      });
      return;
    }

    if (relationship?.state === 'nearby' || relationship?.state === 'distance-only') {
      setAnswer({
        kicker:'YOUR ASSIGNED AIRCRAFT',
        headline:relationship.state === 'nearby'
          ? 'Your plane is near ' + focusLabel + '.'
          : 'We found your plane: ' + tail + '.',
        summary:reportLead + (reportDetails ? ', ' + reportDetails : '') +
          '. We can track where the airplane is, but we can’t yet confirm the airports for its current flight.',
        pills,
        next:'What happens next: keep this page open. We’ll continue following the live position and show the current trip as soon as we can confirm it.',
        source:assignmentSourceText()
      });
      return;
    }

    setAnswer({
      kicker:'YOUR ASSIGNED AIRCRAFT',
      headline:live?.aircraft?.onGround === true ? 'We found your plane: ' + tail + '.' : 'We found your plane: ' + tail + '.',
      summary:reportLead + (fact ? ', ' + fact : '') + '. We can see where it is right now, but we can’t yet confirm where this airplane is coming from or where it’s headed.',
      pills,
      next:'What happens next: keep this page open. We’ll keep checking and show its current trip as soon as we can confirm it.',
      source:assignmentSourceText()
    });
  }

  function renderAssignedNoPosition(assignment, data) {
    if (renderArrivedForTurn(assignment)) return;
    const tail = assignment?.tailNumber;
    const route = assignmentRoute(assignment);
    const delay = delayLabel(assignment);
    const seen = data?.status === 'seen-no-position';
    const onGround = data?.aircraft?.onGround === true;
    const completedAt = assignmentArrivalConfirmed(assignment) && assignment?.destination
      ? airportPlace(assignment.destination)
      : null;
    const completedCode = completedAt ? airportCodeAny(assignment.destination) : null;

    if (completedAt) {
      const arrivalTime = completedArrivalClock(assignment);
      const arrivalDetails = [
        arrivalTime ? 'Arrived ' + arrivalTime : 'Arrival confirmed',
        assignment?.destination?.terminal ? 'terminal ' + assignment.destination.terminal : null,
        assignment?.destination?.gate ? 'gate ' + assignment.destination.gate : null
      ].filter(Boolean).join(' · ');
      setAnswer({
        kicker:'YOUR FLIGHT HAS ARRIVED',
        headline:(assignment?.flightNumber || 'Your flight') + ' has arrived in ' + completedAt + '.',
        summary:arrivalDetails + '. The arrival status is confirmed; a missing or stale aircraft position does not make this flight airborne.',
        pills:[route,delay,codesharePill(assignment),tail,assignment?.equipment?.name].filter(Boolean),
        next:'This flight is complete. Live aircraft tracking may resume only if the same airplane later operates another flight.',
        source:assignmentSourceText()
      });
      clearLiveMap();
      flightLabel.textContent = tail || assignment?.flightNumber || 'Assigned aircraft';
      routeLabel.textContent = 'Last confirmed at ' + completedAt + (completedCode ? ' (' + completedCode + ')' : '');
      detailLabel.textContent = [assignment?.equipment?.name,tail].filter(Boolean).join(' · ');
      freshness.textContent = 'Flight confirmed landed';
      return;
    }

    const passengerNotAirborne = assignment?.flightStatus?.airborne !== true &&
      assignment?.flightStatus?.landed !== true &&
      assignment?.flightStatus?.canceled !== true;
    setAnswer({
      kicker:passengerNotAirborne ? 'FLIGHT NOT AIRBORNE YET · ASSIGNED AIRCRAFT' : 'YOUR ASSIGNED AIRCRAFT',
      headline:onGround
        ? 'Your plane is assigned and reported on the ground.'
        : passengerNotAirborne
          ? 'Your flight has not departed yet. ' + tail + ' is the assigned aircraft.'
          : 'Your plane is assigned, but its present location is unknown.',
      summary:onGround
        ? 'The live aircraft feed reports ' + tail + ' on the ground, but it does not provide a usable position, so we cannot identify the airport.'
        : seen
          ? 'The live aircraft feed can see ' + tail + ', but it has no current location. We also could not confirm a same-tail arrival at ' + airportPlace(assignment?.origin) + '.'
          : passengerNotAirborne
            ? 'The assignment is confirmed, but there is no fresh aircraft position right now. We will keep following this exact tail and its inbound leg when evidence appears.'
            : 'We confirmed ' + tail + ' is assigned to your flight, but there is no current position and no confirmed same-tail arrival at ' + airportPlace(assignment?.origin) + '. Its present location is unknown.',
      pills:[route,delay,tail,assignment?.equipment?.name].filter(Boolean),
      next:onGround
        ? 'Tracking starts when the aircraft reports a usable position. Until then, we will not guess which airport it is at.'
        : 'We will keep checking for a live position or a confirmed same-tail leg. Until one appears, the map stays empty rather than guessing.',
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

  function setActionMessage(text,kind='neutral') {
    actionMessage.textContent = text || '';
    actionMessage.dataset.kind = kind;
    actionMessage.hidden = !text;
  }

  function watchStorageKey() {
    if (!activeFlight || !activeDate) return null;
    return WATCH_STORAGE_PREFIX + [activeFlight,activeDate,activeFlightId || ''].join(':');
  }

  function readWatchRecord() {
    const key = watchStorageKey();
    if (!key) return null;
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }

  function writeWatchRecord(record) {
    const key = watchStorageKey();
    if (!key) return;
    try {
      if (record) localStorage.setItem(key,JSON.stringify(record));
      else localStorage.removeItem(key);
    } catch {}
  }

  function urlBase64ToUint8Array(value) {
    const padding = '='.repeat((4 - String(value || '').length % 4) % 4);
    const base64 = String(value || '').replace(/-/g,'+').replace(/_/g,'/') + padding;
    const raw = atob(base64);
    return Uint8Array.from(raw,ch => ch.charCodeAt(0));
  }

  async function postV3(action,body) {
    const response = await fetch('/api/flight-assignment?flightV3=1&action=' + encodeURIComponent(action),{
      method:'POST',
      headers:{'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify(body)
    });
    return await response.json();
  }

  function updateActionControls(payload) {
    const assignment = payload?.assignment;
    const usable = Boolean(assignment?.flightNumber);
    flightActions.hidden = !usable;
    if (!usable) return;

    let record = readWatchRecord();
    const watchUnavailable = !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window);
    const complete = assignment?.flightStatus?.landed === true || assignment?.flightStatus?.canceled === true;
    if (complete && record) {
      writeWatchRecord(null);
      record = null;
    }
    watchButton.disabled = watchUnavailable || complete;
    watchButton.textContent = record ? 'Stop watching' : complete ? 'Flight complete' : 'Watch this flight';
    watchButton.title = watchUnavailable ? 'Browser push notifications are not supported here.' : '';

    shareButton.disabled = false;
    addConnectionButton.disabled = false;
  }

  async function enableWatch() {
    if (!currentUnifiedPayload?.assignment || !activeFlight || !activeDate) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setActionMessage('Browser push notifications are not supported on this device.','warning');
      return;
    }

    watchButton.disabled = true;
    setActionMessage('Setting up flight alerts…');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setActionMessage('Notifications were not enabled. The flight is not being watched.','warning');
        return;
      }

      const keyResponse = await fetch('/api/flight-assignment?flightV3=1&action=vapid-key',{headers:{accept:'application/json'}});
      const keyData = await keyResponse.json();
      if (!keyData?.ok || !keyData.publicKey) throw new Error('push unavailable');

      const registration = await navigator.serviceWorker.register('/flight-tracker-sw.js',{scope:'/flight-tracker/'});
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:urlBase64ToUint8Array(keyData.publicKey)
        });
      }

      const result = await postV3('watch-subscribe',{
        flight:activeFlight,
        date:activeDate,
        flightId:activeFlightId,
        subscription:subscription.toJSON()
      });
      if (!result?.ok) throw new Error(result?.message || 'watch unavailable');

      writeWatchRecord({
        watchId:result.watchId,
        manageToken:result.manageToken,
        flight:activeFlight,
        date:activeDate,
        flightId:activeFlightId || null
      });
      updateActionControls(currentUnifiedPayload);
      watchButton.textContent = 'Stop watching';
      setActionMessage(result.message || 'Watching this flight.');
    } catch (error) {
      setActionMessage(String(error?.message || '').includes('denied')
        ? 'Notifications were not enabled. The flight is not being watched.'
        : 'Flight alerts are temporarily unavailable.','warning');
    } finally {
      watchButton.disabled = false;
    }
  }

  async function disableWatch() {
    const record = readWatchRecord();
    if (!record) return;
    watchButton.disabled = true;
    try {
      const result = await postV3('watch-unsubscribe',{
        watchId:record.watchId,
        manageToken:record.manageToken
      });
      if (!result?.ok) throw new Error('stop failed');
      writeWatchRecord(null);
      updateActionControls(currentUnifiedPayload);
      watchButton.textContent = 'Watch this flight';
      setActionMessage('Flight alerts stopped.');
    } catch {
      setActionMessage('Could not stop flight alerts right now.','warning');
    } finally {
      watchButton.disabled = false;
    }
  }

  async function shareCurrentFlight() {
    if (!currentUnifiedPayload?.assignment || !activeFlight || !activeDate) return;
    shareButton.disabled = true;
    setActionMessage('Creating a private pickup link…');
    try {
      const result = await postV3('share-create',{
        flight:activeFlight,
        date:activeDate,
        flightId:activeFlightId
      });
      if (!result?.ok || !result.url) throw new Error('share unavailable');
      const shareData = {
        title:'Pickup update for ' + (currentUnifiedPayload.assignment.flightNumber || activeFlight),
        text:'Latest arrival update',
        url:result.url
      };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          setActionMessage('Pickup link ready. It expires six hours after arrival.');
          return;
        } catch (error) {
          if (error?.name === 'AbortError') {
            setActionMessage('Pickup link created: ' + result.url);
            return;
          }
        }
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.url);
        setActionMessage('Pickup link copied. It expires six hours after arrival.');
      } else {
        setActionMessage('Pickup link: ' + result.url);
      }
    } catch {
      setActionMessage('The pickup link could not be created right now.','warning');
    } finally {
      shareButton.disabled = false;
    }
  }

  function timelineClock(iso,timezone) {
    return formatClock(iso,timezone) || 'Time not published';
  }

  function makeTimelineRow({key,time,label,status,current}) {
    const row = document.createElement('div');
    row.className = 'timeline-row' + (current ? ' is-current' : '');
    row.dataset.stage = key;

    const timeEl = document.createElement('div');
    timeEl.className = 'timeline-time';
    timeEl.textContent = time || '—';

    const dot = document.createElement('span');
    dot.className = 'timeline-dot';
    dot.setAttribute('aria-hidden','true');

    const copy = document.createElement('div');
    copy.className = 'timeline-copy';
    const labelEl = document.createElement('div');
    labelEl.className = 'timeline-label';
    labelEl.append(document.createTextNode(label));
    if (current) {
      const here = document.createElement('span');
      here.className = 'timeline-here';
      here.textContent = 'YOU ARE HERE';
      labelEl.appendChild(here);
    }
    const statusEl = document.createElement('div');
    statusEl.className = 'timeline-status';
    statusEl.textContent = status;
    copy.append(labelEl,statusEl);
    row.append(timeEl,dot,copy);
    return row;
  }

  function renderTripTimeline(payload) {
    const assignment = assignmentData || payload?.assignment;
    if (!assignment) {
      tripTimeline.hidden = true;
      return;
    }

    const inbound = payload?.recentInboundOccurrence || assignment?.recentInboundOccurrence || assignment?.previousAircraftOccurrence || null;
    const state = payload?.renderedState || '';
    const rows = [];
    let currentStage = 'departure';
    if (assignmentArrivalConfirmed(assignment)) currentStage = 'arrival';
    else if (assignment?.flightStatus?.airborne === true || state === 'airborne-live' || state === 'airborne-status') currentStage = 'departure';
    else if (state === 'parked-origin-confirmed' || state === 'ground-live') currentStage = 'turn';
    else if (inbound?.flightStatus?.airborne === true && inbound?.flightStatus?.landed !== true) currentStage = 'inbound';

    if (inbound) {
      const inboundTime = inbound?.flightStatus?.landed === true
        ? timelineClock(inbound?.schedule?.actualArrivalUTC || inbound?.schedule?.estimatedArrivalUTC,inbound?.destination?.timezone)
        : timelineClock(inbound?.schedule?.estimatedArrivalUTC || inbound?.schedule?.scheduledArrivalUTC,inbound?.destination?.timezone);
      const inboundStatus = inbound?.flightStatus?.landed === true
        ? 'Arrived from ' + airportPlace(inbound.origin) + (inbound.flightNumber ? ' on ' + inbound.flightNumber : '') + '.'
        : 'Inbound from ' + airportPlace(inbound.origin) + (inbound.flightNumber ? ' on ' + inbound.flightNumber : '') + '.';
      rows.push({key:'inbound',time:inboundTime,label:'Inbound aircraft',status:inboundStatus});
    } else {
      rows.push({key:'inbound',time:'—',label:'Inbound aircraft',status:'No confirmed previous leg is available.'});
    }

    const turn = scheduledTurnMinutes(assignment,inbound);
    const turnTime = inbound ? completedArrivalClock(inbound) || '—' : '—';
    let turnStatus = 'Aircraft turn timing is not confirmed.';
    if (state === 'parked-origin-confirmed' || state === 'ground-live') {
      turnStatus = 'Aircraft is on the ground at ' + airportPlace(assignment.origin) +
        (Number.isFinite(turn) ? ' · scheduled turn ' + turn + ' min.' : '.');
    } else if (Number.isFinite(turn)) {
      turnStatus = 'Scheduled aircraft turn: ' + turn + ' min.';
    }
    rows.push({key:'turn',time:turnTime,label:'Aircraft on ground / turn',status:turnStatus});

    rows.push({
      key:'boarding',
      time:'Not published',
      label:'Boarding',
      status:assignment?.origin?.gate
        ? 'Departure gate ' + assignment.origin.gate + ' is published; boarding time is not.'
        : 'Boarding time and gate are not both published in the source.'
    });

    const departureIso = assignment?.schedule?.actualDepartureUTC || assignment?.schedule?.estimatedDepartureUTC || assignment?.schedule?.scheduledDepartureUTC;
    rows.push({
      key:'departure',
      time:timelineClock(departureIso,assignment?.origin?.timezone),
      label:'Departure',
      status:(assignment?.flightStatus?.airborne ? 'Departed ' : 'Scheduled from ') + airportPlace(assignment.origin) +
        (assignment?.origin?.gate ? ' · gate ' + assignment.origin.gate : '') +
        (delayLabel(assignment) ? ' · ' + delayLabel(assignment) : '')
    });

    const arrivalIso = assignment?.schedule?.actualArrivalUTC || assignment?.schedule?.estimatedArrivalUTC || assignment?.schedule?.scheduledArrivalUTC;
    rows.push({
      key:'arrival',
      time:timelineClock(arrivalIso,assignment?.destination?.timezone),
      label:'Arrival',
      status:(assignmentArrivalConfirmed(assignment) ? 'Arrived in ' : 'Expected in ') + airportPlace(assignment.destination) +
        (assignment?.destination?.terminal ? ' · terminal ' + assignment.destination.terminal : '') +
        (assignment?.destination?.gate ? ' · gate ' + assignment.destination.gate : '')
    });

    tripTimeline.replaceChildren(...rows.map(row => makeTimelineRow({...row,current:row.key === currentStage})));
    tripTimeline.hidden = false;
    answerJourney.hidden = true;
  }

  function renderConnectionResult(data) {
    connectionResult.replaceChildren();
    if (!data?.ok) {
      connectionResult.textContent = data?.message || 'Connection timing is unavailable.';
      connectionResult.hidden = false;
      return;
    }

    const verdict = document.createElement('div');
    verdict.className = 'connection-verdict';
    verdict.textContent = data.label || 'Can’t score yet';
    connectionResult.appendChild(verdict);

    const math = document.createElement('div');
    math.className = 'connection-math';
    const arrivalLead = data.arrivalClock ? 'Inbound arrival ' + data.arrivalClock + '. ' : '';
    const departureLead = data.departureClock ? 'Connection departs ' + data.departureClock + '. ' : '';
    if (Number.isFinite(data.slackMinutes)) {
      math.textContent = arrivalLead + departureLead + 'Layover ' + data.rawLayoverMinutes +
        ' min − ' + data.deplaneMinutes + ' min deplane − ' + data.transfer.minutes +
        ' min transfer = ' + data.slackMinutes + ' min slack.';
    } else {
      math.textContent = arrivalLead + departureLead + 'Layover ' + data.rawLayoverMinutes +
        ' min − ' + data.deplaneMinutes + ' min deplane. Transfer time is unknown, so no verdict is shown.';
    }
    connectionResult.appendChild(math);

    const basis = document.createElement('p');
    basis.className = 'connection-note';
    basis.textContent = data.transfer?.label || data.note || '';
    connectionResult.appendChild(basis);

    if (data.note && data.note !== basis.textContent) {
      const note = document.createElement('p');
      note.className = 'connection-note';
      note.textContent = data.note;
      connectionResult.appendChild(note);
    }
    connectionResult.hidden = false;
  }

  async function refreshConnection(force=false) {
    if (!activeConnectionSpec || !activeFlight || !activeDate) return;
    const now = Date.now();
    if (!force && refreshConnection.lastAt && now - refreshConnection.lastAt < 30000) return;
    refreshConnection.lastAt = now;
    const sequence = ++connectionRequestSequence;
    try {
      const data = await postV3('connection',{
        flight:activeFlight,
        date:activeDate,
        flightId:activeFlightId,
        connectionFlight:activeConnectionSpec.flight,
        connectionDate:activeConnectionSpec.date,
        connectionFlightId:activeConnectionSpec.flightId || null
      });
      if (sequence !== connectionRequestSequence) return;
      renderConnectionResult(data);
    } catch {
      if (sequence !== connectionRequestSequence) return;
      connectionResult.textContent = 'Connection timing is temporarily unavailable.';
      connectionResult.hidden = false;
    }
  }

  async function loadReliability(payload) {
    const assignment = payload?.assignment;
    if (!assignment?.flightNumber || !activeFlight || !activeDate) return;
    const key = [activeFlight,activeDate,activeFlightId || ''].join('|');
    if (key === reliabilityFetchKey && Date.now() - reliabilityFetchAt < 5 * 60 * 1000) return;
    reliabilityFetchKey = key;
    reliabilityFetchAt = Date.now();
    try {
      const params = new URLSearchParams({action:'reliability',flight:activeFlight,date:activeDate});
      if (activeFlightId) params.set('flightId',activeFlightId);
      const response = await fetch('/api/flight-assignment?flightV3=1&' + params.toString(),{headers:{accept:'application/json'}});
      const data = await response.json();
      if (key !== [activeFlight,activeDate,activeFlightId || ''].join('|')) return;
      if (!data?.available) {
        reliabilityPanel.hidden = true;
        return;
      }
      reliabilityOnTime.textContent = data.onTimePct + '%';
      reliabilityDelay.textContent = data.averageDelayMinutes + ' min';
      reliabilityCancel.textContent = data.cancellationRatePct + '%';
      reliabilityContext.textContent = data.context + ' Based on ' + data.sampleSize + ' observed flights in the trailing 30 days.';
      reliabilityPanel.hidden = false;
    } catch {
      reliabilityPanel.hidden = true;
    }
  }

  function renderV3Companions(payload) {
    if (payload !== currentUnifiedPayload) return;
    renderTripTimeline(payload);
    updateActionControls(payload);
    loadReliability(payload);
    refreshConnection(false);
  }

  async function loadRegistration(registration, {silent=false}={}) {
    if (!registration) return;
    if (silent && refreshInFlight) return;
    activeLiveKey = 'registration:' + registration;
    if (silent) refreshInFlight = true;
    const sequence = ++requestSequence;

    try {
      const liveParams = new URLSearchParams({registration});
      const focusAirport = airportCodeAny(assignmentData?.origin);
      if (focusAirport) liveParams.set('focusAirport', focusAirport);
      const historyPromise = assignmentData
        ? resolveRecentInboundOccurrence(assignmentData)
        : Promise.resolve(null);
      const livePromise = fetch('/api/flight-tracker?' + liveParams.toString(), {headers:{accept:'application/json'}})
        .then(response => response.json());
      const [data, recentOccurrence] = await Promise.all([livePromise,historyPromise]);
      if (sequence !== requestSequence || assignedTail !== registration) return;

      if (recentOccurrence && assignmentData) {
        assignmentData = attachInboundOccurrence(assignmentData,recentOccurrence);
      }

      if (data.status === 'live' && data.positionFresh === true) {
        if (assignmentData) {
          const operatingOccurrence = await resolveOperatingOccurrence(assignmentData,data);
          if (sequence !== requestSequence || assignedTail !== registration) return;
          data.confirmedOperatingOccurrence = operatingOccurrence;
        }
        renderLive(data);
        saveLastKnownSnapshot(data);
        if (assignmentData) renderInboundAnswer(assignmentData,data);
      } else if (!(silent && holdLastLiveOnRefreshMiss(data))) {
        if (assignmentData) {
          await recoverNoPositionState(assignmentData,registration,data);
          if (sequence !== requestSequence || assignedTail !== registration) return;
        }
      }
    } catch {
      if (sequence !== requestSequence || assignedTail !== registration) return;
      if (!(silent && holdLastLiveOnRefreshMiss({status:'error'})) && assignmentData) {
        await recoverNoPositionState(assignmentData,registration,{status:'not-found'});
      }
    } finally {
      if (silent) refreshInFlight = false;
    }
  }

  function renderUnifiedFlightState(payload) {
    const assignment = payload?.assignment;
    if (!assignment) return;
    currentUnifiedPayload = payload;
    queueMicrotask(() => {
      if (currentUnifiedPayload === payload) renderV3Companions(payload);
    });

    if (payload?.recentInboundOccurrence) {
      assignmentData = attachInboundOccurrence(assignment,payload.recentInboundOccurrence);
    } else {
      assignmentData = assignment;
    }

    const live = payload?.live && typeof payload.live === 'object'
      ? {...payload.live}
      : null;
    if (live) {
      live.confirmedOperatingOccurrence = payload?.confirmedOperatingOccurrence || live.confirmedOperatingOccurrence || null;
      live.reconciledState = payload?.renderedState || null;
      live.renderPositionAgeSeconds = payload?.observation?.displayAgeSeconds;
    }

    const staleAge = staleFixAgeText(payload?.observation);
    const state = payload?.renderedState;

    // Passenger-flight completion outranks tail telemetry and stale departure flags.
    // A tail may already be moving again, but that cannot make the completed flight airborne.
    if (assignmentArrivalConfirmed(assignmentData)) {
      renderAssignedNoPosition(assignmentData,live || {status:'not-found'});
      return;
    }

    if (state === 'airborne-live' || state === 'ground-live') {
      renderLive(live);
      renderInboundAnswer(assignmentData,live);
      return;
    }

    if (state === 'airborne-status') {
      const route = assignmentRoute(assignmentData);
      const delay = delayLabel(assignmentData);
      const prior = assignmentData?.recentInboundOccurrence || assignmentData?.previousAircraftOccurrence || null;
      setAnswer({
        kicker:'YOUR FLIGHT IS AIRBORNE',
        headline:(assignmentData.flightNumber || 'Your flight') + ' is airborne.',
        summary:'The flight-status feed confirms departure.' +
          (staleAge ? ' The newest aircraft position is stale (' + staleAge.toLowerCase() + '), so it is not shown as live.' : ' No fresh aircraft position is available right now.'),
        pills:[route,delay,assignmentData.tailNumber,assignmentData?.equipment?.name].filter(Boolean),
        next:'What happens next: the map stays empty until a fresh aircraft fix arrives. A stale ground report cannot move this flight back to the gate.',
        delayWhy:delayWhyText(assignmentData,prior),
        source:assignmentSourceText()
      });
      clearLiveMap();
      flightLabel.textContent = assignmentData.tailNumber || assignmentData.flightNumber || 'Flight';
      routeLabel.textContent = route || 'Airborne';
      detailLabel.textContent = [assignmentData?.equipment?.name,assignmentData.tailNumber].filter(Boolean).join(' · ');
      freshness.textContent = staleAge || 'Flight status confirms airborne';
      freshness.dataset.stale = staleAge ? 'true' : 'false';
      return;
    }

    if (state === 'parked-origin-confirmed') {
      renderArrivedForTurn(assignmentData);
      return;
    }

    if (state === 'landed-status' || state === 'assigned-no-position') {
      renderAssignedNoPosition(assignmentData,live || {status:'not-found'});
      if (staleAge) {
        freshness.textContent = staleAge;
        freshness.dataset.stale = 'true';
      }
      return;
    }

    renderAssignmentBase(assignmentData);
    if (!assignmentData.tailNumber) clearLiveMap();
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

    const params = new URLSearchParams({flight,date,unified:'1'});
    if (date === localDateString()) params.set('liveNow','1');
    if (flightId) params.set('flightId',flightId);
    const sequence = ++requestSequence;

    try {
      const response = await fetch('/api/flight-assignment?' + params.toString(), {headers:{accept:'application/json'}});
      const data = await response.json();
      if (sequence !== requestSequence || activeFlight !== flight || activeDate !== date) return;

      if (data.status === 'choose-flight') {
        renderRouteChoices(data);
        submit.disabled = false;
        submit.textContent = 'FIND MY PLANE';
        return;
      }

      if (data.status !== 'found' || !data.assignment) {
        if (!silent) {
          const sourceDown = data.status === 'assignment-source-unavailable' || data.status === 'source-unavailable';
          const coverageGap = data.status === 'assignment-not-covered';
          const liveCoverageChecked = coverageGap && data?.liveCoverage &&
            Array.isArray(data.liveCoverage.checkedCallsigns);
          resetMapForFailure(activeFlight,liveCoverageChecked ? 'Outside current live coverage' : 'No live position');
          setAnswer({
            kicker:coverageGap
              ? 'AIRCRAFT ASSIGNMENT COVERAGE NOT AVAILABLE'
              : sourceDown
                ? 'ASSIGNMENT SOURCE TEMPORARILY UNAVAILABLE'
                : 'AIRCRAFT ASSIGNMENT NOT FOUND',
            headline:coverageGap
              ? liveCoverageChecked
                ? 'We cannot place ' + activeFlight + ' on the live map from the available public feeds right now.'
                : 'We do not have published assignment coverage for this flight and date.'
              : sourceDown
                ? 'We cannot confirm the assigned aircraft right now.'
                : 'We could not identify an aircraft assignment for this scheduled occurrence.',
            summary:coverageGap && liveCoverageChecked
              ? (data.message || 'The public assignment sources do not publish a usable aircraft assignment for this occurrence.') +
                ' Direct operating callsigns were also checked for a fresh ADS-B position and none is currently observable. This is a coverage gap, not a temporary assignment outage.'
              : data.message || (coverageGap
              ? 'The public sources responded, but they did not publish an aircraft assignment for this occurrence.'
              : sourceDown
                ? 'The assignment sources are temporarily unavailable. For today’s flight, direct live operating callsigns were also checked before showing this message.'
                : 'The flight may not have an assignment published yet.'),
            pills:[activeFlight,activeDate],
            next:coverageGap
              ? liveCoverageChecked
                ? 'The tracker will keep checking every 10 seconds. If the aircraft enters live ADS-B coverage, the real plane position will appear automatically; no position is estimated or simulated.'
                : 'If this is a future flight, check again closer to departure; aircraft assignments are often published later.'
              : sourceDown
                ? 'For a flight happening today, the tracker checks fresh ADS-B operating callsigns independently of the assignment feed.'
                : null,
            source:coverageGap
              ? liveCoverageChecked
                ? 'Assignment coverage: unavailable for this occurrence · Live callsign check: ADSB.lol.'
                : 'Assignment coverage: no matching published occurrence in the available public sources.'
              : sourceDown
                ? 'Assignment sources: temporarily unavailable · Live aircraft source: ADSB.lol.'
                : 'Flight occurrence data: public flight sources.'
          });
        }
        return;
      }

      const priorTail = assignedTail;
      const assignment = data.assignment;
      activeFlightId = assignment.flightId || activeFlightId;
      assignedTail = assignment.tailNumber || null;
      assignmentChangedFrom = priorTail && assignedTail && priorTail !== assignedTail ? priorTail : null;
      syncUrl();

      if (assignmentChangedFrom) {
        resetHeldLive();
        clearLiveMap();
      }

      renderUnifiedFlightState(data);
      submit.disabled = false;
      submit.textContent = 'FIND MY PLANE';
      setMessage('', 'neutral');
    } catch {
      if (sequence !== requestSequence || activeFlight !== flight || activeDate !== date) return;
      if (!silent) {
        setAnswer({
          kicker:'FLIGHT STATE UNAVAILABLE',
          headline:'The combined flight-state source is temporarily unavailable.',
          summary:'We will not combine stale aircraft data with airline status or guess whether the plane is airborne or at a gate.',
          pills:[activeFlight,activeDate],
          source:'Flight status: FlightStats · Aircraft position: ADSB.lol.'
        });
        resetMapForFailure(activeFlight,'Flight state unavailable');
      }
    } finally {
      if (silent) assignmentInFlight = false;
      submit.disabled = false;
      submit.textContent = 'FIND MY PLANE';
    }
  }

  async function loadFlight(flight, {silent=false,preserveUnavailableAnswer=false,operatingCarrier=null}={}) {
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
      const liveParams = new URLSearchParams({flight:normalized});
      if (operatingCarrier) liveParams.set('operatingCarrier',operatingCarrier);
      const response = await fetch('/api/flight-tracker?' + liveParams.toString(), {
        headers:{accept:'application/json'}
      });
      const data = await response.json();

      if (sequence !== requestSequence || activeFlight !== normalized) return;
      if (data.status === 'live' && data.positionFresh === true) {
        renderLive(data);
      } else if (!(silent && holdLastLiveOnRefreshMiss(data))) {
        if (preserveUnavailableAnswer) {
          clearLiveMap();
          glance.hidden = true;
          progressBar.hidden = true;
          flightLabel.textContent = normalized;
          routeLabel.textContent = 'No live position';
          routeCodes.textContent = '';
          detailLabel.textContent = Array.isArray(data?.checkedCallsigns) && data.checkedCallsigns.length
            ? 'Checked ' + data.checkedCallsigns.join(', ')
            : 'Live callsign fallback checked';
          freshness.textContent = '';
          setMessage('', 'neutral');
        } else {
          renderUnavailable(data);
        }
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
    if (document.hidden || !activeFlight || !activeDate) return;
    loadAssignment(activeFlight,activeDate,activeFlightId,{silent:true});
  }

  function beginRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(refreshCurrentAircraft,10000);

    if (assignmentTimer) clearInterval(assignmentTimer);
    assignmentTimer = null;
  }

  async function startJourney(flight,date,flightId=null) {
    if (refreshTimer) clearInterval(refreshTimer);
    if (assignmentTimer) clearInterval(assignmentTimer);
    resetHeldLive();
    requestSequence++;
    refreshInFlight = false;
    assignmentInFlight = false;
    assignmentData = null;
    currentUnifiedPayload = null;
    activeConnectionSpec = null;
    connectionRequestSequence++;
    assignedTail = null;
    assignmentChangedFrom = null;
    operatingOccurrenceCacheKey = null;
    operatingOccurrenceCacheValue = null;
    operatingOccurrenceCacheAt = 0;
    activeFlight = clean(flight);
    activeDate = date || localDateString();
    activeFlightId = flightId || null;
    activeLiveKey = null;
    input.value = activeFlight;
    dateInput.value = activeDate;
    syncUrl();
    hideAnswer();
    resetMapForLookup(activeFlight);
    await loadAssignment(activeFlight,activeDate,activeFlightId,{silent:false});
    beginRefresh();
  }

  watchButton.addEventListener('click', () => {
    if (readWatchRecord()) disableWatch();
    else enableWatch();
  });

  shareButton.addEventListener('click', shareCurrentFlight);

  addConnectionButton.addEventListener('click', () => {
    connectionPanel.hidden = !connectionPanel.hidden;
    if (!connectionPanel.hidden) {
      if (!connectionDateInput.value) connectionDateInput.value = activeDate || localDateString();
      connectionFlightInput.focus();
    }
  });

  connectionForm.addEventListener('submit', event => {
    event.preventDefault();
    const flight = clean(connectionFlightInput.value);
    const date = connectionDateInput.value || activeDate || localDateString();
    if (!flight) {
      connectionResult.textContent = 'Enter a connecting flight number like AA1234.';
      connectionResult.hidden = false;
      connectionFlightInput.focus();
      return;
    }
    activeConnectionSpec = {flight,date,flightId:null};
    connectionResult.textContent = 'Checking both flights…';
    connectionResult.hidden = false;
    refreshConnection(true);
  });

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
    if (document.hidden || !activeFlight || !activeDate) return;
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
