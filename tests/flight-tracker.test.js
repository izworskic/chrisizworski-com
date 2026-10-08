const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const api = require('../api/flight-tracker.js')._test;
const assignmentApi = require('../api/flight-assignment.js')._test;
const html = fs.readFileSync(path.join(root,'public','flight-tracker','index.html'),'utf8');
const client = fs.readFileSync(path.join(root,'public','assets','flight-tracker.js'),'utf8');

test('passenger flight numbers normalize only to direct unambiguous operating callsigns', () => {
  const delta = api.normalizeFlightInput('dl 1234');
  assert.equal(delta.ok, true);
  assert.equal(delta.display, 'DL1234');
  assert.deepEqual(delta.callsigns, ['DAL1234','EDV1234','SKW1234']);

  const american = api.normalizeFlightInput('AA86');
  assert.equal(american.callsigns[0], 'AAL86');


  const raw = api.normalizeFlightInput('UAL2380');
  assert.equal(raw.ok, true);
  assert.deepEqual(raw.callsigns, ['UAL2380']);
});


test('direct airline coverage includes verified major international and nearby carriers without regional guessing', () => {
  const expected = {
    BA:'BAW', LH:'DLH', AF:'AFR', KL:'KLM', EI:'EIN', FI:'ICE', VS:'VIR',
    TK:'THY', EK:'UAE', QR:'QTR', NH:'ANA', JL:'JAL', SQ:'SIA', QF:'QFA',
    NZ:'ANZ', AI:'AIC', KE:'KAL', AM:'AMX', AV:'AVA', CM:'CMP', PD:'POE', TS:'TSC'
  };
  for (const [iata, icao] of Object.entries(expected)) {
    const normalized = api.normalizeFlightInput(iata + '123');
    assert.equal(normalized.ok, true, iata);
    assert.deepEqual(normalized.callsigns, [icao + '123'], iata);
  }
  // Delta fallback now checks the two current Delta Connection operating prefixes too.
  assert.deepEqual(api.normalizeFlightInput('DL123').callsigns, ['DAL123','EDV123','SKW123']);
  assert.deepEqual(api.normalizeFlightInput('AA123').callsigns, ['AAL123']);
  assert.deepEqual(api.normalizeFlightInput('UA123').callsigns, ['UAL123']);
});

test('short flight numbers check common zero-padded operating callsigns without broadening normal numbers', () => {
  assert.deepEqual(api.callsignSuffixVariants('5'),['5','05','005','0005']);
  assert.deepEqual(api.callsignSuffixVariants('86'),['86','086','0086']);
  assert.deepEqual(api.callsignSuffixVariants('123'),['123']);
  assert.deepEqual(api.normalizeFlightInput('DL5').callsigns,['DAL5','DAL05','DAL005','DAL0005','EDV5','SKW5']);
});

test('common aircraft type designators become passenger-readable names and unknown types stay truthful', () => {
  assert.equal(api.aircraftTypeName('A321'), 'Airbus A321');
  assert.equal(api.aircraftTypeName('B38M'), 'Boeing 737 MAX 8');
  assert.equal(api.aircraftTypeName('BCS3'), 'Airbus A220-300');
  assert.equal(api.aircraftTypeName('E75L'), 'Embraer E175');
  assert.equal(api.aircraftTypeName('ZZZZ'), 'ZZZZ');
  assert.equal(api.aircraftTypeName(null), null);
});

test('unknown airline and malformed flight numbers fail closed', () => {
  assert.equal(api.normalizeFlightInput('ZZ123').ok, false);
  assert.equal(api.normalizeFlightInput('1234').ok, false);
  assert.equal(api.normalizeFlightInput('').ok, false);
});

test('aircraft sanitizer requires an actual reported position', () => {
  assert.equal(api.sanitizeAircraft({flight:'DAL1',alt_baro:33000},'DAL1'), null);
  const plane = api.sanitizeAircraft({
    flight:'DAL1 ',
    hex:'a12345',
    lat:42.1,
    lon:-84.2,
    alt_baro:33000,
    gs:452.4,
    track:181.2,
    seen_pos:3.6,
    r:'N123DN',
    t:'A321'
  },'DAL1');
  assert.equal(plane.callsign,'DAL1');
  assert.equal(plane.lat,42.1);
  assert.equal(plane.lon,-84.2);
  assert.equal(plane.altitudeFeet,33000);
  assert.equal(plane.positionAgeSeconds,3.6);
  assert.equal(plane.aircraftTypeName,'Airbus A321');
});


test('route plausibility rejects grossly wrong airport pairs without hiding normal corridor progress', () => {
  const jfk = {lat:40.639801,lon:-73.7789};
  const lhr = {lat:51.4706,lon:-0.461941};
  const connecticut = {lat:41.57,lon:-72.64};
  const losAngeles = {lat:34.05,lon:-118.24};
  assert.equal(api.routeLooksPlausible(connecticut,jfk,lhr),true);
  assert.equal(api.routeLooksPlausible(losAngeles,jfk,lhr),false);
});

test('resolver never guesses when multiple live candidates remain', () => {
  const one = api.chooseUnique([{callsign:'DAL123',positionAgeSeconds:2},null]);
  assert.equal(one.status,'unique');
  assert.equal(one.aircraft.callsign,'DAL123');

  const ambiguous = api.chooseUnique([
    {callsign:'DAL123',positionAgeSeconds:3},
    {callsign:'EDV123',positionAgeSeconds:4}
  ]);
  assert.equal(ambiguous.status,'ambiguous');
  assert.equal(ambiguous.aircraft,null);
});

test('page leads with the delayed-flight inbound-aircraft problem rather than a generic map', () => {
  assert.match(html, /<h1 id="page-title">Where's the Plane for My Flight\?<\/h1>/);
  assert.match(html, /Flight delayed\?/);
  assert.match(html, /id="flight-number"/);
  assert.match(html, /id="flight-date"/);
  assert.match(html, /FIND MY PLANE/);
  assert.match(html, /id="answer-card"/);
  assert.ok(html.indexOf('id="answer-card"') < html.indexOf('id="flight-map"'));
  assert.match(html, /Built for delays/);
  assert.match(html, /Assignments can change/);
  assert.doesNotMatch(html, /weather score|airport dashboard|recommendation score/i);
});


test('browser loader uses the supported MapLibre ESM bundle instead of the missing classic bundle', () => {
  assert.doesNotMatch(html, /maplibre-gl@6\.3\.0\/dist\/maplibre-gl\.js/);
  assert.match(html, /flight-tracker\.js\?v=20261008g/);
  assert.match(client, /import\('https:\/\/cdn\.jsdelivr\.net\/npm\/maplibre-gl@6\.3\.0\/dist\/maplibre-gl\.mjs'\)/);
  assert.match(client, /The flight map could not load/);
});

test('client plots only API positions and refreshes without simulated motion', () => {
  assert.match(client, /planeMarker\.setLngLat\(\[ac\.lon,ac\.lat\]\)/);
  assert.match(client, /setInterval\(refreshCurrentAircraft,10000\)/);
  assert.doesNotMatch(client, /requestAnimationFrame/);
  assert.doesNotMatch(client, /interpolate.*aircraft|estimated position/i);
});

test('flight API uses ADSB.lol callsign and route sources with API noindex', () => {
  const source = fs.readFileSync(path.join(root,'api','flight-tracker.js'),'utf8');
  assert.match(source, /api\.adsb\.lol/);
  assert.match(source, /\/v2\/callsign\//);
  assert.match(source, /vrs-standing-data\.adsb\.lol\/routes/);
  assert.match(source, /X-Robots-Tag/);
  assert.match(source, /s-maxage=/);
  assert.match(source, /ODbL 1\.0/);
  assert.match(source, /CC0 1\.0/);
});

test('flight tracker SEO contract remains concise and canonical', () => {
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
  assert.ok(title.length <= 60, 'title exceeds 60 characters');
  assert.ok(description.length <= 158, 'description exceeds 158 characters');
  assert.match(html, /https:\/\/chrisizworski\.com\/flight-tracker\//);
  assert.match(html, /"@id":"https:\/\/chrisizworski\.com\/#person"/);
  assert.match(html, /"dateModified":"2026-10-08"/);
});


function testPlane(overrides = {}) {
  return {
    lat: 33.6, lon: -84.43, onGround: false,
    altitudeFeet: 24000, speedKnots: 420,
    verticalRateFpm: 0, trackDegrees: 165,
    positionAgeSeconds: 3,
    ...overrides
  };
}

function testRoute() {
  return {
    plausible: true,
    origin: { iata:'ATL', lat:33.64, lon:-84.43 },
    destination: { iata:'MCO', lat:28.431, lon:-81.308 }
  };
}

test('phase labels derive only from fresh telemetry and never equate ground to landed', () => {
  assert.equal(api.flightPhase(testPlane({verticalRateFpm:700}), true).label, 'Climbing');
  assert.equal(api.flightPhase(testPlane({verticalRateFpm:-800}), true).label, 'Descending');
  assert.equal(api.flightPhase(testPlane(), true).label, 'Cruising');
  assert.equal(api.flightPhase(testPlane({onGround:true}), true).label, 'On ground');
  assert.equal(api.flightPhase(testPlane({verticalRateFpm:-800}), false).label, 'Position not current');
  assert.equal(api.flightPhase(testPlane({speedKnots:null,altitudeFeet:null}), true).label, 'Phase unavailable');
});

test('straight-line miles left and a useful landing window are computed for a credible airborne flight', () => {
  const progress=api.flightProgress(testPlane(), testRoute(), true);
  assert.equal(progress.phase.label,'Cruising');
  assert.equal(progress.remainingBasis,'straight-line');
  assert.ok(progress.remainingMiles > 300 && progress.remainingMiles < 500, progress.remainingMiles);
  assert.equal(progress.remainingMiles % 5,0);
  assert.equal(progress.landingEstimate.kind,'calculated-window');
  assert.equal(progress.landingEstimate.confidence,'rough');
  assert.ok(progress.landingEstimate.minMinutes >= 20);
  assert.ok(progress.landingEstimate.maxMinutes >= progress.landingEstimate.minMinutes + 10);
  assert.ok(progress.landingEstimate.maxMinutes > 45);
});


test('overly broad long-haul landing windows are dropped instead of showing false precision', () => {
  const route = {
    plausible:true,
    origin:{iata:'JFK',lat:40.639801,lon:-73.7789},
    destination:{iata:'LHR',lat:51.4706,lon:-0.461941}
  };
  const plane = {
    lat:41.0,lon:-71.0,onGround:false,altitudeFeet:35000,speedKnots:300,
    verticalRateFpm:0,positionAgeSeconds:180
  };
  plane.trackDegrees = api.bearingDegrees(plane,route.destination);
  const progress = api.flightProgress(plane,route,true);
  assert.ok(progress.remainingMiles > 2500);
  assert.equal(progress.landingEstimate,null);
});

test('direct progress is rounded, bounded, and clearly separate from route miles', () => {
  const route = {
    plausible:true,
    origin:{iata:'ATL',lat:33.64,lon:-84.43},
    destination:{iata:'MCO',lat:28.431,lon:-81.308}
  };
  const midway = {
    lat:31.15,lon:-82.87,onGround:false,altitudeFeet:28000,speedKnots:430,
    verticalRateFpm:0,trackDegrees:145,positionAgeSeconds:2
  };
  const progress=api.flightProgress(midway,route,true);
  assert.ok(Number.isFinite(progress.directDistanceMiles));
  assert.ok(progress.directDistanceMiles > progress.remainingMiles);
  assert.ok(progress.directProgressPercent >= 0 && progress.directProgressPercent <= 100);
  assert.equal(progress.directProgressPercent % 5,0);
});

test('untrusted, stale, and no-route positions suppress calculated ETA and distance', () => {
  const plane=testPlane();
  for (const [p,route,fresh] of [
    [plane,null,true],
    [plane,{...testRoute(),plausible:false},true],
    [plane,testRoute(),false],
    [testPlane({speedKnots:null}),testRoute(),true],
    [testPlane({speedKnots:30}),testRoute(),true],
    [testPlane({onGround:true}),testRoute(),true],
    [testPlane({trackDegrees:330}),testRoute(),true]
  ]) {
    const progress=api.flightProgress(p,route,fresh);
    assert.equal(progress.landingEstimate,null,JSON.stringify(p));
  }
  assert.equal(api.flightProgress(plane,null,true).remainingMiles,null);
  assert.equal(api.flightProgress(plane,testRoute(),false).remainingMiles,null);
});

test('last 20 nautical miles suppresses landing ETA rather than suggesting runway precision', () => {
  const plane=testPlane({lat:28.5, lon:-81.4, altitudeFeet:1800, speedKnots:220});
  const progress=api.flightProgress(plane,testRoute(),true);
  assert.equal(progress.landingEstimate,null);
  assert.ok(progress.remainingMiles <= 20);
});

test('ground flag from actual ADS-B field is preserved, and absent telemetry never becomes zero', () => {
  const plane=api.sanitizeAircraft({flight:'DAL500',lat:28.4,lon:-81.3,alt_baro:'ground',seen_pos:4,gs:0},'DAL500');
  assert.equal(plane.onGround,true);
  assert.equal(plane.positionAgeSeconds,4);
  const noTime=api.sanitizeAircraft({flight:'DAL500',lat:28.4,lon:-81.3,alt_baro:800,seen_pos:null,gs:null},'DAL500');
  assert.equal(noTime.positionAgeSeconds,null);
  assert.equal(noTime.speedKnots,null);
});

test('page displays compact live phase, direct miles left and landing window above map', () => {
  assert.match(html, /id="flight-phase"/);
  assert.match(html, /id="flight-distance"/);
  assert.match(html, /id="landing-window"/);
  assert.ok(html.indexOf('id="landing-window"') < html.indexOf('id="flight-map"'));
  assert.match(client, /function renderProgress\(data\)/);
  assert.match(client, /renderProgress\(data\);/);
  assert.match(client, /glance\.hidden = true/);
  assert.match(html, /Rough landing window/);
  assert.doesNotMatch(html, /scheduled arrival:|on.time score|delay prediction/i);
});


test('page renders human-readable route, aircraft identity and tiny direct-progress bar without dashboard creep', () => {
  assert.match(html, /id="route-codes"/);
  assert.match(html, /id="direct-progress"/);
  assert.match(html, /id="direct-progress-fill"/);
  assert.match(html, /id="direct-progress-percent"/);
  assert.match(client, /function airportPlace\(ap\)/);
  assert.match(client, /function aircraftIdentity\(ac\)/);
  assert.match(client, /routeLabel\.textContent = airportPlace/);
  assert.match(client, /routeCodes\.textContent = airportCode/);
  assert.match(client, /progressFill\.style\.width/);
  assert.match(client, /aircraftIdentity\(ac\)/);
  assert.doesNotMatch(html, /squawk|mach|weather radar|airport dashboard/i);
});


test('silent refresh keeps the last confirmed flight through transient source misses', () => {
  assert.match(client, /const HOLD_LAST_LIVE_MS = 5 \* 60 \* 1000/);
  assert.match(client, /function holdLastLiveOnRefreshMiss\(data\)/);
  assert.match(client, /const LIVE_POSITION_MAX_AGE_SECONDS = 15 \* 60/);
  assert.match(client, /const meaningfullyStale = apparentAge > LIVE_POSITION_MAX_AGE_SECONDS/);
  assert.match(client, /if \(silent && refreshInFlight\) return;/);
  assert.match(client, /if \(data\.status === 'live' && data\.positionFresh === true\)/);
  assert.match(client, /const \[data, recentOccurrence\] = await Promise\.all\(\[livePromise,historyPromise\]\)/);
  assert.match(client, /meaningfullyStale \? ' · refresh retrying' : ''/);
  assert.match(client, /if \(meaningfullyStale\) \{\s*phaseLabel\.textContent = 'Last reported';\s*landingLabel\.textContent = 'Refresh pending';/s);
  assert.match(client, /else \{\s*setMessage\('', 'neutral'\);\s*\}/s);
});

test('refresh resilience is bounded and explicit lookups still fail closed', () => {
  assert.match(client, /elapsedMs > HOLD_LAST_LIVE_MS/);
  assert.match(client, /if \(!silent\) \{\s*resetHeldLive\(\);/s);
  assert.match(client, /else if \(!\(silent && holdLastLiveOnRefreshMiss\(data\)\)\) \{[\s\S]*preserveUnavailableAnswer[\s\S]*renderUnavailable\(data\);/s);
  assert.match(client, /const sequence = \+\+requestSequence/);
  assert.match(client, /sequence !== requestSequence \|\| activeFlight !== normalized/);
});


test('assignment parser extracts same-day flight options from FlightStats structured page data', () => {
  const payload = {
    props:{initialState:{flightTracker:{otherDays:[
      {flights:[
        {
          url:'/flight-tracker/DL/1234?year=2026&month=10&date=07&flightId=777',
          sortTime:'2026-10-07T20:30:00.000Z',
          departureAirport:{iata:'DTW',city:'Detroit'},
          arrivalAirport:{iata:'MBS',city:'Saginaw'},
          departureTime:'4:30',departureTimeAmPm:'PM',departureTimezone:'EDT'
        },
        {
          url:'/flight-tracker/DL/1234?year=2026&month=10&date=08&flightId=778',
          sortTime:'2026-10-08T20:30:00.000Z',
          departureAirport:{iata:'DTW'},arrivalAirport:{iata:'MBS'}
        }
      ]}
    ]}}}
  };
  const htmlFixture = '<script>__NEXT_DATA__ = ' + JSON.stringify(payload) + ';__NEXT_LOADED_PAGES__=[];</script>';
  const parsed = assignmentApi.parseNextData(htmlFixture);
  const date = assignmentApi.normalizeDate('2026-10-07');
  const options = assignmentApi.optionsForDate(parsed,date);
  assert.equal(options.length,1);
  assert.equal(options[0].flightId,'777');
  assert.equal(options[0].origin.iata,'DTW');
  assert.equal(options[0].destination.iata,'MBS');
});

test('assignment sanitizer extracts assigned tail, delay, gates and scheduled route without inventing an inbound leg', () => {
  const flight = {
    flightId:1412663918,
    flightNote:{canceled:false,hasDepartedRunway:false,landed:false,message:'Tracking will begin after departure'},
    isTracking:false,isLanded:false,
    resultHeader:{carrier:{fs:'AA'},flightNumber:'3276'},
    status:{
      statusCode:'D',status:'Delayed',statusDescription:'Delayed',
      delay:{departure:{minutes:43},arrival:{minutes:20}},
      lastUpdatedText:'Status Last Updated 2 Minutes Ago'
    },
    departureAirport:{
      fs:'DTW',iata:'DTW',city:'Detroit',name:'Detroit Metro',gate:'A31',terminal:'EM',
      timeZoneRegionName:'America/Detroit',
      times:{scheduled:{time:'5:30',ampm:'PM',time24:'17:30',timezone:'EDT'},estimatedActual:{time:'6:13',ampm:'PM',time24:'18:13',timezone:'EDT'}}
    },
    arrivalAirport:{fs:'MBS',iata:'MBS',city:'Saginaw',name:'MBS International'},
    additionalFlightInfo:{equipment:{iata:'CR9',name:'Bombardier CRJ900',title:'Actual'}},
    positional:{flexTrack:{tailNumber:'N912XJ',equipment:'CR9'}},
    schedule:{scheduledDepartureUTC:'2026-10-07T21:30:00Z',estimatedActualDepartureUTC:'2026-10-07T22:13:00Z'}
  };
  const result=assignmentApi.sanitizeFlight(
    flight,
    {display:'DL1234'},
    'https://www.flightstats.com/v2/flight-tracker/DL/1234?flightId=1'
  );
  assert.equal(result.tailNumber,'N912XJ');
  assert.equal(result.assignmentState,'assigned');
  assert.equal(result.origin.iata,'DTW');
  assert.equal(result.destination.iata,'MBS');
  assert.equal(result.origin.gate,'A31');
  assert.equal(result.flightStatus.departureDelayMinutes,43);
  assert.equal(result.equipment.name,'Bombardier CRJ900');
  assert.equal(result.currentLeg,undefined);
});

test('actual departure evidence survives a stale status flag so one-hour sanity checks can use it', () => {
  const result=assignmentApi.sanitizeFlight({
    flightId:99,
    flightNote:{canceled:false,hasDepartedRunway:false,landed:false},
    isTracking:false,isLanded:false,
    status:{status:'Scheduled'},
    departureAirport:{fs:'FRA',iata:'FRA',city:'Frankfurt'},
    arrivalAirport:{fs:'JFK',iata:'JFK',city:'New York'},
    positional:{flexTrack:{tailNumber:'N861NW'}},
    schedule:{
      scheduledDepartureUTC:'2026-10-08T08:00:00Z',
      actualDepartureUTC:'2026-10-08T08:22:00Z'
    }
  },{display:'DL107'},'https://example.test');
  assert.equal(result.flightStatus.airborne,false);
  assert.equal(result.schedule.actualDepartureUTC,'2026-10-08T08:22:00Z');
});

test('registration lookup support is explicit and preserves grounded aircraft without fabricating a position', () => {
  assert.equal(api.normalizeRegistration(' n463aa '),'N463AA');
  assert.equal(api.normalizeRegistration('***'),null);
  const seen=api.sanitizeSeenAircraft({r:'N463AA',t:'A21N',alt_baro:'ground',seen:4.5},'N463AA');
  assert.equal(seen.registration,'N463AA');
  assert.equal(seen.onGround,true);
  assert.equal(seen.aircraftTypeName,'Airbus A321neo');
  assert.equal(seen.lastSeenSeconds,4.5);
});

test('client renders scheduled flights from one reconciled server state instead of racing assignment and ADS-B', () => {
  assert.match(client, /fetch\('\/api\/flight-assignment\?' \+ params\.toString\(\)/);
  assert.match(client, /function renderUnifiedFlightState\(payload\)/);
  assert.match(client, /assignedTail = assignment\.tailNumber \|\| null/);
  assert.match(client, /assignmentChangedFrom = priorTail && assignedTail && priorTail !== assignedTail/);
  assert.match(client, /refreshCurrentAircraft\(\)[\s\S]*loadAssignment\(activeFlight,activeDate,activeFlightId,\{silent:true\}\)/s);
  assert.match(client, /assignmentTimer = null/);
  assert.doesNotMatch(client, /async function loadAssignment[\s\S]*?loadRegistration\(/);
});

test('server reconciliation timestamps ADS-B fixes and enforces the 15 minute cutoff', () => {
  const now=Date.parse('2026-10-08T12:00:00Z');
  const fresh=assignmentApi.positionObservation({
    aircraft:{lat:50.1,lon:8.6,onGround:false,positionAgeSeconds:899}
  },now);
  assert.equal(fresh.fresh,true);
  assert.equal(fresh.fixTimestamp,'2026-10-08T11:45:01.000Z');
  assert.equal(fresh.displayAgeSeconds,840);

  const stale=assignmentApi.positionObservation({
    aircraft:{lat:50.1,lon:8.6,onGround:true,positionAgeSeconds:7200}
  },now);
  assert.equal(stale.fresh,false);
  assert.equal(stale.fixTimestamp,'2026-10-08T10:00:00.000Z');
  assert.equal(stale.displayAgeSeconds,7200);
});

test('fresh ADS-B wins source conflicts and stale ADS-B loses to flight status', () => {
  const assignment={
    status:'found',flightNumber:'DL107',tailNumber:'N861NW',
    origin:{iata:'FRA'},destination:{iata:'JFK'},
    schedule:{actualDepartureUTC:'2026-10-08T09:00:00Z'},
    flightStatus:{airborne:true,landed:false,canceled:false}
  };
  const now=Date.parse('2026-10-08T12:00:00Z');

  const freshGround=assignmentApi.reconcileFlightState({
    assignment,
    live:{aircraft:{registration:'N861NW',lat:50.03,lon:8.57,onGround:true,positionAgeSeconds:120}},
    recentInboundOccurrence:null,
    nowMs:now
  });
  assert.equal(freshGround.renderedState,'ground-live');
  assert.equal(freshGround.renderSource,'adsb-fresh');
  assert.equal(freshGround.sourceConflict,true);

  const staleGround=assignmentApi.reconcileFlightState({
    assignment,
    live:{aircraft:{registration:'N861NW',lat:50.03,lon:8.57,onGround:true,positionAgeSeconds:7200}},
    recentInboundOccurrence:null,
    nowMs:now
  });
  assert.equal(staleGround.renderedState,'airborne-status');
  assert.equal(staleGround.renderSource,'flight-status');
  assert.equal(staleGround.sourceConflict,false);
});

test('a confirmed departure over an hour ago cannot regress to parked without a fresh ground fix', () => {
  const assignment={
    status:'found',flightNumber:'DL107',tailNumber:'N861NW',
    origin:{iata:'FRA'},destination:{iata:'JFK'},
    schedule:{actualDepartureUTC:'2026-10-08T09:00:00Z'},
    flightStatus:{airborne:false,landed:false,canceled:false}
  };
  const recentInbound={
    tailNumber:'N861NW',
    destination:{iata:'FRA'},
    flightStatus:{landed:true}
  };
  const result=assignmentApi.reconcileFlightState({
    assignment,
    live:{aircraft:{registration:'N861NW',lat:50.03,lon:8.57,onGround:true,positionAgeSeconds:7200}},
    recentInboundOccurrence:recentInbound,
    nowMs:Date.parse('2026-10-08T12:00:00Z')
  });
  assert.equal(result.renderedState,'airborne-status');
  assert.equal(result.renderSource,'confirmed-departure');
});

test('same flight-state inputs reconcile identically across five reloads', () => {
  const input={
    assignment:{
      status:'found',flightNumber:'DL107',tailNumber:'N861NW',
      origin:{iata:'FRA'},destination:{iata:'JFK'},
      schedule:{actualDepartureUTC:'2026-10-08T09:00:00Z'},
      flightStatus:{airborne:true,landed:false,canceled:false}
    },
    live:{
      status:'live',
      aircraft:{registration:'N861NW',lat:53.2,lon:-20.1,onGround:false,positionAgeSeconds:180}
    },
    recentInboundOccurrence:null,
    nowMs:Date.parse('2026-10-08T12:00:00Z')
  };
  const states=Array.from({length:5},() => assignmentApi.reconcileFlightState(input));
  for (const state of states.slice(1)) assert.deepEqual(state,states[0]);
  assert.equal(states[0].renderedState,'airborne-live');
  assert.equal(states[0].observation.fixAgeSeconds,180);
});

test('server reconciliation logs the rendered source, fix age and source-conflict counter', () => {
  const source=fs.readFileSync(path.join(root,'api','flight-assignment.js'),'utf8');
  assert.match(source, /event:'flight-state-render'/);
  assert.match(source, /fixTimestamp:reconciliation\?\.observation\?\.fixTimestamp/);
  assert.match(source, /fixAgeSeconds:reconciliation\?\.observation\?\.fixAgeSeconds/);
  assert.match(source, /renderedState:reconciliation\?\.renderedState/);
  assert.match(source, /sourceConflictCount \+= 1/);
  assert.match(source, /console\.log\(JSON\.stringify\(record\)\)/);
});

test('fresh reconciled ground state cannot be overwritten by older inbound-arrival history', () => {
  assert.match(client, /live\?\.aircraft\?\.onGround === true && !live\?\.reconciledState && landedPreviousAtOrigin\(assignment\)/);
  assert.match(client, /live\.reconciledState = payload\?\.renderedState/);
  assert.match(client, /live\.renderPositionAgeSeconds = payload\?\.observation\?\.displayAgeSeconds/);
});

test('no stale aircraft fix can enter the live renderer from the direct fallback path', () => {
  assert.match(client, /function renderLive\(data\) \{\s*if \(!data \|\| data\.positionFresh !== true\)/s);
  assert.match(client, /if \(data\.status === 'live' && data\.positionFresh === true\) \{\s*renderLive\(data\);/s);
  assert.match(client, /The newest aircraft position is stale/);
});

test('flight-state endpoint is uncached so each render produces an observability log record', () => {
  const source=fs.readFileSync(path.join(root,'api','flight-assignment.js'),'utf8');
  assert.match(source, /unified \? 'private, no-store'/);
  assert.match(source, /console\.log\(JSON\.stringify\(record\)\)/);
});

test('client answers whether the assigned aircraft is actually inbound to the departure airport', () => {
  assert.match(client, /const currentRoute = resolvedCurrentRoute\(assignment, live\)/);
  assert.match(client, /const inboundToOrigin = currentRoute\?\.destination && userOrigin && sameAirport\(currentRoute\.destination,userOrigin\)/);
  assert.match(client, /Your plane is on the way to/);
  assert.match(client, /THIS IS THE PLANE FOR YOUR FLIGHT/);
  assert.match(client, /It is not yet flying into/);
  assert.match(client, /airline recently changed the assigned aircraft/);
});

test('assignment source remains a bounded best-effort dependency with live-flight fallback', () => {
  const source = fs.readFileSync(path.join(root,'api','flight-assignment.js'),'utf8');
  assert.match(source, /www\.flightstats\.com\/v2/);
  assert.match(source, /__NEXT_DATA__ = /);
  assert.match(source, /tailNumber/);
  assert.match(source, /assignment-source-unavailable/);
  assert.match(source, /Aircraft assignments can change before departure/);
  assert.match(source, /last-good-assignment-cache/);
  assert.match(client, /ASSIGNMENT SOURCE TEMPORARILY UNAVAILABLE/);
  assert.match(client, /if \(date === localDateString\(\)\) params\.set\('liveNow','1'\)/);
  assert.match(source, /allowDirectLive/);
  assert.match(source, /directLiveSnapshot\(flight\)/);
  assert.match(source, /directLiveIsAirborne/);
});


test('route disambiguation makes time and city names dominant so opposite-direction legs are hard to confuse', () => {
  assert.match(client, /kicker\.textContent = 'YOUR FLIGHT'/);
  assert.match(client, /time\.className = 'route-choice-time'/);
  assert.match(client, /cities\.className = 'route-choice-cities'/);
  assert.match(client, /airportChoiceText\(option\.origin\) \+ ' → ' \+ airportChoiceText\(option\.destination\)/);
  assert.match(client, /codes\.className = 'route-choice-codes'/);
  assert.match(html, /\.route-choice-time\{font-size:20px/);
  assert.match(html, /\.route-choice-cities\{font-size:14px/);
  assert.match(client, /Choose the city pair and departure time on your ticket/);
});

test('answer card includes one bounded what-happens-next interpretation instead of adding dashboard panels', () => {
  assert.match(html, /id="answer-next"/);
  assert.match(client, /answerNext\.textContent = next \|\| ''/);
  assert.match(client, /What happens next: .*lands at .*taxis to a gate .*turns for your/s);
  assert.match(client, /What happens next: we’ll recheck the aircraft assignment every minute/);
  assert.match(client, /map stays empty rather than guessing/);
  assert.doesNotMatch(html, /weather panel|gate history|squawk|vertical speed/i);
});

test('assigned aircraft states use traveler language and state exactly what is unknown', () => {
  assert.match(client, /Your plane is assigned, but its present location is unknown/);
  assert.match(client, /Your plane is assigned and reported on the ground/);
  assert.match(client, /no current position and no confirmed same-tail arrival/);
  assert.match(client, /we cannot identify the airport/);
  assert.doesNotMatch(client, /It may be parked at a gate, outside coverage, or between usable position reports/);
  assert.match(client, /We found your plane:/);
  assert.match(client, /function reportAgeLead\(value\)/);
  assert.match(client, /Your plane appears to be approaching/);
  assert.match(client, /Your plane is moving generally toward/);
  assert.match(client, /Your plane is on the ground at/);
  assert.match(client, /function relationshipDistanceText\(relationship, label\)/);
  assert.match(client, /we have not yet confirmed the origin of its current flight/);
  assert.match(client, /The live aircraft feed can see/);
  assert.doesNotMatch(client, /current airport-to-airport leg/);
  assert.doesNotMatch(client, /The ADS-B network is seeing/);
});


test('same-day occurrence fusion requires the same flight number, same tail, airborne status and not landed', () => {
  const selected = {
    flightNumber:'AA3101',
    tailNumber:'N919NN',
    flightStatus:{airborne:false,landed:false}
  };
  const matching = {
    flightNumber:'AA3101',
    tailNumber:'N919NN',
    origin:{iata:'DFW',city:'Dallas/Fort Worth'},
    destination:{iata:'DTW',city:'Detroit'},
    flightStatus:{airborne:true,landed:false}
  };
  assert.equal(assignmentApi.isMatchingAirborneOccurrence(matching,selected),true);
  assert.equal(assignmentApi.isMatchingAirborneOccurrence({...matching,tailNumber:'N920NN'},selected),false);
  assert.equal(assignmentApi.isMatchingAirborneOccurrence({...matching,flightNumber:'AA999'},selected),false);
  assert.equal(assignmentApi.isMatchingAirborneOccurrence({...matching,flightStatus:{airborne:false,landed:false}},selected),false);
  assert.equal(assignmentApi.isMatchingAirborneOccurrence({...matching,flightStatus:{airborne:true,landed:true}},selected),false);
  const summary=assignmentApi.currentOccurrenceSummary(matching);
  assert.equal(summary.origin.iata,'DFW');
  assert.equal(summary.destination.iata,'DTW');
  assert.equal(summary.evidence.kind,'same-day-same-flight-same-tail-airborne');
});

test('browser uses a confirmed same-day occurrence only when live route is missing and callsign number agrees', () => {
  assert.match(client, /function confirmedOccurrenceRoute\(assignment, live\)/);
  assert.match(client, /assignment\?\.currentAircraftOccurrence/);
  assert.match(client, /occurrence\?\.flightStatus\?\.airborne !== true/);
  assert.match(client, /occurrenceTail !== assignmentTail \|\| liveTail !== assignmentTail/);
  assert.match(client, /flightNumberSuffix\(assignment\?\.flightNumber\)/);
  assert.match(client, /flightNumberSuffix\(live\?\.aircraft\?\.callsign\)/);
  assert.match(client, /if \(live\?\.route\?\.origin && live\?\.route\?\.destination\) return live\.route/);
  assert.match(client, /const currentRoute = resolvedCurrentRoute\(assignment, live\)/);
  assert.match(client, /inboundToOrigin = currentRoute\?\.destination/);
  assert.match(client, /routeLabel\.textContent = airportPlace\(currentRoute\.origin\) \+ ' → ' \+ airportPlace\(currentRoute\.destination\)/);
});


test('airport coordinate index parses VRS CSV and resolves IATA and ICAO codes', () => {
  const csv = [
    'Code,Name,ICAO,IATA,Location,CountryISO2,Latitude,Longitude,AltitudeFeet',
    'KDTW,Detroit Metropolitan Wayne County Airport,KDTW,DTW,Detroit,US,42.212399,-83.353401,645',
    'KPHL,Philadelphia International Airport,KPHL,PHL,Philadelphia,US,39.871899,-75.241096,36'
  ].join('\n');
  const index = api.buildAirportIndex(csv);
  assert.equal(index.get('DTW').icao,'KDTW');
  assert.equal(index.get('KDTW').iata,'DTW');
  assert.equal(index.get('PHL').city,'Philadelphia');
});

test('position relationship only calls an aircraft approaching when geometry supports it', () => {
  const dtw = {
    code:'KDTW',icao:'KDTW',iata:'DTW',name:'Detroit Metropolitan Wayne County Airport',
    city:'Detroit',country:'US',lat:42.212399,lon:-83.353401
  };
  const approaching = testPlane({
    lat:41.55,lon:-83.72,altitudeFeet:9000,speedKnots:300,verticalRateFpm:-900
  });
  approaching.trackDegrees = api.bearingDegrees(approaching,dtw);
  const relation = api.aircraftAirportRelationship(approaching,dtw,true);
  assert.equal(relation.state,'approaching');
  assert.equal(relation.headingRelation,'toward');
  assert.ok(relation.distanceMiles > 20 && relation.distanceMiles < 100, relation.distanceMiles);

  const crossing = {...approaching,trackDegrees:(approaching.trackDegrees + 90) % 360};
  assert.notEqual(api.aircraftAirportRelationship(crossing,dtw,true).state,'approaching');

  const stale = api.aircraftAirportRelationship(approaching,dtw,false);
  assert.equal(stale,null);
});

test('position relationship recognizes an assigned aircraft on the ground at the departure airport', () => {
  const dtw = {
    code:'KDTW',icao:'KDTW',iata:'DTW',name:'Detroit Metropolitan Wayne County Airport',
    city:'Detroit',country:'US',lat:42.212399,lon:-83.353401
  };
  const ground = testPlane({
    lat:42.209531,lon:-83.34409,onGround:true,altitudeFeet:500,speedKnots:22,
    verticalRateFpm:null,trackDegrees:28
  });
  const relation = api.aircraftAirportRelationship(ground,dtw,true);
  assert.equal(relation.state,'at-airport');
  assert.ok(relation.distanceMiles <= 1, relation.distanceMiles);
});

test('route-missing registration lookup can attach a focus-airport relationship without claiming a route', () => {
  const source = fs.readFileSync(path.join(root,'api','flight-tracker.js'),'utf8');
  assert.match(source, /VRS_AIRPORTS_URL = 'https:\/\/vrs-standing-data\.adsb\.lol\/airports\.csv'/);
  assert.match(source, /const focusAirport = !route && focusAirportCode \? await lookupAirportCoordinates\(focusAirportCode\) : null/);
  assert.match(source, /focusAirportRelationship/);
  assert.match(client, /data\.focusAirportRelationship/);
  assert.match(client, /originMarker = airportMarker\('origin', focus/);
});


test('previous occurrence context preserves a same-tail landed arrival for the turn state', () => {
  const selected = {
    flightNumber:'AA3101',
    tailNumber:'N919NN',
    origin:{iata:'DTW',city:'Detroit'},
    destination:{iata:'DFW',city:'Dallas'},
    flightStatus:{airborne:false,landed:false}
  };
  const landed = {
    flightNumber:'AA3101',
    flightId:'1412663702',
    tailNumber:'N919NN',
    origin:{iata:'DFW',city:'Dallas'},
    destination:{iata:'DTW',city:'Detroit'},
    assignmentState:'landed',
    flightStatus:{airborne:true,landed:true},
    note:'The flight has landed'
  };
  assert.equal(assignmentApi.isMatchingPreviousOccurrence(landed,selected),true);
  assert.equal(assignmentApi.isMatchingPreviousOccurrence({...landed,tailNumber:'N920NN'},selected),false);
  const summary=assignmentApi.previousOccurrenceSummary(landed);
  assert.equal(summary.destination.iata,'DTW');
  assert.equal(summary.flightStatus.landed,true);
  assert.equal(summary.evidence.kind,'same-day-same-flight-same-tail-previous-occurrence');
});

test('landed previous trip overrides stale airborne narrative and becomes the between-flights state', () => {
  assert.match(client, /function landedPreviousAtOrigin\(assignment\)/);
  assert.match(client, /previous\?\.flightStatus\?\.landed !== true/);
  assert.match(client, /sameAirport\(previous\.destination, assignment\?\.origin\)/);
  assert.match(client, /function renderArrivedForTurn\(assignment\)/);
  assert.match(client, /is at the gate — live tracking starts at pushback/);
  assert.match(client, /function previousLegStory\(assignment, previous\)/);
  assert.match(client, /arrived from/);
  assert.match(client, /Live tracking starts again at pushback/);
  assert.match(client, /if \(assignmentData && renderArrivedForTurn\(assignmentData\)\) \{\s*resetHeldLive\(\);\s*return true;/s);
  assert.match(client, /if \(renderArrivedForTurn\(assignment\)\) return;/);
});

test('a grounded live aircraft can never fall through to the generic airborne-style fallback', () => {
  assert.match(client, /if \(live\?\.aircraft\?\.onGround === true && !live\?\.reconciledState && landedPreviousAtOrigin\(assignment\)\)/);
  assert.match(client, /if \(live\?\.aircraft\?\.onGround === true\) \{/);
  assert.match(client, /Your assigned plane is on the ground/);
  assert.match(client, /currently reporting on the ground/);
});


test('live callsign deterministically exposes a marketing flight number for cross-flight lookup', () => {
  assert.equal(api.marketingFlightFromCallsign('AAL2317'),'AA2317');
  assert.equal(api.marketingFlightFromCallsign('DAL2497'),'DL2497');
  assert.equal(api.marketingFlightFromCallsign('SWA1697'),'WN1697');
  assert.equal(api.marketingFlightFromCallsign('ZZZ999'),null);
  const trackerSource = fs.readFileSync(path.join(root,'api','flight-tracker.js'),'utf8');
  assert.match(trackerSource, /operatingFlightNumber:marketingFlightFromCallsign\(aircraft\.callsign\)/);
});

test('cross-flight inbound resolver matches a different operating flight only by tail airborne state and destination', () => {
  assert.match(client, /function operatingOccurrenceMatches\(detail, assignment, live\)/);
  assert.match(client, /clean\(detail\?\.flightNumber\) !== clean\(live\?\.operatingFlightNumber\)/);
  assert.match(client, /clean\(detail\?\.tailNumber\) !== clean\(assignment\?\.tailNumber\)/);
  assert.match(client, /detail\?\.flightStatus\?\.airborne !== true \|\| detail\?\.flightStatus\?\.landed === true/);
  assert.match(client, /!sameAirport\(detail\?\.destination, assignment\?\.origin\)/);
  assert.match(client, /async function resolveOperatingOccurrence\(assignment, live\)/);
  assert.match(client, /operatingFlight === passengerFlight/);
  assert.match(client, /base\?\.status === 'choose-flight'/);
  assert.match(client, /matches\.length === 1/);
});

test('different-flight-number inbound occurrence becomes the traveler-facing current trip', () => {
  assert.match(client, /function crossFlightOccurrenceRoute\(live\)/);
  assert.match(client, /live\?\.confirmedOperatingOccurrence/);
  assert.match(client, /return crossFlightOccurrenceRoute\(live\) \|\|\s*assignmentInboundOccurrenceRoute\(assignment, live\) \|\|\s*confirmedOccurrenceRoute\(assignment, live\)/s);
  assert.match(client, /const operatingOccurrence = await resolveOperatingOccurrence\(assignmentData,data\)/);
  assert.match(client, /data\.confirmedOperatingOccurrence = operatingOccurrence/);
  assert.match(client, /const recentInboundRoute = assignmentInboundOccurrenceRoute\(assignment, live\)/);
  assert.match(client, /\(recentInboundRoute \? assignmentInboundOccurrence\(assignment\) : null\)/);
  assert.match(client, /const currentOperatingFlight = inboundOccurrence\?\.flightNumber \|\| null/);
  assert.match(client, /is currently operating .* from .* to/s);
});


test('ergonomic answer card makes the aircraft chain scannable without adding a dashboard', () => {
  assert.match(html, /id="answer-journey"/);
  assert.match(html, /.answer-journey\{display:grid;grid-template-columns:minmax\(0,1fr\) 22px minmax\(0,1fr\)/);
  assert.match(html, /.journey-label/);
  assert.match(html, /.journey-primary/);
  assert.match(client, /function renderAnswerJourney\(journey\)/);
  assert.match(client, /kicker\.textContent = label/);
  assert.match(client, /arrow\.textContent = '→'/);
  assert.match(client, /makeStep\('NOW', journey\.now\)/);
  assert.match(client, /makeStep\('YOUR FLIGHT', journey\.next, 'is-next'\)/);
});

test('inbound and landed states show NOW to YOUR FLIGHT relationship while ordinary states hide it', () => {
  assert.match(client, /journey:\{\s*now:\{\s*primary:\[currentOperatingFlight \|\| tail,compactRoute/s);
  assert.match(client, /primary:\[assignment\?\.flightNumber,route\]/);
  assert.match(client, /Previous flight landed/);
  assert.match(client, /answerJourney\.hidden = true/);
  assert.match(client, /renderAnswerJourney\(journey\)/);
});

test('ergonomic polish removes duplicate tail registration from answer pills', () => {
  assert.match(client, /const identity = live\?\.aircraft\?\.aircraftTypeName \|\| live\?\.aircraft\?\.aircraftType/);
  assert.match(client, /const pills = \[route, delay, codesharePill\(assignment\), tail, identity\]/);
  assert.doesNotMatch(client, /const identity = aircraftIdentity\(live\?\.aircraft\)/);
});

test('mobile journey strip remains compact at the 390px baseline', () => {
  assert.match(html, /@media \(max-width:520px\)/);
  assert.match(html, /\.answer-journey\{grid-template-columns:minmax\(0,1fr\) 18px minmax\(0,1fr\);gap:6px\}/);
  assert.match(html, /\.journey-primary\{font-size:12\.5px\}/);
  assert.match(html, /\.journey-secondary\{font-size:10px\}/);
});


test('recent-arrival recovery narrows the airport board before checking same-tail details', () => {
  const now = Date.parse('2026-10-07T17:20:00Z');
  const nextData = {
    props:{initialState:{flightTracker:{route:{flights:[
      {
        sortTime:'2026-10-07T16:10:00.000Z',
        carrier:{fs:'AA',flightNumber:'2317'},
        operatedBy:null,
        url:'/flight-tracker/AA/2317?year=2026&month=10&date=7&flightId=1412662791',
        airport:{fs:'SAV',city:'Savannah'}
      },
      {
        sortTime:'2026-10-07T16:15:00.000Z',
        carrier:{fs:'DL',flightNumber:'999'},
        operatedBy:null,
        url:'/flight-tracker/DL/999?year=2026&month=10&date=7&flightId=2',
        airport:{fs:'ATL',city:'Atlanta'}
      },
      {
        sortTime:'2026-10-06T02:00:00.000Z',
        carrier:{fs:'AA',flightNumber:'1'},
        operatedBy:null,
        url:'/flight-tracker/AA/1?year=2026&month=10&date=6&flightId=3',
        airport:{fs:'LAX',city:'Los Angeles'}
      }
    ]}}}}
  };
  const candidates = assignmentApi.recentArrivalCandidates(nextData,{carrier:'AA',airport:'CLT',nowMs:now});
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].flightNumber,'AA2317');
  assert.equal(candidates[0].flightId,'1412662791');
  assert.equal(candidates[0].destination.iata,'CLT');
});

test('recent-arrival recovery validates codes and prefers a current airborne or recent landed same-tail occurrence', () => {
  assert.equal(assignmentApi.normalizeAirportCode(' clt '),'CLT');
  assert.equal(assignmentApi.normalizeAirportCode('!'),null);
  assert.equal(assignmentApi.normalizeCarrierCode('aa'),'AA');
  assert.equal(assignmentApi.normalizeCarrierCode('AAL'),null);
  const now=Date.parse('2026-10-07T17:20:00Z');
  const landed={flightStatus:{landed:true,airborne:true}};
  const airborne={flightStatus:{landed:false,airborne:true}};
  const scheduled={flightStatus:{landed:false,airborne:false}};
  const candidate={sortMs:Date.parse('2026-10-07T16:10:00Z')};
  assert.ok(assignmentApi.recentArrivalMatchScore(airborne,candidate,now) > assignmentApi.recentArrivalMatchScore(landed,candidate,now));
  assert.ok(assignmentApi.recentArrivalMatchScore(landed,candidate,now) > assignmentApi.recentArrivalMatchScore(scheduled,candidate,now));
});

test('no-position recovery checks recent arrivals before falling back to a stale last-known map point', () => {
  assert.match(client, /async function resolveRecentInboundOccurrence\(assignment\)/);
  assert.match(client, /tail:assignment\.tailNumber/);
  assert.match(client, /airport,/);
  assert.match(client, /carrier/);
  assert.match(client, /status !== 'found-inbound-occurrence'/);
  assert.match(client, /async function recoverNoPositionState\(assignment, registration, data\)/);
  assert.match(client, /occurrence\?\.flightStatus\?\.landed === true/);
  assert.match(client, /previousAircraftOccurrence:occurrence/);
  assert.match(client, /renderArrivedForTurn\(assignmentData\)/);
  assert.match(client, /const snapshot = loadLastKnownSnapshot\(registration\)/);
  assert.match(client, /renderLastKnownPosition\(assignment,snapshot\)/);
});

test('last-known aircraft position persists locally but is explicitly stale and bounded', () => {
  assert.match(client, /const LAST_KNOWN_MAX_AGE_MS = 12 \* 60 \* 60 \* 1000/);
  assert.match(client, /const LAST_KNOWN_STORAGE_PREFIX = 'flight-tracker:last-known:'/);
  assert.match(client, /function saveLastKnownSnapshot\(data\)/);
  assert.match(client, /localStorage\.setItem/);
  assert.match(client, /function loadLastKnownSnapshot\(registration\)/);
  assert.match(client, /Date\.now\(\) - parsed\.reportedAt > LAST_KNOWN_MAX_AGE_MS/);
  assert.match(client, /function renderLastKnownPosition\(assignment, snapshot\)/);
  assert.match(client, /This is not a live location/);
  assert.match(client, /LAST CONFIRMED AIRCRAFT POSITION/);
  assert.match(client, /classList\.add\('is-stale'\)/);
  assert.match(client, /classList\.remove\('is-stale'\)/);
  assert.match(html, /\.plane-marker\.is-stale\{opacity:\.55;border-style:dashed\}/);
});

test('flight page loads the last-known recovery client asset', () => {
  assert.match(html, /flight-tracker\.js\?v=20261008g/);
});


test('v2 traveler story shows completed-leg arrival, inbound timing and delay-turn math without inventing a marker', () => {
  assert.match(html, /id="answer-delay"/);
  assert.match(html, /\.answer-delay\{/);
  assert.match(client, /function previousLegStory\(assignment, previous\)/);
  assert.match(client, /function completedArrivalClock\(occurrence\)/);
  assert.match(client, /function inboundTimingText\(assignment, inbound, live\)/);
  assert.match(client, /Your plane lands about .*; your flight departs /);
  assert.match(client, /function scheduledTurnMinutes\(assignment, inbound\)/);
  assert.match(client, /function departureDelayMinutes\(assignment\)/);
  assert.match(client, /delay\(\?:ed\)\?/);
  assert.match(client, /function delayWhyText\(assignment, inbound\)/);
  assert.match(client, /Why is my flight delayed\?/);
  assert.match(client, /Scheduled turn is /);
  assert.match(client, /cannot prove how much of the delay came from the inbound aircraft/);
  assert.match(client, /is at the gate — live tracking starts at pushback/);
  assert.match(client, /map stays empty rather than guessing/);
  assert.doesNotMatch(client, /simulated position|estimated marker|predicted marker/i);
});

test('text-only delay labels still produce an inbound-aircraft explanation', () => {
  assert.match(client, /const texts = \[[\s\S]*flightStatus\?\.description,[\s\S]*flightStatus\?\.label/s);
  assert.match(client, /match\(\/delay/);
  assert.match(client, /Your flight is delayed ' \+ departureDelay \+ ' min/);
  assert.match(client, /Scheduled turn is ' \+ turn \+ ' min/);
  assert.match(client, /The inbound arrival alone does not explain the full departure delay/);
});

test('landed passenger flight renders an arrived header and never no-position airborne fallback copy', () => {
  assert.match(client, /function assignmentArrivalConfirmed\(assignment\)/);
  assert.match(client, /schedule\?\.actualArrivalUTC/);
  assert.match(client, /const completedAt = assignmentArrivalConfirmed\(assignment\)/);
  assert.match(client, /YOUR FLIGHT HAS ARRIVED/);
  assert.match(client, /has arrived in/);
  assert.match(client, /The arrival status is confirmed; a missing or stale aircraft position does not make this flight airborne/);
  assert.match(client, /if \(assignmentArrivalConfirmed\(assignmentData\)\) \{[\s\S]*?renderAssignedNoPosition/s);
  assert.doesNotMatch(client, /LAST CONFIRMED AIRCRAFT STATE/);
});

test('confirmed arrival outranks airborne flags and fresh tail telemetry', () => {
  const now=Date.parse('2026-10-08T16:30:00Z');
  const landed={
    flightNumber:'DL3898',
    tailNumber:'N821SK',
    origin:{iata:'MBS'},
    destination:{iata:'DTW'},
    flightStatus:{airborne:true,landed:true,canceled:false},
    schedule:{actualDepartureUTC:'2026-10-08T15:57:00Z',actualArrivalUTC:'2026-10-08T16:23:00Z'}
  };
  const freshAirborneTail={
    status:'live',
    aircraft:{lat:42.5,lon:-83.3,positionAgeSeconds:10,onGround:false}
  };
  const result=assignmentApi.reconcileFlightState({
    assignment:landed,
    live:freshAirborneTail,
    recentInboundOccurrence:null,
    nowMs:now
  });
  assert.equal(assignmentApi.confirmedArrival(landed),true);
  assert.equal(result.statusState,'landed');
  assert.equal(result.renderedState,'landed-status');
  assert.equal(result.renderSource,'flight-status-arrival');

  const actualArrivalOnly={
    ...landed,
    flightStatus:{airborne:true,landed:false,canceled:false}
  };
  const byActualArrival=assignmentApi.reconcileFlightState({
    assignment:actualArrivalOnly,
    live:null,
    recentInboundOccurrence:null,
    nowMs:now
  });
  assert.equal(assignmentApi.confirmedArrival(actualArrivalOnly),true);
  assert.equal(byActualArrival.renderedState,'landed-status');
  assert.equal(byActualArrival.statusState,'landed');
});

test('timeline uses the same arrival-confirmed predicate as the status header', () => {
  assert.match(client,/if \(assignmentArrivalConfirmed\(assignment\)\) currentStage = 'arrival'/);
  assert.match(client,/assignmentArrivalConfirmed\(assignment\) \? 'Arrived in ' : 'Expected in '/);
});

test('completed FlightStats occurrence exposes a bounded actual arrival timestamp for the last-leg story', () => {
  const flight = {
    flightId:42,
    flightNote:{hasDepartedRunway:true,landed:true},
    isTracking:false,
    isLanded:true,
    resultHeader:{carrier:{fs:'DL'},flightNumber:'2587'},
    status:{status:'Landed',delay:{arrival:{minutes:40}}},
    departureAirport:{fs:'TPA',iata:'TPA',city:'Tampa'},
    arrivalAirport:{
      fs:'DTW',iata:'DTW',city:'Detroit',timeZoneRegionName:'America/Detroit',
      times:{estimatedActual:{title:'Actual',time:'4:23',ampm:'PM',timezone:'EDT'}}
    },
    positional:{flexTrack:{tailNumber:'N329DN'}},
    schedule:{
      scheduledArrivalUTC:'2026-10-07T19:43:00Z',
      estimatedActualArrivalUTC:'2026-10-07T20:23:00Z'
    }
  };
  const result=assignmentApi.sanitizeFlight(flight,{display:'DL2587'},'https://example.test');
  assert.equal(result.schedule.actualArrivalUTC,'2026-10-07T20:23:00Z');
  assert.equal(result.flightStatus.arrivalDelayMinutes,40);
});

test('adversarial V2 state enrichment is server-side and stale local snapshots cannot decide scheduled-flight state', () => {
  const apiSource = fs.readFileSync(path.join(root,'api','flight-tracker.js'),'utf8');
  const stateSource = fs.readFileSync(path.join(root,'api','flight-assignment.js'),'utf8');
  assert.match(apiSource, /const POSITION_MAX_AGE_SECONDS = 15 \* 60/);
  assert.match(stateSource, /const POSITION_MAX_AGE_SECONDS = 15 \* 60/);
  assert.match(stateSource, /Promise\.all\(\[/);
  assert.match(stateSource, /buildAdsbRegistrationSnapshot\(assignment\.tailNumber\)/);
  assert.match(stateSource, /resolveRecentInbound\(assignment,date,nowMs\)/);
  assert.match(stateSource, /reconcileFlightState/);
  assert.match(client, /renderUnifiedFlightState\(data\)/);
  assert.doesNotMatch(client, /async function loadAssignment[\s\S]*?loadLastKnownSnapshot\(/);
});

test('parked same-tail arrival is asserted and stale airline status is timestamped', () => {
  assert.match(client, /recentInboundOccurrence\?\.flightStatus\?\.landed === true/);
  assert.match(client, /is at the gate — live tracking starts at pushback/);
  assert.match(client, /function unresolvedStatusIsStale\(assignment\)/);
  assert.match(client, /Date\.now\(\) > departure \+ 90 \* 60 \* 1000/);
  assert.match(client, /Status may be stale/);
  assert.match(client, /checked /);
});

test('password-manager accessibility artifacts are excluded from the rendered flight tracker', () => {
  assert.match(html, /data-1p-ignore="true"/);
  assert.doesNotMatch(html, /1Password menu is available/);
  assert.match(client, /const PASSWORD_MANAGER_ARTIFACT = '1Password menu is available'/);
  assert.match(client, /stripPasswordManagerArtifacts/);
});

test('regional operating carrier identity survives FlightStats string operatedBy and flexTrack carrier code', () => {
  const flight={
    flightId:1412873434,
    flightNote:{canceled:false,hasDepartedRunway:false,landed:false},
    isTracking:false,
    isLanded:false,
    operatedBy:'Operated by SkyWest Airlines on behalf of Delta Air Lines',
    resultHeader:{carrier:{fs:'DL'},flightNumber:'3898'},
    departureAirport:{fs:'MBS',iata:'MBS',city:'Saginaw',country:'US',date:'2026-10-08T11:43:00.000'},
    arrivalAirport:{fs:'DTW',iata:'DTW',city:'Detroit',country:'US'},
    positional:{flexTrack:{tailNumber:'N821SK',carrierFsCode:'OO',equipment:'CR9'}},
    additionalFlightInfo:{equipment:{iata:'CR9',name:'CRJ900'}},
    schedule:{scheduledDepartureUTC:'2026-10-08T15:43:00.000Z',scheduledArrivalUTC:'2026-10-08T16:38:00.000Z'},
    status:{status:'Scheduled',statusDescription:'On time'}
  };
  const result=assignmentApi.sanitizeFlight(flight,{display:'DL3898'},'https://example.test');
  assert.equal(result.tailNumber,'N821SK');
  assert.equal(result.operatingCarrier.code,'OO');
  assert.equal(result.operatingCarrier.name,'SkyWest Airlines');
  assert.equal(result.operatingCarrier.icaoCallsignPrefix,'SKW');
});

test('FlightStats base occurrence can resolve the requested date without a secondary detail page', () => {
  const flight={
    flightId:1412873434,
    departureAirport:{date:'2026-10-08T11:43:00.000'},
    schedule:{scheduledDepartureUTC:'2026-10-08T15:43:00.000Z'}
  };
  assert.equal(assignmentApi.baseFlightMatchesDate(flight,{raw:'2026-10-08'}),true);
  assert.equal(assignmentApi.baseFlightMatchesDate(flight,{raw:'2026-10-09'}),false);
});

test('FlightStats parser supports both legacy assignment and standard Next data script formats', () => {
  const legacy='<script>__NEXT_DATA__ = {"props":{"ok":1}};__NEXT_LOADED_PAGES__=[]</script>';
  const modern='<script id="__NEXT_DATA__" type="application/json">{"props":{"ok":2}}</script>';
  assert.equal(assignmentApi.parseNextData(legacy).props.ok,1);
  assert.equal(assignmentApi.parseNextData(modern).props.ok,2);
});

test('successful live responses retain callsign observability', () => {
  const source=fs.readFileSync(path.join(root,'api','flight-tracker.js'),'utf8');
  assert.match(source,/checkedCallsigns:normalized\.callsigns/);
  assert.match(source,/matchedCallsign:resolved\.aircraft\?\.callsign \|\| null/);
});

test('Delta live fallback checks mainline and regional operating callsigns', () => {
  const tracker=require('../api/flight-tracker.js')._test;
  const normalized=tracker.normalizeFlightInput('DL3898');
  assert.deepEqual(normalized.callsigns,['DAL3898','EDV3898','SKW3898']);
  const exact=tracker.normalizeFlightInput('DL3898','OO');
  assert.ok(exact.callsigns.includes('SKW3898'));
  assert.equal(tracker.normalizeOperatingPrefix('9E'),'EDV');
  assert.equal(tracker.normalizeOperatingPrefix('OO'),'SKW');
});

test('assignment source outage is distinct from coverage gaps and confirmed scheduled assignments', () => {
  assert.match(client,/ASSIGNMENT SOURCE TEMPORARILY UNAVAILABLE/);
  assert.match(client,/We cannot confirm the assigned aircraft right now/);
  assert.match(client,/AIRCRAFT ASSIGNMENT COVERAGE NOT AVAILABLE/);
  assert.match(client,/We do not have published assignment coverage for this flight and date/);
  assert.match(client,/FLIGHT NOT AIRBORNE YET · ASSIGNED AIRCRAFT/);
  assert.match(client,/Your flight has not departed yet\. .* is the assigned aircraft/);
  const source=fs.readFileSync(path.join(root,'api','flight-assignment.js'),'utf8');
  assert.match(source,/status:'assignment-not-covered'/);
  assert.match(source,/This is a coverage gap, not a temporary outage/);
});

test('assignment lookup has durable last-good cache and base-page fallback before declaring source unavailable', () => {
  const source=fs.readFileSync(path.join(root,'api','flight-assignment.js'),'utf8');
  assert.match(source,/ASSIGNMENT_CACHE_PREFIX = 'flight:assignment:v2:'/);
  assert.match(source,/ASSIGNMENT_CACHE_TTL_SECONDS = 18 \* 60 \* 60/);
  assert.match(source,/flightstats-base-occurrence/);
  assert.match(source,/last-good-assignment-cache/);
  assert.match(source,/assignment-source-unavailable/);
  assert.match(source,/live-operating-callsigns/);
});

test('current-day unified lookup can render a fresh direct callsign without an assignment feed', () => {
  const live={
    status:'live',
    flightNumber:'DL5',
    positionFresh:true,
    aircraft:{
      callsign:'DAL005',registration:'N501DN',aircraftType:'A359',aircraftTypeName:'Airbus A350-900',
      lat:44,lon:-60,onGround:false,positionAgeSeconds:5
    },
    route:{
      origin:{iata:'JFK',city:'New York',lat:40.64,lon:-73.78},
      destination:{iata:'LHR',city:'London',lat:51.47,lon:-0.45},
      plausible:true
    }
  };
  assert.equal(assignmentApi.directLiveIsAirborne(live),true);
  const assignment=assignmentApi.directLiveAssignment('DL5',live);
  assert.equal(assignment.flightNumber,'DL5');
  assert.equal(assignment.tailNumber,'N501DN');
  assert.equal(assignment.flightStatus.airborne,true);
  const reconciled=assignmentApi.reconcileFlightState({
    assignment,live,recentInboundOccurrence:null,nowMs:Date.parse('2026-10-08T17:00:00Z')
  });
  assert.equal(reconciled.renderedState,'airborne-live');
});

test('codeshare parser and alias preserve ticket number while exposing operating flight', () => {
  const markdown='Virgin Atlantic VS1671\\nCodeshare flight, operated by Delta Air Lines. ([DL 3898](https://info.flightmapper.net/flight/Delta_Air_Lines_DL_3898))';
  assert.deepEqual(assignmentApi.parseCodeshareOperatingCandidates(markdown,'VS1671'),['DL3898']);
  const operator={
    status:'found',flightNumber:'DL3898',flightId:'1412873434',tailNumber:'N821SK',
    origin:{iata:'MBS'},destination:{iata:'DTW'},
    schedule:{actualArrivalUTC:'2026-10-08T16:23:00Z'},
    flightStatus:{airborne:true,landed:true,canceled:false}
  };
  const aliased=assignmentApi.applyCodeshareAssignment(operator,'VS1671','DL3898',{name:'fixture'});
  assert.equal(aliased.flightNumber,'VS1671');
  assert.equal(aliased.operatingFlightNumber,'DL3898');
  assert.equal(aliased.tailNumber,'N821SK');
  assert.equal(aliased.codeshare.marketingFlightNumber,'VS1671');
});

test('new searches clear previous flight map labels before lookup and failures keep the submitted flight', () => {
  assert.match(client,/function resetMapForLookup\(flight\)/);
  assert.match(client,/flightLabel\.textContent = clean\(flight\) \|\| 'Flight'/);
  assert.match(client,/routeLabel\.textContent = 'Checking current flight…'/);
  assert.match(client,/hideAnswer\(\);\s*resetMapForLookup\(activeFlight\);\s*await loadAssignment/s);
  assert.match(client,/function resetMapForFailure\(flight,label='No live position'\)/);
  assert.match(client,/resetMapForFailure\(activeFlight(?:,|\))/);
});

test('future dates never attach a current-day direct aircraft merely because the flight number matches', () => {
  assert.match(client,/if \(date === localDateString\(\)\) params\.set\('liveNow','1'\)/);
  assert.doesNotMatch(client,/new URLSearchParams\(\{flight,date,unified:'1',liveNow:'1'\}\)/);
});

test('last-confirmed inbound legs survive transient arrival-board failures', () => {
  const source=fs.readFileSync(path.join(root,'api','flight-assignment.js'),'utf8');
  assert.match(source,/INBOUND_CACHE_PREFIX = 'flight:inbound:v1:'/);
  assert.match(source,/INBOUND_CACHE_TTL_SECONDS = 12 \* 60 \* 60/);
  assert.match(source,/async function lookupRecentArrivalWithCache/);
  assert.match(source,/await writeInboundCache\(normalizedDate\.raw,normalizedTail,normalizedAirport,liveResult\.occurrence\)/);
  assert.match(source,/const cached = await readInboundCache\(normalizedDate\.raw,normalizedTail,normalizedAirport\)/);
  assert.match(source,/kind:'last-confirmed-inbound-cache'/);
  assert.match(source,/await lookupRecentArrivalWithCache\(\{tail,airport,carrier,date,nowMs\}\)/);
  assert.match(source,/await lookupRecentArrivalWithCache\(\{tail,airport,carrier,date\}\)/);
});

test('browser retains only validated same-tail inbound context for the active travel date', () => {
  assert.match(client,/const INBOUND_STORAGE_PREFIX = 'flight-tracker:inbound:'/);
  assert.match(client,/const INBOUND_STORAGE_MAX_AGE_MS = 12 \* 60 \* 60 \* 1000/);
  assert.match(client,/function validInboundOccurrence\(assignment, occurrence\)/);
  assert.match(client,/clean\(occurrence\?\.tailNumber\) !== clean\(assignment\?\.tailNumber\)/);
  assert.match(client,/!sameAirport\(occurrence\?\.destination, assignment\?\.origin\)/);
  assert.match(client,/function saveInboundOccurrence\(assignment, occurrence\)/);
  assert.match(client,/function loadInboundOccurrence\(assignment\)/);
  assert.match(client,/date:activeDate/);
  assert.match(client,/return loadInboundOccurrence\(assignment\)/);
  assert.match(client,/saveInboundOccurrence\(assignment,occurrence\)/);
});

test('current-day assignment coverage gaps carry direct-live evidence without claiming an outage', () => {
  const source=fs.readFileSync(path.join(root,'api','flight-assignment.js'),'utf8');
  assert.match(source,/liveCoverage:\{/);
  assert.match(source,/checkedCallsigns:Array\.isArray\(direct\?\.checkedCallsigns\)/);
  assert.match(source,/status:'assignment-not-covered'/);
  assert.match(source,/coverage gap, not a temporary outage/);
  assert.match(client,/Outside current live coverage/);
  assert.match(client,/Direct operating callsigns were also checked for a fresh ADS-B position/);
  assert.match(client,/The tracker will keep checking every 10 seconds/);
  assert.match(client,/no position is estimated or simulated/);
});

test('reachable assignment source with no usable occurrence is classified as coverage, not flight nonexistence', () => {
  const source=fs.readFileSync(path.join(root,'api','flight-assignment.js'),'utf8');
  assert.doesNotMatch(source,/status:'not-found',[\s\S]{0,180}No scheduled occurrence of that flight was found for this date/);
  assert.match(source,/The primary public source responded without a usable occurrence or aircraft assignment/);
  assert.match(source,/not proof that the passenger flight does not exist/);
});

test('independent public-history parser resolves the exact same-day route and registration', () => {
  const markdown = [
    '| [N821SK](https://www.flightradar24.com/data/aircraft/n821sk "Mitsubishi CRJ-900LR") 08 Oct 2026 - Estimated 12:22 PM STD 11:43 AM ATD 11:57 AM STA 12:38 PM FROM Saginaw [(MBS)](https://www.flightradar24.com/data/airports/mbs) TO Detroit [(DTW)](https://www.flightradar24.com/data/airports/dtw) |  | 08 Oct 2026 | Saginaw [(MBS)](https://www.flightradar24.com/data/airports/mbs) | Detroit [(DTW)](https://www.flightradar24.com/data/airports/dtw) | CRJ9 [(N821SK)](https://www.flightradar24.com/data/aircraft/n821sk "Mitsubishi CRJ-900LR") | — | 11:43 AM | 11:57 AM | 12:38 PM |  | Estimated 12:22 PM | [Live](https://www.flightradar24.com/data/flights/dl3898#x) |',
    '| [N821SK](https://www.flightradar24.com/data/aircraft/n821sk "Mitsubishi CRJ-900LR") 08 Oct 2026 0:30 Landed 10:47 AM STD 10:04 AM ATD 10:17 AM STA 11:01 AM FROM Detroit [(DTW)](https://www.flightradar24.com/data/airports/dtw) TO Saginaw [(MBS)](https://www.flightradar24.com/data/airports/mbs) |  | 08 Oct 2026 | Detroit [(DTW)](https://www.flightradar24.com/data/airports/dtw) | Saginaw [(MBS)](https://www.flightradar24.com/data/airports/mbs) | CRJ9 [(N821SK)](https://www.flightradar24.com/data/aircraft/n821sk "Mitsubishi CRJ-900LR") | 0:30 | 10:04 AM | 10:17 AM | 11:01 AM |  | Landed 10:47 AM |'
  ].join('\n');
  const rows=assignmentApi.parseFr24HistoryRows(markdown);
  assert.equal(rows.length,2);
  assert.equal(rows[0].registration,'N821SK');
  assert.equal(rows[0].origin,'MBS');
  assert.equal(rows[0].destination,'DTW');
  assert.equal(rows[0].equipmentCode,'CRJ9');
  assert.equal(rows[1].landed,true);

  const normalized={display:'DL3898'};
  const normalizedDate={raw:'2026-10-08',year:2026,month:10,day:8};
  const selected=assignmentApi.fr24AssignmentFromRow({
    normalized,
    normalizedDate,
    row:rows[0],
    routeHint:{
      flightId:'1412873434',
      sortTime:'2026-10-08T15:43:00.000Z',
      origin:{iata:'MBS',code:'MBS',city:'Saginaw'},
      destination:{iata:'DTW',code:'DTW',city:'Detroit'}
    },
    flightId:'1412873434'
  });
  assert.equal(selected.status,'found');
  assert.equal(selected.tailNumber,'N821SK');
  assert.equal(selected.flightId,'1412873434');
  assert.equal(selected.origin.iata,'MBS');
  assert.equal(selected.destination.iata,'DTW');
  assert.equal(selected.schedule.scheduledDepartureUTC,'2026-10-08T15:43:00.000Z');
  assert.equal(selected.fallback.kind,'independent-public-history');
  assert.equal(selected.source.kind,'independent-public-history-fallback');
});

test('cold assignment outage checks independent public history before declaring source unavailable', () => {
  const source=fs.readFileSync(path.join(root,'api','flight-assignment.js'),'utf8');
  assert.match(source,/FR24_READER_BASE = 'https:\/\/r\.jina\.ai\/https:\/\/www\.flightradar24\.com\/data\/flights\/'/);
  assert.match(source,/lookupIndependentAssignmentFallback/);
  assert.match(source,/independent-public-history/);
  assert.match(source,/cachedRouteHint/);
  assert.match(source,/checkedFallbacks:\['last-good-assignment-cache','independent-public-history','live-operating-callsigns'\]/);
});

test('first-use copy tells travelers to enter their own flight even when the inbound aircraft has another flight number', () => {
  assert.match(html, /Enter the flight number on your ticket/);
  assert.match(html, /currently flying a different flight number/);
  assert.match(html, /The inbound trip bringing your plane to you may have a completely different flight number/);
});
